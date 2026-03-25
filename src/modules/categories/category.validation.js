const { z } = require("zod");

const createCategorySchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(300).optional(),
});

const updateCategorySchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(300).optional(),
    isActive: z.boolean().optional(),
});

module.exports = { createCategorySchema, updateCategorySchema };