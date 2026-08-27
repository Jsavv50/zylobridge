import postgres from "postgres";
import fs from "fs";

const directUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!directUrl) {
  console.error("Neither DIRECT_DATABASE_URL nor DATABASE_URL is set");
  process.exit(1);
}

const sql = postgres(directUrl, { max: 1, prepare: false });

async function run() {
  try {
    console.log("=== 1. CHECKING oauth_transactions TABLE ===");
    const [pre] = await sql`SELECT to_regclass('public.oauth_transactions') as reg;`;
    console.log("Pre-migration to_regclass:", pre);

    console.log("\n=== 2. EXECUTING add_oauth_transactions.sql ===");
    const oauthSql = fs.readFileSync("./drizzle/add_oauth_transactions.sql", "utf8");
    await sql.unsafe(oauthSql);
    console.log("oauth_transactions table created successfully.");

    console.log("\n=== 3. EXECUTING add_super_admin.sql ===");
    const adminSql = fs.readFileSync("./drizzle/add_super_admin.sql", "utf8");
    await sql.unsafe(adminSql);
    console.log("Super admin enum/role migration executed successfully.");

    console.log("\n=== 4. POST-MIGRATION VERIFICATION ===");
    const [post] = await sql`SELECT to_regclass('public.oauth_transactions') as reg;`;
    console.log("Post-migration to_regclass:", post);

    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'oauth_transactions'
      ORDER BY ordinal_position;
    `;
    console.log("oauth_transactions columns:", cols);

    console.log("All production migrations verified successfully!");
  } catch (err) {
    console.error("Migration execution failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
