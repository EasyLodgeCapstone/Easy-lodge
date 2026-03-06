const redis = require("redis");

// Create a Redis client
const client = redis.createClient({
  url: process.env.REDIS_URL, // Default connection string
});

// Handle connection events
client.on("connect", () => {
  console.log("✅ Connected to Redis successfully!");
});

client.on("error", (err) => {
  console.error("❌ Redis Client Error:", err);
});

// Connect to Redis
async function connectRedis() {
  await client.connect();
}

connectRedis();

// Export the client for use in other files
module.exports = client;
