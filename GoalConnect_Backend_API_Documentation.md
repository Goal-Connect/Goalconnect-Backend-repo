# GoalConnect — Backend API Documentation

> **Version:** 1.0.0
> **Base URL:** `http://localhost:5000/api`
> **Author:** Backend Team
> **Date:** March 13, 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [API Conventions](#3-api-conventions)
4. [Controllers & Route Map](#4-controllers--route-map)
5. [Endpoints](#5-endpoints)
   - 5.1 [Auth Controller](#51-auth-controller)
   - 5.2 [User Controller (Admin)](#52-user-controller-admin)
   - 5.3 [Academy Controller](#53-academy-controller)
   - 5.4 [Player Controller](#54-player-controller)
   - 5.5 [Video Controller](#55-video-controller)
   - 5.6 [Match Controller](#56-match-controller)
   - 5.7 [Message Controller](#57-message-controller)
   - 5.8 [Notification Controller](#58-notification-controller)
6. [Error Handling](#6-error-handling)
7. [Database Schema Reference](#7-database-schema-reference)

---

## 1. Overview

**GoalConnect** is a sports academy management and scouting platform that connects football academies, players, and scouts. The backend exposes a RESTful API that supports:

- User registration & authentication (JWT-based)
- Academy registration with document upload & admin approval workflow
- Player profile & stats management
- Match scheduling, scoring, and verification
- Video highlight uploads for players
- Real-time messaging between users
- Notification system

### Roles

| Role | Description |
|------|-------------|
| `admin` | Platform administrator — manages users, approves academies, verifies matches |
| `academy` | Academy owner/manager — manages players, matches, videos |
| `scout` | Talent scout — browses players, watches videos, sends messages |

---

## 2. Authentication & Authorization

All protected routes require a **JWT Bearer Token** in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Token Payload

```json
{
  "id": "user_id",
  "email": "user@example.com",
  "role": "academy",
  "iat": 1710000000,
  "exp": 1710086400
}
```

### Role-Based Access

- 🔓 **Public** — No authentication required
- 🔒 **Authenticated** — Any logged-in user
- 🛡️ **Admin** — Admin role only
- 🏟️ **Academy** — Academy role only
- 🔍 **Scout** — Scout role only

---

## 3. API Conventions

### Request Format

- Content-Type: `application/json` (unless file upload, then `multipart/form-data`)
- All dates in ISO 8601 format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ`

### Response Format

All responses follow this structure:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

### Pagination (for list endpoints)

Query Parameters:
- `page` (default: 1)
- `limit` (default: 10)
- `sort` (e.g., `createdAt:desc`)

Paginated Response:
```json
{
  "success": true,
  "message": "Records fetched successfully",
  "data": [ ... ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 48,
    "limit": 10
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK — Successful GET/PUT |
| `201` | Created — Successful POST |
| `204` | No Content — Successful DELETE |
| `400` | Bad Request — Validation error |
| `401` | Unauthorized — Missing/invalid token |
| `403` | Forbidden — Insufficient permissions |
| `404` | Not Found — Resource doesn't exist |
| `409` | Conflict — Duplicate resource |
| `500` | Internal Server Error |

---

## 4. Controllers & Route Map

| # | Controller | Base Route | Endpoints |
|---|-----------|------------|-----------|
| 1 | **AuthController** | `/api/auth` | 7 |
| 2 | **UserController** | `/api/admin/users` | 5 |
| 3 | **AcademyController** | `/api/academies` | 10 |
| 4 | **PlayerController** | `/api/players` | 9 |
| 5 | **VideoController** | `/api/videos` | 6 |
| 6 | **MatchController** | `/api/matches` | 9 |
| 7 | **MessageController** | `/api/messages` | 5 |
| 8 | **NotificationController** | `/api/notifications` | 5 |
| | | **TOTAL** | **56 Endpoints** |

---

## 5. Endpoints

---

### 5.1 Auth Controller

**Base Route:** `/api/auth`

---

#### 5.1.1 Register User

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/auth/register` |
| **Access** | 🔓 Public |
| **Description** | Register a new user account (academy owner or scout) |

**Request Body:**
```json
{
  "email": "academy@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "academy"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `email` | Required, valid email, unique |
| `password` | Required, min 8 chars, 1 uppercase, 1 number, 1 special char |
| `confirmPassword` | Required, must match `password` |
| `role` | Required, enum: `academy`, `scout` |

**Success Response: `201 Created`**
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "academy@example.com",
      "role": "academy",
      "status": "active",
      "createdAt": "2026-03-13T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response: `409 Conflict`**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

---

#### 5.1.2 Login

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/auth/login` |
| **Access** | 🔓 Public |
| **Description** | Authenticate user and receive JWT token |

**Request Body:**
```json
{
  "email": "academy@example.com",
  "password": "SecurePass123!"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `email` | Required, valid email |
| `password` | Required |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "academy@example.com",
      "role": "academy",
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

**Error Response: `401 Unauthorized`**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

#### 5.1.3 Logout

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/auth/logout` |
| **Access** | 🔒 Authenticated |
| **Description** | Invalidate current JWT token |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** None

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### 5.1.4 Get Current User Profile

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/auth/me` |
| **Access** | 🔒 Authenticated |
| **Description** | Get the currently authenticated user's profile |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "academy@example.com",
    "role": "academy",
    "status": "active",
    "createdAt": "2026-03-13T10:30:00Z",
    "updatedAt": "2026-03-13T10:30:00Z"
  }
}
```

---

#### 5.1.5 Update Profile

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/auth/me` |
| **Access** | 🔒 Authenticated |
| **Description** | Update current user's profile information |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "email": "newemail@example.com"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `email` | Optional, valid email, unique |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "newemail@example.com",
    "role": "academy",
    "status": "active",
    "updatedAt": "2026-03-13T12:00:00Z"
  }
}
```

---

#### 5.1.6 Change Password

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/auth/change-password` |
| **Access** | 🔒 Authenticated |
| **Description** | Change the current user's password |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!",
  "confirmNewPassword": "NewSecurePass456!"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `currentPassword` | Required |
| `newPassword` | Required, min 8 chars, 1 uppercase, 1 number, 1 special char |
| `confirmNewPassword` | Required, must match `newPassword` |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Response: `400 Bad Request`**
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

---

#### 5.1.7 Forgot Password

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/auth/forgot-password` |
| **Access** | 🔓 Public |
| **Description** | Request a password reset email |

**Request Body:**
```json
{
  "email": "academy@example.com"
}
```

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

---

#### 5.1.8 Reset Password

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/auth/reset-password/:token` |
| **Access** | 🔓 Public |
| **Description** | Reset password using the token received via email |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `token` | Password reset token from email |

**Request Body:**
```json
{
  "newPassword": "NewSecurePass456!",
  "confirmNewPassword": "NewSecurePass456!"
}
```

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Password reset successful. Please login with your new password."
}
```

**Error Response: `400 Bad Request`**
```json
{
  "success": false,
  "message": "Invalid or expired reset token"
}
```

---

### 5.2 User Controller (Admin)

**Base Route:** `/api/admin/users`

---

#### 5.2.1 Get All Users

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/admin/users` |
| **Access** | 🛡️ Admin |
| **Description** | Get a paginated list of all users with optional filters |

**Request Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 10 | Records per page |
| `role` | String | — | Filter by role: `academy`, `scout`, `admin` |
| `status` | String | — | Filter by status: `active`, `inactive`, `suspended` |
| `search` | String | — | Search by email |
| `sort` | String | `createdAt:desc` | Sort field and order |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "academy@example.com",
      "role": "academy",
      "status": "active",
      "createdAt": "2026-03-13T10:30:00Z"
    },
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "email": "scout@example.com",
      "role": "scout",
      "status": "active",
      "createdAt": "2026-03-12T08:15:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 48,
    "limit": 10
  }
}
```

---

#### 5.2.2 Get User by ID

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/admin/users/:id` |
| **Access** | 🛡️ Admin |
| **Description** | Get detailed information about a specific user |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | User ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "academy@example.com",
    "role": "academy",
    "status": "active",
    "createdAt": "2026-03-13T10:30:00Z",
    "updatedAt": "2026-03-13T10:30:00Z",
    "academy": {
      "id": "64f1a2b3c4d5e6f7a8b9c0e1",
      "academyName": "Rising Stars Academy",
      "location": "Lagos, Nigeria",
      "approvalStatus": "approved"
    }
  }
}
```

**Error Response: `404 Not Found`**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

#### 5.2.3 Update User Status

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/admin/users/:id/status` |
| **Access** | 🛡️ Admin |
| **Description** | Activate, deactivate, or suspend a user account |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | User ID |

**Request Body:**
```json
{
  "status": "suspended"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `status` | Required, enum: `active`, `inactive`, `suspended` |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "User status updated successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "academy@example.com",
    "status": "suspended",
    "updatedAt": "2026-03-13T14:00:00Z"
  }
}
```

---

#### 5.2.4 Delete User

| | |
|---|---|
| **Method** | `DELETE` |
| **URL** | `/api/admin/users/:id` |
| **Access** | 🛡️ Admin |
| **Description** | Permanently delete a user and all associated data |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | User ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Response: `404 Not Found`**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

#### 5.2.5 Get Dashboard Stats

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/admin/dashboard` |
| **Access** | 🛡️ Admin |
| **Description** | Get overview statistics for the admin dashboard |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Dashboard stats fetched successfully",
  "data": {
    "totalUsers": 156,
    "totalAcademies": 42,
    "totalPlayers": 387,
    "totalMatches": 95,
    "totalVideos": 214,
    "pendingAcademyApprovals": 8,
    "pendingMatchVerifications": 3,
    "usersByRole": {
      "academy": 42,
      "scout": 113,
      "admin": 1
    },
    "recentRegistrations": [
      {
        "id": "64f1a2b3c4d5e6f7a8b9c0d9",
        "email": "newuser@example.com",
        "role": "scout",
        "createdAt": "2026-03-13T09:00:00Z"
      }
    ]
  }
}
```

---

### 5.3 Academy Controller

**Base Route:** `/api/academies`

---

#### 5.3.1 Create/Register Academy

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/academies` |
| **Access** | 🏟️ Academy |
| **Description** | Register a new academy profile (one per user) |

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `academyName` | String | Yes | Name of the academy |
| `location` | String | Yes | City/Region of the academy |
| `description` | String | No | About the academy |
| `founded` | String | No | Year founded (e.g., "2015") |
| `contactPhone` | String | No | Contact phone number |
| `website` | String | No | Academy website URL |
| `documents` | File[] | Yes | Verification documents (PDF/images, max 5 files, 5MB each) |

**Success Response: `201 Created`**
```json
{
  "success": true,
  "message": "Academy registered successfully. Pending admin approval.",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0e1",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "academyName": "Rising Stars Academy",
    "location": "Lagos, Nigeria",
    "description": "Premier youth football development academy",
    "founded": "2015",
    "contactPhone": "+234-800-123-4567",
    "website": "https://risingstars.com",
    "documents": [
      {
        "id": "doc_001",
        "fileName": "registration_cert.pdf",
        "url": "/uploads/documents/registration_cert.pdf",
        "uploadedAt": "2026-03-13T10:30:00Z"
      }
    ],
    "approvalStatus": "pending",
    "createdAt": "2026-03-13T10:30:00Z"
  }
}
```

**Error Response: `409 Conflict`**
```json
{
  "success": false,
  "message": "You already have a registered academy"
}
```

---

#### 5.3.2 Get All Academies

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/academies` |
| **Access** | 🔒 Authenticated |
| **Description** | List all approved academies (scouts browse, academies find opponents) |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 10 | Records per page |
| `search` | String | — | Search by academy name |
| `location` | String | — | Filter by location |
| `sort` | String | `academyName:asc` | Sort field and order |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Academies fetched successfully",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0e1",
      "academyName": "Rising Stars Academy",
      "location": "Lagos, Nigeria",
      "description": "Premier youth football development academy",
      "founded": "2015",
      "playerCount": 24,
      "approvalStatus": "approved",
      "createdAt": "2026-03-13T10:30:00Z"
    },
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0e2",
      "academyName": "Golden Boot FC",
      "location": "Accra, Ghana",
      "description": "Developing world-class football talent",
      "founded": "2018",
      "playerCount": 18,
      "approvalStatus": "approved",
      "createdAt": "2026-03-10T08:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalRecords": 28,
    "limit": 10
  }
}
```

---

#### 5.3.3 Get Academy by ID

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/academies/:id` |
| **Access** | 🔒 Authenticated |
| **Description** | Get detailed information about a specific academy |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Academy ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Academy fetched successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0e1",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "academyName": "Rising Stars Academy",
    "location": "Lagos, Nigeria",
    "description": "Premier youth football development academy",
    "founded": "2015",
    "contactPhone": "+234-800-123-4567",
    "website": "https://risingstars.com",
    "documents": [
      {
        "id": "doc_001",
        "fileName": "registration_cert.pdf",
        "url": "/uploads/documents/registration_cert.pdf"
      }
    ],
    "approvalStatus": "approved",
    "playerCount": 24,
    "matchCount": 12,
    "createdAt": "2026-03-13T10:30:00Z",
    "updatedAt": "2026-03-13T10:30:00Z"
  }
}
```

**Error Response: `404 Not Found`**
```json
{
  "success": false,
  "message": "Academy not found"
}
```

---

#### 5.3.4 Get My Academy

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/academies/me` |
| **Access** | 🏟️ Academy |
| **Description** | Get the current logged-in user's academy profile |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Academy fetched successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0e1",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "academyName": "Rising Stars Academy",
    "location": "Lagos, Nigeria",
    "description": "Premier youth football development academy",
    "founded": "2015",
    "contactPhone": "+234-800-123-4567",
    "website": "https://risingstars.com",
    "approvalStatus": "approved",
    "playerCount": 24,
    "createdAt": "2026-03-13T10:30:00Z"
  }
}
```

---

#### 5.3.5 Update Academy

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/academies/:id` |
| **Access** | 🏟️ Academy (own academy only) |
| **Description** | Update academy profile information |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Academy ID |

