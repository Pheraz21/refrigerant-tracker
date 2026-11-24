"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { VanPairing, PairingStatus } from "./db";
import { supabase } from "./supabaseClient";

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
  logout: () => Promise<void>;
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
        if (pairing && pairing.pairingStatus === "approved") {
          setActivePairing(pairing);
          setActivePairingStatus(pairing.pairingStatus);
          setActiveVehicleRegState(pairing.vehicleReg);
          setActiveVehicleOwnerState(pairing.leadEngineerName);
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "fgas_active_vehicle",
              JSON.stringify({ reg: pairing.vehicleReg, ownerName: pairing.leadEngineerName })
            );
          }
        } else {
          setActivePairing(pairing || null);
          setActivePairingStatus(pairing ? pairing.pairingStatus : "none");
          setActiveVehicleRegState(null);
          setActiveVehicleOwnerState(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("fgas_active_vehicle");
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

      if (!storedUser) {
        setLoading(false);
        return;
      }

      let parsed: User;
      try {
        parsed = JSON.parse(storedUser);
      } catch {
        localStorage.removeItem("fgas_user");
        setLoading(false);
        return;
      }

      const restoreNonMateVehicle = (targetUser: User) => {
        let restored = false;
        if (storedVehicle) {
          try {
            const parsedV = JSON.parse(storedVehicle);
            if (parsedV.reg) {
              setActiveVehicleRegState(parsedV.reg);
              setActiveVehicleOwnerState(parsedV.ownerName || null);
              restored = true;
            }
          } catch {}
        }
        if (!restored && targetUser.vehicleReg) {
          setActiveVehicleRegState(targetUser.vehicleReg);
          setActiveVehicleOwnerState(targetUser.name);
        }
      };

      try {
        const { db } = await import("./db");
        let dbUser = await db.getUserById(parsed.id);
        
        // Fallback: If ID not found, try searching by email
        if (!dbUser && parsed.email) {
          dbUser = await db.getUserByEmail(parsed.email);
        }
        
        if (dbUser) {
          const updated: User = {
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

          if (updated.role === "mate" || updated.role === "apprentice") {
            await syncPairing(updated);
          } else {
            restoreNonMateVehicle(updated);
          }
        } else {
          setUser(parsed);
          if (parsed.role === "mate" || parsed.role === "apprentice") {
            await syncPairing(parsed);
          } else {
            restoreNonMateVehicle(parsed);
          }
        }
      } catch (err) {
        console.error("Session sync failed", err);
        setUser(parsed);
        if (parsed.role !== "mate" && parsed.role !== "apprentice") {
          restoreNonMateVehicle(parsed);
        }
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
        // Not logged in — allow signup, logins, forgot password, and reset password
        const isSignup = pathname === "/signup";
        const isForgotPassword = pathname === "/forgot-password";
        const isResetPassword = pathname === "/reset-password";
        if (isAdminRoute && !isAdminLogin) {
          router.push("/admin/login");
        } else if (!isEngineerLogin && !isAdminLogin && !isSignup && !isForgotPassword && !isResetPassword) {
          router.push("/");
        }
      } else {
        // Logged in — check status
        if (user.status === "disabled" || (user.status !== "approved" && user.role !== "admin")) {
          // Block access if disabled (even for admin) or not approved (except for primary admin)
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

    if (userToSet.role === "mate" || userToSet.role === "apprentice") {
      await syncPairing(userToSet);
    } else if (dbUser.vehicleReg) {
      setActiveVehicleRegState(dbUser.vehicleReg);
      setActiveVehicleOwnerState(dbUser.name);
      localStorage.setItem("fgas_active_vehicle", JSON.stringify({ reg: dbUser.vehicleReg, ownerName: dbUser.name }));
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out from Supabase Auth:", err);
    }
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
