# Account Lifecycle

This document covers account deletion and recovery behaviour in the Hotel Management API. Since it touches both the **auth** flow (login blocking, recovery endpoints) and the **user profile** flow (the delete action itself), it lives as its own reference file.

---

## Overview

Accounts are **soft-deleted** — no data is removed from the database when a user deletes their account. Instead, two fields are set on the user record:

```
isDeleted: true
deletedAt: <timestamp>
```

After deletion, a **90-day grace period** begins. During this window, the user can recover their account. After 90 days, login is permanently blocked (data is retained for admin review but the account cannot be recovered).

---

## Backend — What Was Fixed / Added

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `DELETE` | `/api/users/account` | Soft-deletes the authenticated user's account |
| `POST` | `/api/auth/recover/initiate` | Sends a recovery OTP to the deleted account's email |
| `POST` | `/api/auth/recover/verify` | Verifies OTP and reactivates the account, returns tokens |

### Login Behaviour After Deletion

| Scenario | Response |
|----------|----------|
| Deleted, within 90 days | `423 Locked` with `{ recoverable: true, email }` in `details` |
| Deleted, past 90 days | `401 Unauthorized` — permanently blocked |
| Active account | Normal login flow |

---

## Full Flow Diagrams

### Deletion Flow

```
User calls DELETE /api/users/account
        │
        ▼
isDeleted = true, deletedAt = now()
        │
        ▼
Tokens still valid until expiry*
        │
        ▼
Next login attempt → 423 response

* For immediate invalidation, log the user out before or alongside deletion.
```

### Recovery Flow (Within 90 Days)

```
User attempts login
        │
        ▼
API returns 423 { recoverable: true, email }
        │
        ▼
Frontend shows recovery prompt
        │
        ▼
User confirms → POST /api/auth/recover/initiate { email }
        │
        ▼
OTP sent to email
        │
        ▼
User enters OTP → POST /api/auth/recover/verify { email, otp }
        │
        ▼
Account reactivated (isDeleted: false, deletedAt: null)
        │
        ▼
Tokens returned → user is logged in
```

### Expired Grace Period

```
User attempts login (> 90 days after deletion)
        │
        ▼
API returns 401 "This account has been permanently deactivated."
        │
        ▼
No recovery possible — data retained for admin review only
```

---

## Frontend Integration Guide

### Step 1 — Trigger Deletion

Call the delete endpoint while the user is authenticated.

```js
// DELETE /api/users/account
const res = await fetch('/api/users/account', {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${accessToken}` }
});

if (res.ok) {
  clearTokens();         // remove access + refresh tokens from storage
  redirectToLogin();     // send user to login screen
}
```

---

### Step 2 — Detect a Deleted Account on Login

The login endpoint returns **HTTP 423** specifically for recoverable deleted accounts. Check for this status before handling it as a generic error.

```js
// POST /api/auth/login
const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

if (res.status === 423) {
  const data = await res.json();

  if (data.details?.recoverable) {
    // Store the email temporarily — needed for the recovery steps
    sessionStorage.setItem('recovery_email', data.details.email);

    // Show the recovery prompt UI (see Step 3)
    showRecoveryPrompt();
    return;
  }
}

if (!res.ok) {
  // Handle all other errors normally
  const data = await res.json();
  showError(data.message);
  return;
}

// Normal login success
const data = await res.json();
saveTokens(data.data.accessToken, data.data.refreshToken);
redirectToDashboard();
```

---

### Step 3 — Show Recovery Prompt and Request OTP

When the recovery prompt is shown, ask the user if they want to recover their account. On confirmation, call the initiate endpoint.

```js
async function handleRecoveryConfirm() {
  const email = sessionStorage.getItem('recovery_email');

  // POST /api/auth/recover/initiate
  const res = await fetch('/api/auth/recover/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (res.ok) {
    // OTP sent — show the OTP input screen
    showOtpInput();
  } else {
    const data = await res.json();

    if (res.status === 403) {
      // Grace period has expired
      showError('Your account can no longer be recovered. Please contact support.');
    } else {
      showError(data.message);
    }
  }
}
```

---

### Step 4 — Verify OTP and Reactivate

```js
async function handleRecoveryOtpSubmit(otp) {
  const email = sessionStorage.getItem('recovery_email');

  // POST /api/auth/recover/verify
  const res = await fetch('/api/auth/recover/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });

  const data = await res.json();

  if (res.ok) {
    // Account reactivated — tokens returned, user is logged in
    sessionStorage.removeItem('recovery_email');
    saveTokens(data.data.accessToken, data.data.refreshToken);
    redirectToDashboard();
  } else {
    // 400 = wrong OTP, 400 = expired OTP — show appropriate message
    showError(data.message);
  }
}
```

---

### Recovery UI Checklist

When building the recovery screens, make sure to handle these states:

- **Recovery prompt** — "Your account was deleted. You have until [date] to recover it. Would you like to recover your account?" with Confirm and Cancel buttons.
- **OTP input** — Standard OTP entry screen, same as email verification. Include a resend option.
- **OTP errors** — Show inline errors for wrong or expired OTPs without clearing the input.
- **Grace period expired** — Show a final message that recovery is no longer possible. Do not show the recovery prompt at all in this case (the `423` won't come back; it will be a `401`).
- **Cancel** — If the user cancels recovery, clear `recovery_email` from session storage and return to the login screen.

---

## HTTP Status Code Reference

| Status | Meaning | Frontend Action |
|--------|---------|----------------|
| `200` | Success | Proceed normally |
| `400` | Bad request / wrong or expired OTP | Show inline error |
| `401` | Unauthorised / permanently blocked | Show error, no recovery |
| `403` | Grace period expired | Show "cannot recover" message |
| `423` | Account deleted but recoverable | Show recovery prompt |

---

## Notes for Developers

- **OAuth accounts** — If a user who deleted their account logs back in via Google OAuth within the grace period, their account is auto-reactivated silently (Google has already verified their identity, so OTP is redundant).
- **Data retention** — After 90 days, `isDeleted` remains `true` and `deletedAt` is preserved. The record is never hard-deleted automatically. Permanent purging is an admin operation.
- **Grace period constant** — The 90-day window is controlled by `GRACE_PERIOD_DAYS` in `auth.service.js`. Adjust there if requirements change.