**Request Body:**
```json
{
  "academyName": "Rising Stars FC Academy",
  "location": "Lagos, Nigeria",
  "description": "Updated description for the academy",
  "contactPhone": "+234-800-999-8888",
  "website": "https://risingstarsfc.com"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `academyName` | Optional, min 3 chars, max 100 chars |
| `location` | Optional, min 2 chars |
| `description` | Optional, max 500 chars |
| `contactPhone` | Optional, valid phone format |
| `website` | Optional, valid URL |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Academy updated successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0e1",
    "academyName": "Rising Stars FC Academy",
    "location": "Lagos, Nigeria",
    "description": "Updated description for the academy",
    "contactPhone": "+234-800-999-8888",
    "website": "https://risingstarsfc.com",
    "updatedAt": "2026-03-13T15:00:00Z"
  }
}
```

**Error Response: `403 Forbidden`**
```json
{
  "success": false,
  "message": "You can only update your own academy"
}
```

---

#### 5.3.6 Delete Academy

| | |
|---|---|
| **Method** | `DELETE` |
| **URL** | `/api/academies/:id` |
| **Access** | 🏟️ Academy (own) / 🛡️ Admin |
| **Description** | Delete an academy and all associated players, videos, and matches |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Academy ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Academy and all associated data deleted successfully"
}
```

---

#### 5.3.7 Upload Academy Documents

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/academies/:id/documents` |
| **Access** | 🏟️ Academy (own academy only) |
| **Description** | Upload additional verification documents for the academy |

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `documents` | File[] | Yes | Documents (PDF/images, max 5 files, 5MB each) |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Documents uploaded successfully",
  "data": {
    "documents": [
      {
        "id": "doc_002",
        "fileName": "license.pdf",
        "url": "/uploads/documents/license.pdf",
        "uploadedAt": "2026-03-13T11:00:00Z"
      },
      {
        "id": "doc_003",
        "fileName": "tax_certificate.pdf",
        "url": "/uploads/documents/tax_certificate.pdf",
        "uploadedAt": "2026-03-13T11:00:00Z"
      }
    ]
  }
}
```

---

#### 5.3.8 Get Pending Academies (Admin)

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/admin/academies/pending` |
| **Access** | 🛡️ Admin |
| **Description** | Get all academies pending approval |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 10 | Records per page |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Pending academies fetched successfully",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0e5",
      "userId": "64f1a2b3c4d5e6f7a8b9c0d5",
      "academyName": "Thunder FC Academy",
      "location": "Nairobi, Kenya",
      "documents": [
        {
          "id": "doc_010",
          "fileName": "cert.pdf",
          "url": "/uploads/documents/cert.pdf"
        }
      ],
      "approvalStatus": "pending",
      "createdAt": "2026-03-12T06:00:00Z",
      "user": {
        "email": "thunder@example.com"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalRecords": 8,
    "limit": 10
  }
}
```

---

#### 5.3.9 Approve/Reject Academy (Admin)

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/admin/academies/:id/approval` |
| **Access** | 🛡️ Admin |
| **Description** | Approve or reject an academy registration |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Academy ID |

