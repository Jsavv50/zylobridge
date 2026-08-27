import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const masked = url.replace(/:([^:@]+)@/, ":****@");
console.log("Testing connection to:", masked);

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });

async function run() {
  try {
    const [info] = await sql`SELECT current_database() as db, current_schema() as schema, current_user as usr;`;
    console.log("Runtime DB Info:", info);

    const [reg] = await sql`SELECT to_regclass('public.oauth_transactions') as reg;`;
    console.log("oauth_transactions reg:", reg);

    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public';`;
    console.log("Public tables:", tables.map(t => t.table_name));

    console.log("Connection successful!");
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await sql.end();
  }
}

run();
