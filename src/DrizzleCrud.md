// ============================================
// CRUD OPERATIONS FOR USERS TABLE
// ============================================

const express = require("express");
const { eq, and, or, like, desc, asc, sql } = require("drizzle-orm");

const router = express.Router();

// ============================================
// CREATE (POST) - Add new user
// ============================================
router.post("/users", async (req, res) => {
  try {
    const { name, age, email, address } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        error: "Name and email are required" 
      });
    }

    // Insert user
    const newUser = await db.insert(usersTable).values({
      name,
      age: age || null,  // Optional field
      email,
      address: address || null  // Optional field
    }).returning(); // Returns the inserted user

    res.status(201).json({
      message: "User created successfully",
      user: newUser[0]
    });
  } catch (error) {
    console.error("Create user error:", error);
    
    // Handle duplicate email error
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({ 
        error: "User with this email already exists" 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// READ (GET) - Get all users with pagination
// ============================================
router.get("/users", async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Sorting
    const sortBy = req.query.sortBy || 'id';
    const sortOrder = req.query.order === 'desc' ? desc : asc;
    
    // Get users with pagination
    const users = await db.select()
      .from(usersTable)
      .orderBy(sortOrder(usersTable[sortBy]))
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    const totalCount = await db.select({ count: sql`count(*)` })
      .from(usersTable);
    
    res.json({
      data: users,
      pagination: {
        page,
        limit,
        total: parseInt(totalCount[0].count),
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// READ (GET) - Get single user by ID
// ============================================
router.get("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    
    if (users.length === 0) {
      return res.status(404).json({ 
        error: "User not found" 
      });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// READ (GET) - Search users by name or email
// ============================================
router.get("/users/search/:term", async (req, res) => {
  try {
    const searchTerm = req.params.term;
    
    const users = await db.select()
      .from(usersTable)
      .where(
        or(
          like(usersTable.name, `%${searchTerm}%`),
          like(usersTable.email, `%${searchTerm}%`)
        )
      );
    
    res.json({
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// UPDATE (PUT) - Replace entire user
// ============================================
router.put("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, age, email, address } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        error: "Name and email are required" 
      });
    }
    
    // Check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    
    if (existingUser.length === 0) {
      return res.status(404).json({ 
        error: "User not found" 
      });
    }
    
    // Update user
    const updatedUser = await db.update(usersTable)
      .set({
        name,
        age,
        email,
        address
      })
      .where(eq(usersTable.id, userId))
      .returning();
    
    res.json({
      message: "User updated successfully",
      user: updatedUser[0]
    });
  } catch (error) {
    console.error("Update user error:", error);
    
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: "Email already in use" 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// UPDATE (PATCH) - Partial update
// ============================================
router.patch("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;
    
    // Check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    
    if (existingUser.length === 0) {
      return res.status(404).json({ 
        error: "User not found" 
      });
    }
    
    // Only update provided fields
    const updateData = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.age !== undefined) updateData.age = updates.age;
    if (updates.email) updateData.email = updates.email;
    if (updates.address !== undefined) updateData.address = updates.address;
    
    const updatedUser = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, userId))
      .returning();
    
    res.json({
      message: "User updated successfully",
      user: updatedUser[0]
    });
  } catch (error) {
    console.error("Patch user error:", error);
    
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: "Email already in use" 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DELETE - Remove user
// ============================================
router.delete("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    
    if (existingUser.length === 0) {
      return res.status(404).json({ 
        error: "User not found" 
      });
    }
    
    // Delete user
    await db.delete(usersTable)
      .where(eq(usersTable.id, userId));
    
    res.json({ 
      message: "User deleted successfully" 
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DELETE - Soft delete (if you have a deleted_at column)
// ============================================
// Add to schema: deleted_at: timestamp()
/*
router.delete("/users/soft/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    await db.update(usersTable)
      .set({ deleted_at: new Date() })
      .where(eq(usersTable.id, userId));
    
    res.json({ message: "User soft deleted successfully" });
  } catch (error) {
    console.error("Soft delete error:", error);
    res.status(500).json({ error: error.message });
  }
});
*/



// ============================================
// ADVANCED QUERIES ROUTE
// ============================================
router.get("/users/advanced/filter", async (req, res) => {
  try {
    const { 
      minAge, 
      maxAge, 
      nameStartsWith,
      createdAfter,
      sortBy = 'id',
      order = 'asc'
    } = req.query;
    
    // Build dynamic where conditions
    const conditions = [];
    
    if (minAge) {
      conditions.push(sql`${usersTable.age} >= ${minAge}`);
    }
    
    if (maxAge) {
      conditions.push(sql`${usersTable.age} <= ${maxAge}`);
    }
    
    if (nameStartsWith) {
      conditions.push(like(usersTable.name, `${nameStartsWith}%`));
    }
    
    if (createdAfter) {
      conditions.push(sql`${usersTable.created_at} >= ${createdAfter}`);
    }
    
    // Combine all conditions with AND
    const whereClause = conditions.length > 0 
      ? and(...conditions) 
      : undefined;
    
    const sortOrder = order === 'desc' ? desc : asc;
    
    const users = await db.select()
      .from(usersTable)
      .where(whereClause)
      .orderBy(sortOrder(usersTable[sortBy]));
    
    res.json({
      filters: req.query,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error("Advanced filter error:", error);
    res.status(500).json({ error: error.message });
  }
});




// ============================================
// BATCH CREATE - Insert multiple users
// ============================================
router.post("/users/batch", async (req, res) => {
  try {
    const users = req.body.users;
    
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ 
        error: "Please provide an array of users" 
      });
    }
    
    const newUsers = await db.insert(usersTable)
      .values(users)
      .returning();
    
    res.status(201).json({
      message: `${newUsers.length} users created`,
      users: newUsers
    });
  } catch (error) {
    console.error("Batch create error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BATCH DELETE - Delete multiple users
// ============================================
router.delete("/users/batch", async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        error: "Please provide an array of user IDs" 
      });
    }
    
    const deleted = await db.delete(usersTable)
      .where(sql`${usersTable.id} IN (${ids.join(',')})`)
      .returning({ id: usersTable.id });
    
    res.json({
      message: `${deleted.length} users deleted`,
      deletedIds: deleted.map(d => d.id)
    });
  } catch (error) {
    console.error("Batch delete error:", error);
    res.status(500).json({ error: error.message });
  }
});