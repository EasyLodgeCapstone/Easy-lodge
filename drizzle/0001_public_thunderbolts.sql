CREATE TABLE "booking_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"price_per_night" numeric(10, 2) NOT NULL,
	"guest_names" text,
	"quantity" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotel_bookings" DROP CONSTRAINT "hotel_bookings_room_id_hotel_rooms_id_fk";
--> statement-breakpoint
DROP INDEX "idx_hotel_bookings_room_id";--> statement-breakpoint
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_booking_id_hotel_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."hotel_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_room_id_hotel_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."hotel_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_booking_rooms_booking_id" ON "booking_rooms" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_booking_rooms_room_id" ON "booking_rooms" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_unique_booking_room" ON "booking_rooms" USING btree ("booking_id","room_id");--> statement-breakpoint
ALTER TABLE "hotel_bookings" DROP COLUMN "room_id";--> statement-breakpoint
ALTER TABLE "hotel_bookings" DROP COLUMN "price_per_night";