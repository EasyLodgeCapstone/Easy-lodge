const dotenv = require("dotenv");
const { defineConfig } = require('drizzle-kit');

dotenv.config();

module.exports = defineConfig({
  out: './drizzle',
  schema: './src/dbSchema/**/*.js',  // ← Looks at ALL .js files in ANY subfolder!
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
});