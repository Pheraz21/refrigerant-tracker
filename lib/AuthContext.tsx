"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { VanPairing, PairingStatus } from "./db";

type Role = "engineer" | "office" | "admin" | "mate" | "apprentice";
type UserStatus = "pending" | "approved" | "disabled";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  availableRoles: Role[];
  status: UserStatus;
  vehicleReg?: string;
  employer?: string;
  phone?: string;
  canViewStores?: boolean;
}

interface AuthContextType {
  user: User | null;
  activeVehicleReg: string | null;
  activeVehicleOwner: string | null;
  activePairingStatus: PairingStatus | "none";
  activePairing: VanPairing | null;
  setActiveVehicle: (reg: string, ownerName?: string) => void;
  requestPairing: (leadReg: string, leadOwnerName: string) => Promise<void>;
  refreshPairing: () => Promise<void>;
  login: (email: string, password: string, role: Role) => Promise<void>;
  switchRole: (newRole: Role) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeVehicleReg, setActiveVehicleRegState] = useState<string | null>(null);
  const [activeVehicleOwner, setActiveVehicleOwnerState] = useState<string | null>(null);
  const [activePairingStatus, setActivePairingStatus] = useState<PairingStatus | "none">("none");
  const [activePairing, setActivePairing] = useState<VanPairing | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const syncPairing = async (currentUser: User | null) => {
    if (!currentUser) {
      setActivePairing(null);
      setActivePairingStatus("none");
      return;
    }

    if (currentUser.role === "mate" || currentUser.role === "apprentice") {
      try {
        const { db } = await import("./db");
        const pairing = await db.getActivePairingForUser(currentUser.id);
        if (pairing) {
          setActivePairing(pairing);
          setActivePairingStatus(pairing.pairingStatus);
          if (pairing.pairingStatus === "approved") {
            setActiveVehicleRegState(pairing.vehicleReg);
            setActiveVehicleOwnerState(pairing.leadEngineerName);
          } else if (pairing.pairingStatus === "pending") {
            // Stay with own van until approved
            if (!activeVehicleReg) {
              setActiveVehicleRegState(currentUser.vehicleReg || null);
              setActiveVehicleOwnerState(currentUser.name);
            }
          }
        } else {
          setActivePairing(null);
          setActivePairingStatus("none");
          if (!activeVehicleReg) {
            setActiveVehicleRegState(currentUser.vehicleReg || null);
            setActiveVehicleOwnerState(currentUser.name);
          }
        }
      } catch (e) {
        console.error("Failed to sync pairing", e);
      }
    }
  };

  const refreshPairing = async () => {
    await syncPairing(user);
  };

  const setActiveVehicle = (reg: string, ownerName?: string) => {
    const cleanReg = reg ? reg.trim().toUpperCase() : "";
    const cleanOwner = ownerName || (user?.vehicleReg === cleanReg ? user.name : "Assigned Van");
    setActiveVehicleRegState(cleanReg);
    setActiveVehicleOwnerState(cleanOwner);
    if (typeof window !== "undefined") {
      localStorage.setItem("fgas_active_vehicle", JSON.stringify({ reg: cleanReg, ownerName: cleanOwner }));
    }
  };

  const requestPairing = async (leadReg: string, leadOwnerName: string) => {
    if (!user) return;
    const { db } = await import("./db");
    await db.requestVanPairing({
      mateId: user.id,
      mateName: user.name,
      mateEmail: user.email,
      mateRole: user.role,
      leadEngineerName: leadOwnerName,
      vehicleReg: leadReg
    });
    await syncPairing(user);
  };

  useEffect(() => {
    async function syncSession() {
      const storedUser = localStorage.getItem("fgas_user");
      const storedVehicle = localStorage.getItem("fgas_active_vehicle");
      if (storedVehicle) {
        try {
          const parsedV = JSON.parse(storedVehicle);
          if (parsedV.reg) {
            setActiveVehicleRegState(parsedV.reg);
            setActiveVehicleOwnerState(parsedV.ownerName || null);
          }
        } catch {}
      }

      if (!storedUser) {
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(storedUser);
      try {
        const { db } = await import("./db");
        let dbUser = await db.getUserById(parsed.id);
        
        // Fallback: If ID not found, try searching by email
        if (!dbUser && parsed.email) {
          dbUser = await db.getUserByEmail(parsed.email);
        }
        
        if (dbUser) {
          const updated = {
            ...parsed,
            id: dbUser.id, // Update ID in case of migration
            name: dbUser.name,
            status: dbUser.status,
            availableRoles: dbUser.availableRoles,
            role: dbUser.role,
            vehicleReg: dbUser.vehicleReg,
            employer: dbUser.employer,
            canViewStores: dbUser.canViewStores,
          };
          setUser(updated);
          localStorage.setItem("fgas_user", JSON.stringify(updated));

          await syncPairing(updated);

          // Set default vehicle if not explicitly set
          if (!storedVehicle && dbUser.vehicleReg) {
            setActiveVehicleRegState(dbUser.vehicleReg);
            setActiveVehicleOwnerState(dbUser.name);
          }
        } else {
          setUser(parsed);
          await syncPairing(parsed);
          if (!storedVehicle && parsed.vehicleReg) {
            setActiveVehicleRegState(parsed.vehicleReg);
            setActiveVehicleOwnerState(parsed.name);
          }
        }
      } catch (err) {
        console.error("Session sync failed", err);
        setUser(parsed);
      } finally {
        setLoading(false);
      }
    }

    syncSession();
  }, []);

  useEffect(() => {
    if (!loading) {
      const isAdminRoute = pathname.startsWith("/admin");
      const isAdminLogin = pathname === "/admin/login";
      const isEngineerLogin = pathname === "/";
      
      if (!user) {
        // Not logged in — allow signup, logins, and forgot password
        const isSignup = pathname === "/signup";
        const isForgotPassword = pathname === "/forgot-password";
        if (isAdminRoute && !isAdminLogin) {
          router.push("/admin/login");
        } else if (!isEngineerLogin && !isAdminLogin && !isSignup && !isForgotPassword) {
          router.push("/");
        }
      } else {
        // Logged in — check status
        if (user.status !== "approved" && user.role !== "admin") {
          // Block access if not approved (except for primary admin)
          if (pathname !== "/pending") router.push("/pending");
          return;
        }

        // If approved and on pending page, redirect to dashboard
        if (user.status === "approved" && pathname === "/pending") {
          if (user.role === "office" || user.role === "admin") router.push("/admin");
          else router.push("/engineer");
          return;
        }

        const canAccessAdmin =
          user.availableRoles?.includes("admin") || user.availableRoles?.includes("office") ||
          user.role === "admin" || user.role === "office";
        const canAccessDashboard =
          user.availableRoles?.includes("engineer") || user.availableRoles?.includes("mate") || user.availableRoles?.includes("apprentice") ||
          user.role === "engineer" || user.role === "mate" || user.role === "apprentice";

        if (canAccessAdmin && isAdminLogin) {
          router.push("/admin");
          return;
        } else if (!canAccessAdmin && isAdminRoute && !isAdminLogin) {
          router.push("/engineer");
          return;
        } else if (isEngineerLogin) {
          if (user.role === "office" || user.role === "admin") router.push("/admin");
          else router.push("/engineer");
          return;
        }
      }
    }
  }, [user, loading, pathname, router]);

  const switchRole = async (newRole: Role) => {
    if (!user || !user.availableRoles.includes(newRole)) return;

    const { db } = await import("./db");
    await db.switchUserRole(user.id, newRole);

    const newUser = { ...user, role: newRole };
    setUser(newUser);
    localStorage.setItem("fgas_user", JSON.stringify(newUser));

    // Redirect based on new role
    if (newRole === "office" || newRole === "admin") {
      router.push("/admin");
    } else {
      router.push("/engineer");
    }
  };

  const login = async (email: string, password: string, role: Role) => {
    const { supabase } = await import("./supabaseClient");
    const { db } = await import("./db");

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      // Check if they exist in the app DB but haven't set a Supabase Auth password yet
      const existing = await db.getUserByEmail(email);
      if (existing) {
        throw new Error("Please use 'Forgot Password' to set your password for the first time.");
      }
      throw new Error("Invalid email or password.");
    }

    const dbUser = await db.getUserByEmail(email);
    if (!dbUser) {
      throw new Error("Your account has not been set up yet. Please contact an administrator.");
    }

    const userToSet: User = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as Role,
      availableRoles: dbUser.availableRoles as Role[],
      status: dbUser.status as UserStatus,
      vehicleReg: dbUser.vehicleReg,
      employer: dbUser.employer,
      phone: dbUser.phone,
      canViewStores: dbUser.canViewStores,
    };

    setUser(userToSet);
    localStorage.setItem("fgas_user", JSON.stringify(userToSet));

    if (dbUser.vehicleReg) {
      setActiveVehicleRegState(dbUser.vehicleReg);
      setActiveVehicleOwnerState(dbUser.name);
      localStorage.setItem("fgas_active_vehicle", JSON.stringify({ reg: dbUser.vehicleReg, ownerName: dbUser.name }));
    }
  };

  const logout = () => {
    setUser(null);
    setActiveVehicleRegState(null);
    setActiveVehicleOwnerState(null);
    localStorage.removeItem("fgas_user");
    localStorage.removeItem("fgas_active_vehicle");
    router.push("/");
  };

  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const { db } = await import("./db");
      const dbUser = await db.getUserById(user.id);
      if (dbUser) {
        const updated = { ...user, name: dbUser.name, email: dbUser.email, status: dbUser.status, availableRoles: dbUser.availableRoles, role: dbUser.role, vehicleReg: dbUser.vehicleReg, employer: dbUser.employer, canViewStores: dbUser.canViewStores };
        setUser(updated);
        localStorage.setItem("fgas_user", JSON.stringify(updated));
      }
    } catch (err) {
      console.error("refreshUser failed", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, activeVehicleReg, activeVehicleOwner, activePairingStatus, activePairing, setActiveVehicle, requestPairing, refreshPairing, login, switchRole, logout, refreshUser, loading }}>
      {loading ? (
        <div style={{minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a"}}>
           <div style={{width: "40px", height: "40px", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite"}}></div>
           <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
