const { z } = require("zod");

const createRequestSchema = z.object({

    roomId: z.number(),

    requestType: z.string().min(3),

    description: z.string().min(3)
});

module.exports = { createRequestSchema };