**Request Body:**
```json
{
  "approvalStatus": "approved",
  "remarks": "All documents verified. Academy approved."
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `approvalStatus` | Required, enum: `approved`, `rejected` |
| `remarks` | Optional, reason for approval/rejection |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Academy approved successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0e5",
    "academyName": "Thunder FC Academy",
    "approvalStatus": "approved",
    "remarks": "All documents verified. Academy approved.",
    "approvedBy": "64f1a2b3c4d5e6f7a8b9c0d0",
    "approvedAt": "2026-03-13T16:00:00Z"
  }
}
```

---

#### 5.3.10 Get Academy Dashboard Stats

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/academies/:id/stats` |
| **Access** | 🏟️ Academy (own) |
| **Description** | Get statistics for the academy dashboard |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Academy stats fetched successfully",
  "data": {
    "totalPlayers": 24,
    "totalMatches": 12,
    "matchesWon": 7,
    "matchesLost": 3,
    "matchesDrawn": 2,
    "totalVideos": 36,
    "pendingMatchVerifications": 2,
    "playersByPosition": {
      "goalkeeper": 3,
      "defender": 7,
      "midfielder": 8,
      "forward": 6
    }
  }
}
```

---

### 5.4 Player Controller

**Base Route:** `/api/players`

---

#### 5.4.1 Add Player to Academy

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/academies/:academyId/players` |
| **Access** | 🏟️ Academy (own academy only) |
| **Description** | Add a new player to the academy roster |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `academyId` | Academy ID |

**Request Body:**
```json
{
  "name": "Kwame Mensah",
  "dob": "2005-06-15",
  "position": "forward",
  "jerseyNumber": 9,
  "height": 178,
  "weight": 72,
  "preferredFoot": "right",
  "nationality": "Ghana",
  "bio": "Prolific young striker with exceptional pace and finishing ability",
  "stats": {
    "goals": 15,
    "assists": 8,
    "appearances": 22,
    "yellowCards": 2,
    "redCards": 0
  }
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `name` | Required, min 2 chars, max 100 chars |
| `dob` | Required, valid date, must be in the past |
| `position` | Required, enum: `goalkeeper`, `defender`, `midfielder`, `forward` |
| `jerseyNumber` | Optional, number 1-99 |
| `height` | Optional, number in cm |
| `weight` | Optional, number in kg |
| `preferredFoot` | Optional, enum: `left`, `right`, `both` |
| `nationality` | Optional, string |
| `bio` | Optional, max 500 chars |
| `stats` | Optional, object with numeric fields |

**Success Response: `201 Created`**
```json
{
  "success": true,
  "message": "Player added successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c1a1",
    "academyId": "64f1a2b3c4d5e6f7a8b9c0e1",
    "name": "Kwame Mensah",
    "dob": "2005-06-15",
    "age": 20,
    "position": "forward",
    "jerseyNumber": 9,
    "height": 178,
    "weight": 72,
    "preferredFoot": "right",
    "nationality": "Ghana",
    "bio": "Prolific young striker with exceptional pace and finishing ability",
    "stats": {
      "goals": 15,
      "assists": 8,
      "appearances": 22,
      "yellowCards": 2,
      "redCards": 0
    },
    "createdAt": "2026-03-13T10:30:00Z"
  }
}
```

---

#### 5.4.2 Get All Players (Browse/Search)

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/players` |
| **Access** | 🔒 Authenticated |
| **Description** | Browse and search all players across all academies (primarily for scouts) |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 10 | Records per page |
| `search` | String | — | Search by player name |
| `position` | String | — | Filter by position |
| `academyId` | String | — | Filter by academy |
| `minAge` | Number | — | Minimum age filter |
| `maxAge` | Number | — | Maximum age filter |
| `nationality` | String | — | Filter by nationality |
| `sort` | String | `name:asc` | Sort field and order |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Players fetched successfully",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c1a1",
      "name": "Kwame Mensah",
      "dob": "2005-06-15",
      "age": 20,
      "position": "forward",
      "nationality": "Ghana",
      "stats": {
        "goals": 15,
        "assists": 8,
        "appearances": 22
      },
      "academy": {
        "id": "64f1a2b3c4d5e6f7a8b9c0e1",
        "academyName": "Rising Stars Academy",
        "location": "Lagos, Nigeria"
      },
      "videoCount": 5
    },
    {
      "id": "64f1a2b3c4d5e6f7a8b9c1a2",
      "name": "Amara Diallo",
      "dob": "2006-02-20",
      "age": 20,
      "position": "midfielder",
      "nationality": "Senegal",
      "stats": {
        "goals": 6,
        "assists": 14,
        "appearances": 25
      },
      "academy": {
        "id": "64f1a2b3c4d5e6f7a8b9c0e2",
        "academyName": "Golden Boot FC",
        "location": "Accra, Ghana"
      },
      "videoCount": 3
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 12,
    "totalRecords": 115,
    "limit": 10
  }
}
```

---

#### 5.4.3 Get Academy Players

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/academies/:academyId/players` |
| **Access** | 🔒 Authenticated |
| **Description** | Get all players belonging to a specific academy |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `academyId` | Academy ID |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 20 | Records per page |
| `position` | String | — | Filter by position |
| `search` | String | — | Search by name |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Players fetched successfully",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c1a1",
      "name": "Kwame Mensah",
      "dob": "2005-06-15",
      "age": 20,
      "position": "forward",
      "jerseyNumber": 9,
      "stats": {
        "goals": 15,
        "assists": 8,
        "appearances": 22
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalRecords": 24,
    "limit": 20
  }
}
```

---

#### 5.4.4 Get Player by ID

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/players/:id` |
| **Access** | 🔒 Authenticated |
| **Description** | Get full details of a specific player including stats and video count |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Player ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Player fetched successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c1a1",
    "academyId": "64f1a2b3c4d5e6f7a8b9c0e1",
    "name": "Kwame Mensah",
    "dob": "2005-06-15",
    "age": 20,
    "position": "forward",
    "jerseyNumber": 9,
    "height": 178,
    "weight": 72,
    "preferredFoot": "right",
    "nationality": "Ghana",
    "bio": "Prolific young striker with exceptional pace and finishing ability",
    "stats": {
      "goals": 15,
      "assists": 8,
      "appearances": 22,
      "yellowCards": 2,
      "redCards": 0
    },
    "academy": {
      "id": "64f1a2b3c4d5e6f7a8b9c0e1",
      "academyName": "Rising Stars Academy",
      "location": "Lagos, Nigeria"
    },
    "videos": [
      {
        "id": "64f1a2b3c4d5e6f7a8b9c2a1",
        "url": "/uploads/videos/highlight_001.mp4",
        "matchId": "64f1a2b3c4d5e6f7a8b9c3a1",
        "status": "approved"
      }
    ],
    "createdAt": "2026-03-13T10:30:00Z",
    "updatedAt": "2026-03-13T10:30:00Z"
  }
}
```

---

#### 5.4.5 Update Player

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/players/:id` |
| **Access** | 🏟️ Academy (own players only) |
| **Description** | Update player profile information |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Player ID |

**Request Body:**
```json
{
  "name": "Kwame A. Mensah",
  "position": "forward",
  "jerseyNumber": 11,
  "height": 180,
  "weight": 74,
  "bio": "Updated bio for the player"
}
```

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Player updated successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c1a1",
    "name": "Kwame A. Mensah",
    "position": "forward",
    "jerseyNumber": 11,
    "height": 180,
    "weight": 74,
    "bio": "Updated bio for the player",
    "updatedAt": "2026-03-13T16:00:00Z"
  }
}
```

**Error Response: `403 Forbidden`**
```json
{
  "success": false,
  "message": "You can only update players in your own academy"
}
```

---

#### 5.4.6 Update Player Stats

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/players/:id/stats` |
| **Access** | 🏟️ Academy (own players only) |
| **Description** | Update a player's performance statistics |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Player ID |

**Request Body:**
```json
{
  "goals": 18,
  "assists": 10,
  "appearances": 25,
  "yellowCards": 3,
  "redCards": 0,
  "cleanSheets": null,
  "minutesPlayed": 2100
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `goals` | Optional, non-negative integer |
| `assists` | Optional, non-negative integer |
| `appearances` | Optional, non-negative integer |
| `yellowCards` | Optional, non-negative integer |
| `redCards` | Optional, non-negative integer |
| `cleanSheets` | Optional, non-negative integer (for goalkeepers) |
| `minutesPlayed` | Optional, non-negative integer |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Player stats updated successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c1a1",
    "name": "Kwame Mensah",
    "stats": {
      "goals": 18,
      "assists": 10,
      "appearances": 25,
      "yellowCards": 3,
      "redCards": 0,
      "cleanSheets": null,
      "minutesPlayed": 2100
    },
    "updatedAt": "2026-03-13T17:00:00Z"
  }
}
```

---

#### 5.4.7 Delete Player

| | |
|---|---|
| **Method** | `DELETE` |
| **URL** | `/api/players/:id` |
| **Access** | 🏟️ Academy (own players) / 🛡️ Admin |
| **Description** | Remove a player from the academy (also deletes associated videos) |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Player ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Player and associated videos deleted successfully"
}
```

