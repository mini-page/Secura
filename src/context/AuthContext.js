import { createContext, useContext, useMemo, useState } from "react";
import { guestLogin, login, register } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const isAuthed = useMemo(() => Boolean(token), [token]);

  async function signIn(email, password) {
    setBusy(true);
    setMessage("");
    try {
      const data = await login(email, password);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      setMessage(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function signUp(email, password) {
    setBusy(true);
    setMessage("");
    try {
      const data = await register(email, password);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      setMessage(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function signInGuest() {
    setBusy(true);
    setMessage("");
    try {
      const data = await guestLogin();
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      setUser({ email: "guest@offline", role: "guest" });
      setToken("offline-guest");
      setMessage("Offline guest mode enabled.");
      return { token: "offline-guest", user: { email: "guest@offline", role: "guest" } };
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    setToken("");
    setUser(null);
    setMessage("");
  }

  const value = {
    token,
    user,
    isAuthed,
    message,
    busy,
    signIn,
    signUp,
    signInGuest,
    signOut,
    setMessage
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
