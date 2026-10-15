"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Flame,
  Search,
  RefreshCw,
  ShoppingCart,
  AlertTriangle,
  Building2,
  Truck,
  Warehouse,
  FileSpreadsheet,
  Plus,
  X,
  Check,
  Camera,
  Calendar,
  Filter
} from "lucide-react";
import { db, AppUser, BrazingInventoryItem, BrazingExchange, BrazingGasType } from "@/lib/db";

export default function BrazingGasesAdminPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "history">("inventory");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [inventoryItems, setInventoryItems] = useState<BrazingInventoryItem[]>([]);
  const [exchanges, setExchanges] = useState<BrazingExchange[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGasFilter, setSelectedGasFilter] = useState<string>("all");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("all");

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustHolder, setAdjustHolder] = useState<{ id: string; name: string; type: "engineer" | "stores"; reg?: string } | null>(null);
  const [adjustGas, setAdjustGas] = useState<BrazingGasType>("Oxygen");
  const [adjustQuantity, setAdjustQuantity] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState("");
  const [isSavingAdjust, setIsSavingAdjust] = useState(false);

  // Photo Lightbox Modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, inv, exc] = await Promise.all([
        db.getAllUsers(),
        db.getBrazingInventory(),
        db.getBrazingExchanges({ limit: 200 })
      ]);
      setUsers(allUsers || []);
      setInventoryItems(inv || []);
      setExchanges(exc || []);
    } catch (e) {
      console.error("Error loading brazing data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Engineers list (users with role engineer, mate, apprentice or has vehicleReg)
  const engineers = useMemo(() => {
    return users.filter(u =>
      u.role === "engineer" ||
      u.role === "mate" ||
      u.role === "apprentice" ||
      (u.vehicleReg && u.vehicleReg.trim().length > 0)
    ).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [users]);

  // Combined Matrix for Table View
  const matrixRows = useMemo(() => {
    const rows = [];

    // 1. Stores Row
    const storesO2 = inventoryItems.find(i => i.holderType === "stores" && i.gasType === "Oxygen")?.quantity ?? 0;
    const storesPropane = inventoryItems.find(i => i.holderType === "stores" && i.gasType === "Propane")?.quantity ?? 0;
    const storesLastExc = exchanges.find(e => e.engineerId === "stores");

    rows.push({
      id: "stores",
      type: "stores" as const,
      name: "HQ Stores / Main Base",
      reg: "Monkton Unit 10",
      oxygen: storesO2,
      propane: storesPropane,
      lastExchange: storesLastExc?.exchangeDate || null
    });

    // 2. Engineer Rows
    for (const eng of engineers) {
      const o2Item = inventoryItems.find(i => i.holderType === "engineer" && i.holderId === eng.id && i.gasType === "Oxygen");
      const propaneItem = inventoryItems.find(i => i.holderType === "engineer" && i.holderId === eng.id && i.gasType === "Propane");

      // Default standard kit is 1 if not explicitly altered
      const o2Count = o2Item !== undefined ? o2Item.quantity : 1;
      const propaneCount = propaneItem !== undefined ? propaneItem.quantity : 1;

      const lastExc = exchanges.find(e => e.engineerId === eng.id);

      rows.push({
        id: eng.id,
        type: "engineer" as const,
        name: eng.name,
        reg: eng.vehicleReg || "No Van Assigned",
        oxygen: o2Count,
        propane: propaneCount,
        lastExchange: lastExc?.exchangeDate || null
      });
    }

    return rows;
  }, [engineers, inventoryItems, exchanges]);

  // Filtered rows for Inventory tab
  const filteredMatrix = useMemo(() => {
    return matrixRows.filter(r => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reg.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [matrixRows, searchQuery]);

  // Fleet Totals
  const totals = useMemo(() => {
    let totalO2 = 0;
    let totalPropane = 0;
    let vansO2 = 0;
    let vansPropane = 0;
    let storesO2 = 0;
    let storesPropane = 0;

    for (const r of matrixRows) {
      totalO2 += r.oxygen;
      totalPropane += r.propane;
      if (r.type === "engineer") {
        vansO2 += r.oxygen;
        vansPropane += r.propane;
      } else {
        storesO2 += r.oxygen;
        storesPropane += r.propane;
      }
    }

    const newPurchasesCount = exchanges.filter(e => e.actionType === "purchase_new").length;

    return {
      totalO2,
      totalPropane,
      vansO2,
      vansPropane,
      storesO2,
      storesPropane,
      totalFleet: totalO2 + totalPropane,
      newPurchasesCount,
      totalExchanges: exchanges.length
    };
  }, [matrixRows, exchanges]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return exchanges.filter(e => {
      const matchesSearch =
        e.engineerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.supplier && e.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.branch && e.branch.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.reason && e.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.poNumber && e.poNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGas = selectedGasFilter === "all" || e.gasType === selectedGasFilter;
      const matchesAction = selectedActionFilter === "all" || e.actionType === selectedActionFilter;

      return matchesSearch && matchesGas && matchesAction;
    });
  }, [exchanges, searchQuery, selectedGasFilter, selectedActionFilter]);

  // Handle Stock Adjustment
  const handleOpenAdjust = (row: typeof matrixRows[0], gas: BrazingGasType) => {
    setAdjustHolder({
      id: row.id,
      name: row.name,
      type: row.type,
      reg: row.reg
    });
    setAdjustGas(gas);
    setAdjustQuantity(gas === "Oxygen" ? row.oxygen : row.propane);
    setAdjustReason("");
    setAdjustModalOpen(true);
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustHolder) return;

    setIsSavingAdjust(true);
    try {
      await db.setBrazingInventory({
        holderType: adjustHolder.type,
        holderId: adjustHolder.id,
        holderName: adjustHolder.name,
        vehicleReg: adjustHolder.reg,
        gasType: adjustGas,
        quantity: Number(adjustQuantity)
      });

      if (adjustReason.trim()) {
        await db.logBrazingExchange({
          exchangeDate: new Date().toISOString(),
          engineerId: adjustHolder.id,
          engineerName: adjustHolder.name,
          gasType: adjustGas,
          supplier: adjustHolder.type === "stores" ? "HQ Stores" : "Fleet Admin",
          actionType: "adjustment",
          quantity: Number(adjustQuantity),
          reason: `Admin balance adjustment to ${adjustQuantity} cylinders: ${adjustReason.trim()}`,
          notes: adjustReason.trim(),
          loggedBy: "Admin"
        });
      }

      setAdjustModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert("Failed to adjust inventory: " + err.message);
    } finally {
      setIsSavingAdjust(false);
    }
  };

  // CSV Export for Exchanges
  const exportHistoryCSV = () => {
    const headers = ["Date", "Engineer / Holder", "Gas Type", "Action", "Supplier", "Branch", "Quantity", "PO Number", "Reason / Notes", "Has Receipt"];
    const rows = filteredHistory.map(e => [
      new Date(e.exchangeDate).toLocaleDateString("en-GB"),
      `"${e.engineerName.replace(/"/g, '""')}"`,
      e.gasType,
      e.actionType === "purchase_new" ? "New Purchase" : e.actionType === "swap_empty_for_full" ? "1-for-1 Swap" : e.actionType,
      `"${(e.supplier || "").replace(/"/g, '""')}"`,
      `"${(e.branch || "").replace(/"/g, '""')}"`,
      e.quantity,
      `"${(e.poNumber || "").replace(/"/g, '""')}"`,
      `"${(e.reason || e.notes || "").replace(/"/g, '""')}"`,
      e.receiptPhotoUrl ? "Yes" : "No"
    ].join(","));

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `brazing_exchanges_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "1.5rem"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(249, 115, 22, 0.2)",
              color: "#f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Flame size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                Brazing Gases Inventory
                <span style={{
                  fontSize: "0.75rem",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "rgba(34, 197, 94, 0.2)",
                  color: "#22c55e",
                  fontWeight: 600
                }}>
                  Purchased Fleet (Non-Serialized)
                </span>
              </h1>
              <p style={{ color: "#94a3b8", fontSize: "0.88rem", margin: "3px 0 0 0" }}>
                Live balances & supplier exchanges for Oxygen (FSW) and Propane (Calor Gas)
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={loadData}
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={exportHistoryCSV}
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              background: "rgba(34, 197, 94, 0.15)",
              color: "#22c55e",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600
            }}
          >
            <FileSpreadsheet size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1rem",
        marginBottom: "1.75rem"
      }}>
        {/* Oxygen Card */}
        <div style={{
          background: "var(--surface, #1e293b)",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          borderRadius: "14px",
          padding: "1.25rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.85rem", color: "#60a5fa", fontWeight: 700 }}>
                Oxygen Fleet (FSW Only)
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "4px" }}>
                {totals.totalO2} <span style={{ fontSize: "0.9rem", color: "#94a3b8", fontWeight: 500 }}>cylinders</span>
              </div>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(59, 130, 246, 0.2)",
              color: "#60a5fa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Flame size={20} />
            </div>
          </div>
          <div style={{
            display: "flex",
            gap: "1rem",
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: "0.8rem",
            color: "#94a3b8"
          }}>
            <div><strong>{totals.vansO2}</strong> in Vans</div>
            <div>•</div>
            <div><strong>{totals.storesO2}</strong> in Stores</div>
          </div>
        </div>

        {/* Propane Card */}
        <div style={{
          background: "var(--surface, #1e293b)",
          border: "1px solid rgba(249, 115, 22, 0.25)",
          borderRadius: "14px",
          padding: "1.25rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.85rem", color: "#fb923c", fontWeight: 700 }}>
                Propane Fleet (Calor Gas)
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "4px" }}>
                {totals.totalPropane} <span style={{ fontSize: "0.9rem", color: "#94a3b8", fontWeight: 500 }}>cylinders</span>
              </div>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(249, 115, 22, 0.2)",
              color: "#fb923c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Flame size={20} />
            </div>
          </div>
          <div style={{
            display: "flex",
            gap: "1rem",
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: "0.8rem",
            color: "#94a3b8"
          }}>
            <div><strong>{totals.vansPropane}</strong> in Vans</div>
            <div>•</div>
            <div><strong>{totals.storesPropane}</strong> in Stores</div>
          </div>
        </div>

        {/* Total Owned */}
        <div style={{
          background: "var(--surface, #1e293b)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "14px",
          padding: "1.25rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>
                Total Brazing Fleet
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "4px" }}>
                {totals.totalFleet} <span style={{ fontSize: "0.9rem", color: "#94a3b8", fontWeight: 500 }}>owned</span>
              </div>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Warehouse size={20} />
            </div>
          </div>
          <div style={{
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: "0.8rem",
            color: "#22c55e",
            fontWeight: 600
          }}>
            Purchased assets (Zero rental clock)
          </div>
        </div>

        {/* New Purchases Alert */}
        <div style={{
          background: totals.newPurchasesCount > 0 ? "rgba(245, 158, 11, 0.08)" : "var(--surface, #1e293b)",
          border: totals.newPurchasesCount > 0 ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(255,255,255,0.1)",
          borderRadius: "14px",
          padding: "1.25rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.85rem", color: "#f59e0b", fontWeight: 700 }}>
                New Cylinder Purchases
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "4px" }}>
                {totals.newPurchasesCount}
              </div>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(245, 158, 11, 0.2)",
              color: "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ShoppingCart size={20} />
            </div>
          </div>
          <div style={{
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: "0.8rem",
            color: totals.newPurchasesCount > 0 ? "#f59e0b" : "#94a3b8"
          }}>
            {totals.newPurchasesCount > 0 ? "Outright purchases recorded" : "No outright purchases (all 1-for-1 swaps)"}
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "1.25rem"
      }}>
        {/* Tab switch */}
        <div style={{
          display: "flex",
          background: "rgba(0,0,0,0.3)",
          padding: "4px",
          borderRadius: "10px"
        }}>
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "inventory" ? "var(--primary, #3b82f6)" : "transparent",
              color: activeTab === "inventory" ? "#fff" : "#94a3b8",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Truck size={16} /> Van & Stores Balances ({matrixRows.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "history" ? "var(--primary, #3b82f6)" : "transparent",
              color: activeTab === "history" ? "#fff" : "#94a3b8",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <RefreshCw size={16} /> Exchange & Purchase History ({exchanges.length})
          </button>
        </div>

        {/* Search input */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "8px",
          padding: "6px 12px",
          minWidth: "260px"
        }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder={activeTab === "inventory" ? "Search engineer or vehicle..." : "Search logs, notes, PO..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: "0.85rem",
              outline: "none",
              width: "100%"
            }}
          />
          {searchQuery && (
            <X size={14} color="#94a3b8" style={{ cursor: "pointer" }} onClick={() => setSearchQuery("")} />
          )}
        </div>
      </div>

      {/* TAB 1: Inventory Balances */}
      {activeTab === "inventory" && (
        <div style={{
          background: "var(--surface, #1e293b)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 600 }}>Holder / Vehicle</th>
                  <th style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 600 }}>Location Type</th>
                  <th style={{ padding: "12px 16px", color: "#60a5fa", fontWeight: 700 }}>Oxygen (FSW)</th>
                  <th style={{ padding: "12px 16px", color: "#fb923c", fontWeight: 700 }}>Propane (Calor)</th>
                  <th style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 600 }}>Total Cylinders</th>
                  <th style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 600 }}>Last Exchange</th>
                  <th style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatrix.map((row) => {
                  const isStores = row.type === "stores";
                  const totalRowCylinders = row.oxygen + row.propane;

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        background: isStores ? "rgba(59, 130, 246, 0.05)" : "transparent"
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700, color: isStores ? "#60a5fa" : "#fff" }}>
                          {row.name}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "2px" }}>
                          {row.reg}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          fontSize: "0.75rem",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          background: isStores ? "rgba(59, 130, 246, 0.15)" : "rgba(255,255,255,0.08)",
                          color: isStores ? "#60a5fa" : "#e2e8f0",
                          fontWeight: 600
                        }}>
                          {isStores ? "Stores Facility" : "Van Stock"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{
                            fontSize: "1.1rem",
                            fontWeight: 800,
                            color: row.oxygen > 0 ? "#60a5fa" : "#64748b"
                          }}>
                            {row.oxygen}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenAdjust(row, "Oxygen")}
                            style={{
                              padding: "2px 6px",
                              fontSize: "0.7rem",
                              borderRadius: "4px",
                              border: "1px solid rgba(59, 130, 246, 0.3)",
                              background: "rgba(59, 130, 246, 0.1)",
                              color: "#60a5fa",
                              cursor: "pointer"
                            }}
                          >
                            Adjust
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{
                            fontSize: "1.1rem",
                            fontWeight: 800,
                            color: row.propane > 0 ? "#fb923c" : "#64748b"
                          }}>
                            {row.propane}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenAdjust(row, "Propane")}
                            style={{
                              padding: "2px 6px",
                              fontSize: "0.7rem",
                              borderRadius: "4px",
                              border: "1px solid rgba(249, 115, 22, 0.3)",
                              background: "rgba(249, 115, 22, 0.1)",
                              color: "#fb923c",
                              cursor: "pointer"
                            }}
                          >
                            Adjust
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                        {totalRowCylinders}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "0.82rem" }}>
                        {row.lastExchange ? new Date(row.lastExchange).toLocaleDateString("en-GB") : "No swaps logged"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(row, "Oxygen")}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid rgba(255,255,255,0.15)",
                            background: "rgba(255,255,255,0.05)",
                            color: "#fff",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          Manage Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: History Log */}
      {activeTab === "history" && (
        <div>
          {/* History Filters */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
            marginBottom: "1rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#94a3b8" }}>
              <Filter size={15} /> Gas:
            </div>
            {["all", "Oxygen", "Propane"].map((gas) => (
              <button
                key={gas}
                type="button"
                onClick={() => setSelectedGasFilter(gas)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: selectedGasFilter === gas ? "1px solid var(--primary, #3b82f6)" : "1px solid rgba(255,255,255,0.1)",
                  background: selectedGasFilter === gas ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)",
                  color: selectedGasFilter === gas ? "#fff" : "#94a3b8",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {gas === "all" ? "All Gases" : gas}
              </button>
            ))}

            <div style={{ width: "1px", height: "18px", background: "rgba(255,255,255,0.1)", margin: "0 6px" }} />

            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#94a3b8" }}>
              Action:
            </div>
            {[
              { id: "all", label: "All Actions" },
              { id: "swap_empty_for_full", label: "1-for-1 Swaps" },
              { id: "purchase_new", label: "New Purchases" },
              { id: "adjustment", label: "Adjustments" },
            ].map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => setSelectedActionFilter(action.id)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: selectedActionFilter === action.id ? "1px solid var(--primary, #3b82f6)" : "1px solid rgba(255,255,255,0.1)",
                  background: selectedActionFilter === action.id ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)",
                  color: selectedActionFilter === action.id ? "#fff" : "#94a3b8",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {action.label}
              </button>
            ))}
          </div>

          <div style={{
            background: "var(--surface, #1e293b)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
          }}>
            {filteredHistory.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                <Flame size={40} style={{ opacity: 0.3, marginBottom: "0.75rem" }} />
                <p>No exchange or purchase records match your search.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      <th style={{ padding: "12px 14px", color: "#94a3b8", fontWeight: 600 }}>Date</th>
                      <th style={{ padding: "12px 14px", color: "#94a3b8", fontWeight: 600 }}>Engineer</th>
                      <th style={{ padding: "12px 14px", color: "#94a3b8", fontWeight: 600 }}>Gas Type</th>
                      <th style={{ padding: "12px 14px", color: "#94a3b8", fontWeight: 600 }}>Action</th>
                      <th style={{ padding: "12px 14px", color: "#94a3b8", fontWeight: 600 }}>Supplier & Branch</th>
                      <th style={{ padding: "12px 14px", color: "#94a3b8", fontWeight: 600 }}>Qty</th>
                      <th style={{ padding: "12px 14px", color: "#94a3b8", fontWeight: 600 }}>PO / Notes / Justification</th>
                      <th style={{ padding: "12px 14px", color: "#94a3b8", fontWeight: 600 }}>Receipt Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((item) => {
                      const isPurchase = item.actionType === "purchase_new";
                      const isAdjustment = item.actionType === "adjustment";

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                            background: isPurchase ? "rgba(245, 158, 11, 0.05)" : "transparent"
                          }}
                        >
                          <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                            {new Date(item.exchangeDate).toLocaleDateString("en-GB")}
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                              {new Date(item.exchangeDate).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                            {item.engineerName}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{
                              fontWeight: 700,
                              color: item.gasType === "Oxygen" ? "#60a5fa" : "#fb923c"
                            }}>
                              {item.gasType}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            {isPurchase ? (
                              <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: "rgba(245, 158, 11, 0.2)",
                                color: "#f59e0b",
                                fontWeight: 700,
                                fontSize: "0.75rem"
                              }}>
                                <AlertTriangle size={12} /> NEW PURCHASE
                              </span>
                            ) : isAdjustment ? (
                              <span style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: "rgba(148, 163, 184, 0.2)",
                                color: "#cbd5e1",
                                fontWeight: 600,
                                fontSize: "0.75rem"
                              }}>
                                Adjustment
                              </span>
                            ) : (
                              <span style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: "rgba(34, 197, 94, 0.15)",
                                color: "#22c55e",
                                fontWeight: 600,
                                fontSize: "0.75rem"
                              }}>
                                1-for-1 Swap
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 600 }}>{item.supplier}</div>
                            {item.branch && (
                              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{item.branch}</div>
                            )}
                          </td>
                          <td style={{ padding: "12px 14px", fontWeight: 700 }}>
                            {item.quantity}
                          </td>
                          <td style={{ padding: "12px 14px", maxWidth: "260px" }}>
                            {item.poNumber && (
                              <div style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 600 }}>
                                PO: {item.poNumber}
                              </div>
                            )}
                            <div style={{ fontSize: "0.8rem", color: isPurchase ? "#fef3c7" : "#cbd5e1" }}>
                              {item.reason || item.notes || "—"}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            {item.receiptPhotoUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewPhotoUrl(item.receiptPhotoUrl!)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid rgba(59, 130, 246, 0.3)",
                                  background: "rgba(59, 130, 246, 0.15)",
                                  color: "#60a5fa",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: 600
                                }}
                              >
                                <Camera size={12} /> View Photo
                              </button>
                            ) : (
                              <span style={{ color: "#64748b", fontSize: "0.75rem" }}>None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && adjustHolder && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            background: "var(--surface, #1e293b)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "460px",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "1.5rem",
            color: "#fff"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                Adjust Brazing Cylinder Stock
              </h3>
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust}>
              <div style={{ marginBottom: "1rem", fontSize: "0.88rem" }}>
                <span style={{ color: "#94a3b8" }}>Target Holder: </span>
                <strong>{adjustHolder.name}</strong> ({adjustHolder.reg})
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Gas Type
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setAdjustGas("Oxygen")}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "8px",
                      border: adjustGas === "Oxygen" ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.1)",
                      background: adjustGas === "Oxygen" ? "rgba(59, 130, 246, 0.2)" : "transparent",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Oxygen (FSW)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustGas("Propane")}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "8px",
                      border: adjustGas === "Propane" ? "2px solid #f97316" : "1px solid rgba(255,255,255,0.1)",
                      background: adjustGas === "Propane" ? "rgba(249, 115, 22, 0.2)" : "transparent",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Propane (Calor)
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                  New Cylinder Count Held
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "1rem",
                    fontWeight: 700
                  }}
                />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Adjustment Reason / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Issued 2nd van set, returned extra to stores"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.85rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: "0.65rem",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "transparent",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdjust}
                  style={{
                    flex: 1,
                    padding: "0.65rem",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--primary, #3b82f6)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {isSavingAdjust ? "Saving..." : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Photo Lightbox Modal */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              background: "#000",
              borderRadius: "12px",
              overflow: "hidden"
            }}
          >
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "rgba(0,0,0,0.7)",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <X size={20} />
            </button>
            <img
              src={previewPhotoUrl}
              alt="Exchange Receipt"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "85vh",
                objectFit: "contain",
                display: "block"
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
