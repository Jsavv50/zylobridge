import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 5 });
const res = await sql`SELECT 1 as num`;
console.log("Connected successfully:", res);
process.exit(0);
