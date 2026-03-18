require("dotenv").config();
const pkg = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = pkg;

//importing other db files 
const schema = {
  ...require("../dbSchema/userSchema.js"),
  ...require("../dbSchema/profileSchema.js"),
  ...require("../dbSchema/serviceReqsSchema.js"),
};

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

//adding schema so db queries are available.
const db = drizzle(pool, { schema });

module.exports = { db, checkConnection };
