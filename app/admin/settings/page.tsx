"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Settings, Save, CheckCircle2, Users, Truck, Building2, Trash2, Plus, Edit2, ShieldCheck, Clock } from "lucide-react";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [newSupplier, setNewSupplier] = useState("");
  const [refrigerants, setRefrigerants] = useState<any[]>([]);
  const [editingRefId, setEditingRefId] = useState<string | null>(null);
  const [newRef, setNewRef] = useState({ name: "", type: "HFC", un_number: "", gwp: 0, canBeBoughtNew: true });
  const [durations, setDurations] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{ supplierId: string; category: string } | null>(null);
  const [tempDays, setTempDays] = useState("");

  // Company settings — these would be persisted to DB in production
  const [companyName, setCompanyName] = useState("21 Degrees Ltd");
  const [companyAddress, setCompanyAddress] = useState("Unit 10, Apollo Court, Monkton Business Park, Hebburn");
  const [companyPostcode, setCompanyPostcode] = useState("NE31 2ES");
  const [companyTel, setCompanyTel] = useState("0191 5450545");
  const [carrierReg, setCarrierReg] = useState("CBDU368286");
  const [exemptionNo, setExemptionNo] = useState("31Z 3725 34");

  const loadDurations = () => db.getSupplierDurations().then(setDurations);

  useEffect(() => {
    db.getSuppliers().then(setSuppliers);
    db.getRefrigerants().then(setRefrigerants);
    loadDurations();
    db.getCompanySettings().then(s => {
      if (s.companyName) setCompanyName(s.companyName);
      if (s.companyAddress) setCompanyAddress(s.companyAddress);
      if (s.companyPostcode) setCompanyPostcode(s.companyPostcode);
      if (s.companyTel) setCompanyTel(s.companyTel);
      if (s.carrierReg) setCarrierReg(s.carrierReg);
      if (s.exemptionNo) setExemptionNo(s.exemptionNo);
    });
  }, []);

  const getDuration = (supplierId: string, category: string) =>
    durations.find(d => d.supplierId === supplierId && d.category === category);

  const handleSaveDuration = async (supplierId: string, category: string) => {
    const days = parseInt(tempDays);
    if (!isNaN(days) && days > 0) {
      await db.setSupplierDuration(supplierId, category, days);
      await loadDurations();
    }
    setEditingCell(null);
    setTempDays("");
  };

  const handleDeleteDuration = async (supplierId: string, category: string) => {
    await db.deleteSupplierDuration(supplierId, category);
    await loadDurations();
  };

  const handleSave = async () => {
    await db.saveCompanySettings({ companyName, companyAddress, companyPostcode, companyTel, carrierReg, exemptionNo });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.trim()) return;
    await db.addSupplier(newSupplier);
    setNewSupplier("");
    const updated = await db.getSuppliers();
    setSuppliers(updated);
  };

  const handleRemoveSupplier = async (id: string) => {
    await db.removeSupplier(id);
    const updated = await db.getSuppliers();
    setSuppliers(updated);
  };

  const handleAddRef = async () => {
    if (!newRef.name.trim()) return;
    await db.addRefrigerant(newRef);
    setNewRef({ name: "", type: "HFC", un_number: "", gwp: 0, canBeBoughtNew: true });
    const updated = await db.getRefrigerants();
    setRefrigerants(updated);
  };

  const handleUpdateRef = async (id: string, updates: any) => {
    await db.updateRefrigerant(id, updates);
    const updated = await db.getRefrigerants();
    setRefrigerants(updated);
    setEditingRefId(null);
  };

  const handleRemoveRef = async (id: string) => {
    if (confirm("Are you sure you want to remove this refrigerant type?")) {
      await db.removeRefrigerant(id);
      const updated = await db.getRefrigerants();
      setRefrigerants(updated);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.7rem 1rem",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "0.95rem",
    outline: "none",
    boxSizing: "border-box" as const
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.8rem",
    color: "rgba(255,255,255,0.6)",
    marginBottom: "0.4rem",
    fontWeight: 600 as const
  };

  return (
    <div style={{maxWidth: "800px"}}>
      <div style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Settings size={28} /> Settings
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>Company and compliance configuration</p>
      </div>

      <div style={{display: "flex", flexDirection: "column", gap: "1.5rem"}}>
        {/* Company Details */}
        <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.5rem"}}>
          <h3 style={{fontSize: "1.05rem", fontWeight: 700, marginBottom: "1.25rem", color: "#00e5ff", display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <Building2 size={18} /> Company Details
          </h3>
          <div style={{display: "flex", flexDirection: "column", gap: "1rem"}}>
            <div>
              <label style={labelStyle}>Company Name</label>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Address</label>
              <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} style={inputStyle} />
            </div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem"}}>
              <div>
                <label style={labelStyle}>Postcode</label>
                <input type="text" value={companyPostcode} onChange={e => setCompanyPostcode(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Telephone</label>
                <input type="text" value={companyTel} onChange={e => setCompanyTel(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        {/* Compliance */}
        <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.5rem"}}>
          <h3 style={{fontSize: "1.05rem", fontWeight: 700, marginBottom: "1.25rem", color: "#00e5ff"}}>Compliance &amp; Registration</h3>
          <div style={{display: "flex", flexDirection: "column", gap: "1rem"}}>
            <div>
              <label style={labelStyle}>Carrier Registration Number (CBDU)</label>
              <input type="text" value={carrierReg} onChange={e => setCarrierReg(e.target.value)} style={inputStyle} />
              <p style={{fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem"}}>This appears on all HWCNs in Part C</p>
            </div>
            <div>
              <label style={labelStyle}>Waste Authorised Exemption Number</label>
              <input type="text" value={exemptionNo} onChange={e => setExemptionNo(e.target.value)} style={inputStyle} />
              <p style={{fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem"}}>This appears on HWCNs in Part E</p>
            </div>
          </div>
        </div>

        {/* Authorized Suppliers */}
        <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.5rem"}}>
          <h3 style={{fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem", color: "#00e5ff", display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <Building2 size={18} /> Authorized Suppliers
          </h3>
          <p style={{fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1.25rem"}}>Manage vendors available for cylinder registration</p>
          
          <div style={{display: "flex", gap: "0.5rem", marginBottom: "1.5rem"}}>
            <input 
              type="text" 
              placeholder="New supplier name..." 
              value={newSupplier}
              onChange={e => setNewSupplier(e.target.value)}
              style={inputStyle}
            />
            <button 
              onClick={handleAddSupplier}
              style={{
                background: "var(--primary)", border: "none", borderRadius: "8px", 
                padding: "0 1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
                color: "#000", fontWeight: 700, fontSize: "0.85rem"
              }}
            >
              <Plus size={18} /> Add
            </button>
          </div>

          <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
            {suppliers.map(sup => (
              <div key={sup.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.75rem 1rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span style={{fontWeight: 600}}>{sup.name}</span>
                <button 
                  onClick={() => handleRemoveSupplier(sup.id)}
                  style={{background: "none", border: "none", color: "rgba(255,51,102,0.6)", cursor: "pointer", padding: "0.25rem"}}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Supplier Rental Durations */}
        <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.5rem"}}>
          <h3 style={{fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.5rem", color: "#00e5ff", display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <Clock size={18} /> Supplier Rental Durations
          </h3>
          <p style={{fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1.25rem"}}>
            Set the agreed rental period (in days) per supplier and bottle category. Used to auto-calculate expiry dates on registration.
          </p>
          <div style={{borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden"}}>
            <table style={{width: "100%", borderCollapse: "collapse"}}>
              <thead>
                <tr style={{background: "rgba(255,255,255,0.04)"}}>
                  {["Supplier", "New Refrigerant", "Recovery / Reclaim", "Nitrogen"].map(h => (
                    <th key={h} style={{padding: "0.75rem", textAlign: "left", fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)"}}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map(sup => (
                  <tr key={sup.id} style={{borderBottom: "1px solid rgba(255,255,255,0.04)"}}>
                    <td style={{padding: "0.75rem", fontWeight: 600, fontSize: "0.9rem"}}>{sup.name}</td>
                    {(["new", "reclaim", "nitrogen"] as const).map(cat => {
                      const existing = getDuration(sup.id, cat);
                      const isEditing = editingCell?.supplierId === sup.id && editingCell?.category === cat;
                      return (
                        <td key={cat} style={{padding: "0.75rem"}}>
                          {isEditing ? (
                            <div style={{display: "flex", gap: "0.4rem", alignItems: "center"}}>
                              <input
                                type="number"
                                min={1}
                                value={tempDays}
                                onChange={e => setTempDays(e.target.value)}
                                placeholder="days"
                                autoFocus
                                style={{width: "70px", padding: "0.3rem 0.5rem", background: "rgba(255,255,255,0.1)", border: "1px solid var(--primary)", borderRadius: "4px", color: "#fff", fontSize: "0.8rem", outline: "none"}}
                                onKeyDown={e => { if (e.key === "Enter") handleSaveDuration(sup.id, cat); if (e.key === "Escape") { setEditingCell(null); setTempDays(""); } }}
                              />
                              <button onClick={() => handleSaveDuration(sup.id, cat)} style={{background: "var(--success)", border: "none", borderRadius: "4px", padding: "0.25rem 0.5rem", cursor: "pointer", color: "#000", fontSize: "0.7rem", fontWeight: 700}}>Save</button>
                              <button onClick={() => { setEditingCell(null); setTempDays(""); }} style={{background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "4px", padding: "0.25rem 0.5rem", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: "0.7rem"}}>×</button>
                            </div>
                          ) : existing ? (
                            <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                              <span style={{fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600}}>{existing.durationDays} days</span>
                              <button onClick={() => { setEditingCell({ supplierId: sup.id, category: cat }); setTempDays(String(existing.durationDays)); }} style={{background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 0}}>
                                <Edit2 size={13} />
                              </button>
                              <button onClick={() => handleDeleteDuration(sup.id, cat)} style={{background: "none", border: "none", color: "rgba(255,51,102,0.5)", cursor: "pointer", padding: 0}}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingCell({ supplierId: sup.id, category: cat }); setTempDays(""); }}
                              style={{background: "none", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: "4px", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "0.75rem", padding: "0.2rem 0.6rem"}}
                            >
                              + Set
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr><td colSpan={4} style={{padding: "1.5rem", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "0.85rem"}}>No suppliers added yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refrigerant Hazard Codes */}
        <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.5rem"}}>
          <h3 style={{fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem", color: "#00e5ff", display: "flex", alignItems: "center", gap: "0.5rem"}}>
            Refrigerant Hazard Codes &amp; GWP
          </h3>
          <p style={{fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1.25rem"}}>Manage regulatory codes and global warming potential</p>
          
          <div style={{borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden"}}>
            <table style={{width: "100%", borderCollapse: "collapse"}}>
              <thead>
                <tr style={{background: "rgba(255,255,255,0.04)"}}>
                  {["Gas Name", "Type", "UN Number", "GWP", "Buy New", "Actions"].map(h => (
                    <th key={h} style={{padding: "0.75rem", textAlign: "left", fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)"}}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {refrigerants.map(ref => (
                  <tr key={ref.id} style={{borderBottom: "1px solid rgba(255,255,255,0.04)"}}>
                    <td style={{padding: "0.75rem", fontWeight: 600, fontSize: "0.85rem"}}>
                      {editingRefId === ref.id ? (
                        <input type="text" value={ref.name} onChange={e => handleUpdateRef(ref.id, { name: e.target.value })} style={{...inputStyle, padding: "0.3rem"}} />
                      ) : ref.name}
                    </td>
                    <td style={{padding: "0.75rem"}}>
                      {editingRefId === ref.id ? (
                        <input type="text" value={ref.type} onChange={e => handleUpdateRef(ref.id, { type: e.target.value })} style={{...inputStyle, padding: "0.3rem"}} />
                      ) : <span style={{fontSize: "0.8rem", color: "rgba(255,255,255,0.6)"}}>{ref.type}</span>}
                    </td>
                    <td style={{padding: "0.75rem"}}>
                      {editingRefId === ref.id ? (
                        <input type="text" value={ref.un_number || ""} onChange={e => handleUpdateRef(ref.id, { un_number: e.target.value })} style={{...inputStyle, padding: "0.3rem"}} />
                      ) : <span style={{fontFamily: "var(--font-geist-mono)", fontSize: "0.8rem", color: "var(--text-muted)"}}>{ref.un_number || "—"}</span>}
                    </td>
                    <td style={{padding: "0.75rem"}}>
                      {editingRefId === ref.id ? (
                        <input type="number" value={ref.gwp} onChange={e => handleUpdateRef(ref.id, { gwp: parseInt(e.target.value) })} style={{...inputStyle, padding: "0.3rem"}} />
                      ) : <span style={{fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600}}>{ref.gwp}</span>}
                    </td>
                    <td style={{padding: "0.75rem"}}>
                      {editingRefId === ref.id ? (
                        <input type="checkbox" checked={ref.can_be_bought_new !== false} onChange={e => handleUpdateRef(ref.id, { can_be_bought_new: e.target.checked })} />
                      ) : (
                        <span style={{
                          padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700,
                          background: ref.can_be_bought_new !== false ? "rgba(34,197,94,0.1)" : "rgba(255,51,102,0.1)",
                          color: ref.can_be_bought_new !== false ? "#22c55e" : "#ff3366"
                        }}>
                          {ref.can_be_bought_new !== false ? "YES" : "NO"}
                        </span>
                      )}
                    </td>
                    <td style={{padding: "0.75rem", textAlign: "right"}}>
                      <div style={{display: "flex", gap: "0.5rem", justifyContent: "flex-end"}}>
                        <button onClick={() => setEditingRefId(editingRefId === ref.id ? null : ref.id)} style={{background: "none", border: "none", color: "var(--primary)", cursor: "pointer"}}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleRemoveRef(ref.id)} style={{background: "none", border: "none", color: "rgba(255,51,102,0.6)", cursor: "pointer"}}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Add New Row */}
                <tr style={{background: "rgba(0, 229, 255, 0.02)"}}>
                  <td style={{padding: "0.75rem"}}><input placeholder="R..." value={newRef.name} onChange={e => setNewRef({...newRef, name: e.target.value.toUpperCase()})} style={{...inputStyle, padding: "0.3rem", fontSize: "0.8rem"}} /></td>
                  <td style={{padding: "0.75rem"}}><input placeholder="Type" value={newRef.type} onChange={e => setNewRef({...newRef, type: e.target.value})} style={{...inputStyle, padding: "0.3rem", fontSize: "0.8rem"}} /></td>
                  <td style={{padding: "0.75rem"}}><input placeholder="UN..." value={newRef.un_number} onChange={e => setNewRef({...newRef, un_number: e.target.value})} style={{...inputStyle, padding: "0.3rem", fontSize: "0.8rem"}} /></td>
                  <td style={{padding: "0.75rem"}}><input type="number" placeholder="GWP" value={newRef.gwp} onChange={e => setNewRef({...newRef, gwp: parseInt(e.target.value)})} style={{...inputStyle, padding: "0.3rem", fontSize: "0.8rem"}} /></td>
                  <td style={{padding: "0.75rem"}}><input type="checkbox" checked={newRef.canBeBoughtNew} onChange={e => setNewRef({...newRef, canBeBoughtNew: e.target.checked})} /></td>
                  <td style={{padding: "0.75rem", textAlign: "right"}}>
                    <button onClick={handleAddRef} style={{background: "var(--primary)", border: "none", borderRadius: "4px", padding: "0.4rem 0.6rem", cursor: "pointer", color: "#000", fontWeight: 700, fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem"}}>
                      <Plus size={14} /> Add
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{marginTop: "2rem"}}>
        <button onClick={handleSave} style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          width: "100%",
          padding: "0.85rem",
          background: saved ? "rgba(34,197,94,0.15)" : "linear-gradient(135deg, #00e5ff 0%, #0088ff 100%)",
          color: saved ? "#22c55e" : "#000",
          border: saved ? "1px solid rgba(34,197,94,0.3)" : "none",
          borderRadius: "8px",
          fontSize: "1rem",
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.2s"
        }}>
          {saved ? <><CheckCircle2 size={18} /> Saved Successfully</> : <><Save size={18} /> Save Settings</>}
        </button>
      </div>
    </div>
  );
}
