// paystack-service.js
const axios = require("axios");
const crypto = require("crypto");
const { db } = require("../../../config/db");
const { eq, and, or, like, desc, asc, sql } = require("drizzle-orm");
const {
  paystackPayments,
  paystackLogs,
} = require("../../../dbSchema/paymentSchema");
const { hotelBookings } = require("../../../dbSchema/HotelBookingSchema");
const { usersTable } = require("../../../dbSchema/userSchema");

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
    this.BookingRoomModel = hotelBookings;
    this.UserModel = usersTable;

    if (!db) {
      throw new Error("Database connection not found");
    }

    if (!this.PaymentModel) {
      throw new Error("Payment model not found");
    }

    if (!this.LogModel) {
      throw new Error("Log model not found");
    }

    if (!this.BookingRoomModel) {
      throw new Error("Booking room model not found");
    }

    if (!this.UserModel) {
      throw new Error("User model not found");
    }

    // Store active verification intervals
    this.activeVerifications = new Map();
  }

  async initializeTransaction(bookingReference, email, amount) {
    // const users = await db.select().from( this.LogModel);
    // // .where(eq(usersTable.id, userId));
    // console.log(users);
    // const deletedRecords = await db
    //   .delete(this.PaymentModel, this.LogModel)
    //   .returning();
    // console.log(deletedRecords);
    try {
      // Validate inputs
      if (!bookingReference || !email || !amount) {
        throw new Error(
          "Missing required parameters: bookingReference, email, or amount",
        );
      }

      // Validate amount is a number
      if (typeof amount !== "number" || isNaN(amount)) {
        throw new Error("Amount must be a valid number");
      }

      // Validate reference format
      if (
        !bookingReference.startsWith("EASY") ||
        !bookingReference.endsWith("LODGE")
      ) {
        throw new Error("Invalid booking reference format");
      }

      // Check if database is initialized
      if (!db) {
        throw new Error("Database connection not initialized");
      }

      // Check if payment already exists
      const existingPayment = await db
        .select()
        .from(this.PaymentModel)
        .where(
          and(
            eq(this.PaymentModel.bookingReference, bookingReference),
            eq(this.PaymentModel.customerEmail, email),
          ),
        );

      if (existingPayment && existingPayment.length > 0) {
        throw new Error("Payment already exists for this booking reference");
      }

      // Check if booking exists
      const isBookingExist = await db
        .select()
        .from(this.BookingRoomModel)
        .where(eq(this.BookingRoomModel.bookingReference, bookingReference));

      if (!isBookingExist || isBookingExist.length === 0) {
        throw new Error("Booking does not exist");
      }
      const userId = isBookingExist?.[0]?.userId || null;

      // Validate Paystack configuration
      if (!this.baseURL || !this.secretKey) {
        throw new Error("Paystack configuration is missing");
      }

      const amountInKobo = Math.round(amount * 100);

      // Initialize Paystack transaction
      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        {
          email,
          amount: amountInKobo,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.data || !response.data.status) {
        throw new Error(
          response.data?.message || "Paystack initialization failed",
        );
      }

      // Create payment record
      const [payment] = await db
        .insert(this.PaymentModel)
        .values({
          reference: response.data.data.reference,
          accessCode: response.data.data.access_code,
          bookingReference: bookingReference,
          authorizationCode: response.data.data.authorization_url,
          userId: userId,
          amount: amount,
          amountInNaira: (amount / 100).toString(),
          customerEmail: email,
          status: "pending",
          paystackResponse: response.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!payment) {
        throw new Error("Failed to create payment record");
      }

      // Log the initialization
      // await db.insert(this.LogModel).values({
      //   paymentId: payment.id,
      //   reference: response.data.data.reference,
      //   bookingReference: bookingReference,
      //   event: "initialize",
      //   status: "pending",
      //   response: response.data,
      //   createdAt: new Date(),
      // });

      // Start background verification
      const reference = response.data.data.reference;
      if (this.startBackgroundVerification) {
        this.startBackgroundVerification(reference);
      }

      return {
        success: true,
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        reference: response.data.data.reference,
        paymentId: payment.id,
      };
    } catch (error) {
      // Handle specific error types
      if (error.response) {
        // Axios error with response
        console.error("Paystack API error:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else if (error.request) {
        // Axios error with no response
        console.error("No response from Paystack:", error.request);
      } else {
        // Other errors
        console.error("Transaction initialization error:", error.message);
      }

      // Re-throw with more context if needed
      throw new Error(`Failed to initialize transaction: ${error.message}`);
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
    const MAX_ATTEMPTS = 30;
    const INTERVAL_MS = 10000;

    let attempts = 0;
    let isCompleted = false;
    let timeoutId = null;

    console.log(`🚀 Starting background verification for: ${reference}`);
    console.log(
        `⏱️ Will poll for up to ${(MAX_ATTEMPTS * INTERVAL_MS) / 60000} minutes`,
    );

    // Store in active verifications (to prevent duplicates)
    if (this.activeVerifications.has(reference)) {
        console.log(`⚠️ Verification already running for ${reference}`);
        return;
    }
    this.activeVerifications.set(reference, true);

    // Get payment record first
    let paymentRecord = null;
    try {
        const payments = await db
            .select()
            .from(this.PaymentModel)
            .where(eq(this.PaymentModel.reference, reference))
            .limit(1);

        if (payments.length > 0) {
            paymentRecord = payments[0];
        } else {
            console.error(`❌ Payment record not found for reference: ${reference}`);
            this.activeVerifications.delete(reference);
            return;
        }
    } catch (error) {
        console.error(`❌ Failed to fetch payment record: ${error.message}`);
        this.activeVerifications.delete(reference);
        return;
    }

    // Create initial log entry once
    let logId = null;
    try {
        const [initialLog] = await db
            .insert(this.LogModel)
            .values({
                paymentId: paymentRecord.id,
                reference: reference,
                bookingReference: paymentRecord.bookingReference,
                event: "background_verify",
                status: "pending",
                request: {
                    reference,
                    startedAt: new Date().toISOString(),
                    maxAttempts: MAX_ATTEMPTS,
                    intervalMs: INTERVAL_MS,
                },
                response: null,
                ipAddress: null,
                createdAt: new Date(),
            })
            .returning({ id: this.LogModel.id });

        logId = initialLog.id;
        console.log(`📝 Created verification log for ${reference} with ID: ${logId}`);
    } catch (error) {
        console.error(`❌ Failed to create initial log: ${error.message}`);
        this.activeVerifications.delete(reference);
        return;
    }

    const verify = async () => {
        // Stop if already completed
        if (isCompleted) {
            console.log(`✅ Verification completed for ${reference}, stopping polling`);
            if (timeoutId) clearTimeout(timeoutId);
            this.activeVerifications.delete(reference);
            return;
        }

        try {
            attempts++;
            console.log(`🔍 Verification attempt ${attempts}/${MAX_ATTEMPTS} for ${reference}`);

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

                // UPDATE the existing log with current attempt info
                await db
                    .update(this.LogModel)
                    .set({
                        status: paymentStatus,
                        request: {
                            reference,
                            attempts: attempts,
                            lastAttemptAt: new Date().toISOString(),
                            lastStatus: paymentStatus,
                        },
                        response: data,
                        updatedAt: new Date(),
                    })
                    .where(eq(this.LogModel.id, logId));

                // ✅ STOP - Payment SUCCESSFUL
                if (paymentStatus === "success") {
                    console.log(`✅ Payment ${reference} verified successfully! STOPPING polling.`);

                    const updateData = {
                        status: "success",
                        paidAt: new Date(data.data.paid_at),
                        gatewayResponse: data.data.gateway_response,
                        paystackResponse: data.data,
                        updatedAt: new Date(),
                    };

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

                    await db
                        .update(this.PaymentModel)
                        .set(updateData)
                        .where(eq(this.PaymentModel.reference, reference));

                    await db
                        .update(this.LogModel)
                        .set({
                            status: "completed",
                            event: "background_verify_complete",
                            request: {
                                reference,
                                finalStatus: "success",
                                completedAt: new Date().toISOString(),
                                attempts: attempts,
                            },
                            updatedAt: new Date(),
                        })
                        .where(eq(this.LogModel.id, logId));

                    isCompleted = true;
                    this.activeVerifications.delete(reference);
                    if (timeoutId) clearTimeout(timeoutId);
                    return; // ✅ STOP here
                }

                // ✅ STOP - Payment FAILED
                else if (paymentStatus === "failed") {
                    console.log(`❌ Payment ${reference} failed! STOPPING polling.`);

                    await db
                        .update(this.PaymentModel)
                        .set({
                            status: "failed",
                            gatewayResponse: data.data.gateway_response,
                            paystackResponse: data.data,
                            updatedAt: new Date(),
                        })
                        .where(eq(this.PaymentModel.reference, reference));

                    await db
                        .update(this.LogModel)
                        .set({
                            status: "failed",
                            event: "background_verify_failed",
                            request: {
                                reference,
                                finalStatus: "failed",
                                completedAt: new Date().toISOString(),
                                attempts: attempts,
                                reason: data.data.gateway_response,
                            },
                            updatedAt: new Date(),
                        })
                        .where(eq(this.LogModel.id, logId));

                    isCompleted = true;
                    this.activeVerifications.delete(reference);
                    if (timeoutId) clearTimeout(timeoutId);
                    return; // ✅ STOP here
                }

                // ❌ CONTINUE - Payment ABANDONED (keep polling)
                else if (paymentStatus === "abandoned") {
                    console.log(`⚠️ Payment ${reference} abandoned. CONTINUING polling until max attempts...`);

                    await db
                        .update(this.PaymentModel)
                        .set({
                            status: "abandoned",
                            gatewayResponse: data.data.gateway_response,
                            paystackResponse: data.data,
                            updatedAt: new Date(),
                        })
                        .where(eq(this.PaymentModel.reference, reference));

                    await db
                        .update(this.LogModel)
                        .set({
                            status: "abandoned",
                            event: "background_verify_abandoned",
                            request: {
                                reference,
                                attempts: attempts,
                                lastAttemptAt: new Date().toISOString(),
                                lastStatus: "abandoned",
                            },
                            updatedAt: new Date(),
                        })
                        .where(eq(this.LogModel.id, logId));

                    // Continue polling if not reached max attempts
                    if (attempts < MAX_ATTEMPTS) {
                        console.log(`🔄 Still polling abandoned payment. Next check in ${INTERVAL_MS / 1000} seconds...`);
                        timeoutId = setTimeout(verify, INTERVAL_MS);
                    } else {
                        console.log(`⚠️ Max attempts reached for abandoned payment ${reference}. STOPPING.`);
                        isCompleted = true;
                        this.activeVerifications.delete(reference);
                        if (timeoutId) clearTimeout(timeoutId);
                    }
                    return; // Don't continue to pending logic
                }

                // ❌ CONTINUE - Payment PENDING (keep polling)
                else {
                    console.log(`⏳ Payment ${reference} still ${paymentStatus || "pending"}. CONTINUING polling...`);

                    await db
                        .update(this.LogModel)
                        .set({
                            status: "pending",
                            request: {
                                reference,
                                attempts: attempts,
                                lastAttemptAt: new Date().toISOString(),
                                lastStatus: paymentStatus,
                                nextAttemptIn: attempts < MAX_ATTEMPTS ? INTERVAL_MS / 1000 : 0,
                            },
                            updatedAt: new Date(),
                        })
                        .where(eq(this.LogModel.id, logId));

                    // Continue polling if not reached max attempts
                    if (attempts < MAX_ATTEMPTS) {
                        console.log(`🔄 Scheduling next check in ${INTERVAL_MS / 1000} seconds...`);
                        timeoutId = setTimeout(verify, INTERVAL_MS);
                    } else {
                        console.log(`⚠️ Max attempts reached for ${reference}. STOPPING and marking for manual review.`);

                        await db
                            .update(this.PaymentModel)
                            .set({
                                status: "pending_manual",
                                gatewayResponse: "Verification timed out - please check manually",
                                updatedAt: new Date(),
                            })
                            .where(eq(this.PaymentModel.reference, reference));

                        await db
                            .update(this.LogModel)
                            .set({
                                status: "timeout",
                                event: "background_verify_timeout",
                                request: {
                                    reference,
                                    finalStatus: "timeout",
                                    completedAt: new Date().toISOString(),
                                    attempts: attempts,
                                    maxAttempts: MAX_ATTEMPTS,
                                },
                                updatedAt: new Date(),
                            })
                            .where(eq(this.LogModel.id, logId));

                        isCompleted = true;
                        this.activeVerifications.delete(reference);
                        if (timeoutId) clearTimeout(timeoutId);
                    }
                }
            } else {
                throw new Error("Invalid response from Paystack");
            }
        } catch (error) {
            console.error(`❌ Verification error for ${reference}:`, error.message);

            // Update log with error
            if (!isCompleted) {
                try {
                    await db
                        .update(this.LogModel)
                        .set({
                            status: "error",
                            event: "background_verify_error",
                            request: {
                                reference,
                                attempts: attempts,
                                lastAttemptAt: new Date().toISOString(),
                                error: error.message,
                            },
                            response: {
                                error: error.message,
                                details: error.response?.data || null,
                            },
                            updatedAt: new Date(),
                        })
                        .where(eq(this.LogModel.id, logId));
                } catch (logError) {
                    console.error("Failed to update error log:", logError.message);
                }
            }

            // Retry on error if under max attempts
            if (!isCompleted && attempts < MAX_ATTEMPTS) {
                console.log(`🔄 Retrying after error in ${INTERVAL_MS / 1000} seconds...`);
                timeoutId = setTimeout(verify, INTERVAL_MS);
            } else if (!isCompleted) {
                console.log(`⚠️ Max attempts reached with errors for ${reference}. STOPPING.`);
                try {
                    await db
                        .update(this.PaymentModel)
                        .set({
                            status: "verification_error",
                            gatewayResponse: "Background verification failed after max retries",
                            updatedAt: new Date(),
                        })
                        .where(eq(this.PaymentModel.reference, reference));
                } catch (updateError) {
                    console.error("Failed to update payment status:", updateError.message);
                }

                isCompleted = true;
                this.activeVerifications.delete(reference);
                if (timeoutId) clearTimeout(timeoutId);
            }
        }
    };

    // Start verification after 3 seconds
    console.log(`⏰ Starting first verification in 3 seconds...`);
    timeoutId = setTimeout(verify, 3000);
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
