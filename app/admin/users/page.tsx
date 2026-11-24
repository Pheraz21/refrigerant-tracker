"use client";

import { useEffect, useState } from "react";
import { db, AppUser, UserStatus, UserRole } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Users, ShieldCheck, ShieldAlert, UserX, Truck, Mail, Phone, Calendar, Search, Filter, Save, X, Settings2, Building, KeyRound } from "lucide-react";
import Link from "next/link";

interface UserTableProps {
  title: string;
  usersList: AppUser[];
  icon: any;
  activePairings: any[];
  currentUserId?: string;
  roleEditingId: string | null;
  setRoleEditingId: (id: string | null) => void;
  employerEditingId: string | null;
  setEmployerEditingId: (id: string | null) => void;
  tempEmployer: string;
  setTempEmployer: (val: string) => void;
  editingUserId: string | null;
  setEditingUserId: (id: string | null) => void;
  tempReg: string;
  setTempReg: (val: string) => void;
  resetEmailSent: Record<string, boolean>;
  toggleRole: (userId: string, role: UserRole) => void;
  setPrimaryRole: (userId: string, role: UserRole) => void;
  handleToggleStores: (userId: string, currentValue: boolean) => void;
  handleSaveEmployer: (userId: string) => void;
  handleSaveReg: (userId: string) => void;
  handleUnpair: (pairingId: string) => void;
  handleSendReset: (email: string, userId: string) => void;
  handleStatusChange: (userId: string, status: UserStatus) => void;
}

