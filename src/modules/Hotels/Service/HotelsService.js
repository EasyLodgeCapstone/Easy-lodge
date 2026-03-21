const { usersTable } = require("../../../dbSchema/userSchema");
const { hotels } = require("../../../dbSchema/HotelsSchema");
const { eq, and, or, like, desc, asc, sql } = require("drizzle-orm");
const cloudinary = require("../../../config/Cloudinary");
const { db } = require("../../../config/db");
class HotelsService {
  constructor() {
    this.users = usersTable;
    this.hotels = hotels;
  }

  async getHotels() {
    const hotels = await db.select().from(this.hotels);
    return hotels;
  }

  async AddHotel(userData) {
    const {
      userId,
      hotelName,
      hotelEmail,
      hotelPhone,
      HotelWebsite,
      hotelAddress,
      hotelCity,
      hotelState,
      hotelCountry,
      hotelZipCode,
      hotelDescription,
      hotelRating,
      hotelReviewCount,
      hotelPriceRange,
      hotelMinPrice,
      hotelMaxPrice,
      hotelAmenities,
      hotelImages,
      hotelThumbnail,
      hotelVideo,
      hotelTotalRooms,
      hotelAvailableRooms,
      hotelPolicies,
    } = userData;

    console.log(
      "image",
      hotelImages,
      "thumbnail",
      hotelThumbnail,
      "video",
      hotelVideo,
    );

    const slug = this.generateSlug(hotelName);
    console.log("slug", slug);

    console.log("pass 1");

    const existingUser = await db
      .select()
      .from(this.users)
      .where(eq(this.users.id, userId));

    if (existingUser.length === 0) {
      throw new Error("User not found");
    }

    const isHotelExist = await db
      .select()
      .from(this.hotels)
      .where(eq(this.hotels.name, hotelName));

    console.log("pass 2");

    if (isHotelExist.length > 0) {
      throw new Error("Hotel already exists");
    }

    console.log("pass 3");

    const hotelImageResult = [];

    // Use for...of loop instead of forEach with async
    for (const img of hotelImages) {
      try {
        const result = await cloudinary.uploader.upload(img, {
          // Use 'img' not 'hotelImages'
          folder: "profile_media",
          resource_type: "auto",
        });

        hotelImageResult.push(result.secure_url);
        console.log("Upload successful:", result.secure_url);
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }

    console.log("pass 4");
    const hotelVideoResult = await cloudinary.uploader.upload(hotelVideo, {
      folder: "profile_media",
      resource_type: "auto",
    });

    console.log("pass 5");

    const hotelThumbnailResult = await cloudinary.uploader.upload(
      hotelThumbnail,
      {
        folder: "profile_media",
        resource_type: "auto",
      },
    );

    console.log("pass 6");

    const newHotel = {
      ownerId: userId,
      name: hotelName,
      slug: slug,
      description: hotelDescription,
      email: hotelEmail,
      phone: hotelPhone,
      website: HotelWebsite,
      address: hotelAddress,
      city: hotelCity,
      state: hotelState,
      country: hotelCountry,
      zipCode: hotelZipCode,
      rating: hotelRating,
      reviewCount: hotelReviewCount,
      priceRange: hotelPriceRange,
      minPrice: hotelMinPrice,
      maxPrice: hotelMaxPrice,
      amenities: hotelAmenities,
      image: hotelImageResult,
      thumbnail: hotelThumbnailResult.secure_url,
      video: hotelVideoResult.secure_url,
      totalRooms: hotelTotalRooms,
      availableRooms: hotelAvailableRooms,
      policies: hotelPolicies,
    };

    console.log(newHotel);

    const result = await db.insert(this.hotels).values(newHotel);
    return result;
  }

  generateSlug(name) {
    const slug = name
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return slug;
  }
}

module.exports = HotelsService;
