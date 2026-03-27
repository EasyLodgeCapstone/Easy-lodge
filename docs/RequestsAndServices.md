# Easy-Lodge: Services API

This document covers the full Services API for the Easy-Lodge lodging platform. It is intended for frontend developers integrating with the backend and covers authentication, all available endpoints, request/response shapes, error handling, and integration notes.

---

## Table of Contents

1. [Base URL & Setup](#base-url--setup)
2. [Authentication](#authentication)
3. [Roles & Permissions](#roles--permissions)
4. [How the Services System Works](#how-the-services-system-works)
5. [Standard Response Shape](#standard-response-shape)
6. [Error Handling](#error-handling)
7. [Categories API](#categories-api)
8. [Service Items API](#service-items-api)
9. [Service Requests API](#service-requests-api)
10. [Filtering & Pagination](#filtering--pagination)
11. [Enums Reference](#enums-reference)
12. [Postman Collection](#postman-collection)
13. [Integration Walkthrough](#integration-walkthrough)

---

## Base URL & Setup

```
http://localhost:3000/api
```

All requests must include the `Authorization` header with a valid Bearer token obtained from the login endpoint. All request bodies must use `Content-Type: application/json`.

```
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

---

## Authentication

The API uses JWT-based authentication with two token types.

| Token | Used for | Header |
|---|---|---|
| Access token | All regular requests | `Authorization: Bearer <token>` |
| Refresh token | Obtaining a new access token | `Authorization: Bearer <token>` |

Access tokens expire after a short period. When you receive a `401` with `"Access token expired"`, use your refresh token against the refresh endpoint to get a new access token.

---

## Roles & Permissions

Every authenticated user has one of three roles. The role is embedded in the JWT and read server-side — the frontend does not need to send it separately.

| Role | Can do |
|---|---|
| `user` | Browse categories and items, create requests, view own requests, cancel own pending requests |
| `staff` | Everything a user can do, plus manage the catalog (categories and items) and update request statuses |
| `admin` | Everything staff can do plus more privilages|

> **Note:** A regular user attempting a staff-only endpoint will receive a `403 Forbidden` response.

---

## How the Services System Works

The services system has three layers. Understanding this flow is essential for building the frontend correctly.

```
service_categories
      │
      └── service_items  (many items per category)
                │
                └── service_requests  (a request references one item)
```

**Step 1 — Staff build the catalog**
Staff create categories (Food, Laundry, Cleaning, Room Service, etc.) and then add service items under each category (Continental Breakfast, Dry Cleaning, Extra Towels, etc.). This is the menu guests will browse.

**Step 2 — Guest browses the catalog**
The frontend fetches active categories, lets the guest pick one, then fetches the items under that category. The guest selects an item — this gives you a `serviceItemId`.

**Step 3 — Guest submits a request**
The frontend sends the `serviceItemId`, `roomId`, quantity, priority, optional notes, and optional scheduled delivery time. The server validates the item is active, generates a `bookingReference`, and saves the request.

**Step 4 — Staff fulfil the request**
Staff view all incoming requests via the admin route, filter by status or priority, and move requests through the lifecycle: `pending → in_progress → completed` (or `cancelled`).

---

## Standard Response Shape

All responses follow this structure:

**Success:**
```json
{
  "success": true,
  "message": "Human readable message",
  "data": { }
}
```

**Success with pagination** (list endpoints):
```json
{
  "success": true,
  "message": "Human readable message",
  "data": [ ],
  "pagination": {
    "total": 47,
    "limit": 20,
    "offset": 0
  }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Human readable error message",
  "data": {
    "errors": [
      { "field": "serviceItemId", "message": "Required" }
    ]
  }
}
```

The `data.errors` array is only present on `400 Validation failed` responses. All other errors only have `message`.

---

## Error Handling

| HTTP Status | Meaning | When it happens |
|---|---|---|
| `400` | Validation failed or bad request | Missing/invalid fields, invalid enum value, cancelling a non-pending request |
| `401` | Unauthorized | No token, invalid token, expired token |
| `403` | Forbidden | Correct token but insufficient role, or trying to cancel another user's request |
| `404` | Not found | The resource with that ID does not exist |
| `409` | Conflict | Duplicate unique value (e.g. category name already exists) |
| `500` | Server error | Unexpected error — report to backend |

**Validation errors (400)** include a `data.errors` array. Each entry has a `field` (dot-notation path) and a `message`:
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "roomId", "message": "Required" },
      { "field": "quantity", "message": "Number must be greater than or equal to 1" }
    ]
  }
}
```

---

## Categories API

Categories are the top-level groupings of services (Food, Laundry, Cleaning, etc.).

---

### `GET /categories`
Returns all **active** categories. Available to all authenticated users.

**Response:**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Food & Beverages",
      "description": "In-room dining and beverages",
      "isActive": true,
      "createdAt": "2025-06-01T10:00:00.000Z",
      "updatedAt": "2025-06-01T10:00:00.000Z"
    }
  ]
}
```

---

### `GET /categories/all`
Returns **all** categories including deactivated ones. **Staff/admin only.**

Response shape is identical to `GET /categories` but includes entries where `isActive` is `false`.

---

### `POST /categories`
Creates a new category. **Staff/admin only.**

**Request body:**
```json
{
  "name": "Food & Beverages",
  "description": "In-room dining and beverages"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | 2–100 characters, must be unique |
| `description` | string | No | Max 300 characters |

**Response:** `201` with the created category object.

---

### `PATCH /categories/:id`
Updates a category's name, description, or active status. **Staff/admin only.**

**Request body** (all fields optional):
```json
{
  "name": "Food & Drinks",
  "description": "Updated description",
  "isActive": true
}
```

**Response:** `200` with the updated category object.

---

### `DELETE /categories/:id`
Soft-deletes a category by setting `isActive` to `false`. The category and all its items remain in the database — existing request history is preserved. **Staff/admin only.**

**Response:** `200` with the deactivated category object.

---

### `PATCH /categories/:id/reactivate`
Re-enables a previously deactivated category. **Staff/admin only.**

If the category is already active, returns `200` with the message `"Category is already active"` — this is not an error.

**Response:** `200` with the updated category object.

---

## Service Items API

Service items are the individual offerings within a category (e.g. "Continental Breakfast" under "Food & Beverages"). All item routes are nested under their category.

---

### `GET /categories/:categoryId/items`
Returns all **active** items under an **active** category. Available to all authenticated users. This is what the frontend should use to show the guest their options.

**Response:**
```json
{
  "success": true,
  "message": "Service items retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Continental Breakfast",
      "description": "Bread, eggs, juice and coffee",
      "price": "15.00",
      "categoryId": 1,
      "categoryName": "Food & Beverages"
    }
  ]
}
```

> **Note:** `price` is returned as a string from Postgres numeric type. Parse it as a float on the frontend if needed.

---

### `GET /categories/:categoryId/items/all`
Returns **all** items in a category including deactivated ones. **Staff/admin only.**

Response shape matches `GET /categories/:categoryId/items` but includes an `isActive` field on each item.

---

### `POST /categories/:categoryId/items`
Creates a new service item under the given category. **Staff/admin only.**

The category must exist and be active. Creating an item under a deactivated category returns `404`.

**Request body:**
```json
{
  "name": "Continental Breakfast",
  "description": "Bread, eggs, juice and coffee",
  "price": 15.00
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | 2–150 characters |
| `description` | string | No | Max 500 characters |
| `price` | number | No | Must be >= 0 |

**Response:** `201` with the created item object.

---

### `PATCH /categories/:categoryId/items/:id`
Updates a service item. **Staff/admin only.**

**Request body** (all fields optional):
```json
{
  "name": "Full English Breakfast",
  "price": 18.00,
  "isActive": true
}
```

**Response:** `200` with the updated item object.

---

### `DELETE /categories/:categoryId/items/:id`
Soft-deletes an item. The item is hidden from users but request history referencing it is preserved. **Staff/admin only.**

**Response:** `200` with the deactivated item object.

---

### `PATCH /categories/:categoryId/items/:id/reactivate`
Re-enables a previously deactivated item. **Staff/admin only.**

If the item is already active, returns `200` with the message `"Service item is already active"`.

**Response:** `200` with the updated item object.

---

## Service Requests API

---

### `POST /requests`
Creates a new service request. The guest must select a valid, active service item.

**Request body:**
```json
{
  "roomId": 101,
  "serviceItemId": 3,
  "quantity": 2,
  "priority": "normal",
  "notes": "No onions please",
  "scheduledAt": "2025-06-01T08:00:00Z"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `roomId` | integer | Yes | Must be a positive integer |
| `serviceItemId` | integer | Yes | Must reference an active service item |
| `quantity` | integer | No | Min 1, defaults to `1` |
| `priority` | string | No | `"normal"` or `"urgent"`, defaults to `"normal"` |
| `notes` | string | No | Max 1000 characters |
| `scheduledAt` | string | No | ISO 8601 datetime e.g. `"2025-06-01T08:00:00Z"` |

**Response:** `201`
```json
{
  "success": true,
  "message": "Service request created successfully",
  "data": {
    "id": 12,
    "bookingReference": "REQ-1748765432100-A3F9K",
    "userId": 5,
    "roomId": 101,
    "serviceItemId": 3,
    "quantity": 2,
    "priority": "normal",
    "notes": "No onions please",
    "scheduledAt": "2025-06-01T08:00:00.000Z",
    "status": "pending",
    "createdAt": "2025-06-01T07:00:00.000Z",
    "updatedAt": "2025-06-01T07:00:00.000Z"
  }
}
```

---

### `GET /requests`
Returns the authenticated user's own requests. Supports filtering and pagination.

See [Filtering & Pagination](#filtering--pagination) for query param details.

**Response includes a `pagination` block:**
```json
{
  "success": true,
  "message": "Service requests retrieved successfully",
  "data": [
    {
      "id": 12,
      "bookingReference": "REQ-1748765432100-A3F9K",
      "roomId": 101,
      "quantity": 2,
      "priority": "normal",
      "notes": "No onions please",
      "scheduledAt": "2025-06-01T08:00:00.000Z",
      "status": "pending",
      "createdAt": "2025-06-01T07:00:00.000Z",
      "updatedAt": "2025-06-01T07:00:00.000Z",
      "serviceName": "Continental Breakfast",
      "servicePrice": "15.00",
      "categoryName": "Food & Beverages"
    }
  ],
  "pagination": {
    "total": 8,
    "limit": 20,
    "offset": 0
  }
}
```

---

### `GET /requests/all`
Returns **all** requests across all users. **Staff/admin only.** Supports the same filters and pagination as `GET /requests`. Also includes `userId` on each record so staff know who made the request.

---

### `GET /requests/:id`
Returns a single request by ID. Available to all authenticated users.

**Response:** `200` with a single request object (same shape as items in `GET /requests`).

Returns `404` if the request does not exist.

---

### `PATCH /requests/:id/status`
Updates the status of a request. **Staff/admin only.**

**Request body:**
```json
{
  "status": "in_progress"
}
```

Valid values: `"pending"`, `"in_progress"`, `"completed"`, `"cancelled"`.

**Response:** `200` with the updated request object.

---

### `PATCH /requests/:id/cancel`
Allows a user to cancel their **own** request. Only works while the request is still `pending`. Once a request is `in_progress` or `completed` it cannot be cancelled by the user.

No request body needed.

**Possible error responses:**

| Status | Message | Reason |
|---|---|---|
| `400` | `"Request cannot be cancelled — current status is 'in_progress'"` | Request already picked up by staff |
| `403` | `"You can only cancel your own requests"` | Trying to cancel another user's request |
| `404` | `"Service request not found"` | Invalid ID |

---

## Filtering & Pagination

Both `GET /requests` and `GET /requests/all` accept the following query parameters:

| Param | Type | Description | Example |
|---|---|---|---|
| `status` | string | Filter by request status | `?status=pending` |
| `priority` | string | Filter by priority level | `?priority=urgent` |
| `from` | ISO datetime | Filter requests created on or after this date | `?from=2025-06-01T00:00:00Z` |
| `to` | ISO datetime | Filter requests created on or before this date | `?to=2025-06-30T23:59:59Z` |
| `limit` | integer | Number of results per page (max 100, default 20) | `?limit=10` |
| `offset` | integer | Number of results to skip (default 0) | `?offset=20` |

All params are optional. Omitting them returns all results (up to the default `limit`).

**Pagination example** — fetching page 2 with 10 results per page:
```
GET /requests?limit=10&offset=10
```

To calculate total pages on the frontend:
```js
const totalPages = Math.ceil(pagination.total / pagination.limit);
```

---

## Enums Reference

These are the only accepted values for enum fields. Sending anything else returns a `400` validation error.

**Request status** (`status`):
| Value | Meaning |
|---|---|
| `pending` | Request submitted, not yet actioned |
| `in_progress` | Staff are working on it |
| `completed` | Fulfilled |
| `cancelled` | Cancelled by user or staff |

**Priority** (`priority`):
| Value | Meaning |
|---|---|
| `normal` | Standard delivery |
| `urgent` | Guest needs this quickly |

---

## Postman Collection

A Postman collection (`services.postman_collection.json`) is provided alongside this document with 43 pre-built tests covering all endpoints and edge cases.

### Setup

1. Open Postman and click **Import**, then select `services.postman_collection.json`
2. Click the collection name → **Variables** and set these four values:

| Variable | Description | Example |
|---|---|---|
| `baseUrl` | Your API base URL | `http://localhost:3000/api` |
| `userToken` | JWT for a regular user account | Obtain from login endpoint |
| `staffToken` | JWT for a staff or admin account | Obtain from login endpoint |

The variables `categoryId`, `itemId`, and `requestId` are **set automatically** by the tests as you run them — you do not need to fill these in manually.

### Running the collection

Run the folders **in order** — Categories first, then Service Items, then Service Requests. Each folder builds on the IDs saved by the previous one. The quickest way is to use Postman's **Collection Runner**: select the collection, enable all tests, and click **Run**.

### What is tested

| Folder | Tests |
|---|---|
| Categories | Create, list (user + admin), update, delete, reactivate — including 403 and 400 cases |
| Service Items | Create, list (user + admin), update, delete, reactivate — including invalid category and 403 cases |
| Service Requests | Create, list with filters, paginate, get by id, update status, cancel — including all error cases |

---

## Integration Walkthrough

This is the recommended order of operations for building the guest-facing request flow on the frontend.

**1. Show the guest the service menu**
```
GET /categories
```
Render the categories as tabs or a dropdown.

**2. When the guest selects a category, load its items**
```
GET /categories/:categoryId/items
```
Render items as cards showing name, description, and price.

**3. When the guest selects an item and fills in the form, submit the request**
```
POST /requests
Body: { roomId, serviceItemId, quantity, priority, notes, scheduledAt }
```
Save the returned `bookingReference` and show it to the guest as their tracking reference.

**4. Show the guest their request history**
```
GET /requests?status=pending&limit=10&offset=0
```
Use the `pagination` block to build page controls.

**5. Allow the guest to cancel a pending request**
```
PATCH /requests/:id/cancel
```
Only show the cancel button when `request.status === "pending"`.

**For the staff dashboard:**

```
GET /requests/all?status=pending&priority=urgent
```
Filter by `pending` and `urgent` to show the most critical items first. Update status as staff action each request:
```
PATCH /requests/:id/status
Body: { "status": "in_progress" }
```