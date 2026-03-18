const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Check if environment variables are present
const requiredEnvVars = {
  CLOUD_NAME: process.env.CLOUD_NAME,
  CLOUDNARY_API_KEY: process.env.CLOUDNARY_API_KEY,
  CLOUDNARY_API_SECRET: process.env.CLOUDNARY_API_SECRET
};

// Validate all required environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error("❌ Cloudinary configuration failed: Missing environment variables:");
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error("\nPlease add them to your .env file:");
  console.error(`
CLOUD_NAME=your_cloud_name
CLOUDNARY_API_KEY=your_api_key
CLOUDNARY_API_SECRET=your_api_secret
  `);
} else {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDNARY_API_KEY,
    api_secret: process.env.CLOUDNARY_API_SECRET,
  });

  // Test connection by pinging Cloudinary
  cloudinary.api.ping()
    .then(result => {
      console.log("✅ Cloudinary connected successfully!");
      console.log(`   Cloud Name: ${process.env.CLOUD_NAME}`);
      console.log(`   Status: ${result.status || "OK"}`);
      console.log(`   Time: ${new Date().toLocaleString()}`);
    })
    .catch(error => {
      console.error("❌ Cloudinary connection failed!");
      console.error(`   Error: ${error.message}`);
      console.error(`   Please check your credentials and try again.`);
    });
}

// Optional: Add a function to check connection status
cloudinary.checkConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    return {
      connected: true,
      message: "Cloudinary is connected",
      details: result
    };
  } catch (error) {
    return {
      connected: false,
      message: "Cloudinary connection failed",
      error: error.message
    };
  }
};

module.exports = cloudinary;