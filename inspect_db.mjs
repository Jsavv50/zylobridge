import { getDb } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("DB unavailable");
    process.exit(1);
  }

  try {
    const enumRes = await db.execute(sql`
      SELECT e.enumlabel 
      FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = 'role'
    `);
    console.log("LIVE DATABASE ROLE ENUM:", JSON.stringify(enumRes, null, 2));
  } catch (e) {
    console.error("Enum query error:", e);
  }

  try {
    const userRes = await db.execute(sql`
      SELECT id, email, openId, loginMethod, role, userType, isVerified, createdAt, lastSignedIn 
      FROM users 
      WHERE LOWER(email) = LOWER('minermikee777@gmail.com')
    `);
    console.log("LIVE USER RECORD:", JSON.stringify(userRes, null, 2));

    const countRes = await db.execute(sql`
      SELECT count(*) as cnt FROM users WHERE LOWER(email) = LOWER('minermikee777@gmail.com')
    `);
    console.log("DUPLICATE COUNT:", JSON.stringify(countRes, null, 2));

    const googleRes = await db.execute(sql`
      SELECT id, email, openId, loginMethod, role, userType 
      FROM users 
      WHERE openId LIKE 'google_%'
    `);
    console.log("GOOGLE USERS:", JSON.stringify(googleRes, null, 2));
  } catch (e) {
    console.error("User query error:", e);
  }

  process.exit(0);
}

run();
