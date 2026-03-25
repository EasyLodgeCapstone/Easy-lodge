const { z } = require("zod");

const createRequestSchema = z.object({
    roomId: z.number().int().positive(),
    serviceItemId: z.number().int().positive(),
    quantity: z.number().int().min(1).default(1),
    priority: z.enum(["normal", "urgent"]).default("normal"),
    notes: z.string().max(1000).optional(),
    scheduledAt: z.string().datetime().optional(), 
});

const updateStatusSchema = z.object({
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
});

module.exports = { createRequestSchema, updateStatusSchema };