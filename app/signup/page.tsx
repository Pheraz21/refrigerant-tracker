"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Loader2, ArrowLeft, ShieldCheck, Wrench, Shield, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { db, UserRole } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";

const inputStyle: React.CSSProperties = {
  padding: "1rem",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "10px",
  color: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontSize: "0.95rem",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "rgba(255,255,255,0.6)",
  fontWeight: 500,
};

export default function SignupPage() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") as UserRole | null;

  const [role, setRole] = useState<UserRole>(roleParam === "office" ? "office" : "engineer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [phone, setPhone] = useState("");
  const [employmentType, setEmploymentType] = useState<"direct" | "sub">("direct");
  const [subContractorName, setSubContractorName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const backHref = roleParam === "office" ? "/admin/login" : "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const isFieldRole = role === "engineer" || role === "mate" || role === "apprentice";

    setIsSubmitting(true);
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
        vehicleReg: isFieldRole && vehicleReg.trim() ? vehicleReg.trim().toUpperCase() : undefined,
        employer: isFieldRole
          ? (employmentType === "direct" ? "Direct Staff" : subContractorName)
          : undefined,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFieldRole = role === "engineer" || role === "mate" || role === "apprentice";

  if (isSuccess) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff", padding: "2rem" }}>
        <div style={{ maxWidth: "450px", width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "3rem", textAlign: "center" }}>
          <div style={{ width: "80px", height: "80px", background: "rgba(0,229,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem" }}>
            <ShieldCheck size={48} color="var(--primary)" />
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "1rem" }}>Registration Sent</h1>
          <p style={{ color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "2.5rem" }}>
            Your account has been created and sent to the office for approval. You will be able to log in once an administrator has verified your details.
          </p>
          <Link href={backHref} style={{ textDecoration: "none" }}>
            <button style={{ width: "100%", padding: "1rem", background: "var(--primary)", border: "none", borderRadius: "12px", color: "#000", fontWeight: 700, cursor: "pointer" }}>
              Return to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff", padding: "2rem" }}>
      <div style={{ maxWidth: "520px", width: "100%" }}>
        <Link href={backHref} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", marginBottom: "2rem", fontSize: "0.9rem" }}>
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "2.5rem" }}>
          <div style={{ marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <UserPlus size={30} color="var(--primary)" /> Create Account
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Join the 21 Degrees F-Gas tracking network</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Select Role */}
            <div>
              <label style={{ ...labelStyle, display: "block", marginBottom: "0.5rem" }}>Select Your Role *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", background: "rgba(255,255,255,0.03)", padding: "0.4rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <button 
                  type="button" 
                  onClick={() => setRole("engineer")} 
                  style={{ 
                    padding: "0.75rem 0.5rem", borderRadius: "8px", border: "none", cursor: "pointer", 
                    fontSize: "0.85rem", fontWeight: 700, 
                    background: role === "engineer" ? "var(--primary)" : "transparent", 
                    color: role === "engineer" ? "#000" : "var(--text-muted)", 
                    transition: "all 0.2s" 
                  }}
                >
                  F-Gas Engineer
                </button>
                <button 
                  type="button" 
                  onClick={() => setRole("mate")} 
                  style={{ 
                    padding: "0.75rem 0.5rem", borderRadius: "8px", border: "none", cursor: "pointer", 
                    fontSize: "0.85rem", fontWeight: 700, 
                    background: role === "mate" ? "var(--primary)" : "transparent", 
                    color: role === "mate" ? "#000" : "var(--text-muted)", 
                    transition: "all 0.2s" 
                  }}
                >
                  Engineer Mate
                </button>
                <button 
                  type="button" 
                  onClick={() => setRole("apprentice")} 
                  style={{ 
                    padding: "0.75rem 0.5rem", borderRadius: "8px", border: "none", cursor: "pointer", 
                    fontSize: "0.85rem", fontWeight: 700, 
                    background: role === "apprentice" ? "var(--primary)" : "transparent", 
                    color: role === "apprentice" ? "#000" : "var(--text-muted)", 
                    transition: "all 0.2s" 
                  }}
                >
                  Apprentice
                </button>
                <button 
                  type="button" 
                  onClick={() => setRole("office")} 
                  style={{ 
                    padding: "0.75rem 0.5rem", borderRadius: "8px", border: "none", cursor: "pointer", 
                    fontSize: "0.85rem", fontWeight: 700, 
                    background: role === "office" ? "var(--primary)" : "transparent", 
                    color: role === "office" ? "#000" : "var(--text-muted)", 
                    transition: "all 0.2s" 
                  }}
                >
                  Office / Admin
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Full Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Smith" style={inputStyle} />
            </div>

            {/* Email */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" style={inputStyle} />
            </div>

            {/* Password */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Create Password</label>
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" style={{ ...inputStyle, paddingRight: "3rem" }} />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "0.25rem", display: "flex", alignItems: "center" }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" style={{ ...inputStyle, paddingRight: "3rem" }} />
                <button type="button" onClick={() => setShowConfirmPassword(v => !v)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "0.25rem", display: "flex", alignItems: "center" }}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Van Registration — field staff */}
            {isFieldRole && (
              <div style={fieldStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={labelStyle}>Assigned Van Registration</label>
                  {(role === "mate" || role === "apprentice") && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Optional (if you have your own van)</span>
                  )}
                </div>
                <input
                  type="text"
                  required={role === "engineer"}
                  value={vehicleReg}
                  onChange={e => setVehicleReg(e.target.value.toUpperCase())}
                  placeholder={role === "engineer" ? "e.g. VA68 LNE" : "e.g. VA68 LNE (or leave blank if sharing lead van)"}
                  style={inputStyle}
                />
              </div>
            )}

            {/* Mobile */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Mobile Number</label>
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 07700 900000" style={inputStyle} />
            </div>

            {/* Employment — field staff */}
            {isFieldRole && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <label style={labelStyle}>Are you employed by 21 Degrees or a Sub-contractor?</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <button type="button" onClick={() => setEmploymentType("direct")} style={{ padding: "0.75rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, background: employmentType === "direct" ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.02)", border: employmentType === "direct" ? "1px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)", color: employmentType === "direct" ? "var(--primary)" : "rgba(255,255,255,0.5)", transition: "all 0.2s" }}>
                      21 Degrees
                    </button>
                    <button type="button" onClick={() => setEmploymentType("sub")} style={{ padding: "0.75rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, background: employmentType === "sub" ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.02)", border: employmentType === "sub" ? "1px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)", color: employmentType === "sub" ? "var(--primary)" : "rgba(255,255,255,0.5)", transition: "all 0.2s" }}>
                      Sub-contractor
                    </button>
                  </div>
                </div>

                {employmentType === "sub" && (
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Your Company Name</label>
                    <input type="text" required value={subContractorName} onChange={e => setSubContractorName(e.target.value)} placeholder="Enter company name..." style={inputStyle} />
                  </div>
                )}
              </>
            )}

            {error && <p style={{ color: "#ff4444", fontSize: "0.85rem", margin: 0 }}>{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{ marginTop: "0.75rem", padding: "1.1rem", background: "var(--primary)", border: "none", borderRadius: "12px", color: "#000", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}
            >
              {isSubmitting ? <Loader2 size={20} className="spinner" /> : "Request Approval"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
