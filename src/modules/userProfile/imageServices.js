const cloudinary = require("../../config/cloudinary");
const fs = require("fs");
const AppError = require("../../middleware/appError.js");

class ImageService {

    static async uploadImages(file) {
        if (!file) {
            throw new AppError("No files uploaded", 400);
        }

        try {
            const result = await cloudinary.uploader.upload(file.path, {
                folder: "avatars",
                transformation: [
                    { width: 400, height: 400, crop: "fill", gravity: "face" }
                ],
            });

            return { 
                url: result.secure_url,
                publicId: result.public_id,
            };
        } catch (error) {
            throw new AppError(`Image upload failed: ${error.message}`, 500);
        } finally {
            // Always clean up the temp file, whether upload succeeded or failed
            if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        }
    }


    static async uploadImages(files) {
        if (!files || files.length === 0) {
            throw new AppError("No files uploaded", 400);
        }

        const uploadedImages = [];

        for (const file of files) {
            try {
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: "uploads",
                    tags: ["temp"],
                });

                uploadedImages.push({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            } catch (error) {
                // Clean up any images already uploaded in this batch
                for (const img of uploadedImages) {
                    await cloudinary.uploader.destroy(img.publicId).catch(() => { });
                }
                // FIX: was "ApiError" which doesn't exist — replaced with AppError
                throw new AppError(`Image upload failed: ${error.message}`, 500);
            } finally {
                // Always clean up the temp file whether upload succeeded or failed
                if (file.path && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }

        return uploadedImages;
    }


    static async attachImagesToProduct(productId, images) {
        for (const img of images) {
            try {
                await cloudinary.uploader.add_tag(`product_${productId}`, img.publicId);
                await cloudinary.uploader.remove_tag("temp", img.publicId);
            } catch (error) {
                throw new AppError(
                    `Failed to attach image ${img.publicId} to product: ${error.message}`,
                    500
                );
            }
        }
    }

    static async deleteImage(publicId) {
        if (!publicId) {
            throw new AppError("No image ID provided for deletion", 400);
        }
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            throw new AppError(`Failed to delete image: ${error.message}`, 500);
        }
    }

    static async deleteImages(publicIds) {
        if (!publicIds || publicIds.length === 0) {
            throw new AppError("No image IDs provided for deletion", 400);
        }

        const errors = [];

        for (const id of publicIds) {
            try {
                await cloudinary.uploader.destroy(id);
            } catch (error) {
                // Collect errors so one failure doesn't block the rest from being deleted
                errors.push(`Failed to delete ${id}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            throw new AppError(500, `Image deletion partially failed: ${errors.join("; ")}`);
        }
    }
}

module.exports = ImageService;