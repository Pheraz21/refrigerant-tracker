"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, Bottle } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { Truck, Search, Plus, Trash2, Camera, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SupplierReturnPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [hwcnNumber, setHwcnNumber] = useState("");
  const [inputSerial, setInputSerial] = useState("");
  const [selectedBottles, setSelectedBottles] = useState<Bottle[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAddBottle = async () => {
    if (!inputSerial.trim()) return;
    
    // Check if already added
    if (selectedBottles.find(b => b.serial === inputSerial.toUpperCase())) {
      setError("Bottle already in list");
      return;
    }

    try {
      const bottle = await db.getBottle(inputSerial.toUpperCase());
      if (!bottle) {
        setError("Bottle serial not found in system");
        return;
      }
      if (bottle.status === "returned") {
        setError("This bottle has already been returned to a supplier");
        return;
      }

      setSelectedBottles([...selectedBottles, bottle]);
      setWeights({ ...weights, [bottle.serial]: bottle.currentWeight });
      setInputSerial("");
      setError("");
    } catch (err) {
      setError("Error finding bottle");
    }
  };

  const removeBottle = (serial: string) => {
    setSelectedBottles(selectedBottles.filter(b => b.serial !== serial));
    const newWeights = { ...weights };
    delete newWeights[serial];
    setWeights(newWeights);
  };

  const handleWeightChange = (serial: string, val: string) => {
    const num = parseFloat(val);
    setWeights({ ...weights, [serial]: isNaN(num) ? 0 : num });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwcnNumber) {
      setError("Please enter the Supplier's HWCN number");
      return;
    }
    if (selectedBottles.length === 0) {
      setError("Please add at least one bottle");
      return;
    }

    setLoading(true);
    try {
      await db.returnBottleToSupplier({
        serials: selectedBottles.map(b => b.serial),
        returnHwcnNumber: hwcnNumber,
        returnedBy: user?.name || "Office Admin",
        weights: weights,
        hwcnPhotoUrl: "https://vfpismkhdxcnioblynvk.supabase.co/storage/v1/object/public/hwcn-photos/supplier-return-mock.jpg"
      });
      setIsSuccess(true);
      setTimeout(() => router.push("/admin"), 3000);
    } catch (err) {
      setError("Failed to process return. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <CheckCircle2 size={64} color="#22c55e" style={{ margin: "0 auto 1.5rem" }} />
        <h1 className="text-gradient" style={{ fontSize: "2rem", marginBottom: "1rem" }}>Return Logged Successfully</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
          {selectedBottles.length} bottles have been marked as returned to supplier.<br />
          The HWCN reference <strong>{hwcnNumber}</strong> has been archived.
        </p>
        <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)" }}>Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.9rem", marginBottom: "1rem" }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Truck size={28} color="var(--primary)" /> Waste Return from Office to Supplier
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Hazardous Waste Transfer — Office to Supplier</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "2rem", alignItems: "start" }}>
        
        {/* Left Column: Bottles List */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Cylinders for Return ({selectedBottles.length})
          </h3>

          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
              <input 
                type="text" 
                placeholder="Enter serial number..." 
                value={inputSerial}
                onChange={e => setInputSerial(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddBottle())}
                style={{
                  width: "100%", padding: "0.85rem 1rem 0.85rem 3rem", background: "rgba(255,255,255,0.05)", 
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", outline: "none"
                }}
              />
            </div>
            <button 
              type="button" 
              onClick={handleAddBottle}
              style={{
                background: "var(--primary)", border: "none", borderRadius: "10px", padding: "0 1.5rem",
                color: "#000", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem"
              }}
            >
              <Plus size={20} /> Add
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {selectedBottles.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.2)", border: "2px dashed rgba(255,255,255,0.05)", borderRadius: "12px" }}>
                <Truck size={40} style={{ marginBottom: "1rem", opacity: 0.1 }} />
                <p>No bottles added yet. Scan or type serials above.</p>
              </div>
            ) : (
              selectedBottles.map(b => (
                <div key={b.serial} style={{
                  padding: "1rem 1.25rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "1rem" }}>{b.serial}</div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>{b.gasType} • Current: {b.currentWeight}kg</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Return Weight (kg)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={weights[b.serial]}
                        onChange={e => handleWeightChange(b.serial, e.target.value)}
                        style={{
                          width: "100px", padding: "0.4rem 0.6rem", background: "rgba(0,0,0,0.3)", 
                          border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", fontWeight: 700
                        }}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeBottle(b.serial)}
                      style={{ background: "rgba(255,51,102,0.1)", border: "none", borderRadius: "50%", padding: "0.5rem", color: "#ff3366", cursor: "pointer" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Transfer Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem", color: "#fff" }}>Transfer Details</h3>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem", fontWeight: 600 }}>
                Supplier's HWCN Number
              </label>
              <input 
                type="text" 
                required
                placeholder="e.g. BJJ-123456" 
                value={hwcnNumber}
                onChange={e => setHwcnNumber(e.target.value.toUpperCase())}
                style={{
                  width: "100%", padding: "0.85rem 1rem", background: "rgba(255,255,255,0.05)", 
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", outline: "none", fontSize: "1rem", fontWeight: 700
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem", fontWeight: 600 }}>
                Photo of Supplier Note
              </label>
              <div style={{ 
                height: "120px", border: "2px dashed rgba(255,255,255,0.1)", borderRadius: "10px", 
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                background: "rgba(255,255,255,0.02)", cursor: "pointer"
              }}>
                <Camera size={24} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>Click to upload HWCN</span>
              </div>
            </div>

            {error && (
              <div style={{ 
                padding: "0.75rem 1rem", background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.2)", 
                borderRadius: "8px", color: "#ff3366", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem"
              }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || selectedBottles.length === 0}
              style={{
                width: "100%", padding: "1rem", background: "linear-gradient(135deg, #00e5ff 0%, #0088ff 100%)",
                border: "none", borderRadius: "10px", color: "#000", fontWeight: 800, fontSize: "1rem",
                cursor: (loading || selectedBottles.length === 0) ? "not-allowed" : "pointer", opacity: (loading || selectedBottles.length === 0) ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
              }}
            >
              {loading ? <Loader2 size={20} className="spinner" /> : "Complete Supplier Return"}
            </button>
          </div>

          <div style={{ padding: "1.25rem", background: "rgba(255,187,0,0.05)", border: "1px solid rgba(255,187,0,0.15)", borderRadius: "12px" }}>
            <h4 style={{ fontSize: "0.85rem", color: "#ffbb00", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertCircle size={16} /> Compliance Notice
            </h4>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,187,0,0.8)", lineHeight: 1.5, margin: 0 }}>
              Marking these cylinders as returned will remove them from your active inventory. This action is permanent and logs a movement log for regulatory auditing.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
