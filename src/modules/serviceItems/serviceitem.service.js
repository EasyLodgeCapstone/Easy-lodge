const { db } = require("../../config/db.js");
const { serviceItemsTable } = require("../../dbSchema/serviceItemSchema.js");
const { serviceCategoriesTable } = require("../../dbSchema/categorySchema.js");
const { eq, and } = require("drizzle-orm");

class ServiceItemService {

    async createItem(categoryId, data) {
        const item = await db.insert(serviceItemsTable)
            .values({
                categoryId,
                name: data.name,
                description: data.description,
                price: data.price,
            })
            .returning();

        return item[0];
    }

    async getItemsByCategory(categoryId) {
        // Only return active items in an active category
        const items = await db.select({
            id: serviceItemsTable.id,
            name: serviceItemsTable.name,
            description: serviceItemsTable.description,
            price: serviceItemsTable.price,
            categoryId: serviceItemsTable.categoryId,
            categoryName: serviceCategoriesTable.name,
        })
            .from(serviceItemsTable)
            .innerJoin(
                serviceCategoriesTable,
                eq(serviceItemsTable.categoryId, serviceCategoriesTable.id)
            )
            .where(
                and(
                    eq(serviceItemsTable.categoryId, categoryId),
                    eq(serviceItemsTable.isActive, true),
                    eq(serviceCategoriesTable.isActive, true)
                )
            );

        return items;
    }

    async getItemById(id) {
        const items = await db.select()
            .from(serviceItemsTable)
            .where(eq(serviceItemsTable.id, id))
            .limit(1);

        return items[0] ?? null;
    }

    async updateItem(id, data) {
        const updated = await db.update(serviceItemsTable)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(serviceItemsTable.id, id))
            .returning();

        return updated[0] ?? null;
    }

    async deleteItem(id) {
        // Soft delete to keep request history intact
        const deleted = await db.update(serviceItemsTable)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(serviceItemsTable.id, id))
            .returning();

        return deleted[0] ?? null;
    }
}

module.exports = new ServiceItemService();