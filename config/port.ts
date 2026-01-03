// Portal28 Academy - Port Configuration
// All port references are centralized here for easy configuration

export const PORT_CONFIG = {
  // Main application port
  APP_PORT: parseInt(process.env.PORT || process.env.APP_PORT || "2828", 10),
  
  // Supabase local ports (when using local development)
  SUPABASE_API_PORT: parseInt(process.env.SUPABASE_API_PORT || "54321", 10),
  SUPABASE_STUDIO_PORT: parseInt(process.env.SUPABASE_STUDIO_PORT || "54323", 10),
  SUPABASE_INBUCKET_PORT: parseInt(process.env.SUPABASE_INBUCKET_PORT || "54324", 10),
  SUPABASE_DB_PORT: parseInt(process.env.SUPABASE_DB_PORT || "54322", 10),
} as const;

export function getAppUrl(): string {
  const port = PORT_CONFIG.APP_PORT;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  if (baseUrl) return baseUrl;
  
  // Default to localhost with configured port
  return `http://localhost:${port}`;
}

export function getSupabaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  return `http://127.0.0.1:${PORT_CONFIG.SUPABASE_API_PORT}`;
}
