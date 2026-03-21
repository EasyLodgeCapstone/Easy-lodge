const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. CREATE UPLOAD FOLDERS
// ========================================
// Define where files will be saved
const uploadDir = path.join(__dirname, "../uploads");

// Create main uploads folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create subfolders for different file types
const imagesDir = path.join(uploadDir, "hotels/images");
const thumbnailsDir = path.join(uploadDir, "hotels/thumbnails");
const videosDir = path.join(uploadDir, "hotels/videos");

// Create all folders
[imagesDir, thumbnailsDir, videosDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 2. CONFIGURE STORAGE (Where and how to save files)
// ========================================
const storage = multer.diskStorage({
  // destination: Where to save the file
  destination: function (req, file, cb) {
    // Check what type of file it is and save to appropriate folder
    if (file.fieldname === "hotelImages") {
      cb(null, imagesDir); // Save to hotels/images folder
    } else if (file.fieldname === "hotelThumbnail") {
      cb(null, thumbnailsDir); // Save to hotels/thumbnails folder
    } else if (file.fieldname === "hotelVideo") {
      cb(null, videosDir); // Save to hotels/videos folder
    } else {
      cb(null, uploadDir); // Save to main uploads folder
    }
  },

  // filename: What to name the saved file
  filename: function (req, file, cb) {
    // Create a unique filename to avoid overwriting
    // Format: timestamp-randomnumber-originalname
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = uniqueSuffix + "-" + file.originalname;

    cb(null, fileName);
  },
});

// 3. FILE FILTER (What types of files are allowed)
// ========================================
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
  ];
  const allowedVideoTypes = [
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-msvideo",
  ];

  // Check file type based on field name
  if (file.fieldname === "hotelImages" || file.fieldname === "hotelThumbnail") {
    // For images: only allow image files
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true); // Accept file
    } else {
      cb(
        new Error("Only image files (JPEG, PNG, GIF, WEBP, AVIF) are allowed!"),
        false,
      ); // Reject file
    }
  } else if (file.fieldname === "hotelVideo") {
    // For videos: only allow video files
    if (allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true); // Accept file
    } else {
      cb(
        new Error("Only video files (MP4, MOV, WEBM, AVI) are allowed!"),
        false,
      ); // Reject file
    }
  } else {
    cb(new Error("Unexpected file field!"), false); // Reject unknown fields
  }
};

// 4. CREATE UPLOAD MIDDLEWARE
// ========================================
const upload = multer({
  storage: storage, // Where to save files
  limits: {
    fileSize: 50 * 1024 * 1024, // Max file size: 50MB (in bytes)
  },
  fileFilter: fileFilter, // What files to allow
});

// 5. EXPORT READY-TO-USE MIDDLEWARE
// ========================================
module.exports = {
  // Main upload function for hotel form
  uploadHotelFiles: upload.fields([
    { name: "hotelImages", maxCount: 5 }, // Accept up to 5 images
    { name: "hotelThumbnail", maxCount: 1 }, // Accept 1 thumbnail
    { name: "hotelVideo", maxCount: 1 }, // Accept 1 video
  ]),

  // Error handler for uploads
  handleMulterError: (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      // Handle multer-specific errors
      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          return res.status(400).json({
            success: false,
            message: "File is too large. Maximum size is 50MB.",
          });
        case "LIMIT_FILE_COUNT":
          return res.status(400).json({
            success: false,
            message:
              "Too many files uploaded. Maximum: 5 images, 1 thumbnail, 1 video.",
          });
        case "LIMIT_UNEXPECTED_FILE":
          return res.status(400).json({
            success: false,
            message: `Unexpected field: ${err.field}. Use: hotelImages, hotelThumbnail, or hotelVideo`,
          });
        default:
          return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`,
          });
      }
    } else if (err) {
      // Handle custom errors (like wrong file type)
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  },

  // Simple function to get file URL
  getFileUrl: (req, filename) => {
    return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
  },
};
