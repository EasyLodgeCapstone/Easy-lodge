const { z } = require("zod");

const updateProfileSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").optional(),
    email: z.string().email("Invalid email address").optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    phone: z.string().optional(),
    bio: z.string().max(500, "Bio must be under 500 characters").optional(),
    country: z.string().optional(),
});

module.exports = { updateProfileSchema };