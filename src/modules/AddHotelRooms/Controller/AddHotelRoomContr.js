const AddHotelRoomsService = require("../Service/AddHotelRoomsService");
const {
  uploadHotelFiles,
  handleMulterError,
} = require("../../../config/mutlerConfig");
const fs = require("fs").promises;
const path = require("path");
const { pipeline } = require("stream/promises");
const { createWriteStream } = require("fs");
const { Readable } = require("stream");
const multer = require("multer");
class AddHotelRoomsContr {
  constructor() {
    this.service = new AddHotelRoomsService();
  }

  getHotelRooms = async (req, res) => {
    try {
      const userId = req.user.id;
      
      const hotelRooms = await this.service.getHotelRooms(userId);
      return res.status(200).json({
        success: true,
        message: "Hotel rooms retrieved successfully",
        hotelRooms,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  };
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
          resolve();
        }
      });
    });
  };

  streamToDisk = async (file, destination) => {
    const readStream = Readable.from(file.buffer); // If file is in memory
    const writeStream = createWriteStream(destination);
    await pipeline(readStream, writeStream);
    return destination;
  };

  AddHotelRoom = async (req, res) => {
    const startTime = Date.now();
    let uploadedFiles = [];
    try {
      await this.processUpload(req, res);

      // Quick validation
      if (!req.user.id) {
        throw new Error(
          "Missing required fields: ",
        );
      }
      const amenities = this.parseJSON(req.body.amenities, []);

      // CORRECTION: Handle amenities array properly
      let amenitiesArray = amenities;
      if (req.body["hotelAmenities[]"]) {
        // If sent as individual fields
        amenitiesArray = Array.isArray(req.body["hotelAmenities[]"])
          ? req.body["hotelAmenities[]"]
          : [req.body["hotelAmenities[]"]];
      }

      const newRooms = {
        ownerId: req.user.id,
        hotelId: req.body.hotelId,
        roomNumber: req.body.roomNumber,
        roomType: req.body.roomType,
        roomPrice: req.body.roomPrice,
        capacity: req.body.roomCapacity,
        bedType: req.body.bedType,
        bedCount: req.body.bedCount,
        size: req.body.size,
        pricePerNight: req.body.pricePerNight,
        discountedPrice: req.body.discountedPrice,
        amenities: amenitiesArray,
        images: req.files?.hotelImages?.map((f) => f.path) || [],
      };

      const savedHotelRoom = await this.service.AddHotelRoom(newRooms);
      console.log(savedHotelRoom);
      const processingTime = Date.now() - startTime;
      console.log(`✅ Hotel added in ${processingTime}ms`);
      return res.status(201).json({
        success: true,
        message: "Hotel added successfully",
      });
    } catch (error) {
      console.log(error);
      // Cleanup on error
      if (req.files) {
        await this.cleanupFiles(req.files).catch((cleanupErr) =>
          console.warn("Cleanup error:", cleanupErr),
        );
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  };
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

module.exports = AddHotelRoomsContr;
