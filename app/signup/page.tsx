"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, ArrowLeft, ShieldCheck, UserCircle, Phone, Mail } from "lucide-react";
import Link from "next/link";
import { db, UserRole } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("engineer");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [employmentType, setEmploymentType] = useState<"direct" | "sub">("direct");
  const [subContractorName, setSubContractorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  // OTP step state
  const [otpStep, setOtpStep] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError && signUpError.message !== "User already registered") {
        throw signUpError;
      }
      await db.registerUser({
        email,
        name,
        role,
        phone,
        vehicleReg: role === "engineer" ? vehicleReg : undefined,
        employer: role === "engineer"
          ? (employmentType === "direct" ? "Direct Staff" : subContractorName)
          : undefined
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setOtpError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to resend");
      setOtpToken(data.token);
      setEnteredCode("");
    } catch (err: any) {
      setOtpError(err.message || "Could not resend. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setOtpError("");

    try {
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: otpToken, entered: enteredCode })
      });
      const { ok, reason } = await verifyRes.json();

      if (!ok) {
        const msg = reason === "expired"
          ? "Code expired. Please request a new one."
          : reason === "wrong"
          ? "Incorrect code. Please check and try again."
          : "Invalid code. Please request a new one.";
        setOtpError(msg);
        setIsSubmitting(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError && signUpError.message !== "User already registered") {
        throw signUpError;
      }

      await db.registerUser({
        email,
        name,
        role,
        phone,
        vehicleReg: role === "engineer" ? vehicleReg : undefined,
        employer: role === "engineer"
          ? (employmentType === "direct" ? "Direct Staff" : subContractorName)
          : undefined
      });

      setIsSuccess(true);
    } catch (err: any) {
      setOtpError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={{minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff", padding: "2rem"}}>
        <div style={{maxWidth: "450px", width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "3rem", textAlign: "center"}}>
          <div style={{width: "80px", height: "80px", background: "rgba(0, 229, 255, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem"}}>
            <ShieldCheck size={48} color="var(--primary)" />
          </div>
          <h1 style={{fontSize: "1.8rem", fontWeight: 800, marginBottom: "1rem"}}>Registration Sent</h1>
          <p style={{color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "2.5rem"}}>
            Your account has been created and sent to the office for approval. You will be able to log in once an administrator has verified your details.
          </p>
          <Link href="/" style={{textDecoration: "none"}}>
            <button style={{width: "100%", padding: "1rem", background: "var(--primary)", border: "none", borderRadius: "12px", color: "#000", fontWeight: 700, cursor: "pointer"}}>
              Return to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (otpStep) {
    return (
      <div style={{minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff", padding: "2rem"}}>
        <div style={{maxWidth: "450px", width: "100%"}}>
          <button
            onClick={() => { setOtpStep(false); setOtpError(""); setEnteredCode(""); }}
            style={{display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", marginBottom: "2rem", fontSize: "0.9rem"}}
          >
            <ArrowLeft size={16} /> Back to form
          </button>

          <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "2.5rem"}}>
            <div style={{textAlign: "center", marginBottom: "2rem"}}>
              <div style={{width: "64px", height: "64px", background: "rgba(0,229,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem"}}>
                <Mail size={32} color="var(--primary)" />
              </div>
              <h1 style={{fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.5rem"}}>Check your email</h1>
              <p style={{color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6}}>
                We sent a 6-digit code to<br />
                <span style={{color: "#fff", fontWeight: 600}}>{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerify} style={{display: "flex", flexDirection: "column", gap: "1.25rem"}}>
              <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
                <label style={{fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500}}>Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={enteredCode}
                  onChange={e => setEnteredCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  style={{
                    padding: "1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px", color: "#fff", outline: "none", fontSize: "1.5rem",
                    letterSpacing: "0.4rem", textAlign: "center", fontFamily: "var(--font-geist-mono)"
                  }}
                />
              </div>

              {otpError && <p style={{color: "#ff4444", fontSize: "0.85rem", margin: 0}}>{otpError}</p>}

              <button
                type="submit"
                disabled={isSubmitting || enteredCode.length < 6}
                style={{
                  padding: "1.1rem", background: "var(--primary)", border: "none", borderRadius: "12px",
                  color: "#000", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
                  opacity: enteredCode.length < 6 ? 0.5 : 1
                }}
              >
                {isSubmitting ? <Loader2 size={20} className="spinner" /> : "Verify & Complete Registration"}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                style={{background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem", padding: "0.5rem"}}
              >
                {resending ? "Sending…" : "Didn't receive it? Resend code"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff", padding: "2rem"}}>
      <div style={{maxWidth: "500px", width: "100%"}}>
        <Link href="/" style={{display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", marginBottom: "2rem", fontSize: "0.9rem"}}>
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "2.5rem"}}>
          <div style={{marginBottom: "2.5rem"}}>
            <h1 style={{fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem"}}>
              <UserPlus size={32} color="var(--primary)" /> Create Account
            </h1>
            <p style={{color: "var(--text-muted)"}}>Join the F-Gas tracking network</p>
          </div>

          <form onSubmit={handleSubmit} style={{display: "flex", flexDirection: "column", gap: "1.5rem"}}>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", background: "rgba(255,255,255,0.03)", padding: "0.5rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)"}}>
              <button
                type="button"
                onClick={() => setRole("engineer")}
                style={{
                  padding: "0.75rem", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700,
                  background: role === "engineer" ? "var(--primary)" : "transparent",
                  color: role === "engineer" ? "#000" : "var(--text-muted)",
                  transition: "all 0.2s"
                }}
              >
                Engineer
              </button>
              <button
                type="button"
                onClick={() => setRole("office")}
                style={{
                  padding: "0.75rem", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700,
                  background: role === "office" ? "var(--primary)" : "transparent",
                  color: role === "office" ? "#000" : "var(--text-muted)",
                  transition: "all 0.2s"
                }}
              >
                Office / Admin
              </button>
            </div>

            <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
              <label style={{fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500}}>Full Name</label>
              <input
                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                style={{padding: "1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", outline: "none"}}
              />
            </div>

            <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
              <label style={{fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500}}>Email Address</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                style={{padding: "1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", outline: "none"}}
              />
            </div>

            <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
              <label style={{fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500}}>Mobile Number</label>
              <input
                type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 07700 900000"
                style={{padding: "1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", outline: "none"}}
              />
            </div>

            <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
              <label style={{fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500}}>Create Password</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                style={{padding: "1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", outline: "none"}}
              />
            </div>

            {role === "engineer" && (
              <>
                <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
                  <label style={{fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500}}>Are you employed by 21 Degrees or a Sub-contractor?</label>
                  <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem"}}>
                    <button
                      type="button"
                      onClick={() => setEmploymentType("direct")}
                      style={{
                        padding: "0.75rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
                        background: employmentType === "direct" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.02)",
                        border: employmentType === "direct" ? "1px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                        color: employmentType === "direct" ? "var(--primary)" : "rgba(255,255,255,0.5)",
                        transition: "all 0.2s"
                      }}
                    >
                      21 Degrees
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmploymentType("sub")}
                      style={{
                        padding: "0.75rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
                        background: employmentType === "sub" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.02)",
                        border: employmentType === "sub" ? "1px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                        color: employmentType === "sub" ? "var(--primary)" : "rgba(255,255,255,0.5)",
                        transition: "all 0.2s"
                      }}
                    >
                      Sub-contractor
                    </button>
                  </div>
                </div>

                {employmentType === "sub" && (
                  <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
                    <label style={{fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500}}>Your Company Name</label>
                    <input
                      type="text" required value={subContractorName} onChange={(e) => setSubContractorName(e.target.value)}
                      placeholder="Enter company name..."
                      style={{padding: "1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", outline: "none"}}
                    />
                  </div>
                )}

                <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
                  <label style={{fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500}}>Van Registration</label>
                  <input
                    type="text" required value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                    placeholder="e.g. VA68 LNE"
                    style={{padding: "1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", outline: "none"}}
                  />
                </div>
              </>
            )}

            {error && <p style={{color: "#ff4444", fontSize: "0.85rem", margin: 0}}>{error}</p>}

            <button
              type="submit" disabled={isSubmitting}
              style={{
                marginTop: "1rem", padding: "1.1rem", background: "var(--primary)", border: "none", borderRadius: "12px", color: "#000", fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem"
              }}
            >
              {isSubmitting ? <Loader2 size={20} className="spinner" /> : "Request Approval"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
