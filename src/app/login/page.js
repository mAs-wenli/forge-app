"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const T = {
  bg: "#0A0C13", surface: "#12151E", border: "#232738",
  text: "#E4E2DC", textDim: "#5A5850", accent: "#C8793F", red: "#EF4444",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = "/";
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("確認メールを送信しました。メールのリンクをクリックしてください。");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <div style={{ width: 360, padding: 32, background: T.surface, border: "1px solid " + T.border, borderRadius: 16 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, fontWeight: 600, color: T.accent, fontFamily: "var(--fc)" }}>F</div>
          <div style={{ fontSize: 14, color: T.text, marginTop: 4, fontFamily: "var(--fc)" }}>FORGE</div>
        </div>

        <form onSubmit={handleSubmit}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="メールアドレス" required
            style={{ width: "100%", background: T.bg, color: T.text, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 14px", fontSize: 14, marginBottom: 10, fontFamily: "var(--fj)" }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="パスワード" required minLength={6}
            style={{ width: "100%", background: T.bg, color: T.text, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 14px", fontSize: 14, marginBottom: 16, fontFamily: "var(--fj)" }} />

          {error && <div style={{ color: T.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}
          {message && <div style={{ color: T.accent, fontSize: 12, marginBottom: 12 }}>{message}</div>}

          <button type="submit" disabled={loading}
            style={{ width: "100%", background: T.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 500, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1, fontFamily: "var(--fj)" }}>
            {loading ? "..." : mode === "login" ? "ログイン" : "アカウント作成"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}
            style={{ background: "none", border: "none", color: T.textDim, fontSize: 12, cursor: "pointer", fontFamily: "var(--fj)" }}>
            {mode === "login" ? "アカウントを作成する" : "ログインに戻る"}
          </button>
        </div>
      </div>
    </div>
  );
}
