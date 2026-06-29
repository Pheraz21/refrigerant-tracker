"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { db, UsageLog, SupplierReturnGroup, CrmJob, Bottle, BottleCategory } from "@/lib/db";
import {
  Briefcase, Search, ChevronDown, ChevronRight, Calendar, X,
  ExternalLink, Settings2, ArrowUpDown, ArrowUp, ArrowDown, Printer,
  Upload, RefreshCw, AlertTriangle, Camera
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { useTablePrefs } from "@/lib/useTablePrefs";
import { ColumnCustomizer } from "@/app/components/ColumnCustomizer";
import { DoubleScrollContainer } from "@/app/components/DoubleScrollContainer";

// ── CSV-import helpers (moved from /admin/all-jobs) ───────────────────────────
const EXACT_HEADERS: Record<string, string> = {
  "prefix":                  "prefix",
  "job no.":                 "jobNumber",
  "job no":                  "jobNumber",
  "job no (prefixed)":       "jobNumber",
  "job number (prefixed)":   "jobNumber",
  "job number":              "jobNumberUnprefixed",
  "job no (unprefixed)":     "jobNumberUnprefixed",
  "job number (unprefixed)": "jobNumberUnprefixed",
  "start date":              "startDate",
  "customer":                "customer",
  "site":                    "__site__",
  "title":                   "jobTitle",
  "postcode":                "sitePostcode",
  "category":                "category",
  "fault code":              "faultCode",
};

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
      jobNumber: "", jobNumberUnprefixed: "", prefix: "", customer: "", siteTitle: "", siteAddress: "",
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

interface PreviewState {
  newRows: Omit<CrmJob, "id" | "importedAt">[];
  skippedCount: number;
}

interface JobSummary {
  siteRef: string;
  siteName: string;
  siteAddress: string;
  customer: string;
  engineer: string;
  latestDate: string;
  logs: UsageLog[];
  newGasKg: number;
  reclaimKg: number;
  bottleCount: number;
  hwcns: any[];
  returnNotes: SupplierReturnGroup[];
  directReturnBottles: Bottle[];
}

const COLUMN_DEFS = [
  { key: "jobRef",   label: "Job No.",      required: true },
  { key: "site",     label: "Site"                         },
  { key: "customer", label: "Customer"                     },
  { key: "gasUsed",  label: "Gas Used"                     },
  { key: "reclaim",  label: "Reclaim"                      },
  { key: "bottles",  label: "Bottles"                      },
  { key: "decomPdf", label: "Decom PDF"                    },
  { key: "refPdf",   label: "Job Cylinder Report"           },
  { key: "hwcn",     label: "HWCN"                         },
] as const;

const RECOVERY_TYPES = new Set(["recovery", "waste", "reclaim"]);

function jobTypeFromPrefix(siteRef: string): string | null {
  const prefix = (siteRef || "").split(/[-\s_]/)[0].toUpperCase();
  if (prefix === "C") return "install";
  if (prefix === "S") return "service";
  if (prefix === "M") return "maintenance";
  return null;
}

type SortKey = "jobRef" | "site" | "customer" | "gasUsed" | "reclaim" | "bottles";

function groupJobEquipment(logs: UsageLog[]) {
  const grouped = new Map<string, {
    manufacturer: string; model: string; equipmentSerial: string;
    totalWeight: number; dates: string[]; engineers: Set<string>;
    actions: { log: UsageLog; eq: any }[];
  }>();
  logs.forEach(log => {
    const eqList: any[] = (log as any).equipmentDetails || [];
    eqList.forEach((eq: any) => {
      const mfr = eq.manufacturer || "";
      const mdl = eq.model || "";
      const sn = eq.serial || "";
      if (!mfr && !mdl && !sn) return;
      const key = sn ? `sn:${sn.toLowerCase()}` : `mm:${mfr.toLowerCase()}|${mdl.toLowerCase()}`;
      if (!grouped.has(key)) {
        grouped.set(key, { manufacturer: mfr, model: mdl, equipmentSerial: sn, totalWeight: 0, dates: [], engineers: new Set(), actions: [] });
      }
      const e = grouped.get(key)!;
      e.totalWeight += (parseFloat(String(eq.weight)) || log.weightUsed || 0);
      if (log.date) e.dates.push(log.date);
      if (log.engineer) e.engineers.add(log.engineer);
      e.actions.push({ log, eq });
    });
  });
  return Array.from(grouped.entries()).map(([key, e]) => ({
    key,
    manufacturer: e.manufacturer,
    model: e.model,
    equipmentSerial: e.equipmentSerial,
    totalWeight: e.totalWeight,
    serviceCount: e.dates.length,
    engineers: Array.from(e.engineers),
    firstDate: [...e.dates].sort()[0] || "",
    lastDate: [...e.dates].sort().reverse()[0] || "",
    actions: e.actions,
  }));
}

function groupJobBottles(logs: UsageLog[]) {
  const grouped = new Map<string, {
    serial: string; totalWeight: number; dates: string[];
    engineers: Set<string>; actions: UsageLog[];
  }>();
  logs.forEach(log => {
    const serial = log.serial || "unknown";
    if (!grouped.has(serial)) {
      grouped.set(serial, { serial, totalWeight: 0, dates: [], engineers: new Set(), actions: [] });
    }
    const g = grouped.get(serial)!;
    g.totalWeight += log.weightUsed || 0;
    if (log.date) g.dates.push(log.date);
    if (log.engineer) g.engineers.add(log.engineer);
    g.actions.push(log);
  });
  return Array.from(grouped.entries()).map(([key, g]) => ({
    key,
    serial: g.serial,
    totalWeight: g.totalWeight,
    useCount: g.actions.length,
    engineers: Array.from(g.engineers),
    firstDate: [...g.dates].sort()[0] || "",
    lastDate: [...g.dates].sort().reverse()[0] || "",
    actions: g.actions,
  }));
}

export default function RefrigerantJobsPage() {
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [hwcns, setHwcns] = useState<any[]>([]);
  const [decommissions, setDecommissions] = useState<any[]>([]);
  const [supplierReturnGroups, setSupplierReturnGroups] = useState<SupplierReturnGroup[]>([]);
  const [directReturns, setDirectReturns] = useState<Bottle[]>([]);
  const [crmMap, setCrmMap] = useState<Map<string, CrmJob>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "service" | "recovery">("all");
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [expandedJobTabs, setExpandedJobTabs] = useState<Record<string, "bottles" | "equipment">>({});
  const [expandedEqRows, setExpandedEqRows] = useState<Set<string>>(new Set());
  const toggleEqRow = (siteRef: string, eqKey: string) => {
    const k = `${siteRef}::${eqKey}`;
    setExpandedEqRows(prev => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next; });
  };
  const [bottleMap, setBottleMap] = useState<Map<string, { category: BottleCategory; gasType: string }>>(new Map());
  const [expandedBottleRows, setExpandedBottleRows] = useState<Set<string>>(new Set());
  const toggleBottleRow = (siteRef: string, bottleKey: string) => {
    const k = `${siteRef}::${bottleKey}`;
    setExpandedBottleRows(prev => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next; });
  };
  const [sortKey, setSortKey] = useState<SortKey>("jobRef");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [customizerOpen, setCustOpen] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<{ url: string; serial: string } | null>(null);

  // CSV import state (moved from /admin/all-jobs)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // UPRN-lookup state (moved from /admin/all-jobs)
  const [uprnProgress, setUprnProgress] = useState<{ done: number; total: number } | null>(null);
  const [uprnRunning, setUprnRunning] = useState(false);
  const [uprnError, setUprnError] = useState<string | null>(null);
  const uprnAbortRef = useRef(false);

  const { visibleCols, hidden, order, toggleCol, moveCol, reset } =
    useTablePrefs("jobs", COLUMN_DEFS.map(c => c.key));

  // Build the CRM lookup map from the siteRefs we actually need (much cheaper than fetching all 15k jobs).
  const loadCrmMap = async (logs: UsageLog[], decom: any[]) => {
    const refs = new Set<string>();
    logs.forEach(l => l.siteRef && refs.add(l.siteRef));
    decom.forEach(d => d.jobNumber && refs.add(d.jobNumber));
    if (!refs.size) { setCrmMap(new Map()); return; }
    const crmJobs = await db.getCrmJobsByNumbers(Array.from(refs));
    setCrmMap(new Map(crmJobs.map(j => [j.jobNumber, j])));
  };

  const load = async () => {
    setLoading(true);
    const [logs, h, decom, returnGroups, dirReturns] = await Promise.all([
      db.getAllUsageLogs(),
      db.getAllHWCNs(),
      db.getAllDecommissions(),
      db.getSupplierReturnGroups(),
      db.getDirectEngineerReturns(),
    ]);
    setUsageLogs(logs);
    setHwcns(h);
    setDecommissions(decom);
    setSupplierReturnGroups(returnGroups);
    setDirectReturns(dirReturns);
    const serials = [...new Set(logs.map((l: UsageLog) => l.serial).filter(Boolean))];
    if (serials.length) {
      const bottles = await db.getBottlesBySerials(serials);
      setBottleMap(new Map(bottles.map(b => [b.serial, { category: b.category, gasType: b.gasType || "" }])));
    }
    await loadCrmMap(logs, decom);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const jobs = useMemo<JobSummary[]>(() => {
    const grouped = new Map<string, UsageLog[]>();
    const directReturnMap = new Map(directReturns.map(b => [b.serial, b]));

    usageLogs.forEach(log => {
      const key = log.siteRef || "No Job Ref";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(log);
    });

    decommissions.forEach(d => {
      if (d.jobNumber && !grouped.has(d.jobNumber)) {
        grouped.set(d.jobNumber, []);
      }
    });

    return Array.from(grouped.entries()).map(([siteRef, logs]) => {
      const sortedByDate = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const first = sortedByDate[0];
      const firstDecom = decommissions.find(d => d.jobNumber === siteRef);
      const crm = crmMap.get(siteRef);
      const jobSerials = new Set(logs.map(l => l.serial));
      const relatedHwcns = hwcns.filter(h => jobSerials.has(h.serial));
      const relatedReturnNotes = supplierReturnGroups.filter(g =>
        g.serials.some(s => jobSerials.has(s))
      );
      const relatedDirectReturns = [...jobSerials]
        .filter(s => directReturnMap.has(s))
        .map(s => directReturnMap.get(s)!);
      const newGasKg = logs.filter(l => !RECOVERY_TYPES.has((l.jobType || "").toLowerCase())).reduce((s, l) => s + (l.weightUsed || 0), 0);
      const reclaimKg = logs.filter(l => RECOVERY_TYPES.has((l.jobType || "").toLowerCase())).reduce((s, l) => s + (l.weightUsed || 0), 0);
      return {
        siteRef,
        siteName: crm?.siteTitle || first?.siteName || firstDecom?.siteName || "Unknown Site",
        siteAddress: crm?.siteAddress || first?.siteAddress || firstDecom?.siteAddress || "",
        customer: crm?.customer || "",
        engineer: first?.engineer || firstDecom?.engineer || "—",
        latestDate: first?.date || firstDecom?.date || "",
        logs,
        newGasKg,
        reclaimKg,
        bottleCount: jobSerials.size,
        hwcns: relatedHwcns,
        returnNotes: relatedReturnNotes,
        directReturnBottles: relatedDirectReturns,
      };
    });
  }, [usageLogs, hwcns, decommissions, supplierReturnGroups, crmMap, directReturns]);

  const filtered = useMemo(() => {
    return jobs.filter(job => {
      const s = search.toLowerCase();
      const matchesSearch = !s ||
        job.siteRef.toLowerCase().includes(s) ||
        job.siteName.toLowerCase().includes(s) ||
        (job.customer || "").toLowerCase().includes(s) ||
        job.engineer.toLowerCase().includes(s);
      const jobDate = job.latestDate ? new Date(job.latestDate) : null;
      const matchesFrom = !dateFrom || (jobDate && jobDate >= new Date(dateFrom));
      const matchesTo = !dateTo || (jobDate && jobDate <= new Date(dateTo + "T23:59:59"));
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "service" && job.reclaimKg === 0) ||
        (categoryFilter === "recovery" && job.reclaimKg > 0);
      return matchesSearch && matchesFrom && matchesTo && matchesCategory;
    });
  }, [jobs, search, dateFrom, dateTo, categoryFilter]);

  const sortedJobs = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "jobRef":   av = a.siteRef;     bv = b.siteRef;     break;
        case "site":     av = (a.siteName || "").toLowerCase();  bv = (b.siteName || "").toLowerCase(); break;
        case "customer": av = (a.customer || "").toLowerCase();  bv = (b.customer || "").toLowerCase(); break;
        case "gasUsed":  av = a.newGasKg;    bv = b.newGasKg;    break;
        case "reclaim":  av = a.reclaimKg;   bv = b.reclaimKg;   break;
        case "bottles": av = a.bottleCount; bv = b.bottleCount; break;
        default:        return 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleExpand = (siteRef: string) => {
    setExpandedJobs(prev => {
      const n = new Set(prev);
      if (n.has(siteRef)) n.delete(siteRef);
      else n.add(siteRef);
      return n;
    });
  };

  // ── CSV import ─────────────────────────────────────────────────────────────
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
      const existingNos = new Set<string>();
      const allCrm = await db.getAllCrmJobs();
      allCrm.forEach(j => existingNos.add(j.jobNumber));
      const newRows = allParsed.filter(r => !existingNos.has(r.jobNumber));
      setPreview({ newRows, skippedCount: allParsed.length - newRows.length });
    } catch (err: any) {
      setImportError("Failed to parse file: " + err.message);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

  // ── UPRN lookup (operates on CRM jobs returned for the siteRefs we display) ─
  const uprnPending = useMemo(() => {
    const pending: CrmJob[] = [];
    crmMap.forEach(j => {
      if (!j.uprn && (j.siteAddress || j.sitePostcode)) pending.push(j);
    });
    return pending;
  }, [crmMap]);

  const runUprnLookup = async () => {
    if (!uprnPending.length) return;
    setUprnRunning(true);
    setUprnError(null);
    uprnAbortRef.current = false;
    setUprnProgress({ done: 0, total: uprnPending.length });

    try {
      const testRes = await fetch("/api/uprn", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: uprnPending[0].siteAddress, postcode: uprnPending[0].sitePostcode }),
      });
      const testJson = await testRes.json();
      if (testJson.error === "API key not configured") {
        setUprnError("OS Places API key is not configured. Add OS_PLACES_API_KEY to your .env.local file and restart the dev server.");
        setUprnRunning(false); setUprnProgress(null); return;
      }
    } catch {
      setUprnError("Could not reach the UPRN lookup service.");
      setUprnRunning(false); setUprnProgress(null); return;
    }

    let found = 0;
    for (let i = 0; i < uprnPending.length; i++) {
      if (uprnAbortRef.current) break;
      const job = uprnPending[i];
      try {
        const res = await fetch("/api/uprn", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: job.siteAddress, postcode: job.sitePostcode }),
        });
        const { uprn } = await res.json();
        if (uprn) {
          found++;
          await db.updateCrmJobUprn(job.id, uprn);
          setCrmMap(prev => {
            const next = new Map(prev);
            const cur = next.get(job.jobNumber);
            if (cur) next.set(job.jobNumber, { ...cur, uprn });
            return next;
          });
        }
      } catch { /* skip */ }
      setUprnProgress({ done: i + 1, total: uprnPending.length });
      if (i < uprnPending.length - 1) await new Promise(r => setTimeout(r, 110));
    }
    setUprnRunning(false); setUprnProgress(null);
    if (found > 0) await load();
  };

  const DECOM_PDF_STYLES = `
    @page { margin: 0; size: A4 landscape; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10mm; color: #333; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
    .logo-section { display: flex; gap: 15px; align-items: flex-end; }
    .company-info { font-size: 10px; line-height: 1.4; color: #555; }
    .report-info { text-align: right; }
    .report-title { font-size: 20px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; color: #1a202c; }
    .report-meta { font-size: 11px; color: #666; }
    .job-block { margin-bottom: 24px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
    .job-header { background: #f5f5f5; padding: 12px 16px; border-bottom: 1px solid #ddd; }
    .job-header h3 { font-size: 14px; margin-bottom: 4px; }
    .job-header p { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #fafafa; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #888; border-bottom: 1px solid #eee; }
    td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
    .total-row { font-weight: 700; background: #f9f9f9; }
    .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
    @media print { body { padding: 15px; } .job-block { break-inside: avoid; } }
  `;

  const COMPANY_HEADER = (title: string, meta: string) => `
    <div class="header">
      <div class="logo-section">
        <img src="/21-degrees-logo-reports.png" style="width:100px;height:auto" />
        <div class="company-info">
          <strong>21 Degrees Ltd</strong><br />
          Unit 10, Apollo Court, Monkton Business Park<br />
          Hebburn, Tyne &amp; Wear, NE31 2ES<br />
          Tel: 0191 495 7224
        </div>
      </div>
      <div class="report-info">
        <div class="report-title">${title}</div>
        <div class="report-meta">${meta}</div>
      </div>
    </div>
  `;

  const generateDecomPdfForJob = (siteRef: string) => {
    const jobRecords = decommissions.filter(r => r.jobNumber === siteRef);
    if (jobRecords.length === 0) {
      alert(`No decommissioned equipment found for job ${siteRef}`);
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const flatRows = jobRecords.flatMap(rec =>
      (rec.equipment || []).map((eq: any) => ({
        ...rec,
        eqManufacturer: eq.manufacturer,
        eqModel: eq.model,
        eqSerial: eq.serial,
        eqWeight: eq.weightRecovered,
      }))
    );

    const first = flatRows[0];
    const totalWeight = flatRows.reduce((sum, r) => sum + (r.eqWeight || 0), 0);
    const reportDate = new Date().toLocaleDateString("en-GB", { dateStyle: "long" });

    const html = `<!DOCTYPE html><html><head><title>Decommissioned Equipment — ${siteRef}</title>
      <style>${DECOM_PDF_STYLES}</style></head><body>
      ${COMPANY_HEADER("Decommissioned Equipment", `<div>Generated: ${reportDate}</div><div>Job: ${siteRef}</div>`)}
      <div class="job-block">
        <div class="job-header">
          <h3>${first?.jobNumber || siteRef} — ${first?.siteName || "Unknown Site"}</h3>
          <p>${[first?.siteAddress, first?.sitePostcode].filter(Boolean).join(", ") || "—"}</p>
        </div>
        <table><thead><tr>
          <th>Date</th><th>Gas</th><th>Engineer</th><th>Manufacturer</th><th>Model</th><th>Serial No.</th><th style="text-align:right">Weight Recovered</th>
        </tr></thead><tbody>
          ${flatRows.map(r => `<tr>
            <td style="white-space:nowrap">${r.date ? new Date(r.date).toLocaleDateString("en-GB") : "—"}</td>
            <td>${r.gasType || "—"}</td>
            <td>${r.engineer || "—"}</td>
            <td>${r.eqManufacturer || "—"}</td>
            <td>${r.eqModel || "—"}</td>
            <td style="font-family:monospace;font-weight:600">${r.eqSerial || "—"}</td>
            <td style="text-align:right">${(r.eqWeight || 0).toFixed(2)} kg</td>
          </tr>`).join("")}
          <tr class="total-row"><td colspan="6">Total Recovered</td><td style="text-align:right">${totalWeight.toFixed(2)} kg</td></tr>
        </tbody></table>
      </div>
      <div class="footer">21 Degrees F-Gas Tracker Pro | Official Audit Document | &copy; 2026 21 Degrees Ltd | ${flatRows.length} item(s) for job ${siteRef}</div>
      </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const printJobRefrigerantLog = async (job: JobSummary) => {
    const hasUsage = job.logs.length > 0;
    const jobDecomRecords = decommissions.filter(r => r.jobNumber === job.siteRef);
    const hasDecom = jobDecomRecords.length > 0;
    if (!hasUsage && !hasDecom) return;

    let gasType = (_: string) => "—";
    if (hasUsage) {
      const serials = [...new Set(job.logs.map(l => l.serial))];
      const btls = await db.getBottlesBySerials(serials);
      const btlMap = new Map(btls.map(b => [b.serial, b]));
      gasType = (serial: string) => btlMap.get(serial)?.gasType ?? "—";
    }

    const reportDate = new Date().toLocaleDateString("en-GB");
    const sortedLogs = [...job.logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalUsed = sortedLogs.reduce((s, l) => s + (l.weightUsed || 0), 0);
    const totalReclaim = sortedLogs.filter(l => RECOVERY_TYPES.has((l.jobType || "").toLowerCase())).reduce((s, l) => s + (l.weightUsed || 0), 0);
    const uniqueBottles = new Set(sortedLogs.map(l => l.serial)).size;

    const decomFlatRows = jobDecomRecords.flatMap((rec: any) =>
      (rec.equipment || []).map((eq: any) => ({
        date: rec.date, gasType: rec.gasType, engineer: rec.engineer,
        bottleSerial: rec.bottleSerial,
        eqManufacturer: eq.manufacturer, eqModel: eq.model,
        eqSerial: eq.serial, eqWeight: eq.weightRecovered,
      }))
    );
    const totalDecomWt = decomFlatRows.reduce((s: number, r: any) => s + (r.eqWeight || 0), 0);

    const THEAD = `<thead><tr>
      <th style="width:75px">Date</th><th style="width:105px">Bottle</th><th style="width:70px">Gas Type</th>
      <th>Engineer</th><th>Manufacturer</th><th>Model</th><th>Serial No.</th>
      <th style="width:70px">Type</th>
      <th style="width:70px;text-align:right">Qty (kg)</th>
      <th style="width:75px;text-align:right">Wt Before</th>
      <th style="width:75px;text-align:right">Wt After</th>
    </tr></thead>`;

    const usageRows = sortedLogs.map(log => {
      const isRecovery = RECOVERY_TYPES.has((log.jobType || "").toLowerCase());
      const displayJobType = isRecovery ? log.jobType : (jobTypeFromPrefix(log.siteRef || job.siteRef) || log.jobType || "—");
      const eq = (log.equipmentDetails || [])[0] || null;
      return `<tr>
        <td style="white-space:nowrap">${new Date(log.date).toLocaleDateString("en-GB")}</td>
        <td style="font-family:monospace;font-weight:600">${log.serial}</td>
        <td>${gasType(log.serial)}</td>
        <td>${log.engineer || "—"}</td>
        <td>${eq?.manufacturer || "—"}</td>
        <td>${eq?.model || "—"}</td>
        <td style="font-family:monospace;font-size:9px">${eq?.serial || "—"}</td>
        <td><span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:${isRecovery ? "#fff3cd" : "#d4edda"};color:${isRecovery ? "#856404" : "#155724"}">${displayJobType}</span></td>
        <td style="text-align:right;font-weight:600;color:${isRecovery ? "#856404" : "#155724"}">${(log.weightUsed || 0).toFixed(2)}</td>
        <td style="text-align:right">${log.weightBefore?.toFixed(2) ?? "—"}</td>
        <td style="text-align:right">${log.weightAfter?.toFixed(2) ?? "—"}</td>
      </tr>`;
    }).join("");

    const decomRows = decomFlatRows.map((r: any) => `<tr>
      <td style="white-space:nowrap">${r.date ? new Date(r.date).toLocaleDateString("en-GB") : "—"}</td>
      <td style="font-family:monospace;font-weight:600">${r.bottleSerial || "—"}</td>
      <td>${r.gasType || "—"}</td>
      <td>${r.engineer || "—"}</td>
      <td>${r.eqManufacturer || "—"}</td>
      <td>${r.eqModel || "—"}</td>
      <td style="font-family:monospace;font-weight:600">${r.eqSerial || "—"}</td>
      <td><span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:#fde8ec;color:#9b1c1c">Decom</span></td>
      <td style="text-align:right;font-weight:600">${(r.eqWeight || 0).toFixed(2)}</td>
      <td>—</td><td>—</td>
    </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><style>
      @page { margin: 0; size: A4 landscape; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 10mm; color: #333; line-height: 1.4; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
      .logo-section { display: flex; gap: 15px; align-items: flex-end; }
      .company-info { font-size: 10px; line-height: 1.4; color: #555; }
      .report-info { text-align: right; }
      .report-title { font-size: 22px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; color: #1a202c; }
      .report-meta { font-size: 11px; color: #666; }
      .summary-table { width: 100%; margin-bottom: 20px; border-collapse: separate; border-spacing: 0; background: #f9fafb; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
      .summary-cell { padding: 12px 15px; border-right: 1px solid #e2e8f0; vertical-align: top; }
      .summary-cell:last-child { border-right: none; }
      .summary-label { font-size: 8px; color: #718096; text-transform: uppercase; margin-bottom: 4px; font-weight: 700; letter-spacing: 0.1em; }
      .summary-value { font-size: 13px; font-weight: bold; color: #1a202c; }
      .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #2d3748; border-left: 4px solid #a3e635; padding-left: 10px; margin: 20px 0 8px; }
      table { width: 100%; border-collapse: collapse; }
      table th, table td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: middle; font-size: 10px; }
      table th { background: #f8f9fa; font-weight: bold; text-transform: uppercase; color: #4a5568; font-size: 8px; letter-spacing: 0.05em; border-bottom: 2px solid #cbd5e0; }
      .total-row { font-weight: 700; background: #f9fafb; }
      .footer { margin-top: 20px; font-size: 8px; color: #a0aec0; text-align: center; border-top: 1px solid #edf2f7; padding-top: 10px; }
    </style></head><body>
    <div class="header">
      <div class="logo-section">
        <img src="/21-degrees-logo-reports.png" style="width: 100px; height: auto;" />
        <div class="company-info">
          <strong>21 Degrees Ltd</strong><br />
          Unit 10, Apollo Court, Monkton Business Park<br />
          Hebburn, Tyne &amp; Wear, NE31 2ES<br />
          Tel: 0191 495 7224
        </div>
      </div>
      <div class="report-info">
        <div class="report-title">Full Job Report</div>
        <div class="report-meta"><div>Generated: ${reportDate}</div><div>Job: ${job.siteRef}</div>${job.siteName && job.siteName !== "Unknown Site" ? `<div>${job.siteName}</div>` : ""}</div>
      </div>
    </div>
    <table class="summary-table"><tr>
      <td class="summary-cell"><div class="summary-label">Job Reference</div><div class="summary-value">${job.siteRef}</div></td>
      ${job.customer ? `<td class="summary-cell"><div class="summary-label">Customer</div><div class="summary-value">${job.customer}</div></td>` : ""}
      ${job.siteName && job.siteName !== "Unknown Site" ? `<td class="summary-cell"><div class="summary-label">Site</div><div class="summary-value">${job.siteName}</div></td>` : ""}
      ${job.siteAddress ? `<td class="summary-cell"><div class="summary-label">Address</div><div class="summary-value" style="font-size:11px">${job.siteAddress}</div></td>` : ""}
      ${hasUsage ? `<td class="summary-cell"><div class="summary-label">Cylinders Used</div><div class="summary-value">${uniqueBottles}</div></td>
      <td class="summary-cell"><div class="summary-label">Gas Dispensed</div><div class="summary-value">${(totalUsed - totalReclaim).toFixed(2)} kg</div></td>
      <td class="summary-cell"><div class="summary-label">Gas Reclaimed</div><div class="summary-value">${totalReclaim.toFixed(2)} kg</div></td>` : ""}
      ${hasDecom ? `<td class="summary-cell"><div class="summary-label">Decom Items</div><div class="summary-value">${decomFlatRows.length} (${totalDecomWt.toFixed(2)} kg)</div></td>` : ""}
    </tr></table>
    ${hasUsage ? `
    <div class="section-title">Refrigerant Usage</div>
    <table>${THEAD}<tbody>
      ${usageRows}
      <tr class="total-row"><td colspan="8" style="text-align:right">Total</td>
        <td style="text-align:right">${totalUsed.toFixed(2)}</td>
        <td colspan="2"></td></tr>
    </tbody></table>` : ""}
    ${hasDecom ? `
    <div class="section-title">Decommissioned Equipment</div>
    <table>${THEAD}<tbody>
      ${decomRows}
      <tr class="total-row"><td colspan="8" style="text-align:right">Total Recovered</td>
        <td style="text-align:right">${totalDecomWt.toFixed(2)}</td>
        <td colspan="2"></td></tr>
    </tbody></table>` : ""}
    <div class="footer">21 Degrees F-Gas Tracker Pro | Official Audit Document | &copy; 2026 21 Degrees Ltd | Job: ${job.siteRef}</div>
    </body></html>`;

    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
    setTimeout(() => { win?.print(); }, 500);
  };

  const hasFilters = !!(search || dateFrom || dateTo || categoryFilter !== "all");

  const thBase: React.CSSProperties = {
    padding: "0.7rem 1rem", textAlign: "left", fontSize: "0.72rem",
    color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap",
  };
  const tdBase: React.CSSProperties = { padding: "0.75rem 1rem", fontSize: "0.85rem" };

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{ opacity: 0.4, marginLeft: "0.3rem", verticalAlign: "middle" }} />;
    return sortDir === "asc"
      ? <ArrowUp size={12} style={{ color: "#00e5ff", marginLeft: "0.3rem", verticalAlign: "middle" }} />
      : <ArrowDown size={12} style={{ color: "#00e5ff", marginLeft: "0.3rem", verticalAlign: "middle" }} />;
  }

  function renderHeader(key: string) {
    const s: React.CSSProperties = { ...thBase, cursor: "pointer" };
    const n: React.CSSProperties = { ...thBase, cursor: "default" };
    switch (key) {
      case "jobRef":   return <th key={key} style={s} onClick={() => handleSort("jobRef")}>Job No. <SortIcon col="jobRef" /></th>;
      case "site":     return <th key={key} style={s} onClick={() => handleSort("site")}>Site <SortIcon col="site" /></th>;
      case "customer": return <th key={key} style={s} onClick={() => handleSort("customer")}>Customer <SortIcon col="customer" /></th>;
      case "gasUsed":  return <th key={key} style={{ ...s, textAlign: "right" }} onClick={() => handleSort("gasUsed")}>Gas Used <SortIcon col="gasUsed" /></th>;
      case "reclaim":  return <th key={key} style={{ ...s, textAlign: "right" }} onClick={() => handleSort("reclaim")}>Reclaim <SortIcon col="reclaim" /></th>;
      case "bottles":  return <th key={key} style={{ ...s, textAlign: "center" }} onClick={() => handleSort("bottles")}>Bottles <SortIcon col="bottles" /></th>;
      case "decomPdf": return <th key={key} style={{ ...n, textAlign: "center" }}>Decom PDF</th>;
      case "refPdf":   return <th key={key} style={{ ...n, textAlign: "center" }}>Job Cylinder Report</th>;
      case "hwcn":     return <th key={key} style={n}>HWCN</th>;
      default:         return null;
    }
  }

  function renderCell(key: string, job: JobSummary) {
    switch (key) {
      case "jobRef":
        return (
          <td key={key} style={{ ...tdBase, fontFamily: "var(--font-geist-mono)", fontWeight: 600 }}>
            <Link
              href={`/admin/jobs/${encodeURIComponent(job.siteRef)}`}
              onClick={e => e.stopPropagation()}
              style={{ color: "#00e5ff", textDecoration: "underline", textDecorationColor: "rgba(0,229,255,0.4)", fontWeight: 700 }}
            >
              {job.siteRef}
            </Link>
          </td>
        );
      case "site":
        return <td key={key} style={{ ...tdBase, color: job.siteName === "Unknown Site" ? "var(--text-muted)" : "rgba(255,255,255,0.85)" }}>{job.siteName}</td>;
      case "customer":
        return <td key={key} style={{ ...tdBase, color: job.customer ? "rgba(255,255,255,0.85)" : "var(--text-muted)" }}>{job.customer || "—"}</td>;
      case "gasUsed":
        return <td key={key} style={{ ...tdBase, textAlign: "right", fontWeight: 600, color: job.newGasKg > 0 ? "#22c55e" : "var(--text-muted)" }}>{job.newGasKg > 0 ? `${job.newGasKg.toFixed(2)} kg` : "—"}</td>;
      case "reclaim":
        return <td key={key} style={{ ...tdBase, textAlign: "right", fontWeight: 600, color: job.reclaimKg > 0 ? "#ffaa00" : "var(--text-muted)" }}>{job.reclaimKg > 0 ? `${job.reclaimKg.toFixed(2)} kg` : "—"}</td>;
      case "bottles":
        return <td key={key} style={{ ...tdBase, textAlign: "center" }}><span style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 600 }}>{job.bottleCount}</span></td>;
      case "decomPdf": {
        const hasDecom = decommissions.some(r => r.jobNumber === job.siteRef);
        return (
          <td key={key} style={{ ...tdBase, textAlign: "center" }}>
            {hasDecom ? (
              <button
                onClick={e => { e.stopPropagation(); generateDecomPdfForJob(job.siteRef); }}
                title={`Decommissioned Equipment PDF for ${job.siteRef}`}
                style={{ background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.25)", color: "#ffaa00", padding: "0.35rem 0.6rem", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", fontWeight: 600 }}
              >
                <Printer size={13} /> PDF
              </button>
            ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
          </td>
        );
      }
      case "refPdf":
        return (
          <td key={key} style={{ ...tdBase, textAlign: "center" }}>
            {job.logs.length > 0 ? (
              <button
                onClick={e => { e.stopPropagation(); printJobRefrigerantLog(job); }}
                title={`Used Refrigerant Log PDF for ${job.siteRef}`}
                style={{ background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.25)", color: "#ffaa00", padding: "0.35rem 0.6rem", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", fontWeight: 600 }}
              >
                <Printer size={13} /> PDF
              </button>
            ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
          </td>
        );
      case "hwcn": {
        const hasAny = job.hwcns.length > 0 || job.returnNotes.length > 0 || job.directReturnBottles.length > 0;
        return (
          <td key={key} style={tdBase}>
            {hasAny ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {job.hwcns.map(h => (
                  <Link
                    key={h.id}
                    href={`/admin/hwcn/${encodeURIComponent(h.id)}`}
                    onClick={e => e.stopPropagation()}
                    title={`Internal HWCN: ${h.id}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00e5ff", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}
                  >
                    <ExternalLink size={11} /> {h.id?.slice(0, 8) || "HWCN"}
                  </Link>
                ))}
                {job.returnNotes.map(g => (
                  <Link
                    key={g.hwcnNumber}
                    href={`/admin/supplier-hwcn/${encodeURIComponent(g.hwcnNumber)}`}
                    onClick={e => e.stopPropagation()}
                    title={`Supplier Return Note: ${g.hwcnNumber}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}
                  >
                    <ExternalLink size={11} /> {g.hwcnNumber}
                  </Link>
                ))}
                {job.directReturnBottles.map(b => (
                  <button
                    key={b.serial}
                    onClick={e => { e.stopPropagation(); setViewPhoto({ url: b.supplierHwcnPhotoUrl!, serial: b.serial }); }}
                    title={`Direct engineer return to supplier — view HWCN photo for ${b.serial}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.25)", color: "#ff6b6b", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    <Camera size={11} /> {b.serial}
                  </button>
                ))}
              </div>
            ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
          </td>
        );
      }
      default:
        return null;
    }
  }

  if (loading) return <div style={{ padding: "2rem", color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Briefcase size={28} /> Refrigerant Jobs
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Refrigerant usage grouped by job reference — gas dispensed, recovered and bottles used per job
        </p>
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "flex-end",
        padding: "1.25rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ flex: "1 1 250px" }}>
          <label style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>Search</label>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Job ref, site, engineer..."
              style={{ width: "100%", padding: "0.65rem 0.75rem 0.65rem 2.25rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        <div style={{ flex: "0 1 160px" }}>
          <label style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
            <Calendar size={12} style={{ marginRight: "0.25rem", verticalAlign: "middle" }} />From
          </label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ width: "100%", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: "0.85rem", colorScheme: "dark" }} />
        </div>

        <div style={{ flex: "0 1 160px" }}>
          <label style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
            <Calendar size={12} style={{ marginRight: "0.25rem", verticalAlign: "middle" }} />To
          </label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ width: "100%", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: "0.85rem", colorScheme: "dark" }} />
        </div>

        <div style={{ flex: "0 1 200px" }}>
          <label style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>Category</label>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as "all" | "service" | "recovery")}
            style={{ width: "100%", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,20,30,0.9)", color: "#fff", fontSize: "0.85rem" }}>
            <option value="all">All Jobs</option>
            <option value="service">Service Only</option>
            <option value="recovery">Recovery / Waste</option>
          </select>
        </div>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setCategoryFilter("all"); }}
            style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", alignSelf: "flex-end" }}
          >
            <X size={14} /> Clear
          </button>
        )}

        <label
          style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(0,229,255,0.25)", background: "rgba(0,229,255,0.08)", color: "#00e5ff", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", alignSelf: "flex-end", fontWeight: 600 }}
        >
          <Upload size={15} /> Import CSV
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
        </label>

        {uprnPending.length > 0 && (
          <button
            onClick={runUprnLookup}
            disabled={uprnRunning}
            style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,170,0,0.25)", background: uprnRunning ? "rgba(255,170,0,0.04)" : "rgba(255,170,0,0.08)", color: "#ffaa00", cursor: uprnRunning ? "default" : "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", alignSelf: "flex-end", fontWeight: 600 }}
          >
            <RefreshCw size={15} />
            {uprnRunning
              ? `Looking up UPRNs (${uprnProgress?.done ?? 0} / ${uprnProgress?.total ?? 0})…`
              : `Find UPRNs (${uprnPending.length.toLocaleString()} pending)`}
          </button>
        )}

        {uprnRunning && (
          <button
            onClick={() => { uprnAbortRef.current = true; }}
            style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,51,102,0.25)", background: "rgba(255,51,102,0.08)", color: "#ff3366", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", alignSelf: "flex-end" }}
          >
            <X size={14} /> Stop
          </button>
        )}

        <button
          onClick={() => setCustOpen(true)}
          style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", alignSelf: "flex-end" }}
        >
          <Settings2 size={15} /> Columns
        </button>
      </div>

      {(importError || importResult || uprnError) && (
        <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {importError && (
            <div style={{ padding: "0.7rem 1rem", borderRadius: "8px", background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.25)", color: "#ff3366", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={14} /> {importError}
            </div>
          )}
          {importResult && (
            <div style={{ padding: "0.7rem 1rem", borderRadius: "8px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", fontSize: "0.85rem" }}>
              {importResult}
            </div>
          )}
          {uprnError && (
            <div style={{ padding: "0.7rem 1rem", borderRadius: "8px", background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.25)", color: "#ff3366", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={14} /> {uprnError}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: "1rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
        {sortedJobs.length} job{sortedJobs.length !== 1 ? "s" : ""}
        {hasFilters && <span style={{ color: "#00e5ff" }}> (filtered)</span>}
      </div>

      {sortedJobs.length === 0 ? (
        <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
            <Briefcase size={48} style={{ marginBottom: "1rem", opacity: 0.2 }} />
            <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>No Jobs Found</p>
            <p style={{ fontSize: "0.85rem" }}>
              {hasFilters ? "Try adjusting your filters." : "Usage logs with a job reference will appear here."}
            </p>
          </div>
        </div>
      ) : (
        <DoubleScrollContainer>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th style={{ ...thBase, width: "2rem", cursor: "default" }}></th>
                {visibleCols.map(k => renderHeader(k))}
              </tr>
            </thead>
            <tbody>
              {sortedJobs.map((job, idx) => {
                const isExpanded = expandedJobs.has(job.siteRef);
                return (
                  <React.Fragment key={job.siteRef}>
                    <tr
                      onClick={() => toggleExpand(job.siteRef)}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                        cursor: "pointer",
                      }}
                    >
                      <td style={{ ...tdBase, color: "rgba(255,255,255,0.3)", paddingLeft: "1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <Link
                            href={`/admin/jobs/${job.siteRef}`}
                            onClick={e => e.stopPropagation()}
                            title={`Open job ${job.siteRef} detail`}
                            style={{ color: "rgba(255,255,255,0.3)", display: "inline-flex", alignItems: "center" }}
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      </td>
                      {visibleCols.map(k => renderCell(k, job))}
                    </tr>
                    {isExpanded && (() => {
                      const activeTab = expandedJobTabs[job.siteRef] || "bottles";
                      const eqGroups = groupJobEquipment(job.logs);
                      const bottleGroupCount = new Set(job.logs.map(l => l.serial)).size;
                      return (
                      <tr style={{ background: "rgba(0,229,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <td colSpan={visibleCols.length + 1} style={{ padding: "0 0 0.75rem 3rem" }}>
                          {/* Tab bar */}
                          <div style={{ display: "flex", gap: "0.25rem", padding: "0.5rem 0 0.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "0" }}>
                            {(["bottles", "equipment"] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={e => { e.stopPropagation(); setExpandedJobTabs(prev => ({ ...prev, [job.siteRef]: tab })); }}
                                style={{ padding: "0.2rem 0.7rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", border: "1px solid", transition: "all 0.15s", background: activeTab === tab ? "rgba(0,229,255,0.12)" : "transparent", borderColor: activeTab === tab ? "rgba(0,229,255,0.35)" : "rgba(255,255,255,0.1)", color: activeTab === tab ? "#00e5ff" : "rgba(255,255,255,0.4)" }}
                              >
                                {tab === "bottles" ? "By Bottle" : "By Equipment"}
                                {tab === "bottles" && bottleGroupCount > 0 && (
                                  <span style={{ marginLeft: "0.3rem", background: activeTab === tab ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.08)", padding: "0.05rem 0.3rem", borderRadius: "3px", fontSize: "0.68rem" }}>{bottleGroupCount}</span>
                                )}
                                {tab === "equipment" && eqGroups.length > 0 && (
                                  <span style={{ marginLeft: "0.3rem", background: activeTab === tab ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.08)", padding: "0.05rem 0.3rem", borderRadius: "3px", fontSize: "0.68rem" }}>{eqGroups.length}</span>
                                )}
                              </button>
                            ))}
                          </div>

                          {/* By Bottle tab */}
                          {activeTab === "bottles" && (() => {
                            const bottleGroups = groupJobBottles(job.logs);
                            return job.logs.length === 0 ? (
                              <div style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
                                No gas log entries for this job — decommissioned equipment only.
                              </div>
                            ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                              <thead>
                                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                  <th style={{ ...thBase, fontSize: "0.65rem" }}>Serial</th>
                                  <th style={{ ...thBase, fontSize: "0.65rem" }}>Type</th>
                                  <th style={{ ...thBase, fontSize: "0.65rem" }}>Gas Type</th>
                                  <th style={{ ...thBase, fontSize: "0.65rem", textAlign: "center" }}>Uses</th>
                                  <th style={{ ...thBase, fontSize: "0.65rem" }}>First Use</th>
                                  <th style={{ ...thBase, fontSize: "0.65rem" }}>Last Use</th>
                                  <th style={{ ...thBase, fontSize: "0.65rem", textAlign: "right" }}>Total Gas</th>
                                  <th style={{ ...thBase, fontSize: "0.65rem" }}>Engineers</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bottleGroups.map((bottle) => {
                                  const isBotExp = expandedBottleRows.has(`${job.siteRef}::${bottle.key}`);
                                  return (
                                    <React.Fragment key={bottle.key}>
                                      <tr
                                        onClick={e => { e.stopPropagation(); toggleBottleRow(job.siteRef, bottle.key); }}
                                        style={{ borderBottom: isBotExp ? "none" : "1px solid rgba(255,255,255,0.03)", cursor: "pointer", background: isBotExp ? "rgba(0,229,255,0.04)" : "transparent" }}
                                      >
                                        <td style={{ padding: "0.5rem 1rem", fontFamily: "var(--font-geist-mono)", color: "#00e5ff", fontWeight: 600 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                            {isBotExp ? <ChevronDown size={12} style={{ color: "rgba(0,229,255,0.6)", flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />}
                                            <Link href={`/admin/bottles/${bottle.serial}`} onClick={e => e.stopPropagation()} style={{ color: "#00e5ff", textDecoration: "none" }}>
                                              {bottle.serial}
                                            </Link>
                                          </div>
                                        </td>
                                        {(() => {
                                          const bInfo = bottleMap.get(bottle.serial);
                                          const cat = bInfo?.category;
                                          const catColor = cat === "new" ? "#22c55e" : cat === "reclaim" ? "#ffaa00" : cat === "nitrogen" ? "#3b82f6" : "rgba(255,255,255,0.3)";
                                          const catBg = cat === "new" ? "rgba(34,197,94,0.1)" : cat === "reclaim" ? "rgba(255,170,0,0.1)" : cat === "nitrogen" ? "rgba(59,130,246,0.1)" : "transparent";
                                          return (<>
                                            <td style={{ padding: "0.5rem 1rem" }}>
                                              {cat ? <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "3px", background: catBg, color: catColor, textTransform: "capitalize" }}>{cat}</span> : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                                            </td>
                                            <td style={{ padding: "0.5rem 1rem", color: "rgba(255,255,255,0.6)", fontSize: "0.78rem" }}>
                                              {bInfo?.gasType || <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                                            </td>
                                          </>);
                                        })()}
                                        <td style={{ padding: "0.5rem 1rem", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                                          {bottle.useCount}
                                        </td>
                                        <td style={{ padding: "0.5rem 1rem", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>
                                          {bottle.firstDate ? new Date(bottle.firstDate).toLocaleDateString("en-GB") : "—"}
                                        </td>
                                        <td style={{ padding: "0.5rem 1rem", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>
                                          {bottle.lastDate ? new Date(bottle.lastDate).toLocaleDateString("en-GB") : "—"}
                                        </td>
                                        <td style={{ padding: "0.5rem 1rem", textAlign: "right", fontWeight: 600, color: bottle.totalWeight > 0 ? "#22c55e" : "rgba(255,255,255,0.3)" }}>
                                          {bottle.totalWeight > 0 ? `${bottle.totalWeight.toFixed(2)} kg` : "—"}
                                        </td>
                                        <td style={{ padding: "0.5rem 1rem", color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>
                                          {bottle.engineers.join(", ") || "—"}
                                        </td>
                                      </tr>
                                      {isBotExp && (
                                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.15)" }}>
                                          <td colSpan={8} style={{ padding: "0 1rem 0.75rem 3.5rem" }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                                              <thead>
                                                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                                                  <th style={{ ...thBase, fontSize: "0.62rem" }}>Date</th>
                                                  <th style={{ ...thBase, fontSize: "0.62rem" }}>Job Type</th>
                                                  <th style={{ ...thBase, fontSize: "0.62rem", textAlign: "right" }}>Qty Used</th>
                                                  <th style={{ ...thBase, fontSize: "0.62rem" }}>Before → After</th>
                                                  <th style={{ ...thBase, fontSize: "0.62rem" }}>Equipment</th>
                                                  <th style={{ ...thBase, fontSize: "0.62rem" }}>HWCNs</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {bottle.actions.map(log => {
                                                  const logHwcn = hwcns.find(h => h.serial === log.serial);
                                                  const logReturnNote = supplierReturnGroups.find(g => g.serials.includes(log.serial));
                                                  const logDirectReturn = directReturns.find(b => b.serial === log.serial && b.supplierHwcnPhotoUrl);
                                                  const rawJobType = (log.jobType || "").toLowerCase();
                                                  const isRecovery = RECOVERY_TYPES.has(rawJobType);
                                                  const displayJobType = isRecovery
                                                    ? log.jobType
                                                    : (jobTypeFromPrefix(log.siteRef || job.siteRef) || log.jobType || "—");
                                                  const eqList: any[] = (log as any).equipmentDetails || [];
                                                  return (
                                                    <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                                                      <td style={{ padding: "0.35rem 0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                        {log.date ? new Date(log.date).toLocaleDateString("en-GB") : "—"}
                                                      </td>
                                                      <td style={{ padding: "0.35rem 0.75rem" }}>
                                                        <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "3px", background: isRecovery ? "rgba(255,170,0,0.1)" : "rgba(34,197,94,0.1)", color: isRecovery ? "#ffaa00" : "#22c55e", textTransform: "capitalize" }}>
                                                          {displayJobType}
                                                        </span>
                                                      </td>
                                                      <td style={{ padding: "0.35rem 0.75rem", textAlign: "right", fontWeight: 600, color: isRecovery ? "#ffaa00" : "#22c55e" }}>
                                                        {log.weightUsed?.toFixed(2) || "—"} kg
                                                      </td>
                                                      <td style={{ padding: "0.35rem 0.75rem", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-geist-mono)", fontSize: "0.75rem" }}>
                                                        {log.weightBefore?.toFixed(2) ?? "?"} → {log.weightAfter?.toFixed(2) ?? "?"}
                                                      </td>
                                                      <td style={{ padding: "0.35rem 0.75rem", color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
                                                        {eqList.length === 0 ? <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span> : eqList.map((eq: any, ei: number) => (
                                                          <span key={ei} style={{ display: "inline-block", marginRight: "0.4rem", whiteSpace: "nowrap" }}>
                                                            {[eq.manufacturer, eq.model].filter(Boolean).join(" ")}
                                                            {eq.serial && <span style={{ fontFamily: "var(--font-geist-mono)", color: "#00e5ff", marginLeft: "0.3rem" }}>({eq.serial})</span>}
                                                          </span>
                                                        ))}
                                                      </td>
                                                      <td style={{ padding: "0.35rem 0.75rem" }}>
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                                                          {logHwcn && (
                                                            <Link href={`/admin/hwcn/${encodeURIComponent(logHwcn.id)}`} title="Internal HWCN" style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00e5ff", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 600, textDecoration: "none" }}>
                                                              <ExternalLink size={10} /> {logHwcn.id?.slice(0, 8) || "HWCN"}
                                                            </Link>
                                                          )}
                                                          {logReturnNote && (
                                                            <Link href={`/admin/supplier-hwcn/${encodeURIComponent(logReturnNote.hwcnNumber)}`} title={`Return note: ${logReturnNote.hwcnNumber}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 600, textDecoration: "none" }}>
                                                              <ExternalLink size={10} /> {logReturnNote.hwcnNumber}
                                                            </Link>
                                                          )}
                                                          {logDirectReturn && (
                                                            <button onClick={e => { e.stopPropagation(); setViewPhoto({ url: logDirectReturn.supplierHwcnPhotoUrl!, serial: logDirectReturn.serial }); }} title="Direct return — view HWCN photo" style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.25)", color: "#ff6b6b", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>
                                                              <Camera size={10} /> Direct Return
                                                            </button>
                                                          )}
                                                          {!logHwcn && !logReturnNote && !logDirectReturn && <span style={{ color: "var(--text-muted)" }}>—</span>}
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                            );
                          })()}

                          {/* By Equipment tab */}
                          {activeTab === "equipment" && (
                          eqGroups.length === 0 ? (
                            <div style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
                              No equipment details recorded for this job.
                            </div>
                          ) : (
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                            <thead>
                              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Serial No.</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Manufacturer</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Model</th>
                                <th style={{ ...thBase, fontSize: "0.65rem", textAlign: "center" }}>Services</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>First Service</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Last Service</th>
                                <th style={{ ...thBase, fontSize: "0.65rem", textAlign: "right" }}>Total Gas</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Engineers</th>
                              </tr>
                            </thead>
                            <tbody>
                              {eqGroups.map((eq) => {
                                const isEqExp = expandedEqRows.has(`${job.siteRef}::${eq.key}`);
                                return (
                                  <React.Fragment key={eq.key}>
                                    <tr
                                      onClick={e => { e.stopPropagation(); toggleEqRow(job.siteRef, eq.key); }}
                                      style={{ borderBottom: isEqExp ? "none" : "1px solid rgba(255,255,255,0.03)", cursor: "pointer", background: isEqExp ? "rgba(0,229,255,0.04)" : "transparent" }}
                                    >
                                      <td style={{ padding: "0.5rem 1rem", fontFamily: "var(--font-geist-mono)", color: eq.equipmentSerial ? "#00e5ff" : "rgba(255,255,255,0.3)", fontWeight: eq.equipmentSerial ? 600 : 400 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                          {isEqExp ? <ChevronDown size={12} style={{ color: "rgba(0,229,255,0.6)", flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />}
                                          {eq.equipmentSerial || <span style={{ fontStyle: "italic" }}>No serial</span>}
                                        </div>
                                      </td>
                                      <td style={{ padding: "0.5rem 1rem", color: "rgba(255,255,255,0.75)" }}>
                                        {eq.manufacturer || <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>}
                                      </td>
                                      <td style={{ padding: "0.5rem 1rem", color: "rgba(255,255,255,0.75)" }}>
                                        {eq.model || <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>}
                                      </td>
                                      <td style={{ padding: "0.5rem 1rem", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                                        {eq.serviceCount}
                                      </td>
                                      <td style={{ padding: "0.5rem 1rem", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>
                                        {eq.firstDate ? new Date(eq.firstDate).toLocaleDateString("en-GB") : "—"}
                                      </td>
                                      <td style={{ padding: "0.5rem 1rem", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>
                                        {eq.lastDate ? new Date(eq.lastDate).toLocaleDateString("en-GB") : "—"}
                                      </td>
                                      <td style={{ padding: "0.5rem 1rem", textAlign: "right", fontWeight: 600, color: eq.totalWeight > 0 ? "#22c55e" : "rgba(255,255,255,0.3)" }}>
                                        {eq.totalWeight > 0 ? `${eq.totalWeight.toFixed(2)} kg` : "—"}
                                      </td>
                                      <td style={{ padding: "0.5rem 1rem", color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>
                                        {eq.engineers.join(", ") || "—"}
                                      </td>
                                    </tr>
                                    {isEqExp && (
                                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.15)" }}>
                                        <td colSpan={8} style={{ padding: "0 1rem 0.75rem 3.5rem" }}>
                                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                                            <thead>
                                              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                                                <th style={{ ...thBase, fontSize: "0.62rem" }}>Bottle</th>
                                                <th style={{ ...thBase, fontSize: "0.62rem" }}>Type</th>
                                                <th style={{ ...thBase, fontSize: "0.62rem" }}>Gas Type</th>
                                                <th style={{ ...thBase, fontSize: "0.62rem" }}>Date</th>
                                                <th style={{ ...thBase, fontSize: "0.62rem" }}>Job Type</th>
                                                <th style={{ ...thBase, fontSize: "0.62rem", textAlign: "right" }}>Qty</th>
                                                <th style={{ ...thBase, fontSize: "0.62rem" }}>Before → After</th>
                                                <th style={{ ...thBase, fontSize: "0.62rem" }}>HWCNs</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {eq.actions.map((action, ai) => {
                                                const { log: aLog, eq: eqDetail } = action;
                                                const aHwcn = hwcns.find(h => h.serial === aLog.serial);
                                                const aReturn = supplierReturnGroups.find(g => g.serials.includes(aLog.serial));
                                                const aDirect = directReturns.find(b => b.serial === aLog.serial && b.supplierHwcnPhotoUrl);
                                                const rawType = (aLog.jobType || "").toLowerCase();
                                                const isRec = RECOVERY_TYPES.has(rawType);
                                                const dispType = isRec ? aLog.jobType : (jobTypeFromPrefix(aLog.siteRef || job.siteRef) || aLog.jobType || "—");
                                                return (
                                                  <tr key={ai} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                                                    <td style={{ padding: "0.35rem 0.75rem", fontFamily: "var(--font-geist-mono)", color: "#00e5ff", fontWeight: 600 }}>
                                                      <Link href={`/admin/bottles/${aLog.serial}`} style={{ color: "#00e5ff", textDecoration: "none" }}>{aLog.serial}</Link>
                                                    </td>
                                                    {(() => {
                                                      const bInfo = bottleMap.get(aLog.serial);
                                                      const cat = bInfo?.category;
                                                      const catColor = cat === "new" ? "#22c55e" : cat === "reclaim" ? "#ffaa00" : cat === "nitrogen" ? "#3b82f6" : "rgba(255,255,255,0.3)";
                                                      const catBg = cat === "new" ? "rgba(34,197,94,0.1)" : cat === "reclaim" ? "rgba(255,170,0,0.1)" : cat === "nitrogen" ? "rgba(59,130,246,0.1)" : "transparent";
                                                      return (<>
                                                        <td style={{ padding: "0.35rem 0.75rem" }}>
                                                          {cat ? <span style={{ fontSize: "0.63rem", fontWeight: 700, padding: "0.1rem 0.35rem", borderRadius: "3px", background: catBg, color: catColor, textTransform: "capitalize" }}>{cat}</span> : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                                                        </td>
                                                        <td style={{ padding: "0.35rem 0.75rem", color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>
                                                          {bInfo?.gasType || <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                                                        </td>
                                                      </>);
                                                    })()}
                                                    <td style={{ padding: "0.35rem 0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                      {aLog.date ? new Date(aLog.date).toLocaleDateString("en-GB") : "—"}
                                                    </td>
                                                    <td style={{ padding: "0.35rem 0.75rem" }}>
                                                      <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "3px", background: isRec ? "rgba(255,170,0,0.1)" : "rgba(34,197,94,0.1)", color: isRec ? "#ffaa00" : "#22c55e", textTransform: "capitalize" }}>
                                                        {dispType}
                                                      </span>
                                                    </td>
                                                    <td style={{ padding: "0.35rem 0.75rem", textAlign: "right", fontWeight: 600, color: isRec ? "#ffaa00" : "#22c55e" }}>
                                                      {(parseFloat(String(eqDetail.weight)) || aLog.weightUsed || 0).toFixed(2)} kg
                                                    </td>
                                                    <td style={{ padding: "0.35rem 0.75rem", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-geist-mono)", fontSize: "0.75rem" }}>
                                                      {aLog.weightBefore?.toFixed(2) ?? "?"} → {aLog.weightAfter?.toFixed(2) ?? "?"}
                                                    </td>
                                                    <td style={{ padding: "0.35rem 0.75rem" }}>
                                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                                                        {aHwcn && (
                                                          <Link href={`/admin/hwcn/${encodeURIComponent(aHwcn.id)}`} title="Internal HWCN" style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00e5ff", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 600, textDecoration: "none" }}>
                                                            <ExternalLink size={10} /> {aHwcn.id?.slice(0, 8) || "HWCN"}
                                                          </Link>
                                                        )}
                                                        {aReturn && (
                                                          <Link href={`/admin/supplier-hwcn/${encodeURIComponent(aReturn.hwcnNumber)}`} title={`Return note: ${aReturn.hwcnNumber}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 600, textDecoration: "none" }}>
                                                            <ExternalLink size={10} /> {aReturn.hwcnNumber}
                                                          </Link>
                                                        )}
                                                        {aDirect && (
                                                          <button onClick={e => { e.stopPropagation(); setViewPhoto({ url: aDirect.supplierHwcnPhotoUrl!, serial: aDirect.serial }); }} title="Direct return — view HWCN photo" style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.25)", color: "#ff6b6b", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>
                                                            <Camera size={10} /> Direct Return
                                                          </button>
                                                        )}
                                                        {!aHwcn && !aReturn && !aDirect && <span style={{ color: "var(--text-muted)" }}>—</span>}
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                          ))}
                        </td>
                      </tr>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </DoubleScrollContainer>
      )}

      <ColumnCustomizer
        open={customizerOpen}
        onClose={() => setCustOpen(false)}
        columns={COLUMN_DEFS}
        hidden={hidden}
        order={order}
        onToggle={toggleCol}
        onMove={moveCol}
        onReset={reset}
      />

      {/* Direct return HWCN photo modal */}
      {viewPhoto && (
        <div
          onClick={() => setViewPhoto(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, cursor: "pointer" }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "92vh", display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", fontFamily: "var(--font-geist-mono)" }}>
              Direct supplier return — {viewPhoto.serial}
            </p>
            <img
              src={viewPhoto.url}
              alt={`HWCN photo — ${viewPhoto.serial}`}
              style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", borderRadius: "8px", display: "block" }}
            />
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => {
                  const url = viewPhoto.url;
                  if (url.startsWith("data:")) {
                    const win = window.open("", "_blank");
                    if (!win) return;
                    win.document.write(`<!DOCTYPE html><html><head><title>HWCN — ${viewPhoto.serial}</title><style>body{margin:0;background:#000}img{max-width:100%;display:block}</style></head><body><img src="${url}" /></body></html>`);
                    win.document.close();
                  } else {
                    window.open(url, "_blank");
                  }
                }}
                style={{ padding: "0.5rem 1.1rem", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem" }}
              >
                Open full size
              </button>
              <button
                onClick={() => setViewPhoto(null)}
                style={{ padding: "0.5rem 1.1rem", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.25)", color: "#ff6b6b", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV import preview modal */}
      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#0f1420", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "1.5rem", maxWidth: "900px", width: "95%", maxHeight: "80vh", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>Import Preview</h2>
              <button onClick={() => setPreview(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><X size={20} /></button>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", padding: "0.3rem 0.8rem", borderRadius: "20px", fontSize: "0.82rem", fontWeight: 600 }}>
                {preview.newRows.length.toLocaleString()} new — will be imported
              </span>
              {preview.skippedCount > 0 && (
                <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", padding: "0.3rem 0.8rem", borderRadius: "20px", fontSize: "0.82rem" }}>
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
                          <td style={tdBase}>{row.prefix || "—"}</td>
                          <td style={{ ...tdBase, fontWeight: 600, color: "#fff" }}>{row.jobNumber || "—"}</td>
                          <td style={tdBase}>{row.startDate || "—"}</td>
                          <td style={tdBase}>{row.jobTitle || "—"}</td>
                          <td style={tdBase}>{row.customer || "—"}</td>
                          <td style={tdBase}>{row.siteTitle || "—"}</td>
                          <td style={tdBase}>{row.siteAddress || "—"}</td>
                          <td style={tdBase}>{row.sitePostcode || "—"}</td>
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
              <button onClick={() => setPreview(null)} style={{ padding: "0.6rem 1.2rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" }}>Cancel</button>
              {preview.newRows.length > 0 && (
                <button onClick={confirmImport} disabled={importing} style={{ padding: "0.6rem 1.4rem", background: "rgba(0,229,255,0.15)", border: "1px solid rgba(0,229,255,0.35)", color: "#00e5ff", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 }}>
                  {importing ? "Importing…" : `Import ${preview.newRows.length.toLocaleString()} new jobs`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
