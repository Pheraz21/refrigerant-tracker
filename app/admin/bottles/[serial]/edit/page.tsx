"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, Bottle } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Save, Trash2, AlertCircle, Package, Calendar } from "lucide-react";
import Link from "next/link";
import styles from "../../../engineer/page.module.css";

export default function EditBottlePage() {
  const { serial } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [bottle, setBottle] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      const canAccess =
        user.availableRoles?.includes("admin") || user.availableRoles?.includes("office") ||
        user.role === "admin" || user.role === "office";
      if (!canAccess) {
        router.replace("/engineer");
        return;
      }
    }
    const serialStr = decodeURIComponent(serial as string);
    if (serial) {
      Promise.all([
        db.getBottle(serialStr),
        db.getMovementLogs(serialStr)
      ]).then(([bottleData, logData]) => {
        setBottle(bottleData);
        setLogs(logData);
        setLoading(false);
      });
    }
  }, [serial, user, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bottle) return;
    setIsSaving(true);
    await db.updateBottle(bottle.serial, bottle);
    setIsSaving(false);
    alert("Bottle data updated successfully.");
    router.back();
  };

  const handleChange = (field: keyof Bottle, value: any) => {
    if (!bottle) return;
    setBottle({ ...bottle, [field]: value });
  };

  if (loading) return <div style={{padding: "2rem", color: "#fff"}}>Loading bottle data...</div>;
  if (!bottle) return <div style={{padding: "2rem", color: "#fff"}}>Bottle not found.</div>;

  return (
    <div style={{maxWidth: "800px"}}>
      <div style={{marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem"}}>
        <button onClick={() => router.back()} style={{background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer"}}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 style={{fontSize: "1.8rem", fontWeight: 700, margin: 0, color: "#fff"}}>Edit Bottle: {serial}</h1>
          <p style={{color: "var(--text-muted)", margin: "0.25rem 0 0"}}>Manual administrative override</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="glass-panel" style={{padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem"}}>
        <div style={{padding: "1.5rem", background: "rgba(255, 51, 102, 0.05)", border: "1px solid rgba(255, 51, 102, 0.2)", borderRadius: "10px", marginBottom: "1rem"}}>
          <label style={{fontSize: "0.9rem", fontWeight: 600, color: "#ff3366", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <Calendar size={18} /> Rental Expiry Date
          </label>
          <input 
            type="date" 
            value={bottle.rentalExpiryDate ? bottle.rentalExpiryDate.split('T')[0] : ""} 
            onChange={e => handleChange("rentalExpiryDate", e.target.value)}
            style={{width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,51,102,0.3)", borderRadius: "8px", color: "#fff", colorScheme: "dark"}}
          />
          <p style={{margin: "0.5rem 0 0", fontSize: "0.75rem", color: "rgba(255,51,102,0.6)"}}>
            This date triggers rental alerts for office staff only.
          </p>
        </div>

        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem"}}>
          <div>
            <label style={{display: "block", fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem"}}>Refrigerant Type</label>
            <input 
              type="text" 
              value={bottle.gasType} 
              onChange={e => handleChange("gasType", e.target.value)}
              style={{width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff"}}
            />
          </div>
          <div>
            <label style={{display: "block", fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem"}}>Category</label>
            <select 
              value={bottle.category} 
              onChange={e => handleChange("category", e.target.value)}
              style={{width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", outline: "none"}}
            >
              <option value="new">New Refrigerant</option>
              <option value="reclaim">Reclaim / Haz</option>
              <option value="nitrogen">Nitrogen</option>
            </select>
          </div>
        </div>

        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem"}}>
          <div>
            <label style={{display: "block", fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem"}}>Supplier</label>
            <input
              type="text"
              value={bottle.supplier || ""}
              onChange={e => handleChange("supplier", e.target.value)}
              style={{width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff"}}
            />
          </div>
          <div>
            <label style={{display: "block", fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem"}}>PO Number</label>
            <input
              type="text"
              value={bottle.poNumber || ""}
              onChange={e => handleChange("poNumber", e.target.value)}
              style={{width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff"}}
            />
          </div>
        </div>

        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem"}}>
          <div>
            <label style={{display: "block", fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem"}}>Initial Weight (kg)</label>
            <input 
              type="number" step="0.1"
              value={bottle.initialWeight} 
              onChange={e => handleChange("initialWeight", parseFloat(e.target.value))}
              style={{width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff"}}
            />
          </div>
          <div>
            <label style={{display: "block", fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem"}}>Current Weight (kg)</label>
            <input 
              type="number" step="0.1"
              value={bottle.currentWeight} 
              onChange={e => handleChange("currentWeight", parseFloat(e.target.value))}
              style={{width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff"}}
            />
          </div>
        </div>

        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem"}}>
          <div>
            <label style={{display: "block", fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem"}}>Location Type</label>
            <select 
              value={bottle.locationType} 
              onChange={e => handleChange("locationType", e.target.value)}
              style={{width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", outline: "none"}}
            >
              <option value="van">Van</option>
              <option value="site">Job Site</option>
              <option value="office">Office / Stores</option>
              <option value="supplier">Supplier</option>
            </select>
          </div>
          <div>
            <label style={{display: "block", fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem"}}>Location ID / Name</label>
            <input 
              type="text" 
              value={bottle.locationId} 
              onChange={e => handleChange("locationId", e.target.value)}
              style={{width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff"}}
            />
          </div>
        </div>

        <div>
          <label style={{display: "block", fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem"}}>Status</label>
          <select 
            value={bottle.status} 
            onChange={e => handleChange("status", e.target.value)}
            style={{width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", outline: "none"}}
          >
            <option value="active">Active</option>
            <option value="empty">Empty</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        <div style={{marginTop: "1rem", padding: "1rem", background: "rgba(255, 187, 0, 0.05)", border: "1px solid rgba(255, 187, 0, 0.2)", borderRadius: "8px", display: "flex", gap: "0.75rem"}}>
          <AlertCircle size={20} color="#ffbb00" style={{flexShrink: 0}} />
          <p style={{margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.4}}>
            Warning: Manual edits bypass the standard movement audit logs. Use this facility only for correcting errors or initial system setup.
          </p>
        </div>

        <div style={{display: "flex", gap: "1rem", marginTop: "1rem"}}>
          <button 
            type="submit" 
            disabled={isSaving}
            style={{
              flex: 1, padding: "1rem", background: "var(--primary)", border: "none", 
              borderRadius: "8px", color: "#000", fontWeight: 700, fontSize: "1rem", 
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
            }}
          >
            <Save size={20} /> {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button 
            type="button"
            onClick={async () => {
              if (confirm("Permanently delete this bottle?")) {
                await db.removeBottle(bottle.serial);
                router.push("/admin/bottles");
              }
            }}
            style={{
              padding: "1rem", background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.3)", 
              borderRadius: "8px", color: "#ff3366", cursor: "pointer"
            }}
          >
            <Trash2 size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
