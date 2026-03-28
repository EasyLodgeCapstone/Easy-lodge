ALTER TABLE "payments" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "booking_reference" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_logs" ADD COLUMN "reference" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_reference_unique" UNIQUE("booking_reference");--> statement-breakpoint
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_reference_unique" UNIQUE("reference");