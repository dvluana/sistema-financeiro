import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Client
 *
 * Note: Environment variables are validated at startup via validateEnv()
 * in server.ts, so we can safely use ! assertion here.
 */
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
