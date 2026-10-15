import { createClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://bphibmpbhhqznoqfmtuq.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwaGlibXBiaGhxem5vcWZtdHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNTg2MjksImV4cCI6MjEwNzYzNDYyOX0.lo6Ba0SZvZlc7WxCB0o7jDR1Pqdavpt9MfzAs6r4R3g";

const supabaseUrl = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) || DEFAULT_URL;
const supabaseAnonKey = (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined) || DEFAULT_ANON_KEY;

/**
 * Indique si les identifiants Supabase sont configurés.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== "https://your-project.supabase.co" &&
  !supabaseUrl.includes("placeholder")
);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
