# EasyLodge — Admin & Staff API

> This document covers only the admin and staff login and update routes.
> For standard user authentication (register, login, OTP, password reset), refer to the main Auth API documentation.

---

## Table of Contents

1. [Overview](#overview)
2. [Roles & What They Can Do](#roles--what-they-can-do)
3. [Admin Secret](#admin-secret)
4. [Routes at a Glance](#routes-at-a-glance)
5. [Full Flow](#full-flow)
6. [API Reference](#api-reference)
   - [POST /auth/admin/register](#post-authadminregister)
   - [POST /auth/admin/login](#post-authadminlogin)
   - [PATCH /auth/admin/users/:id/role](#patch-authadminusersidrole)
7. [Shared Auth Behaviours](#shared-auth-behaviours)
   - [Email Verification (OTP)](#email-verification-otp)
   - [Account Lockout](#account-lockout)
   - [Token Refresh](#token-refresh)
8. [Authorization Header](#authorization-header)
9. [Response Format](#response-format)
10. [All Possible Errors](#all-possible-errors)
11. [Frontend Integration Checklist](#frontend-integration-checklist)

---

## Overview

Admin and staff accounts are separate from regular user accounts in certain ways:

- They are created through a different route that requires a server-side secret key
- They carry a `role` of `"admin"` or `"staff"` in their JWT, which grants access to protected hotel management routes

There is no self-signup for admin or staff. All privileged accounts must be created by someone with access to the `ADMIN_SECRET` environment variable on the server.

---

## Roles & What They Can Do

| Role | Description | Can update roles |
|------|-------------|:---:|
| `admin` | Full access. Can manage staff, users, and hotel resources | Yes |
| `staff` | Operational access to hotel/booking management routes | No |
| `user` | Regular guest — cannot access any admin or staff routes | No |

The role is embedded in the JWT access token. Every protected route on the backend reads this role and enforces access — the frontend should use it only for displaying/hiding UI, never as a security gate.

---

## Admin Secret

`POST /auth/admin/register` is a public route but it requires an `adminSecret` field in the request body. This value must exactly match the `ADMIN_SECRET` environment variable set on the server.

The secret is how the system knows the caller is authorised to create a privileged account. It is not a user password — it is a shared server-side key known only to whoever manages the deployment.

> The frontend does **not** need to know or store `adminSecret`. It is only used by whoever is onboarding new admins or staff directly (e.g. a hotel operator filling in a setup form, or a backend developer using Postman).

---

## Routes at a Glance

| Method | Endpoint | Auth Required | Who uses it |
|--------|----------|:---:|-------------|
| `POST` | `/auth/admin/register` | No — requires `adminSecret` in body | Server operator / onboarding flow |
| `POST` | `/auth/admin/login` | No | Admin or staff logging in |
| `PATCH` | `/auth/admin/users/:id/role` | Access token — admin only | Admin promoting/demoting a user |

---

## Full Flow

### Creating and activating an admin or staff account

```
Operator (has ADMIN_SECRET)       API                        Email
        |                          |                            |
        |-- POST /auth/admin/       |                            |
        |   register -------------->|                            |
        |   {                       |                            |
        |     name, email,          |                            |
        |     password,             |                            |
        |     role: "admin"|"staff",|                            |
        |     adminSecret: "..."    |                            |
        |   }                       |                            |
        |                           |-- Validate secret          |
        |                           |-- Send OTP email --------->|
        |<-- 201 { user object } ---|                            |
        |                           |                            |
        |   (admin/staff checks     |                            |
        |    email for OTP)         |                            |
        |                           |                            |
        |-- POST /auth/verify ----->|                            |
        |   { email, otp }          |                            |
        |<-- 200 success -----------|                            |
        |                           |                            |
        |   (account is now active) |                            |
```

> `POST /auth/verify` is the shared email verification endpoint documented in the main Auth API. It works identically for admin and staff accounts.

---

### Logging in as admin or staff

```
Admin / Staff                     API                        Redis
        |                          |                            |
        |-- POST /auth/admin/       |                            |
        |   login ----------------->|                            |
        |   { email, password }     |                            |
        |                           |-- Check role !== "user"    |
        |                           |-- Store refreshToken ----->|
        |<-- 200 {                  |                            |
        |     user,                 |                            |
        |     accessToken,          |                            |
        |     refreshToken          |                            |
        |   } ----------------------|                            |
```

Regular `user` accounts are rejected at this route with `403` even if their credentials are correct. This is enforced on the backend — there is no workaround.

---

### Updating a user's role

```
Admin (logged in)                 API
        |                          |
        |-- PATCH /auth/admin/      |
        |   users/:id/role -------->|
        |   Authorization: Bearer   |
        |   <adminAccessToken>      |
        |   { role: "staff" }       |
        |                           |-- Verify token
        |                           |-- Check caller role === "admin"
        |                           |-- Update DB
        |<-- 200 { updated user } --|
```

Only `admin` accounts can call this route. Staff accounts will receive `403`.

---

## API Reference

### POST /auth/admin/register

Creates a new admin or staff account. Requires the `adminSecret` to match the server's `ADMIN_SECRET` environment variable. A verification OTP is sent to the provided email — the account cannot be used until verified.

**Request body**

```json
{
  "name": "Hotel Manager",
  "email": "manager@easylodge.com",
  "password": "securepass123",
  "role": "admin",
  "adminSecret": "your_admin_secret_here"
}
```

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| `name` | string | Yes | Min 3 characters |
| `email` | string | Yes | Must be a valid email, unique |
| `password` | string | Yes | Min 6 characters |
| `role` | string | Yes | Must be `"admin"` or `"staff"` |
| `adminSecret` | string | Yes | Must match server `ADMIN_SECRET` |

**Success — 201**

```json
{
  "success": true,
  "message": "Admin account created successfully. Please verify your email.",
  "data": {
    "id": "cjld2cjxh0000qzrmn831i7rn",
    "name": "Hotel Manager",
    "email": "manager@easylodge.com",
    "role": "admin",
    "isVerified": false,
    "isDeleted": false,
    "loginAttempts": 0,
    "lockUntil": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Errors**

| Status | Message | Cause |
|--------|---------|-------|
| `400` | Validation failed | Missing or invalid fields |
| `403` | Invalid admin secret | `adminSecret` does not match server value |
| `409` | Identity conflict: Email already exists | Email is already registered |

---

### POST /auth/admin/login

Logs in an admin or staff account. Returns an access token and a refresh token on success. Regular `user` accounts are blocked at this route regardless of credentials.

**Request body**

```json
{
  "email": "manager@easylodge.com",
  "password": "securepass123"
}
```

| Field | Type | Required |
|-------|------|:--------:|
| `email` | string | Yes |
| `password` | string | Yes |

**Success — 200**

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "cjld2cjxh0000qzrmn831i7rn",
      "name": "Hotel Manager",
      "email": "manager@easylodge.com",
      "role": "admin",
      "isVerified": true,
      "isDeleted": false,
      "loginAttempts": 0,
      "lockUntil": null,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors**

| Status | Message | Cause |
|--------|---------|-------|
| `400` | Validation failed | Missing or invalid fields |
| `401` | Invalid credentials | Wrong password |
| `403` | Access denied. This route is for admin and staff only. | Account has `role: "user"` |
| `403` | Account not verified. Please verify your email before logging in. | Email OTP not completed |
| `403` | Account temporarily locked. Try again in X minutes. | Too many failed login attempts |

---

### PATCH /auth/admin/users/:id/role

Promotes or demotes any user's role. Requires a valid access token from an `admin` account. Staff accounts cannot call this route.

**Headers**

```
Authorization: Bearer <adminAccessToken>
Content-Type: application/json
```

**URL params**

| Param | Type | Notes |
|-------|------|-------|
| `:id` | string | The target user's ID |

**Request body**

```json
{
  "role": "staff"
}
```

`role` must be one of: `"admin"` | `"staff"` | `"user"`

**Success — 200**

```json
{
  "success": true,
  "message": "User role updated to 'staff' successfully.",
  "data": {
    "id": "cjld2cjxh0000qzrmn831i7rn",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "staff",
    "isVerified": true,
    "isDeleted": false,
    "loginAttempts": 0,
    "lockUntil": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Errors**

| Status | Message | Cause |
|--------|---------|-------|
| `400` | Validation failed | `role` value is not valid |
| `400` | User already has the role 'x' | Target already has the requested role |
| `400` | Cannot update role of a deleted account | Target user is soft-deleted |
| `400` | Invalid user ID | `:id` param is not a valid format |
| `401` | No token provided | `Authorization` header is missing |
| `401` | Access token expired | Token has expired — refresh it first |
| `401` | Invalid token | Token is malformed or tampered |
| `403` | Access denied. Admins only. | Caller's role is `"staff"` or `"user"` |
| `404` | User not found | No user exists with that ID |

---

## Shared Auth Behaviours

These behaviours apply to admin and staff accounts in exactly the same way they apply to regular users.

### Email Verification (OTP)

After `POST /auth/admin/register`, a 6-digit OTP is sent to the provided email. The account cannot log in until this OTP is verified via `POST /auth/verify`.

```json
POST /auth/verify
{
  "email": "manager@easylodge.com",
  "otp": "482910"
}
```

- OTP expires after **10 minutes**
- If expired, request a new one via `POST /auth/resend-otp`
- Attempting to log in before verifying returns `403 "Account not verified"`

---

### Account Lockout

After **5 consecutive failed login attempts**, the account is locked for **2 minutes**. While locked, all login attempts return:

```json
{
  "success": false,
  "message": "Account temporarily locked. Try again in 2 minutes.",
  "data": {
    "lockUntil": "2026-01-01T00:02:00.000Z",
    "secondsRemaining": 120
  }
}
```

Use `data.secondsRemaining` to show a countdown timer. The lock clears automatically — no manual intervention needed. A successful login after the lock expires resets the attempt counter to zero.

Each failed attempt before the lockout returns the remaining attempts:

```json
{
  "success": false,
  "message": "Invalid credentials. Multiple failed attempts will trigger an account lockout.",
  "data": {
    "loginAttempts": 3,
    "remainingAttempts": 2
  }
}
```

---

### Token Refresh

Admin and staff tokens work identically to user tokens.

| Token | Lifetime | Recommended storage |
|-------|----------|---------------------|
| `accessToken` | 15 minutes | Memory only (state / variable) |
| `refreshToken` | 7 days | `httpOnly` cookie or `localStorage` |

When an authenticated request returns `401 "Access token expired"`, call `POST /auth/refresh` with the refresh token in the `Authorization` header to get a new access token, then retry the original request.

```
POST /auth/refresh
Authorization: Bearer <refreshToken>
```

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGci..."
  }
}
```

If the refresh request itself returns `401`, the session has fully expired and the admin/staff must log in again.

> `POST /auth/refresh` is documented fully in the main Auth API. The behaviour is identical for all roles.

---

## Authorization Header

Every request to a protected route must include:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

| Scenario | Response |
|----------|----------|
| Header missing entirely | `401 "No token provided"` |
| Token is malformed | `401 "Invalid token"` |
| Token has expired | `401 "Access token expired"` |
| Token is valid but role is insufficient | `403 "Access denied"` |

---

## Response Format

All responses follow the same envelope:

**Success**
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

**Error**
```json
{
  "success": false,
  "message": "...",
  "data": { ... }
}
```

`data` is only included when extra context is useful (e.g. lockout timer, remaining attempts, validation errors). It is omitted on simple success/error responses.

**Validation errors** specifically return `data.errors` — an array of per-field messages:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "role", "message": "Role must be either 'admin' or 'staff'" },
      { "field": "adminSecret", "message": "Admin secret is required" }
    ]
  }
}
```

---

## All Possible Errors

A consolidated reference of every normal error the admin routes can return:

| Status | Message | Route | What to do |
|--------|---------|-------|-----------|
| `400` | Validation failed | All | Check `data.errors` for field-level detail |
| `400` | User already has the role 'x' | PATCH role | No action needed — role is already set |
| `400` | Cannot update role of a deleted account | PATCH role | Account is soft-deleted, cannot be modified |
| `400` | Invalid user ID | PATCH role | Check the `:id` param in the URL |
| `400` | OTP expired, request a new one | verify | Call `POST /auth/resend-otp` |
| `400` | Invalid OTP | verify | User entered wrong OTP |
| `401` | Invalid credentials | login | Wrong password |
| `401` | No token provided | PATCH role | Add `Authorization: Bearer <token>` header |
| `401` | Access token expired | PATCH role | Refresh the token then retry |
| `401` | Invalid token | PATCH role | Token is malformed — redirect to login |
| `403` | Invalid admin secret | register | `adminSecret` value is wrong |
| `403` | Access denied. This route is for admin and staff only. | login | Caller is a regular user |
| `403` | Account not verified | login | Complete email OTP verification first |
| `403` | Account temporarily locked | login | Wait out the lockout or show countdown |
| `403` | Access denied. Admins only. | PATCH role | Caller is staff, not admin |
| `404` | User not found | PATCH role | No user with that ID exists |
| `409` | Identity conflict: Email already exists | register | Email is taken |

