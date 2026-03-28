const { z } = require("zod");

const createAdminOrStaffSchema = z.object({
    name: z.string().min(3, "Name must contain at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["admin", "staff"], {
        errorMap: () => ({ message: "Role must be either 'admin' or 'staff'" }),
    }),
    adminSecret: z.string().min(1, "Admin secret is required"),
});

const adminLoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

const updateUserRoleSchema = z.object({
    role: z.enum(["admin", "staff", "user"], {
        errorMap: () => ({ message: "Role must be 'admin', 'staff', or 'user'" }),
    }),
});

module.exports = {
    createAdminOrStaffSchema,
    adminLoginSchema,
    updateUserRoleSchema,
};