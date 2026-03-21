// paystack-service.js
const axios = require("axios");
const crypto = require("crypto");
const { db } = require("../../../config/db");
const { eq, and, or, like, desc, asc, sql } = require("drizzle-orm");
const {
  paystackPayments,
  paystackLogs,
} = require("../../../dbSchema/paymentSchema");

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.webhookSecret = process.env.PAYSTACK_SECRET_KEY;
    this.baseURL = "https://api.paystack.co";

    if (!this.secretKey) {
      throw new Error(
        "PAYSTACK_SECRET_KEY is not set in environment variables",
      );
    }

    // Initialize your database models
    this.PaymentModel = paystackPayments;
    this.LogModel = paystackLogs;

    // Store active verification intervals
    this.activeVerifications = new Map();
  }

  async initializeTransaction(bookingReference, email, amount) {
    try {
      // check if its the  correct refrence formart
      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        {
          email,
          amount,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.status) {
        // Create payment record in database
        console.log(response.data.status);
        const [payment] = await db
          .insert(this.PaymentModel)
          .values({
            reference: response.data.data.reference,
            accessCode: response.data.data.access_code,
            amount: amount,
            amountInNaira: (amount / 100).toString(),
            customerEmail: email,
            status: "pending",
            // metadata: metadata || null,
            paystackResponse: response.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Log the initialization
        await db.insert(this.LogModel).values({
          paymentId: payment.id,
          event: "initialize",
          status: "pending",
          response: response.data,
          createdAt: new Date(),
        });

        // 🚀 START BACKGROUND VERIFICATION AUTOMATICALLY
        const reference = response.data.data.reference;
        this.startBackgroundVerification(reference);

        return {
          success: true,
          authorizationUrl: response.data.data.authorization_url,
          accessCode: response.data.data.access_code,
          reference: response.data.data.reference,
          paymentId: payment.id,
        };
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error(
        "Paystack transaction error:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async verifyTransaction(reference) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      // Update payment record with verification data
      if (response.data.status) {
        const paymentStatus = response.data.data.status;

        // Build update object
        const updateData = {
          paystackResponse: response.data,
          gatewayResponse: response.data.data.gateway_response,
          updatedAt: new Date(),
        };

        // If payment is successful, add paidAt
        if (paymentStatus === "success") {
          updateData.status = "success";
          updateData.paidAt = new Date(response.data.data.paid_at);

          // Add authorization details if available
          if (response.data.data.authorization) {
            const auth = response.data.data.authorization;
            updateData.authorizationCode = auth.authorization_code;
            updateData.cardType = auth.card_type;
            updateData.last4 = auth.last4;
            updateData.expMonth = auth.exp_month?.toString();
            updateData.expYear = auth.exp_year?.toString();
            updateData.bin = auth.bin;
            updateData.bank = auth.bank;
            updateData.channel = response.data.data.channel;
          }
        } else if (paymentStatus === "failed") {
          updateData.status = "failed";
        }

        await db
          .update(this.PaymentModel)
          .set(updateData)
          .where(eq(this.PaymentModel.reference, reference));
      }

      return response.data;
    } catch (error) {
      console.error(
        "Paystack verification error:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * 🔄 BACKGROUND VERIFICATION - Polls Paystack until payment is confirmed
   * This runs automatically after initializeTransaction
   */
  async startBackgroundVerification(reference) {
    // Configuration
    const MAX_ATTEMPTS = 30; // Try 30 times
    const INTERVAL_MS = 10000; // Every 10 seconds
    const TOTAL_TIME_MIN = (MAX_ATTEMPTS * INTERVAL_MS) / 60000; // 5 minutes

    let attempts = 0;
    let isCompleted = false;

    console.log(`🚀 Starting background verification for: ${reference}`);
    console.log(
      `⏱️ Will poll for up to ${TOTAL_TIME_MIN} minutes (${MAX_ATTEMPTS} attempts)`,
    );

    // Store in active verifications (to prevent duplicates)
    if (this.activeVerifications.has(reference)) {
      console.log(`⚠️ Verification already running for ${reference}`);
      return;
    }
    this.activeVerifications.set(reference, true);

    const verify = async () => {
      // Stop if already completed
      if (isCompleted) {
        this.activeVerifications.delete(reference);
        return;
      }

      try {
        attempts++;
        console.log(
          `🔍 Verification attempt ${attempts}/${MAX_ATTEMPTS} for ${reference}`,
        );

        // Call Paystack verify endpoint
        const response = await axios.get(
          `${this.baseURL}/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${this.secretKey}`,
            },
          },
        );

        const data = response.data;

        if (data.status && data.data) {
          const paymentStatus = data.data.status;
          console.log(`📊 Payment status: ${paymentStatus}`);

          // Log this verification attempt
          await db.insert(this.LogModel).values({
            paymentReference: reference,
            event: "background_verify",
            status: paymentStatus,
            response: data,
            attempt: attempts,
            createdAt: new Date(),
          });

          // CASE 1: PAYMENT SUCCESSFUL
          if (paymentStatus === "success") {
            console.log(`✅ Payment ${reference} verified successfully!`);

            // Build update object with all success data
            const updateData = {
              status: "success",
              paidAt: new Date(data.data.paid_at),
              gatewayResponse: data.data.gateway_response,
              paystackResponse: data.data,
              updatedAt: new Date(),
            };

            // Add authorization details
            if (data.data.authorization) {
              const auth = data.data.authorization;
              updateData.authorizationCode = auth.authorization_code;
              updateData.cardType = auth.card_type;
              updateData.last4 = auth.last4;
              updateData.expMonth = auth.exp_month?.toString();
              updateData.expYear = auth.exp_year?.toString();
              updateData.bin = auth.bin;
              updateData.bank = auth.bank;
              updateData.channel = data.data.channel;
            }

            // Update the database
            await db
              .update(this.PaymentModel)
              .set(updateData)
              .where(eq(this.PaymentModel.reference, reference));

            console.log(`💾 Database updated to SUCCESS for ${reference}`);
            isCompleted = true;
            this.activeVerifications.delete(reference);
            return;
          }

          // CASE 2: PAYMENT FAILED
          else if (paymentStatus === "failed") {
            console.log(`❌ Payment ${reference} failed`);

            await db
              .update(this.PaymentModel)
              .set({
                status: "failed",
                gatewayResponse: data.data.gateway_response,
                paystackResponse: data.data,
                updatedAt: new Date(),
              })
              .where(eq(this.PaymentModel.reference, reference));

            console.log(`💾 Database updated to FAILED for ${reference}`);
            isCompleted = true;
            this.activeVerifications.delete(reference);
            return;
          }

          // CASE 3: STILL PENDING - Continue polling
          else {
            console.log(
              `⏳ Payment ${reference} still ${paymentStatus || "pending"}`,
            );

            if (attempts < MAX_ATTEMPTS) {
              console.log(
                `🔄 Scheduling next check in ${INTERVAL_MS / 1000} seconds...`,
              );
              setTimeout(verify, INTERVAL_MS);
            } else {
              // Max attempts reached, mark as pending_manual
              console.log(
                `⚠️ Max attempts reached for ${reference}. Marking for manual review.`,
              );

              await db
                .update(this.PaymentModel)
                .set({
                  status: "pending_manual",
                  gatewayResponse:
                    "Verification timed out - please check manually",
                  updatedAt: new Date(),
                })
                .where(eq(this.PaymentModel.reference, reference));

              isCompleted = true;
              this.activeVerifications.delete(reference);
            }
          }
        } else {
          throw new Error("Invalid response from Paystack");
        }
      } catch (error) {
        console.error(`❌ Verification error for ${reference}:`, error.message);

        // Log error
        await db.insert(this.LogModel).values({
          paymentReference: reference,
          event: "background_verify_error",
          response: { error: error.message, details: error.response?.data },
          attempt: attempts,
          createdAt: new Date(),
        });

        // Retry on error if under max attempts
        if (attempts < MAX_ATTEMPTS) {
          console.log(
            `🔄 Retrying after error in ${INTERVAL_MS / 1000} seconds...`,
          );
          setTimeout(verify, INTERVAL_MS);
        } else {
          // Mark for manual review after max errors
          await db
            .update(this.PaymentModel)
            .set({
              status: "verification_error",
              gatewayResponse:
                "Background verification failed after max retries",
              updatedAt: new Date(),
            })
            .where(eq(this.PaymentModel.reference, reference));

          isCompleted = true;
          this.activeVerifications.delete(reference);
        }
      }
    };

    // Start verification after 3 seconds
    setTimeout(verify, 3000);
  }

  /**
   * Manual verification endpoint (can be called from routes)
   */
  async checkPaymentStatus(reference) {
    try {
      const [payment] = await db
        .select()
        .from(this.PaymentModel)
        .where(eq(this.PaymentModel.reference, reference))
        .limit(1);

      if (!payment) {
        return { success: false, error: "Payment not found" };
      }

      return {
        success: true,
        status: payment.status,
        payment,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper method to get payment by reference
  async getPaymentByReference(reference) {
    const [payment] = await db
      .select()
      .from(this.PaymentModel)
      .where(eq(this.PaymentModel.reference, reference))
      .limit(1);

    return payment;
  }

  // Helper method to get user payments
  async getUserPayments(userId, limit = 10, offset = 0) {
    const payments = await db
      .select()
      .from(this.PaymentModel)
      .where(eq(this.PaymentModel.userId, userId))
      .orderBy(desc(this.PaymentModel.createdAt))
      .limit(limit)
      .offset(offset);

    return payments;
  }

  // Helper method to get payment statistics
  async getPaymentStats(userId = null) {
    const query = db
      .select({
        totalTransactions: sql`count(*)`,
        totalAmount: sql`sum(amount)`,
        successfulTransactions: sql`count(case when status = 'success' then 1 end)`,
        failedTransactions: sql`count(case when status = 'failed' then 1 end)`,
        pendingTransactions: sql`count(case when status = 'pending' then 1 end)`,
        totalAmountSuccessful: sql`sum(case when status = 'success' then amount else 0 end)`,
      })
      .from(this.PaymentModel);

    if (userId) {
      query.where(eq(this.PaymentModel.userId, userId));
    }

    const [stats] = await query;
    return stats;
  }
}

module.exports = PaystackService;
