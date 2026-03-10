const { z } = require('zod');

const createUserSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string(),

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

const updateProfileSchema = z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().optional(),
})




module.exports = {
    createUserSchema,
    loginSchema,
    verifyAccountSchema,
    resendOtpSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema
}