"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Truck, ArrowLeft, MapPin, Building2, Users, AlertTriangle, Building, Recycle } from "lucide-react";
import styles from "../log/page.module.css"; // Reuse existing form styles
import { db, isBottleTrace, hasReclaimWaste } from "@/lib/db";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { compressImage } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { ActiveVehicleBanner } from "@/components/ActiveVehicleBanner";
import { useNavigationGuard } from "@/lib/NavigationGuardContext";

async function uploadHwcnPhoto(base64: string, serial: string): Promise<string> {
  try {
    const res = await fetch(base64);
    const blob = await res.blob();
    const path = `supplier-returns/${serial}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("hwcn-photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) {
      console.warn("Storage upload warning, falling back to compressed data URL:", error.message);
      return base64;
    }
    const { data } = supabase.storage.from("hwcn-photos").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn("Storage upload exception, falling back to compressed data URL:", err);
    return base64;
  }
}

export default function MoveBottlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serialParam = searchParams.get("serial") || "UNKNOWN";
  const isDiscrepancy = searchParams.get("discrepancy") === "true";
  
  const [destination, setDestination] = useState(searchParams.get("dest") || "site");
  const [locationId, setLocationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedHWCN, setGeneratedHWCN] = useState<string | null>(null);
  const [customDestination, setCustomDestination] = useState({ name: "", address: "", postcode: "" });
  const [engineers, setEngineers] = useState<any[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const [supplierPhoto, setSupplierPhoto] = useState<string | null>(null);
  const [carrierRegNo, setCarrierRegNo] = useState("CBDU368286");
  
  const [bottle, setBottle] = useState<any>(null);
  const [reclaimFlowStep, setReclaimFlowStep] = useState<"loading" | "in_transit" | "intercept_supplier_photo" | "ask_supplier" | "confirm_supplier_hwcn" | "supplier_start_transit" | "standard" | "divert_supplier_branch" | "divert_destination" | "divert_to_site" | "divert_to_office">("loading");
  const [supplierHwcnConfirmed, setSupplierHwcnConfirmed] = useState(false);
  const [reclaimFlowPath, setReclaimFlowPath] = useState<"normal" | "supplier_direct" | "alternative">("normal");
  const [intendedBranch, setIntendedBranch] = useState("");
  const [divertedBranch, setDivertedBranch] = useState("");
  const [divertSiteJobNo, setDivertSiteJobNo] = useState("");
  const [siteCrmMatch, setSiteCrmMatch] = useState<any | null>(null);
  const [divertCrmMatch, setDivertCrmMatch] = useState<any | null>(null);
  const [currentSiteCrmMatch, setCurrentSiteCrmMatch] = useState<any | null>(null);
  
  // HWCN Form State
  const [vehicleReg, setVehicleReg] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [intendedDest, setIntendedDest] = useState("");
  const [hwcnSites, setHwcnSites] = useState<any[]>([]);
  const [initialHwcnSites, setInitialHwcnSites] = useState<any[]>([]);
  const [wasteAddedOnVisit, setWasteAddedOnVisit] = useState(false);
  const hasSubmittedRef = useRef(false);

  const { user, activeVehicleReg, activeVehicleOwner } = useAuth();
  const { setIsDirty, setCustomMessage, requestNavigate } = useNavigationGuard();

  const isMovingSiteToVanWithoutWaste = (bottle?.locationType === "site" && destination === "van" && !wasteAddedOnVisit);
  const isMovingOfficeToVan = (bottle?.locationType === "office" && destination === "van");
  const isDirectVanMove = (destination === "van" && reclaimFlowPath !== "alternative");

  const requiresHWCN = hasReclaimWaste(bottle) && 
    destination !== "supplier" && 
    destination !== "site" && 
    destination !== "engineer" &&
    !isMovingSiteToVanWithoutWaste &&
    !isMovingOfficeToVan &&
    !isDirectVanMove;

  const isMoveDirty = useMemo(() => {
    if (isSuccess || isSubmitting || hasSubmittedRef.current) return false;

    // 1. Moving to site with typed job number
    if (destination === "site" && locationId.trim().length > 0) return true;

    // 2. Colleague handover selected
    if (destination === "engineer" && selectedEngineer) return true;

    // 3. Custom destination entered
    if (customDestination.name.trim() || customDestination.address.trim() || customDestination.postcode.trim()) {
      return true;
    }

    // 4. Hazardous waste producer site manually entered or altered when HWCN is required
    if (requiresHWCN && hwcnSites && hwcnSites.length > 0) {
      if (hwcnSites.length !== initialHwcnSites.length) return true;
      const hasDiff = hwcnSites.some((s, idx) => {
        const init = initialHwcnSites[idx];
        return (
          (s.jobNumber || "").trim() !== (init?.jobNumber || "").trim() ||
          (s.name || "").trim() !== (init?.name || "").trim() ||
          (s.address || "").trim() !== (init?.address || "").trim() ||
          (s.postcode || "").trim() !== (init?.postcode || "").trim()
        );
      });
      if (hasDiff) return true;
    }

    // 5. Photos or diverts entered
    if (supplierPhoto !== null) return true;
    if (divertedBranch.trim().length > 0 || divertSiteJobNo.trim().length > 0) return true;
    if (intendedDest.trim().length > 0) return true;

    return false;
  }, [
    isSuccess,
    isSubmitting,
    destination,
    locationId,
    selectedEngineer,
    customDestination,
    requiresHWCN,
    hwcnSites,
    initialHwcnSites,
    supplierPhoto,
    divertedBranch,
    divertSiteJobNo,
    intendedDest,
  ]);

  useEffect(() => {
    setIsDirty(isMoveDirty);
    if (isMoveDirty) {
      setCustomMessage(
        "You have entered cylinder movement / hazardous waste consignment details that have not been submitted yet. If you navigate away now, this compliance transfer will be discarded."
      );
    } else {
      setCustomMessage(undefined);
    }
  }, [isMoveDirty, setIsDirty, setCustomMessage]);

  useEffect(() => {
    return () => {
      setIsDirty(false);
    };
  }, [setIsDirty]);

  useEffect(() => {
    let cancelled = false;
    db.getCompanySettings().then(s => { if (!cancelled && s?.carrierReg) setCarrierRegNo(s.carrierReg); });

    Promise.all([
      db.getBottle(serialParam),
      db.getMovementLogs(serialParam),
      db.getUsageLogs(serialParam)
    ]).then(async ([b, moveLogs, usageLogs]) => {
      if (cancelled || hasSubmittedRef.current) return;

      // Check if any waste refrigerant was recovered into this cylinder during its current visit to site
      let hasWasteThisVisit = false;
      if (b?.locationType === "site") {
        const siteId = (b.locationId || "").trim().toUpperCase();
        const siteMoves = (moveLogs || []).filter((m: any) => {
          const to = (m.to || (m as any).to_location || "").trim().toUpperCase();
          return to === siteId;
        });
        const latestSiteMove = siteMoves[0];
        let arrivalTime = b.locationChangedAt ? new Date(b.locationChangedAt).getTime() : 0;
        if (!arrivalTime && latestSiteMove?.date) {
          arrivalTime = new Date(latestSiteMove.date).getTime();
        }

        const recoveryLogs = (usageLogs || []).filter((log: any) => {
          const isWaste = log.jobType === "recovery" || log.jobType === "retrofit" || log.jobType === "waste";
          const hasWeight = Number(log.weightUsed || 0) > 0;
          if (!isWaste || !hasWeight) return false;

          const logTime = log.date ? new Date(log.date).getTime() : 0;
          if (arrivalTime > 0) {
            return logTime >= arrivalTime - 60000;
          }
          const logSite = (log.siteRef || (log as any).site_ref || "").trim().toUpperCase();
          return logSite === siteId;
        });

        hasWasteThisVisit = recoveryLogs.length > 0;
      }

      // Build initial HWCN sites and enrich from crm_jobs only when a job number is known and waste was recovered
      const recentRecoveryLogs = (usageLogs || []).filter(
        (l: any) => l.jobType === "recovery" || l.jobType === "retrofit" || l.jobType === "waste"
      );
      const fallbackJobNo =
        (b?.locationType === "site" && hasWasteThisVisit && b?.locationId ? b.locationId.trim() : "") ||
        (recentRecoveryLogs[0]?.siteRef ? String(recentRecoveryLogs[0].siteRef).trim() : "");

      let rawSites: Array<{ jobNumber?: string; name: string; address: string; postcode: string; crmMatched?: string }> =
        b?.producerSites && b.producerSites.length > 0
          ? b.producerSites.map((s: any) => ({
              jobNumber: s.jobNumber || (/^[A-Za-z]?\d+$/.test((s.name || "").trim()) ? (s.name || "").trim().toUpperCase() : ""),
              name: s.name || "",
              address: s.address || "",
              postcode: s.postcode || ""
            }))
          : [{ jobNumber: fallbackJobNo, name: "", address: "", postcode: "" }];

      if (rawSites.length === 1 && !rawSites[0].jobNumber && fallbackJobNo) {
        rawSites[0].jobNumber = fallbackJobNo;
      }

      const enrichedSites = await Promise.all(
        rawSites.map(async (site) => {
          const candidateJob = (site.jobNumber || "").trim();
          if (!candidateJob) return site;
          const crm = await db.getCrmJobByNumber(candidateJob);
          if (!crm) return site;
          const crmName = crm.siteTitle || crm.customer || "";
          const isNameJustJobNo = !site.name || site.name.trim().toUpperCase() === candidateJob.toUpperCase();
          return {
            ...site,
            jobNumber: crm.jobNumber || candidateJob.toUpperCase(),
            name: (isNameJustJobNo ? crmName : site.name) || crmName || site.name || "",
            address: site.address || crm.siteAddress || "",
            postcode: site.postcode || crm.sitePostcode || "",
            crmMatched: crmName || crm.jobNumber
          };
        })
      );

      if (cancelled || hasSubmittedRef.current) return;
      setBottle(b);
      setHwcnSites(enrichedSites);
      setInitialHwcnSites(enrichedSites.map((s) => ({ ...s })));
      setWasteAddedOnVisit(hasWasteThisVisit);
      
      const action = searchParams.get("action");
      const destParam = searchParams.get("dest");
      
      if (isDiscrepancy) {
        setReclaimFlowStep("standard");
        setReclaimFlowPath("normal");
      } else if (action === "divert") {
        setReclaimFlowStep("divert_destination");
      } else if (destParam === "site" || destParam === "engineer") {
        // Engineer is moving cylinder to a job site or handing over to a colleague; does not require HWCN
        setDestination(destParam);
        setReclaimFlowStep("standard");
        setReclaimFlowPath("normal");
      } else if (b?.locationType === "site" && !hasWasteThisVisit) {
        // Cylinder was brought to site but NO waste was recovered on this visit.
        // Return to van is a standard physical transfer without HWCN prompt.
        setDestination("van");
        setReclaimFlowStep("standard");
        setReclaimFlowPath("normal");
      } else if (b?.locationType === "office") {
        // Cylinder is at HQ-Stores; loading into van is van stock allocation without HWCN prompt.
        setDestination("van");
        setReclaimFlowStep("standard");
        setReclaimFlowPath("normal");
      } else {
        if (b?.activeHWCN && b?.intendedDestination) {
          setReclaimFlowStep("in_transit");
        } else if (hasReclaimWaste(b)) {
          setReclaimFlowStep("ask_supplier");
        } else {
          setReclaimFlowStep("standard");
          setReclaimFlowPath("normal");
        }
      }

      if (b?.locationType === 'site' || b?.locationType === 'office') {
        setDestination("van");
      }
    });

    return () => { cancelled = true; };
  }, [serialParam]);

  useEffect(() => {
    if (user?.id) {
      const initialReg = activeVehicleReg || user.vehicleReg || "";
      if (initialReg) setVehicleReg(initialReg);
      if (user?.name) setCarrierName(user.name);
      db.getEngineerProfiles().then(profiles => {
        // Filter out current user
        setEngineers(profiles.filter(p => p.id !== user.id));
        
        const myProfile = profiles.find(p => p.id === user.id);
        if (myProfile?.vehicleReg && !activeVehicleReg) {
          setVehicleReg(myProfile.vehicleReg);
        }
        if (myProfile?.name) {
          setCarrierName(myProfile.name);
        }
      });
    }
  }, [user, activeVehicleReg]);

  useEffect(() => {
    if (bottle?.locationType === "site" && bottle?.locationId) {
      let active = true;
      db.getCrmJobByNumber(bottle.locationId).then(crm => {
        if (active) setCurrentSiteCrmMatch(crm || null);
      }).catch(() => {
        if (active) setCurrentSiteCrmMatch(null);
      });
      return () => { active = false; };
    } else {
      setCurrentSiteCrmMatch(null);
    }
  }, [bottle?.locationType, bottle?.locationId]);

  useEffect(() => {
    if (destination !== "site" || !locationId || locationId.length < 3) {
      setSiteCrmMatch(null);
      return;
    }
    let active = true;
    db.getCrmJobByNumber(locationId).then(crm => {
      if (!active) return;
      setSiteCrmMatch(crm || null);
    });
    return () => { active = false; };
  }, [destination, locationId]);

  useEffect(() => {
    if (!divertSiteJobNo || divertSiteJobNo.length < 3) {
      setDivertCrmMatch(null);
      return;
    }
    let active = true;
    db.getCrmJobByNumber(divertSiteJobNo).then(crm => {
      if (!active) return;
      setDivertCrmMatch(crm || null);
    });
    return () => { active = false; };
  }, [divertSiteJobNo]);

  const handleHwcnSiteJobChange = async (idx: number, rawVal: string) => {
    const cleanVal = rawVal.replace(/\s+/g, "").toUpperCase();
    setHwcnSites((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], jobNumber: cleanVal, crmMatched: undefined };
      return next;
    });
    if (cleanVal.length < 3) return;
    const crmJob = await db.getCrmJobByNumber(cleanVal);
    if (crmJob) {
      const crmName = crmJob.siteTitle || crmJob.customer || "";
      setHwcnSites((prev) => {
        const next = [...prev];
        if (!next[idx] || next[idx].jobNumber !== cleanVal) return prev;
        next[idx] = {
          ...next[idx],
          name: crmName || next[idx].name || "",
          address: crmJob.siteAddress || next[idx].address || "",
          postcode: crmJob.sitePostcode || next[idx].postcode || "",
          crmMatched: crmName || crmJob.jobNumber
        };
        return next;
      });
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const isReclaimWithGas = hasReclaimWaste(bottle);
    const isMovingSiteToVanWithoutWaste = (bottle?.locationType === "site" && destination === "van" && !wasteAddedOnVisit);
    const isMovingOfficeToVan = (bottle?.locationType === "office" && destination === "van");
    const isDirectVanMove = (destination === "van" && reclaimFlowPath !== "alternative");

    const requiresInternalHWCN = isReclaimWithGas && 
      destination !== "supplier" && 
      destination !== "site" && 
      destination !== "engineer" &&
      !isMovingSiteToVanWithoutWaste &&
      !isMovingOfficeToVan &&
      !isDirectVanMove;
    const requiresSupplierHWCN = isReclaimWithGas && (destination === "supplier");
    const needsTransit = requiresInternalHWCN || requiresSupplierHWCN;

    if (!needsTransit) {
      const finalDest = destination === "engineer" ? "van" : destination;
      let finalLocationId = "";
      
      let effectiveEngineerName = activeVehicleOwner || user?.name;
      if (destination === "engineer") {
        const targetUser = engineers.find(e => e.id === selectedEngineer);
        finalLocationId = `${targetUser?.name || "Engineer"} - Van`;
        effectiveEngineerName = targetUser?.name || user?.name;
      } else if (destination === "van") {
        finalLocationId = `${activeVehicleOwner || user?.name} - Van`;
        effectiveEngineerName = activeVehicleOwner || user?.name;
      } else if (destination === "office") {
        finalLocationId = "HQ-Stores";
        effectiveEngineerName = activeVehicleOwner || user?.name;
      } else if (destination === "site") {
        const cleanJob = (locationId || "").trim().replace(/\s+/g, "").toUpperCase();
        if (!/^[A-Za-z]\d+$/.test(cleanJob)) {
          alert("Job number must start with 1 letter followed by numbers without spaces (e.g. J12345, M98201).");
          setIsSubmitting(false);
          return;
        }
        finalLocationId = cleanJob;
        effectiveEngineerName = activeVehicleOwner || user?.name;
      } else if (destination === "other") {
        finalLocationId = `${customDestination.name}, ${customDestination.address}, ${customDestination.postcode}`;
        effectiveEngineerName = activeVehicleOwner || user?.name;
      } else {
        finalLocationId = locationId || (destination === "supplier" ? "Supplier" : `${activeVehicleOwner || user?.name} - Van`);
      }

      const targetVanReg = (finalDest === "van") ? (activeVehicleReg || vehicleReg || user?.vehicleReg) : undefined;
      await db.updateBottleLocation(serialParam, finalDest as any, finalLocationId, undefined, undefined, undefined, effectiveEngineerName, targetVanReg, user?.name);
      
      // If returning directly to supplier or office, also update status
      if (destination === "supplier" || destination === "office") {
        const updates: any = { status: destination === "supplier" ? "returned" : "active" };
        if (destination === "supplier") {
          updates.supplier_hwcn_photo_pending = false; // Non-reclaim doesn't need a photo
        }
        await db.updateBottle(serialParam, updates);
      }
    } else {
      // In transit (Requires HWCN or Supplier Document)
      let finalLocationId = destination === "office" ? "HQ-Stores" : destination === "other" ? customDestination.name : locationId || "Supplier";
      if (destination === "van") {
         finalLocationId = intendedDest; // If they clicked 'Transfer to Van', the actual destination is their chosen intendedDest
      }
      const fullDestinationString = destination === "other" ? `${customDestination.name}, ${customDestination.address}, ${customDestination.postcode}` : finalLocationId;
      
      const targetVanReg = activeVehicleReg || vehicleReg || user?.vehicleReg;
      let hwcnId = undefined;
      if (requiresInternalHWCN) {
        // Query prior completed HWCNs to determine incremental weight and cross-reference
        const priorHwcns = await db.getHWCNsForBottle(serialParam);
        const priorCompleted = (priorHwcns || []).filter((h: any) => h.hwcnStatus === "complete");
        const lastPrior = priorCompleted.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        const priorConsignedWeight = priorCompleted.reduce((sum: number, h: any) => sum + Number(h.incrementalWeight || h.fillWeight || 0), 0);
        
        // Check if any gas from prior consignment was recharged on site
        const usageLogs = await db.getUsageLogs(serialParam);
        const rechargeLogs = (usageLogs || []).filter(
          (l: any) => (l.jobType === "recycled_charge" || l.jobType === "service") &&
          (!lastPrior || new Date(l.date).getTime() >= new Date(lastPrior.date).getTime())
        );
        const rechargedSincePrior = rechargeLogs.reduce((sum: number, l: any) => sum + Number(l.weightUsed || 0), 0);
        const netPriorRemaining = Math.max(0, priorConsignedWeight - rechargedSincePrior);

        const currentTotal = bottle?.currentWeight || 0;
        const incremental = priorCompleted.length > 0 ? Math.max(0, currentTotal - netPriorRemaining) : currentTotal;

        const cleanedSites = hwcnSites.map((s: any) => ({
          ...(s.jobNumber ? { jobNumber: s.jobNumber } : {}),
          name: (s.name || "").trim(),
          address: (s.address || "").trim(),
          postcode: (s.postcode || "").trim()
        }));

        await db.updateBottle(serialParam, { producer_sites: cleanedSites });

        hwcnId = await db.createHWCN({
          serial: serialParam,
          destination: intendedDest || fullDestinationString,
          sites: cleanedSites,
          vehicleReg: targetVanReg || vehicleReg,
          engineer: carrierName || user?.name,
          date: new Date().toISOString(),
          gasType: bottle?.gasType || "Unknown",
          fillWeight: incremental > 0 ? incremental : currentTotal,
          incrementalWeight: incremental > 0 ? incremental : currentTotal,
          priorHWCN: lastPrior ? lastPrior.id : undefined,
          priorWeight: priorConsignedWeight > 0 ? priorConsignedWeight : undefined,
          totalCylinderWeight: currentTotal
        });
        setGeneratedHWCN(hwcnId);
      }
      
      let intendedLocType = destination;
      if (destination === "van") {
        intendedLocType = intendedDest === "HQ-Stores" ? "office" : "site";
      }

      await db.updateBottleLocation(
        serialParam,
        "van",
        `${activeVehicleOwner || user?.name} - Van`,
        intendedDest || fullDestinationString,
        intendedLocType as any,
        hwcnId,
        activeVehicleOwner || user?.name,
        targetVanReg,
        user?.name
      );
    }

    if (isDiscrepancy) {
      await db.createNotification({
        type: "location_discrepancy",
        title: "Location Discrepancy Reported",
        message: `${user?.name} has recorded Bottle ${serialParam} was in his van, but the app stated it was in ${bottle?.locationId || "Central Stores"}.`,
        metadata: { serial: serialParam, reportedBy: user?.name, oldLocation: bottle?.locationId || "Central Stores", newLocation: destination }
      });
    }

    hasSubmittedRef.current = true;
    setIsDirty(false);
    setCustomMessage(undefined);

    // Redirect immediately if no HWCN was generated, otherwise show success screen with HWCN link
    if (requiresInternalHWCN || (needsTransit && isReclaimWithGas && (destination === "office" || destination === "other"))) {
      setIsSubmitting(false);
      setIsSuccess(true);
    } else {
      router.replace("/engineer");
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <CheckCircle2 size={64} color="var(--success)" />
        <h2>{generatedHWCN ? "Transfer Started!" : "Transfer Complete!"}</h2>
        <p>
          {generatedHWCN 
            ? `Bottle ${serialParam} is in Transit in ${user?.name}'s Van.` 
            : `Bottle ${serialParam} has been moved to ${destination}.`}
        </p>
        
        {generatedHWCN ? (
          <div style={{marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
            <p style={{color: 'var(--warning)', fontWeight: '600'}}>A Digital HWCN was generated for this movement.</p>
            <Link href={`/engineer/hwcn/${encodeURIComponent(generatedHWCN)}`} replace style={{textDecoration: 'none'}}>
              <button className={styles.primaryBtn} style={{width: '100%', background: 'linear-gradient(135deg, var(--warning) 0%, #ff8800 100%)', color: '#000'}}>
                View / Download Digital HWCN
              </button>
            </Link>
            <button onClick={() => router.replace("/engineer")} className={styles.primaryBtn} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)', marginTop: '0' }}>
              Return to Dashboard
            </button>
          </div>
        ) : (
          <button onClick={() => router.replace("/engineer")} className={styles.primaryBtn}>
            Return to Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          type="button"
          onClick={() => {
            if (reclaimFlowStep === "confirm_supplier_hwcn") {
              setReclaimFlowStep("ask_supplier");
            } else if (reclaimFlowStep === "supplier_start_transit") {
              setReclaimFlowStep("confirm_supplier_hwcn");
            } else if (reclaimFlowStep === "standard" && (reclaimFlowPath === "alternative" || reclaimFlowPath === "supplier_direct")) {
              setReclaimFlowPath("normal");
              setIntendedDest("");
              setReclaimFlowStep("ask_supplier");
            } else if (reclaimFlowStep === "divert_to_site" || reclaimFlowStep === "divert_to_office") {
              setReclaimFlowStep("divert_destination");
            } else if (reclaimFlowStep === "divert_destination" || reclaimFlowStep === "divert_supplier_branch") {
              setReclaimFlowStep("in_transit");
            } else {
              { const dest = `/engineer/bottle/${encodeURIComponent(serialParam)}`; if (requestNavigate(dest)) router.replace(dest); };
            }
          }}
          className={styles.backBtn}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{color: "var(--text-main)", fontSize: "1.5rem", margin: 0}}>
            {isDiscrepancy 
              ? "Report Location Mismatch" 
              : (bottle?.locationType === "site" || bottle?.locationType === "office" 
                  ? "Transfer to Van" 
                  : "Transfer Location")}
          </h1>
          <p style={{fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.25rem 0 0"}}>
            {isDiscrepancy 
              ? "Select where this bottle is actually located" 
              : (bottle?.locationType === "office" ? "Picking up from HQ-Stores" : `Bottle ${serialParam}`)}
          </p>
          {bottle?.intendedDestination && (
            <div style={{marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255, 187, 0, 0.1)', borderLeft: '3px solid var(--warning)', borderRadius: '4px'}}>
              <span style={{fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'}}>Intended Destination</span>
              <div style={{fontSize: '0.9rem', color: '#fff', fontWeight: 600}}>{bottle.intendedDestination}</div>
            </div>
          )}
        </div>
      </header>
      
      {bottle && (
        <div 
          className={`${styles.bottleInfoCard} glass-panel`}
          style={{ 
            marginBottom: '1.5rem',
            borderLeft: '4px solid',
            borderLeftColor: 
              bottle.category === "recycled" ? "#10b981" :
              bottle.category === "reclaim" ? "var(--warning)" : 
              bottle.category === "nitrogen" ? "#22c55e" : "var(--primary)",
            background: 
              bottle.category === "recycled" ? "rgba(16, 185, 129, 0.05)" :
              bottle.category === "reclaim" ? "rgba(255, 170, 0, 0.03)" : 
              bottle.category === "nitrogen" ? "rgba(34, 197, 94, 0.03)" : "rgba(0, 229, 255, 0.03)"
          }}
        >
          <div className={styles.bottleHeader}>
            <div className={styles.bottleType}>
              {bottle.category === "recycled" ? (
                <Recycle size={20} color="#10b981" />
              ) : bottle.category === "reclaim" ? (
                <AlertTriangle size={20} color="var(--warning)" />
              ) : (
                <div 
                  className={styles.dot} 
                  style={{ 
                    background: bottle.category === "nitrogen" ? "#22c55e" : "var(--primary)" 
                  }} 
                />
              )}
              <span style={{ 
                color: 
                  bottle.category === "recycled" ? "#10b981" :
                  bottle.category === "reclaim" ? "var(--warning)" : 
                  bottle.category === "nitrogen" ? "#22c55e" : "var(--primary)" 
              }}>
                {bottle.category === "new" ? "New Refrigerant" : 
                 bottle.category === "recycled" ? "Recycled Bottle" :
                 bottle.category === "nitrogen" ? "Nitrogen" : "Reclaim / Haz"}
              </span>
            </div>
            <span className={styles.serial}>{bottle.serial}</span>
          </div>

          <div className={styles.bottleStats} style={{display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: '0.85rem'}}>
            {/* Left Column: Core Info */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: 0}}>
              <div style={{fontSize: '0.85rem'}}>
                <span style={{color: 'var(--text-muted)'}}>Gas Type: </span>
                <strong style={{color: '#fff'}}>{bottle.gasType}</strong>
              </div>
              <div style={{fontSize: '0.85rem'}}>
                <span style={{color: 'var(--text-muted)'}}>Location: </span>
                <strong style={{color: '#fff', textTransform: 'capitalize'}}>{bottle.locationId || bottle.locationType}</strong>
              </div>
            </div>

            {/* Right Column: Weights */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.45rem', textAlign: 'right', minWidth: '125px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.85rem'}}>
                <span style={{color: 'var(--text-muted)'}}>Filled:</span>
                <strong style={{color: bottle.category === 'reclaim' ? 'var(--warning)' : 'var(--success)'}}>{isBottleTrace(bottle) ? "Trace" : `${(bottle.currentWeight || 0).toFixed(2)} kg`}</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.85rem'}}>
                <span style={{color: 'var(--text-muted)'}}>{bottle.category === 'reclaim' ? 'Capacity:' : 'Initial:'}</span>
                <strong style={{color: '#fff'}}>{(bottle.initialWeight || 0).toFixed(2)} kg</strong>
              </div>
            </div>
          </div>

          {((bottle.locationType === "site" && currentSiteCrmMatch && (currentSiteCrmMatch.siteTitle || currentSiteCrmMatch.customer || currentSiteCrmMatch.jobTitle)) ||
            ((destination === "supplier" && locationId) || (intendedDest) || bottle.intendedDestination)) && (
            <div style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              {bottle.locationType === "site" && currentSiteCrmMatch && (
                <>
                  {(currentSiteCrmMatch.siteTitle || currentSiteCrmMatch.customer) && (
                    <div style={{fontSize: '0.85rem', lineHeight: 1.4}}>
                      <span style={{color: 'var(--text-muted)'}}>Site: </span>
                      <strong style={{color: 'var(--primary)'}}>
                        {String(currentSiteCrmMatch.siteTitle || currentSiteCrmMatch.customer).replace(/,(?!\s)/g, ", ")}
                      </strong>
                    </div>
                  )}
                  {currentSiteCrmMatch.jobTitle && (
                    <div style={{fontSize: '0.85rem', lineHeight: 1.4}}>
                      <span style={{color: 'var(--text-muted)'}}>Job Name: </span>
                      <strong style={{color: '#fff'}}>{currentSiteCrmMatch.jobTitle}</strong>
                    </div>
                  )}
                </>
              )}
              {((destination === "supplier" && locationId) || (intendedDest) || bottle.intendedDestination) && (
                <div style={{fontSize: '0.85rem', lineHeight: 1.4}}>
                  <span style={{color: 'var(--text-muted)'}}>Intended Destination: </span>
                  <strong style={{color: 'var(--warning)'}}>
                    {destination === "supplier" && locationId && bottle.supplier
                      ? `${bottle.supplier} - ${locationId}`
                      : (intendedDest || (bottle.intendedLocationType === 'supplier' && bottle.supplier && bottle.intendedDestination
                        ? `${bottle.supplier} - ${bottle.intendedDestination}`
                        : bottle.intendedDestination))}
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {reclaimFlowStep === "loading" && (
        <div style={{padding: '2rem', textAlign: 'center'}}>
          <div className={styles.spinner} style={{margin: '0 auto'}}></div>
        </div>
      )}

      {reclaimFlowStep === "in_transit" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginTop: '2rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
            <Truck size={24} color="var(--primary)" />
            <h3 style={{color: 'var(--primary)', margin: 0}}>In Transit</h3>
          </div>
          <p style={{marginBottom: '1.5rem', fontSize: '0.95rem'}}>
            This bottle is currently in transit to <strong>{bottle?.intendedDestination}</strong>.
          </p>
          <p style={{marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)'}}>
            Have you arrived at the intended destination?
          </p>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>

            {/* §3.1 — Supplier Intended Destination */}
            {bottle?.intendedLocationType === "supplier" && (
              <>
                <button 
                  type="button"
                  className={styles.primaryBtn} 
                  style={{background: 'var(--warning)', color: '#000'}}
                  onClick={() => setReclaimFlowStep("intercept_supplier_photo")}
                >
                  <CheckCircle2 size={18} /> Yes, Arrived at Intended Destination
                </button>
                <button 
                  type="button"
                  className={styles.primaryBtn} 
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                  onClick={() => setReclaimFlowStep("divert_supplier_branch")}
                >
                  Arrived at a DIFFERENT Supplier Branch
                </button>
                <button 
                  type="button"
                  className={styles.primaryBtn} 
                  style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                  onClick={() => setReclaimFlowStep("divert_destination")}
                >
                  No, Changing Bottle Route
                </button>
              </>
            )}

            {/* §3.2 — HQ-Stores Intended Destination */}
            {bottle?.intendedLocationType !== "supplier" && (
              <>
                {/* Bottle is at a site (picked up from a job) — load back to van to continue transit */}
                {bottle?.locationType !== 'van' && (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    style={{ background: 'var(--primary)', color: '#000' }}
                    onClick={async () => {
                      hasSubmittedRef.current = true;
                      setIsDirty(false);
                      const intLocType = bottle?.intendedDestination === "HQ-Stores" ? "office" : "site";
                      await db.updateBottleLocation(
                        serialParam,
                        "van",
                        `${activeVehicleOwner || user?.name} - Van`,
                        bottle.intendedDestination,
                        intLocType as any,
                        bottle.activeHWCN,
                        activeVehicleOwner || user?.name,
                        activeVehicleReg || user?.vehicleReg,
                        user?.name
                      );
                      router.replace("/engineer");
                    }}
                  >
                    <Truck size={18} /> Loaded — Continue Transit to {bottle?.intendedDestination}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.primaryBtn}
                  style={{background: 'var(--warning)', color: '#000'}}
                  onClick={async () => {
                    hasSubmittedRef.current = true;
                    setIsDirty(false);
                    await db.completeTransit(serialParam, undefined, user?.name);
                    router.replace("/engineer");
                  }}
                >
                  <CheckCircle2 size={18} /> Complete Transfer to HQ-Stores
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                  onClick={() => setReclaimFlowStep("divert_destination")}
                >
                  No, Transfer to Alternative Location
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* §4.1 — Destination Changed: Where instead? */}
      {reclaimFlowStep === "divert_destination" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Where are you transferring the bottle instead?</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.primaryBtn}
              onClick={() => setReclaimFlowStep("divert_to_site")}
            >
              <MapPin size={18} /> To a Job Site
            </button>
            <button 
              type="button"
              className={styles.primaryBtn} 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
              onClick={() => setReclaimFlowStep("divert_to_office")}
            >
              <Building2 size={18} /> To HQ-Stores
            </button>
            <button 
              type="button"
              style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem' }}
              onClick={() => setReclaimFlowStep("in_transit")}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* §4.2 — Divert to Job Site */}
      {reclaimFlowStep === "divert_to_site" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--primary)', marginBottom: '1rem'}}>Transfer to Job Site</h3>
          <div className={styles.inputGroup} style={{marginBottom: '1.5rem'}}>
            <label>Job Number (e.g. J12345, M98201)</label>
            <input 
              type="text" 
              placeholder="e.g. J12345" 
              pattern="^[A-Za-z][0-9]+$"
              title="Job number must start with 1 letter followed by numbers without spaces (e.g. J12345)"
              value={divertSiteJobNo} 
              onChange={(e) => setDivertSiteJobNo(e.target.value.replace(/\s+/g, "").toUpperCase())}
              required
            />
            {divertCrmMatch && (
              <div style={{marginTop: "0.5rem", padding: "0.6rem 0.75rem", background: "rgba(0, 229, 255, 0.08)", border: "1px solid rgba(0, 229, 255, 0.25)", borderRadius: "8px", fontSize: "0.8rem", lineHeight: 1.45}}>
                {(divertCrmMatch.siteTitle || divertCrmMatch.customer) && (
                  <div style={{color: "var(--primary)", fontWeight: 600}}>
                    ✓ Site: {divertCrmMatch.siteTitle || divertCrmMatch.customer}
                  </div>
                )}
                {divertCrmMatch.jobTitle && (
                  <div style={{color: "#fff", marginTop: "0.15rem"}}>
                    <span style={{color: "var(--text-muted)"}}>Title: </span>{divertCrmMatch.jobTitle}
                  </div>
                )}
                {(divertCrmMatch.siteAddress || divertCrmMatch.sitePostcode) && (
                  <div style={{color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.15rem"}}>
                    {[divertCrmMatch.siteAddress, divertCrmMatch.sitePostcode].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.primaryBtn} 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
              onClick={() => setReclaimFlowStep("divert_destination")}
            >
              Back
            </button>
            <button 
              type="button" 
              className={styles.primaryBtn} 
              disabled={!divertSiteJobNo || isSubmitting}
              onClick={async () => {
                const cleanJob = (divertSiteJobNo || "").trim().replace(/\s+/g, "").toUpperCase();
                if (!/^[A-Za-z]\d+$/.test(cleanJob)) {
                  alert("Job number must start with 1 letter followed by numbers without spaces (e.g. J12345, M98201).");
                  return;
                }
                setIsSubmitting(true);
                await db.clearTransitState(serialParam);
                await db.updateBottleLocation(
                  serialParam,
                  "site",
                  cleanJob,
                  undefined,
                  undefined,
                  undefined,
                  activeVehicleOwner || user?.name,
                  undefined,
                  user?.name
                );
                hasSubmittedRef.current = true;
                setIsDirty(false);
                router.replace("/engineer");
              }}
              style={{flex: 1}}
            >
              {isSubmitting ? "Transferring..." : "Confirm Transfer to Site"}
            </button>
          </div>
        </div>
      )}

      {/* §4.3 — Divert to Office (auto-generate Internal HWCN) */}
      {reclaimFlowStep === "divert_to_office" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Change Destination to HQ-Stores</h3>
          {bottle?.intendedLocationType === "supplier" && (
            <div style={{background: 'rgba(255, 187, 0, 0.1)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem'}}>
              <p style={{fontSize: '0.85rem', color: 'var(--warning)', margin: 0, lineHeight: 1.5}}>
                The physical Supplier HWCN is no longer applicable. An Internal Digital HWCN will be generated instead.
              </p>
            </div>
          )}
          <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
            The Intended Destination will be changed to <strong>HQ-Stores</strong> and an Internal HWCN will be generated for this movement.
          </p>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button 
              type="button" 
              className={styles.primaryBtn} 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
              onClick={() => setReclaimFlowStep("divert_destination")}
            >
              Back
            </button>
            <button 
              type="button" 
              className={styles.primaryBtn} 
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                // Clear old transit, generate internal HWCN, set new intended dest
                const sites = hwcnSites?.some((s: any) => s.name || s.address || s.postcode)
                  ? hwcnSites.map((s: any) => ({
                      ...(s.jobNumber ? { jobNumber: s.jobNumber } : {}),
                      name: (s.name || "").trim(),
                      address: (s.address || "").trim(),
                      postcode: (s.postcode || "").trim()
                    }))
                  : bottle?.producerSites?.length > 0 
                  ? bottle.producerSites 
                  : [{name: "Unknown Site", address: "See recovery logs", postcode: ""}];
                const targetVanReg = activeVehicleReg || vehicleReg || user?.vehicleReg;
                
                const priorHwcns = await db.getHWCNsForBottle(serialParam);
                const priorCompleted = (priorHwcns || []).filter((h: any) => h.hwcnStatus === "complete");
                const lastPrior = priorCompleted.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                const priorConsignedWeight = priorCompleted.reduce((sum: number, h: any) => sum + Number(h.incrementalWeight || h.fillWeight || 0), 0);
                const currentTotal = bottle?.currentWeight || 0;
                const incremental = priorCompleted.length > 0 ? Math.max(0, currentTotal - priorConsignedWeight) : currentTotal;

                const hwcnId = await db.createHWCN({
                  serial: serialParam,
                  destination: "HQ-Stores",
                  sites: sites,
                  vehicleReg: targetVanReg,
                  engineer: carrierName || user?.name,
                  date: new Date().toISOString(),
                  gasType: bottle?.gasType || "Unknown",
                  fillWeight: incremental > 0 ? incremental : currentTotal,
                  incrementalWeight: incremental > 0 ? incremental : currentTotal,
                  priorHWCN: lastPrior ? lastPrior.id : undefined,
                  priorWeight: priorConsignedWeight > 0 ? priorConsignedWeight : undefined,
                  totalCylinderWeight: currentTotal
                });
                await db.updateBottleLocation(
                  serialParam,
                  "van",
                  `${activeVehicleOwner || user?.name} - Van`,
                  "HQ-Stores",
                  "office" as any,
                  hwcnId,
                  activeVehicleOwner || user?.name,
                  targetVanReg,
                  user?.name
                );
                setIsSubmitting(false);
                setGeneratedHWCN(hwcnId);
                setIsSuccess(true);
              }}
              style={{flex: 1}}
            >
              {isSubmitting ? "Generating..." : "Confirm — Generate Internal HWCN"}
            </button>
          </div>
        </div>
      )}

      {reclaimFlowStep === "divert_supplier_branch" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Divert to Different Branch</h3>
          <div className={styles.inputGroup} style={{marginBottom: '1.5rem'}}>
            <label>New Branch Name</label>
            <input 
              type="text" 
              placeholder="e.g. A-Gas Bristol" 
              value={divertedBranch} 
              onChange={(e) => setDivertedBranch(e.target.value)}
              required
            />
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.primaryBtn} 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
              onClick={() => setReclaimFlowStep("in_transit")}
            >
              Back
            </button>
            <button 
              type="button"
              className={styles.primaryBtn} 
              disabled={!divertedBranch}
              onClick={() => setReclaimFlowStep("intercept_supplier_photo")}
              style={{flex: 1}}
            >
              Proceed to Photo Upload
            </button>
          </div>
        </div>
      )}

      {reclaimFlowStep === "intercept_supplier_photo" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Supplier Paperwork Upload</h3>
          <p style={{fontSize: '0.9rem', marginBottom: '1.5rem'}}>
            You are dropping off a hazardous waste bottle at a supplier. Please take a photo of the completed physical HWCN provided by the supplier.
          </p>
          <div className={styles.inputGroup} style={{marginBottom: '1.5rem'}}>
            <input 
              type="file" 
              accept="image/*" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const compressed = await compressImage(file);
                  setSupplierPhoto(compressed);
                }
              }}
              style={{padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '2px dashed var(--warning)', color: 'var(--text-main)', width: '100%'}} 
            />
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.primaryBtn} 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)', flex: '0 0 auto', padding: '0 1.5rem' }}
              onClick={() => {
                if (divertedBranch) {
                  setReclaimFlowStep("divert_supplier_branch");
                } else {
                  setReclaimFlowStep("in_transit");
                }
              }}
            >
              Back
            </button>
            <button 
              type="button"
              className={styles.primaryBtn} 
              disabled={!supplierPhoto || isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                // Use divertedBranch if set, otherwise original intended destination
                const finalLocId = divertedBranch || bottle?.intendedDestination || "Supplier";
                const photoUrl = supplierPhoto ? await uploadHwcnPhoto(supplierPhoto, serialParam) : undefined;
                await db.completeTransit(serialParam, photoUrl, user?.name, finalLocId);
                hasSubmittedRef.current = true;
                setIsDirty(false);
                router.replace("/engineer");
              }}
              style={{flex: 1, opacity: (!supplierPhoto || isSubmitting) ? 0.5 : 1}}
            >
              {isSubmitting ? "Uploading..." : "Upload & Complete Return"}
            </button>
          </div>
        </div>
      )}

      {reclaimFlowStep === "ask_supplier" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Hazardous Waste Transfer</h3>
          {(bottle?.producerSites?.length || 0) <= 1 ? (
            <>
              <p style={{marginBottom: '1.5rem', fontSize: '0.9rem'}}>This bottle contains reclaimed gas. Is it being returned Direct to Supplier, or moving to HQ-Stores / staying on your van for the next job?</p>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <button 
                  type="button"
                  className={styles.primaryBtn} 
                  onClick={() => setReclaimFlowStep("confirm_supplier_hwcn")}
                >
                  Direct to Supplier (Supplier Paperwork)
                </button>
                <button 
                  type="button"
                  className={styles.primaryBtn} 
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                  onClick={() => {
                    setIntendedDest("HQ-Stores");
                    setReclaimFlowPath("alternative");
                    setDestination("van");
                    setReclaimFlowStep("standard");
                  }}
                >
                  To HQ-Stores / Keep on Van for Next Job (Internal HWCN)
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', marginTop: '0.25rem' }}
                  onClick={() => { const dest = `/engineer/bottle/${encodeURIComponent(serialParam)}`; if (requestNavigate(dest)) router.replace(dest); }}
                >
                  <ArrowLeft size={18} /> Back
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{background: 'rgba(255, 187, 0, 0.1)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem'}}>
                <p style={{fontSize: '0.85rem', color: 'var(--warning)', margin: 0, lineHeight: 1.5}}>
                  <strong style={{display: 'block', marginBottom: '0.25rem'}}>Multiple Producer Sites Detected</strong>
                  This bottle contains waste from multiple locations. Suppliers only accept waste from a single producer per HWCN. This bottle must be returned to the <strong>HQ-Stores</strong> for internal consolidation.
                </p>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                <button 
                  type="button"
                  className={styles.primaryBtn} 
                  onClick={() => {
                    setIntendedDest("HQ-Stores");
                    setReclaimFlowPath("alternative");
                    setDestination("van");
                    setReclaimFlowStep("standard");
                  }}
                >
                  Transfer to HQ-Stores
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  onClick={() => { const dest = `/engineer/bottle/${encodeURIComponent(serialParam)}`; if (requestNavigate(dest)) router.replace(dest); }}
                >
                  <ArrowLeft size={18} /> Back
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {reclaimFlowStep === "confirm_supplier_hwcn" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Supplier Paperwork</h3>

          <div style={{background: 'rgba(255, 170, 0, 0.08)', border: '1px solid rgba(255, 170, 0, 0.4)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem'}}>
            <p style={{fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 700, margin: '0 0 0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Write this on the supplier's paperwork</p>
            <p style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 0.5rem'}}>Carrier Registration Number (CBDU):</p>
            <p style={{fontSize: '1.4rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-geist-mono)', margin: 0, letterSpacing: '0.1em'}}>{carrierRegNo}</p>
          </div>

          <label style={{display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px'}}>
            <input 
              type="checkbox" 
              checked={supplierHwcnConfirmed}
              onChange={(e) => setSupplierHwcnConfirmed(e.target.checked)}
              style={{width: '24px', height: '24px', flexShrink: 0}}
            />
            <span style={{fontSize: '0.9rem', lineHeight: '1.4'}}>I confirm I have completed the Supplier's physical HWCN paperwork for this return.</span>
          </label>

          <div className={styles.inputGroup} style={{marginBottom: '1.5rem'}}>
            <label style={{color: 'var(--warning)'}}>Intended Destination Branch</label>
            <input 
              type="text" 
              placeholder="e.g. A-Gas Portbury" 
              value={intendedBranch} 
              onChange={(e) => setIntendedBranch(e.target.value)} 
              required
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--warning)' }}
            />
            <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>Specify which supplier branch this waste is being returned to.</p>
          </div>

          <div style={{display: 'flex', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.primaryBtn} 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)', flex: '0 0 auto', padding: '0 1.5rem' }}
              onClick={() => setReclaimFlowStep("ask_supplier")}
            >
              Back
            </button>
            <button 
              type="button"
              className={styles.primaryBtn} 
              disabled={!supplierHwcnConfirmed || !intendedBranch}
              onClick={() => {
                setDestination("supplier");
                setReclaimFlowStep("supplier_start_transit");
              }}
              style={{flex: 1, opacity: supplierHwcnConfirmed ? 1 : 0.5}}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {reclaimFlowStep === "supplier_start_transit" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginTop: '2rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
            <Truck size={24} color="var(--primary)" />
            <h3 style={{color: 'var(--primary)', margin: 0}}>Load Bottle & Start Transit</h3>
          </div>
          <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
            Paperwork confirmed. Load the bottle into your van and confirm below to start transit to the Supplier.
          </p>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button
              type="button"
              className={styles.primaryBtn}
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)', flex: '0 0 auto', padding: '0 1.5rem' }}
              onClick={() => setReclaimFlowStep("confirm_supplier_hwcn")}
            >
              Back
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                const targetVanReg = activeVehicleReg || vehicleReg || user?.vehicleReg;
                await db.updateBottleLocation(
                  serialParam,
                  "van",
                  `${activeVehicleOwner || user?.name} - Van`,
                  intendedBranch,
                  "supplier" as any,
                  undefined,
                  activeVehicleOwner || user?.name,
                  targetVanReg,
                  user?.name
                );
                setIsSubmitting(false);
                setGeneratedHWCN(null);
                setIsSuccess(true);
              }}
              style={{flex: 1}}
            >
              {isSubmitting
                ? <span className={styles.spinner} />
                : <><CheckCircle2 size={18} /> Bottle in Van — Start Transit</>
              }
            </button>
          </div>
        </div>
      )}

      {reclaimFlowStep === "standard" && (
        <form onSubmit={handleTransfer} className={styles.form}>
          <div className={styles.readonlyField}>
            <span className={styles.label}>Cylinder Serial Number</span>
            <span className={styles.value}>{serialParam}</span>
          </div>

          <div className={styles.inputGroup}>
            <label style={{marginBottom: "1rem", display: "block"}}>
              {isDiscrepancy 
                ? "Where is this bottle actually located?" 
                : (bottle?.locationType === "site" || bottle?.locationType === "office" ? "Confirm Movement" : "Select New Location")}
            </label>
            
            {(bottle?.locationType === "site" || bottle?.locationType === "office") && !isDiscrepancy ? (
              <div style={{marginTop: "0.5rem", marginBottom: "1.5rem"}}>
                <ActiveVehicleBanner />
                <div style={{
                  padding: "1rem 1.25rem", border: "1px solid var(--primary)", borderRadius: "12px",
                  background: "rgba(0, 229, 255, 0.05)", color: "#fff",
                  fontSize: "0.9rem"
                }}>
                  This cylinder will be transferred into your selected active van stock above.
                  {bottle?.category === "reclaim" && bottle?.locationType === "site" && !wasteAddedOnVisit && (
                    <div style={{marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)"}}>
                      No waste refrigerant was recovered on this site visit. Moving directly into van stock without raising a Waste Transfer Note.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem"}}>
                {/* SITE */}
                {reclaimFlowPath === "normal" && (
                  <button 
                    type="button"
                    onClick={() => setDestination("site")}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
                      padding: "1.5rem 1rem", borderRadius: "12px", border: destination === "site" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                      background: destination === "site" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                      color: destination === "site" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    <MapPin size={32} />
                    <span style={{fontSize: "0.9rem", fontWeight: 600}}>Job Site</span>
                  </button>
                )}

                {/* VAN */}
                {(reclaimFlowPath === "normal" || reclaimFlowPath === "supplier_direct") && (
                  <button 
                    type="button"
                    onClick={() => setDestination("van")}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
                      padding: "1.5rem 1rem", borderRadius: "12px", border: destination === "van" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                      background: destination === "van" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                      color: destination === "van" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    <Truck size={32} />
                    <span style={{fontSize: "0.9rem", fontWeight: 600}}>My Van</span>
                  </button>
                )}

                {/* SUPPLIER */}
                {(reclaimFlowPath === "normal" || reclaimFlowPath === "supplier_direct") && (
                  <button 
                    type="button"
                    onClick={() => setDestination("supplier")}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
                      padding: "1.5rem 1rem", borderRadius: "12px", border: destination === "supplier" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                      background: destination === "supplier" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                      color: destination === "supplier" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    <Building size={32} />
                    <span style={{fontSize: "0.9rem", fontWeight: 600}}>Supplier</span>
                  </button>
                )}

                {/* OFFICE */}
                {(reclaimFlowPath === "normal" || reclaimFlowPath === "alternative") && (
                  <button 
                    type="button"
                    onClick={() => setDestination("office")}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
                      padding: "1.5rem 1rem", borderRadius: "12px", border: destination === "office" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                      background: destination === "office" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                      color: destination === "office" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    <Building2 size={32} />
                    <span style={{fontSize: "0.9rem", fontWeight: 600}}>Office</span>
                  </button>
                )}

                {/* HANDOVER */}
                {(reclaimFlowPath === "normal" || reclaimFlowPath === "supplier_direct") && (
                  <button 
                    type="button"
                    onClick={() => setDestination("engineer")}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
                      padding: "1.5rem 1rem", borderRadius: "12px", border: destination === "engineer" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                      background: destination === "engineer" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                      color: destination === "engineer" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s",
                      gridColumn: "span 2"
                    }}
                  >
                    <Users size={32} />
                    <span style={{fontSize: "0.9rem", fontWeight: 600, textAlign: "center"}}>Handover to another Engineer</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {destination === "other" && (
            <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginTop: '0.5rem', marginBottom: '1rem'}}>
              <h3 style={{color: 'var(--primary)'}}>Destination Details</h3>
              <div className={styles.inputGroup}>
                <label>Facility Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Licensed Waste Facility" 
                  value={customDestination.name}
                  onChange={(e) => setCustomDestination({...customDestination, name: e.target.value})}
                  required 
                />
              </div>
              <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                <label>Address</label>
                <input 
                  type="text" 
                  placeholder="e.g. 123 Industrial Park" 
                  value={customDestination.address}
                  onChange={(e) => setCustomDestination({...customDestination, address: e.target.value})}
                  required 
                />
              </div>
              <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                <label>Postcode</label>
                <input 
                  type="text" 
                  placeholder="e.g. AB12 3CD" 
                  value={customDestination.postcode}
                  onChange={(e) => setCustomDestination({...customDestination, postcode: e.target.value})}
                  required 
                />
              </div>
            </div>
          )}

          {(reclaimFlowPath === "supplier_direct" || reclaimFlowPath === "alternative") && (
            <button 
              type="button" 
              onClick={() => {
                setReclaimFlowStep("ask_supplier");
                setReclaimFlowPath("normal");
              }}
              style={{marginTop: '0.5rem', marginBottom: '1.5rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', width: '100%'}}
            >
              Change Return Route (Reset HWCN Options)
            </button>
          )}

          {destination === "site" && (
            <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginBottom: '1.5rem'}}>
              <h3 style={{color: 'var(--primary)'}}>Job Site Details</h3>
              <div className={styles.inputGroup}>
                <label>Job Number (e.g. J12345, M98201)</label>
                <input 
                  type="text" 
                  value={locationId}
                  pattern="^[A-Za-z][0-9]+$"
                  title="Job number must start with 1 letter followed by numbers without spaces (e.g. J12345)"
                  onChange={(e) => setLocationId(e.target.value.replace(/\s+/g, "").toUpperCase())}
                  placeholder="e.g. J12345" 
                  required 
                />
                {siteCrmMatch && (
                  <div style={{marginTop: "0.5rem", padding: "0.6rem 0.75rem", background: "rgba(0, 229, 255, 0.08)", border: "1px solid rgba(0, 229, 255, 0.25)", borderRadius: "8px", fontSize: "0.8rem", lineHeight: 1.45}}>
                    {(siteCrmMatch.siteTitle || siteCrmMatch.customer) && (
                      <div style={{color: "var(--primary)", fontWeight: 600}}>
                        ✓ Site: {siteCrmMatch.siteTitle || siteCrmMatch.customer}
                      </div>
                    )}
                    {siteCrmMatch.jobTitle && (
                      <div style={{color: "#fff", marginTop: "0.15rem"}}>
                        <span style={{color: "var(--text-muted)"}}>Title: </span>{siteCrmMatch.jobTitle}
                      </div>
                    )}
                    {(siteCrmMatch.siteAddress || siteCrmMatch.sitePostcode) && (
                      <div style={{color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.15rem"}}>
                        {[siteCrmMatch.siteAddress, siteCrmMatch.sitePostcode].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                This allocates the physical bottle to the client's site for audit purposes.
              </p>
            </div>
          )}

          {destination === "engineer" && (
            <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginBottom: '1.5rem'}}>
              <h3 style={{color: 'var(--primary)'}}>Handover Details</h3>
              <div className={styles.inputGroup}>
                <label>Select Engineer</label>
                <select 
                  value={selectedEngineer} 
                  onChange={(e) => setSelectedEngineer(e.target.value)}
                  required
                >
                  <option value="">-- Select Recipient --</option>
                  {engineers.map(eng => (
                    <option key={eng.id} value={eng.id}>{eng.name} ({eng.vehicleReg || "No Van"})</option>
                  ))}
                </select>
              </div>
              <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                This bottle will be transferred to the selected engineer's van stock.
              </p>
            </div>
          )}



          {destination === "supplier" && (
            <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginBottom: '1.5rem'}}>
              <h3 style={{color: 'var(--primary)'}}>Return to {bottle?.supplier || "Supplier"}</h3>
              <div className={styles.inputGroup}>
                <label>Branch Name / Location</label>
                <input 
                  type="text" 
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  placeholder={`e.g. ${bottle?.supplier || "Supplier"} London Branch`} 
                  required={!requiresHWCN}
                />
              </div>
              <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                Enter the branch where this empty bottle was dropped off.
              </p>
            </div>
          )}

          {requiresHWCN && (
            <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '0.5rem', marginBottom: '1.5rem'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
                <Truck size={24} color="var(--warning)" />
                <h3 style={{color: 'var(--warning)', margin: 0}}>Generate Internal HWCN</h3>
              </div>
              <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
                Moving hazardous waste internally requires a digital Consignment Note. Please complete the following legal details.
              </p>

              <div style={{borderLeft: '2px solid var(--warning)', paddingLeft: '1rem', marginBottom: '1.5rem'}}>
                <h4 style={{fontSize: '0.9rem', marginBottom: '0.75rem'}}>Intended Final Destination</h4>
                <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                  <button 
                    type="button"
                    onClick={() => setIntendedDest("HQ-Stores")}
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', transition: 'all 0.2s',
                      background: intendedDest === "HQ-Stores" ? 'rgba(255, 187, 0, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: intendedDest === "HQ-Stores" ? '1px solid var(--warning)' : '1px solid var(--border)',
                      color: intendedDest === "HQ-Stores" ? 'var(--warning)' : 'var(--text-main)'
                    }}
                  >
                    HQ-Stores
                  </button>
                  {(bottle?.producerSites?.length || 0) <= 1 && (
                    <button 
                      type="button"
                      onClick={() => setIntendedDest("Another Job Site")}
                      style={{
                        flex: 1, padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', transition: 'all 0.2s',
                        background: intendedDest === "Another Job Site" ? 'rgba(255, 187, 0, 0.15)' : 'rgba(255,255,255,0.03)',
                        border: intendedDest === "Another Job Site" ? '1px solid var(--warning)' : '1px solid var(--border)',
                        color: intendedDest === "Another Job Site" ? 'var(--warning)' : 'var(--text-main)'
                      }}
                    >
                      Another Job Site
                    </button>
                  )}
                </div>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
                  Where is this hazardous waste eventually being delivered to? This is legally required for the HWCN.
                </p>
              </div>

              <div style={{borderLeft: '2px solid var(--warning)', paddingLeft: '1rem', marginBottom: '1.5rem'}}>
                <h4 style={{fontSize: '0.9rem', marginBottom: '0.75rem'}}>Part A: Producer / Removal Sites</h4>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
                  Enter a Job Number to auto-populate from CRM, or manually type / edit the site name, address, and postcode below.
                </p>

                <div style={{background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.75rem'}}>
                  {hwcnSites.map((s: any, i: number) => (
                    <div key={i} style={{marginBottom: '1rem', paddingBottom: hwcnSites.length > 1 ? '0.85rem' : 0, borderBottom: hwcnSites.length > 1 && i < hwcnSites.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <strong style={{color: 'var(--warning)', fontSize: '0.85rem'}}>Site {i + 1}</strong>
                        {hwcnSites.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setHwcnSites(hwcnSites.filter((_, idx) => idx !== i))}
                            style={{background: 'transparent', border: 'none', color: '#ff4444', fontSize: '0.78rem', cursor: 'pointer'}}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                        <label style={{fontSize: '0.78rem', color: 'var(--text-muted)'}}>Job Number (Auto-fills from CRM if available)</label>
                        <input
                          type="text"
                          placeholder="e.g. J12345, M98201"
                          value={s.jobNumber || ""}
                          onChange={(e) => handleHwcnSiteJobChange(i, e.target.value)}
                        />
                        {s.crmMatched && (
                          <span style={{fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.2rem', display: 'block'}}>
                            ✓ CRM Match: {s.crmMatched} (you can still edit the fields below)
                          </span>
                        )}
                      </div>
                      <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                        <label style={{fontSize: '0.78rem', color: 'var(--text-muted)'}}>Site / Client Name</label>
                        <input
                          type="text"
                          placeholder="Site Name"
                          value={s.name || ""}
                          onChange={(e) => {
                            const newSites = [...hwcnSites];
                            newSites[i] = { ...newSites[i], name: e.target.value };
                            setHwcnSites(newSites);
                          }}
                          required={requiresHWCN}
                        />
                      </div>
                      <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                        <label style={{fontSize: '0.78rem', color: 'var(--text-muted)'}}>Site Address</label>
                        <input
                          type="text"
                          placeholder="Street Address"
                          value={s.address || ""}
                          onChange={(e) => {
                            const newSites = [...hwcnSites];
                            newSites[i] = { ...newSites[i], address: e.target.value };
                            setHwcnSites(newSites);
                          }}
                          required={requiresHWCN}
                        />
                      </div>
                      <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                        <label style={{fontSize: '0.78rem', color: 'var(--text-muted)'}}>Postcode</label>
                        <input
                          type="text"
                          placeholder="e.g. NE1 4XP"
                          value={s.postcode || ""}
                          onChange={(e) => {
                            const newSites = [...hwcnSites];
                            newSites[i] = { ...newSites[i], postcode: e.target.value };
                            setHwcnSites(newSites);
                          }}
                          required={requiresHWCN}
                        />
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setHwcnSites([...hwcnSites, {jobNumber: "", name: "", address: "", postcode: ""}])} style={{background: 'transparent', border: '1px dashed var(--warning)', color: 'var(--warning)', padding: '0.5rem', width: '100%', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'}}>
                    + Add Another Site
                  </button>
                </div>
              </div>

              <div style={{borderLeft: '2px solid var(--warning)', paddingLeft: '1rem', marginBottom: '1.5rem'}}>
                <h4 style={{fontSize: '0.9rem', marginBottom: '0.75rem'}}>Part C: Carrier Certificate</h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  <div className={styles.inputGroup}>
                    <label>Carrier Name</label>
                    <input type="text" value={carrierName} onChange={(e) => setCarrierName(e.target.value)} placeholder="e.g. John Doe" required={requiresHWCN} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Vehicle Registration Number</label>
                    <input type="text" value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value)} placeholder="e.g. AB12 CDE" required={requiresHWCN} />
                  </div>
                </div>
              </div>
              
              <p style={{fontSize: '0.8rem', color: 'var(--warning)', fontStyle: 'italic'}}>
                Waste Producer (Part A5) and Waste Description (Part B) will be automatically pre-filled to legal standards upon generation.
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button
              type="button"
              className={styles.primaryBtn}
              style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-main)", border: "1px solid var(--border)", flex: "0 0 auto", padding: "0 1.5rem" }}
              onClick={() => {
                if (reclaimFlowPath === "alternative" || reclaimFlowPath === "supplier_direct") {
                  setReclaimFlowStep("ask_supplier");
                  setReclaimFlowPath("normal");
                  setIntendedDest("");
                } else {
                  { const dest = `/engineer/bottle/${encodeURIComponent(serialParam)}`; if (requestNavigate(dest)) router.replace(dest); };
                }
              }}
            >
              <ArrowLeft size={18} /> Back
            </button>
            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={isSubmitting || (destination === "site" && !locationId) || (destination === "engineer" && !selectedEngineer)}
              style={{ flex: 1, marginTop: 0 }}
            >
              {isSubmitting ? <span className={styles.spinner}></span> : <><Truck size={20} /> {isDiscrepancy ? "Process Correction" : "Confirm Transfer"}</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
