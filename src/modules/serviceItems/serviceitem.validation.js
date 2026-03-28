const { z } = require("zod");

const createServiceItemSchema = z.object({
    name: z.string().min(2).max(150),
    description: z.string().max(500).optional(),
    price: z.number().min(0).optional(),
});

const updateServiceItemSchema = z.object({
    name: z.string().min(2).max(150).optional(),
    description: z.string().max(500).optional(),
    price: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
});

module.exports = { createServiceItemSchema, updateServiceItemSchema };