---

#### 5.4.8 Get Player Match History

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/players/:id/matches` |
| **Access** | 🔒 Authenticated |
| **Description** | Get all matches the player's academy participated in (with player's videos) |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Player ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Player match history fetched successfully",
  "data": [
    {
      "matchId": "64f1a2b3c4d5e6f7a8b9c3a1",
      "opponent": "Golden Boot FC",
      "score": "3-1",
      "date": "2026-03-01T15:00:00Z",
      "videos": [
        {
          "id": "64f1a2b3c4d5e6f7a8b9c2a1",
          "url": "/uploads/videos/highlight_001.mp4",
          "status": "approved"
        }
      ]
    }
  ]
}
```

---

#### 5.4.9 Get Top Players (Leaderboard)

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/players/top` |
| **Access** | 🔒 Authenticated |
| **Description** | Get top-performing players based on stats |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `stat` | String | `goals` | Stat to rank by: `goals`, `assists`, `appearances` |
| `position` | String | — | Filter by position |
| `limit` | Number | 10 | Number of players to return |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Top players fetched successfully",
  "data": [
    {
      "rank": 1,
      "id": "64f1a2b3c4d5e6f7a8b9c1a1",
      "name": "Kwame Mensah",
      "position": "forward",
      "academy": "Rising Stars Academy",
      "goals": 18,
      "assists": 10,
      "appearances": 25
    },
    {
      "rank": 2,
      "id": "64f1a2b3c4d5e6f7a8b9c1a5",
      "name": "Chidi Okafor",
      "position": "forward",
      "academy": "Thunder FC Academy",
      "goals": 16,
      "assists": 5,
      "appearances": 23
    }
  ]
}
```

---

### 5.5 Video Controller

**Base Route:** `/api/videos`

---

#### 5.5.1 Upload Video for Player

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/players/:playerId/videos` |
| **Access** | 🏟️ Academy (own players only) |
| **Description** | Upload a highlight video for a player, optionally linked to a match |

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `playerId` | Player ID |

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `video` | File | Yes | Video file (MP4/MOV/AVI, max 100MB) |
| `title` | String | Yes | Video title |
| `description` | String | No | Video description |
| `matchId` | String | No | Associated match ID |

**Success Response: `201 Created`**
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c2a1",
    "playerId": "64f1a2b3c4d5e6f7a8b9c1a1",
    "matchId": "64f1a2b3c4d5e6f7a8b9c3a1",
    "title": "Hat-trick vs Golden Boot FC",
    "description": "Kwame scores 3 goals in the semi-final",
    "url": "/uploads/videos/highlight_001.mp4",
    "thumbnail": "/uploads/thumbnails/highlight_001_thumb.jpg",
    "duration": 245,
    "fileSize": 52428800,
    "status": "pending",
    "createdAt": "2026-03-13T10:30:00Z"
  }
}
```

