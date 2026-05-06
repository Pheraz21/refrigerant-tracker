"use client";

import { useEffect, useState } from "react";
import { db, AppUser, UserStatus, UserRole } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { Users, ShieldCheck, ShieldAlert, UserX, Truck, Mail, Phone, Calendar, Search, Filter, Save, X, Settings2, Building, KeyRound } from "lucide-react";

export default function UserManagementPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempReg, setTempReg] = useState("");
  const [employerEditingId, setEmployerEditingId] = useState<string | null>(null);
  const [tempEmployer, setTempEmployer] = useState("");
  const [roleEditingId, setRoleEditingId] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState<Record<string, boolean>>({});

  const handleSendReset = async (email: string, userId: string) => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/engineer/reset-password`
    });
    setResetEmailSent(prev => ({ ...prev, [userId]: true }));
    setTimeout(() => setResetEmailSent(prev => ({ ...prev, [userId]: false })), 5000);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const allUsers = await db.getAllUsers();
    setUsers(allUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setLoading(false);
  };

  const handleStatusChange = async (userId: string, status: UserStatus) => {
    await db.setUserStatus(userId, status);
    loadUsers();
  };

  const handleSaveReg = async (userId: string) => {
    await db.updateUserVehicle(userId, tempReg);
    setEditingUserId(null);
    loadUsers();
  };

  const handleSaveEmployer = async (userId: string) => {
    await db.updateUserEmployer(userId, tempEmployer);
    setEmployerEditingId(null);
    loadUsers();
  };

  const toggleRole = async (userId: string, role: UserRole) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    let newRoles = [...user.availableRoles];
    if (newRoles.includes(role)) {
      if (newRoles.length > 1) {
        newRoles = newRoles.filter(r => r !== role);
      }
    } else {
      newRoles.push(role);
    }

    await db.updateUserRoles(userId, newRoles);
    loadUsers();
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

  const UserTable = ({ title, usersList, icon: Icon }: { title: string, usersList: AppUser[], icon: any }) => (
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
                    {u.availableRoles.map(r => (
                      <span key={r} style={{
                        fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "4px", 
                        background: u.role === r ? "rgba(0, 229, 255, 0.15)" : "rgba(255,255,255,0.05)", 
                        color: u.role === r ? "var(--primary)" : "rgba(255,255,255,0.6)",
                        border: `1px solid ${u.role === r ? "var(--primary)" : "rgba(255,255,255,0.1)"}`,
                        textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em"
                      }}>
                        {r}
                      </span>
                    ))}
                    <button 
                      onClick={() => setRoleEditingId(roleEditingId === u.id ? null : u.id)}
                      style={{background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "flex", alignItems: "center"}}
                    >
                      <Settings2 size={14} />
                    </button>
                  </div>
                  {roleEditingId === u.id && (
                    <div style={{
                      marginTop: "0.5rem", background: "rgba(0,0,0,0.2)", padding: "0.5rem", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)",
                      display: "flex", gap: "1rem"
                    }}>
                      {["engineer", "office", "admin"].map(r => (
                        <label key={r} style={{fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer"}}>
                          <input 
                            type="checkbox" 
                            checked={u.availableRoles.includes(r as UserRole)}
                            onChange={() => toggleRole(u.id, r as UserRole)}
                          />
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </label>
                      ))}
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
                  {u.availableRoles.includes("engineer") ? (
                    editingUserId === u.id ? (
                      <div style={{display: "flex", gap: "0.5rem"}}>
                        <input 
                          value={tempReg} onChange={(e) => setTempReg(e.target.value.toUpperCase())}
                          style={{width: "100px", padding: "0.4rem", background: "rgba(255,255,255,0.1)", border: "1px solid var(--primary)", borderRadius: "4px", color: "#fff", fontSize: "0.8rem"}}
                        />
                        <button onClick={() => handleSaveReg(u.id)} style={{background: "var(--success)", border: "none", borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: "pointer"}}><Save size={14} color="#000" /></button>
                        <button onClick={() => setEditingUserId(null)} style={{background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: "pointer"}}><X size={14} color="#fff" /></button>
                      </div>
                    ) : (
                      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                        <span style={{fontFamily: "var(--font-geist-mono)", fontSize: "0.9rem"}}>{u.vehicleReg || "—"}</span>
                        <button 
                          onClick={() => { setEditingUserId(u.id); setTempReg(u.vehicleReg || ""); }}
                          style={{background: "none", border: "none", padding: 0, color: "var(--primary)", cursor: "pointer", fontSize: "0.75rem", textDecoration: "underline"}}
                        >
                          Edit
                        </button>
                      </div>
                    )
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

  return (
    <div>
      <div style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Users size={28} /> User Management
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>Manage engineers, office staff, and access roles</p>
      </div>

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
            <UserTable title="Pending Approval" usersList={pendingUsers} icon={ShieldAlert} />
          )}
          <UserTable title="Direct Staff" usersList={directStaff} icon={ShieldCheck} />
          <UserTable title="Sub-contractors & Others" usersList={otherStaff} icon={Building} />
          
          {disabledUsers.length > 0 && (
            <div style={{marginTop: "2rem", opacity: 0.6}}>
              <UserTable title="Rejected / Disabled Accounts" usersList={disabledUsers} icon={UserX} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
