"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

type Role = "engineer" | "office" | "admin";
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
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: Role) => Promise<void>;
  switchRole: (newRole: Role) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function syncSession() {
      const storedUser = localStorage.getItem("fgas_user");
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
            role: dbUser.role
          };
          setUser(updated);
          localStorage.setItem("fgas_user", JSON.stringify(updated));
        } else {
          setUser(parsed);
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
          if (user.role === "engineer") router.push("/dashboard");
          else router.push("/admin");
          return;
        }

        const canAccessAdmin =
          user.availableRoles?.includes("admin") || user.availableRoles?.includes("office") ||
          user.role === "admin" || user.role === "office";
        const canAccessDashboard =
          user.availableRoles?.includes("engineer") || user.role === "engineer";

        if (canAccessAdmin && (isAdminLogin || pathname === "/")) {
          router.push("/admin");
          return;
        } else if (!canAccessAdmin && isAdminRoute && !isAdminLogin) {
          router.push("/dashboard");
          return;
        } else if (canAccessDashboard && isEngineerLogin) {
          router.push("/dashboard");
          return;
        } else if (!canAccessDashboard && pathname.startsWith("/dashboard") && canAccessAdmin) {
          router.push("/admin");
          return;
        }
      }
    }
  }, [user, loading, pathname, router]);

  const switchRole = async (newRole: Role) => {
    if (!user || !user.availableRoles.includes(newRole)) return;
    
    setLoading(true);
    const { db } = await import("./db");
    await db.switchUserRole(user.id, newRole);
    
    const newUser = { ...user, role: newRole };
    setUser(newUser);
    localStorage.setItem("fgas_user", JSON.stringify(newUser));
    
    // Redirect based on new role
    if (newRole === "office" || newRole === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  const login = async (email: string, password: string, role: Role) => {
    setLoading(true);
    const { supabase } = await import("./supabaseClient");
    const { db } = await import("./db");

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      // Check if they exist in the app DB but haven't set a Supabase Auth password yet
      const existing = await db.getUserByEmail(email);
      if (existing) {
        throw new Error("Please use 'Forgot Password' to set your password for the first time.");
      }
      throw new Error("Invalid email or password.");
    }

    const dbUser = await db.getUserByEmail(email);
    if (!dbUser) {
      setLoading(false);
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
    };

    setUser(userToSet);
    localStorage.setItem("fgas_user", JSON.stringify(userToSet));
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fgas_user");
    router.push("/");
  };

  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const { db } = await import("./db");
      const dbUser = await db.getUserById(user.id);
      if (dbUser) {
        const updated = { ...user, name: dbUser.name, email: dbUser.email, status: dbUser.status, availableRoles: dbUser.availableRoles, role: dbUser.role, vehicleReg: dbUser.vehicleReg, employer: dbUser.employer };
        setUser(updated);
        localStorage.setItem("fgas_user", JSON.stringify(updated));
      }
    } catch (err) {
      console.error("refreshUser failed", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, switchRole, logout, refreshUser, loading }}>
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
