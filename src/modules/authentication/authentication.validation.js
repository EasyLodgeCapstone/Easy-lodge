const { z } = require('zod');

const createUserSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters")

})

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),

})

const verifyAccountSchema = z.object({
    email: z.string().email(),
    otp: z.string(),

})

const resendOtpSchema = z.object({
    email: z.string().email(),
})


const forgotPasswordSchema = z.object({
    email: z.string().email(),
})

const resetPasswordSchema = z.object({
    email: z.string().email(),
    otp: z.string(),
    newPassword: z.string(),
})

const recoverInitiateSchema = z.object({
    email: z.string().email(),
});

const recoverVerifySchema = z.object({
    email: z.string().email(),
    otp: z.string(),
});




module.exports = {
    createUserSchema,
    loginSchema,
    verifyAccountSchema,
    resendOtpSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    recoverInitiateSchema,
    recoverVerifySchema
};