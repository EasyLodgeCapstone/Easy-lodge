const {
  uploadHotelFiles,
  handleMulterError,
} = require("../../../config/mutlerConfig");
const HotelsService = require("../Service/HotelsService");
const fs = require("fs").promises;
const path = require("path");
const { pipeline } = require("stream/promises");
const { createWriteStream } = require("fs");
const { Readable } = require("stream");
const multer = require("multer");

class HotelsContr {
  constructor() {
    this.hotelsService = new HotelsService();
  }

  // Process file uploads - SIMPLIFIED VERSION
  processUpload = (req, res) => {
    return new Promise((resolve, reject) => {
      // CORRECTION: uploadHotelFiles is the middleware itself, not a method
      uploadHotelFiles(req, res, (err) => {
        if (err) {
          console.error("Upload error:", err);
          reject(err);
        } else {
          console.log("Upload successful");
          // console.log("Body:", req.body);
          // console.log("Files:", req.files);
          resolve();
        }
      });
    });
  };

  // Stream file to disk without loading into memory
  streamToDisk = async (file, destination) => {
    const readStream = Readable.from(file.buffer); // If file is in memory
    const writeStream = createWriteStream(destination);
    await pipeline(readStream, writeStream);
    return destination;
  };

  AddHotel = async (req, res) => {
    const startTime = Date.now();
    let uploadedFiles = [];

    try {
      // Process upload first - this will populate req.body and req.files
      await this.processUpload(req, res);

      // NOW we can access req.body and req.files
      // console.log("Request Body after upload:", req.body);
      // console.log("Request Files after upload:", req.files);

      // Quick validation
      if (!req.body.hotelName || !req.body.userId) {
        throw new Error(
          "Missing required fields: hotelName and userId are required",
        );
      }

      // Parse JSON data
      const amenities = this.parseJSON(req.body.hotelAmenities, []);
      const policies = this.parseJSON(req.body.hotelPolicies, []);

      // CORRECTION: Handle amenities array properly
      let amenitiesArray = amenities;
      if (req.body["hotelAmenities[]"]) {
        // If sent as individual fields
        amenitiesArray = Array.isArray(req.body["hotelAmenities[]"])
          ? req.body["hotelAmenities[]"]
          : [req.body["hotelAmenities[]"]];
      }

      // Build hotel data
      const hotelData = {
        userId: req.body.userId,
        hotelName: req.body.hotelName,
        hotelEmail: req.body.hotelEmail || "",
        hotelPhone: req.body.hotelPhone || "",
        hotelWebsite: req.body.hotelWebsite || "",
        hotelAddress: req.body.hotelAddress || "",
        hotelCity: req.body.hotelCity || "",
        hotelState: req.body.hotelState || "",
        hotelCountry: req.body.hotelCountry || "",
        hotelZipCode: req.body.hotelZipCode || "",
        hotelDescription: req.body.hotelDescription || "",
        hotelRating: parseFloat(req.body.hotelRating) || 0,
        hotelReviewCount: parseInt(req.body.hotelReviewCount) || 0,
        hotelPriceRange: req.body.hotelPriceRange || "",
        hotelMinPrice: parseFloat(req.body.hotelMinPrice) || 0,
        hotelMaxPrice: parseFloat(req.body.hotelMaxPrice) || 0,
        hotelAmenities: amenitiesArray, // Use the processed amenities
        hotelImages: req.files?.hotelImages?.map((f) => f.path) || [],
        hotelThumbnail: req.files?.hotelThumbnail?.[0]?.path || null,
        hotelVideo: req.files?.hotelVideo?.[0]?.path || null,
        hotelTotalRooms: parseInt(req.body.hotelTotalRooms) || 0,
        hotelAvailableRooms: parseInt(req.body.hotelAvailableRooms) || 0,
        hotelPolicies: policies,
      };

      // console.log("Hotel data to save:", hotelData);

      // Save to database
      const savedHotel = await this.hotelsService.AddHotel(hotelData);

      console.log(savedHotel);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Hotel added in ${processingTime}ms`);

      return res.status(201).json({
        success: true,
        message: "Hotel added successfully",
        data: {
          id: savedHotel.id || savedHotel._id,
          name: savedHotel.hotelName,
          imageCount: hotelData.hotelImages.length,
          thumbnail: hotelData.hotelThumbnail,
          processingTime: `${processingTime}ms`,
        },
      });
    } catch (error) {
      console.error("❌ Add hotel error:", error);

      // Cleanup on error
      if (req.files) {
        await this.cleanupFiles(req.files).catch((cleanupErr) =>
          console.warn("Cleanup error:", cleanupErr),
        );
      }

      // Handle different error types
      if (error instanceof multer.MulterError) {
        // Multer-specific errors
        return res.status(400).json({
          success: false,
          message: this.getMulterErrorMessage(error),
          code: error.code,
        });
      }

      const statusCode = error.message.includes("timeout") ? 408 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to add hotel",
      });
    }
  };

  // Helper to parse JSON safely
  parseJSON = (data, defaultValue = []) => {
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      // If it's not JSON, return as is or as array
      if (Array.isArray(data)) return data;
      if (typeof data === "string") return [data];
      return defaultValue;
    }
  };

  // Get user-friendly multer error messages
  getMulterErrorMessage = (error) => {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return "File too large. Maximum size is 50MB.";
      case "LIMIT_FILE_COUNT":
        return "Too many files. Maximum: 5 images, 1 thumbnail, 1 video.";
      case "LIMIT_UNEXPECTED_FILE":
        return `Unexpected field: ${error.field}. Use: hotelImages, hotelThumbnail, or hotelVideo`;
      case "LIMIT_PART_COUNT":
        return "Too many parts in the form.";
      default:
        return `Upload error: ${error.message}`;
    }
  };

  // Clean up files on error
  cleanupFiles = async (files) => {
    if (!files) return;

    const deletePromises = [];

    Object.values(files).forEach((fileArray) => {
      if (Array.isArray(fileArray)) {
        fileArray.forEach((file) => {
          if (file.path) {
            deletePromises.push(
              fs
                .unlink(file.path)
                .catch((err) =>
                  console.warn(
                    `⚠️ Failed to delete ${file.path}:`,
                    err.message,
                  ),
                ),
            );
          }
        });
      }
    });

    await Promise.all(deletePromises);
    console.log(`🧹 Cleaned up ${deletePromises.length} files`);
  };
}

module.exports = HotelsContr;
