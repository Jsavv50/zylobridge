import { getDb } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("DB unavailable");
    process.exit(1);
  }

  try {
    const userRes = await db.execute(sql`
      SELECT id, email, openId, loginMethod, role, userType, isVerified, createdAt, lastSignedIn 
      FROM users 
      WHERE LOWER(email) = LOWER('minermikee777@gmail.com')
    `);
    console.log("MYSQL USER RECORD:", JSON.stringify(userRes, null, 2));

    const countRes = await db.execute(sql`
      SELECT count(*) as cnt FROM users WHERE LOWER(email) = LOWER('minermikee777@gmail.com')
    `);
    console.log("MYSQL DUPLICATE COUNT:", JSON.stringify(countRes, null, 2));

    const allUsersRes = await db.execute(sql`
      SELECT id, email, role, userType FROM users LIMIT 20
    `);
    console.log("ALL USERS SAMPLE:", JSON.stringify(allUsersRes, null, 2));
  } catch (e) {
    console.error("Query error:", e);
  }

  process.exit(0);
}

run();
