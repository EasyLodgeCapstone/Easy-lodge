# 🔐 Security Policy & Implementation

## Overview
This document outlines the security measures implemented for EasyLodge to ensure guest identity, access, and data are secure and trusted.

## 1. Authentication & Authorization
- **Password Hashing:** All user passwords are hashed using `bcrypt` with salt rounds before storage. Plain text passwords are never stored.
- **Token-Based Auth:** We use **JWT (JSON Web Tokens)** for stateless authentication.
- **Session Management:** Tokens are validated on every protected API request via middleware.
- **Access Control:** Users can only access resources (bookings, profiles) that belong to their specific User ID.

## 2. Data Protection
- **Environment Variables:** All sensitive credentials (Database URLs, JWT Secrets, API Keys) are stored in `.env` files and are **never** committed to version control.
- **Encryption:** Sensitive guest identity data is encrypted at rest (if implemented).
- **Input Validation:** All user inputs are sanitized to prevent NoSQL/SQL Injection attacks.

## 3. Vulnerability Management
- **Dependency Auditing:** We regularly run `npm audit` to check for known vulnerabilities in third-party packages.
- **Security Headers:** We implement security headers (e.g., via `helmet`) to protect against common web vulnerabilities like XSS and Clickjacking.
- **Error Handling:** Generic error messages are returned to the client to prevent information leakage (e.g., "Invalid Credentials" instead of "User not found").

## 4. Access Control Policies
| Role | Permissions |
| :--- | :--- |
| **Guest** | View rooms, Book rooms, Access *own* bookings only |
| **Admin** | Manage rooms, View all bookings, Manage users |
| **Public** | View landing page only |

## 5. Testing & Verification
- [x] Password hashing verified.
- [x] JWT Authentication tested.
- [x] Protected routes tested (unauthorized access returns 403).
- [x] `npm audit` run with no critical vulnerabilities.
- [ ] IDOR Testing (Ensure users cannot access other users' bookings by changing IDs).

## 6. Known Limitations (Hackathon Scope)
*As this is a hackathon prototype, the following are planned for production:*
- Full end-to-end encryption for all guest PII (Passport/ID numbers).
- Rate limiting on API endpoints to prevent DDoS.
- Multi-Factor Authentication (MFA).

## 7. Reporting Security Issues
If you discover a security vulnerability, please contact the team at: boyiiemmanuel@gmail.com
