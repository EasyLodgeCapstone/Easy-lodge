# Easy-Lodge: Authentication API

Base URL: `/api/auth`

This document covers all authentication endpoints for the Easy-Lodge API, including email/password registration, OTP verification, password reset, token management, and Google OAuth. Please Read the ***[Google OAuth section](#google-oauth)*** carefully before implementing the login flow on the frontend.

---

## Table of Contents

- [Overview](#overview)
- [Response Format](#response-format)
- [Error Format](#error-format)
- [Endpoints](#endpoints)
  - [Register](#1-register)
  - [Verify OTP](#2-verify-otp)
  - [Resend OTP](#3-resend-otp)
  - [Login](#4-login)
  - [Forgot Password](#5-forgot-password)
  - [Reset Password](#6-reset-password)
  - [Refresh Token](#7-refresh-token)
  - [Logout](#8-logout)
  - [Google OAuth](#9-google-oauth)
- [Token Usage Guide](#token-usage-guide)
- [Account Lockout Behaviour](#account-lockout-behaviour)

---

## Overview

The authentication system uses **JWT access tokens** and **JWT refresh tokens**.

| Token | Lifespan | Where to send |
|---|---|---|
| `accessToken` | Short-lived (e.g. 15 minutes) | `Authorization: Bearer <token>` header on every protected request |
| `refreshToken` | Long-lived (e.g. 7 days) | `Authorization: Bearer <token>` header on `POST /refresh-token` only |

> **Important:** Never store tokens in `localStorage`. Use `httpOnly` cookies or secure in-memory state. Do not expose the refresh token to JavaScript if avoidable.

---

## Response Format

All successful responses follow this shape:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": { }
}
```

---

## Error Format

All error responses follow this shape:

```json
{
  "success": false,
  "message": "Human readable error message"
}
```

Some errors include an additional `data` field with extra context (e.g. login attempt counts):

```json
{
  "success": false,
  "message": "Invalid user credentials, multiple tries will trigger account lockout.",
  "data": {
    "loginAttempts": 3,
    "attemptsRemaining": 2
  }
}
```

---

## Endpoints

### 1. Register

**`POST /api/auth/register`**

Creates a new user account and sends a 6-digit OTP to the provided email for verification. The account cannot be used to log in until the OTP is verified.

#### Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | true | Minimum 3 characters |
| `email` | string | true | Must be a valid email address |
| `password` | string | true | Minimum 6 characters |

#### Success Response — `201 Created`

```json
{
  "success": true,
  "message": "User created successfully. Please verify your email.",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "isVerified": false,
    "role": "user",
    "createdAt": "2026-03-18T10:00:00.000Z"
  }
}
```

> `password`, `otp`, and `otpExpiry` are never returned in any response.

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `400` | `Identity conflict: Email already exists` | Email is already registered |
| `400` | Validation error with `errors` array | Missing or invalid fields |

---

### 2. Verify OTP

**`POST /api/auth/verify-otp`**

Verifies the user's email using the 6-digit OTP sent during registration or resent via `/resend-otp`. OTPs expire after **10 minutes**.

#### Request Body

```json
{
  "email": "john@example.com",
  "otp": "483920"
}
```

| Field | Type | Required |
|---|---|---|
| `email` | string | true |
| `otp` | string | true |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Account verified successfully. You can now log in."
}
```

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `400` | `Account already verified` | OTP was already used |
| `400` | `OTP expired or not found, please request a new one` | OTP was never generated or already cleared |
| `400` | `OTP expired, request a new one` | 10 minutes have passed |
| `400` | `Invalid OTP` | Wrong code entered |
| `404` | `User not found` | Email not registered |

---

### 3. Resend OTP

**`POST /api/auth/resend-otp`**

Generates a new OTP and sends it to the user's email. Use this if the original OTP expired or was not received. Each call invalidates the previous OTP.

#### Request Body

```json
{
  "email": "john@example.com"
}
```

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "OTP resent successfully. Please check your email."
}
```

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `404` | `User not found` | Email not registered |

---

### 4. Login

**`POST /api/auth/login`**

Authenticates a user and returns an access token and refresh token. The account must be verified before login is allowed.

> **Note:** This endpoint is for email/password accounts only. Google OAuth accounts must use the [Google OAuth flow](#9-google-oauth). Attempting to log in with email/password on a Google account returns a `400` error.

#### Request Body

```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isVerified": true,
      "createdAt": "2026-03-18T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> Store the `refreshToken` securely. It is needed to obtain new access tokens when the current one expires.

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `400` | `This account was created with Google. Please sign in with Google.` | OAuth account attempting email/password login |
| `401` | `Invalid user credentials...` | Wrong password — includes `loginAttempts` and `attemptsRemaining` in `data` |
| `403` | `Account not verified. Please verify your account to log in.` | OTP not yet verified |
| `403` | `Account temporarily locked...` | 5 failed attempts — includes `lockUntil` and `secondsRemaining` in `data` |
| `404` | `User does not exist` | Email not registered |

---

### 5. Forgot Password

**`POST /api/auth/forgot-password`**

Sends a password reset OTP to the user's email. OTP expires after **10 minutes**.

#### Request Body

```json
{
  "email": "john@example.com"
}
```

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "OTP sent to email if it exists"
}
```

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `404` | `User not found` | Email not registered |

---

### 6. Reset Password

**`POST /api/auth/reset-password`**

Resets the user's password using the OTP received via email.

#### Request Body

```json
{
  "email": "john@example.com",
  "otp": "738291",
  "newPassword": "mynewpassword"
}
```

| Field | Type | Required |
|---|---|---|
| `email` | string | true |
| `otp` | string | true |
| `newPassword` | string | true |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `400` | `Invalid OTP` | Wrong or already used OTP |
| `400` | `OTP expired` | 10 minutes have passed |
| `404` | `User not found` | Email not registered |

---

### 7. Refresh Token

**`POST /api/auth/refresh-token`**

Issues a new access token using a valid refresh token. Use this when the access token has expired rather than asking the user to log in again.

#### Headers

```
Authorization: Bearer <refreshToken>
```

> **Important:** Send the **refresh token** here, not the access token. This is the only endpoint that accepts the refresh token.

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> Replace your stored `accessToken` with the new `token` value returned here.

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `401` | `No refresh token provided` | Authorization header missing |
| `401` | `Refresh token expired. Please log in again.` | Refresh token has expired |
| `401` | `Invalid refresh token` | Token is malformed or tampered |
| `401` | `Invalid or expired refresh session, please log in again` | Token not found in Redis (user logged out or session cleared) |

---

### 8. Logout

**`POST /api/auth/logout`**

Invalidates the user's refresh token. After logout, the refresh token can no longer be used to generate new access tokens.

#### Headers

```
Authorization: Bearer <accessToken>
```

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `401` | `No token provided` | Authorization header missing |
| `401` | `Access token expired` | Token has expired — use refresh token first |
| `401` | `Invalid token` | Token is malformed or tampered |

---

### 9. Google OAuth

The Google OAuth flow requires **browser navigation** — it cannot be triggered from Postman or a plain API call. The frontend must redirect the user's browser to the initiation URL.

---

#### Frontend Setup Requirements

> **Read this carefully before implementing OAuth on the frontend.**

**Step 1 — Register the frontend's redirect URI in Google Cloud Console**

contact the backend team and provide redirect url for them to be added 

the backend currently uses:

```
# Development
http://localhost:3330/api/auth/google/callback

# Production (add when deploying)
renderurl/api/auth/google/callback
```

> The callback URL must match **exactly** — no trailing slash, correct port, correct path. A single character difference will cause a `redirect_uri_mismatch` error and the flow will fail.

**Step 2 — Also provide frontend origin url to the backend**

```
# Development
http://localhost:3330

# Production
https://yourdomain.com
```

**Step 3 — Redirect the user's browser to the initiation URL**

```
http://localhost:3330/api/auth/google
```

Do **not** make this an API call with `fetch` or `axios`. It must be a full browser redirect:

that is to say the url most be tested on a browser as a website
```js
// Correct — full browser redirect
window.location.href = "http://localhost:3330/api/auth/google";

// Wrong — will fail due to CORS and OAuth redirect requirements
fetch("http://localhost:3330/api/auth/google");
```

---

#### Flow Summary

```
1. Frontend redirects browser to GET /api/auth/google
2. Passport redirects to Google consent screen
3. User logs in and approves on Google
4. Google redirects browser to GET /api/auth/google/callback
5. Server processes the callback and returns JSON response
```

---

#### Initiation

**`GET /api/auth/google`**

No request body or headers needed. Just redirect the browser here.

---

#### Callback

**`GET /api/auth/google/callback`**

Handled automatically by the server. Google redirects here after the user approves. The frontend does not call this directly.

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 2,
      "name": "John Doe",
      "email": "john@gmail.com",
      "role": "user",
      "isVerified": true,
      "createdAt": "2026-03-18T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> Google OAuth login returns only an `accessToken` — no `refreshToken`. If the access token expires, the user will need to go through the Google flow again.

> **Account merging:** If a user previously registered with email/password using the same Google email, their accounts are automatically merged. They can log in with either method going forward.

#### Error Responses

| Status | Message | Cause |
|---|---|---|
| `401` | `Authentication failed` | Google did not return a valid user profile |
| `500` | Server error | Callback URL mismatch or Cloudinary/DB issue |

---

## Token Usage Guide

Every protected route requires the access token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Recommended token management flow on the frontend:**

```
1. On login → store accessToken in memory, refreshToken in httpOnly cookie
2. On every API request → send accessToken in Authorization header
3. On 401 response → call POST /refresh-token with refreshToken
4. On successful refresh → replace stored accessToken with new token, retry original request
5. On failed refresh (401) → clear tokens, redirect user to login page
6. On logout → call POST /logout, clear all stored tokens
```

---

## Account Lockout Behaviour

After **5 consecutive failed login attempts**, the account is temporarily locked.

- While locked, login returns `403` with `lockUntil` (timestamp) and `secondsRemaining` in the `data` field
- Use `secondsRemaining` to show a countdown timer to the user
- The lock clears automatically after the lock duration passes
- A successful login resets the attempt counter to 0

```json
{
  "success": false,
  "message": "Account temporarily locked. Try again in 2 minutes.",
  "data": {
    "lockUntil": "2026-03-18T10:12:00.000Z",
    "secondsRemaining": 87
  }
}
```

## Account deletion

**for deletion flow see:** [deletionLifeCycle](./docs/deletionLifecycle.md)