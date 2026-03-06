require("dotenv").config();
const pkg = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Simple connection check
const checkConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully!");
    client.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    console.log("🔧 Please check your DATABASE_URL environment variable");
  }
};

const db = drizzle(pool);

module.exports = { db, checkConnection };
