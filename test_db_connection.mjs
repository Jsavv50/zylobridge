import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
console.log("DATABASE_URL present:", !!connectionString);

if (!connectionString) {
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1, prepare: false, connect_timeout: 5 });

async function run() {
  try {
    console.log("Connecting to database...");
    const start = Date.now();
    const [res] = await sql`SELECT current_database(), current_user, inet_server_addr(), inet_server_port();`;
    console.log(`Connected in ${Date.now() - start}ms:`, res);
    await sql.end();
  } catch (err) {
    console.error("Connection test failed:", err);
    process.exit(1);
  }
}

run();
