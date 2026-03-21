// src/config/Migrations.js
require("dotenv").config();
const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { Pool } = require("pg");

async function runMigrations() {
  console.log("🚀 Running migrations for Aiven PostgreSQL...");

  // EXACT configuration that works with Aiven
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Critical for Aiven's self-signed cert
    },
    // Force SSL mode
    sslmode: "require",
    connectionTimeoutMillis: 30000,
  });

  try {
    // Test connection with a simple query first
    console.log("📡 Testing connection...");
    const client = await pool.connect();

    // Check if SSL is actually working
    const sslStatus = await client.query("SHOW ssl");
    console.log("🔒 SSL status:", sslStatus.rows[0].ssl);

    // Get connection info
    const version = await client.query("SELECT version()");
    console.log(
      "📊 PostgreSQL version:",
      version.rows[0].version.substring(0, 50) + "...",
    );

    client.release();
    console.log("✅ Connection successful!");

    // Run migrations
    console.log("📦 Running migrations...");
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "./drizzle" });

    console.log("✅ Migrations completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);

    // Helpful troubleshooting
    if (err.message.includes("does not support SSL")) {
      console.log("\n🔧 FIX: Your connection needs exact SSL config:");
      console.log(`
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});`);
    }
    if (err.message.includes("no pg_hba.conf")) {
      console.log("\n🔧 FIX: Add your IP to Aiven allowlist");
      console.log("IP to add:", "129.205.124.206");
    }
  } finally {
    await pool.end();
  }
}

runMigrations();
