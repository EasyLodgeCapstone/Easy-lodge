const { db } = require("../../config/db.js");
const { serviceCategoriesTable } = require("../../dbSchema/categorySchema.js");
const { eq } = require("drizzle-orm");

class CategoryService {

    async createCategory(data) {
        const category = await db.insert(serviceCategoriesTable)
            .values({
                name: data.name,
                description: data.description,
            })
            .returning();

        return category[0];
    }

    async getAllCategories() {
        const categories = await db.select()
            .from(serviceCategoriesTable)
            .where(eq(serviceCategoriesTable.isActive, true));

        return categories;
    }

    async getCategoryById(id) {
        const categories = await db.select()
            .from(serviceCategoriesTable)
            .where(eq(serviceCategoriesTable.id, id))
            .limit(1);

        return categories[0] ?? null;
    }

    async updateCategory(id, data) {
        const updated = await db.update(serviceCategoriesTable)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(serviceCategoriesTable.id, id))
            .returning();

        return updated[0] ?? null;
    }

    async deleteCategory(id) {
        // Soft deletetion to set isActive to false instead of removing the row to preserves existing service items and request history that reference this category.
        const deleted = await db.update(serviceCategoriesTable)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(serviceCategoriesTable.id, id))
            .returning();

        return deleted[0] ?? null;
    }
}

module.exports = new CategoryService();