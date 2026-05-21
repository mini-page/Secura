import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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

const STAGE = { SPLASH: "splash", AUTH: "auth", DASHBOARD: "dashboard" };

const initialState = {
  token: "",
  user: null,
  files: [],
  notes: [],
  decoyPassword: "",
  loading: false
};

const themeOptions = ["light", "dark", "system"];

export default function App() {
  const [state, setState] = useState(initialState);
  const [appStage, setAppStage] = useState(STAGE.SPLASH);
  const [activeTab, setActiveTab] = useState("home");
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState("light"); 
  
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultAction, setVaultAction] = useState(null); 
  
  const [decryptFile, setDecryptFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cryptoLogs, setCryptoLogs] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [decryptedNotePreview, setDecryptedNotePreview] = useState(null);
  const [showVaultPassword, setShowVaultPassword] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [sessionPassword, setSessionPassword] = useState(sessionStorage.getItem("secura_session_key") || "");
  const [rememberSession, setRememberSession] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");

  const [configBatch, setConfigBatch] = useState(localStorage.getItem("secura_cfg_batch") !== "0");
  const [configNoteTitles, setConfigNoteTitles] = useState(localStorage.getItem("secura_cfg_titles") !== "0");
  const [configSessionKey, setConfigSessionKey] = useState(localStorage.getItem("secura_cfg_session") !== "0");

  const [noteText, setNoteText] = useState("");
  const [isNoteProcessing, setIsNoteProcessing] = useState(false);
  const [vaultView, setVaultView] = useState("files"); 

  const APK_LINK = "https://github.com/mini-page/Secura/releases/download/v2.0.0/Secura_appV2.apk";

  const pushToast = useCallback((message, type = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => setToasts((l) => l.filter((t) => t.id !== id)), 3000);
  }, []);

  const enterVault = useCallback(() => {
    setAppStage(STAGE.DASHBOARD);
    localStorage.setItem(SPLASH_KEY, "1");
  }, []);

  const handleAuthSuccess = useCallback((data) => {
    setState(s => ({ ...s, token: data.token, user: data.user, loading: false }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, user: data.user }));
    setTimeout(enterVault, 600);
  }, [enterVault]);

  async function handleGoogleSuccess(response) {
    setState(s => ({ ...s, loading: true }));
    try {
      const data = await googleAuth(response.credential);
      handleAuthSuccess(data);
      pushToast("Identity verified", "success");
    } catch (err) {
      setState(s => ({ ...s, loading: false }));
      pushToast("Sync failed", "error");
    }
  }

  async function handleGuest() {
    setState(s => ({ ...s, loading: true }));
    try {
      const data = await guestLogin();
      handleAuthSuccess(data);
    } catch {
      const fallback = { token: "local-session", user: { email: "local@sandbox", name: "Local User" } };
      handleAuthSuccess(fallback);
    }
  }

  function signOut() {
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
    setAppStage(STAGE.AUTH);
  }

  const openVault = useCallback((type, payload = null) => {
    if (configSessionKey && sessionPassword) {
      if (type === 'encrypt') handleEncrypt(payload, sessionPassword);
      if (type === 'decrypt') handleDecrypt(sessionPassword);
      if (type === 'note') handleSaveNote(sessionPassword);
      return;
    }
    setVaultAction({ type, payload });
    setVaultOpen(true);
  }, [sessionPassword, configSessionKey]);

  async function processVault() {
    if (!vaultPassword) return;
    setVaultOpen(false);
    
    if (rememberSession) {
      setSessionPassword(vaultPassword);
      sessionStorage.setItem("secura_session_key", vaultPassword);
    }

    const { type, payload } = vaultAction;
    if (type === 'encrypt') await handleEncrypt(payload, vaultPassword);
    if (type === 'decrypt') await handleDecrypt(vaultPassword);
    if (type === 'note') await handleSaveNote(vaultPassword);
    setVaultPassword("");
  }

  async function handleEncrypt(files, password) {
    if (!files || (Array.isArray(files) && files.length === 0)) return;
    setIsProcessing(true);
    const fileList = Array.isArray(files) ? files : [files];
    
    try {
      const newHistoryItems = [];
      for (const file of fileList) {
        const buffer = await file.arrayBuffer();
        const encrypted = await encryptBuffer(buffer, password);
        triggerDownload(encrypted, `${file.name}.secura`);
        newHistoryItems.push({ fileId: (Date.now() + Math.random()).toString(), originalName: file.name, sizeBytes: buffer.byteLength, createdAt: new Date().toISOString() });
      }
      
      pushToast(`${fileList.length} file${fileList.length > 1 ? 's' : ''} secured`, "success");
      const updated = [...newHistoryItems, ...state.files].slice(0, 10);
      setState(s => ({ ...s, files: updated }));
      localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(updated));
    } catch (err) {
      pushToast("Security error", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDecrypt(password) {
    if (!decryptFile) return;
    setIsProcessing(true);
    setDecryptedNotePreview(null);
    try {
      const buffer = await decryptFile.arrayBuffer();
      const decrypted = await decryptBuffer(buffer, password);
      if (decryptFile.name.includes("Note_") || decrypted.byteLength < 10000) {
        try {
          const text = new TextDecoder().decode(decrypted);
          if (/^[\x20-\x7E\s]*$/.test(text.slice(0, 50))) {
            setDecryptedNotePreview(text);
            setIsProcessing(false);
            return;
          }
        } catch(_) {}
      }
      triggerDownload(decrypted, decryptFile.name.replace(".secura", ""));
      pushToast("Data restored", "success");
      setDecryptFile(null);
    } catch (err) {
      pushToast("Access denied: Invalid key", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSaveNote(password) {
    if (!noteText.trim()) return;
    setIsNoteProcessing(true);
    try {
      const encoded = new TextEncoder().encode(noteText);
      const encrypted = await encryptBuffer(encoded, password);
      const useTitle = configNoteTitles && noteTitle.trim();
      const baseName = useTitle ? noteTitle.trim().replace(/[^a-z0-9]/gi, '_') : `SecuraNote_${Date.now()}`;
      triggerDownload(encrypted, `${baseName}.secura`);
      const newNote = { id: Date.now().toString(), title: baseName, createdAt: new Date().toISOString() };
      const updated = [newNote, ...state.notes].slice(0, 10);
      setState(s => ({ ...s, notes: updated }));
      localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(updated));
      setNoteText("");
      setNoteTitle("");
      pushToast("Note secured", "success");
    } catch (err) {
      pushToast("Vault error", "error");
    } finally {
      setIsNoteProcessing(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedTheme = localStorage.getItem(THEME_KEY) || "light";
    const savedFiles = JSON.parse(localStorage.getItem(LOCAL_FILES_KEY) || "[]");
    const savedNotes = JSON.parse(localStorage.getItem(LOCAL_NOTES_KEY) || "[]");
    setTheme(savedTheme);
    let userState = { ...initialState, files: savedFiles, notes: savedNotes };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.token) userState = { ...userState, ...parsed };
      } catch(_) {}
    }
    setState(userState);
    const splashSeen = localStorage.getItem(SPLASH_KEY) === "1";
    const timer = setTimeout(() => {
      setAppStage(userState.token ? STAGE.DASHBOARD : STAGE.AUTH);
    }, splashSeen ? 50 : 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : theme;
  }, [theme]);

  useEffect(() => {
    const handleGlobalDrag = (e) => e.preventDefault();
    window.addEventListener("dragover", handleGlobalDrag);
    window.addEventListener("drop", handleGlobalDrag);
    return () => {
      window.removeEventListener("dragover", handleGlobalDrag);
      window.removeEventListener("drop", handleGlobalDrag);
    };
  }, []);

  function SecurityVaultModal() {
    if (!vaultOpen) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-content panel-animate">
          <div className="item-icon-box" style={{ margin: "0 auto 16px", background: "var(--primary)", color: "white" }}><Icon name="lock" size={32} /></div>
          <h2 className="item-title" style={{ textAlign: "center" }}>Security Vault</h2>
          <p className="description-text" style={{ textAlign: "center", marginBottom: 24 }}>Enter your vault password to continue.</p>
          
          <div style={{ position: 'relative', width: '100%' }}>
            <input 
              type={showVaultPassword ? "text" : "password"} 
              className="note-input-area" 
              style={{ textAlign: "center", fontSize: 20, letterSpacing: showVaultPassword ? 0 : 4, height: 60, paddingRight: 50 }} 
              placeholder="••••••••" 
              value={vaultPassword} 
              onChange={e => setVaultPassword(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && processVault()} 
              autoFocus 
            />
            <button 
              onClick={() => setShowVaultPassword(!showVaultPassword)} 
              style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted-light)', cursor: 'pointer', padding: 8 }}
            >
              <Icon name={showVaultPassword ? "eye-off" : "eye"} size={20} />
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button className="secondary-btn" style={{ flex: 1 }} onClick={() => { setVaultOpen(false); setShowVaultPassword(false); setRememberSession(false); }}>Cancel</button>
            <button className="primary-btn" style={{ flex: 2 }} onClick={processVault}>Confirm</button>
          </div>
          
          {configSessionKey && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, cursor: 'pointer', alignSelf: 'center' }}>
              <input 
                type="checkbox" 
                checked={rememberSession} 
                onChange={e => setRememberSession(e.target.checked)} 
                style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} 
              />
              <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}>Remember for this session</span>
            </label>
          )}

          <p style={{ fontSize: 11, color: "#ef4444", fontWeight: 800, marginTop: 20, textAlign: "center" }}>⚠️ No password recovery possible in Zero-Knowledge mode.</p>
        </div>
      </div>
    );
  }

  function MobilePromoBanner() {
    return (
      <div className="hero-card panel-animate" style={{ background: "linear-gradient(135deg, var(--primary) 0%, #7c7eb9 100%)", color: "white", textAlign: "left", alignItems: "flex-start", padding: '24px' }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}><div style={{ background: "rgba(255,255,255,0.2)", padding: 10, borderRadius: 12 }}><Icon name="unlock" size={24} /></div><h3 className="item-title" style={{ color: "white", margin: 0 }}>Advanced Features</h3></div>
          <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5, margin: "12px 0" }}>For Cloud Sync, Emergency Inheritance, and Account Management, download the Secura Mobile App.</p>
          <button className="secondary-btn" style={{ background: "white", color: "var(--primary)", border: "none", padding: '12px 20px', fontSize: '14px' }} onClick={() => window.open(APK_LINK, "_blank")}>Download Mobile APK</button>
      </div>
    );
  }

  const team = [
    { name: "Umang Gupta", role: "Lead & System Architecture Designer", focus: "System Design & Architecture" },
    { name: "Tribhuvan Pratap Singh", role: "UI Design & Frontend", focus: "Frontend & Interactivity" },
    { name: "Vineet Vikram Rao", role: "Cloud & User Management", focus: "User Auth & Cloud" },
    { name: "Vaishnavendra & Vipul", role: "Documentation & Testing", focus: "QA & Documentation" }
  ];

  if (appStage === STAGE.SPLASH) {
    return <div className="splash"><img src="/brand_logo.png" width="120" alt="Logo" /><h1 className="splash-title">Secura</h1></div>;
  }

  const recent = [...state.files, ...state.notes.map(n => ({ ...n, isNote: true }))].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);

  return (
    <div className={`app-shell stage-${appStage}`}>
      
      {appStage === STAGE.AUTH && (
        <div className="auth-hero">
          <div className="auth-panel panel-animate">
            <img src="/brand_logo.png" width="80" alt="Secura" style={{ alignSelf: "center" }} />
            <h1 className="headline-hero">Private Vault</h1>
            <p className="description-text">Professional local-first encryption sandbox. No account required for web usage.</p>
            {state.loading ? (
              <div className="hero-card" style={{ padding: 40 }}><div className="item-icon-box" style={{ margin: "0 auto", animation: "pulse 1.5s infinite" }}><Icon name="lock" /></div><p style={{ fontWeight: 800, marginTop: 12 }}>Initializing Sandbox...</p></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
                <button className="primary-btn" onClick={handleGuest} style={{ height: '64px', fontSize: '18px' }}>Enter My Vault</button>
                <div style={{ display: 'none' }}><GoogleLogin onSuccess={handleGoogleSuccess} /></div>
                <MobilePromoBanner />
              </div>
            )}
          </div>
        </div>
      )}

      {appStage === STAGE.DASHBOARD && (
        <div className="page enter-animation">
          <div className="app-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/brand_logo.png" width="40" style={{ marginRight: 10 }} />
              <h1>Secura</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 12px', borderRadius: 99, marginTop: 8, fontSize: 11, fontWeight: 800, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <Icon name="shield" size={12} /> Local Secure Sandbox
            </div>
          </div>

          {activeTab === "home" && (
            <>
              <div className="hero-card">
                <h2 className="headline-hero">Welcome Back</h2>
                <p className="description-text">Your local encryption workspace is active.</p>
                <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 12 }}>
                  <button className="primary-btn" style={{ flex: 1 }} onClick={() => { setActiveTab("vault"); setVaultView("files"); }}><Icon name="file" size={20} /> Files</button>
                  <button className="secondary-btn" style={{ flex: 1 }} onClick={() => { setActiveTab("vault"); setVaultView("notes"); }}><Icon name="notes" size={20} /> Notes</button>
                </div>
              </div>
              <div className="section-meta"><span className="label-caps">Activity History</span></div>
              <div className="simple-log-container">
                {recent.length === 0 ? (
                  <p style={{ fontSize: 13, opacity: 0.5, textAlign: 'center', margin: 0 }}>No recent vault activity recorded.</p>
                ) : (
                  recent.map(item => (
                    <div key={item.fileId || item.id} className="simple-log-entry">
                       <span className="log-time">[{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}]</span>
                       <span className="log-action">{item.isNote ? "Secured Note:" : "Encrypted File:"}</span>
                       <span className="log-file">{item.originalName || item.title}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === "vault" && (
            <>
              <div className="section-meta" style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <div className="theme-selector-app" style={{ display: "flex", background: "rgba(0,0,0,0.05)", padding: 4, borderRadius: 12, border: "1px solid var(--border)", width: '100%' }}>
                  <button className={`vault-toggle ${vaultView === 'files' ? 'active' : ''}`} onClick={() => setVaultView('files')}>Files</button>
                  <button className={`vault-toggle ${vaultView === 'notes' ? 'active' : ''}`} onClick={() => setVaultView('notes')}>Notes</button>
                </div>
              </div>
              {vaultView === 'files' ? (
                <>
                  {!stagedFiles.length ? (
                    <div className={`dropzone ${isDragActive ? 'active' : ''}`} 
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); }} 
                      onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); }}
                      onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); }} 
                      onDrop={e => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); let files = Array.from(e.dataTransfer.files); if(!configBatch) files = files.slice(0, 1); if(files.length) setStagedFiles(files); }} 
                      onClick={() => document.getElementById('enc-in').click()}>
                      <div className="item-icon-box" style={{ width: 80, height: 80, borderRadius: 20, transition: 'all 0.3s ease', transform: isDragActive ? 'scale(1.1) rotate(10deg)' : 'scale(1)' }}><Icon name={isDragActive ? "unlock" : "lock"} size={40} /></div>
                      <h2 className="headline-hero" style={{ fontSize: 24 }}>{isDragActive ? "Release to Stage" : "Encrypt Files"}</h2>
                      <p className="description-text">{isDragActive ? "Drop your files anywhere" : "Local AES-256-GCM Protection."}</p>
                      <input id="enc-in" type="file" multiple={configBatch} onChange={e => { let files = Array.from(e.target.files); if(!configBatch) files = files.slice(0, 1); setStagedFiles(files); }} style={{ display: "none" }} />
                    </div>
                  ) : (
                    <div className="hero-card panel-animate" style={{ border: '2px solid var(--primary)', textAlign: 'left', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span className="label-caps" style={{ color: 'var(--primary)' }}>{stagedFiles.length} File{stagedFiles.length > 1 ? 's' : ''} Staged for Encryption</span>
                        <button onClick={() => setStagedFiles([])} style={{ border: 'none', background: 'none', fontWeight: 900, color: 'var(--text-muted-light)', cursor: 'pointer' }}>CANCEL</button>
                      </div>
                      <div style={{ margin: '20px 0', width: '100%', maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {stagedFiles.map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 12 }}>
                            <Icon name="file" size={16} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                              <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>{(f.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="primary-btn" onClick={() => { openVault('encrypt', stagedFiles); setStagedFiles([]); }}>
                        <Icon name="lock" size={18} /> Secure All Files
                      </button>
                    </div>
                  )}
                  <div className="hero-card" style={{ textAlign: "left", alignItems: "flex-start", padding: 32, marginTop: 24 }}>
                    <h3 className="item-title">Decrypt & Restore</h3>
                    <p className="description-text">Select a .secura container to recover data.</p>
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                      <label className="secondary-btn" style={{ cursor: "pointer" }}><Icon name="file" size={18} /> {decryptFile ? decryptFile.name : "Select .secura File"}<input type="file" onChange={e => setDecryptFile(e.target.files[0])} style={{ display: "none" }} /></label>
                      <button className="primary-btn" disabled={!decryptFile || isProcessing} onClick={() => openVault('decrypt')}>{isProcessing ? "Restoring..." : "Restore Now"}</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="hero-card" style={{ alignItems: "stretch", textAlign: "left" }}>
                    <h3 className="item-title">Secure Notepad</h3>
                    {configNoteTitles && (
                      <input 
                        type="text" 
                        className="note-input-area" 
                        style={{ minHeight: 50, marginBottom: 12, fontWeight: 900, fontSize: 18, borderBottomWidth: 2 }} 
                        placeholder="Note Title (Optional)" 
                        value={noteTitle} 
                        onChange={e => setNoteTitle(e.target.value)} 
                      />
                    )}
                    <textarea className="note-input-area" style={{ minHeight: 200, fontFamily: "'Space Mono', monospace" }} placeholder="Your data is encrypted in-browser..." value={noteText} onChange={e => setNoteText(e.target.value)} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, color: noteText.length > 5000 ? '#ef4444' : 'inherit' }}>{noteText.length.toLocaleString()} characters</span>
                      <button className="primary-btn" style={{ width: 'auto', padding: '12px 24px' }} disabled={isNoteProcessing || !noteText.trim()} onClick={() => openVault('note')}>{isNoteProcessing ? "Securing..." : "Encrypt & Download"}</button>
                    </div>
                  </div>
                  <div className="hero-card" style={{ textAlign: "left", alignItems: "flex-start", padding: 32, marginTop: 24 }}>
                    <h3 className="item-title">Decrypt Note</h3>
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                      <label className="secondary-btn" style={{ cursor: "pointer" }}><Icon name="notes" size={18} /> {decryptFile ? decryptFile.name : "Select Note File"}<input type="file" onChange={e => setDecryptFile(e.target.files[0])} style={{ display: "none" }} /></label>
                      <button className="primary-btn" disabled={!decryptFile || isProcessing} onClick={() => openVault('decrypt')}>{isProcessing ? "Opening..." : "View Note Content"}</button>
                    </div>
                  </div>
                </>
              )}
              {decryptedNotePreview && (
                <div className="hero-card panel-animate" style={{ marginTop: 24, textAlign: "left", alignItems: "flex-start", border: "2px solid var(--primary)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: 'center' }}>
                    <h3 className="item-title">Restored Preview</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(decryptedNotePreview); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }} 
                        style={{ border: 'none', background: 'rgba(87, 89, 146, 0.1)', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: 'var(--primary)', cursor: 'pointer' }}
                      >
                        <Icon name={isCopied ? "check" : "copy"} size={14} /> {isCopied ? "COPIED" : "COPY"}
                      </button>
                      <button onClick={() => setDecryptedNotePreview(null)} style={{ border: 'none', background: 'none', fontWeight: 900, color: 'var(--primary)', cursor: 'pointer', padding: 8 }}>CLOSE</button>
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.02)", width: "100%", padding: 20, borderRadius: 16, marginTop: 12, whiteSpace: "pre-wrap", border: "1px solid var(--border)", maxHeight: 300, overflowY: "auto", fontFamily: "'Space Mono', monospace", fontSize: 14 }}>{decryptedNotePreview}</div>
                </div>
              )}
            </>
          )}

          {activeTab === "settings" && (
            <>
              <div className="section-meta"><span className="label-caps">Configuration</span></div>
              <div className="hero-card" style={{ textAlign: "left", alignItems: "flex-start" }}>
                <h3 className="item-title">Appearance</h3>
                <div className="theme-selector-app" style={{ display: "flex", gap: 8, marginTop: 16, background: "rgba(0,0,0,0.05)", padding: 6, borderRadius: 14, width: '100%' }}>
                  {themeOptions.map(opt => (
                    <button key={opt} className={`theme-btn ${theme === opt ? 'active' : ''}`} onClick={() => setTheme(opt)} style={{ flex: 1 }}>{opt.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <MobilePromoBanner />
              <div className="hero-card" style={{ textAlign: "left", alignItems: "flex-start" }}>
                <h3 className="item-title">Advanced</h3>
                <p className="description-text" style={{ marginBottom: 16 }}>Configure experimental and workflow features.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
                  {[
                    { id: 'batch', label: 'Multi-File Batch Mode', desc: 'Secure multiple files in one pass.', state: configBatch, setter: setConfigBatch, key: 'secura_cfg_batch' },
                    { id: 'titles', label: 'Custom Note Titles', desc: 'Give your secured notes descriptive names.', state: configNoteTitles, setter: setConfigNoteTitles, key: 'secura_cfg_titles' },
                    { id: 'session', label: 'Master Password Mode', desc: 'Hold key in memory for current session.', state: configSessionKey, setter: setConfigSessionKey, key: 'secura_cfg_session' }
                  ].map(cfg => (
                    <div key={cfg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 900 }}>{cfg.label}</p>
                        <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>{cfg.desc}</p>
                      </div>
                      <div 
                        onClick={() => { const next = !cfg.state; cfg.setter(next); localStorage.setItem(cfg.key, next ? "1" : "0"); }}
                        style={{ width: 44, height: 24, background: cfg.state ? 'var(--primary)' : 'rgba(0,0,0,0.1)', borderRadius: 20, position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        <div style={{ position: 'absolute', top: 3, left: cfg.state ? 23 : 3, width: 18, height: 18, background: 'white', borderRadius: '50%', transition: 'all 0.2s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hero-card" style={{ textAlign: "left", alignItems: "flex-start" }}>
                <h3 className="item-title">Data Management</h3>
                <p className="description-text">Clear your local activity history or active session keys.</p>
                <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 12 }}>
                  <button className="secondary-btn" style={{ color: "#ef4444", borderColor: "#ef4444", flex: 1 }} onClick={() => { if(window.confirm("Clear all local history?")) { localStorage.removeItem(LOCAL_FILES_KEY); localStorage.removeItem(LOCAL_NOTES_KEY); setState(s => ({ ...s, files: [], notes: [] })); pushToast("History cleared", "info"); } }}>Clear History</button>
                  {sessionPassword && (
                    <button className="secondary-btn" style={{ flex: 1 }} onClick={() => { setSessionPassword(""); sessionStorage.removeItem("secura_session_key"); pushToast("Session key cleared", "info"); }}>Clear Session Key</button>
                  )}
                </div>
              </div>
              <div style={{ display: 'none' }}><button onClick={signOut}>Sign Out</button></div>
            </>
          )}

          {activeTab === "about" && (
            <>
              <div className="section-meta"><span className="label-caps">Engineering Team</span></div>
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
              <div className="terminal-box audit-box" style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 900 }}>🛡️ Security Audit</h3>
                <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6 }}>This project implements <strong>Zero-Knowledge Encryption</strong> via the W3C Web Crypto API. Keys are derived using <strong>PBKDF2</strong> with 100,000 iterations. Data is secured using <strong>AES-256-GCM</strong>. Your raw passwords never leave your browser memory.</p>
              </div>
            </>
          )}

          <nav className="bottom-nav">
            <button className={`nav-item ${activeTab === "home" ? 'active' : ''}`} onClick={() => setActiveTab("home")}><Icon name="home" /><span className="nav-label">Home</span></button>
            <button className={`nav-item ${activeTab === "vault" ? 'active' : ''}`} onClick={() => setActiveTab("vault")}><Icon name="lock" /><span className="nav-label">Vault</span></button>
            <button className={`nav-item ${activeTab === "settings" ? 'active' : ''}`} onClick={() => setActiveTab("settings")}><Icon name="settings" /><span className="nav-label">Settings</span></button>
            <button className={`nav-item ${activeTab === "about" ? 'active' : ''}`} onClick={() => setActiveTab("about")}><Icon name="info" /><span className="nav-label">About</span></button>
          </nav>
        </div>
      )}

      <SecurityVaultModal />
      <div className="toast-stack">{toasts.map(t => <div key={t.id} className="toast">{t.message}</div>)}</div>
    </div>
  );
}

function Icon({ name, size=24 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "lock": return <svg {...common}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
    case "unlock": return <svg {...common}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>;
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V12a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    case "info": return <svg {...common}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
    case "file": return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
    case "plus": return <svg {...common}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case "notes": return <svg {...common}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
    case "home": return <svg {...common}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
    case "terminal": return <svg {...common}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>;
    case "eye": return <svg {...common}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "eye-off": return <svg {...common}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
    case "copy": return <svg {...common}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
    case "shield": return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    case "check": return <svg {...common}><polyline points="20 6 9 17 4 12" /></svg>;
    default: return null;
  }
}