**Error Response: `400 Bad Request`**
```json
{
  "success": false,
  "message": "Invalid file type. Only MP4, MOV, and AVI are allowed."
}
```

---

#### 5.5.2 Get All Videos for a Player

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/players/:playerId/videos` |
| **Access** | 🔒 Authenticated |
| **Description** | Get all videos for a specific player |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `playerId` | Player ID |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 10 | Records per page |
| `status` | String | — | Filter by status: `pending`, `approved`, `rejected` |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Videos fetched successfully",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c2a1",
      "playerId": "64f1a2b3c4d5e6f7a8b9c1a1",
      "matchId": "64f1a2b3c4d5e6f7a8b9c3a1",
      "title": "Hat-trick vs Golden Boot FC",
      "description": "Kwame scores 3 goals in the semi-final",
      "url": "/uploads/videos/highlight_001.mp4",
      "thumbnail": "/uploads/thumbnails/highlight_001_thumb.jpg",
      "duration": 245,
      "status": "approved",
      "match": {
        "id": "64f1a2b3c4d5e6f7a8b9c3a1",
        "academyA": "Rising Stars Academy",
        "academyB": "Golden Boot FC",
        "score": "3-1"
      },
      "createdAt": "2026-03-13T10:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalRecords": 5,
    "limit": 10
  }
}
```

---

#### 5.5.3 Get Video by ID

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/videos/:id` |
| **Access** | 🔒 Authenticated |
| **Description** | Get detailed information about a specific video |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Video ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Video fetched successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c2a1",
    "playerId": "64f1a2b3c4d5e6f7a8b9c1a1",
    "matchId": "64f1a2b3c4d5e6f7a8b9c3a1",
    "title": "Hat-trick vs Golden Boot FC",
    "description": "Kwame scores 3 goals in the semi-final",
    "url": "/uploads/videos/highlight_001.mp4",
    "thumbnail": "/uploads/thumbnails/highlight_001_thumb.jpg",
    "duration": 245,
    "fileSize": 52428800,
    "status": "approved",
    "player": {
      "id": "64f1a2b3c4d5e6f7a8b9c1a1",
      "name": "Kwame Mensah",
      "position": "forward",
      "academy": {
        "id": "64f1a2b3c4d5e6f7a8b9c0e1",
        "academyName": "Rising Stars Academy"
      }
    },
    "match": {
      "id": "64f1a2b3c4d5e6f7a8b9c3a1",
      "academyA": "Rising Stars Academy",
      "academyB": "Golden Boot FC",
      "score": "3-1",
      "date": "2026-03-01T15:00:00Z"
    },
    "createdAt": "2026-03-13T10:30:00Z"
  }
}
```

---

#### 5.5.4 Update Video

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/videos/:id` |
| **Access** | 🏟️ Academy (own player's videos only) |
| **Description** | Update video metadata (title, description, matchId) |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Video ID |

**Request Body:**
```json
{
  "title": "Updated: Hat-trick vs Golden Boot FC - Semi Final",
  "description": "Updated description",
  "matchId": "64f1a2b3c4d5e6f7a8b9c3a1"
}
```

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Video updated successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c2a1",
    "title": "Updated: Hat-trick vs Golden Boot FC - Semi Final",
    "description": "Updated description",
    "matchId": "64f1a2b3c4d5e6f7a8b9c3a1",
    "updatedAt": "2026-03-13T18:00:00Z"
  }
}
```

---

#### 5.5.5 Update Video Status (Admin)

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/admin/videos/:id/status` |
| **Access** | 🛡️ Admin |
| **Description** | Approve or reject a video upload |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Video ID |

**Request Body:**
```json
{
  "status": "approved",
  "remarks": "Video meets quality standards"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `status` | Required, enum: `approved`, `rejected` |
| `remarks` | Optional, reason for decision |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Video status updated successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c2a1",
    "status": "approved",
    "remarks": "Video meets quality standards",
    "reviewedBy": "64f1a2b3c4d5e6f7a8b9c0d0",
    "reviewedAt": "2026-03-13T19:00:00Z"
  }
}
```

---

#### 5.5.6 Delete Video

| | |
|---|---|
| **Method** | `DELETE` |
| **URL** | `/api/videos/:id` |
| **Access** | 🏟️ Academy (own) / 🛡️ Admin |
| **Description** | Delete a video file and its record |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Video ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

---

### 5.6 Match Controller

**Base Route:** `/api/matches`

---

#### 5.6.1 Create Match

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/matches` |
| **Access** | 🏟️ Academy |
| **Description** | Create/schedule a new match between two academies |

**Request Body:**
```json
{
  "academyA": "64f1a2b3c4d5e6f7a8b9c0e1",
  "academyB": "64f1a2b3c4d5e6f7a8b9c0e2",
  "date": "2026-04-01T15:00:00Z",
  "venue": "National Stadium, Lagos",
  "matchType": "friendly",
  "description": "Pre-season friendly match"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `academyA` | Required, valid academy ID (must be the user's academy) |
| `academyB` | Required, valid academy ID (different from academyA) |
| `date` | Required, valid future date |
| `venue` | Optional, string |
| `matchType` | Optional, enum: `friendly`, `league`, `tournament`, `cup` |
| `description` | Optional, max 300 chars |

**Success Response: `201 Created`**
```json
{
  "success": true,
  "message": "Match created successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c3a1",
    "academyA": {
      "id": "64f1a2b3c4d5e6f7a8b9c0e1",
      "academyName": "Rising Stars Academy"
    },
    "academyB": {
      "id": "64f1a2b3c4d5e6f7a8b9c0e2",
      "academyName": "Golden Boot FC"
    },
    "date": "2026-04-01T15:00:00Z",
    "venue": "National Stadium, Lagos",
    "matchType": "friendly",
    "description": "Pre-season friendly match",
    "score": null,
    "verificationStatus": "pending",
    "createdBy": "64f1a2b3c4d5e6f7a8b9c0d1",
    "createdAt": "2026-03-13T10:30:00Z"
  }
}
```

---

#### 5.6.2 Get All Matches

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/matches` |
| **Access** | 🔒 Authenticated |
| **Description** | Get a paginated list of all matches |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 10 | Records per page |
| `academyId` | String | — | Filter by academy (either side) |
| `verificationStatus` | String | — | Filter: `pending`, `verified`, `disputed` |
| `matchType` | String | — | Filter by match type |
| `dateFrom` | String | — | Filter matches from date |
| `dateTo` | String | — | Filter matches up to date |
| `sort` | String | `date:desc` | Sort field and order |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Matches fetched successfully",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c3a1",
      "academyA": {
        "id": "64f1a2b3c4d5e6f7a8b9c0e1",
        "academyName": "Rising Stars Academy"
      },
      "academyB": {
        "id": "64f1a2b3c4d5e6f7a8b9c0e2",
        "academyName": "Golden Boot FC"
      },
      "date": "2026-04-01T15:00:00Z",
      "venue": "National Stadium, Lagos",
      "matchType": "friendly",
      "score": "3-1",
      "verificationStatus": "verified",
      "createdAt": "2026-03-13T10:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 45,
    "limit": 10
  }
}
```

---

#### 5.6.3 Get Match by ID

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/matches/:id` |
| **Access** | 🔒 Authenticated |
| **Description** | Get full details of a specific match including videos |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Match ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Match fetched successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c3a1",
    "academyA": {
      "id": "64f1a2b3c4d5e6f7a8b9c0e1",
      "academyName": "Rising Stars Academy",
      "location": "Lagos, Nigeria"
    },
    "academyB": {
      "id": "64f1a2b3c4d5e6f7a8b9c0e2",
      "academyName": "Golden Boot FC",
      "location": "Accra, Ghana"
    },
    "date": "2026-04-01T15:00:00Z",
    "venue": "National Stadium, Lagos",
    "matchType": "friendly",
    "description": "Pre-season friendly match",
    "score": "3-1",
    "verificationStatus": "verified",
    "verifiedBy": "64f1a2b3c4d5e6f7a8b9c0d2",
    "verifiedAt": "2026-04-01T18:00:00Z",
    "videos": [
      {
        "id": "64f1a2b3c4d5e6f7a8b9c2a1",
        "playerId": "64f1a2b3c4d5e6f7a8b9c1a1",
        "playerName": "Kwame Mensah",
        "title": "Hat-trick vs Golden Boot FC",
        "url": "/uploads/videos/highlight_001.mp4",
        "status": "approved"
      }
    ],
    "createdBy": "64f1a2b3c4d5e6f7a8b9c0d1",
    "createdAt": "2026-03-13T10:30:00Z"
  }
}
```

---

#### 5.6.4 Get Academy Matches

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/academies/:academyId/matches` |
| **Access** | 🔒 Authenticated |
| **Description** | Get all matches for a specific academy |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `academyId` | Academy ID |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 10 | Records per page |
| `verificationStatus` | String | — | Filter by verification status |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Academy matches fetched successfully",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c3a1",
      "opponent": {
        "id": "64f1a2b3c4d5e6f7a8b9c0e2",
        "academyName": "Golden Boot FC"
      },
      "date": "2026-04-01T15:00:00Z",
      "venue": "National Stadium, Lagos",
      "score": "3-1",
      "result": "win",
      "verificationStatus": "verified"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalRecords": 12,
    "limit": 10
  }
}
```

---

#### 5.6.5 Update Match

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/matches/:id` |
| **Access** | 🏟️ Academy (match creator only) |
| **Description** | Update match details (before the match is verified) |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Match ID |

