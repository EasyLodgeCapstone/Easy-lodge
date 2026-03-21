CREATE TYPE "public"."user_role" AS ENUM('admin', 'staff', 'user');--> statement-breakpoint
CREATE TABLE "hotel_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_reference" varchar(100) NOT NULL,
	"user_id" integer NOT NULL,
	"hotel_id" integer NOT NULL,
	"room_id" integer,
	"check_in_date" timestamp NOT NULL,
	"check_out_date" timestamp NOT NULL,
	"number_of_nights" integer NOT NULL,
	"number_of_guests" integer NOT NULL,
	"number_of_rooms" integer DEFAULT 1,
	"guest_name" varchar(255),
	"guest_email" varchar(255),
	"guest_phone" varchar(50),
	"special_requests" text,
	"price_per_night" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0.00',
	"discount_amount" numeric(10, 2) DEFAULT '0.00',
	"total_amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"payment_status" varchar(50) DEFAULT 'pending',
	"payment_method" varchar(50),
	"payment_reference" varchar(100),
	"booking_status" varchar(50) DEFAULT 'confirmed',
	"cancellation_reason" text,
	"cancelled_at" timestamp,
	"cancelled_by" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "hotel_bookings_booking_reference_unique" UNIQUE("booking_reference")
);
--> statement-breakpoint
CREATE TABLE "hotel_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"hotel_id" integer NOT NULL,
	"booking_id" integer,
	"rating" numeric(2, 1) NOT NULL,
	"title" varchar(255),
	"comment" text,
	"cleanliness_rating" numeric(2, 1),
	"comfort_rating" numeric(2, 1),
	"location_rating" numeric(2, 1),
	"facilities_rating" numeric(2, 1),
	"staff_rating" numeric(2, 1),
	"value_for_money_rating" numeric(2, 1),
	"images" jsonb DEFAULT '[]'::jsonb,
	"is_verified" boolean DEFAULT false,
	"is_recommended" boolean DEFAULT true,
	"is_approved" boolean DEFAULT false,
	"approved_by" integer,
	"approved_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotel_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"hotel_id" integer NOT NULL,
	"room_number" varchar(50),
	"room_type" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"capacity" integer NOT NULL,
	"bed_type" varchar(100),
	"bed_count" integer DEFAULT 1,
	"size" varchar(50),
	"price_per_night" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'NGN',
	"discounted_price" numeric(10, 2),
	"amenities" jsonb DEFAULT '[]'::jsonb,
	"images" jsonb DEFAULT '[]'::jsonb,
	"total_rooms" integer DEFAULT 1,
	"available_rooms" integer DEFAULT 0,
	"is_available" boolean DEFAULT true,
	"is_booked" boolean DEFAULT false,
	"status" varchar(50) DEFAULT 'active',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"email" varchar(255),
	"phone" varchar(50),
	"website" varchar(255),
	"address" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"zip_code" varchar(20),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"rating" numeric(3, 2) DEFAULT '0.00',
	"review_count" integer DEFAULT 0,
	"price_range" varchar(20),
	"min_price" numeric(10, 2),
	"max_price" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'USD',
	"star_rating" integer,
	"check_in_time" varchar(10),
	"check_out_time" varchar(10),
	"amenities" jsonb DEFAULT '[]'::jsonb,
	"images" jsonb DEFAULT '[]'::jsonb,
	"thumbnail" varchar(500),
	"video_url" varchar(500),
	"total_rooms" integer DEFAULT 0,
	"available_rooms" integer DEFAULT 0,
	"policies" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"is_verified" boolean DEFAULT false,
	"is_featured" boolean DEFAULT false,
	"status" varchar(50) DEFAULT 'pending',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"seo_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "hotels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"reference" varchar(100) NOT NULL,
	"trxref" varchar(100),
	"access_code" varchar(100),
	"amount" integer NOT NULL,
	"amount_in_naira" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'NGN',
	"description" varchar(255),
	"customer_email" varchar(255) NOT NULL,
	"customer_name" varchar(255),
	"customer_phone" varchar(50),
	"status" varchar(20) DEFAULT 'pending',
	"gateway_response" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"authorization_code" varchar(100),
	"card_type" varchar(50),
	"last4" varchar(4),
	"exp_month" varchar(2),
	"exp_year" varchar(4),
	"bin" varchar(6),
	"bank" varchar(100),
	"channel" varchar(50),
	"account_name" varchar(255),
	"account_number" varchar(20),
	"bank_name" varchar(100),
	"paystack_response" jsonb,
	"logs" jsonb,
	"webhook_events" jsonb,
	"webhook_received_at" timestamp,
	"metadata" jsonb,
	"custom_fields" jsonb,
	"ip_address" varchar(45),
	"fingerprint" varchar(255),
	"is_reversed" boolean DEFAULT false,
	"reversed_at" timestamp,
	"reversal_reason" text,
	"refunded_amount" integer,
	"refunded_at" timestamp,
	"refund_reference" varchar(100),
	CONSTRAINT "payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "payment_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer,
	"event" varchar(100),
	"status" varchar(50),
	"request" jsonb,
	"response" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"phone" varchar(20),
	"bio" varchar(500),
	"avatar_url" varchar(255),
	"country" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "service_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"booking_reference" varchar(100) NOT NULL,
	"request_type" varchar(200) NOT NULL,
	"description" varchar(500),
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "service_requests_booking_reference_unique" UNIQUE("booking_reference")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"otp" varchar(6),
	"otp_expiry" timestamp,
	"is_verified" boolean DEFAULT false,
	"role" "user_role" DEFAULT 'user',
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"login_attempts" integer DEFAULT 0,
	"lock_until" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_room_id_hotel_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."hotel_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_reviews" ADD CONSTRAINT "hotel_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_reviews" ADD CONSTRAINT "hotel_reviews_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_reviews" ADD CONSTRAINT "hotel_reviews_booking_id_hotel_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."hotel_bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_rooms" ADD CONSTRAINT "hotel_rooms_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "fk_profiles_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_hotel_bookings_reference" ON "hotel_bookings" USING btree ("booking_reference");--> statement-breakpoint
