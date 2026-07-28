"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { Search, Package, Briefcase, FileText, User, Truck, Building2, Calendar, ShieldCheck, ArrowRight, CornerDownLeft, X } from "lucide-react";

interface SearchResult {
  id: string;
  type: "bottle" | "job" | "hwcn" | "engineer" | "supplier" | "nav";
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  href: string;
}

const STATIC_NAV_LINKS: SearchResult[] = [
  { id: "nav-bottles", type: "nav", title: "Cylinder Inventory", subtitle: "View all active and returned bottles", href: "/admin/bottles" },
  { id: "nav-expiry", type: "nav", title: "Rental Expiry Tracking", subtitle: "Monitor cylinder hire periods & alerts", href: "/admin/expiry" },
  { id: "nav-jobs", type: "nav", title: "Refrigerant Jobs & Sites", subtitle: "View job references and refrigerant actions", href: "/admin/jobs" },
  { id: "nav-equipment", type: "nav", title: "Equipment Action Index", subtitle: "Search installed and serviced equipment", href: "/admin/jobs/equipment" },
  { id: "nav-returns", type: "nav", title: "Supplier Returns & Waste", subtitle: "Process cylinder returns to gas suppliers", href: "/admin/supplier-returns-waste" },
  { id: "nav-hwcns", type: "nav", title: "Hazardous Waste Notes (HWCNs)", subtitle: "View all waste consignment notes", href: "/admin/all-hwcns" },
  { id: "nav-notifications", type: "nav", title: "Notification Center", subtitle: "View system alerts and notifications", href: "/admin/notifications" },
  { id: "nav-reports", type: "nav", title: "F-Gas Reports", subtitle: "Generate compliance & summary reports", href: "/admin/reports" },
  { id: "nav-settings", type: "nav", title: "Admin Settings", subtitle: "Configure suppliers and system options", href: "/admin/settings" },
];

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const [bottles, setBottles] = useState<any[]>([]);
  const [crmJobs, setCrmJobs] = useState<any[]>([]);
  const [hwcns, setHwcns] = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      loadIndexData();
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  async function loadIndexData() {
    if (bottles.length > 0) return;
    setLoading(true);
    try {
      const [bList, jList, hList] = await Promise.all([
        db.getAllBottles(),
        db.getAllCrmJobs(),
        db.getAllHWCNs(),
      ]);
      setBottles(bList || []);
      setCrmJobs(jList || []);
      setHwcns(hList || []);
    } catch (err) {
      console.error("Error loading command palette index:", err);
    } finally {
      setLoading(false);
    }
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STATIC_NAV_LINKS;

    const list: SearchResult[] = [];

    // Search Bottles
    bottles.forEach(b => {
      if (b.serial.toLowerCase().includes(q) || (b.gasType && b.gasType.toLowerCase().includes(q)) || (b.locationId && b.locationId.toLowerCase().includes(q))) {
        list.push({
          id: `bottle-${b.serial}`,
          type: "bottle",
          title: `Cylinder ${b.serial}`,
          subtitle: `${b.gasType || 'Gas'} · ${b.locationId || 'Storage'} · ${b.status}`,
          badge: b.category,
          badgeColor: b.category === "new" ? "#22c55e" : b.category === "reclaim" ? "#ffaa00" : "#00e5ff",
          href: `/admin/bottles/${b.serial}`,
        });
      }
    });

    // Search Jobs
    crmJobs.forEach(j => {
      const refStr = `${j.prefix || ''}${j.jobNumber}`.toLowerCase();
      if (refStr.includes(q) || (j.siteTitle && j.siteTitle.toLowerCase().includes(q)) || (j.customer && j.customer.toLowerCase().includes(q))) {
        list.push({
          id: `job-${j.jobNumber}`,
          type: "job",
          title: `Job ${j.prefix || ''}${j.jobNumber}: ${j.siteTitle || j.jobTitle}`,
          subtitle: `${j.customer || 'Site'} · ${j.siteAddress || j.sitePostcode || ''}`,
          badge: "CRM Job",
          badgeColor: "#00e5ff",
          href: `/admin/jobs/${encodeURIComponent(`${j.prefix || ''}${j.jobNumber}`)}`,
        });
      }
    });

    // Search HWCNs
    hwcns.forEach(h => {
      if (h.id.toLowerCase().includes(q) || (h.destination && h.destination.toLowerCase().includes(q))) {
        list.push({
          id: `hwcn-${h.id}`,
          type: "hwcn",
          title: `HWCN ${h.id}`,
          subtitle: `Destination: ${h.destination || '—'} · Status: ${h.hwcnStatus}`,
          badge: "HWCN",
          badgeColor: "#a855f7",
          href: `/admin/hwcn/${encodeURIComponent(h.id)}`,
        });
      }
    });

    // Filter static navigation links
    STATIC_NAV_LINKS.forEach(n => {
      if (n.title.toLowerCase().includes(q) || n.subtitle?.toLowerCase().includes(q)) {
        list.push(n);
      }
    });

    return list.slice(0, 25);
  }, [query, bottles, crmJobs, hwcns]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (item: SearchResult) => {
    onClose();
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(5, 8, 15, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        paddingInline: "1rem",
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "#0f172a",
          border: "1px solid rgba(0, 229, 255, 0.3)",
          borderRadius: "14px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(0, 229, 255, 0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Search Header Bar */}
        <div style={{ display: "flex", alignItems: "center", padding: "1.1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.08)", gap: "0.85rem" }}>
          <Search size={22} color="#00e5ff" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search cylinders, jobs, HWCNs, suppliers..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: "1.1rem",
              fontWeight: 600,
              outline: "none",
            }}
          />
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#94a3b8", borderRadius: "6px", padding: "0.25rem 0.5rem", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
          >
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div style={{ maxHeight: "420px", overflowY: "auto", padding: "0.5rem" }}>
          {loading && results.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
              Indexing search items...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
              No matches found for "<strong style={{ color: "#fff" }}>{query}</strong>"
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const IconComp = item.type === "bottle" ? Package : item.type === "job" ? Briefcase : item.type === "hwcn" ? FileText : ArrowRight;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    background: isSelected ? "rgba(0, 229, 255, 0.12)" : "transparent",
                    border: isSelected ? "1px solid rgba(0, 229, 255, 0.3)" : "1px solid transparent",
                    transition: "all 0.1s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", overflow: "hidden" }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "8px",
                      background: isSelected ? "rgba(0, 229, 255, 0.2)" : "rgba(255, 255, 255, 0.05)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isSelected ? "#00e5ff" : "#94a3b8", flexShrink: 0
                    }}>
                      <IconComp size={18} />
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "1px" }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                    {item.badge && (
                      <span style={{
                        fontSize: "0.68rem", fontWeight: 800, padding: "0.15rem 0.5rem", borderRadius: "4px", textTransform: "uppercase",
                        background: `${item.badgeColor || '#00e5ff'}20`, color: item.badgeColor || '#00e5ff'
                      }}>
                        {item.badge}
                      </span>
                    )}
                    {isSelected && <CornerDownLeft size={16} color="#00e5ff" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div style={{ padding: "0.6rem 1.25rem", background: "rgba(15, 23, 42, 0.95)", borderTop: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8" }}>
          <div>
            Press <strong style={{ color: "#fff" }}>↑ ↓</strong> to navigate, <strong style={{ color: "#00e5ff" }}>Enter</strong> to select
          </div>
          <div>
            Quick Search &nbsp;·&nbsp; <strong>Ctrl + K</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
