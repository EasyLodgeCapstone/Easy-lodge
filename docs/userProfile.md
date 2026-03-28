# Easy-Lodge: User Profile API

Base URL: `/api/user`

This document covers all user profile endpoints for the Easy-Lodge API — fetching, updating, avatar uploads, and account deletion. Read the [Authentication Requirements](#authentication-requirements) and [Important Notes for Frontend](#important-notes-for-frontend) sections before implementing.

---

## Table of Contents

- [Authentication Requirements](#authentication-requirements)
- [Important Notes for Frontend](#important-notes-for-frontend)
- [Response Format](#response-format)
- [Error Format](#error-format)
- [Endpoints](#endpoints)
  - [Get Profile](#1-get-profile)
  - [Update Profile](#2-update-profile)
  - [Upload Avatar](#3-upload-avatar)
  - [Delete Account](#4-delete-account)
- [Field Reference](#field-reference)
- [Avatar Upload Guide](#avatar-upload-guide)
- [Account Deletion Behaviour](#account-deletion-behaviour)

---

## Authentication Requirements

**Every route on this API requires authentication.** There are no public endpoints here.

Include the access token on every request:

```
Authorization: Bearer <accessToken>
```

If the token is missing or invalid the server returns `401`. If the token has expired, use `POST /api/auth/refresh-token` to get a new one before retrying. See the Auth API documentation for token management details.

---

## Important Notes for Frontend

> Read these before writing any integration code.

**1. Sensitive fields are never returned**
`password`, `otp`, and `otpExpiry` are stripped from every response. Never expect them in the data object.

**2. Update profile uses JSON — avatar upload does not**
`PATCH /profile` takes a JSON body. `PATCH /avatar` takes `multipart/form-data`. These are different content types — sending JSON to the avatar route or form-data to the profile route will not work.

**3. You can update one field or many at once**
All fields on `PATCH /profile` are optional. Send only what has changed — the server merges updates gracefully. Sending an empty `{}` body returns a `400` error.

**4. Profile fields are split across two database tables**
`name`, `email`, and `password` live on the users table. `phone`, `bio`, and `country` live on the profiles table. This is invisible to the frontend — the API handles routing updates to the right table internally and always returns a unified response.

**5. Avatar upload is processed and transformed server-side**
Uploaded avatars are cropped to a 400x400 square, face-detected and centred, then stored on Cloudinary. The original file is never kept. The response returns a Cloudinary URL — store this and use it to display the avatar.

**6. Delete account is a soft delete**
The account is not permanently removed from the database — it is marked as deleted with a timestamp. The user's data is preserved for administrative purposes. After deletion, all tokens are invalidated and the user cannot log in.

**7. Email changes take effect immediately**
If a user changes their email, subsequent login attempts must use the new email. Notify the user of this clearly in the UI.

**8. Password changes do not invalidate existing tokens**
After a password update the current session stays active. If you want to force re-login after a password change, call `POST /api/auth/logout` immediately after a successful password update.

---

## Response Format

All successful responses:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": { }
}
```

---

## Error Format

All error responses:

```json
{
  "success": false,
  "message": "Human readable error message"
}
```

Validation errors include an `errors` array:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" },
    { "field": "bio",   "message": "Bio must be under 500 characters" }
  ]
}
```

---

## Endpoints

### 1. Get Profile

**`GET /api/user/profile`**

Returns the authenticated user's profile data. Use this to populate profile pages and pre-fill update forms.

#### Headers

```
Authorization: Bearer <accessToken>
```

#### Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "isVerified": true,
    "isDeleted": false,
    "createdAt": "2026-03-18T10:00:00.000Z",
    "updatedAt": "2026-03-18T10:00:00.000Z",
    "loginAttempts": 0,
    "lockUntil": null
  }
}
```

> `password`, `otp`, and `otpExpiry` are always stripped and will never appear here.

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `401` | `No token provided` | Authorization header missing |
| `401` | `Access token expired` | Token has expired — refresh it |
| `401` | `Invalid token` | Token is malformed |
| `404` | `User not found` | User ID from token does not exist in DB |

---

### 2. Update Profile

**`PATCH /api/user/profile`**

Updates one or more profile fields. All fields are optional — send only what needs to change. The server always returns the full updated user object.

#### Headers

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

#### Request Body

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "newpassword123",
  "phone": "+2348012345678",
  "bio": "I love travelling and good food.",
  "country": "Nigeria"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | No | Minimum 3 characters |
| `email` | string | No | Must be a valid email, must not be taken by another account |
| `password` | string | No | Minimum 6 characters — will be hashed automatically |
| `phone` | string | No | No format enforced — validate on the frontend |
| `bio` | string | No | Maximum 500 characters |
| `country` | string | No | No format enforced |

> Send at least one field. An empty `{}` body returns a `400` error.

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "user",
    "isVerified": true,
    "createdAt": "2026-03-18T10:00:00.000Z",
    "updatedAt": "2026-03-18T11:30:00.000Z"
  }
}
```

> The response always reflects the current state of the account after the update, even if only profile-table fields like `bio` or `country` were changed.

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `400` | `No update data provided` | Empty request body `{}` sent |
| `400` | Validation errors array | Field failed a validation rule (e.g. bio too long, invalid email) |
| `401` | `No token provided` | Authorization header missing |
| `401` | `Access token expired` | Token has expired |
| `409` | `Email already in use` | Email belongs to another account |

---

### 3. Upload Avatar

**`PATCH /api/user/avatar`**

Uploads a profile picture. Must be sent as `multipart/form-data` — **not JSON**. The image is processed and stored on Cloudinary. Returns the Cloudinary URL to display.

#### Headers

```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data   ← set automatically when using FormData
```

> Do not manually set `Content-Type` when using `FormData` in JavaScript — the browser sets it automatically with the correct boundary. Setting it manually will break the upload.

#### Request Body

Form-data with a single file field:

| Key | Type | Required | Rules |
|---|---|---|---|
| `avatar` | File | Yes | JPEG, JPG, PNG, or WebP only. Maximum 5MB. One file only. |

#### How to send from the browser

```js
const formData = new FormData();
formData.append("avatar", fileInput.files[0]);

const response = await fetch("/api/user/avatar", {
  method: "PATCH",
  headers: {
    "Authorization": `Bearer ${accessToken}`
    // Do NOT set Content-Type here — let the browser set it automatically
  },
  body: formData
});
```

#### How to send from axios

```js
const formData = new FormData();
formData.append("avatar", file);

await axios.patch("/api/user/avatar", formData, {
  headers: {
    "Authorization": `Bearer ${accessToken}`
    // axios sets Content-Type automatically for FormData — do not override it
  }
});
```

#### What happens to the image server-side

1. File is saved temporarily to the server's local `uploads/avatars/` folder
2. Uploaded to Cloudinary in the `avatars/` folder
3. Transformed: cropped to 400x400, face detection applied to centre the crop
4. Temp file is deleted from the server regardless of whether upload succeeded or failed
5. Cloudinary URL saved to the user's profile record
6. URL returned in the response

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatarUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/avatars/abc123.jpg"
  }
}
```

> Store the `avatarUrl` and use it directly in `<img src="...">`. The URL is permanent and publicly accessible.

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `400` | `No file uploaded` | No file attached to the request |
| `400` | `Avatar must be a JPEG, PNG, or WebP image` | Wrong file type (e.g. PDF, MP4, GIF) |
| `400` | `File too large. Maximum size is 5MB.` | File exceeds 5MB limit |
| `401` | `No token provided` | Authorization header missing |
| `500` | `Avatar upload failed: ...` | Cloudinary error — check credentials/network |

---

### 4. Delete Account

**`DELETE /api/user/profile`**

Soft-deletes the authenticated user's account. The account is marked as deleted and the user can no longer log in. This action cannot be undone from the frontend.

#### Headers

```
Authorization: Bearer <accessToken>
```

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

#### What to do after a successful delete

```
1. Clear the accessToken and refreshToken from storage
2. Call POST /api/auth/logout to invalidate the refresh token in Redis
3. Redirect the user to the home or login page
4. Do not allow further API calls with the old token
```

> Note: The access token technically remains valid until it naturally expires (it is JWT-based). Call logout immediately after deletion to clean up the Redis session.

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `401` | `No token provided` | Authorization header missing |
| `401` | `Access token expired` | Token has expired |
| `404` | `User not found` | User ID from token not found in DB |

---

## Field Reference

### Fields returned in profile responses

| Field | Type | Description |
|---|---|---|
| `id` | number | Unique user ID |
| `name` | string | Display name |
| `email` | string | Login email |
| `role` | string | `"user"`, `"staff"`, or `"admin"` |
| `isVerified` | boolean | Whether the email has been OTP-verified |
| `isDeleted` | boolean | Whether the account has been soft-deleted |
| `deletedAt` | string / null | Timestamp of deletion, or null |
| `createdAt` | string | Account creation timestamp |
| `updatedAt` | string | Last update timestamp |
| `loginAttempts` | number | Current failed login attempt count |
| `lockUntil` | string / null | Account lock expiry timestamp, or null |

### Fields never returned

| Field | Reason |
|---|---|
| `password` | Hashed — never exposed via API |
| `otp` | Sensitive — stripped from all responses |
| `otpExpiry` | Sensitive — stripped from all responses |

### Fields on the profiles table (not in get profile response yet)

These fields are stored in a separate `profiles` table linked to the user. They can be updated via `PATCH /profile` but are not yet returned in `GET /profile`. If you need them displayed, request the backend to join the profiles table in `getProfile`.

| Field | Description |
|---|---|
| `phone` | Phone number |
| `bio` | Short user bio (max 500 chars) |
| `country` | Country of residence |
| `avatarUrl` | Cloudinary URL of profile picture |

---

## Avatar Upload Guide

A quick visual summary of the avatar upload flow:

```
Frontend selects file
        ↓
FormData with key "avatar"
        ↓
PATCH /api/user/avatar + Authorization header
        ↓
avatarMulter validates: JPEG/PNG/WebP only, max 5MB
        ↓
File saved temporarily to server disk
        ↓
Cloudinary upload: cropped 400x400, face-centred
        ↓
Temp file deleted from server
        ↓
avatarUrl saved to profiles table
        ↓
{ avatarUrl: "https://res.cloudinary.com/..." } returned
        ↓
Frontend stores URL and displays in <img>
```

---

## Account Deletion Behaviour

Deletion on this API is a **soft delete** — the record is kept in the database but flagged as inactive. Here is what changes when an account is deleted:

| Property | Before deletion | After deletion |
|---|---|---|
| `isDeleted` | `false` | `true` |
| `deletedAt` | `null` | timestamp of deletion |
| Can log in | Yes | No |
| Existing tokens | Valid until expiry | Should be cleared immediately |
| Data | Intact | Intact — not removed |

The frontend should treat a deleted account the same as a logged-out user — clear all tokens, end the session, and redirect to the login page.

**for deletion flow see** [deletionLifeCycle](./docs/deletionLifecycle.md)