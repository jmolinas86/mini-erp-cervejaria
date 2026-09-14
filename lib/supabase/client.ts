import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

if (!supabaseConfig.url || !supabaseConfig.publishableKey) {
  throw new Error(
    "Supabase não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
  );
}

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.publishableKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);
