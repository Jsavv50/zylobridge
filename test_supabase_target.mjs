import postgres from 'postgres';

// Construct PostgreSQL connection URL from Supabase environment variables
// Note: Supabase direct postgres connection or pooler connection URL
const supabaseUrl = process.env.SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

console.log("Supabase URL configured:", Boolean(supabaseUrl));
console.log("Supabase Service Key configured:", Boolean(serviceKey));

// If Supabase URL is https://ztasdzkunkhfrnxmnmzq.supabase.co, the Postgres host is db.ztasdzkunkhfrnxmnmzq.supabase.co or pooler
// Alternatively, let's check if SUPABASE_DB_URL or direct connection is provided in env
const pgUrl = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_POSTGRES;

if (!pgUrl) {
  console.log("No explicit PostgreSQL DATABASE_URL found in environment. Checking if SUPABASE_URL can be used to construct postgres connection or if we need pooler URL.");
}
