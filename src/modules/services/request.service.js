const db = require("../../config/db.js");
const { serviceRequestTable } = require("../../dbSchema/requestSchema.js");
const { eq } = require("drizzle-orm");

class requestService {

    async createRequest(userId, requestData) {
        const  request = await db.insert(serviceRequestTable).values({
            userId,
            roomId: requestData.roomId,
            requestType: requestData.requestType,
            description: requestData.description
        }).returning();

        return request;
    }

    async getUserRequests(userId) {
        const requests = await db.query(serviceRequestTable).findMany({
            where: (req, { eq }) => eq(req.userId, userId)
        });
        return requests;
    }

    async getRequestById(requestId) {
        const request = await db.query(serviceRequestTable).findFirst({
            where: (req, { eq }) => eq(req.id, requestId)
        });
        return request;
    }

    async updateRequestStatus(requestId, status) {
        const updatedRequest = await db.update(serviceRequestTable)
            .set({ status })
            .where(eq(serviceRequestTable.id, requestId))
            .returning();
        return updatedRequest;
    }
}

module.exports = new requestService();