**Request Body:**
```json
{
  "date": "2026-04-02T16:00:00Z",
  "venue": "Lagos Sports Complex",
  "matchType": "league",
  "description": "Updated match description"
}
```

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Match updated successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c3a1",
    "date": "2026-04-02T16:00:00Z",
    "venue": "Lagos Sports Complex",
    "matchType": "league",
    "description": "Updated match description",
    "updatedAt": "2026-03-13T20:00:00Z"
  }
}
```

**Error Response: `400 Bad Request`**
```json
{
  "success": false,
  "message": "Cannot update a verified match"
}
```

---

#### 5.6.6 Update Match Score

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/matches/:id/score` |
| **Access** | 🏟️ Academy (participating academy) |
| **Description** | Submit/update the score for a match |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Match ID |

**Request Body:**
```json
{
  "scoreA": 3,
  "scoreB": 1
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `scoreA` | Required, non-negative integer |
| `scoreB` | Required, non-negative integer |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Match score updated successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c3a1",
    "score": "3-1",
    "scoreA": 3,
    "scoreB": 1,
    "verificationStatus": "pending",
    "updatedAt": "2026-03-13T20:30:00Z"
  }
}
```

---

#### 5.6.7 Verify Match (Opponent Academy)

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/matches/:id/verify` |
| **Access** | 🏟️ Academy (opposing academy) / 🛡️ Admin |
| **Description** | Verify or dispute the match score submitted by the other academy |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Match ID |

**Request Body:**
```json
{
  "verificationStatus": "verified",
  "remarks": "Score confirmed"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `verificationStatus` | Required, enum: `verified`, `disputed` |
| `remarks` | Optional, reason (required if disputed) |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Match verified successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c3a1",
    "score": "3-1",
    "verificationStatus": "verified",
    "remarks": "Score confirmed",
    "verifiedBy": "64f1a2b3c4d5e6f7a8b9c0d2",
    "verifiedAt": "2026-03-13T21:00:00Z"
  }
}
```

---

#### 5.6.8 Admin Resolve Disputed Match

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/admin/matches/:id/resolve` |
| **Access** | 🛡️ Admin |
| **Description** | Resolve a disputed match by setting the final score |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Match ID |

**Request Body:**
```json
{
  "scoreA": 3,
  "scoreB": 1,
  "verificationStatus": "verified",
  "remarks": "Score confirmed after reviewing video evidence"
}
```

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Match dispute resolved successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c3a1",
    "score": "3-1",
    "verificationStatus": "verified",
    "remarks": "Score confirmed after reviewing video evidence",
    "resolvedBy": "64f1a2b3c4d5e6f7a8b9c0d0",
    "resolvedAt": "2026-03-13T22:00:00Z"
  }
}
```

---

#### 5.6.9 Delete Match

| | |
|---|---|
| **Method** | `DELETE` |
| **URL** | `/api/matches/:id` |
| **Access** | 🏟️ Academy (creator, unverified only) / 🛡️ Admin |
| **Description** | Delete a match record |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Match ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Match deleted successfully"
}
```

**Error Response: `400 Bad Request`**
```json
{
  "success": false,
  "message": "Cannot delete a verified match"
}
```

---

### 5.7 Message Controller

**Base Route:** `/api/messages`

---

