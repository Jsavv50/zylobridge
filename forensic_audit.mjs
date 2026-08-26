import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1, prepare: false });

async function run() {
  try {
    console.log("=== 1. CONNECTION IDENTITY ===");
    const [dbInfo] = await sql`SELECT current_database() as db, current_schema() as schema, current_user as usr, inet_server_addr() as addr, inet_server_port() as port`;
    console.log(dbInfo);

    console.log("\n=== 2. ROLE ENUM LABELS ===");
    const enums = await sql`
      SELECT n.nspname AS schema_name,
             t.typname AS enum_name,
             e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'role'
      ORDER BY e.enumsortorder;
    `;
    console.log(enums);

    console.log("\n=== 3. USERS.ROLE COLUMN INFO ===");
    const col = await sql`
      SELECT table_schema, table_name, column_name, udt_schema, udt_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role';
    `;
    console.log(col);

    console.log("\n=== 4. TARGET USER RECORD ===");
    const users = await sql`
      SELECT id, email, "openId", role, "userType"
      FROM users
      WHERE LOWER(email) = LOWER('Minermikee777@gmail.com');
    `;
    console.log(users);

    console.log("\n=== 5. TRANSACTIONAL CAST TEST ('SUPER_ADMIN'::role) ===");
    try {
      await sql`BEGIN`;
      const [testCast] = await sql`SELECT 'SUPER_ADMIN'::role as cast_result`;
      console.log("Cast test SUCCEEDED:", testCast);
      await sql`ROLLBACK`;
    } catch (err) {
      console.error("Cast test FAILED:", err.message);
      await sql`ROLLBACK`;
    }

  } catch (err) {
    console.error("Forensic audit error:", err);
  } finally {
    await sql.end();
  }
}

run();
