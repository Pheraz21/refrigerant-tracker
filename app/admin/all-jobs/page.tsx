"use client";

import { useEffect, useRef, useState } from "react";
import { db, CrmJob } from "@/lib/db";
import {
  ClipboardList, Upload, Search, RefreshCw, X, ChevronUp, ChevronDown,
  AlertTriangle, Pencil, Save, ArrowRight
} from "lucide-react";
import Link from "next/link";

// ── Exact column headers from the CRM export ──────────────────────────────────
const EXACT_HEADERS: Record<string, string> = {
  "prefix":            "prefix",
  "job no.":           "jobNumber",
  "job no":            "jobNumber",
  "job no (prefixed)": "jobNumber",
  "start date":        "startDate",
  "customer":          "customer",
  "site":              "__site__",
  "title":             "jobTitle",
  "postcode":          "sitePostcode",
  "category":          "category",
  "fault code":        "faultCode",
};

// ── Site field parser ─────────────────────────────────────────────────────────
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

function parseSiteField(value: string): { siteTitle: string; siteAddress: string; parsedPostcode: string } {
  const colonIdx = value.indexOf(":");
  if (colonIdx === -1) return { siteTitle: "", siteAddress: value.trim(), parsedPostcode: "" };
  const siteTitle = value.slice(0, colonIdx).trim();
  const rest = value.slice(colonIdx + 1).trim();
  const parts = rest.split(",").map(p => p.trim()).filter(Boolean);
  if (!parts.length) return { siteTitle, siteAddress: "", parsedPostcode: "" };
  const lastPart = parts[parts.length - 1];
  const hasPostcode = UK_POSTCODE_RE.test(lastPart);
  return {
    siteTitle,
    siteAddress: (hasPostcode ? parts.slice(0, -1) : parts).join(", "),
    parsedPostcode: hasPostcode ? lastPart : ""
  };
}

// ── Row parser ────────────────────────────────────────────────────────────────
function parseRows(rawRows: Record<string, any>[]): Omit<CrmJob, "id" | "importedAt">[] {
  if (!rawRows.length) return [];
  const headers = Object.keys(rawRows[0]);
  const fieldMap: Record<string, string> = {};
  for (const h of headers) {
    const mapped = EXACT_HEADERS[h.toLowerCase().trim()];
    if (mapped) fieldMap[h] = mapped;
  }
  return rawRows.map(row => {
    const obj: any = {
      rawData: row, uprn: null,
      jobNumber: "", prefix: "", customer: "", siteTitle: "", siteAddress: "",
      sitePostcode: "", startDate: "", category: "", faultCode: "", jobTitle: "",
      _pp: ""
    };
    for (const [rawHeader, field] of Object.entries(fieldMap)) {
      const val = row[rawHeader] != null ? String(row[rawHeader]).trim() : "";
      if (field === "__site__") {
        const { siteTitle, siteAddress, parsedPostcode } = parseSiteField(val);
        obj.siteTitle = siteTitle;
        obj.siteAddress = siteAddress;
        obj._pp = parsedPostcode;
      } else {
        obj[field] = val;
      }
    }
    if (!obj.sitePostcode && obj._pp) obj.sitePostcode = obj._pp;
    delete obj._pp;
    return obj as Omit<CrmJob, "id" | "importedAt">;
  }).filter(r => r.jobNumber);
}

// ── Types ─────────────────────────────────────────────────────────────────────
type SortKey = "jobNumber" | "prefix" | "startDate" | "jobTitle" | "customer" | "siteTitle" | "siteAddress" | "sitePostcode" | "uprn" | "importedAt";
type SortDir = "asc" | "desc";

interface PreviewState {
  newRows: Omit<CrmJob, "id" | "importedAt">[];
  skippedCount: number;
}

