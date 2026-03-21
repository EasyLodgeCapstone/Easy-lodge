CREATE TABLE "paystack_payments" (
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
	CONSTRAINT "paystack_payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "paystack_logs" (
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
ALTER TABLE "paystack_logs" ADD CONSTRAINT "paystack_logs_payment_id_paystack_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."paystack_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ps_reference" ON "paystack_payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "idx_ps_email" ON "paystack_payments" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "idx_ps_status" ON "paystack_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ps_user_id" ON "paystack_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ps_created_at" ON "paystack_payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ps_paid_at" ON "paystack_payments" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "idx_ps_user_status" ON "paystack_payments" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_ps_date_status" ON "paystack_payments" USING btree ("created_at","status");--> statement-breakpoint
CREATE INDEX "idx_ps_auth_code" ON "paystack_payments" USING btree ("authorization_code");--> statement-breakpoint
CREATE INDEX "idx_ps_account_number" ON "paystack_payments" USING btree ("account_number");--> statement-breakpoint
CREATE INDEX "idx_ps_logs_payment_id" ON "paystack_logs" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_ps_logs_event" ON "paystack_logs" USING btree ("event");