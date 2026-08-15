import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 3, idle_timeout: 5, prepare: false });
try {
  const [res] = await sql`SELECT current_database()`;
  console.log("Connected to database:", res.current_database);
} catch (err) {
  console.error("Connection error:", err);
} finally {
  await sql.end();
}
