import { useEffect, useMemo, useRef, useState } from "react";
import {
  downloadFile,
  fetchActivity,
  fetchAdminAudit,
  fetchAdminUsers,
  fetchAnalytics,
  fetchFiles,
  guestLogin,
  login,
  register,
  uploadFileWithProgress
} from "./api/client";

const STORAGE_KEY = "secura_web_session";
const THEME_KEY = "secura_web_theme";
const SPLASH_KEY = "secura_web_seen_splash";
const LOCAL_FILES_KEY = "secura_web_files";
const LOCAL_ACTIVITY_KEY = "secura_web_activity";

const initialState = {
  token: "",
  user: null,
  files: [],
  activity: [],
  adminUsers: [],
  adminLogs: [],
  loading: false,
  error: "",
  notice: ""
};

const themeOptions = ["system", "light", "dark"];

export default function App() {
  const [state, setState] = useState(initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [activeTab, setActiveTab] = useState("files");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("Idle");
  const [encryptingName, setEncryptingName] = useState("");
  const [uploadComplete, setUploadComplete] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [activityQuery, setActivityQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [theme, setTheme] = useState("system");
  const [showSplash, setShowSplash] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [settings, setSettings] = useState({
    autoLock: true,
    biometrics: false,
    notifications: true,
    privacyShield: true,
    clipboardTimeout: true,
    haptics: true,
    reduceMotion: false
  });

  const uploadInputRef = useRef(null);
  const isAdmin = state.user?.role === "admin";

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedTheme = localStorage.getItem(THEME_KEY);
    const seenSplash = localStorage.getItem(SPLASH_KEY) === "1";
    if (savedTheme && themeOptions.includes(savedTheme)) {
      setTheme(savedTheme);
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.token) {
          setState((s) => ({ ...s, token: parsed.token, user: parsed.user || null }));
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    if (seenSplash) {
      setShowSplash(false);
    }
  }, []);

  useEffect(() => {
    if (state.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: state.token, user: state.user }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state.token, state.user]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    const root = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = prefersDark ? "dark" : "light";
    } else {
      root.dataset.theme = theme;
    }
  }, [theme]);


  function readLocalFiles() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_FILES_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function writeLocalFiles(files) {
    localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(files));
  }

  function readLocalActivity() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_ACTIVITY_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function writeLocalActivity(logs) {
    localStorage.setItem(LOCAL_ACTIVITY_KEY, JSON.stringify(logs));
  }

  function isDemo() {
    return !state.token || state.token === "offline-guest";
  }

  function newId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
      localStorage.setItem(SPLASH_KEY, "1");
    }, 2400);
    return () => clearTimeout(timer);
  }, [showSplash]);

  async function handleAuth(e) {
    e.preventDefault();
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const data = mode === "login" ? await login(email, password) : await register(email, password);
      setState((s) => ({ ...s, token: data.token, user: data.user, loading: false }));
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }

  async function handleGuest() {
    setState((s) => ({ ...s, loading: true, error: "", notice: "" }));
    try {
      const data = await guestLogin();
      setState((s) => ({ ...s, token: data.token, user: data.user, loading: false }));
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        notice: "Offline guest mode enabled.",
        token: "offline-guest",
        user: { email: "guest@offline", role: "guest" }
      }));
    }
  }

  function signOut() {
    setState(initialState);
    setEmail("");
    setPassword("");
  }

  async function loadFiles() {
    if (isDemo()) {
      const localFiles = readLocalFiles();
      setState((s) => ({ ...s, files: localFiles, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const data = await fetchFiles(state.token);
      setState((s) => ({ ...s, files: data, loading: false }));
    } catch (err) {
      const localFiles = readLocalFiles();
      setState((s) => ({ ...s, files: localFiles, loading: false, error: err.message }));
    }
  }

  async function loadActivity() {
    if (isDemo()) {
      const localLogs = readLocalActivity();
      setState((s) => ({ ...s, activity: localLogs, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const data = await fetchActivity(state.token);
      setState((s) => ({ ...s, activity: data, loading: false }));
    } catch (err) {
      const localLogs = readLocalActivity();
      setState((s) => ({ ...s, activity: localLogs, loading: false, error: err.message }));
    }
  }

  async function loadAnalytics() {
    if (isDemo()) {
      setAnalytics(computeLocalAnalytics(state.files, state.activity));
      return;
    }
    try {
      const data = await fetchAnalytics(state.token);
      setAnalytics(data);
    } catch {
      setAnalytics(computeLocalAnalytics(state.files, state.activity));
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadStage("Encrypting");
    setEncryptingName(file.name || "selected file");
    setUploadComplete("");
    setState((s) => ({ ...s, notice: "Encrypting and uploading...", error: "" }));

    if (isDemo()) {
      let progress = 0;
      const timer = setInterval(() => {
        progress = Math.min(1, progress + 0.08);
        setUploadProgress(progress);
      }, 140);
      setTimeout(() => {
        setUploadStage("Finalizing");
        clearInterval(timer);
        const localFiles = readLocalFiles();
        const entry = {
          fileId: newId(),
          originalName: file.name,
          sizeBytes: file.size || 0,
          createdAt: new Date().toISOString()
        };
        const updated = [entry, ...localFiles];
        writeLocalFiles(updated);
        const logs = readLocalActivity();
        logs.unshift({ id: newId(), action: "UPLOAD_FILE", timestamp: new Date().toISOString() });
        writeLocalActivity(logs);
        setState((s) => ({ ...s, files: updated, activity: logs, notice: "Upload complete." }));
        setUploadComplete("Encryption complete. File secured.");
        setTimeout(() => setUploadComplete(""), 1400);
        setUploading(false);
        setUploadProgress(0);
        setUploadStage("Idle");
        setEncryptingName("");
      }, 1700);
      event.target.value = "";
      return;
    }

    try {
      await uploadFileWithProgress(state.token, file, (progress) => {
        setUploadProgress(progress);
      });
      setUploadStage("Finalizing");
      setUploadComplete("Encryption complete. File secured.");
      setTimeout(() => setUploadComplete(""), 1400);
      setState((s) => ({ ...s, notice: "Upload complete." }));
      await loadFiles();
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStage("Idle");
      setEncryptingName("");
      event.target.value = "";
    }
  }

  function openDetail(file) {
    setActiveFile(file);
    setDetailOpen(true);
  }

  async function handleDownloadWeb(file) {
    if (isDemo()) {
      const logs = readLocalActivity();
      logs.unshift({ id: newId(), action: "DOWNLOAD_FILE", timestamp: new Date().toISOString() });
      writeLocalActivity(logs);
      setState((s) => ({ ...s, activity: logs, notice: "Download ready (demo mode)." }));
      return;
    }
    try {
      await downloadFile(state.token, file.fileId, file.originalName);
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }));
    }
  }

  async function loadAdmin() {
    if (!state.token || !isAdmin) return;
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const [users, logs] = await Promise.all([
        fetchAdminUsers(state.token),
        fetchAdminAudit(state.token)
      ]);
      setState((s) => ({ ...s, adminUsers: users, adminLogs: logs, loading: false }));
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }

  useEffect(() => {
    if (activeTab === "files") {
      loadFiles();
      loadAnalytics();
    }
    if (activeTab === "activity") {
      loadActivity();
    }
    if (activeTab === "admin") {
      loadAdmin();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "files") return;
    if (isDemo()) {
      setAnalytics(computeLocalAnalytics(state.files, state.activity));
    }
  }, [activeTab, state.files, state.activity, state.token]);

  const filteredFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = state.files.filter((file) => file.originalName.toLowerCase().includes(normalized));
    if (sortBy === "name") {
      return [...list].sort((a, b) => a.originalName.localeCompare(b.originalName));
    }
    if (sortBy === "size") {
      return [...list].sort((a, b) => b.sizeBytes - a.sizeBytes);
    }
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [state.files, query, sortBy]);

  const parsedActivity = useMemo(() => {
    return state.activity.map((log) => {
      const action = log.action || "";
      const type = action.includes("UPLOAD")
        ? "upload"
        : action.includes("DOWNLOAD")
          ? "download"
          : action.includes("LOGIN") || action.includes("REGISTER")
            ? "login"
            : "other";
      return {
        id: log.id,
        type,
        label:
          action === "UPLOAD_FILE"
            ? "Uploaded a file"
            : action === "DOWNLOAD_FILE"
              ? "Downloaded a file"
              : action === "LOGIN"
                ? "Signed in to Secura"
                : action === "REGISTER"
                  ? "Created an account"
                  : action,
        time: new Date(log.timestamp).toLocaleString()
      };
    });
  }, [state.activity]);

  const filteredActivity = parsedActivity.filter((item) => {
    const matchesFilter = activityFilter === "all" || item.type === activityFilter;
    const matchesQuery = item.label.toLowerCase().includes(activityQuery.trim().toLowerCase());
    return matchesFilter && matchesQuery;
  });

  const recentFiles = useMemo(() => state.files.slice(0, 4), [state.files]);
  const analyticsSeries = analytics?.activitySeries || [];
  const maxUploads = analyticsSeries.reduce((max, item) => Math.max(max, item.uploads || 0), 1);
  const chartHeights = analyticsSeries.map((item) =>
    Math.round(((item.uploads || 0) / maxUploads) * 100)
  );
  const totalBytes = useMemo(
    () => state.files.reduce((sum, file) => sum + (file.sizeBytes || 0), 0),
    [state.files]
  );
  const totalQuota = 5 * 1024 * 1024 * 1024;
  const usageRatio = Math.min(1, totalBytes / totalQuota);

  const activitySummary = useMemo(() => {
    const uploads = parsedActivity.filter((item) => item.type === "upload").length;
    const downloads = parsedActivity.filter((item) => item.type === "download").length;
    const logins = parsedActivity.filter((item) => item.type === "login").length;
    return { uploads, downloads, logins };
  }, [parsedActivity]);

  function formatBytes(bytes = 0) {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  function computeLocalAnalytics(files, activity) {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const last7 = new Date(now.getTime() - 7 * dayMs);
    const prev7 = new Date(now.getTime() - 14 * dayMs);

    const uploadsLast7 = activity.filter(
      (item) => item.action === "UPLOAD_FILE" && new Date(item.timestamp) >= last7
    ).length;
    const downloadsLast7 = activity.filter(
      (item) => item.action === "DOWNLOAD_FILE" && new Date(item.timestamp) >= last7
    ).length;

    const series = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now.getTime() - i * dayMs);
      const dateStr = date.toISOString().slice(0, 10);
      const uploads = activity.filter(
        (item) => item.action === "UPLOAD_FILE" && item.timestamp?.startsWith(dateStr)
      ).length;
      const downloads = activity.filter(
        (item) => item.action === "DOWNLOAD_FILE" && item.timestamp?.startsWith(dateStr)
      ).length;
      series.push({ date: dateStr, uploads, downloads });
    }

    const totalBytes = files.reduce((sum, file) => sum + (file.sizeBytes || 0), 0);
    const addedLast7 = files
      .filter((file) => new Date(file.createdAt) >= last7)
      .reduce((sum, file) => sum + (file.sizeBytes || 0), 0);
    const addedPrev7 = files
      .filter((file) => new Date(file.createdAt) >= prev7 && new Date(file.createdAt) < last7)
      .reduce((sum, file) => sum + (file.sizeBytes || 0), 0);

    let trendPercent = 0;
    if (addedPrev7 > 0) {
      trendPercent = ((addedLast7 - addedPrev7) / addedPrev7) * 100;
    } else if (addedLast7 > 0) {
      trendPercent = 100;
    }

    let score = 90;
    if (files.length > 0) score += 2;
    if (uploadsLast7 + downloadsLast7 > 0) score += 2;
    score = Math.min(96, score);

    return {
      rangeDays: 7,
      uploadsLast7,
      downloadsLast7,
      activitySeries: series,
      securityHealth: { score, label: "Encryption + access checks" },
      storage: {
        totalBytes,
        addedLast7Bytes: addedLast7,
        trendPercent: Number(trendPercent.toFixed(1)),
        label: "This week"
      },
      filesTotal: files.length
    };
  }

  function fileIcon(name = "") {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "IMG";
    if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "VID";
    if (["zip", "rar", "7z", "tar"].includes(ext)) return "ZIP";
    if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) return "DOC";
    return "FILE";
  }

  return (
    <div className="page">
      {showSplash ? (
        <div className="splash">
          <div className="splash-bg" />
          <div className="splash-content">
            <div className="splash-logo" aria-hidden="true">
              <svg viewBox="0 0 120 120" role="img">
                <defs>
                  <linearGradient id="securaGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#bfe2ff" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="52" fill="url(#securaGradient)" opacity="0.2" />
                <path
                  d="M60 18l30 10v24c0 22-12 40-30 50-18-10-30-28-30-50V28l30-10z"
                  fill="rgba(255,255,255,0.9)"
                />
                <path
                  d="M60 42c-8 0-14 6-14 14v8h28v-8c0-8-6-14-14-14zm0 8c4 0 6 3 6 6v4H54v-4c0-3 2-6 6-6z"
                  fill="#0c3cff"
                />
              </svg>
            </div>
            <h1 className="splash-title">Secura</h1>
            <p className="splash-subtitle">Secure file vault for every device.</p>
          </div>
        </div>
      ) : null}

      <header className="hero">
        <div className="hero-glow" />
        <div className="hero-inner">
          <span className="pill">Secura</span>
          <h1>Secure file vault for every device.</h1>
          <p>
            Your encrypted workspace on web and mobile. Keep files protected, searchable, and
            always in your control.
          </p>
          <div className="cta-row">
            <button className="primary" onClick={() => setActiveTab("files")}>Open files</button>
            <button className="ghost" onClick={() => setActiveTab("overview")}>Account</button>
          </div>
        </div>
      </header>

      {activeTab === "overview" ? (
        <section className="panel account panel-animate">
          <div className="panel-header">
            <h2>Account</h2>
            {state.user ? <span className="status">Signed in as {state.user.email}</span> : null}
          </div>
          <div className="auth-card">
            <form className="auth" onSubmit={handleAuth}>
              <div className="tabs">
                {[
                  { key: "login", label: "Login" },
                  { key: "register", label: "Register" }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={mode === tab.key ? "tab active" : "tab"}
                    onClick={() => setMode(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <label>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label>
                Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              {state.error ? <div className="error">{state.error}</div> : null}
              {state.notice ? <div className="notice">{state.notice}</div> : null}
              <div className="button-row">
                <button className="primary" type="submit" disabled={state.loading}>
                  {state.loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
                </button>
                {state.token ? (
                  <button className="ghost" type="button" onClick={signOut}>Sign out</button>
                ) : null}
              </div>
              <button
                className="ghost small"
                type="button"
                onClick={() => setState((s) => ({ ...s, notice: "Google login is a demo placeholder." }))}
              >
                Continue with Google
              </button>
              <button className="ghost small" type="button" onClick={handleGuest}>
                Continue as Guest
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {activeTab === "files" ? (
        <section className="panel files panel-animate">
          <div className="blob blob-one" />
          <div className="blob blob-two" />
          <div className="blob blob-three" />
          <div className="panel-header">
            <div>
              <h2>Files</h2>
              <span className="status">{state.files.length} items</span>
            </div>
            <div className="button-row">
              <label className="upload-btn">
                {uploading ? "Uploading..." : "Upload file"}
                <input
                  type="file"
                  onChange={handleUpload}
                  disabled={uploading}
                  ref={uploadInputRef}
                />
              </label>
              <button className="ghost" onClick={loadFiles} disabled={uploading}>Refresh</button>
            </div>
          </div>

          <div className="usage-card">
            <div>
              <h3>Storage usage</h3>
              <span className="muted">
                {formatBytes(totalBytes)} of {formatBytes(totalQuota)}
              </span>
            </div>
            <div className="usage-bar">
              <div className="usage-fill" style={{ width: `${Math.round(usageRatio * 100)}%` }} />
            </div>
            <span className="muted">Last sync {new Date().toLocaleTimeString()}</span>
          </div>

          <div className="overview-grid">
            <div className="stat-card">
              <p>Files stored</p>
              <h3>{state.files.length}</h3>
            </div>
            <div className="stat-card">
              <p>Encryption</p>
              <h3>AES-256</h3>
            </div>
            <div className="stat-card">
              <p>Status</p>
              <h3>{state.token ? "Online" : "Offline"}</h3>
            </div>
          </div>

          <div className="dashboard">
            <div className="chart-card">
              <h3>Upload activity</h3>
              {analytics ? (
                <>
                  <div className="chart">
                    {chartHeights.map((height, index) => (
                      <div key={index} className="bar" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <span className="muted">Last {analytics.rangeDays} days</span>
                </>
              ) : (
                <div className="empty">Not available.</div>
              )}
            </div>
            <div className="chart-card">
              <h3>Security health</h3>
              {analytics ? (
                <>
                  <div className="ring">
                    <div className="ring-inner">{analytics.securityHealth.score}%</div>
                  </div>
                  <span className="muted">{analytics.securityHealth.label}</span>
                </>
              ) : (
                <div className="empty">Not available.</div>
              )}
            </div>
            <div className="chart-card">
              <h3>Storage trend</h3>
              {analytics ? (
                <>
                  <div className="sparkline">
                    <span />
                  </div>
                  <span className="muted">
                    {analytics.storage.trendPercent >= 0 ? "+" : ""}
                    {analytics.storage.trendPercent}% {analytics.storage.label}
                  </span>
                </>
              ) : (
                <div className="empty">Not available.</div>
              )}
            </div>
          </div>

          <div className="toolbar">
            <input
              className="search"
              placeholder="Search files"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button className="ghost small" onClick={() => setQuery("")}>
                Clear
              </button>
            ) : null}
            <div className="chip-row">
              {[
                { key: "recent", label: "Recent" },
                { key: "name", label: "Name" },
                { key: "size", label: "Size" }
              ].map((item) => (
                <button
                  key={item.key}
                  className={sortBy === item.key ? "chip active" : "chip"}
                  onClick={() => setSortBy(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {uploading ? (
            <div className="progress-row">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.round(uploadProgress * 100)}%` }} />
              </div>
              <span className="progress-label">{Math.round(uploadProgress * 100)}%</span>
              <span className="encrypt-badge">Encrypting…</span>
              {encryptingName ? <span className="muted">{encryptingName}</span> : null}
              <span className="progress-stage">{uploadStage === "Idle" ? "" : uploadStage}</span>
            </div>
          ) : null}
          {uploadComplete ? <div className="notice">{uploadComplete}</div> : null}

          <div className="file-grid">
            {filteredFiles.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">UP</div>
                <div>No files yet. Upload from web or mobile.</div>
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div key={file.fileId} className="file-card">
                  <div className="file-title">
                    <span className="file-icon">{fileIcon(file.originalName)}</span>
                    {file.originalName}
                  </div>
                  <div className="file-meta">{(file.sizeBytes / 1024).toFixed(1)} KB</div>
                  <div className="file-meta">{new Date(file.createdAt).toLocaleString()}</div>
                  <span className="chip">Encrypted</span>
                  <div className="button-row">
                    <button className="ghost small" onClick={() => openDetail(file)}>
                      Details
                    </button>
                    <button
                      className="ghost small"
                      onClick={() => handleDownloadWeb(file)}
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {recentFiles.length > 0 ? (
            <div className="recent">
              <h3>Recent uploads</h3>
              <div className="recent-row recent-list">
                {recentFiles.map((file) => (
                  <div key={file.fileId} className="recent-card">
                    <div>
                      <strong>{file.originalName}</strong>
                      <div className="muted">
                        {(file.sizeBytes / 1024).toFixed(1)} KB · {new Date(file.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      className="ghost small"
                      onClick={() => handleDownloadWeb(file)}
                    >
                      DL
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "activity" ? (
        <section className="panel panel-animate">
          <div className="panel-header">
            <div>
              <h2>Activity</h2>
              <span className="status">Audit trail</span>
            </div>
            <button className="ghost" onClick={loadActivity}>Refresh</button>
          </div>

          <div className="overview-grid">
            <div className="stat-card">
              <p>Uploads</p>
              <h3>{activitySummary.uploads}</h3>
            </div>
            <div className="stat-card">
              <p>Downloads</p>
              <h3>{activitySummary.downloads}</h3>
            </div>
            <div className="stat-card">
              <p>Logins</p>
              <h3>{activitySummary.logins}</h3>
            </div>
          </div>

          <div className="toolbar">
            <input
              className="search"
              placeholder="Search activity"
              value={activityQuery}
              onChange={(e) => setActivityQuery(e.target.value)}
            />
            <div className="chip-row">
              {[
                { key: "all", label: "All" },
                { key: "upload", label: "Uploads" },
                { key: "download", label: "Downloads" },
                { key: "login", label: "Logins" }
              ].map((item) => (
                <button
                  key={item.key}
                  className={activityFilter === item.key ? "chip active" : "chip"}
                  onClick={() => setActivityFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="activity-list">
            {filteredActivity.length === 0 ? (
              <div className="empty">No matching activity.</div>
            ) : (
              filteredActivity.map((item) => (
                <div key={item.id} className="activity-row">
                  <div className="activity-dot" />
                  <div>
                    <strong>{item.label}</strong>
                    <div className="muted">{item.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "settings" ? (
        <section className="panel panel-animate">
          <div className="panel-header">
            <h2>Settings</h2>
            <span className="status">Preferences</span>
          </div>

          <div className="settings-grid">
            <div className="settings-card">
              <h3>Theme</h3>
              <div className="chip-row">
                {themeOptions.map((item) => (
                  <button
                    key={item}
                    className={theme === item ? "chip active" : "chip"}
                    onClick={() => setTheme(item)}
                  >
                    {item === "system" ? "System" : item === "dark" ? "Dark" : "Light"}
                  </button>
                ))}
              </div>
              <span className="muted">System matches your device settings.</span>
            </div>

            <div className="settings-card">
              <h3>Security</h3>
              <div className="toggle-row">
                <div>
                  <strong>Auto-lock</strong>
                  <div className="muted">Lock after 2 minutes of inactivity.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoLock}
                  onChange={() => setSettings((s) => ({ ...s, autoLock: !s.autoLock }))}
                />
              </div>
              <div className="toggle-row">
                <div>
                  <strong>Biometric unlock</strong>
                  <div className="muted">Use fingerprint or Face ID.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.biometrics}
                  onChange={() => setSettings((s) => ({ ...s, biometrics: !s.biometrics }))}
                />
              </div>
            </div>

            <div className="settings-card">
              <h3>Privacy</h3>
              <div className="toggle-row">
                <div>
                  <strong>Hide app previews</strong>
                  <div className="muted">Blur Secura in the app switcher.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.privacyShield}
                  onChange={() => setSettings((s) => ({ ...s, privacyShield: !s.privacyShield }))}
                />
              </div>
              <div className="toggle-row">
                <div>
                  <strong>Clipboard timeout</strong>
                  <div className="muted">Clear copied links after 60 seconds.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.clipboardTimeout}
                  onChange={() => setSettings((s) => ({ ...s, clipboardTimeout: !s.clipboardTimeout }))}
                />
              </div>
            </div>

            <div className="settings-card">
              <h3>Experience</h3>
              <div className="toggle-row">
                <div>
                  <strong>Haptic feedback</strong>
                  <div className="muted">Subtle taps for secure actions.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.haptics}
                  onChange={() => setSettings((s) => ({ ...s, haptics: !s.haptics }))}
                />
              </div>
              <div className="toggle-row">
                <div>
                  <strong>Reduce motion</strong>
                  <div className="muted">Minimize animated transitions.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reduceMotion}
                  onChange={() => setSettings((s) => ({ ...s, reduceMotion: !s.reduceMotion }))}
                />
              </div>
            </div>

            <div className="settings-card">
              <h3>Connections</h3>
              <div className="connection-row">
                <span className="conn-dot google" />
                <div>
                  <strong>Google Drive</strong>
                  <div className="muted">Not linked</div>
                </div>
                <button className="ghost small">Link</button>
              </div>
              <div className="connection-row">
                <span className="conn-dot icloud" />
                <div>
                  <strong>iCloud</strong>
                  <div className="muted">Not linked</div>
                </div>
                <button className="ghost small">Link</button>
              </div>
              <div className="connection-row">
                <span className="conn-dot onedrive" />
                <div>
                  <strong>OneDrive</strong>
                  <div className="muted">Not linked</div>
                </div>
                <button className="ghost small">Link</button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "admin" ? (
        <section className="panel admin panel-animate">
          <div className="panel-header">
            <h2>Admin Console</h2>
            <button className="ghost" onClick={loadAdmin}>Refresh</button>
          </div>
          {state.error ? <div className="error">{state.error}</div> : null}
          <div className="admin-grid">
            <div className="admin-card">
              <h3>Users</h3>
              {state.adminUsers.length === 0 ? (
                <div className="empty">No users found.</div>
              ) : (
                state.adminUsers.map((user) => (
                  <div key={user.id} className="admin-row">
                    <div>
                      <strong>{user.email}</strong>
                      <div className="muted">Role: {user.role}</div>
                    </div>
                    <span className="chip">{user.role}</span>
                  </div>
                ))
              )}
            </div>
            <div className="admin-card">
              <h3>Audit Logs</h3>
              {state.adminLogs.length === 0 ? (
                <div className="empty">No logs found.</div>
              ) : (
                state.adminLogs.slice(0, 12).map((log) => (
                  <div key={log.id} className="admin-row">
                    <div>
                      <strong>{log.action}</strong>
                      <div className="muted">{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                    <span className="chip">{log.ip}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      {detailOpen && activeFile ? (
        <div className="modal-backdrop" onClick={() => setDetailOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>File details</h3>
            <div className="modal-row">
              <span className="muted">Name</span>
              <strong>{activeFile.originalName}</strong>
            </div>
            <div className="modal-row">
              <span className="muted">Size</span>
              <strong>{(activeFile.sizeBytes / 1024).toFixed(1)} KB</strong>
            </div>
            <div className="modal-row">
              <span className="muted">Created</span>
              <strong>{new Date(activeFile.createdAt).toLocaleString()}</strong>
            </div>
            <div className="modal-row">
              <span className="muted">Encryption</span>
              <strong>AES-256-GCM</strong>
            </div>
            <div className="button-row">
              <button
                className="primary"
                onClick={() => handleDownloadWeb(activeFile)}
              >
                Download
              </button>
              <button className="ghost" onClick={() => setDetailOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button className={fabOpen ? "fab open" : "fab"} onClick={() => setFabOpen(true)}>
        ☰
      </button>
      {fabOpen ? (
        <div className="fab-backdrop" onClick={() => setFabOpen(false)}>
          <div className="fab-menu" onClick={(event) => event.stopPropagation()}>
            <p className="fab-title">Quick Actions</p>
            <button
              className="fab-item"
              onClick={() => {
                setFabOpen(false);
                setActiveTab("files");
                setTimeout(() => uploadInputRef.current?.click(), 80);
              }}
            >
              Upload file
            </button>
            <p className="fab-section">Navigate</p>
            {[
              { key: "files", label: "Files" },
              { key: "activity", label: "Activity" },
              { key: "settings", label: "Settings" },
              { key: "overview", label: "Account" },
              isAdmin ? { key: "admin", label: "Admin" } : null
            ]
              .filter(Boolean)
              .map((tab) => (
                <button
                  key={tab.key}
                  className={activeTab === tab.key ? "fab-item active" : "fab-item"}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setFabOpen(false);
                  }}
                >
                  {tab.label}
                </button>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
