const { db } = require("../../config/db.js");
const { serviceRequestTable } = require("../../dbSchema/serviceReqsSchema.js");
const { serviceItemsTable } = require("../../dbSchema/serviceItemSchema.js");
const { serviceCategoriesTable } = require("../../dbSchema/categorySchema.js");
const { eq, and, gte, lte, sql } = require("drizzle-orm");
const AppError = require("../../middleware/appError.js");

// Shared select shape used by both getUserRequests and getAllRequests
const requestSelectShape = {
    id: serviceRequestTable.id,
    bookingReference: serviceRequestTable.bookingReference,
    roomId: serviceRequestTable.roomId,
    quantity: serviceRequestTable.quantity,
    priority: serviceRequestTable.priority,
    notes: serviceRequestTable.notes,
    scheduledAt: serviceRequestTable.scheduledAt,
    status: serviceRequestTable.status,
    createdAt: serviceRequestTable.createdAt,
    updatedAt: serviceRequestTable.updatedAt,
    serviceName: serviceItemsTable.name,
    servicePrice: serviceItemsTable.price,
    categoryName: serviceCategoriesTable.name,
};

// Builds the where conditions array from query filters
// Used by both getUserRequests and getAllRequests
function buildFilters(filters, userId = null) {
    const conditions = [];

    if (userId) conditions.push(eq(serviceRequestTable.userId, userId));
    if (filters.status) conditions.push(eq(serviceRequestTable.status, filters.status));
    if (filters.priority) conditions.push(eq(serviceRequestTable.priority, filters.priority));
    if (filters.from) conditions.push(gte(serviceRequestTable.createdAt, new Date(filters.from)));
    if (filters.to) conditions.push(lte(serviceRequestTable.createdAt, new Date(filters.to)));

    return conditions;
}

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

    async getUserRequests(userId, filters = {}) {
        const conditions = buildFilters(filters, userId);

        const requests = await db.select(requestSelectShape)
            .from(serviceRequestTable)
            .innerJoin(serviceItemsTable, eq(serviceRequestTable.serviceItemId, serviceItemsTable.id))
            .innerJoin(serviceCategoriesTable, eq(serviceItemsTable.categoryId, serviceCategoriesTable.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(serviceRequestTable.createdAt)
            .limit(filters.limit ?? 20)
            .offset(filters.offset ?? 0);

        // Return total count so the frontend can paginate
        const [{ count }] = await db.select({ count: sql`count(*)` })
            .from(serviceRequestTable)
            .where(conditions.length ? and(...conditions) : undefined);

        return { requests, total: Number(count), limit: filters.limit ?? 20, offset: filters.offset ?? 0 };
    }

    // for admin/staff
    async getAllRequests(filters = {}) {
        const conditions = buildFilters(filters);

        const requests = await db.select({
            ...requestSelectShape,
            userId: serviceRequestTable.userId, // include userId 
        })
            .from(serviceRequestTable)
            .innerJoin(serviceItemsTable, eq(serviceRequestTable.serviceItemId, serviceItemsTable.id))
            .innerJoin(serviceCategoriesTable, eq(serviceItemsTable.categoryId, serviceCategoriesTable.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(serviceRequestTable.createdAt)
            .limit(filters.limit ?? 20)
            .offset(filters.offset ?? 0);

        const [{ count }] = await db.select({ count: sql`count(*)` })
            .from(serviceRequestTable)
            .where(conditions.length ? and(...conditions) : undefined);

        return { requests, total: Number(count), limit: filters.limit ?? 20, offset: filters.offset ?? 0 };
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


    async cancelRequest(requestId, userId) {
        const existing = await db.select()
            .from(serviceRequestTable)
            .where(eq(serviceRequestTable.id, requestId))
            .limit(1);

        if (!existing[0]) {
            throw new AppError("Service request not found", 404);
        }

        if (existing[0].userId !== userId) {
            throw new AppError("You can only cancel your own requests", 403);
        }

        if (existing[0].status !== "pending") {
            throw new AppError(
                `Request cannot be cancelled — current status is '${existing[0].status}'`,
                400
            );
        }

        const cancelled = await db.update(serviceRequestTable)
            .set({ status: "cancelled" })
            .where(eq(serviceRequestTable.id, requestId))
            .returning();

        return cancelled[0];
    }
}

module.exports = new RequestService();