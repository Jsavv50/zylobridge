import postgres from 'postgres';
import mysql from 'mysql2/promise';

console.log("[Migration] Initializing migration script...");
// We will inspect environment variables safely without logging secrets
const sourceUrl = process.env.DATABASE_URL; // currently TiDB/MySQL
const targetUrl = process.env.DIRECT_DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

console.log("Source URL defined:", Boolean(sourceUrl));
console.log("Target URL defined:", Boolean(targetUrl));
