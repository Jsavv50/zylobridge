import postgres from "postgres";
import fs from "fs";

const directUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!directUrl) {
  console.error("Neither DIRECT_DATABASE_URL nor DATABASE_URL is set");
  process.exit(1);
}

// Redacted logging
const maskedUrl = directUrl.replace(/:([^:@]+)@/, ":****@");
console.log(`Connecting to migration target: ${maskedUrl}`);

const sql = postgres(directUrl, { max: 1, prepare: false });

async function run() {
  try {
    console.log("=== 1. CHECKING RUNTIME DB IDENTITY == [DIRECT_DATABASE_URL]");
    const [dbInfo] = await sql`SELECT current_database() as db, current_schema() as schema, current_user as usr;`;
    console.log("Database Identity:", dbInfo);

    const [regPre] = await sql`SELECT to_regclass('public.oauth_transactions') as reg;`;
    console.log("Pre-migration to_regclass('public.oauth_transactions'):", regPre);

    console.log("\n=== 2. APPLYING add_oauth_transactions.sql MIGRATION ===");
    const migrationSql = fs.readFileSync("./drizzle/add_oauth_transactions.sql", "utf8");
    await sql.unsafe(migrationSql);
    console.log("Migration SQL executed successfully.");

    console.log("\n=== 3. POST-MIGRATION VERIFICATION ===");
    const [regPost] = await sql`SELECT to_regclass('public.oauth_transactions') as reg;`;
    console.log("Post-migration to_regclass('public.oauth_transactions'):", regPost);

    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'oauth_transactions'
      ORDER BY ordinal_position;
    `;
    console.log("oauth_transactions columns:", columns);

    const indexes = await sql`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'oauth_transactions';
    `;
    console.log("oauth_transactions indexes:", indexes);

    console.log("Production database migration completed and verified successfully!");
  } catch (err) {
    console.error("Migration application failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
