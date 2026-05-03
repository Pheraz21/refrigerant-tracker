"use client";

import { useState } from "react";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import styles from "../page.module.css";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className={styles.container}>
        <div className={styles.glow} />
        <div className={`${styles.loginCard} glass-panel`} style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <CheckCircle2 size={64} color="var(--primary)" style={{ margin: "0 auto 1.5rem" }} />
          <h1 className="text-gradient" style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>Check Your Email</h1>
          <p style={{ color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "2rem" }}>
            If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
          </p>
          <Link href="/" className={styles.loginButton} style={{ textDecoration: "none" }}>
            <ArrowLeft size={20} />
            <span>Back to Login</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.glow} />
      
      <div className={`${styles.loginCard} glass-panel`}>
        <div className={styles.header}>
          <Link href="/" style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "0.5rem", 
            color: "var(--text-muted)", 
            textDecoration: "none",
            fontSize: "0.9rem",
            marginBottom: "1.5rem"
          }}>
            <ArrowLeft size={16} /> Back to Login
          </Link>
          <h1 className="text-gradient">Reset Password</h1>
          <p className={styles.subtitle}>Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <div style={{ position: "relative" }}>
              <input 
                type="email" 
                id="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@company.co.uk" 
                required 
                style={{ paddingLeft: "2.75rem" }}
              />
              <Mail size={18} style={{ 
                position: "absolute", 
                left: "1rem", 
                top: "50%", 
                transform: "translateY(-50%)", 
                color: "rgba(255,255,255,0.3)" 
              }} />
            </div>
          </div>

          {error && <p style={{color: "#ff4444", fontSize: "0.85rem", margin: "0.5rem 0 0"}}>{error}</p>}

          <button type="submit" className={styles.loginButton} disabled={loading || !email}>
            {loading ? (
              <Loader2 size={20} className="spinner" />
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>
        </form>

        <p className={styles.footerText} style={{marginTop: "2rem", textAlign: "center"}}>
          If you don't receive an email within 5 minutes, please check your spam folder or contact support.
        </p>
      </div>
    </main>
  );
}
