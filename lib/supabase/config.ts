const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfig = {
  url: supabaseUrl,
  publishableKey: supabasePublishableKey,
  isConfigured: Boolean(supabaseUrl && supabasePublishableKey)
};
