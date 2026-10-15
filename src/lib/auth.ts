import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";

export interface UserProfile {
  id: string;
  business_id: string;
  full_name: string;
  phone?: string;
  role: "gerant" | "vendeur";
  is_active: boolean;
}

export interface BusinessTenant {
  id: string;
  name: string;
  owner: string;
  plan_tier: "free" | "pro" | "enterprise";
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<BusinessTenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadProfile(currentUser: User | null) {
      if (!currentUser) {
        if (isMounted) {
          setProfile(null);
          setBusiness(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data: prof, error: profErr } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (profErr) {
          console.warn("Could not fetch user profile:", profErr.message);
        }

        if (prof) {
          if (isMounted) setProfile(prof as UserProfile);

          const { data: biz } = await supabase
            .from("businesses")
            .select("id, name, owner, plan_tier")
            .eq("id", prof.business_id)
            .maybeSingle();

          if (biz && isMounted) {
            setBusiness(biz as BusinessTenant);
          }
        }
      } catch (err) {
        console.error("Auth profile error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    // Initial session
    void supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (isMounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        void loadProfile(currentSession?.user ?? null);
      }
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        void loadProfile(newSession?.user ?? null);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user,
    profile,
    business,
    loading,
    isAuthenticated: Boolean(session?.user),
    isConfigured: isSupabaseConfigured,
  };
}

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase n'est pas encore configuré. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
  }
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  metadata: { fullName: string; businessName: string }
) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase n'est pas encore configuré. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
  }
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: metadata.fullName,
        business_name: metadata.businessName,
      },
    },
  });
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase n'est pas encore configuré. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
  }
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth` : null;
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    ...(redirectTo ? { options: { redirectTo } } : {}),
  });
}

export async function sendPasswordResetEmail(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase n'est pas encore configuré. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
  }
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth?mode=reset` : null;
  return await supabase.auth.resetPasswordForEmail(
    email,
    ...(redirectTo ? [{ redirectTo }] : [])
  );
}

export async function updatePassword(newPassword: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase n'est pas encore configuré.");
  }
  return await supabase.auth.updateUser({ password: newPassword });
}

export async function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("gesto_guest_mode");
  }
  if (!isSupabaseConfigured) return;
  return await supabase.auth.signOut();
}
