"use client";

import { useState } from "react";
import { LogIn, Wrench } from "lucide-react";
import styles from "./page.module.css";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // In our mock, role is detected by login function from DB
    // We try 'engineer' first as it's the main portal, but AuthContext handles actual role
    try {
      await login(email, password, "engineer");
    } catch (err: any) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.glow} />
      
      <div className={`${styles.loginCard} glass-panel`}>
        <div className={styles.header}>
          <div style={{ marginBottom: "1.5rem" }}>
            <img 
              src="/21-degrees-official-transparent.png" 
              alt="21 Degrees" 
              style={{ width: "200px", height: "auto", margin: "0 auto", display: "block" }} 
            />
          </div>
          <h1 className="text-gradient">F-Gas Tracker</h1>
          <p className={styles.subtitle}>Engineer Portal</p>
          <div style={{display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", borderRadius: "20px", padding: "0.3rem 0.85rem", fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, marginTop: "0.5rem"}}>
            <Wrench size={13} /> Engineer Login
          </div>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="engineer@company.co.uk (or admin@)" 
              required 
            />
          </div>
          
          <div className={styles.inputGroup}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
              <Link href="/forgot-password" style={{ color: "var(--primary)", fontSize: "0.8rem", textDecoration: "none" }}>
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p style={{color: "#ff4444", fontSize: "0.85rem", margin: "0.5rem 0 0"}}>{error}</p>}

          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? (
              <span className={styles.spinner}></span>
            ) : (
              <>
                <LogIn size={20} />
                <span>Secure Login</span>
              </>
            )}
          </button>
        </form>

        <div style={{marginTop: "1.5rem"}}>
          <Link href="/signup?role=engineer" style={{display: "block", textDecoration: "none"}}>
            <button type="button" style={{
              width: "100%", padding: "0.75rem", background: "transparent",
              border: "1px solid rgba(0,229,255,0.35)", borderRadius: "8px",
              color: "var(--primary)", fontWeight: 600, fontSize: "0.9rem",
              cursor: "pointer", transition: "all 0.2s"
            }}>
              Register as New User
            </button>
          </Link>
        </div>

        <p className={styles.footerText} style={{marginTop: "2rem"}}>
          Authorized personnel only. Access subject to administrative approval.
        </p>
      </div>
    </main>
  );
}
