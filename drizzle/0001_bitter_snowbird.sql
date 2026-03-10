ALTER TABLE "paystack_payments" RENAME TO "payments";--> statement-breakpoint
ALTER TABLE "paystack_logs" RENAME TO "payment_logs";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "paystack_payments_reference_unique";--> statement-breakpoint
ALTER TABLE "payment_logs" DROP CONSTRAINT "paystack_logs_payment_id_paystack_payments_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reference_unique" UNIQUE("reference");