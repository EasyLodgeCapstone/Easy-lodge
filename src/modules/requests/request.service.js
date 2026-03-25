const { db } = require("../../config/db.js");
const { serviceRequestTable } = require("../../dbSchema/serviceReqsSchema.js");
const { serviceItemsTable } = require("../../dbSchema/serviceItemSchema.js");
const { serviceCategoriesTable } = require("../../dbSchema/categorySchema.js");
const { eq } = require("drizzle-orm");
const AppError = require("../../middleware/appError.js");

class RequestService {

    async createRequest(userId, requestData) {
        // Verify the chosen service item exists and is active
        const item = await db.select()
            .from(serviceItemsTable)
            .where(eq(serviceItemsTable.id, requestData.serviceItemId))
            .limit(1);

        if (!item[0] || !item[0].isActive) {
            throw new AppError("Service item not found or unavailable", 404);
        }

        const bookingReference = `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

        const request = await db.insert(serviceRequestTable)
            .values({
                userId,
                roomId: requestData.roomId,
                serviceItemId: requestData.serviceItemId,
                bookingReference,
                quantity: requestData.quantity ?? 1,
                priority: requestData.priority ?? "normal",
                notes: requestData.notes,
                scheduledAt: requestData.scheduledAt ? new Date(requestData.scheduledAt) : null,
            })
            .returning();

        return request[0];
    }

    async getUserRequests(userId) {
        const requests = await db.select({
            id: serviceRequestTable.id,
            bookingReference: serviceRequestTable.bookingReference,
            roomId: serviceRequestTable.roomId,
            quantity: serviceRequestTable.quantity,
            priority: serviceRequestTable.priority,
            notes: serviceRequestTable.notes,
            scheduledAt: serviceRequestTable.scheduledAt,
            status: serviceRequestTable.status,
            createdAt: serviceRequestTable.createdAt,
            serviceName: serviceItemsTable.name,
            servicePrice: serviceItemsTable.price,
            categoryName: serviceCategoriesTable.name,
        })
            .from(serviceRequestTable)
            .innerJoin(serviceItemsTable, eq(serviceRequestTable.serviceItemId, serviceItemsTable.id))
            .innerJoin(serviceCategoriesTable, eq(serviceItemsTable.categoryId, serviceCategoriesTable.id))
            .where(eq(serviceRequestTable.userId, userId));

        return requests;
    }

    async getRequestById(requestId) {
        const requests = await db.select({
            id: serviceRequestTable.id,
            bookingReference: serviceRequestTable.bookingReference,
            roomId: serviceRequestTable.roomId,
            quantity: serviceRequestTable.quantity,
            priority: serviceRequestTable.priority,
            notes: serviceRequestTable.notes,
            scheduledAt: serviceRequestTable.scheduledAt,
            status: serviceRequestTable.status,
            createdAt: serviceRequestTable.createdAt,
            serviceName: serviceItemsTable.name,
            servicePrice: serviceItemsTable.price,
            categoryName: serviceCategoriesTable.name,
        })
            .from(serviceRequestTable)
            .innerJoin(serviceItemsTable, eq(serviceRequestTable.serviceItemId, serviceItemsTable.id))
            .innerJoin(serviceCategoriesTable, eq(serviceItemsTable.categoryId, serviceCategoriesTable.id))
            .where(eq(serviceRequestTable.id, requestId))
            .limit(1);

        return requests[0] ?? null;
    }

    async updateRequestStatus(requestId, status) {
        const updated = await db.update(serviceRequestTable)
            .set({ status, updatedAt: new Date() })
            .where(eq(serviceRequestTable.id, requestId))
            .returning();

        return updated[0] ?? null;
    }
}

module.exports = new RequestService();