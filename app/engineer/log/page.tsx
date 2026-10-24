"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Save, ArrowLeft, AlertTriangle, Edit3 } from "lucide-react";
import styles from "./page.module.css";
import Link from "next/link";
import { db, isBottleTrace, hasReclaimWaste } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { useNavigationGuard } from "@/lib/NavigationGuardContext";

type JobType = "service" | "install" | "retrofit" | "recovery" | "waste" | "recycled_charge" | "leak_test";

export default function LogBottlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serialParam = searchParams.get("serial") || "UNKNOWN";
  const modeParam = searchParams.get("mode");
  const isRecycleMode = modeParam === "recycle" || modeParam === "recycled_charge";
  
  const [jobType, setJobType] = useState<JobType>(isRecycleMode ? "recycled_charge" : "service");
  const [refrigerantType, setRefrigerantType] = useState("R410A");
  const [customRefrigerant, setCustomRefrigerant] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [hasAutoFilledJob, setHasAutoFilledJob] = useState(false);
  const [isEditingJobNumber, setIsEditingJobNumber] = useState(false);
  const [producerSite, setProducerSite] = useState({ name: "", address: "", postcode: "" });
  const [initialProducerSite, setInitialProducerSite] = useState({ name: "", address: "", postcode: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Navigation Guard & Dirty Form State Tracking
  const { isDirty, setIsDirty, requestNavigate, setCustomMessage } = useNavigationGuard();
  const [bottleCategory, setBottleCategory] = useState<string | null>(null);
  const [existingProducerSites, setExistingProducerSites] = useState<any[]>([]);
  const [showMultiSiteWarning, setShowMultiSiteWarning] = useState(false);
  const [multiSiteAcknowledged, setMultiSiteAcknowledged] = useState(false);
  const [bottleData, setBottleData] = useState<any>(null);
  const [bottleUsageLogs, setBottleUsageLogs] = useState<any[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasExistingHWCN, setHasExistingHWCN] = useState(false);
  const { user, activeVehicleOwner, activePairing, activePairingStatus } = useAuth();
  const [crmMatch, setCrmMatch] = useState<string | null>(null);

  // Apprentice & Mate Supervision State (SOP-002)
  const [qualifiedEngineers, setQualifiedEngineers] = useState<any[]>([]);
  const [supervisingEngineer, setSupervisingEngineer] = useState("");
  const [supervisingCert, setSupervisingCert] = useState("");

  // Reclaim Cylinder Evacuation Verification (when weight reaches 0)
  const [isFullyEvacuated, setIsFullyEvacuated] = useState<boolean | null>(null);

  interface EquipmentFormItem {
    id: number;
    manufacturer: string;
    model: string;
    serial: string;
    weight: string;
    decommissioned: boolean;
    nominalChargeKg?: string;
    leakCheckResult?: string;
  }

  const [equipmentList, setEquipmentList] = useState<EquipmentFormItem[]>([
    { id: 1, manufacturer: "", model: "", serial: "", weight: "", decommissioned: false }
  ]);

  const totalWeight = equipmentList.reduce((sum, eq) => sum + (parseFloat(eq.weight) || 0), 0);

  const isReclaimCharge = bottleCategory === "reclaim" && (isRecycleMode || jobType === "recycled_charge" || jobType === "service" || jobType === "install");
  const currentBottleWeight = bottleData?.currentWeight || 0;
  const willReachZero = isReclaimCharge && currentBottleWeight > 0 && totalWeight > 0 && Math.max(0, currentBottleWeight - totalWeight) <= 0.001;

  const addEquipment = () => {
    setEquipmentList([...equipmentList, { id: Date.now(), manufacturer: "", model: "", serial: "", weight: "", decommissioned: false }]);
  };

  const updateEquipment = (id: number, field: string, value: string) => {
    const finalValue = (field === "model" || field === "serial") ? value.toUpperCase() : value;
    setEquipmentList(equipmentList.map(eq => eq.id === id ? { ...eq, [field]: finalValue } : eq));
  };

  const removeEquipment = (id: number) => {
    setEquipmentList(equipmentList.filter(eq => eq.id !== id));
  };

  const isFormDirty = useMemo(() => {
    if (isSuccess || isSubmitting) return false;

    // 1. Any equipment details entered
    const hasEquipmentData = equipmentList.some(eq => {
      const weightNum = parseFloat(eq.weight);
      return (
        (!isNaN(weightNum) && weightNum > 0) ||
        (eq.serial && eq.serial.trim().length > 0) ||
        (eq.model && eq.model.trim().length > 0) ||
        (eq.manufacturer && eq.manufacturer.trim().length > 0) ||
        (eq.nominalChargeKg && eq.nominalChargeKg.trim().length > 0) ||
        (eq.leakCheckResult && eq.leakCheckResult !== "pass")
      );
    });

    if (hasEquipmentData) return true;
    if (equipmentList.length > 1) return true;

    // 2. Custom refrigerant entered
    if (customRefrigerant && customRefrigerant.trim().length > 0) return true;

    // 3. Job number entered by user (and not just initial pre-filled bottle location)
    const initialLocation = (bottleData?.locationType === "site" && bottleData?.locationId) ? bottleData.locationId : "";
    if (jobNumber && jobNumber.trim().length > 0 && jobNumber.trim() !== initialLocation.trim()) {
      return true;
    }

    // 4. Producer site manually entered or altered by user (ignoring CRM auto-fill)
    if (
      (producerSite.name || "").trim() !== (initialProducerSite.name || "").trim() ||
      (producerSite.address || "").trim() !== (initialProducerSite.address || "").trim() ||
      (producerSite.postcode || "").trim() !== (initialProducerSite.postcode || "").trim()
    ) {
      return true;
    }

    return false;
  }, [equipmentList, customRefrigerant, jobNumber, producerSite, initialProducerSite, bottleData, isSuccess, isSubmitting]);

  // Synchronize dirty state and custom warning prompt
  useEffect(() => {
    setIsDirty(isFormDirty);
    if (isFormDirty) {
      const weightDesc = totalWeight > 0 ? ` (${totalWeight.toFixed(2)} kg entered)` : "";
      setCustomMessage(
        `You have unsaved gas usage / recovery details${weightDesc}. If you navigate away now, this compliance entry will be discarded and the cylinder balance will NOT be updated.`
      );
    } else {
      setCustomMessage(undefined);
    }
  }, [isFormDirty, totalWeight, setIsDirty, setCustomMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsDirty(false);
    };
  }, [setIsDirty]);

  // Smooth-scroll and highlight save button when user chooses to stay from gate modal
  useEffect(() => {
    const handleFocusSave = () => {
      const saveBtn = document.getElementById("save-compliance-log-btn");
      if (saveBtn) {
        saveBtn.scrollIntoView({ behavior: "smooth", block: "center" });
        saveBtn.focus();
        saveBtn.classList.add(styles.saveButtonPulse);
        setTimeout(() => {
          saveBtn.classList.remove(styles.saveButtonPulse);
        }, 3600);
      }
    };
    window.addEventListener("focus-save-log-button", handleFocusSave);
    return () => window.removeEventListener("focus-save-log-button", handleFocusSave);
  }, []);

  useEffect(() => {
    if (user?.role === "apprentice" || user?.role === "mate") {
      db.getQualifiedEngineers().then(engineers => {
        setQualifiedEngineers(engineers);
        // Default to active working van lead engineer if set
        const lead = activeVehicleOwner || activePairing?.leadEngineerName;
        if (lead) {
          const match = engineers.find(e => e.name.toLowerCase() === lead.toLowerCase());
          if (match) {
            setSupervisingEngineer(match.name);
            setSupervisingCert(match.certificate || "REF1010728 (Cat I)");
          } else {
            setSupervisingEngineer(lead);
            setSupervisingCert("REF1010728 (Cat I)");
          }
        }
      });
    }
  }, [user, activeVehicleOwner, activePairing]);

  useEffect(() => {
    Promise.all([
      db.getBottle(serialParam),
      db.getUsageLogs(serialParam)
    ]).then(([b, logs]) => {
      setBottleUsageLogs(logs || []);
      if (b) {
        setBottleCategory(b.category);
        setBottleData(b);
        if (isRecycleMode || b.category === "recycled") {
          setJobType("recycled_charge");
          setRefrigerantType(b.gasType || "Recycled Gas");
        } else if (b.category === "reclaim") {
          setJobType("recovery");
          const existingGas = (b.gasType || "").trim();
          const isEvacuated =
            !existingGas ||
            existingGas.toLowerCase() === "unused" ||
            existingGas.toLowerCase() === "empty / evacuated" ||
            existingGas.toLowerCase() === "empty/evacuated" ||
            existingGas.toLowerCase() === "mixed/recovery" ||
            existingGas.toLowerCase() === "unknown";

          if (isEvacuated) {
            // Empty / Evacuated cylinder: let engineer select the gas being recovered
            setRefrigerantType("");
          } else {
            const standardGases = ["R410A", "R32", "R134a", "R404A", "R407C", "R22"];
            const matchedStandard = standardGases.find(g => g.toLowerCase() === existingGas.toLowerCase());
            if (matchedStandard) {
              setRefrigerantType(matchedStandard);
            } else if (existingGas.toLowerCase() === "mixed" || existingGas.toLowerCase() === "mixed/recovery") {
              setRefrigerantType("Mixed");
            } else {
              setRefrigerantType("other");
              setCustomRefrigerant(existingGas);
            }
          }
        } else {
          setRefrigerantType(b.gasType || "R410A");
        }
        // Track existing producer sites for multi-site detection (only for reclaim cylinders)
        if (b.category === "reclaim" && b.producerSites && b.producerSites.length > 0) {
          setExistingProducerSites(b.producerSites);
        }
        // Check if an Internal HWCN already exists for this bottle (only for reclaim cylinders with active HWCN)
        if (b.category === "reclaim" && b.activeHWCN) {
          setHasExistingHWCN(true);
        } else if (b.category === "reclaim") {
          // Also check DB for any uncompleted HWCNs linked to this bottle
          db.getHWCNsForBottle(serialParam).then(hwcns => {
            if (hwcns && hwcns.some((h: any) => h.hwcnStatus !== "complete" && h.id === b.activeHWCN)) {
              setHasExistingHWCN(true);
            }
          });
        }
        // Auto-fill Job Number if bottle is on a site
        if (b.locationType === "site" && b.locationId) {
          setJobNumber(b.locationId);
          setHasAutoFilledJob(true);
          setIsEditingJobNumber(false);
          if (b.producerSites && b.producerSites.length > 0) {
            const matchingSite = b.producerSites.find(
              (s: any) => s.name === b.locationId || s.jobNumber === b.locationId
            );
            if (matchingSite) {
              const siteVal = {
                name: matchingSite.name || "",
                address: matchingSite.address || "",
                postcode: matchingSite.postcode || ""
              };
              setProducerSite(siteVal);
              setInitialProducerSite(siteVal);
            }
          }
        } else {
          setIsEditingJobNumber(true);
        }
      }
    });
  }, [serialParam, isRecycleMode]);

  // Determine if a reclaim bottle can re-charge gas on the current job (must strictly match the job where the waste was recovered from)
  const canRechargeReclaimOnCurrentJob = useMemo(() => {
    if (!bottleData || bottleData.category !== "reclaim" || (bottleData.currentWeight || 0) <= 0) {
      return false;
    }

    const normalizeJob = (val?: string | null) => (val || "").trim().replace(/\s+/g, "").toUpperCase();
    const curJobNorm = normalizeJob(jobNumber || bottleData.locationId);
    if (!curJobNorm) return false;

    const regTime = bottleData.registeredAt ? new Date(bottleData.registeredAt).getTime() : 0;
    const currentRecoveryLogs: any[] = [];
    for (const log of bottleUsageLogs) {
      const logTime = log.date ? new Date(log.date).getTime() : 0;
      if (regTime > 0 && logTime > 0 && logTime < regTime - 60000) {
        break;
      }
      if ((log.jobType === "recovery" || log.jobType === "waste" || log.jobType === "retrofit") && Number(log.weightUsed || 0) > 0) {
        currentRecoveryLogs.push(log);
      }
      if (log.weightAfter === 0 && log.jobType !== "recovery") {
        break;
      }
    }

    const producerSites = Array.isArray(bottleData.producerSites) ? bottleData.producerSites : [];
    if (producerSites.length > 1) {
      return false;
    }

    if (producerSites.length === 1) {
      const site = producerSites[0] as any;
      const siteJobNo = normalizeJob(site.jobNumber) || (/^[A-Za-z]\d+$/.test(normalizeJob(site.name)) ? normalizeJob(site.name) : "");
      if (siteJobNo) {
        return siteJobNo === curJobNorm;
      }
      const latestLogJob = normalizeJob(currentRecoveryLogs[0]?.siteRef);
      if (latestLogJob) {
        return latestLogJob === curJobNorm;
      }
      return normalizeJob(site.name) === curJobNorm;
    }

    const distinctRecoveryRefs = Array.from(new Set(
      currentRecoveryLogs.map(l => normalizeJob(l.siteRef)).filter(Boolean)
    ));
    if (distinctRecoveryRefs.length !== 1) {
      return false;
    }

    return distinctRecoveryRefs[0] === curJobNorm;
  }, [bottleData, bottleUsageLogs, jobNumber]);

  useEffect(() => {
    if (bottleCategory === "reclaim" && jobType === "recycled_charge" && !canRechargeReclaimOnCurrentJob && bottleData) {
      setJobType("recovery");
    }
  }, [bottleCategory, jobType, canRechargeReclaimOnCurrentJob, bottleData]);

  useEffect(() => {
    if (!jobNumber || jobNumber.length < 3) {
      setCrmMatch(null);
      return;
    }
    const initialLocation = (bottleData?.locationType === "site" && bottleData?.locationId) ? bottleData.locationId : "";
    const isInitialJob = initialLocation && jobNumber.trim().toUpperCase() === initialLocation.trim().toUpperCase();
    db.getCrmJobByNumber(jobNumber).then(crmJob => {
      if (crmJob) {
        setCrmMatch(crmJob.siteTitle || crmJob.customer || "");
        if (jobType === "recovery") {
          setProducerSite(prev => {
            const next = {
              name: prev.name || crmJob.siteTitle || crmJob.customer || "",
              address: prev.address || crmJob.siteAddress || "",
              postcode: prev.postcode || crmJob.sitePostcode || ""
            };
            if (isInitialJob) {
              setInitialProducerSite(next);
            }
            return next;
          });
        }
      } else {
        setCrmMatch(null);
      }
    });
  }, [jobNumber, jobType, bottleData?.locationType, bottleData?.locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!bottleData) return;

    // Job Number Format Validation (1 letter followed by numbers without spaces)
    const cleanJobNumber = (jobNumber || "").trim().replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Za-z]\d+$/.test(cleanJobNumber)) {
      setValidationError("Job number must start with 1 letter followed by numbers without spaces (e.g. J12345, M98201).");
      return;
    }

    // Apprentice & Mate supervision check
    if ((user?.role === "apprentice" || user?.role === "mate") && !supervisingEngineer.trim()) {
      setValidationError("Supervised gas logging requires selecting an approved Supervising F-Gas Engineer.");
      return;
    }

    const equipmentToSave = equipmentList
      .filter(eq => eq.manufacturer || eq.model || eq.serial)
      .map(eq => ({
        manufacturer: (eq.manufacturer || "").trim(),
        model: (eq.model || "").trim().toUpperCase(),
        serial: (eq.serial || "").trim().toUpperCase(),
        weight: parseFloat(eq.weight) || 0
      }));

    // Weight Validation
    if (jobType === "leak_test") {
      if (equipmentToSave.length === 0) {
        setValidationError("Statutory leak checks require entering at least one equipment item (serial/model) inspected.");
        return;
      }
    } else if (isRecycleMode || jobType === "recycled_charge") {
      const availableReclaim = bottleData.currentWeight || 0;
      if (totalWeight <= 0) {
        setValidationError("Please enter the weight of recycled gas charged into equipment.");
        return;
      }
      if (totalWeight > availableReclaim) {
        setValidationError(`Cannot dispense ${totalWeight.toFixed(2)}kg. Only ${availableReclaim.toFixed(2)}kg of recycled gas is currently in this cylinder.`);
        return;
      }
      if (bottleCategory === "reclaim") {
        const logs = await db.getUsageLogs(serialParam);
        const currentRecoveryLogs: any[] = [];
        for (const log of logs) {
          if (log.jobType === "recovery" || log.jobType === "waste") {
            currentRecoveryLogs.push(log);
          }
          if (log.weightAfter === 0 && log.jobType !== "recovery") {
            break;
          }
        }
        const reclaimedRefs = new Set<string>();
        for (const log of currentRecoveryLogs) {
          if (log.siteRef) reclaimedRefs.add(log.siteRef.trim().replace(/\s+/g, "").toUpperCase());
          if (log.siteName) reclaimedRefs.add(log.siteName.trim().replace(/\s+/g, "").toUpperCase());
        }
        if (bottleData.producerSites && Array.isArray(bottleData.producerSites)) {
          for (const site of bottleData.producerSites) {
            if ((site as any).jobNumber) reclaimedRefs.add(String((site as any).jobNumber).trim().replace(/\s+/g, "").toUpperCase());
            if (site.name) reclaimedRefs.add(site.name.trim().replace(/\s+/g, "").toUpperCase());
          }
        }
        let crmTitleNorm = "";
        if (cleanJobNumber) {
          const crm = await db.getCrmJobByNumber(cleanJobNumber);
          if (crm?.siteTitle) crmTitleNorm = crm.siteTitle.trim().replace(/\s+/g, "").toUpperCase();
        }
        const isMatch = reclaimedRefs.has(cleanJobNumber) || (crmTitleNorm ? reclaimedRefs.has(crmTitleNorm) : false);
        if (!isMatch) {
          setValidationError("Recycled gas from a reclaim cylinder can only be re-charged into equipment on the same job number it was reclaimed from.");
          return;
        }
      }
    } else if (bottleCategory === "reclaim") {
      const currentFill = bottleData.currentWeight || 0;
      const maxFill = bottleData.maxWeight || bottleData.initialWeight || 20; // Default to 20 if not set
      if (currentFill + totalWeight > maxFill) {
        setValidationError(`Cannot add ${totalWeight.toFixed(2)}kg. Bottle only has ${(maxFill - currentFill).toFixed(2)}kg of space left.`);
        return;
      }
    } else if (bottleCategory === "supply" || bottleCategory === "new" || bottleCategory === "recycled") {
      const currentSupply = bottleData.currentWeight || 0;
      if (totalWeight > currentSupply) {
        setValidationError(`Cannot log ${totalWeight.toFixed(2)}kg usage. Only ${currentSupply.toFixed(2)}kg of gas remains in this bottle.`);
        return;
      }
    }

    // §4.2: Check if this is adding a 2nd producer site
    const isRecovery = jobType === "recovery" && bottleCategory !== "recycled";
    const hasExistingSites = existingProducerSites.length > 0;
    
    const currentLocation = (bottleData?.locationId || jobNumber || "").trim().toUpperCase();
    const isSameExistingSite = existingProducerSites.some((s: any) => {
      const sJob = (s.jobNumber || "").trim().toUpperCase();
      const sName = (s.name || "").trim().toUpperCase();
      if (cleanJobNumber && (sJob === cleanJobNumber || sName === cleanJobNumber)) return true;
      if (currentLocation && (sJob === currentLocation || sName === currentLocation)) return true;
      if (producerSite.name && sName === producerSite.name.trim().toUpperCase() && (s.address || "").trim() === (producerSite.address || "").trim()) return true;
      return false;
    });
    const isNewSite = hasExistingSites && !isSameExistingSite;
    
    if (isRecovery && isNewSite && !multiSiteAcknowledged) {
      setShowMultiSiteWarning(true);
      return;
    }

    if (willReachZero && isFullyEvacuated === null) {
      setValidationError("Please confirm whether the cylinder has been fully emptied / vacced.");
      return;
    }
    
    setIsSubmitting(true);
    const finalRefrigerant = refrigerantType === "other" ? customRefrigerant : refrigerantType;

    const derivedJobType = (() => {
      if (jobType === "leak_test") return "leak_test";
      if (isRecycleMode || jobType === "recycled_charge") return "recycled_charge";
      if (jobType === "recovery" || jobType === "waste") return jobType;
      const prefix = (jobNumber || "").split(/[-\s_]/)[0].toUpperCase();
      if (prefix === "C") return "install";
      if (prefix === "M") return "maintenance";
      return "service";
    })();

    await db.logUsage(
      serialParam,
      derivedJobType,
      derivedJobType === "leak_test" ? 0 : totalWeight,
      derivedJobType === "waste",
      derivedJobType === "recovery" ? { ...producerSite, jobNumber: cleanJobNumber } : undefined,
      finalRefrigerant,
      user?.name || "Unknown",
      jobNumber || undefined,
      equipmentToSave.length > 0 ? equipmentToSave : undefined,
      supervisingEngineer || undefined,
      supervisingCert || undefined,
      willReachZero ? (isFullyEvacuated ?? false) : undefined
    );

    // §4.2: If multi-site was acknowledged, auto-generate Internal HWCN and set dest to Office
    if (isRecovery && multiSiteAcknowledged && bottleData) {
      const sites = [...existingProducerSites, { ...producerSite, jobNumber: cleanJobNumber }];
      let vehicleReg = "";
      if (user?.id) {
        const profile = await db.getEngineerById(user.id);
        if (profile?.vehicleReg) vehicleReg = profile.vehicleReg;
      }

      const curGas = (bottleData.gasType || "").trim();
      const isEvacuated =
        !hasReclaimWaste(bottleData) ||
        !curGas ||
        curGas.toLowerCase() === "unused" ||
        curGas.toLowerCase() === "empty / evacuated" ||
        curGas.toLowerCase() === "empty/evacuated" ||
        curGas.toLowerCase() === "mixed/recovery" ||
        curGas === "Unknown";

      let resolvedHwcnGas: string;
      if (isEvacuated) {
        resolvedHwcnGas = finalRefrigerant || "Mixed";
      } else if (curGas.toLowerCase() === "mixed" || curGas.toLowerCase() === "mixed/recovery") {
        resolvedHwcnGas = "Mixed";
      } else if (curGas.toLowerCase() === (finalRefrigerant || "").trim().toLowerCase()) {
        resolvedHwcnGas = curGas;
      } else {
        // Different gas added to bottle that already has gas -> Mixed
        resolvedHwcnGas = "Mixed";
      }

      const hwcnId = await db.createHWCN({
        serial: serialParam,
        destination: "HQ-Stores",
        sites: sites,
        vehicleReg: vehicleReg,
        engineer: user?.name,
        date: new Date().toISOString(),
        gasType: resolvedHwcnGas,
        fillWeight: (bottleData.currentWeight || 0) + totalWeight
      });
      // Update bottle with new intended destination
      await db.updateBottleLocation(serialParam, bottleData.locationType, bottleData.locationId, "HQ-Stores", "office" as any, hwcnId);
    }

    // Log decommissioned equipment if any are flagged
    const decomEquipment = equipmentList.filter(eq => eq.decommissioned && eq.manufacturer);
    if (decomEquipment.length > 0 && isRecovery) {
      try {
        await db.logDecommission({
          bottleSerial: serialParam,
          jobNumber: jobNumber,
          siteName: producerSite.name || jobNumber,
          siteAddress: producerSite.address || "",
          sitePostcode: producerSite.postcode || "",
          engineer: user?.name || "Unknown",
          equipment: decomEquipment.map(eq => ({
            manufacturer: eq.manufacturer,
            model: eq.model,
            serial: eq.serial,
            weightRecovered: parseFloat(eq.weight) || 0
          })),
          gasType: finalRefrigerant,
          totalWeightRecovered: decomEquipment.reduce((sum, eq) => sum + (parseFloat(eq.weight) || 0), 0)
        });
      } catch (err) {
        console.error('Error logging decommission:', err);
      }
    }

    setIsDirty(false);
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  // Mate Role Intercept (Non-F-Gas qualified without pairing)
  const isMatePaired = (user?.role === "mate") && (activePairingStatus === "approved" || !!activeVehicleOwner || !!activePairing?.leadEngineerName);
  if (user?.role === "mate" && !isMatePaired) {
    return (
      <div className={styles.container} style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          background: "rgba(255, 170, 0, 0.12)", border: "2px solid var(--warning)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.5rem"
        }}>
          <AlertTriangle size={42} color="var(--warning)" />
        </div>
        <h2 style={{ color: "#fff", marginBottom: "0.75rem", fontSize: "1.3rem" }}>Lead Engineer Pairing Required</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: 1.6, maxWidth: "380px", margin: "0 auto 2rem" }}>
          Under UK F-Gas and REFCOM regulations, non-qualified mates must be paired to a certified Lead Engineer&apos;s van to log gas under direct supervision. Please pair with your Lead Engineer in the app to proceed.
        </p>
        <Link href="/engineer" style={{ textDecoration: "none" }}>
          <button className={styles.primaryBtn} style={{ width: "100%" }}>
            Return to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <CheckCircle2 size={64} color="var(--success)" />
        <h2>{isRecycleMode ? "Recycled Gas Charged!" : "Log Saved Successfully!"}</h2>
        <p>{isRecycleMode ? "Re-charge into on-site equipment recorded." : "REFCOM compliance data recorded."}</p>
        {willReachZero && (
          <div style={{
            marginTop: "1.25rem",
            marginBottom: "1.25rem",
            padding: "0.85rem 1.25rem",
            borderRadius: "10px",
            background: isFullyEvacuated ? "rgba(16,185,129,0.15)" : "rgba(255,187,0,0.15)",
            border: `1.5px solid ${isFullyEvacuated ? "#10b981" : "#ffbb00"}`,
            fontSize: "0.88rem",
            color: "#fff",
            textAlign: "left",
            lineHeight: 1.5
          }}>
            <div style={{ fontWeight: 700, color: isFullyEvacuated ? "#10b981" : "#ffbb00", marginBottom: "0.25rem" }}>
              {isFullyEvacuated ? "✓ Cylinder Reset to Empty / Evacuated" : `ℹ️ Cylinder Classed as Trace (${bottleData?.gasType || "Gas"})`}
            </div>
            {isFullyEvacuated 
              ? `Cylinder ${serialParam} reached 0.00 kg and was marked as fully evacuated. Gas type has been reset to Empty / Evacuated.` 
              : `Cylinder ${serialParam} has no weighed bulk gas left, but was not evacuated to vacuum. It is classed as Trace (${bottleData?.gasType || "gas"}) and is not treated as an empty cylinder.`}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={() => { setIsDirty(false); router.replace(`/engineer/bottle/${encodeURIComponent(serialParam)}`); }}
            className={styles.primaryBtn}
          >
            Back to Bottle Card (Move to Van / Actions)
          </button>
          <button
            type="button"
            onClick={() => { setIsDirty(false); router.replace("/engineer"); }}
            className={styles.primaryBtn}
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-main)", border: "1px solid var(--border)" }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>

      {/* §4.2 Multi-Site Producer Warning Overlay */}
      {showMultiSiteWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '2px solid var(--warning)',
            borderRadius: '16px', padding: '2rem', maxWidth: '420px', width: '100%'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem'}}>
              <AlertTriangle size={32} color="var(--warning)" />
              <h3 style={{color: 'var(--warning)', margin: 0}}>2nd Waste Producer Detected</h3>
            </div>
            {hasExistingHWCN || bottleData?.intendedDestination === "HQ-Stores" ? (
              <>
                <p style={{fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem', color: 'var(--text-main)'}}>
                  You are adding a 2nd waste producer to this bottle. It cannot be returned by an engineer direct to supplier and must go back to the <strong>HQ-Stores</strong>.
                </p>
                <p style={{fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem', color: 'var(--text-muted)'}}>
                  There is already an Internal HWCN in place for this bottle, the 2nd waste producer will be added to that HWCN.
                </p>
              </>
            ) : (
              <>
                <p style={{fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem', color: 'var(--text-main)'}}>
                  You are adding a 2nd waste producer to this bottle. It can <strong>no longer be returned Direct to Supplier</strong>.
                </p>
                <p style={{fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem', color: 'var(--text-muted)'}}>
                  The Intended Destination will be automatically changed to <strong style={{color: 'var(--warning)'}}>HQ-Stores</strong> and an Internal HWCN will be generated.
                </p>
              </>
            )}
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
              <button 
                className={styles.primaryBtn}
                style={{background: 'var(--warning)', color: '#000', width: '100%'}}
                onClick={() => {
                  setMultiSiteAcknowledged(true);
                  setShowMultiSiteWarning(false);
                  // Re-trigger the form submission
                  setTimeout(() => {
                    const form = document.querySelector('form');
                    if (form) form.requestSubmit();
                  }, 100);
                }}
              >
                Acknowledge
              </button>
              <button 
                style={{background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer'}}
                onClick={() => setShowMultiSiteWarning(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <header className={styles.header}>
        <button
          type="button"
          onClick={() => {
            const dest = `/engineer/bottle/${encodeURIComponent(serialParam)}`;
            if (requestNavigate(dest)) {
              router.replace(dest);
            }
          }}
          className={styles.backBtn}
        >
          <ArrowLeft size={20} />
        </button>
        <h1>
          {isRecycleMode || bottleCategory === "recycled" || jobType === "recycled_charge"
            ? "Charge Recycled Gas into Equipment"
            : bottleCategory === "reclaim"
              ? "Log Gas Recovery"
              : "Log Bottle Activity"}
        </h1>
      </header>

      {/* Supervised Logging Banner (SOP-002 Compliance) */}
      {(user?.role === "apprentice" || user?.role === "mate") && (
        <div style={{
          background: "linear-gradient(90deg, rgba(192, 132, 252, 0.15) 0%, rgba(192, 132, 252, 0.05) 100%)",
          border: "1px solid rgba(192, 132, 252, 0.4)",
          borderRadius: "12px",
          padding: "1rem",
          marginBottom: "1.25rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "1.1rem" }}>🎓</span>
            <span style={{ fontWeight: 700, color: "#c084fc", fontSize: "0.95rem" }}>
              {user?.role === "mate" ? "Mate Supervised Gas Logging (SOP-002)" : "Apprentice Supervised Logging (SOP-002)"}
            </span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 0.75rem 0", lineHeight: 1.4 }}>
            Under UK F-Gas and REFCOM regulations, apprentice and mate activities are recorded under the direct supervision of a certified Lead Engineer.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className={styles.inputGroup}>
              <label style={{ color: "#c084fc", fontSize: "0.8rem", fontWeight: 700 }}>Supervising Lead Engineer *</label>
              <select
                value={supervisingEngineer}
                onChange={e => {
                  const name = e.target.value;
                  setSupervisingEngineer(name);
                  const match = qualifiedEngineers.find(eng => eng.name === name);
                  if (match?.certificate) setSupervisingCert(match.certificate);
                }}
                required
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid #c084fc",
                  borderRadius: "8px",
                  color: "#fff",
                  padding: "0.65rem 0.75rem",
                  width: "100%",
                  fontSize: "0.9rem"
                }}
              >
                <option value="">-- Select Supervising Engineer --</option>
                {qualifiedEngineers.map(eng => (
                  <option key={eng.id} value={eng.name}>
                    {eng.name} {eng.vehicleReg ? `(${eng.vehicleReg})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label style={{ color: "#c084fc", fontSize: "0.8rem", fontWeight: 700 }}>F-Gas Certificate *</label>
              <input
                type="text"
                value={supervisingCert}
                onChange={e => setSupervisingCert(e.target.value)}
                placeholder="REF1010728 (Cat I)"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(192, 132, 252, 0.4)",
                  borderRadius: "8px",
                  color: "#fff",
                  padding: "0.65rem 0.75rem",
                  width: "100%",
                  fontSize: "0.9rem"
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Recycled Gas On-Site Info Banner */}
      {isRecycleMode && (
        <div style={{
          background: "linear-gradient(90deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)",
          border: "1px solid rgba(34, 197, 94, 0.4)",
          borderRadius: "12px",
          padding: "1rem",
          marginBottom: "1.25rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.1rem" }}>♻️</span>
            <span style={{ fontWeight: 700, color: "var(--success)", fontSize: "0.95rem" }}>
              On-Site Gas Recycling
            </span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
            Re-charging recovered gas on the same site into existing or new equipment. Available gas in cylinder: <strong style={{ color: "#fff" }}>{bottleData?.currentWeight || 0} kg</strong>.
          </p>
        </div>
      )}

      {jobType === "leak_test" && (
        <div style={{
          background: "linear-gradient(90deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)",
          border: "1px solid rgba(168, 85, 247, 0.4)",
          borderRadius: "12px",
          padding: "1rem",
          marginBottom: "1.25rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.1rem" }}>🔍</span>
            <span style={{ fontWeight: 700, color: "#c084fc", fontSize: "0.95rem" }}>
              Statutory F-Gas Leak Check Mode
            </span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
            Routine statutory leak inspection per Regulation (EU) 517/2014 Article 4. No refrigerant is dispensed (Usage: 0.00 kg). Inspection date will be registered on the equipment profile.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.readonlyField}>
          <span className={styles.label}>Cylinder Serial Number</span>
          <span className={styles.value}>{serialParam}</span>
        </div>

        {/* Activity / Job Type Selection */}
        <div className={styles.inputGroup} style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>Activity / Job Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '0.35rem' }}>
            {bottleCategory !== "reclaim" && !isRecycleMode && (
              <>
                <button
                  type="button"
                  onClick={() => setJobType("service")}
                  style={{
                    padding: "0.6rem 0.75rem",
                    borderRadius: "8px",
                    border: jobType === "service" ? "1px solid var(--primary)" : "1px solid rgba(255,255,255,0.12)",
                    background: jobType === "service" ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.05)",
                    color: jobType === "service" ? "#00e5ff" : "rgba(255,255,255,0.7)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  Service / Addition
                </button>
                <button
                  type="button"
                  onClick={() => setJobType("install")}
                  style={{
                    padding: "0.6rem 0.75rem",
                    borderRadius: "8px",
                    border: jobType === "install" ? "1px solid var(--primary)" : "1px solid rgba(255,255,255,0.12)",
                    background: jobType === "install" ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.05)",
                    color: jobType === "install" ? "#00e5ff" : "rgba(255,255,255,0.7)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  Commissioning
                </button>
                <button
                  type="button"
                  onClick={() => setJobType("leak_test")}
                  style={{
                    padding: "0.6rem 0.75rem",
                    borderRadius: "8px",
                    border: jobType === "leak_test" ? "1px solid #c084fc" : "1px solid rgba(255,255,255,0.12)",
                    background: jobType === "leak_test" ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)",
                    color: jobType === "leak_test" ? "#c084fc" : "rgba(255,255,255,0.7)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  🔍 Statutory Leak Test (0 kg)
                </button>
              </>
            )}
            {(bottleCategory === "reclaim" || jobType === "recovery") && (
              <button
                type="button"
                onClick={() => setJobType("recovery")}
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "8px",
                  border: jobType === "recovery" ? "1px solid #ffaa00" : "1px solid rgba(255,255,255,0.12)",
                  background: jobType === "recovery" ? "rgba(255,170,0,0.15)" : "rgba(255,255,255,0.05)",
                  color: jobType === "recovery" ? "#ffaa00" : "rgba(255,255,255,0.7)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: canRechargeReclaimOnCurrentJob ? "pointer" : "default"
                }}
              >
                Refrigerant Recovery
              </button>
            )}
            {(bottleCategory === "recycled" || (bottleCategory === "reclaim" && canRechargeReclaimOnCurrentJob) || (bottleCategory !== "reclaim" && (isRecycleMode || jobType === "recycled_charge"))) && (
              <button
                type="button"
                onClick={() => {
                  setJobType("recycled_charge");
                  if (bottleData?.gasType && bottleData.gasType.toLowerCase() !== "unknown") {
                    setRefrigerantType(bottleData.gasType);
                  }
                }}
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "8px",
                  border: jobType === "recycled_charge" ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.12)",
                  background: jobType === "recycled_charge" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                  color: jobType === "recycled_charge" ? "#10b981" : "rgba(255,255,255,0.7)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                {bottleCategory === "reclaim" ? "Use / Re-charge Recovered Gas" : "Recycled Gas Charge"}
              </button>
            )}
          </div>
        </div>

        {(jobType === "service" || jobType === "install" || jobType === "retrofit" || jobType === "recovery" || jobType === "recycled_charge" || jobType === "leak_test") && (
          <div className={`${styles.dynamicSection} glass-panel`} style={{ borderColor: isRecycleMode ? 'var(--success)' : jobType === "leak_test" ? '#c084fc' : 'var(--primary)', marginTop: '0.5rem', marginBottom: '1rem' }}>
            <h3 style={{ color: isRecycleMode ? 'var(--success)' : jobType === "leak_test" ? '#c084fc' : 'var(--primary)', marginBottom: '1rem' }}>
              {isRecycleMode ? "Recipient Job Details" : jobType === "leak_test" ? "Statutory Leak Inspection Job" : "Job & Site Details"}
            </h3>
            <div className={styles.inputGroup}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ margin: 0 }}>Job Number (e.g. J12345, M98201)</label>
                {hasAutoFilledJob && (
                  <button
                    type="button"
                    onClick={() => setIsEditingJobNumber((prev) => !prev)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      color: isRecycleMode ? "var(--success)" : jobType === "leak_test" ? "#c084fc" : "var(--primary)",
                      borderRadius: "6px",
                      padding: "0.25rem 0.6rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <Edit3 size={13} /> {isEditingJobNumber ? "Lock" : "Edit"}
                  </button>
                )}
              </div>

              {hasAutoFilledJob && !isEditingJobNumber ? (
                <div
                  style={{
                    marginTop: "0.35rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-geist-mono)",
                    letterSpacing: "0.04em",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span>{jobNumber}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 500, color: "var(--text-muted)", fontFamily: "var(--font-geist-sans)" }}>
                    Auto-filled from site
                  </span>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. J12345"
                  value={jobNumber}
                  pattern="^[A-Za-z][0-9]+$"
                  title="Job number must start with 1 letter followed by numbers without spaces (e.g. J12345)"
                  onChange={(e) => setJobNumber(e.target.value.replace(/\s+/g, "").toUpperCase())}
                  style={{ marginTop: "0.35rem" }}
                  autoFocus={hasAutoFilledJob && isEditingJobNumber}
                  required
                />
              )}

              {crmMatch && (
                <p style={{fontSize: "0.75rem", color: isRecycleMode ? "var(--success)" : "var(--primary)", marginTop: "0.3rem"}}>
                  ✓ {crmMatch.replace(/,(?!\s)/g, ", ")}
                </p>
              )}
            </div>

            {jobType === "recovery" && (
              <>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', marginBottom: '0.5rem'}}>
                  For Hazardous Waste tracking, enter the full producer address:
                </p>
                <div className={styles.inputGroup}>
                  <label>Site / Client Name</label>
                  <input type="text" placeholder="e.g. Retail Store #4" value={producerSite.name} onChange={(e) => setProducerSite({...producerSite, name: e.target.value})} required />
                </div>
                <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                  <label>Site Address</label>
                  <input type="text" placeholder="e.g. 123 High Street" value={producerSite.address} onChange={(e) => setProducerSite({...producerSite, address: e.target.value})} required />
                </div>
                <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                  <label>Site Postcode</label>
                  <input type="text" placeholder="e.g. NE1 4XP" value={producerSite.postcode} onChange={(e) => setProducerSite({...producerSite, postcode: e.target.value})} required />
                </div>
              </>
            )}
          </div>
        )}

        <div
          className={bottleCategory === "reclaim" ? `${styles.dynamicSection} glass-panel` : styles.row}
          style={
            bottleCategory === "reclaim"
              ? {
                  borderColor: "rgba(255, 170, 0, 0.35)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  marginBottom: "1rem",
                }
              : undefined
          }
        >
          <div className={styles.inputGroup} style={{ flex: 1, width: "100%" }}>
            <label style={{ fontSize: "0.9rem", fontWeight: 700, color: bottleCategory === "reclaim" ? "var(--warning)" : undefined }}>
              {isRecycleMode || bottleCategory === "recycled" || jobType === "recycled_charge"
                ? "Recycled Refrigerant Type"
                : jobType === "recovery"
                ? "Gas Type Being Recovered"
                : "Refrigerant Type"}
            </label>
            {isRecycleMode || bottleCategory === "recycled" ? (
              <div style={{marginTop: '0.25rem'}}>
                <div style={{
                  display: 'inline-block', padding: '0.4rem 1.1rem',
                  background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981',
                  borderRadius: '6px', color: '#10b981', fontWeight: 700,
                  fontSize: '0.9rem', letterSpacing: '0.03em'
                }}>
                  {bottleData?.gasType || "Recycled Refrigerant"}
                </div>
                <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem'}}>
                  Gas will be charged directly from this recycled cylinder ({bottleData?.currentWeight || 0} kg available).
                </p>
              </div>
            ) : bottleCategory === "reclaim" ? (
              <>
                {/* Cylinder Current Status Info Box */}
                <div style={{
                  marginTop: '0.35rem',
                  marginBottom: '0.75rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '10px',
                  background: hasReclaimWaste(bottleData) ? 'rgba(255, 170, 0, 0.08)' : 'rgba(0, 229, 255, 0.08)',
                  border: hasReclaimWaste(bottleData) ? '1px solid rgba(255, 170, 0, 0.28)' : '1px solid rgba(0, 229, 255, 0.28)',
                  fontSize: '0.84rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Cylinder Current Gas:</span>
                    <span style={{ fontWeight: 700, color: hasReclaimWaste(bottleData) ? '#ffaa00' : '#00e5ff' }}>
                      {(bottleData?.currentWeight || 0) > 0 ? (
                        `${bottleData?.gasType || "Mixed"} (${bottleData?.currentWeight} kg present)`
                      ) : isBottleTrace(bottleData) ? (
                        `${bottleData?.gasType} (Trace present — not vacced)`
                      ) : (bottleData?.status === "unused" || (bottleData?.gasType || "").toLowerCase() === "unused") ? (
                        `Unused (No gas type applied yet)`
                      ) : (
                        `Empty / Evacuated (${bottleData?.gasType || "Empty / Evacuated"})`
                      )}
                    </span>
                  </div>

                  {hasReclaimWaste(bottleData) ? (
                    (() => {
                      const currentSelected = refrigerantType === "other" ? customRefrigerant.trim() : refrigerantType;
                      const bottleGas = (bottleData?.gasType || "").trim();
                      const isSame = bottleGas && currentSelected && (bottleGas.toLowerCase() === currentSelected.toLowerCase());
                      const isMixedBottle = bottleGas.toLowerCase() === "mixed" || bottleGas.toLowerCase() === "mixed/recovery";

                      if (isMixedBottle) {
                        return (
                          <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
                            This cylinder already contains mixed recovery gas. Adding waste gas will keep the cylinder classified as Mixed.
                          </p>
                        );
                      } else if (!isSame && currentSelected) {
                        return (
                          <div style={{
                            marginTop: '0.5rem',
                            padding: '0.5rem 0.7rem',
                            borderRadius: '6px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fcd34d',
                            fontSize: '0.78rem',
                            lineHeight: 1.4
                          }}>
                            <strong>Notice:</strong> You selected a different gas ({currentSelected}) than what is currently in this cylinder ({bottleGas}). Adding this waste will mix gases in the cylinder, reclassifying it as <strong>Mixed</strong>.
                          </div>
                        );
                      } else {
                        return (
                          <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#86efac', lineHeight: 1.4 }}>
                            Defaulted to cylinder&apos;s existing gas ({bottleGas}). You can select a different waste gas below if required.
                          </p>
                        );
                      }
                    })()
                  ) : (
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#00e5ff', lineHeight: 1.4 }}>
                      Empty / evacuated reclaim cylinder. Select the gas being recovered into this cylinder (it will adopt this refrigerant type).
                    </p>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {["R410A", "R32", "R134a", "R404A", "R407C", "R22", "other"].map(gas => (
                    <button
                      key={gas}
                      type="button"
                      onClick={() => setRefrigerantType(gas)}
                      style={{
                        padding: '0.65rem 0.4rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
                        cursor: 'pointer', border: refrigerantType === gas ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.12)',
                        background: refrigerantType === gas ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: refrigerantType === gas ? '#000' : 'rgba(255,255,255,0.8)',
                        transition: 'all 0.15s'
                      }}
                    >
                      {gas === "other" ? "Other" : gas}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRefrigerantType("Mixed")}
                    style={{
                      padding: '0.65rem 0.4rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                      cursor: 'pointer', border: refrigerantType === "Mixed" ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.12)',
                      background: refrigerantType === "Mixed" ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: refrigerantType === "Mixed" ? '#000' : 'rgba(255,255,255,0.8)',
                      transition: 'all 0.15s'
                    }}
                  >
                    Mixed
                  </button>
                </div>
                {refrigerantType === "other" && (
                  <input
                    type="text"
                    placeholder="Enter refrigerant (e.g. R454B)"
                    value={customRefrigerant}
                    onChange={(e) => setCustomRefrigerant(e.target.value)}
                    style={{marginTop: '0.5rem'}}
                    required
                  />
                )}
                {jobType === "recovery" && (
                  <p style={{fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.45rem', marginBottom: 0}}>
                    This updates the bottle label only. The bottle remains classified as Hazardous Waste.
                  </p>
                )}
              </>
            ) : (
              <div style={{marginTop: '0.25rem'}}>
                <div style={{
                  display: 'inline-block', padding: '0.4rem 1.1rem',
                  background: 'rgba(0, 229, 255, 0.1)', border: '1px solid var(--primary)',
                  borderRadius: '20px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem'
                }}>
                  {bottleData?.gasType || refrigerantType}
                </div>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem'}}>
                  Set at registration — cannot be changed.
                </p>
              </div>
            )}
          </div>
          
          {(jobType === "service" || jobType === "install" || jobType === "retrofit" || jobType === "recovery" || jobType === "recycled_charge" || jobType === "leak_test") && (
            <div
              className={styles.inputGroup}
              style={
                bottleCategory === "reclaim"
                  ? {
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                    }
                  : undefined
              }
            >
              <label style={bottleCategory === "reclaim" ? { margin: 0, fontSize: "0.88rem", color: "var(--text-main)" } : undefined}>
                Total Logged Weight (kg)
              </label>
              <div style={{
                padding: bottleCategory === "reclaim" ? '0.45rem 1rem' : '0.75rem 1rem',
                background: jobType === "leak_test" ? 'rgba(168, 85, 247, 0.1)' : isRecycleMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 229, 255, 0.1)',
                border: jobType === "leak_test" ? '1px solid #c084fc' : isRecycleMode ? '1px solid var(--success)' : '1px solid var(--primary)',
                borderRadius: 'var(--radius-sm)',
                color: jobType === "leak_test" ? '#c084fc' : isRecycleMode ? 'var(--success)' : 'var(--primary)',
                fontWeight: '700',
                fontSize: bottleCategory === "reclaim" ? '1.1rem' : '1.2rem',
                textAlign: 'center',
                minWidth: bottleCategory === "reclaim" ? '110px' : undefined
              }}>
                {jobType === "leak_test" ? "0.00 kg (Statutory Inspection)" : `${totalWeight.toFixed(2)} kg`}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Fields based on REFCOM Requirements */}
        {(jobType === "service" || jobType === "install" || jobType === "retrofit" || jobType === "recovery" || jobType === "recycled_charge" || jobType === "leak_test") && (
          <div className={`${styles.dynamicSection} glass-panel`} style={{ borderColor: isRecycleMode ? 'var(--success)' : jobType === "leak_test" ? '#c084fc' : 'var(--primary)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ color: isRecycleMode ? 'var(--success)' : jobType === "leak_test" ? '#c084fc' : 'var(--primary)' }}>
              {isRecycleMode ? "Recipient Equipment Asset Details" : jobType === "leak_test" ? "Inspected Equipment Asset Details" : "Equipment Details"}
            </h3>

            {equipmentList.map((eq, index) => (
              <div key={eq.id} style={{ position: 'relative', borderLeft: `2px solid ${jobType === "leak_test" ? '#c084fc' : 'var(--primary)'}`, paddingLeft: '1rem' }}>
                {equipmentList.length > 1 && (
                  <button type="button" onClick={() => removeEquipment(eq.id)} style={{ position: 'absolute', top: '0', right: '0', background: 'transparent', border: 'none', color: '#ff3366', cursor: 'pointer' }}>Remove</button>
                )}
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Asset {index + 1}</h4>
                {jobType === "recovery" && (
                  <div style={{
                    marginBottom: '0.75rem', padding: '0.75rem', borderRadius: '8px',
                    background: eq.decommissioned ? 'rgba(255, 68, 68, 0.08)' : 'rgba(255,255,255,0.02)',
                    border: eq.decommissioned ? '1px solid rgba(255, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <AlertTriangle size={16} color={eq.decommissioned ? '#ff4444' : 'var(--text-muted)'} />
                      <span style={{fontSize: '0.85rem', fontWeight: 600, color: eq.decommissioned ? '#ff4444' : 'var(--text-muted)'}}>
                        Equipment Decommissioned?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEquipmentList(equipmentList.map(e => e.id === eq.id ? {...e, decommissioned: !e.decommissioned} : e));
                      }}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        border: 'none', transition: 'all 0.2s',
                        background: eq.decommissioned ? '#ff4444' : 'rgba(255,255,255,0.08)',
                        color: eq.decommissioned ? '#fff' : 'var(--text-muted)'
                      }}
                    >
                      {eq.decommissioned ? '✓ Yes — Decommissioned' : 'No'}
                    </button>
                  </div>
                )}
                <div className={styles.inputGroup}>
                  <label>Manufacturer</label>
                  <input type="text" placeholder="e.g. Daikin, Mitsubishi" value={eq.manufacturer} onChange={(e) => updateEquipment(eq.id, 'manufacturer', e.target.value)} required />
                </div>
                <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                  <label>Model Number</label>
                  <input type="text" placeholder="e.g. FDTC50VF" value={eq.model} onChange={(e) => updateEquipment(eq.id, 'model', e.target.value)} style={{ textTransform: 'uppercase' }} required />
                </div>
                <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                  <label>Serial Number</label>
                  <input type="text" placeholder="e.g. 9948201B" value={eq.serial} onChange={(e) => updateEquipment(eq.id, 'serial', e.target.value)} style={{ textTransform: 'uppercase' }} required />
                </div>
                {jobType === "leak_test" ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div className={styles.inputGroup}>
                      <label>Total Nominal Charge (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 3.2"
                        value={eq.nominalChargeKg || ""}
                        onChange={(e) => updateEquipment(eq.id, 'nominalChargeKg', e.target.value)}
                        style={{ borderColor: '#c084fc', background: 'rgba(168, 85, 247, 0.05)' }}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Inspection Outcome</label>
                      <select
                        value={eq.leakCheckResult || "pass"}
                        onChange={(e) => updateEquipment(eq.id, 'leakCheckResult', e.target.value)}
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid #c084fc',
                          borderRadius: '8px',
                          color: '#fff',
                          padding: '0.65rem 0.75rem',
                          width: '100%',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="pass">✓ Pass — No leaks detected</option>
                        <option value="repaired">🔧 Leak identified & repaired</option>
                        <option value="fail">✗ Leak detected — isolation required</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                    <label>Weight Logged (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1.5"
                      value={eq.weight}
                      onChange={(e) => updateEquipment(eq.id, 'weight', e.target.value)}
                      required
                      style={{ borderColor: 'var(--primary)', background: 'rgba(0, 229, 255, 0.02)' }}
                    />
                  </div>
                )}
              </div>
            ))}

            <button type="button" onClick={addEquipment} style={{ background: 'transparent', border: `1px solid ${jobType === "leak_test" ? '#c084fc' : 'var(--primary)'}`, color: jobType === "leak_test" ? '#c084fc' : 'var(--primary)', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, width: '100%', cursor: 'pointer' }}>+ Add Another Asset</button>
          </div>
        )}

        {jobType === "waste" && (
          <div className={`${styles.dynamicSection} glass-panel`}>
            <h3>Waste Disposal Details</h3>
            <div className={styles.inputGroup}>
              <label>Client Name</label>
              <input type="text" placeholder="Client Name" required />
            </div>
            <div className={styles.inputGroup}>
              <label>Hazardous Waste Consignment No.</label>
              <input type="text" placeholder="e.g. 21Degr-100001" required />
            </div>
            <div className={styles.inputGroup} style={{marginTop: '1rem'}}>
              <label>Upload Supplier HWCN Paperwork (Optional)</label>
              <input type="file" accept="image/*,.pdf" style={{padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--border)', color: 'var(--text-muted)'}} />
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>Take a photo of the completed supplier note for your digital records.</p>
            </div>
          </div>
        )}

        {/* Reclaim Cylinder Evacuation Verification (Only when cylinder reaches 0.00 kg) */}
        {willReachZero && (
          <div style={{
            background: "rgba(0, 229, 255, 0.04)",
            border: `1.5px solid ${isFullyEvacuated === null ? "rgba(0, 229, 255, 0.5)" : isFullyEvacuated ? "#10b981" : "#ffbb00"}`,
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1.25rem",
            transition: "all 0.2s"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "1.25rem" }}>🔄</span>
              <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>
                Cylinder Emptied Verification (0.00 kg Remaining)
              </span>
            </div>
            <p style={{ margin: "0 0 0.85rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.45 }}>
              Dispensing <strong>{totalWeight.toFixed(2)} kg</strong> will completely empty waste cylinder <strong>{serialParam}</strong> (0.00 kg remaining).
              <br />
              <strong>Has the bottle been fully emptied or vacced so it can now be used for more waste but of any type?</strong>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <label
                style={{
                  display: "flex", alignItems: "flex-start", gap: "0.65rem",
                  padding: "0.75rem 0.9rem", borderRadius: "8px",
                  background: isFullyEvacuated === true ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${isFullyEvacuated === true ? "#10b981" : "rgba(255,255,255,0.12)"}`,
                  cursor: "pointer", transition: "all 0.15s"
                }}
              >
                <input
                  type="radio"
                  name="vaccedCheck"
                  checked={isFullyEvacuated === true}
                  onChange={() => setIsFullyEvacuated(true)}
                  style={{ marginTop: "0.2rem", accentColor: "#10b981" }}
                />
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: isFullyEvacuated === true ? "#10b981" : "#fff" }}>
                    Yes — Fully emptied and vacced
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", marginTop: "0.15rem" }}>
                    Gas type will change to <strong>Empty / Evacuated</strong>. Ready to receive any waste refrigerant.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex", alignItems: "flex-start", gap: "0.65rem",
                  padding: "0.75rem 0.9rem", borderRadius: "8px",
                  background: isFullyEvacuated === false ? "rgba(255,187,0,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${isFullyEvacuated === false ? "#ffbb00" : "rgba(255,255,255,0.12)"}`,
                  cursor: "pointer", transition: "all 0.15s"
                }}
              >
                <input
                  type="radio"
                  name="vaccedCheck"
                  checked={isFullyEvacuated === false}
                  onChange={() => setIsFullyEvacuated(false)}
                  style={{ marginTop: "0.2rem", accentColor: "#ffbb00" }}
                />
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: isFullyEvacuated === false ? "#ffbb00" : "#fff" }}>
                    No — Trace gas remains (not vacced)
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", marginTop: "0.15rem" }}>
                    Classed as <strong>Trace ({bottleData?.gasType || "existing gas"})</strong> — NOT an empty bottle. Only waste of this refrigerant may be added, and HWCN rules still apply.
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {validationError && (
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)', border: '1px solid #ff4444',
            color: '#ff4444', padding: '1rem', borderRadius: '8px', 
            marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <AlertTriangle size={18} />
            {validationError}
          </div>
        )}

        <button
          id="save-compliance-log-btn"
          type="submit"
          className={styles.submitBtn}
          disabled={isSubmitting}
        >
          {isSubmitting ? <span className={styles.spinner}></span> : <><Save size={20} /> Save Compliance Log</>}
        </button>
      </form>

      {/* Floating Save Reminder Bar (Prompts engineer before bottom nav) */}
      {isFormDirty && !isSuccess && (
        <aside
          className={`no-print ${styles.floatingSaveBar}`}
          aria-label="Unsaved compliance log alert"
        >
          <div className={styles.floatingSaveInfo}>
            <span className={styles.floatingSavePulseDot} />
            <div>
              <div className={styles.floatingSaveTitle}>Unsaved Compliance Entry</div>
              <div className={styles.floatingSaveSub}>
                {totalWeight > 0 ? `${totalWeight.toFixed(2)} kg entered • ` : ""}
                Tap to Save Log
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const saveBtn = document.getElementById("save-compliance-log-btn");
              if (saveBtn) {
                saveBtn.scrollIntoView({ behavior: "smooth", block: "center" });
                saveBtn.focus();
                saveBtn.classList.add(styles.saveButtonPulse);
                setTimeout(() => {
                  saveBtn.classList.remove(styles.saveButtonPulse);
                }, 3000);
              }
            }}
            className={styles.floatingSaveAction}
          >
            <Save size={16} /> Save Now
          </button>
        </aside>
      )}
    </div>
  );
}