CREATE INDEX "idx_hotel_bookings_user_id" ON "hotel_bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_hotel_bookings_hotel_id" ON "hotel_bookings" USING btree ("hotel_id");--> statement-breakpoint
CREATE INDEX "idx_hotel_bookings_room_id" ON "hotel_bookings" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_hotel_bookings_status" ON "hotel_bookings" USING btree ("booking_status");--> statement-breakpoint
CREATE INDEX "idx_hotel_bookings_payment_status" ON "hotel_bookings" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "idx_hotel_bookings_dates" ON "hotel_bookings" USING btree ("check_in_date","check_out_date");--> statement-breakpoint
CREATE INDEX "idx_hotel_bookings_user_status" ON "hotel_bookings" USING btree ("user_id","booking_status");--> statement-breakpoint
CREATE INDEX "idx_hotel_bookings_created_at" ON "hotel_bookings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_hotel_reviews_user_id" ON "hotel_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_hotel_reviews_hotel_id" ON "hotel_reviews" USING btree ("hotel_id");--> statement-breakpoint
CREATE INDEX "idx_hotel_reviews_rating" ON "hotel_reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "idx_hotel_reviews_is_approved" ON "hotel_reviews" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX "idx_hotel_reviews_created_at" ON "hotel_reviews" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_hotel_reviews_hotel_rating" ON "hotel_reviews" USING btree ("hotel_id","rating");--> statement-breakpoint
CREATE INDEX "idx_hotel_rooms_hotel_id" ON "hotel_rooms" USING btree ("hotel_id");--> statement-breakpoint
CREATE INDEX "idx_hotel_rooms_room_type" ON "hotel_rooms" USING btree ("room_type");--> statement-breakpoint
CREATE INDEX "idx_hotel_rooms_price" ON "hotel_rooms" USING btree ("price_per_night");--> statement-breakpoint
CREATE INDEX "idx_hotel_rooms_availability" ON "hotel_rooms" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "idx_hotel_rooms_hotel_type" ON "hotel_rooms" USING btree ("hotel_id","room_type");--> statement-breakpoint
CREATE INDEX "idx_hotels_owner_id" ON "hotels" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_hotels_slug" ON "hotels" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_hotels_name" ON "hotels" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_hotels_city" ON "hotels" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_hotels_state" ON "hotels" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_hotels_country" ON "hotels" USING btree ("country");--> statement-breakpoint
CREATE INDEX "idx_hotels_status" ON "hotels" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_hotels_is_active" ON "hotels" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_hotels_is_verified" ON "hotels" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "idx_hotels_is_featured" ON "hotels" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "idx_hotels_rating" ON "hotels" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "idx_hotels_star_rating" ON "hotels" USING btree ("star_rating");--> statement-breakpoint
CREATE INDEX "idx_hotels_min_price" ON "hotels" USING btree ("min_price");--> statement-breakpoint
CREATE INDEX "idx_hotels_created_at" ON "hotels" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_hotels_city_status" ON "hotels" USING btree ("city","status");--> statement-breakpoint
CREATE INDEX "idx_hotels_location_rating" ON "hotels" USING btree ("city","rating");--> statement-breakpoint
CREATE INDEX "idx_hotels_price_status" ON "hotels" USING btree ("min_price","status");--> statement-breakpoint
CREATE INDEX "idx_ps_reference" ON "payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "idx_ps_email" ON "payments" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "idx_ps_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ps_user_id" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ps_created_at" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ps_paid_at" ON "payments" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "idx_ps_user_status" ON "payments" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_ps_date_status" ON "payments" USING btree ("created_at","status");--> statement-breakpoint
CREATE INDEX "idx_ps_auth_code" ON "payments" USING btree ("authorization_code");--> statement-breakpoint
CREATE INDEX "idx_ps_account_number" ON "payments" USING btree ("account_number");--> statement-breakpoint
CREATE INDEX "idx_ps_logs_payment_id" ON "payment_logs" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_ps_logs_event" ON "payment_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "idx_profiles_user_id" ON "profiles" USING btree ("user_id");