function UserTable({
  title,
  usersList,
  icon: Icon,
  activePairings,
  currentUserId,
  roleEditingId,
  setRoleEditingId,
  employerEditingId,
  setEmployerEditingId,
  tempEmployer,
  setTempEmployer,
  editingUserId,
  setEditingUserId,
  tempReg,
  setTempReg,
  resetEmailSent,
  toggleRole,
  setPrimaryRole,
  handleToggleStores,
  handleSaveEmployer,
  handleSaveReg,
  handleUnpair,
  handleSendReset,
  handleStatusChange,
}: UserTableProps) {
  return (
    <div style={{marginBottom: "3rem"}}>
      <h2 style={{fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <Icon size={20} /> {title} ({usersList.length})
      </h2>
      <div style={{borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", background: "rgba(255,255,255,0.02)"}}>
        <table style={{width: "100%", borderCollapse: "collapse"}}>
          <thead>
            <tr style={{background: "rgba(255,255,255,0.04)"}}>
              <th style={{padding: "1rem", textAlign: "left", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase"}}>User Details</th>
              <th style={{padding: "1rem", textAlign: "left", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase"}}>Roles</th>
              <th style={{padding: "1rem", textAlign: "left", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase"}}>Employer</th>
              <th style={{padding: "1rem", textAlign: "left", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase"}}>Vehicle / Van</th>
              <th style={{padding: "1rem", textAlign: "left", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase"}}>Status</th>
              <th style={{padding: "1rem", textAlign: "right", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersList.length === 0 ? (
              <tr><td colSpan={6} style={{padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.2)"}}>No users found in this category</td></tr>
            ) : usersList.map(u => (
              <tr key={u.id} style={{borderBottom: "1px solid rgba(255,255,255,0.04)"}}>
                <td style={{padding: "1rem"}}>
                  <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
                    <div style={{width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center"}}>
                      <Users size={20} color="var(--primary)" />
                    </div>
                    <div>
                      <div style={{fontWeight: 700, fontSize: "0.95rem"}}>{u.name}</div>
                      <div style={{fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem"}}>
                        <Mail size={12} /> {u.email}
                      </div>
                      {u.phone && (
                        <a href={`tel:${u.phone}`} style={{fontSize: "0.8rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.3rem", textDecoration: "none", marginTop: "0.15rem"}}>
                          <Phone size={12} /> {u.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{padding: "1rem"}}>
                  <div style={{display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center"}}>
                    {u.availableRoles.map(r => {
                      const badgeColor = 
                        r === "engineer" ? "var(--primary)" :
                        r === "mate" ? "#38bdf8" :
                        r === "apprentice" ? "#c084fc" :
                        r === "office" ? "#f59e0b" : "#f43f5e";
                      const badgeBg = 
                        r === "engineer" ? "rgba(0, 229, 255, 0.15)" :
                        r === "mate" ? "rgba(56, 189, 248, 0.15)" :
                        r === "apprentice" ? "rgba(192, 132, 252, 0.15)" :
                        r === "office" ? "rgba(245, 158, 11, 0.15)" : "rgba(244, 63, 94, 0.15)";
                      return (
                        <span key={r} style={{
                          fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "4px", 
                          background: u.role === r ? badgeBg : "rgba(255,255,255,0.05)", 
                          color: u.role === r ? badgeColor : "rgba(255,255,255,0.6)",
                          border: `1px solid ${u.role === r ? badgeColor : "rgba(255,255,255,0.1)"}`,
                          textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em"
                        }}>
                          {r}
                        </span>
                      );
                    })}
                    <button 
                      onClick={() => setRoleEditingId(roleEditingId === u.id ? null : u.id)}
                      style={{background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "flex", alignItems: "center"}}
                    >
                      <Settings2 size={14} />
                    </button>
                  </div>
                  {roleEditingId === u.id && (
                    <div style={{
                      marginTop: "0.5rem", background: "rgba(0,0,0,0.2)", padding: "0.5rem", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)"
                    }}>
                      <div style={{display: "flex", flexWrap: "wrap", gap: "1rem"}}>
                        {["engineer", "mate", "apprentice", "office", "admin"].map(r => {
                          const isSelfAdminLock = currentUserId === u.id && r === "admin" && u.availableRoles.includes("admin");
                          return (
                            <div key={r} style={{display: "flex", flexDirection: "column", gap: "0.2rem"}}>
                              <label style={{fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem", cursor: isSelfAdminLock ? "not-allowed" : "pointer", opacity: isSelfAdminLock ? 0.6 : 1}}>
                                <input
                                  type="checkbox"
                                  checked={u.availableRoles.includes(r as UserRole)}
                                  disabled={isSelfAdminLock}
                                  onChange={() => toggleRole(u.id, r as UserRole)}
                                />
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                              </label>
                              {u.availableRoles.includes(r as UserRole) && u.role !== r && (
                                <button
                                  onClick={() => setPrimaryRole(u.id, r as UserRole)}
                                  style={{fontSize: "0.65rem", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", textAlign: "left"}}
                                >
                                  Set primary
                                </button>
                              )}
                              {u.role === r && (
                                <span style={{fontSize: "0.65rem", color: "var(--primary)", opacity: 0.6}}>Primary</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {(u.availableRoles.includes("engineer") || u.availableRoles.includes("mate") || u.availableRoles.includes("apprentice")) && (
                        <div style={{borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "0.5rem", paddingTop: "0.5rem"}}>
                          <label style={{fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer"}}>
                            <input
                              type="checkbox"
                              checked={u.canViewStores ?? false}
                              onChange={() => handleToggleStores(u.id, u.canViewStores ?? false)}
                            />
                            Stores Access
                            <span style={{fontSize: "0.65rem", color: "var(--text-muted)"}}>
                              (replaces My Van with Stores view)
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td style={{padding: "1rem"}}>
                  {employerEditingId === u.id ? (
                    <div style={{display: "flex", gap: "0.5rem"}}>
                      <input 
                        value={tempEmployer} onChange={(e) => setTempEmployer(e.target.value)}
                        style={{width: "120px", padding: "0.4rem", background: "rgba(255,255,255,0.1)", border: "1px solid var(--primary)", borderRadius: "4px", color: "#fff", fontSize: "0.8rem"}}
                      />
                      <button onClick={() => handleSaveEmployer(u.id)} style={{background: "var(--success)", border: "none", borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: "pointer"}}><Save size={14} color="#000" /></button>
                      <button onClick={() => setEmployerEditingId(null)} style={{background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: "pointer"}}><X size={14} color="#fff" /></button>
                    </div>
                  ) : (
                    <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                      <span style={{fontSize: "0.9rem", color: u.employer ? "#fff" : "rgba(255,255,255,0.2)"}}>{u.employer || "Not Set"}</span>
                      <button 
                        onClick={() => { setEmployerEditingId(u.id); setTempEmployer(u.employer || ""); }}
                        style={{background: "none", border: "none", padding: 0, color: "var(--primary)", cursor: "pointer", fontSize: "0.75rem", textDecoration: "underline"}}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </td>
                <td style={{padding: "1rem"}}>
                  {(u.availableRoles.includes("engineer") || u.availableRoles.includes("mate") || u.availableRoles.includes("apprentice") || u.vehicleReg) ? (
                    <div>
                      {editingUserId === u.id ? (
                        <div style={{display: "flex", gap: "0.5rem", marginBottom: "0.4rem"}}>
                          <input 
                            value={tempReg} onChange={(e) => setTempReg(e.target.value.toUpperCase())}
                            style={{width: "100px", padding: "0.4rem", background: "rgba(255,255,255,0.1)", border: "1px solid var(--primary)", borderRadius: "4px", color: "#fff", fontSize: "0.8rem"}}
                          />
                          <button onClick={() => handleSaveReg(u.id)} style={{background: "var(--success)", border: "none", borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: "pointer"}}><Save size={14} color="#000" /></button>
                          <button onClick={() => setEditingUserId(null)} style={{background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: "pointer"}}><X size={14} color="#fff" /></button>
                        </div>
                      ) : (
                        <div style={{display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem"}}>
                          <span style={{fontFamily: "var(--font-geist-mono)", fontSize: "0.9rem"}}>{u.vehicleReg || "—"}</span>
                          <button 
                            onClick={() => { setEditingUserId(u.id); setTempReg(u.vehicleReg || ""); }}
                            style={{background: "none", border: "none", padding: 0, color: "var(--primary)", cursor: "pointer", fontSize: "0.75rem", textDecoration: "underline"}}
                          >
                            Edit
                          </button>
                        </div>
                      )}

                      {/* If Mate or Apprentice: show active working van pairing */}
                      {(u.role === "mate" || u.role === "apprentice") && (() => {
                        const myPairing = activePairings.find(p => p.mateId === u.id && (p.pairingStatus === "approved" || p.pairingStatus === "pending"));
                        if (!myPairing) return null;
                        return (
                          <div style={{
                            display: "flex", alignItems: "center", gap: "0.35rem",
                            fontSize: "0.72rem",
                            background: myPairing.pairingStatus === "approved" ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                            border: `1px solid ${myPairing.pairingStatus === "approved" ? "rgba(34, 197, 94, 0.3)" : "rgba(234, 179, 8, 0.3)"}`,
                            padding: "0.2rem 0.4rem",
                            borderRadius: "4px",
                            color: myPairing.pairingStatus === "approved" ? "#22c55e" : "#eab308",
                            marginTop: "0.25rem"
                          }}>
                            <span>{myPairing.pairingStatus === "approved" ? "🟢" : "⏳"} {myPairing.leadEngineerName} ({myPairing.vehicleReg})</span>
                            <button
                              onClick={() => handleUnpair(myPairing.id)}
                              title="Unpair operative"
                              style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.7rem", padding: "0 0.2rem", fontWeight: 700 }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })()}

                      {/* If Lead Engineer: show paired crew members */}
                      {u.role === "engineer" && (() => {
                        const crew = activePairings.filter(p => p.leadEngineerName.toLowerCase() === u.name.toLowerCase() && p.pairingStatus === "approved");
                        if (crew.length === 0) return null;
                        return (
                          <div style={{ marginTop: "0.3rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                            {crew.map(c => (
                              <div key={c.id} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.3rem",
                                fontSize: "0.72rem", background: "rgba(0, 229, 255, 0.1)", border: "1px solid rgba(0, 229, 255, 0.2)",
                                padding: "0.15rem 0.4rem", borderRadius: "4px", color: "var(--primary)"
                              }}>
                                <span>Crew: {c.mateName} ({c.mateRole})</span>
                                <button
                                  onClick={() => handleUnpair(c.id)}
                                  title="Remove crew access"
                                  style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.7rem", padding: "0 0.2rem", fontWeight: 700 }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ) : <span style={{color: "rgba(255,255,255,0.1)"}}>—</span>}
                </td>
                <td style={{padding: "1rem"}}>
                  <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%", 
                      background: u.status === "approved" ? "var(--success)" : u.status === "pending" ? "#ffc107" : "#ff4444"
                    }}></div>
                    <span style={{
                      fontSize: "0.8rem", fontWeight: 600, 
                      color: u.status === "approved" ? "var(--success)" : u.status === "pending" ? "#ffc107" : "#ff4444",
                      textTransform: "capitalize"
                    }}>
                      {u.status}
                    </span>
                  </div>
                </td>
                <td style={{padding: "1rem", textAlign: "right"}}>
                  <div style={{display: "flex", gap: "0.5rem", justifyContent: "flex-end"}}>
                    {u.id === "admin" ? (
                      <span style={{fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic"}}>System Admin</span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSendReset(u.email, u.id)}
                          title="Send password reset email"
                          style={{
                            display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.4rem 0.75rem",
                            background: resetEmailSent[u.id] ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)",
                            border: resetEmailSent[u.id] ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "6px",
                            color: resetEmailSent[u.id] ? "#22c55e" : "rgba(255,255,255,0.5)",
                            fontSize: "0.75rem", fontWeight: 600, cursor: "pointer"
                          }}
                        >
                          <KeyRound size={13} /> {resetEmailSent[u.id] ? "Sent!" : "Reset Email"}
                        </button>
                        {u.status === "pending" && (
                          <div style={{display: "flex", gap: "0.5rem"}}>
                            <button 
                              onClick={() => handleStatusChange(u.id, "approved")}
                              style={{
                                display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.4rem 0.75rem", 
                                background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "6px", color: "#22c55e", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer"
                              }}
                            >
                              <ShieldCheck size={14} /> Approve
                            </button>
                            <button 
                              onClick={() => handleStatusChange(u.id, "disabled")}
                              style={{
                                display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.4rem 0.75rem", 
                                background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px", color: "#ef4444", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer"
                              }}
                            >
                              <UserX size={14} /> Reject
                            </button>
                          </div>
                        )}
                        {u.status === "approved" && (
                          <button 
                            onClick={() => handleStatusChange(u.id, "disabled")}
                            style={{
                              display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.4rem 0.75rem", 
                              background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px", color: "#ef4444", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer"
                            }}
                          >
                            <UserX size={14} /> Disable
                          </button>
                        )}
                        {u.status === "disabled" && (
                          <button 
                            onClick={() => handleStatusChange(u.id, "approved")}
                            style={{
                              display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.4rem 0.75rem", 
                              background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "6px", color: "#3b82f6", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer"
                            }}
                          >
                            <ShieldCheck size={14} /> Reactivate
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [activePairings, setActivePairings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempReg, setTempReg] = useState("");
  const [employerEditingId, setEmployerEditingId] = useState<string | null>(null);
  const [tempEmployer, setTempEmployer] = useState("");
  const [roleEditingId, setRoleEditingId] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSendReset = async (email: string, userId: string) => {
    setActionError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) {
        setActionError(`Failed to send password reset email to ${email}: ${error.message}`);
        return;
      }
      setResetEmailSent(prev => ({ ...prev, [userId]: true }));
      setTimeout(() => setResetEmailSent(prev => ({ ...prev, [userId]: false })), 5000);
    } catch (err: any) {
      setActionError(`Failed to send password reset email: ${err?.message || "Unknown error"}`);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const [allUsers, pairings] = await Promise.all([
        db.getAllUsers(),
        db.getAllActivePairings()
      ]);
      setUsers(allUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setActivePairings(pairings);
    } catch (err: any) {
      setActionError(`Failed to load users: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpair = async (pairingId: string) => {
    if (!window.confirm("Are you sure you want to unpair this crew member?")) return;
    setActionError(null);
    try {
      await db.respondToPairingRequest(pairingId, "revoked");
      await loadUsers();
    } catch (err: any) {
      setActionError(`Failed to unpair crew member: ${err?.message || "Unknown error"}`);
    }
  };

  const handleStatusChange = async (userId: string, status: UserStatus) => {
    const target = users.find(u => u.id === userId);
    if (status === "disabled") {
      if (currentUser?.id === userId) {
        setActionError("You cannot disable your own account.");
        return;
      }
      const actionLabel = target?.status === "pending" ? "reject" : "disable";
      if (!window.confirm(`Are you sure you want to ${actionLabel} ${target?.name || "this user"}?`)) return;
    }
    setActionError(null);
    try {
      await db.setUserStatus(userId, status);
      await loadUsers();
    } catch (err: any) {
      setActionError(`Failed to update user status: ${err?.message || "Unknown error"}`);
    }
  };

  const handleSaveReg = async (userId: string) => {
    setActionError(null);
    try {
      await db.updateUserVehicle(userId, tempReg);
      setEditingUserId(null);
      await loadUsers();
    } catch (err: any) {
      setActionError(`Failed to update vehicle registration: ${err?.message || "Unknown error"}`);
    }
  };

  const handleSaveEmployer = async (userId: string) => {
    setActionError(null);
    try {
      await db.updateUserEmployer(userId, tempEmployer);
      setEmployerEditingId(null);
      await loadUsers();
    } catch (err: any) {
      setActionError(`Failed to update employer: ${err?.message || "Unknown error"}`);
    }
  };

  const toggleRole = async (userId: string, role: UserRole) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setActionError(null);

    const isRemoving = user.availableRoles.includes(role);
    if (isRemoving && currentUser?.id === userId && role === "admin") {
      setActionError("You cannot revoke your own admin role.");
      return;
    }

    let newRoles = [...user.availableRoles];
    if (isRemoving) {
      if (newRoles.length <= 1) {
        setActionError("A user must have at least one role.");
        return;
      }
      newRoles = newRoles.filter(r => r !== role);
    } else {
      newRoles.push(role);
    }

    try {
      await db.updateUserRoles(userId, newRoles);
      if (isRemoving && user.role === role && newRoles.length > 0) {
        await db.switchUserRole(userId, newRoles[0]);
      }
      await loadUsers();
    } catch (err: any) {
      setActionError(`Failed to update user roles: ${err?.message || "Unknown error"}`);
    }
  };

  const setPrimaryRole = async (userId: string, role: UserRole) => {
    setActionError(null);
    try {
      await db.switchUserRole(userId, role);
      await loadUsers();
    } catch (err: any) {
      setActionError(`Failed to update primary role: ${err?.message || "Unknown error"}`);
    }
  };

  const handleToggleStores = async (userId: string, currentValue: boolean) => {
    setActionError(null);
    try {
      await db.setUserCanViewStores(userId, !currentValue);
      await loadUsers();
    } catch (err: any) {
      setActionError(`Failed to update stores access: ${err?.message || "Unknown error"}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const pendingUsers = filteredUsers.filter(u => u.status === "pending");
  const disabledUsers = filteredUsers.filter(u => u.status === "disabled");
  const directStaff = filteredUsers.filter(u => u.employer === "Direct Staff" && u.status === "approved");
  const otherStaff = filteredUsers.filter(u => u.employer !== "Direct Staff" && u.status === "approved");

  const sharedTableProps = {
    activePairings,
    currentUserId: currentUser?.id,
    roleEditingId,
    setRoleEditingId,
    employerEditingId,
    setEmployerEditingId,
    tempEmployer,
    setTempEmployer,
    editingUserId,
    setEditingUserId,
    tempReg,
    setTempReg,
    resetEmailSent,
    toggleRole,
    setPrimaryRole,
    handleToggleStores,
    handleSaveEmployer,
    handleSaveReg,
    handleUnpair,
    handleSendReset,
    handleStatusChange,
  };

  return (
    <div>
      <div style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Users size={28} /> User Management
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>Manage engineers, office staff, and access roles</p>
      </div>

      {actionError && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            color: "#fca5a5",
            fontSize: "0.85rem",
          }}
        >
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", display: "flex", alignItems: "center" }}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {activePairings.length > 0 && (
        <div
          style={{
            background: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Truck size={18} color="#22c55e" />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
              Live Field Crews:
            </span>
            <span style={{ fontSize: "0.85rem", color: "#a7f3d0" }}>
              {activePairings.length} two-person crew{activePairings.length !== 1 ? "s" : ""} currently paired in company vehicles.
            </span>
          </div>

          <Link
            href="/admin/crews"
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#22c55e",
              textDecoration: "underline",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            Open Active Field Crews Dashboard &rarr;
          </Link>
        </div>
      )}

      {/* Tools Bar */}
      <div style={{
        display: "flex", 
        gap: "1rem", 
        marginBottom: "2rem", 
        background: "rgba(255,255,255,0.03)", 
        padding: "1rem", 
        borderRadius: "12px", 
        border: "1px solid rgba(255,255,255,0.08)",
        alignItems: "center"
      }}>
        <div style={{position: "relative", flex: "1"}}>
          <Search size={16} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)"}} />
          <input
            type="text"
            placeholder="Search by name, email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "0.6rem 0.75rem 0.6rem 2.25rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", outline: "none"
            }}
          />
        </div>
      </div>

      {loading ? (
        <p style={{color: "var(--text-muted)"}}>Loading users...</p>
      ) : (
        <>
          {pendingUsers.length > 0 && (
            <UserTable title="Pending Approval" usersList={pendingUsers} icon={ShieldAlert} {...sharedTableProps} />
          )}
          <UserTable title="Direct Staff" usersList={directStaff} icon={ShieldCheck} {...sharedTableProps} />
          <UserTable title="Sub-contractors & Others" usersList={otherStaff} icon={Building} {...sharedTableProps} />
          
          {disabledUsers.length > 0 && (
            <div style={{marginTop: "2rem", opacity: 0.6}}>
              <UserTable title="Rejected / Disabled Accounts" usersList={disabledUsers} icon={UserX} {...sharedTableProps} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
