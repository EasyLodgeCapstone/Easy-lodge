require("dotenv").config(); // Load env variables
require("./instrument.js");
const Sentry = require("@sentry/node");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const redis = require("./utils/redis-client.js");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const routeNotFound = require("./middleware/routeNotfound.js");
const { checkConnection: ConnectDb } = require("./config/db.js");
const ngrok = require("@ngrok/ngrok");
const errorHandler = require("./middleware/errorHandler.js"); // Import error handling middleware

// for google auth
const passport = require("passport");
require("./config/passportConfig.js"); // Passport config

const path = require("path");
// IMPORT YOUR ROUTER (fix #1)
const Router = require("./modules/GeneralRoute/Router.js"); // Adjust path as needed
const authRoutes = require("../src/modules/GeneralRoute/auth.route.js");
// const usersRoutes = require("../src/modules/GeneralRoute/users.route.js");
// const requestRoutes = require("../src/modules/GeneralRoute/request.route.js");

const app = express();

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security and performance enhancements middlewares
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       useDefaults: false,
//       directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: [
//           "'self'",
//           "example.com",
//           "cdnjs.cloudflare.com", // For jQuery
//           "fonts.googleapis.com", // For Google Fonts
//           "cdn.jsdelivr.net", // For Bootstrap
//           "cloud.redislabs.com", // For Redis client
//         ],
//         objectSrc: ["'none'"],
//         upgradeInsecureRequests: [],
//       },
//     },
//   }),
// );

app.use(compression());

// Logging middleware
app.use(morgan("combined"));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Redis Rate Limiting

const rateLimiter = async (req, res, next) => {
  const ip = req.ip;
  const key = `rate:${ip}`;

  try {
    const current = await redis.incr(key);
    // Set expiration on first request
    if (current === 1) {
      await redis.expire(key, 60); // 60 second window
    }

    if (current > 50) {
      // More than 10 requests per minute
      const ttl = await redis.ttl(key);
      return res.status(429).json({
        error: "Too many requests",
        retryAfter: ttl,
        message: `Please try again in ${ttl} seconds`,
      });
    }
    next();
  } catch (error) {
    console.error("Redis error:", error);
    next(error);
  }
};

// Cookie parser middleware
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());
//error handling middleware
// Routes
app.use("/api/auth", rateLimiter, authRoutes);
// app.use("/api/users", rateLimiter, usersRoutes);
// app.use("/api/requests", rateLimiter, requestRoutes);
app.use("/api/v1", rateLimiter, Router);
app.use(errorHandler);

// Debug route for Sentry (fix #2 - added comma)
app.get("/debug-sentry", function mainHandler(req, res) {
  // Send a log before throwing the error
  Sentry.logger.info("User triggered test error", {
    action: "test_error_endpoint",
  });
  // Send a test metric before throwing the error
  Sentry.metrics.count("test_counter", 1);
  throw new Error("My first Sentry error!");
});

// 404 handler
app.use(routeNotFound);

Sentry.setupExpressErrorHandler(app);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.status || 500;

  // Fix #4 - better error response
  res.status(statusCode).json({
    error: err.message,
    // Include Sentry event ID if available
    eventId: res.sentry || undefined,
  });
});

// Start server
const port = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await ConnectDb();
    app.listen(port, () => {
      console.log(`✅ Server is running on port ${port}`);
      console.log(`📍 Test Sentry: http://localhost:${port}/debug-sentry`);
    });

    // Get your endpoint online
    //ngrok
    //  .connect({ addr: process.env.PORT, authtoken_from_env: true })
    //  .then((listener) =>
    //    console.log(`Ingress established at: ${listener.url()}`),
    //  );
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error);
    process.exit(1);
  }
};

startServer();

// Export the app
module.exports = app;
