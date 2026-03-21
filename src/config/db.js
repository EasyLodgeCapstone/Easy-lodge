require("dotenv").config();
const pkg = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = pkg;
const fs = require("fs");

//importing other db files
const schema = {
  ...require("../dbSchema/userSchema.js"),
  ...require("../dbSchema/profileSchema.js"),
  ...require("../dbSchema/serviceReqsSchema.js"),
};

let caCert;
try {
  caCert = fs.readFileSync("./ca.pem", "utf8");
  console.log("✅ CA certificate loaded from file");
} catch (err) {
  caCert = process.env.CA_CERT;
  if (caCert) {
    console.log("✅ CA certificate loaded from environment");
  } else {
    console.log("⚠️ No CA certificate found, using rejectUnauthorized: false");
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: caCert
    ? {
        rejectUnauthorized: true, // Fallback if no cert
        ca: caCert,
      }
    : {
        rejectUnauthorized: false, // Fallback if no cert
      },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Simple connection check
const checkConnection = async () => {
  try {
    console.log("🔄 Connecting to Aiven PostgreSQL...");
    const client = await pool.connect();
    console.log("✅ Database connected successfully!");

    // Test query
    const result = await client.query("SELECT NOW() as time");
    console.log("📅 Server time:", result.rows[0].time);
    client.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    console.log("🔧 Please check your DATABASE_URL environment variable");
  }
};

//adding schema so db queries are available.
const db = drizzle(pool, { schema });

module.exports = { db, checkConnection };
