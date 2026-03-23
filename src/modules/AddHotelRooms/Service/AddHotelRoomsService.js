const { hotelRooms } = require("../../../dbSchema/HotelRoomSchema");
const { usersTable } = require("../../../dbSchema/userSchema");
const { hotels } = require("../../../dbSchema/HotelsSchema");
const { eq } = require("drizzle-orm");
const cloudinary = require("../../../config/Cloudinary");
const { db } = require("../../../config/db");
class AddHotelRoomService {
  constructor() {
    this.hotelRooms = hotelRooms;
    this.usersTable = usersTable;
    this.hotels = hotels;
  }

  async getHotelRooms(userId) {
    try {
      const hotels = await db
        .select()
        .from(this.hotels)
        .where(eq(this.hotels.ownerId, userId));

      if (hotels.length === 0) {
        throw new Error("User not found");
      }

      const hotelId = hotels[0].id;
      const hotelRooms = await db
        .select()
        .from(this.hotelRooms)
        .where(eq(this.hotelRooms.hotelId, hotelId));
      return hotelRooms;
    } catch (error) {
      console.log(error);
      throw new Error(error.message);
    }
  }
  async AddHotelRoom(userData) {
    try {
      const {
        userId,
        hotelId,
        roomNumber,
        roomType,
        roomPrice,
        capacity,
        bedType,
        bedCount,
        size,
        pricePerNight,
        discountedPrice,
        amenities,
        images,
      } = userData;

      //   const existingUser = await db
      //     .select()
      //     .from(this.usersTable)
      //     .where(eq(this.usersTable.ownerId, userId));

      //   if (existingUser.length === 0) {
      //     throw new Error("User not found");
      //   }

      const hotelImageResult = [];

      // Use for...of loop instead of forEach with async
      for (const img of images) {
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

      const newHotelRoom = {
        ownerId: userId,
        hotelId: hotelId,
        roomNumber: roomNumber,
        roomType: roomType,
        roomPrice: roomPrice,
        capacity: capacity,
        bedType: bedType,
        bedCount: bedCount,
        size: size,
        pricePerNight: pricePerNight,
        discountedPrice: discountedPrice,
        amenities: amenities,
        images: hotelImageResult,
        metadata: {
          userId,
          hotelId,
          roomNumber,
          roomType,
          roomPrice,
          capacity,
          bedType,
          bedCount,
          size,
          pricePerNight,
          discountedPrice,
          amenities,
          hotelImageResult,
        },
      };

      const result = await db.insert(this.hotelRooms).values(newHotelRoom);
      return result;
    } catch (error) {
      console.log(error);
      throw new Error(error.message);
    }
  }
}
module.exports = AddHotelRoomService;
