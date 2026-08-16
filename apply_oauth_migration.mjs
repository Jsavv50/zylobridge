import postgres from "postgres";
import fs from "fs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1, prepare: false });

async function run() {
  try {
    console.log("=== 1. CHECKING oauth_transactions TABLE PRE-MIGRATION ===");
    const preCheck = await sql`
      SELECT to_regclass('public.oauth_transactions') as table_exists;
    `;
    console.log("Pre-migration table check:", preCheck);

    console.log("\n=== 2. EXECUTING oauth_transactions MIGRATION ===");
    const migrationSql = fs.readFileSync("./drizzle/add_oauth_transactions.sql", "utf8");
    await sql.unsafe(migrationSql);
    console.log("Migration executed successfully.");

    console.log("\n=== 3. CHECKING oauth_transactions TABLE POST-MIGRATION ===");
    const postCheck = await sql`
      SELECT to_regclass('public.oauth_transactions') as table_exists;
    `;
    console.log("Post-migration table check:", postCheck);

    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'oauth_transactions'
      ORDER BY ordinal_position;
    `;
    console.log("oauth_transactions columns:", columns);

    console.log("\n=== 4. PROVING CRUD OPERATIONS ON oauth_transactions ===");
    const testRequestId = "TEST9999";
    const testStateHash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    
    // INSERT
    await sql`
      INSERT INTO oauth_transactions ("requestId", "stateHash", status, "expiresAt")
      VALUES (${testRequestId}, ${testStateHash}, 'initiated', NOW() + INTERVAL '10 minutes')
      ON CONFLICT ("stateHash") DO NOTHING;
    `;
    console.log("INSERT test successful.");

    // SELECT
    const [inserted] = await sql`
      SELECT * FROM oauth_transactions WHERE "requestId" = ${testRequestId};
    `;
    console.log("SELECT test successful:", inserted);

    // UPDATE
    await sql`
      UPDATE oauth_transactions SET status = 'claimed' WHERE "requestId" = ${testRequestId};
    `;
    console.log("UPDATE test successful.");

    // DELETE cleanup
    await sql`
      DELETE FROM oauth_transactions WHERE "requestId" = ${testRequestId};
    `;
    console.log("DELETE cleanup successful. All CRUD tests passed!");

  } catch (err) {
    console.error("Migration/CRUD test failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