// ── Edit modal field config ───────────────────────────────────────────────────
const EDIT_FIELDS: { key: keyof CrmJob; label: string; readOnly?: boolean }[] = [
  { key: "prefix",       label: "Prefix" },
  { key: "jobNumber",    label: "Job No.", readOnly: true },
  { key: "startDate",    label: "Start Date" },
  { key: "jobTitle",     label: "Title" },
  { key: "customer",     label: "Customer" },
  { key: "siteTitle",    label: "Site Title" },
  { key: "siteAddress",  label: "Address" },
  { key: "sitePostcode", label: "Postcode" },
  { key: "category",     label: "Category" },
  { key: "faultCode",    label: "Fault Code" },
  { key: "uprn",         label: "UPRN" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function AllJobsPage() {
  const [jobs, setJobs] = useState<CrmJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("startDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [jobSearch, setJobSearch] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const [uprnProgress, setUprnProgress] = useState<{ done: number; total: number } | null>(null);
  const [uprnRunning, setUprnRunning] = useState(false);
  const [uprnError, setUprnError] = useState<string | null>(null);
  const uprnAbortRef = useRef(false);

  // Edit modal
  const [editJob, setEditJob] = useState<CrmJob | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<CrmJob>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setJobs(await db.getAllCrmJobs());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── File parse ──────────────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);
      if (!rawRows.length) { setImportError("File is empty or could not be parsed."); return; }
      const allParsed = parseRows(rawRows);
      if (!allParsed.length) {
        setImportError(`No rows with a recognised Job Number found. Expected a column named "Job No." or "Prefix".`);
        return;
      }
      // Filter out job numbers that already exist in the database
      const existingNos = new Set(jobs.map(j => j.jobNumber));
      const newRows = allParsed.filter(r => !existingNos.has(r.jobNumber));
      setPreview({ newRows, skippedCount: allParsed.length - newRows.length });
    } catch (err: any) {
      setImportError("Failed to parse file: " + err.message);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Import confirm ──────────────────────────────────────────────────────────
  const confirmImport = async () => {
    if (!preview || !preview.newRows.length) return;
    setImporting(true);
    try {
      await db.upsertCrmJobs(preview.newRows);
      setImportResult(`${preview.newRows.length.toLocaleString()} new job${preview.newRows.length !== 1 ? "s" : ""} imported.${preview.skippedCount > 0 ? ` ${preview.skippedCount.toLocaleString()} existing records skipped.` : ""}`);
      setPreview(null);
      await load();
    } catch (err: any) {
      setImportError("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  // ── UPRN lookup ─────────────────────────────────────────────────────────────
  const runUprnLookup = async () => {
    const pending = jobs.filter(j => !j.uprn && (j.siteAddress || j.sitePostcode));
    if (!pending.length) return;
    setUprnRunning(true);
    setUprnError(null);
    uprnAbortRef.current = false;
    setUprnProgress({ done: 0, total: pending.length });

    // Pre-flight check
    try {
      const testRes = await fetch("/api/uprn", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: pending[0].siteAddress, postcode: pending[0].sitePostcode })
      });
      const testJson = await testRes.json();
      if (testJson.error === "API key not configured") {
        setUprnError("OS Places API key is not configured. Add OS_PLACES_API_KEY to your .env.local file and restart the dev server.");
        setUprnRunning(false); setUprnProgress(null); return;
      }
    } catch {
      setUprnError("Could not reach the UPRN lookup service. Make sure the dev server is running.");
      setUprnRunning(false); setUprnProgress(null); return;
    }

    let found = 0;
    for (let i = 0; i < pending.length; i++) {
      if (uprnAbortRef.current) break;
      const job = pending[i];
      try {
        const res = await fetch("/api/uprn", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: job.siteAddress, postcode: job.sitePostcode })
        });
        const { uprn } = await res.json();
        if (uprn) {
          found++;
          await db.updateCrmJobUprn(job.id, uprn);
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, uprn } : j));
        }
      } catch { /* skip */ }
      setUprnProgress({ done: i + 1, total: pending.length });
      if (i < pending.length - 1) await new Promise(r => setTimeout(r, 110));
    }
    setUprnRunning(false); setUprnProgress(null);
    if (found > 0) await load();
  };

  // ── Sort ────────────────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...jobs].sort((a, b) => {
    if (sortKey === "jobNumber") {
      // Strip leading non-numeric characters and sort by number (M19672 → 19672)
      const toNum = (s: string) => parseInt(s.replace(/^[^\d]+/, ""), 10) || 0;
      const diff = toNum(a.jobNumber) - toNum(b.jobNumber);
      return sortDir === "asc" ? diff : -diff;
    }
    const av = (a[sortKey] ?? "") as string;
    const bv = (b[sortKey] ?? "") as string;
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  // ── Edit handlers ────────────────────────────────────────────────────────────
  const openEdit = (job: CrmJob) => {
    setEditJob(job);
    setEditDraft({
      prefix: job.prefix, jobNumber: job.jobNumber, startDate: job.startDate,
      jobTitle: job.jobTitle, customer: job.customer, siteTitle: job.siteTitle,
      siteAddress: job.siteAddress, sitePostcode: job.sitePostcode,
      category: job.category, faultCode: job.faultCode, uprn: job.uprn ?? ""
    });
  };

  const saveEdit = async () => {
    if (!editJob) return;
    setSaving(true);
    try {
      await db.updateCrmJob(editJob.id, editDraft);
      setJobs(prev => prev.map(j => j.id === editJob.id ? { ...j, ...editDraft, uprn: editDraft.uprn || null } : j));
      setEditJob(null);
    } finally {
      setSaving(false);
    }
  };

  const withUprn = jobs.filter(j => j.uprn).length;
  const withoutUprn = jobs.filter(j => !j.uprn && (j.siteAddress || j.sitePostcode)).length;

  const filteredJobs = jobSearch.trim()
    ? sorted.filter(j => {
        const q = jobSearch.toLowerCase();
        return (j.jobNumber || "").toLowerCase().includes(q) ||
          (j.customer || "").toLowerCase().includes(q) ||
          (j.siteTitle || "").toLowerCase().includes(q) ||
          (j.jobTitle || "").toLowerCase().includes(q);
      })
    : sorted;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const thBase: React.CSSProperties = {
    padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, fontSize: "0.75rem",
    color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: "1px solid rgba(255,255,255,0.07)", whiteSpace: "nowrap",
    cursor: "pointer", userSelect: "none"
  };
  const tdBase: React.CSSProperties = {
    padding: "0.6rem 0.75rem", fontSize: "0.84rem", color: "rgba(255,255,255,0.75)",
    borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle"
  };
  const nil = <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>;

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === "asc" ? <ChevronUp size={12} style={{ marginLeft: 3 }} /> : <ChevronDown size={12} style={{ marginLeft: 3 }} />
      : <ChevronUp size={12} style={{ marginLeft: 3, opacity: 0.2 }} />;

  const th = (k: SortKey, label: string) => (
    <th onClick={() => handleSort(k)} style={{ ...thBase, color: sortKey === k ? "#00e5ff" : "rgba(255,255,255,0.5)" }}>
      <span style={{ display: "inline-flex", alignItems: "center" }}>{label}<SortIcon k={k} /></span>
    </th>
  );

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "6px", color: "#fff", padding: "0.45rem 0.7rem", fontSize: "0.85rem", outline: "none"
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
          <ClipboardList size={28} color="#00e5ff" />
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff", margin: 0 }}>All Jobs</h1>
        </div>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem", margin: 0 }}>
          CRM job import — {jobs.length.toLocaleString()} jobs loaded
          {jobs.length > 0 && `, ${withUprn.toLocaleString()} of ${jobs.length.toLocaleString()} have UPRNs`}
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <label style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)",
          color: "#00e5ff", padding: "0.5rem 1rem", borderRadius: "8px",
          cursor: "pointer", fontSize: "0.85rem", fontWeight: 600
        }}>
          <Upload size={16} /> Import Excel / CSV
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
        </label>

        {jobs.length > 0 && (
          <button
            onClick={runUprnLookup}
            disabled={uprnRunning || withoutUprn === 0}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              background: uprnRunning ? "rgba(255,170,0,0.05)" : "rgba(255,170,0,0.1)",
              border: "1px solid rgba(255,170,0,0.25)",
              color: withoutUprn === 0 ? "rgba(255,170,0,0.35)" : "#ffaa00",
              padding: "0.5rem 1rem", borderRadius: "8px",
              cursor: withoutUprn === 0 || uprnRunning ? "default" : "pointer",
              fontSize: "0.85rem", fontWeight: 600
            }}
          >
            <Search size={16} />
            {uprnRunning
              ? `Looking up UPRNs (${uprnProgress?.done ?? 0} / ${uprnProgress?.total ?? 0})…`
              : `Find UPRNs (${withoutUprn.toLocaleString()} pending)`}
          </button>
        )}

        {uprnRunning && (
          <button onClick={() => { uprnAbortRef.current = true; }} style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.25)",
            color: "#ff3366", padding: "0.5rem 0.75rem", borderRadius: "8px",
            cursor: "pointer", fontSize: "0.8rem", fontWeight: 600
          }}>
            <X size={14} /> Stop
          </button>
        )}

        {jobs.length > 0 && (
          <div style={{ position: "relative", flex: "0 1 280px" }}>
            <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search job no., customer, site…"
              value={jobSearch}
              onChange={e => setJobSearch(e.target.value)}
              style={{
                width: "100%", padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px", color: "#fff", fontSize: "0.85rem", outline: "none"
              }}
            />
          </div>
        )}

        <button onClick={load} style={{
          marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.5)", padding: "0.5rem 0.75rem", borderRadius: "8px",
          cursor: "pointer", fontSize: "0.8rem"
        }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* UPRN progress bar */}
      {uprnRunning && uprnProgress && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "6px", overflow: "hidden", height: "6px" }}>
            <div style={{ width: `${(uprnProgress.done / uprnProgress.total) * 100}%`, height: "100%", background: "#ffaa00", transition: "width 0.3s ease" }} />
          </div>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "0.3rem" }}>
            Looking up UPRNs: {uprnProgress.done.toLocaleString()} / {uprnProgress.total.toLocaleString()}
          </div>
        </div>
      )}

      {/* UPRN error */}
      {uprnError && (
        <div style={{
          background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.3)",
          color: "#ffaa00", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1rem",
          fontSize: "0.85rem", display: "flex", alignItems: "flex-start", gap: "0.6rem"
        }}>
          <AlertTriangle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <div><strong>UPRN lookup failed</strong><br />{uprnError}</div>
          <button onClick={() => setUprnError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#ffaa00", cursor: "pointer", flexShrink: 0 }}><X size={14} /></button>
        </div>
      )}

      {/* Import feedback */}
      {importError && (
        <div style={{
          background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.3)",
          color: "#ff3366", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1rem",
          fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem"
        }}>
          <X size={16} /> {importError}
          <button onClick={() => setImportError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#ff3366", cursor: "pointer" }}><X size={14} /></button>
        </div>
      )}
      {importResult && (
        <div style={{
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
          color: "#22c55e", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.85rem"
        }}>
          {importResult}
        </div>
      )}

      {/* ── Preview modal ─────────────────────────────────────────────────────── */}
      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{
            background: "#0f1420", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px", padding: "1.5rem", maxWidth: "900px", width: "95%", maxHeight: "80vh",
            display: "flex", flexDirection: "column", gap: "1rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>Import Preview</h2>
              <button onClick={() => setPreview(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><X size={20} /></button>
            </div>

            {/* Summary chips */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{
                background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                color: "#22c55e", padding: "0.3rem 0.8rem", borderRadius: "20px", fontSize: "0.82rem", fontWeight: 600
              }}>
                {preview.newRows.length.toLocaleString()} new — will be imported
              </span>
              {preview.skippedCount > 0 && (
                <span style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)", padding: "0.3rem 0.8rem", borderRadius: "20px", fontSize: "0.82rem"
                }}>
                  {preview.skippedCount.toLocaleString()} already exist — skipped
                </span>
              )}
            </div>

            {preview.newRows.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", margin: 0 }}>
                All job numbers in this file already exist in the database. Nothing to import.
              </p>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                  Showing first 5 new rows. The Site column has been split into title + address + postcode.
                </p>
                <div style={{ overflowX: "auto", flex: 1, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Prefix", "Job No.", "Start Date", "Title", "Customer", "Site Title", "Address", "Postcode"].map(h => (
                          <th key={h} style={{ ...thBase, cursor: "default" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.newRows.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          <td style={tdBase}>{row.prefix || nil}</td>
                          <td style={{ ...tdBase, fontWeight: 600, color: "#fff" }}>{row.jobNumber || nil}</td>
                          <td style={tdBase}>{row.startDate || nil}</td>
                          <td style={tdBase}>{row.jobTitle || nil}</td>
                          <td style={tdBase}>{row.customer || nil}</td>
                          <td style={tdBase}>{row.siteTitle || nil}</td>
                          <td style={tdBase}>{row.siteAddress || nil}</td>
                          <td style={tdBase}>{row.sitePostcode || nil}</td>
                        </tr>
                      ))}
                      {preview.newRows.length > 5 && (
                        <tr>
                          <td colSpan={8} style={{ ...tdBase, color: "rgba(255,255,255,0.3)", fontStyle: "italic", textAlign: "center" }}>
                            …and {(preview.newRows.length - 5).toLocaleString()} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setPreview(null)} style={{
                padding: "0.6rem 1.2rem", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)",
                borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem"
              }}>Cancel</button>
              {preview.newRows.length > 0 && (
                <button onClick={confirmImport} disabled={importing} style={{
                  padding: "0.6rem 1.4rem", background: "rgba(0,229,255,0.15)",
                  border: "1px solid rgba(0,229,255,0.35)", color: "#00e5ff",
                  borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700
                }}>
                  {importing ? "Importing…" : `Import ${preview.newRows.length.toLocaleString()} new jobs`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ────────────────────────────────────────────────────────── */}
      {editJob && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{
            background: "#0f1420", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px", padding: "1.5rem", maxWidth: "560px", width: "95%", maxHeight: "90vh",
            display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                Edit Job — {editJob.jobNumber}
              </h2>
              <button onClick={() => setEditJob(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><X size={20} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {EDIT_FIELDS.map(({ key, label, readOnly }) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {label}
                  </label>
                  <input
                    value={(editDraft[key] ?? "") as string}
                    readOnly={readOnly}
                    onChange={e => setEditDraft(d => ({ ...d, [key]: e.target.value }))}
                    style={{
                      ...inputStyle,
                      opacity: readOnly ? 0.45 : 1,
                      cursor: readOnly ? "default" : "text"
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
              <button onClick={() => setEditJob(null)} style={{
                padding: "0.6rem 1.2rem", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)",
                borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem"
              }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving} style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                padding: "0.6rem 1.4rem", background: "rgba(0,229,255,0.15)",
                border: "1px solid rgba(0,229,255,0.35)", color: "#00e5ff",
                borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700
              }}>
                <Save size={15} /> {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Jobs table ────────────────────────────────────────────────────────── */}
      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "12px", overflow: "hidden"
      }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Loading…</div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
            No jobs imported yet. Use the Import button to upload an Excel or CSV file.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {filteredJobs.length === 0 && jobSearch && (
              <div style={{ padding: "2.5rem", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.9rem" }}>
                No jobs match &ldquo;{jobSearch}&rdquo;
              </div>
            )}
            {filteredJobs.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thBase, cursor: "default", width: "48px" }}></th>
                  {th("prefix", "Prefix")}
                  {th("jobNumber", "Job No.")}
                  {th("startDate", "Start Date")}
                  {th("jobTitle", "Title")}
                  {th("customer", "Customer")}
                  {th("siteTitle", "Site Title")}
                  {th("siteAddress", "Address")}
                  {th("sitePostcode", "Postcode")}
                  {th("uprn", "UPRN")}
                  {th("importedAt", "Imported")}
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => (
                  <tr key={job.id}
                    style={{ transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...tdBase, textAlign: "center", padding: "0.6rem 0.5rem" }}>
                      <button
                        onClick={() => openEdit(job)}
                        title="Edit row"
                        style={{
                          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.4)", borderRadius: "6px", padding: "0.3rem 0.45rem",
                          cursor: "pointer", display: "inline-flex", alignItems: "center", lineHeight: 1,
                          transition: "all 0.15s"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,229,255,0.1)"; e.currentTarget.style.color = "#00e5ff"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.25)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                      >
                        <Pencil size={13} />
                      </button>
                    </td>
                    <td style={{ ...tdBase, color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>{job.prefix || nil}</td>
                    <td style={{ ...tdBase, fontWeight: 600, whiteSpace: "nowrap" }}>
                      <Link
                        href={`/admin/jobs/${job.jobNumber}`}
                        style={{ color: "#00e5ff", textDecoration: "underline", textDecorationColor: "rgba(0,229,255,0.4)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.2rem" }}
                      >
                        {job.jobNumber} <ArrowRight size={13} />
                      </Link>
                    </td>
                    <td style={{ ...tdBase, whiteSpace: "nowrap" }}>{job.startDate || nil}</td>
                    <td style={tdBase}>{job.jobTitle || nil}</td>
                    <td style={tdBase}>{job.customer || nil}</td>
                    <td style={tdBase}>{job.siteTitle || nil}</td>
                    <td style={tdBase}>{job.siteAddress || nil}</td>
                    <td style={{ ...tdBase, whiteSpace: "nowrap" }}>{job.sitePostcode || nil}</td>
                    <td style={tdBase}>
                      {job.uprn ? (
                        <span style={{
                          background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)",
                          color: "#00e5ff", padding: "0.15rem 0.5rem", borderRadius: "6px",
                          fontSize: "0.78rem", fontWeight: 600, fontFamily: "monospace", whiteSpace: "nowrap"
                        }}>{job.uprn}</span>
                      ) : (
                        <span style={{
                          background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.2)",
                          color: "#ffaa00", padding: "0.15rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600
                        }}>?</span>
                      )}
                    </td>
                    <td style={{ ...tdBase, color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                      {job.importedAt ? new Date(job.importedAt).toLocaleDateString("en-GB") : nil}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
