"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Shield, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, "admin");
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    }
    setIsLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0a0e14 0%, #111827 50%, #0a0e14 100%)",
      padding: "1rem"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        background: "rgba(17, 24, 39, 0.8)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "2.5rem 2rem",
        backdropFilter: "blur(20px)"
      }}>
        <div style={{textAlign: "center", marginBottom: "2rem"}}>
          <div style={{ marginBottom: "1.5rem" }}>
            <img src="/21-degrees-official-transparent.png" alt="21 Degrees" style={{width: "200px", height: "auto", margin: "0 auto", display: "block"}} />
          </div>
          <h1 style={{fontSize: "1.4rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem 0"}}>Office Portal</h1>
          <p style={{fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", margin: 0}}>
            Sign in to manage HWCN compliance &amp; inventory
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{display: "flex", flexDirection: "column", gap: "1.25rem"}}>
          <div>
            <label style={{display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem", fontWeight: 600}}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@21-degrees.co.uk"
              required
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.95rem",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: 0, fontWeight: 600 }}>Password</label>
              <Link href="/forgot-password" style={{ color: "#00e5ff", fontSize: "0.75rem", textDecoration: "none" }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{position: "relative"}}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 3rem 0.75rem 1rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 0}}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.3)", borderRadius: "8px", padding: "0.6rem 1rem", color: "#ff3366", fontSize: "0.85rem"}}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email}
            style={{
              width: "100%",
              padding: "0.85rem",
              background: isLoading || !email ? "rgba(0,229,255,0.3)" : "linear-gradient(135deg, #00e5ff 0%, #0088ff 100%)",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: isLoading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s"
            }}
          >
            {isLoading ? <><Loader2 size={18} style={{animation: "spin 1s linear infinite"}} /> Signing In...</> : "Sign In"}
          </button>
        </form>

        <div style={{textAlign: "center", marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem"}}>
          <Link href="/signup" style={{color: "#00e5ff", fontSize: "0.9rem", textDecoration: "none", fontWeight: 600}}>
            Request New Admin Account
          </Link>
          <Link href="/" style={{color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textDecoration: "none"}}>
            ← Engineer login
          </Link>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `@keyframes spin { to { transform: rotate(360deg); } }`}} />
    </div>
  );
}
