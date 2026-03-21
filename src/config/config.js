const { z } = require("zod");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const configSchema = z.object({
  PORT: z.coerce.number().default(5001),
  NODE_ENV: z
    .enum(["production", "development", "test"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRES_MINS: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_DAYS: z.string().default("7d"),
  SALT_ROUNDS: z.coerce.number(),
  RESET_TOKEN_EXPIRATION: z.string(),
  EMAIL_USERNAME: z.string(),
  EMAIL_PASSWORD: z.string(),
  SENTRY_DSN: z.string(),
  SENTRY_DEFAULTPII: z.coerce.boolean(),
  REDIS_URL: z.string().url(),
  //NGROK_AUTHTOKEN: z.string(),
  //PAYSTACK_SECRET_KEY: z.string(),
  //PAYSTACK_PUBLIC_KEY: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string().url(),

  NGROK_AUTHTOKEN: z.string(),
  PAYSTACK_SECRET_KEY: z.string(),
  PAYSTACK_PUBLIC_KEY: z.string(),
  CLOUD_NAME: z.string(),
  CLOUDNARY_API_KEY: z.string(),
  CLOUDNARY_API_SECRET: z.string(),
  CLOUDINARY_URL: z.string(),
  // BASE_URL: z.string().url(),
  // MONNIFY_API_KEY: z.string(),
  // MONNIFY_SECRET_KEY: z.string(),
  // MONNIFY_CONTRACT_CODE: z.string(),
  // MONNIFY_BASE_URL: z.string().url(),
});

const config = configSchema.parse(process.env);

module.exports = { config };
