import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  encryptBuffer,
  decryptBuffer,
  triggerDownload
} from "./api/crypto";
import {
  googleAuth,
  guestLogin,
  registerMetadata
} from "./api/client";

const STORAGE_KEY = "secura_web_session";
const THEME_KEY = "secura_web_theme";
const SPLASH_KEY = "secura_web_seen_splash";
const LOCAL_FILES_KEY = "secura_web_files";
const LOCAL_NOTES_KEY = "secura_web_notes";
const DECOY_KEY = "secura_web_decoy";

const initialState = {
  token: "",
  user: null,
  files: [],
  notes: [],
  decoyPassword: "", // For plausible deniability
  loading: false,
  error: "",
  notice: ""
};

const themeOptions = ["light", "dark", "system"];

export default function App() {
  const [state, setState] = useState(initialState);
  const [activeTab, setActiveTab] = useState("home");
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState("light"); 
  const [showSplash, setShowSplash] = useState(true);
  
  // Security Vault State
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultAction, setVaultAction] = useState(null); // { type: 'encrypt'|'decrypt'|'note', payload: any }
  
  const [decryptFile, setDecryptFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cryptoLogs, setCryptoLogs] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [decryptedNotePreview, setDecryptedNotePreview] = useState(null);

  // Notes state
  const [noteText, setNoteText] = useState("");
  const [isNoteProcessing, setIsNoteProcessing] = useState(false);
  const [vaultView, setVaultView] = useState("files"); // 'files' or 'notes'
  const [isEntered, setIsEntered] = useState(false);

  const isAuthenticated = !!state.token;

  const APK_LINK = "https://github.com/mini-page/Secura/releases/download/v2.0.0/Secura_appV2.apk";

  // --- Handlers ---
  
  function addCryptoLog(msg) {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    setCryptoLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 5));
  }

  function openVault(type, payload = null) {
    setVaultAction({ type, payload });
    setVaultPassword("");
    setVaultOpen(true);
  }

  async function processVault() {
    if (!vaultPassword) return;
    setVaultOpen(false);
    
    // Decoy Logic: If user enters the decoy password during decryption, 
    // we show a fake success but don't actually restore the file.
    if (vaultAction?.type === 'decrypt' && state.decoyPassword && vaultPassword === state.decoyPassword) {
      addCryptoLog("Decoy protocol active...");
      setIsProcessing(true);
      setTimeout(() => {
        addCryptoLog("Error: Secure container corrupted or invalid key.");
        pushToast("Restoration failed. Container integrity error.", "error");
        setIsProcessing(false);
      }, 1500);
      return;
    }

    const { type, payload } = vaultAction;
    if (type === 'encrypt') await handleEncrypt(payload, vaultPassword);
    if (type === 'decrypt') await handleDecrypt(vaultPassword);
    if (type === 'note') await handleSaveNote(vaultPassword);
  }

  async function handleEncrypt(file, password) {
    if (!file) return;
    setIsProcessing(true);
    pushToast("Securing resource...", "info");
    setCryptoLogs([]); 
    try {
      addCryptoLog("Initializing PBKDF2 Key Derivation...");
      const buffer = await file.arrayBuffer();
      
      addCryptoLog("Applying AES-GCM encryption...");
      const encrypted = await encryptBuffer(buffer, password);
      
      addCryptoLog("Computing integrity checksum...");
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      addCryptoLog("Syncing metadata with Secura Cloud...");
      try {
        if (state.token) {
          await registerMetadata(state.token, {
            original_name: file.name,
            size_bytes: buffer.byteLength,
            checksum: checksum
          });
          addCryptoLog("Metadata synced successfully.");
        }
      } catch (e) {
        addCryptoLog("Cloud sync failed (offline mode).");
      }
      
      triggerDownload(encrypted, `${file.name}.secura`);
      addCryptoLog("Secure container downloaded.");
      pushToast("Success! File secured with password.", "success");

      const newFile = {
        fileId: Math.random().toString(36).substr(2, 9),
        originalName: file.name,
        sizeBytes: buffer.byteLength,
        createdAt: new Date().toISOString()
      };
      const updatedFiles = [newFile, ...state.files].slice(0, 10);
      setState(s => ({ ...s, files: updatedFiles }));
      localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(updatedFiles));

    } catch (err) {
      addCryptoLog("Error: " + err.message);
      pushToast("Security operation failed", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) openVault('encrypt', file);
  };

  async function handleDecrypt(password) {
    if (!decryptFile) return;
    setIsProcessing(true);
    setDecryptedNotePreview(null);
    pushToast("Processing secure resource...", "info");
    setCryptoLogs([]);
    try {
      addCryptoLog("Extracting Salt and IV...");
      const buffer = await decryptFile.arrayBuffer();
      
      addCryptoLog("Deriving key from password...");
      const decrypted = await decryptBuffer(buffer, password);
      addCryptoLog("Decryption successful.");
      
      // Smart Note Handling
      if (decryptFile.name.includes("Note_") || decrypted.byteLength < 5000) {
        try {
          const text = new TextDecoder().decode(decrypted);
          if (/^[\x20-\x7E\s]*$/.test(text.slice(0, 100))) {
             setDecryptedNotePreview(text);
             addCryptoLog("Note preview generated.");
             pushToast("Note decrypted! Preview below.", "success");
             setIsProcessing(false);
             return;
          }
        } catch(_) {}
      }

      const originalName = decryptFile.name.replace(".secura", "");
      triggerDownload(decrypted, originalName);
      addCryptoLog("Resource restored to device.");
      pushToast("Decryption successful!", "success");
      setDecryptFile(null);
    } catch (err) {
      addCryptoLog("Error: Authentication failed.");
      pushToast("Decryption failed. Wrong password?", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSaveNote(password) {
    if (!noteText.trim()) return;
    setIsNoteProcessing(true);
    pushToast("Securing note locally...", "info");
    try {
      const encodedNote = new TextEncoder().encode(noteText);
      const encrypted = await encryptBuffer(encodedNote, password);

      const hashBuffer = await window.crypto.subtle.digest("SHA-256", encodedNote);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const baseName = `SecuraNote_${new Date().getTime()}`;

      try {
        if (state.token) {
          await registerMetadata(state.token, {
            original_name: baseName,
            size_bytes: encodedNote.byteLength,
            checksum: checksum
          });
        }
      } catch (e) {}
      
      triggerDownload(encrypted, `${baseName}.secura`);
      
      const newNote = {
        id: Math.random().toString(36).substr(2, 9),
        title: baseName,
        createdAt: new Date().toISOString()
      };
      const updatedNotes = [newNote, ...state.notes].slice(0, 10);
      setState(s => ({ ...s, notes: updatedNotes }));
      localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(updatedNotes));
      
      setNoteText("");
      pushToast("Note secured with password!", "success");
    } catch (err) {
      pushToast("Failed to secure note", "error");
    } finally {
      setIsNoteProcessing(false);
    }
  }

  // --- Components ---
  function SecurityVaultModal() {
    if (!vaultOpen) return null;

    // Calculate password strength
    const strength = useMemo(() => {
      if (!vaultPassword) return 0;
      let score = 0;
      if (vaultPassword.length > 8) score += 25;
      if (/[A-Z]/.test(vaultPassword)) score += 25;
      if (/[0-9]/.test(vaultPassword)) score += 25;
      if (/[^A-Za-z0-9]/.test(vaultPassword)) score += 25;
      return score;
    }, [vaultPassword]);

    const strengthColor = strength < 50 ? "#ef4444" : strength < 75 ? "#f59e0b" : "#10b981";

    return (
      <div className="modal-overlay">
        <div className="modal-content panel-animate">
          <div className="item-icon-box" style={{ margin: "0 auto 16px", background: "var(--primary)", color: "white" }}>
            <Icon name="lock" size={32} />
          </div>
          <h2 className="item-title" style={{ textAlign: "center", fontSize: 20 }}>Security Vault</h2>
          <p className="description-text" style={{ textAlign: "center", marginBottom: 24 }}>
            {vaultAction?.type === 'encrypt' ? "Set a password to protect this file." : 
             vaultAction?.type === 'decrypt' ? "Enter password to restore this file." : 
             "Set a password for this secure note."}
          </p>
          <input 
            type="password" 
            className="note-input-area" 
            style={{ height: "52px", marginBottom: "8px", textAlign: "center", fontSize: "18px", letterSpacing: "4px" }} 
            placeholder="••••••••" 
            value={vaultPassword}
            onChange={e => setVaultPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && processVault()}
            autoFocus
          />
          <div style={{ height: "4px", width: "100%", background: "rgba(0,0,0,0.05)", borderRadius: "2px", marginBottom: "20px", overflow: "hidden" }}>
             <div style={{ height: "100%", width: `${strength}%`, background: strengthColor, transition: "width 0.3s ease, background 0.3s ease" }}></div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="secondary-btn" style={{ flex: 1 }} onClick={() => setVaultOpen(false)}>Cancel</button>
            <button className="primary-btn" style={{ flex: 2 }} onClick={processVault}>Confirm</button>
          </div>
          <p style={{ fontSize: "11px", color: "#ef4444", fontWeight: 800, marginTop: "16px", textAlign: "center" }}>
            ⚠️ If you forget this password, your data cannot be recovered.
          </p>
          <p style={{ fontSize: "11px", opacity: 0.5, marginTop: "8px", textAlign: "center" }}>
            Secura uses Zero-Knowledge encryption. We never see your password.
          </p>
        </div>
      </div>
    );
  }

  async function handleGoogleSuccess(response) {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const data = await googleAuth(response.credential);
      setState((s) => ({ ...s, token: data.token, user: data.user, loading: false }));
      pushToast("Signed in with Google", "success");
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: "Google Sign-In failed" }));
    }
  }

  async function handleGuest() {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const data = await guestLogin();
      setState((s) => ({ ...s, token: data.token, user: data.user, loading: false }));
      pushToast("Guest session established", "info");
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        token: "offline-guest",
        user: { email: "guest@offline", role: "guest" }
      }));
      pushToast("Local guest session started", "info");
    }
  }

  function signOut() {
    setState(initialState);
    setIsEntered(false);
    localStorage.removeItem(STORAGE_KEY);
    pushToast("Signed out", "info");
  }

  function pushToast(message, type = "info") {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3000);
  }

  // --- Effects ---

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedTheme = localStorage.getItem(THEME_KEY);
    const seenSplash = localStorage.getItem(SPLASH_KEY) === "1";
    const savedFiles = localStorage.getItem(LOCAL_FILES_KEY);
    const savedNotes = localStorage.getItem(LOCAL_NOTES_KEY);
    const savedDecoy = localStorage.getItem(DECOY_KEY);

    if (savedTheme) setTheme(savedTheme);
    
    let initialFiles = [];
    if (savedFiles) {
      try { initialFiles = JSON.parse(savedFiles); } catch(_) {}
    }
    
    let initialNotes = [];
    if (savedNotes) {
      try { initialNotes = JSON.parse(savedNotes); } catch(_) {}
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.token) {
          setState((s) => ({ ...s, ...parsed, files: initialFiles, notes: initialNotes, decoyPassword: savedDecoy || "" }));
          setIsEntered(true);
        }
      } catch { 
        setState(s => ({ ...s, files: initialFiles, notes: initialNotes, decoyPassword: savedDecoy || "" }));
        localStorage.removeItem(STORAGE_KEY); 
      }
    } else {
      setState(s => ({ ...s, files: initialFiles, notes: initialNotes, decoyPassword: savedDecoy || "" }));
    }

    if (seenSplash) setShowSplash(false);
  }, []);

  useEffect(() => {
    if (state.token) localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: state.token, user: state.user }));
  }, [state.token, state.user]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    const root = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = prefersDark ? "dark" : "light";
    } else { root.dataset.theme = theme; }
  }, [theme]);

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
      localStorage.setItem(SPLASH_KEY, "1");
    }, 2400);
    return () => clearTimeout(timer);
  }, [showSplash]);

  const team = [
    { name: "Umang Gupta", role: "Lead & System Architecture Designer", focus: "System Design & Architecture", accent: "accent-sky" },
    { name: "Tribhuvan Pratap Singh", role: "UI Design & Frontend", focus: "Frontend & Interactivity", accent: "accent-mint" },
    { name: "Vineet Vikram Rao", role: "Cloud & User Management", focus: "User Auth & Cloud", accent: "accent-amber" },
    { name: "Vaishnavendra & Vipul", role: "Documentation & Testing", focus: "QA & Documentation", accent: "accent-lilac" }
  ];

  // --- Icons ---
  function Icon({ name, size=24 }) {
    const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" };
    switch (name) {
      case "lock": return <svg {...common}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
      case "unlock": return <svg {...common}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>;
      case "settings": return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V12a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
      case "info": return <svg {...common}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
      case "file": return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
      case "plus": return <svg {...common}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
      case "notes": return <svg {...common}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
      case "home": return <svg {...common}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
      case "terminal": return <svg {...common}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>;
      default: return null;
    }
  }

  // --- Auth Gateway ---
  if (!isAuthenticated || !isEntered) {
    return (
      <div className="auth-hero">
        {showSplash && (
          <div className="splash">
            <img src="/brand_logo.png" width="120" alt="Logo" />
            <h1 className="splash-title">Secura</h1>
          </div>
        )}
        <div className="auth-panel panel-animate">
          <img src="/brand_logo.png" width="100" alt="Secura" style={{ alignSelf: "center", marginBottom: "1rem" }} />
          <h1 className="headline-hero">Secure Your Life</h1>
          <p className="description-text">Professional-grade encryption directly in your browser. Private, local-first, and zero-knowledge.</p>
          
          {state.loading ? (
             <div className="hero-card" style={{ padding: '20px', textAlign: 'center' }}>
                <div className="item-icon-box" style={{ margin: '0 auto 12px', animation: 'pulse 1.5s infinite' }}><Icon name="lock" /></div>
                <p style={{ fontWeight: 800 }}>Verifying Identity...</p>
             </div>
          ) : state.token ? (
             <div className="hero-card panel-animate" style={{ padding: '32px', textAlign: 'center', border: '2px solid var(--primary)', background: 'rgba(87, 89, 146, 0.05)' }}>
                <div className="item-icon-box" style={{ margin: '0 auto 16px', background: 'var(--primary)', color: 'white' }}><Icon name="unlock" size={32} /></div>
                <h3 className="item-title" style={{ fontSize: '24px' }}>Access Granted</h3>
                <p className="description-text" style={{ marginBottom: '24px', fontSize: '15px' }}>Identity verified. Your secure environment is ready.</p>
                <button className="primary-btn" style={{ width: '100%', padding: '20px' }} onClick={() => setIsEntered(true)}>
                    Enter Secure Vault
                </button>
             </div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
               <div style={{ display: "flex", justifyContent: "center" }}><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => pushToast("Login Error", "error")} theme="filled_blue" shape="pill" width="320" /></div>
               <div className="divider"><span>OR</span></div>
               <button className="primary-btn" style={{ background: 'var(--primary)', color: 'white', fontWeight: 800 }} onClick={handleGuest}>Continue as Guest</button>
               <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <a href={APK_LINK} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", fontWeight: "900", fontSize: "13px", textDecoration: "none" }}>Get Mobile App for Cloud Sync</a>
               </div>
             </div>
          )}
        </div>
      </div>
    );
  }

  const recentFiles = [...state.files, ...state.notes.map(n => ({ ...n, isNote: true }))].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  const totalMB = (state.files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0) / (1024 * 1024)).toFixed(1);

  // --- Main Dashboard ---
  return (
    <div className="page">
      <div className="app-header"><h1>Secura</h1></div>

      {activeTab === "home" && (
        <>
          <div className="hero-card">
            <img src="/brand_logo.png" style={{ width: 110 }} alt="Brand" />
            <h2 className="headline-hero">Secure Your Life</h2>
            <p className="description-text">Move sensitive files to your private vault in seconds.</p>
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '12px' }}>
                <button className="primary-btn" style={{ flex: 1 }} onClick={() => { setActiveTab("vault"); setVaultView("files"); }}><Icon name="plus" size={20} /> Files</button>
                <button className="secondary-btn" style={{ flex: 1 }} onClick={() => { setActiveTab("vault"); setVaultView("notes"); }}><Icon name="notes" size={20} /> Notes</button>
            </div>
          </div>

          <div className="hero-card panel-animate" style={{ background: "linear-gradient(135deg, var(--primary) 0%, #7c7eb9 100%)", color: "white", textAlign: "left", alignItems: "flex-start" }}>
             <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ background: "rgba(255,255,255,0.2)", padding: "10px", borderRadius: "12px" }}><Icon name="unlock" size={24} /></div>
                <h3 className="item-title" style={{ color: "white", margin: 0 }}>Unlock Cloud Sync</h3>
             </div>
             <p style={{ fontSize: "14px", opacity: 0.9, lineHeight: 1.5, margin: "12px 0" }}>
                Take your secure vault anywhere. Sync files across devices and set up emergency inheritance with the Secura Mobile App.
             </p>
             <button className="secondary-btn" style={{ background: "white", color: "var(--primary)", border: "none" }} onClick={() => window.open(APK_LINK, "_blank")}>Get the App</button>
          </div>

          <div className="section-meta">
            <span className="label-caps">Recent Imports</span>
            <span className="usage-pill">{totalMB} MB USED</span>
          </div>
          <p className="description-text" style={{ fontSize: '12px', marginBottom: '12px', opacity: 0.7 }}>A reminder of the items you've recently secured on this device.</p>
          
          <div className="list-stack">
            {recentFiles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", opacity: 0.3 }}><Icon name="info" size={48} /><p style={{ fontWeight: 700, marginTop: "12px" }}>No Recent Activity</p></div>
            ) : (
              recentFiles.map(item => (
                <div key={item.fileId || item.id} className="item-card">
                   <div className="item-icon-box"><Icon name={item.isNote ? "notes" : "file"} /></div>
                   <div className="item-body">
                      <p className="item-title">{item.originalName || item.title}</p>
                      <p className="item-subtitle">{item.isNote ? "Secure Note" : `${(item.sizeBytes / 1024).toFixed(1)} KB`} • {new Date(item.createdAt).toLocaleDateString()}</p>
                   </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === "vault" && (
        <>
          <div className="section-meta" style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div className="theme-selector-app" style={{ display: 'flex', background: 'var(--card-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <button className={`vault-toggle ${vaultView === 'files' ? 'active' : ''}`} onClick={() => setVaultView('files')}>Files</button>
                <button className={`vault-toggle ${vaultView === 'notes' ? 'active' : ''}`} onClick={() => setVaultView('notes')}>Notes</button>
            </div>
          </div>

          {vaultView === 'files' ? (
            <>
              <div className={`dropzone ${isDragActive ? 'active' : ''}`} onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }} onDragLeave={() => setIsDragActive(false)} onDrop={onDrop} onClick={() => document.getElementById('encrypt-input').click()}>
                <div className="item-icon-box" style={{ width: 80, height: 80, borderRadius: 20 }}><Icon name="lock" size={40} /></div>
                <h2 className="headline-hero" style={{ fontSize: 24 }}>Encrypt & Secure</h2>
                <p className="description-text">Drag and drop any file to create a secure container.</p>
                <input id="encrypt-input" type="file" onChange={(e) => openVault('encrypt', e.target.files[0])} style={{ display: "none" }} />
              </div>

              <div className="hero-card" style={{ textAlign: "left", alignItems: "flex-start", padding: "32px", marginTop: '24px' }}>
                <h3 className="item-title">Decrypt & Restore</h3>
                <p className="description-text">Select your .secura container to recover your files.</p>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                    <label className="secondary-btn" style={{ cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Icon name="file" size={18} />
                        {decryptFile ? decryptFile.name : "Select .secura Container"}
                        <input type="file" onChange={(e) => setDecryptFile(e.target.files[0])} style={{ display: "none" }} />
                    </label>
                    <button className="primary-btn" disabled={!decryptFile || isProcessing} onClick={() => openVault('decrypt')}>
                        {isProcessing ? "Restoring..." : <><Icon name="unlock" size={18} /> Decrypt & Download</>}
                    </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="hero-card" style={{ alignItems: "stretch", textAlign: "left" }}>
                <h3 className="item-title" style={{ marginBottom: '12px' }}>Secure Notepad</h3>
                <textarea className="note-input-area" style={{ minHeight: '200px' }} placeholder="Write your sensitive note here... It will be encrypted before being saved." value={noteText} onChange={e => setNoteText(e.target.value)} />
                <button className="primary-btn" style={{ marginTop: '12px' }} disabled={isNoteProcessing || !noteText.trim()} onClick={() => openVault('note')}>
                    {isNoteProcessing ? "Securing..." : <><Icon name="lock" size={18} /> Encrypt & Download Note</>}
                </button>
              </div>
              <p className="description-text" style={{ fontSize: 13, opacity: 0.7, textAlign: 'center', marginTop: '12px' }}>Notes are encrypted in your browser using <strong>AES-256-GCM</strong>. You will need your password to decrypt.</p>
              
              <div className="hero-card" style={{ textAlign: "left", alignItems: "flex-start", padding: "32px", marginTop: '24px' }}>
                <h3 className="item-title">Decrypt Note</h3>
                <p className="description-text">Select a secured note file to view its content.</p>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                    <label className="secondary-btn" style={{ cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Icon name="notes" size={18} />
                        {decryptFile ? decryptFile.name : "Select Secure Note"}
                        <input type="file" onChange={(e) => setDecryptFile(e.target.files[0])} style={{ display: "none" }} />
                    </label>
                    <button className="primary-btn" disabled={!decryptFile || isProcessing} onClick={() => openVault('decrypt')}>
                        {isProcessing ? "Restoring..." : <><Icon name="unlock" size={18} /> Decrypt & Preview</>}
                    </button>
                </div>
              </div>
            </>
          )}

          {decryptedNotePreview && (
            <div className="hero-card panel-animate" style={{ marginTop: "2rem", textAlign: "left", alignItems: "flex-start", border: "2px solid var(--primary)", background: "rgba(87, 89, 146, 0.05)" }}>
               <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <h3 className="item-title">Restored Note Preview</h3>
                  <button className="usage-pill" style={{ cursor: "pointer", border: "none" }} onClick={() => setDecryptedNotePreview(null)}>CLOSE</button>
               </div>
               <div style={{ background: "var(--card-bg)", width: "100%", padding: "20px", borderRadius: "16px", marginTop: "12px", whiteSpace: "pre-wrap", border: "1px solid var(--border)", maxHeight: "300px", overflowY: "auto", fontSize: "15px" }}>
                  {decryptedNotePreview}
               </div>
               <button className="secondary-btn" style={{ marginTop: "1rem", width: '100%' }} onClick={() => {
                  const blob = new Blob([decryptedNotePreview], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "Decrypted_Note.txt";
                  a.click();
                  URL.revokeObjectURL(url);
               }}>Download as Text File</button>
            </div>
          )}

          {cryptoLogs.length > 0 && (
            <div className="terminal-box">
               <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontSize: "11px", fontWeight: 900, letterSpacing: 2 }}>
                  <Icon name="terminal" size={14} /> SECURITY CONSOLE
               </div>
               {cryptoLogs.map((log, i) => (
                 <div key={i} style={{ marginBottom: "4px", opacity: 1 - (i * 0.15) }}>{log}</div>
               ))}
            </div>
          )}
        </>
      )}

      {activeTab === "settings" && (
        <>
          <div className="section-meta"><span className="label-caps">Settings</span></div>
          <div className="hero-card" style={{ textAlign: "left", alignItems: "flex-start" }}>
             <h3 className="item-title">Account</h3><p className="item-subtitle">{state.user?.email || "Guest Session"}</p>
             <button className="primary-btn" style={{ marginTop: "12px", background: "#ef4444" }} onClick={signOut}>Sign Out</button>
          </div>
          <div className="hero-card" style={{ textAlign: "left", alignItems: "flex-start" }}>
             <h3 className="item-title">Appearance</h3>
             <div className="theme-selector-app" style={{ display: "flex", gap: "8px", marginTop: "16px", background: 'rgba(0,0,0,0.05)', padding: '6px', borderRadius: '14px' }}>
                {themeOptions.map(opt => (
                  <button key={opt} className={`theme-btn ${theme === opt ? 'active' : ''}`} onClick={() => setTheme(opt)}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</button>
                ))}
             </div>
          </div>
          
          <div style={{ display: 'none' }}> {/* Hidden as requested */}
            <div className="hero-card" style={{ textAlign: "left", alignItems: "flex-start" }}>
                <h3 className="item-title">Plausible Deniability (Decoy)</h3>
                <p className="description-text">Set a secondary password. If entered during decryption, Secura will load a fake environment to protect your real data.</p>
                <input 
                    type="password" 
                    className="note-input-area" 
                    style={{ height: "48px", minHeight: "48px", marginBottom: "12px" }} 
                    placeholder="Set Decoy Password" 
                    value={state.decoyPassword}
                    onChange={e => {
                    const val = e.target.value;
                    setState(s => ({ ...s, decoyPassword: val }));
                    localStorage.setItem(DECOY_KEY, val);
                    }}
                />
                {state.decoyPassword && <p style={{ fontSize: "11px", color: "#10b981", fontWeight: 800 }}>Decoy Protocol Active</p>}
            </div>
          </div>

          <div className="section-meta"><span className="label-caps">System Capabilities Map</span></div>
          <div className="hero-card" style={{ textAlign: "left", alignItems: "flex-start", gap: "20px" }}>
             <div style={{ width: "100%" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 900 }}>Current (Secura Web)</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                   <span className="usage-pill" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>LOCAL SANDBOX</span>
                   <span className="usage-pill" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>PBKDF2-AES256</span>
                   <span className="usage-pill" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>ZERO KNOWLEDGE</span>
                </div>
             </div>
             <div style={{ width: "100%", opacity: 0.6 }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 900 }}>Coming Soon (Secura Mobile)</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                   <span className="usage-pill">CLOUD DRIVE SYNC</span>
                   <span className="usage-pill">INHERITANCE PROTOCOL</span>
                   <span className="usage-pill">CROSS-DEVICE ACCESS</span>
                   <span className="usage-pill">BIOMETRIC AUTH</span>
                </div>
             </div>
             <button className="primary-btn" style={{ marginTop: "10px" }} onClick={() => window.open(APK_LINK, "_blank")}>Explore Pro Features</button>
          </div>
          <div className="hero-card" style={{ textAlign: "left", alignItems: "flex-start" }}>
             <h3 className="item-title">Storage</h3>
             <button className="secondary-btn" style={{ color: "#ef4444", borderColor: "#ef4444" }} onClick={() => { if(window.confirm("Clear all recent imports and local activity? Files in your downloads folder will remain.")) { localStorage.removeItem(LOCAL_FILES_KEY); localStorage.removeItem(LOCAL_NOTES_KEY); setState(s => ({ ...s, files: [], notes: [] })); pushToast("Recent imports cleared", "info"); } }}>Clear Recent Imports & Activity</button>
          </div>
        </>
      )}

      {activeTab === "about" && (
        <>
          <div className="section-meta"><span className="label-caps">Our Team</span></div>
          <div className="team-grid">
            {team.map(m => (
              <div key={m.name} className="team-card">
                 <div className="team-avatar">{m.name[0]}</div>
                 <p className="team-name">{m.name}</p>
                 <span className="team-role">{m.role}</span>
                 <p className="team-focus">{m.focus}</p>
              </div>
            ))}
          </div>
          <div className="terminal-box audit-box" style={{ background: "rgba(87, 89, 146, 0.05)", border: "1px solid var(--primary)" }}>
             <h3 style={{ fontSize: 16, fontWeight: 900 }}>🛡️ Technical Audit (Web)</h3>
             <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.8 }}>This project implements <strong>Zero-Knowledge Encryption</strong> via the W3C Web Crypto API. Keys are derived from your password using <strong>PBKDF2</strong> with 100,000 iterations. Data is secured using <strong>AES-256-GCM</strong>. Your raw passwords and keys never leave your browser memory, ensuring a private, local-first sandbox experience.</p>
          </div>
        </>
      )}

      <SecurityVaultModal />
      <div className="toast-stack">{toasts.map((t) => <div key={t.id} className={`toast`}>{t.message}</div>)}</div>

      {activeTab !== "vault" && (
        <div className="fab-container"><button className="fab" onClick={() => setActiveTab("vault")}><Icon name="plus" size={32} /></button></div>
      )}

      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === "home" ? 'active' : ''}`} onClick={() => setActiveTab("home")}><Icon name="home" size={24} /><span className="nav-label">Home</span></button>
        <button className={`nav-item ${activeTab === "vault" ? 'active' : ''}`} onClick={() => setActiveTab("vault")}><Icon name="lock" size={24} /><span className="nav-label">Vault</span></button>
        <button className={`nav-item ${activeTab === "settings" ? 'active' : ''}`} onClick={() => setActiveTab("settings")}><Icon name="settings" size={24} /><span className="nav-label">Settings</span></button>
        <button className={`nav-item ${activeTab === "about" ? 'active' : ''}`} onClick={() => setActiveTab("about")}><Icon name="info" size={24} /><span className="nav-label">About</span></button>
      </nav>
    </div>
  );
}
