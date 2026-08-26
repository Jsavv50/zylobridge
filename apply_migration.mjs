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
    console.log("=== 1. PRE-MIGRATION ENUM INSPECTION ===");
    const preEnums = await sql`
      SELECT t.typname AS enum_name, e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'role'
      ORDER BY e.enumsortorder;
    `;
    console.log("Current role enum labels:", preEnums.map(r => r.enum_value));

    console.log("\n=== 2. EXECUTING ADDITIVE MIGRATION ===");
    const migrationSql = fs.readFileSync("./drizzle/add_super_admin.sql", "utf8");
    await sql.unsafe(migrationSql);
    console.log("Migration executed successfully.");

    console.log("\n=== 3. POST-MIGRATION ENUM INSPECTION ===");
    const postEnums = await sql`
      SELECT t.typname AS enum_name, e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'role'
      ORDER BY e.enumsortorder;
    `;
    console.log("Updated role enum labels:", postEnums.map(r => r.enum_value));

    console.log("\n=== 4. PROVING POSTGRES ACCEPTS 'SUPER_ADMIN'::role ===");
    await sql`BEGIN`;
    const [castTest] = await sql`SELECT 'SUPER_ADMIN'::role as cast_val`;
    console.log("Cast test result:", castTest);
    await sql`ROLLBACK`;
    console.log("Rollback complete. Enum validation passed!");

    console.log("\n=== 5. VERIFYING TARGET USER (id = 69 or Minermikee777@gmail.com) ===");
    const users = await sql`
      SELECT id, email, "openId", role, "userType"
      FROM users
      WHERE LOWER(email) = LOWER('Minermikee777@gmail.com');
    `;
    console.log("Target user record:", users);

  } catch (err) {
    console.error("Migration execution failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