#### 5.7.1 Send Message

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/messages` |
| **Access** | 🔒 Authenticated |
| **Description** | Send a direct message to another user |

**Request Body:**
```json
{
  "receiverId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "content": "Hi, I'm interested in your player Kwame Mensah. Can we discuss?"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `receiverId` | Required, valid user ID (cannot be self) |
| `content` | Required, min 1 char, max 2000 chars |

**Success Response: `201 Created`**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c4a1",
    "senderId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "receiverId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "content": "Hi, I'm interested in your player Kwame Mensah. Can we discuss?",
    "isRead": false,
    "createdAt": "2026-03-13T10:30:00Z"
  }
}
```

---

#### 5.7.2 Get All Conversations

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/messages/conversations` |
| **Access** | 🔒 Authenticated |
| **Description** | Get a list of all conversations (latest message per conversation) |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 20 | Records per page |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Conversations fetched successfully",
  "data": [
    {
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "userEmail": "academy@example.com",
      "userRole": "academy",
      "lastMessage": {
        "id": "64f1a2b3c4d5e6f7a8b9c4a3",
        "content": "Sure, let's schedule a meeting.",
        "senderId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "isRead": false,
        "createdAt": "2026-03-13T11:15:00Z"
      },
      "unreadCount": 2
    },
    {
      "userId": "64f1a2b3c4d5e6f7a8b9c0d5",
      "userEmail": "scout2@example.com",
      "userRole": "scout",
      "lastMessage": {
        "id": "64f1a2b3c4d5e6f7a8b9c4a5",
        "content": "Thank you for the information.",
        "senderId": "64f1a2b3c4d5e6f7a8b9c0d2",
        "isRead": true,
        "createdAt": "2026-03-12T09:00:00Z"
      },
      "unreadCount": 0
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalRecords": 2,
    "limit": 20
  }
}
```

---

#### 5.7.3 Get Conversation with User

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/messages/conversations/:userId` |
| **Access** | 🔒 Authenticated |
| **Description** | Get all messages in a conversation with a specific user |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `userId` | The other user's ID |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 50 | Messages per page |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Conversation fetched successfully",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c4a1",
      "senderId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "receiverId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "content": "Hi, I'm interested in your player Kwame Mensah. Can we discuss?",
      "isRead": true,
      "createdAt": "2026-03-13T10:30:00Z"
    },
    {
      "id": "64f1a2b3c4d5e6f7a8b9c4a2",
      "senderId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "receiverId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "content": "Of course! What would you like to know?",
      "isRead": true,
      "createdAt": "2026-03-13T10:45:00Z"
    },
    {
      "id": "64f1a2b3c4d5e6f7a8b9c4a3",
      "senderId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "receiverId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "content": "Sure, let's schedule a meeting.",
      "isRead": false,
      "createdAt": "2026-03-13T11:15:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalRecords": 3,
    "limit": 50
  }
}
```

---

#### 5.7.4 Mark Messages as Read

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/messages/conversations/:userId/read` |
| **Access** | 🔒 Authenticated |
| **Description** | Mark all messages from a specific user as read |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `userId` | The sender's user ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Messages marked as read",
  "data": {
    "markedCount": 2
  }
}
```

---

#### 5.7.5 Delete Message

| | |
|---|---|
| **Method** | `DELETE` |
| **URL** | `/api/messages/:id` |
| **Access** | 🔒 Authenticated (sender only) |
| **Description** | Delete a specific message (soft delete — only removed for sender) |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Message ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

**Error Response: `403 Forbidden`**
```json
{
  "success": false,
  "message": "You can only delete your own messages"
}
```

---

### 5.8 Notification Controller

**Base Route:** `/api/notifications`

---

#### 5.8.1 Get All Notifications

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/notifications` |
| **Access** | 🔒 Authenticated |
| **Description** | Get all notifications for the current user |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 20 | Records per page |
| `isRead` | Boolean | — | Filter: `true` (read), `false` (unread) |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c5a1",
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "type": "academy_approved",
      "message": "Your academy 'Rising Stars Academy' has been approved!",
      "isRead": false,
      "metadata": {
        "academyId": "64f1a2b3c4d5e6f7a8b9c0e1"
      },
      "createdAt": "2026-03-13T10:30:00Z"
    },
    {
      "id": "64f1a2b3c4d5e6f7a8b9c5a2",
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "type": "new_message",
      "message": "You have a new message from scout@example.com",
      "isRead": true,
      "metadata": {
        "senderId": "64f1a2b3c4d5e6f7a8b9c0d2"
      },
      "createdAt": "2026-03-13T09:00:00Z"
    },
    {
      "id": "64f1a2b3c4d5e6f7a8b9c5a3",
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "type": "match_verification",
      "message": "Golden Boot FC has verified the match score (3-1)",
      "isRead": true,
      "metadata": {
        "matchId": "64f1a2b3c4d5e6f7a8b9c3a1"
      },
      "createdAt": "2026-03-12T18:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalRecords": 25,
    "limit": 20
  }
}
```

---

#### 5.8.2 Get Unread Count

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/notifications/unread-count` |
| **Access** | 🔒 Authenticated |
| **Description** | Get the count of unread notifications (for badge display) |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Unread count fetched successfully",
  "data": {
    "unreadCount": 5
  }
}
```

---

#### 5.8.3 Mark Notification as Read

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/notifications/:id/read` |
| **Access** | 🔒 Authenticated |
| **Description** | Mark a single notification as read |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Notification ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c5a1",
    "isRead": true
  }
}
```

---

#### 5.8.4 Mark All Notifications as Read

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/notifications/read-all` |
| **Access** | 🔒 Authenticated |
| **Description** | Mark all notifications as read for the current user |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "markedCount": 5
  }
}
```

---

#### 5.8.5 Delete Notification

| | |
|---|---|
| **Method** | `DELETE` |
| **URL** | `/api/notifications/:id` |
| **Access** | 🔒 Authenticated |
| **Description** | Delete a specific notification |

**URL Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Notification ID |

**Success Response: `200 OK`**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## 6. Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Common Error Scenarios

| Status | Error | Description |
|--------|-------|-------------|
| `400` | `Validation Error` | Request body fails validation |
| `401` | `Unauthorized` | Missing or invalid JWT token |
| `401` | `Token Expired` | JWT token has expired |
| `403` | `Forbidden` | User lacks permission for this action |
| `404` | `Not Found` | Requested resource doesn't exist |
| `409` | `Conflict` | Duplicate resource (e.g., email already exists) |
| `413` | `Payload Too Large` | File upload exceeds size limit |
| `415` | `Unsupported Media Type` | Invalid file type uploaded |
| `429` | `Too Many Requests` | Rate limit exceeded |
| `500` | `Internal Server Error` | Unexpected server error |

### Notification Types (Auto-Generated)

The following notifications are automatically created by the system:

| Type | Trigger | Recipient |
|------|---------|-----------|
| `academy_approved` | Admin approves academy | Academy owner |
| `academy_rejected` | Admin rejects academy | Academy owner |
| `new_message` | User sends a message | Message receiver |
| `match_created` | Academy creates a match | Opponent academy |
| `match_score_submitted` | Academy submits score | Opponent academy |
| `match_verified` | Opponent verifies match | Match creator |
| `match_disputed` | Opponent disputes match | Match creator + Admin |
| `video_approved` | Admin approves video | Academy owner |
| `video_rejected` | Admin rejects video | Academy owner |

---

## 7. Database Schema Reference

### Users
| Field | Type | Description |
|-------|------|-------------|
| `id` | ObjectId | Primary key |
| `email` | String | Unique, required |
| `password` | String | Hashed, required |
| `role` | Enum | `admin`, `academy`, `scout` |
| `status` | Enum | `active`, `inactive`, `suspended` |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-generated |

### Academies
| Field | Type | Description |
|-------|------|-------------|
| `id` | ObjectId | Primary key |
| `userId` | ObjectId | FK → Users.id |
| `academyName` | String | Required |
| `location` | String | Required |
| `description` | String | Optional |
| `founded` | String | Optional |
| `contactPhone` | String | Optional |
| `website` | String | Optional |
| `documents` | Array | Uploaded file references |
| `approvalStatus` | Enum | `pending`, `approved`, `rejected` |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-generated |

### Players
| Field | Type | Description |
|-------|------|-------------|
| `id` | ObjectId | Primary key |
| `academyId` | ObjectId | FK → Academies.id |
| `name` | String | Required |
| `dob` | Date | Required |
| `position` | Enum | `goalkeeper`, `defender`, `midfielder`, `forward` |
| `jerseyNumber` | Number | Optional |
| `height` | Number | Optional (cm) |
| `weight` | Number | Optional (kg) |
| `preferredFoot` | Enum | `left`, `right`, `both` |
| `nationality` | String | Optional |
| `bio` | String | Optional |
| `stats` | Object | Goals, assists, appearances, etc. |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-generated |

### Videos
| Field | Type | Description |
|-------|------|-------------|
| `id` | ObjectId | Primary key |
| `playerId` | ObjectId | FK → Players.id |
| `matchId` | ObjectId | FK → Matches.id (optional) |
| `title` | String | Required |
| `description` | String | Optional |
| `url` | String | File path/URL |
| `thumbnail` | String | Auto-generated thumbnail |
| `duration` | Number | Video duration in seconds |
| `fileSize` | Number | File size in bytes |
| `status` | Enum | `pending`, `approved`, `rejected` |
| `createdAt` | Date | Auto-generated |

### Matches
| Field | Type | Description |
|-------|------|-------------|
| `id` | ObjectId | Primary key |
| `academyA` | ObjectId | FK → Academies.id |
| `academyB` | ObjectId | FK → Academies.id |
| `date` | Date | Match date |
| `venue` | String | Optional |
| `matchType` | Enum | `friendly`, `league`, `tournament`, `cup` |
| `description` | String | Optional |
| `score` | String | e.g., "3-1" |
| `scoreA` | Number | Academy A score |
| `scoreB` | Number | Academy B score |
| `verificationStatus` | Enum | `pending`, `verified`, `disputed` |
| `createdBy` | ObjectId | FK → Users.id |
| `createdAt` | Date | Auto-generated |

### Messages
| Field | Type | Description |
|-------|------|-------------|
| `id` | ObjectId | Primary key |
| `senderId` | ObjectId | FK → Users.id |
| `receiverId` | ObjectId | FK → Users.id |
| `content` | String | Required, max 2000 chars |
| `isRead` | Boolean | Default: false |
| `createdAt` | Date | Auto-generated |

### Notifications
| Field | Type | Description |
|-------|------|-------------|
| `id` | ObjectId | Primary key |
| `userId` | ObjectId | FK → Users.id |
| `type` | String | Notification type |
| `message` | String | Display message |
| `isRead` | Boolean | Default: false |
| `metadata` | Object | Additional context data |
| `createdAt` | Date | Auto-generated |

---

## Quick Reference — All 56 Endpoints

| # | Method | Endpoint | Access | Description |
|---|--------|----------|--------|-------------|
| 1 | `POST` | `/api/auth/register` | 🔓 Public | Register new user |
| 2 | `POST` | `/api/auth/login` | 🔓 Public | Login |
| 3 | `POST` | `/api/auth/logout` | 🔒 Auth | Logout |
| 4 | `GET` | `/api/auth/me` | 🔒 Auth | Get profile |
| 5 | `PUT` | `/api/auth/me` | 🔒 Auth | Update profile |
| 6 | `PUT` | `/api/auth/change-password` | 🔒 Auth | Change password |
| 7 | `POST` | `/api/auth/forgot-password` | 🔓 Public | Forgot password |
| 8 | `POST` | `/api/auth/reset-password/:token` | 🔓 Public | Reset password |
| 9 | `GET` | `/api/admin/users` | 🛡️ Admin | List all users |
| 10 | `GET` | `/api/admin/users/:id` | 🛡️ Admin | Get user by ID |
| 11 | `PUT` | `/api/admin/users/:id/status` | 🛡️ Admin | Update user status |
| 12 | `DELETE` | `/api/admin/users/:id` | 🛡️ Admin | Delete user |
| 13 | `GET` | `/api/admin/dashboard` | 🛡️ Admin | Dashboard stats |
| 14 | `POST` | `/api/academies` | 🏟️ Academy | Create academy |
| 15 | `GET` | `/api/academies` | 🔒 Auth | List academies |
| 16 | `GET` | `/api/academies/:id` | 🔒 Auth | Get academy |
| 17 | `GET` | `/api/academies/me` | 🏟️ Academy | Get my academy |
| 18 | `PUT` | `/api/academies/:id` | 🏟️ Academy | Update academy |
| 19 | `DELETE` | `/api/academies/:id` | 🏟️/🛡️ | Delete academy |
| 20 | `POST` | `/api/academies/:id/documents` | 🏟️ Academy | Upload docs |
| 21 | `GET` | `/api/admin/academies/pending` | 🛡️ Admin | Pending academies |
| 22 | `PUT` | `/api/admin/academies/:id/approval` | 🛡️ Admin | Approve/reject |
| 23 | `GET` | `/api/academies/:id/stats` | 🏟️ Academy | Academy stats |
| 24 | `POST` | `/api/academies/:academyId/players` | 🏟️ Academy | Add player |
| 25 | `GET` | `/api/players` | 🔒 Auth | Browse players |
| 26 | `GET` | `/api/academies/:academyId/players` | 🔒 Auth | Academy players |
| 27 | `GET` | `/api/players/:id` | 🔒 Auth | Get player |
| 28 | `PUT` | `/api/players/:id` | 🏟️ Academy | Update player |
| 29 | `PUT` | `/api/players/:id/stats` | 🏟️ Academy | Update stats |
| 30 | `DELETE` | `/api/players/:id` | 🏟️/🛡️ | Delete player |
| 31 | `GET` | `/api/players/:id/matches` | 🔒 Auth | Player matches |
| 32 | `GET` | `/api/players/top` | 🔒 Auth | Top players |
| 33 | `POST` | `/api/players/:playerId/videos` | 🏟️ Academy | Upload video |
| 34 | `GET` | `/api/players/:playerId/videos` | 🔒 Auth | Player videos |
| 35 | `GET` | `/api/videos/:id` | 🔒 Auth | Get video |
| 36 | `PUT` | `/api/videos/:id` | 🏟️ Academy | Update video |
| 37 | `PUT` | `/api/admin/videos/:id/status` | 🛡️ Admin | Video status |
| 38 | `DELETE` | `/api/videos/:id` | 🏟️/🛡️ | Delete video |
| 39 | `POST` | `/api/matches` | 🏟️ Academy | Create match |
| 40 | `GET` | `/api/matches` | 🔒 Auth | List matches |
| 41 | `GET` | `/api/matches/:id` | 🔒 Auth | Get match |
| 42 | `GET` | `/api/academies/:academyId/matches` | 🔒 Auth | Academy matches |
| 43 | `PUT` | `/api/matches/:id` | 🏟️ Academy | Update match |
| 44 | `PUT` | `/api/matches/:id/score` | 🏟️ Academy | Update score |
| 45 | `PUT` | `/api/matches/:id/verify` | 🏟️/🛡️ | Verify match |
| 46 | `PUT` | `/api/admin/matches/:id/resolve` | 🛡️ Admin | Resolve dispute |
| 47 | `DELETE` | `/api/matches/:id` | 🏟️/🛡️ | Delete match |
| 48 | `POST` | `/api/messages` | 🔒 Auth | Send message |
| 49 | `GET` | `/api/messages/conversations` | 🔒 Auth | All conversations |
| 50 | `GET` | `/api/messages/conversations/:userId` | 🔒 Auth | Get conversation |
| 51 | `PUT` | `/api/messages/conversations/:userId/read` | 🔒 Auth | Mark read |
| 52 | `DELETE` | `/api/messages/:id` | 🔒 Auth | Delete message |
| 53 | `GET` | `/api/notifications` | 🔒 Auth | Get notifications |
| 54 | `GET` | `/api/notifications/unread-count` | 🔒 Auth | Unread count |
| 55 | `PUT` | `/api/notifications/:id/read` | 🔒 Auth | Mark as read |
| 56 | `PUT` | `/api/notifications/read-all` | 🔒 Auth | Mark all read |
| 57 | `DELETE` | `/api/notifications/:id` | 🔒 Auth | Delete notification |

---

> **Note:** This document serves as the complete backend API contract. All endpoints should be implemented with proper input validation, error handling, authentication middleware, and role-based access control.
