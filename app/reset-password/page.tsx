"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import styles from "../page.module.css";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!code) {
      setError("Invalid or expired reset link. Please request a new one.");
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchErr }) => {
      if (exchErr) setError("This reset link is invalid or has expired. Please request a new one.");
      else setReady(true);
    });
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      setSuccess(true);
      setTimeout(() => router.push("/"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`${styles.loginCard} glass-panel`} style={{ textAlign: "center", padding: "3rem 2rem" }}>
        <CheckCircle2 size={64} color="var(--primary)" style={{ margin: "0 auto 1.5rem" }} />
        <h1 className="text-gradient" style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>Password Updated</h1>
        <p style={{ color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "2rem" }}>
          Your password has been reset successfully. You are being redirected to the login page...
        </p>
        <Link href="/" className={styles.loginButton} style={{ textDecoration: "none" }}>
          <span>Login Now</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={`${styles.loginCard} glass-panel`}>
      <div className={styles.header}>
        <h1 className="text-gradient">New Password</h1>
        <p className={styles.subtitle}>Set a secure password for your account</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="password">New Password</label>
          <div style={{ position: "relative" }}>
            <input 
              type={showPassword ? "text" : "password"} 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required 
              style={{ paddingLeft: "2.75rem" }}
            />
            <Lock size={18} style={{ 
              position: "absolute", 
              left: "1rem", 
              top: "50%", 
              transform: "translateY(-50%)", 
              color: "rgba(255,255,255,0.3)" 
            }} />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                padding: 0
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="confirm-password">Confirm New Password</label>
          <div style={{ position: "relative" }}>
            <input 
              type={showPassword ? "text" : "password"} 
              id="confirm-password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••" 
              required 
              style={{ paddingLeft: "2.75rem" }}
            />
            <Lock size={18} style={{ 
              position: "absolute", 
              left: "1rem", 
              top: "50%", 
              transform: "translateY(-50%)", 
              color: "rgba(255,255,255,0.3)" 
            }} />
          </div>
        </div>

        {error && <p style={{color: "#ff4444", fontSize: "0.85rem", margin: "0.5rem 0 0"}}>{error}</p>}

        <button type="submit" className={styles.loginButton} disabled={loading || !ready}>
          {loading ? (
            <Loader2 size={20} className="spinner" />
          ) : (
            <span>Update Password</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className={styles.container}>
      <div className={styles.glow} />
      <Suspense fallback={
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
          <Loader2 size={48} className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p>Loading reset portal...</p>
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>
    </main>
  );
}
