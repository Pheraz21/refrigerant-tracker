"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { db, Bottle, isBottleTrace, hasReclaimWaste } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import {
  Truck,
  Search,
  Trash2,
  Camera,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  X,
  Lock,
  ArrowUp,
  ArrowDown,
  PackageCheck,
} from "lucide-react";
import Link from "next/link";
import HwcnLightboxModal from "@/components/HwcnLightboxModal";
import { compressImage } from "@/lib/utils";
import { useNavigationGuard } from "@/lib/NavigationGuardContext";

function fmtDate(iso: string | undefined | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCategoryLabel(category?: string) {
  if (category === "nitrogen") return "Nitrogen";
  if (category === "new") return "New Refrigerant";
  if (category === "recycled") return "Recycled";
  if (category === "reclaim") return "Waste / Reclaim";
  return category || "Unknown";
}

function formatLocationLabel(b: Bottle) {
  if (b.locationType === "site") return `On Site (${b.locationId || "Site"})`;
  if (b.locationType === "van") return `In Van (${b.locationId || "Van"})`;
  if (b.locationType === "supplier") return `Returned to Supplier (${b.locationId || "Supplier"})`;
  if (b.locationType === "office") return "In Stores (HQ-Stores)";
  return b.locationId || b.locationType || "Unknown";
}

export default function SupplierReturnPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { setIsDirty, setCustomMessage, requestNavigate } = useNavigationGuard();

  // Stores waste bottles (locationType === "office" && category === "reclaim" && status !== "returned")
  const [storesWasteBottles, setStoresWasteBottles] = useState<Bottle[]>([]);
  // Full inventory for helpful diagnostic messages if a user searches/scans a non-eligible serial
  const [allBottles, setAllBottles] = useState<Bottle[]>([]);
  const [loadingBottles, setLoadingBottles] = useState(true);

  // Selection & filter state (matching /admin/stores-collection)
  const [selectedBottles, setSelectedBottles] = useState<Bottle[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "weight" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Collection & HWCN details
  const [hwcnNumber, setHwcnNumber] = useState("");
  const [returnSupplier, setReturnSupplier] = useState("");
  const [returnSupplierBranch, setReturnSupplierBranch] = useState("");
  const [supplierLock, setSupplierLock] = useState("");
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Multi-image state & lightbox
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const selectedSerialSet = useMemo(
    () => new Set(selectedBottles.map(b => b.serial)),
    [selectedBottles]
  );

  const isFormDirty = useMemo(() => {
    if (isSuccess || loading) return false;
    return (
      selectedBottles.length > 0 ||
      photoFiles.length > 0 ||
      photoPreviewUrls.length > 0 ||
      hwcnNumber.trim().length > 0 ||
      returnSupplierBranch.trim().length > 0
    );
  }, [
    selectedBottles.length,
    photoFiles.length,
    photoPreviewUrls.length,
    hwcnNumber,
    returnSupplierBranch,
    isSuccess,
    loading,
  ]);

  useEffect(() => {
    setIsDirty(isFormDirty);
    if (isFormDirty) {
      const bottleDesc =
        selectedBottles.length > 0
          ? ` (${selectedBottles.length} cylinder${selectedBottles.length !== 1 ? "s" : ""} selected)`
          : "";
      setCustomMessage(
        `You have an active Supplier Waste Return in progress${bottleDesc}. If you leave now, the selected cylinder batch and attached paperwork will be lost.`
      );
    } else {
      setCustomMessage(undefined);
    }
  }, [isFormDirty, selectedBottles.length, setIsDirty, setCustomMessage]);

  useEffect(() => {
    return () => {
      setIsDirty(false);
    };
  }, [setIsDirty]);

  useEffect(() => {
    async function loadBottles() {
      try {
        setLoadingBottles(true);
        const [officeBottles, all] = await Promise.all([
          db.getBottlesByLocation("office"),
          db.getAllBottles(),
        ]);
        setAllBottles(all);
        // Strictly allow ONLY waste/reclaim bottles with hazardous waste (> 0 kg or Trace) currently in Stores (office) and not returned
        const eligibleWasteInStores = officeBottles.filter(
          b =>
            b.category === "reclaim" &&
            hasReclaimWaste(b) &&
            b.locationType === "office" &&
            b.status !== "returned"
        );
        setStoresWasteBottles(eligibleWasteInStores);
      } catch (err) {
        console.error("Failed to load stores waste bottles", err);
      } finally {
        setLoadingBottles(false);
      }
    }
    loadBottles();
  }, []);

  const supplierOptions = useMemo(() => {
    const seen = new Set<string>();
    storesWasteBottles.forEach(b => {
      if (b.supplier) seen.add(b.supplier);
    });
    return Array.from(seen).sort();
  }, [storesWasteBottles]);

  const toggleSort = (key: "date" | "weight") => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ k }: { k: "date" | "weight" }) => {
    if (sortKey !== k) return null;
    return sortDir === "asc" ? (
      <ArrowUp size={12} style={{ display: "inline", marginLeft: "3px" }} />
    ) : (
      <ArrowDown size={12} style={{ display: "inline", marginLeft: "3px" }} />
    );
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = storesWasteBottles.filter(
      b =>
        (q === "" ||
          b.serial.toLowerCase().includes(q) ||
          (b.gasType || "").toLowerCase().includes(q) ||
          (b.supplier || "").toLowerCase().includes(q)) &&
        (supplierFilter === "" || (b.supplier || "") === supplierFilter)
    );
    if (sortKey === "date") {
      list = [...list].sort((a, bb) => {
        const da = new Date(a.locationChangedAt || 0).getTime();
        const db2 = new Date(bb.locationChangedAt || 0).getTime();
        return sortDir === "asc" ? da - db2 : db2 - da;
      });
    } else if (sortKey === "weight") {
      list = [...list].sort((a, bb) =>
        sortDir === "asc"
          ? (a.currentWeight || 0) - (bb.currentWeight || 0)
          : (bb.currentWeight || 0) - (a.currentWeight || 0)
      );
    }
    return list;
  }, [storesWasteBottles, filter, supplierFilter, sortKey, sortDir]);

  // If the user types/scans a serial in the filter box that is NOT an eligible waste bottle in stores,
  // check allBottles so we can explain why that serial cannot be selected here.
  const ineligibleSerialNotice = useMemo(() => {
    const trimmed = filter.trim().toUpperCase();
    if (!trimmed) return null;

    // If it matches an eligible waste bottle in stores, no error notice needed
    if (storesWasteBottles.some(b => b.serial.toUpperCase() === trimmed)) {
      return null;
    }

    const matchInCompany = allBottles.find(b => b.serial.toUpperCase() === trimmed);
    if (!matchInCompany) {
      // Only show "not found" if there are zero partial matches in storesWasteBottles
      if (filtered.length === 0 && trimmed.length >= 3) {
        return `Cylinder "${trimmed}" was not found in Stores waste inventory.`;
      }
      return null;
    }

    if (matchInCompany.status === "returned") {
      return `Cylinder ${matchInCompany.serial} cannot be selected: it has already been returned to a supplier.`;
    }

    const isNotWaste = matchInCompany.category !== "reclaim";
    const isNotInStores = matchInCompany.locationType !== "office";

    if (isNotWaste && isNotInStores) {
      return `Cylinder ${matchInCompany.serial} cannot be returned here for 2 reasons: it is a ${formatCategoryLabel(
        matchInCompany.category
      )} bottle (not a Waste / Reclaim bottle) and it is currently ${formatLocationLabel(
        matchInCompany
      )} (not in Stores).`;
    }

    if (isNotWaste) {
      return `Cylinder ${matchInCompany.serial} cannot be returned on this page: it is a ${formatCategoryLabel(
        matchInCompany.category
      )} bottle, not a Waste / Reclaim bottle. Use "Supplier Collection from Stores" for non-waste bottles.`;
    }

    if (isNotInStores) {
      return `Cylinder ${matchInCompany.serial} cannot be returned yet: although it is a Waste / Reclaim bottle, it is currently ${formatLocationLabel(
        matchInCompany
      )}. Only waste bottles currently in Stores can be collected here.`;
    }

    if (matchInCompany.category === "reclaim" && !hasReclaimWaste(matchInCompany)) {
      return `Cylinder ${matchInCompany.serial} is an Unused / Empty Evacuated reclaim cylinder containing no hazardous waste (0.00 kg). No HWCN is required — please use "Supplier Collection from Stores" instead.`;
    }

    return null;
  }, [filter, storesWasteBottles, allBottles, filtered.length]);

  const toggleSelect = (bottle: Bottle) => {
    setError("");

    // Guard: ensure bottle is a reclaim bottle with waste in office/stores
    if (
      bottle.category !== "reclaim" ||
      !hasReclaimWaste(bottle) ||
      bottle.locationType !== "office"
    ) {
      setError(
        `Cylinder ${bottle.serial} is not eligible: only Waste / Reclaim bottles containing hazardous waste (> 0 kg or Trace) currently in Stores can be selected.`
      );
      return;
    }

    const isAlreadySelected = selectedSerialSet.has(bottle.serial);
    if (isAlreadySelected) {
      const remaining = selectedBottles.filter(b => b.serial !== bottle.serial);
      setSelectedBottles(remaining);
      setWeights(prev => {
        const next = { ...prev };
        delete next[bottle.serial];
        return next;
      });
      if (remaining.length === 0) {
        setSupplierLock("");
        setReturnSupplier("");
      }
    } else {
      const bottleSupplier = bottle.supplier || "";
      const expectedSupplier = supplierLock || returnSupplier.trim();
      if (selectedBottles.length === 0) {
        if (bottleSupplier) {
          setReturnSupplier(bottleSupplier);
          setSupplierLock(bottleSupplier);
        }
      } else if (
        expectedSupplier &&
        bottleSupplier &&
        bottleSupplier.toLowerCase().trim() !== expectedSupplier.toLowerCase().trim()
      ) {
        setError(
          `Supplier mismatch: ${bottle.serial} belongs to "${bottleSupplier}" but this return note is locked to "${expectedSupplier}". All bottles on one return note must be for the same supplier.`
        );
        return;
      }

      setSelectedBottles(prev => [...prev, bottle]);
      setWeights(prev => ({ ...prev, [bottle.serial]: bottle.currentWeight ?? 0 }));
    }
  };

  const toggleAll = () => {
    setError("");
    const allFilteredSelected =
      filtered.length > 0 && filtered.every(b => selectedSerialSet.has(b.serial));

    if (allFilteredSelected) {
      const filteredSerials = new Set(filtered.map(b => b.serial));
      const remaining = selectedBottles.filter(b => !filteredSerials.has(b.serial));
      setSelectedBottles(remaining);
      setWeights(prev => {
        const next = { ...prev };
        filtered.forEach(b => delete next[b.serial]);
        return next;
      });
      if (remaining.length === 0) {
        setSupplierLock("");
        setReturnSupplier("");
      }
    } else {
      const targetSupplier =
        supplierLock ||
        returnSupplier.trim() ||
        filtered.find(b => b.supplier)?.supplier ||
        "";

      const compatible = filtered.filter(b => {
        if (!targetSupplier || !b.supplier) return true;
        return b.supplier.toLowerCase().trim() === targetSupplier.toLowerCase().trim();
      });

      if (compatible.length < filtered.length) {
        setError(
          `Selected ${compatible.length} bottle(s) matching supplier "${targetSupplier}". Bottles from other suppliers were skipped.`
        );
      }

      if (targetSupplier && !supplierLock) {
        setReturnSupplier(targetSupplier);
        setSupplierLock(targetSupplier);
      }

      const existingMap = new Map(selectedBottles.map(b => [b.serial, b]));
      compatible.forEach(b => existingMap.set(b.serial, b));
      const nextBottles = Array.from(existingMap.values());
      setSelectedBottles(nextBottles);

      setWeights(prev => {
        const next = { ...prev };
        compatible.forEach(b => {
          if (next[b.serial] === undefined) {
            next[b.serial] = b.currentWeight ?? 0;
          }
        });
        return next;
      });
    }
  };

  const removeBottle = (serial: string) => {
    const remaining = selectedBottles.filter(b => b.serial !== serial);
    setSelectedBottles(remaining);
    setWeights(prev => {
      const next = { ...prev };
      delete next[serial];
      return next;
    });
    if (remaining.length === 0) {
      setSupplierLock("");
      setReturnSupplier("");
    }
  };

  const handleWeightChange = (serial: string, val: string) => {
    const num = parseFloat(val);
    setWeights(prev => ({ ...prev, [serial]: isNaN(num) ? 0 : num }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPhotoFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPhotoPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (selectedBottles.length === 0) {
      setError("Please select at least one waste bottle from Stores inventory");
      return;
    }
    if (!returnSupplier.trim()) {
      setError("Please enter the supplier name");
      return;
    }
    if (!returnSupplierBranch.trim()) {
      setError("Please enter the supplier branch");
      return;
    }
    if (!hwcnNumber.trim()) {
      setError("Please enter the Supplier's HWCN number");
      return;
    }

    // Final safety check on all selected bottles
    const invalidBottle = selectedBottles.find(
      b => b.category !== "reclaim" || !hasReclaimWaste(b) || b.locationType !== "office"
    );
    if (invalidBottle) {
      setError(
        `Cylinder ${invalidBottle.serial} is not a waste bottle currently in Stores and cannot be returned here.`
      );
      return;
    }

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `supplier-returns/${hwcnNumber.trim()}-${Date.now()}-${i + 1}.${ext}`;
        try {
          const { error: uploadError } = await supabase.storage
            .from("hwcn-photos")
            .upload(path, file, { upsert: true });
          if (uploadError) {
            console.error(`Photo ${i + 1} storage upload warning:`, uploadError);
            if (
              uploadError.message?.toLowerCase().includes("row-level security") ||
              uploadError.message?.toLowerCase().includes("row security")
            ) {
              const fallbackDataUrl = await compressImage(file);
              uploadedUrls.push(fallbackDataUrl);
            } else {
              throw new Error(`Photo ${i + 1} upload failed: ${uploadError.message}`);
            }
          } else {
            const { data: urlData } = supabase.storage.from("hwcn-photos").getPublicUrl(path);
            uploadedUrls.push(urlData.publicUrl);
          }
        } catch (stErr: any) {
          if (
            stErr.message?.toLowerCase().includes("row-level security") ||
            stErr.message?.toLowerCase().includes("row security")
          ) {
            const fallbackDataUrl = await compressImage(file);
            uploadedUrls.push(fallbackDataUrl);
          } else {
            throw stErr;
          }
        }
      }

      await db.returnBottleToSupplier({
        serials: selectedBottles.map(b => b.serial),
        returnHwcnNumber: hwcnNumber.trim(),
        returnedBy: user?.name || "Office Admin",
        weights: weights,
        hwcnPhotoUrl: uploadedUrls[0] || "",
        hwcnPhotoUrls: uploadedUrls,
        returnSupplier: returnSupplier.trim(),
        returnSupplierBranch: returnSupplierBranch.trim(),
        returnedAt: returnDate ? new Date(returnDate).toISOString() : new Date().toISOString(),
      });
      setIsDirty(false);
      setIsSuccess(true);
      setTimeout(() => router.push("/admin/stores"), 3000);
    } catch (err: any) {
      console.error("Error submitting supplier return:", err);
      if (
        err?.message?.toLowerCase().includes("row-level security") ||
        err?.message?.toLowerCase().includes("row security")
      ) {
        setError(
          "Database security policy (RLS) prevented updating bottle record. Please check Supabase RLS policies for the bottles table."
        );
      } else {
        setError(err?.message || "Failed to process return. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <CheckCircle2 size={64} color="#22c55e" style={{ margin: "0 auto 1.5rem" }} />
        <h1 className="text-gradient" style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          Waste Return Completed
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
          {selectedBottles.length} waste {selectedBottles.length === 1 ? "bottle has" : "bottles have"} been recorded under HWCN{" "}
          <strong>{hwcnNumber}</strong> to <strong>{returnSupplier} ({returnSupplierBranch})</strong> on {returnDate}.
          <br />
          They have been removed from active stores inventory.
        </p>
        <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)" }}>
          Redirecting to Stores Inventory...
        </p>
      </div>
    );
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every(b => selectedSerialSet.has(b.serial));

  return (
    <>
      <HwcnLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        photoUrl={photoPreviewUrls}
        title={`Uploaded HWCN Paperwork Preview (${photoPreviewUrls.length} Pages)`}
      />

      <div style={{ maxWidth: "1080px" }}>
        <div style={{ marginBottom: "2rem" }}>
          <button
            type="button"
            onClick={() => {
              const navigateBack = () => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/admin");
                }
              };
              if (requestNavigate(navigateBack)) {
                navigateBack();
              }
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              marginBottom: "1rem",
              cursor: "pointer",
            }}
            title="Go back"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h1
            style={{
              fontSize: "1.8rem",
              fontWeight: 700,
              marginBottom: "0.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <Truck size={28} color="var(--primary)" /> Waste Return from Office to Supplier
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Select waste / reclaim cylinders currently held in HQ Stores to record supplier waste collection
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 390px",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          {/* Left Column: Waste Bottles in Stores list + Selected Weights table */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.25rem",
                }}
              >
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                  Waste Cylinders in Stores
                  {selectedBottles.length > 0 && (
                    <span
                      style={{
                        marginLeft: "0.75rem",
                        fontSize: "0.85rem",
                        color: "var(--primary)",
                        fontWeight: 600,
                      }}
                    >
                      {selectedBottles.length} selected
                    </span>
                  )}
                </h3>
                {filtered.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    style={{
                      fontSize: "0.8rem",
                      color: "rgba(255,255,255,0.5)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    {allFilteredSelected ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>

              {/* Supplier filter */}
              {supplierOptions.length > 1 && (
                <select
                  value={supplierFilter}
                  onChange={e => setSupplierFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    marginBottom: "0.75rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: supplierFilter ? "#fff" : "rgba(255,255,255,0.4)",
                    outline: "none",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    colorScheme: "dark",
                  }}
                >
                  <option value="">All suppliers</option>
                  {supplierOptions.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}

              {/* Search / Serial Filter */}
              <div style={{ position: "relative", marginBottom: "0.75rem" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "0.9rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(255,255,255,0.3)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Filter by serial, gas type or supplier..."
                  value={filter}
                  onChange={e => {
                    setFilter(e.target.value);
                    setError("");
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const exact = storesWasteBottles.find(
                        b => b.serial.toUpperCase() === filter.trim().toUpperCase()
                      );
                      if (exact) {
                        toggleSelect(exact);
                        setFilter("");
                      }
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem 2.25rem 0.75rem 2.5rem",
                    background: "rgba(255,255,255,0.05)",
                    border: ineligibleSerialNotice
                      ? "1px solid rgba(255,51,102,0.5)"
                      : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    outline: "none",
                    fontSize: "0.9rem",
                  }}
                />
                {filter && (
                  <button
                    type="button"
                    onClick={() => setFilter("")}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.4)",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                    }}
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Diagnostic warning when user enters a serial that is not a waste bottle or not in stores */}
              {ineligibleSerialNotice && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    marginBottom: "0.9rem",
                    background: "rgba(255,51,102,0.1)",
                    border: "1px solid rgba(255,51,102,0.28)",
                    borderRadius: "8px",
                    color: "#ff3366",
                    fontSize: "0.83rem",
                    lineHeight: 1.45,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>{ineligibleSerialNotice}</span>
                </div>
              )}

              {/* Sort controls */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
                <button
                  type="button"
                  onClick={() => toggleSort("date")}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.3rem 0.75rem",
                    borderRadius: "6px",
                    border: "none",
                    background:
                      sortKey === "date" ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.06)",
                    color: sortKey === "date" ? "#00e5ff" : "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                    fontWeight: sortKey === "date" ? 700 : 400,
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  Date in Stores <SortIcon k="date" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSort("weight")}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.3rem 0.75rem",
                    borderRadius: "6px",
                    border: "none",
                    background:
                      sortKey === "weight" ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.06)",
                    color: sortKey === "weight" ? "#00e5ff" : "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                    fontWeight: sortKey === "weight" ? 700 : 400,
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  Weight <SortIcon k="weight" />
                </button>
              </div>

              {loadingBottles ? (
                <div
                  style={{
                    padding: "3rem",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  <Loader2 size={32} className="spinner" style={{ margin: "0 auto 1rem" }} />
                  <p>Loading waste bottles in stores...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div
                  style={{
                    padding: "3rem 1.5rem",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.3)",
                    border: "2px dashed rgba(255,255,255,0.05)",
                    borderRadius: "12px",
                  }}
                >
                  <PackageCheck size={40} style={{ marginBottom: "1rem", opacity: 0.15 }} />
                  <p style={{ margin: 0 }}>
                    {storesWasteBottles.length === 0
                      ? "No waste / reclaim bottles currently in Stores."
                      : "No waste bottles in Stores match your filter."}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {filtered.map(b => {
                    const isSelected = selectedSerialSet.has(b.serial);
                    const inStoresSince = fmtDate(b.locationChangedAt);
                    const isTrace = isBottleTrace(b);
                    return (
                      <div
                        key={b.serial}
                        onClick={() => toggleSelect(b)}
                        style={{
                          padding: "0.9rem 1.1rem",
                          background: isSelected
                            ? "rgba(0,229,255,0.08)"
                            : "rgba(255,255,255,0.02)",
                          border: `1px solid ${
                            isSelected ? "rgba(0,229,255,0.35)" : "rgba(255,255,255,0.07)"
                          }`,
                          borderRadius: "10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          transition: "all 0.15s",
                        }}
                      >
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "5px",
                            flexShrink: 0,
                            border: `2px solid ${
                              isSelected ? "var(--primary)" : "rgba(255,255,255,0.2)"
                            }`,
                            background: isSelected ? "var(--primary)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isSelected && (
                            <span
                              style={{ color: "#000", fontSize: "0.75rem", fontWeight: 900 }}
                            >
                              ✓
                            </span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link
                            href={`/admin/bottles/${b.serial}`}
                            onClick={e => e.stopPropagation()}
                            style={{
                              fontWeight: 700,
                              color: isSelected ? "var(--primary)" : "#fff",
                              fontSize: "0.95rem",
                              textDecoration: "none",
                              borderBottom: "1px solid rgba(255,255,255,0.2)",
                              paddingBottom: "1px",
                            }}
                          >
                            {b.serial}
                          </Link>
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "rgba(255,255,255,0.45)",
                              marginTop: "0.25rem",
                            }}
                          >
                            {b.gasType}
                            {" • "}
                            {isTrace ? "Trace" : `${Number(b.currentWeight ?? 0).toFixed(2)} kg`}
                            {b.supplier && ` • ${b.supplier}`}
                            {inStoresSince && (
                              <span
                                style={{
                                  marginLeft: "0.5rem",
                                  color: "rgba(255,255,255,0.3)",
                                }}
                              >
                                — in stores {inStoresSince}
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            padding: "0.2rem 0.6rem",
                            borderRadius: "6px",
                            background: "rgba(255,170,0,0.14)",
                            color: "#ffaa00",
                            flexShrink: 0,
                          }}
                        >
                          reclaim
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Cylinders & Editable Return Weights */}
            {selectedBottles.length > 0 && (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "#fff",
                    margin: "0 0 0.85rem 0",
                  }}
                >
                  Selected Waste Cylinders on Return Note ({selectedBottles.length})
                </h3>
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.2)",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.85rem",
                    }}
                  >
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                        <th
                          style={{
                            padding: "0.65rem 1rem",
                            textAlign: "left",
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "0.7rem",
                            textTransform: "uppercase",
                          }}
                        >
                          Serial
                        </th>
                        <th
                          style={{
                            padding: "0.65rem 1rem",
                            textAlign: "left",
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "0.7rem",
                            textTransform: "uppercase",
                          }}
                        >
                          Gas Type
                        </th>
                        <th
                          style={{
                            padding: "0.65rem 1rem",
                            textAlign: "right",
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "0.7rem",
                            textTransform: "uppercase",
                          }}
                        >
                          Return Weight (kg)
                        </th>
                        <th
                          style={{
                            padding: "0.65rem 1rem",
                            textAlign: "center",
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "0.7rem",
                            textTransform: "uppercase",
                          }}
                        >
                          Remove
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBottles.map(b => (
                        <tr
                          key={b.serial}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                        >
                          <td
                            style={{
                              padding: "0.65rem 1rem",
                              fontFamily: "var(--font-geist-mono), monospace",
                              fontWeight: 700,
                              color: "#00e5ff",
                            }}
                          >
                            {b.serial}
                          </td>
                          <td style={{ padding: "0.65rem 1rem", color: "rgba(255,255,255,0.7)" }}>
                            {b.gasType}
                          </td>
                          <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                            <input
                              type="number"
                              step="0.01"
                              value={weights[b.serial] ?? b.currentWeight}
                              onChange={e => handleWeightChange(b.serial, e.target.value)}
                              style={{
                                width: "90px",
                                padding: "0.35rem 0.5rem",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "6px",
                                color: "#fff",
                                textAlign: "right",
                                fontSize: "0.85rem",
                              }}
                            />
                          </td>
                          <td style={{ padding: "0.65rem 1rem", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => removeBottle(b.serial)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#ff3366",
                                cursor: "pointer",
                                padding: "0.2rem",
                              }}
                              title="Remove from selection"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Return & HWCN Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "1.25rem",
                  color: "#fff",
                }}
              >
                Return &amp; HWCN Details
              </h3>

              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "rgba(255,255,255,0.6)",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  Collection / Return Date <span style={{ color: "#ff3366" }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  value={returnDate}
                  onChange={e => setReturnDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.85rem 1rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    color: "#fff",
                    outline: "none",
                    colorScheme: "dark",
                  }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    color: "rgba(255,255,255,0.6)",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  <span>
                    Supplier Name <span style={{ color: "#ff3366" }}>*</span>
                  </span>
                  {supplierLock && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        fontSize: "0.7rem",
                        color: "#22c55e",
                        fontWeight: 600,
                      }}
                    >
                      <Lock size={11} /> Auto-filled from bottle
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Select a bottle — supplier will auto-fill"
                  value={returnSupplier}
                  onChange={e => !supplierLock && setReturnSupplier(e.target.value)}
                  readOnly={!!supplierLock}
                  style={{
                    width: "100%",
                    padding: "0.85rem 1rem",
                    background: supplierLock
                      ? "rgba(34,197,94,0.06)"
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${
                      supplierLock ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.12)"
                    }`,
                    borderRadius: "10px",
                    color: "#fff",
                    outline: "none",
                    cursor: supplierLock ? "default" : "text",
                  }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "rgba(255,255,255,0.6)",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  Supplier Branch / Depot <span style={{ color: "#ff3366" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Birtley, Gateshead"
                  value={returnSupplierBranch}
                  onChange={e => setReturnSupplierBranch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.85rem 1rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    color: "#fff",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "rgba(255,255,255,0.6)",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  Supplier&apos;s HWCN Number <span style={{ color: "#ff3366" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BJJ-123456"
                  value={hwcnNumber}
                  onChange={e => setHwcnNumber(e.target.value.toUpperCase())}
                  style={{
                    width: "100%",
                    padding: "0.85rem 1rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    color: "#fff",
                    outline: "none",
                    fontWeight: 700,
                  }}
                />
              </div>

              {/* Multi-Photo Upload Section */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "rgba(255,255,255,0.6)",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  Photos / Paperwork Pages ({photoFiles.length} uploaded)
                </label>

                {photoPreviewUrls.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                      gap: "0.65rem",
                      marginBottom: "0.85rem",
                    }}
                  >
                    {photoPreviewUrls.map((url, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: "relative",
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: "1px solid rgba(0,229,255,0.3)",
                          background: "#1a202c",
                        }}
                      >
                        <img
                          src={url}
                          alt={`HWCN page ${idx + 1}`}
                          onClick={() => {
                            setSelectedPhotoIndex(idx);
                            setIsLightboxOpen(true);
                          }}
                          style={{
                            width: "100%",
                            height: "90px",
                            objectFit: "cover",
                            display: "block",
                            cursor: "pointer",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          style={{
                            position: "absolute",
                            top: "0.3rem",
                            right: "0.3rem",
                            background: "rgba(0,0,0,0.75)",
                            border: "none",
                            borderRadius: "50%",
                            padding: "0.2rem",
                            color: "#ff3366",
                            cursor: "pointer",
                            display: "flex",
                          }}
                        >
                          <X size={13} />
                        </button>
                        <div
                          onClick={() => {
                            setSelectedPhotoIndex(idx);
                            setIsLightboxOpen(true);
                          }}
                          style={{
                            padding: "0.2rem 0.4rem",
                            background: "rgba(0,0,0,0.6)",
                            fontSize: "0.65rem",
                            color: "#00e5ff",
                            fontWeight: 600,
                            textAlign: "center",
                            cursor: "pointer",
                          }}
                        >
                          Page {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    padding: "0.75rem 1rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px dashed rgba(0,229,255,0.4)",
                    borderRadius: "8px",
                    color: "#00e5ff",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handlePhotoSelect}
                    style={{ display: "none" }}
                  />
                  <Camera size={18} />
                  {photoFiles.length === 0
                    ? "Upload HWCN Photos / Paperwork"
                    : "+ Add Another Page / Photo"}
                </label>
              </div>

              {error && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    background: "rgba(255,51,102,0.1)",
                    border: "1px solid rgba(255,51,102,0.2)",
                    borderRadius: "8px",
                    color: "#ff3366",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || selectedBottles.length === 0}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: "linear-gradient(135deg, #00e5ff 0%, #0088ff 100%)",
                  border: "none",
                  borderRadius: "10px",
                  color: "#000",
                  fontWeight: 800,
                  fontSize: "1rem",
                  cursor:
                    loading || selectedBottles.length === 0 ? "not-allowed" : "pointer",
                  opacity: loading || selectedBottles.length === 0 ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                {loading ? (
                  <Loader2 size={20} className="spinner" />
                ) : (
                  `Complete Supplier Return (${selectedBottles.length} bottle${
                    selectedBottles.length !== 1 ? "s" : ""
                  })`
                )}
              </button>
            </div>

            <div
              style={{
                padding: "1.25rem",
                background: "rgba(255,187,0,0.05)",
                border: "1px solid rgba(255,187,0,0.15)",
                borderRadius: "12px",
              }}
            >
              <h4
                style={{
                  fontSize: "0.85rem",
                  color: "#ffbb00",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <AlertCircle size={16} /> Compliance Notice
              </h4>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "rgba(255,187,0,0.8)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Only waste / reclaim cylinders currently held in HQ Stores can be returned on
                this page. Marking these cylinders as returned will remove them from active
                stores inventory and log a permanent movement record for regulatory auditing.
              </p>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
