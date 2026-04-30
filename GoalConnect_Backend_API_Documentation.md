# GoalConnect Backend API Documentation

Version: 1.0.0
Base API URL: http://localhost:5000/api
Swagger UI: http://localhost:5000/api-docs
Last Verified Against Code: April 30, 2026

## 1. Scope and Source of Truth

This document is aligned with the currently implemented backend module in:

- backend/src/routes
- backend/src/controllers
- backend/src/middleware
- backend/src/models

It replaces older documentation content that described routes and features not present in the current codebase.

## 2. Runtime and Security Model

Authentication:

- JWT bearer token in Authorization header
- Format: Bearer <token>

Role model in current code:

- admin
- academy
- scout
- player

User status values in current code:

- pending
- verified
- approved
- suspended
- rejected

Authorization helpers used:

- protect: requires valid JWT
- optionalAuth: JWT optional, request continues without user when missing or invalid
- authorize(...roles): role-based access restriction
- requireApproved: blocks non-admin users unless status is approved

## 3. Response Patterns in Current Implementation

Most endpoints return one of these shapes:

Success list pattern:

- success
- count
- total
- page
- pages
- data

Success single resource pattern:

- success
- data

Success with message pattern:

- success
- message
- data (optional)

Validation errors from express-validator typically return:

- success: false
- message: Validation failed
- errors: [ ... ]

Common status codes actually used:

- 200, 201, 400, 401, 403, 404, 500

## 4. Route Inventory (Implemented)

Total implemented operations under /api: 58

### Misc

1. GET /health

- Access: Public
- Behavior: health ping with timestamp

### Auth

2. POST /auth/register

- Access: Public
- Body validation: email, password(min 6), role in academy|scout
- Behavior: creates User + Academy or Scout profile, returns token and user summary

3. POST /auth/login

- Access: Public
- Body validation: email, password
- Behavior: verifies password, blocks suspended/rejected users

4. GET /auth/me

- Access: Protected
- Behavior: returns user plus role-specific profile (academy, scout, or player)

5. PUT /auth/updatepassword

- Access: Protected
- Body validation: currentPassword, newPassword(min 6)
- Behavior: checks current password, updates password, returns fresh token

6. POST /auth/logout

- Access: Protected
- Behavior: stateless logout message (client should remove token)

### Academies

7. GET /academies

- Access: Public
- Query: page, limit, search, region
- Behavior: only approved academies

8. GET /academies/me

- Access: Protected, academy role
- Behavior: current academy profile

9. PUT /academies/me

- Access: Protected, academy role
- Body validation: partial profile fields
- Behavior: updates allowed academy fields

10. GET /academies/me/players

- Access: Protected, academy role
- Query: page, limit, status, position
- Behavior: players belonging to current academy

11. POST /academies/me/license

- Access: Protected, academy role
- Behavior: expects req.file and updates licenseDocumentUrl

12. GET /academies/:id

- Access: Public with optional auth
- Behavior: returns academy and active players; non-approved academy visible only to admin

### Players

13. GET /players/saved

- Access: Protected, scout role
- Behavior: current scout saved players

14. GET /players

- Access: Public with optional auth
- Query: page, limit, position, strongFoot, minAge, maxAge, minHeight, maxHeight, search, sortBy, sortOrder
- Behavior: active players list with filtering

15. GET /players/:id

- Access: Public with optional auth
- Behavior: player details and latest public analyzed videos; scout view tracking

16. GET /players/:id/videos

- Access: Public with optional auth
- Query: page, limit, videoType
- Behavior: privacy-filtered video list by caller role

17. POST /players/:id/save

- Access: Protected, scout role
- Behavior: add player to scout watchlist

18. DELETE /players/:id/save

- Access: Protected, scout role
- Behavior: remove player from watchlist

19. POST /players

- Access: Protected, academy role, requireApproved
- Body validation: player account + profile fields
- Behavior: creates player User and Player profile

20. PUT /players/:id

- Access: Protected, academy role
- Body validation: partial player fields
- Behavior: update academy-owned player

21. DELETE /players/:id

- Access: Protected, academy role
- Behavior: soft-delete by setting player status to archived

### Scouts

22. GET /scouts/me

- Access: Protected, scout role
- Behavior: scout profile with populated saved players

23. PUT /scouts/me

- Access: Protected, scout role
- Body validation: profile fields, positions, preferred age range
- Behavior: update scout profile

24. GET /scouts/saved-players

- Access: Protected, scout role
- Behavior: saved players list

25. POST /scouts/saved-players/:playerId

- Access: Protected, scout role, requireApproved
- Behavior: save player to scout favorites

26. DELETE /scouts/saved-players/:playerId

- Access: Protected, scout role
- Behavior: unsave player

27. GET /scouts/recently-viewed

- Access: Protected, scout role
- Behavior: recently viewed players list

### Videos

28. GET /videos/feed

- Access: Public with optional auth
- Query: page, limit
- Behavior:
  - admin: sees analyzed/uploaded videos
  - academy: sees own uploads + public player videos
  - guest/scout/player: sees public player-linked videos

29. GET /videos

- Access: Public
- Query: page, limit, videoType, playerId
- Behavior: public analyzed videos

30. GET /videos/:id

- Access: Public with optional auth
- Behavior: privacy checks, increments view count, returns populated video

31. GET /videos/:id/analysis

- Access: Public with optional auth
- Behavior: returns DrillAnalysis for video

32. POST /videos/:id/view

- Access: Public
- Behavior: increments view counter

33. POST /videos

- Access: Protected, academy or player role, requireApproved
- Content: multipart/form-data, field name video
- Body validation: title, videoType, optional playerId, drillType, privacy
- Behavior:
  - player uploads for self profile
  - academy uploads optionally for owned player
  - uses Cloudinary upload middleware

34. PUT /videos/:id

- Access: Protected, academy or player or admin
- Body validation: title/description/privacy constraints
- Behavior: ownership checks for academy/player, admin bypass

35. DELETE /videos/:id

- Access: Protected, academy or player or admin
- Behavior: ownership checks, Cloudinary delete attempt, DrillAnalysis cleanup

36. POST /videos/:id/like

- Access: Protected
- Behavior: toggle like by current user

37. GET /videos/:id/comments

- Access: Public with optional auth
- Behavior: top-level comments + replies

38. POST /videos/:id/comments

- Access: Protected
- Body: text, optional parentComment
- Behavior: add comment or reply

39. DELETE /videos/:id/comments/:commentId

- Access: Protected
- Behavior: delete own comment, admin can delete any

40. POST /videos/:id/comments/:commentId/like

- Access: Protected
- Behavior: toggle like on comment

### Matches

41. GET /matches

- Access: Protected, academy role
- Query: page, limit, matchType
- Behavior: current academy match list

42. POST /matches

- Access: Protected, academy role, requireApproved
- Body validation: opponent, matchDate, optional fields
- Behavior: create match for current academy

43. GET /matches/:id

- Access: Protected, academy role
- Behavior: academy-owned match with populated players and stats

44. PUT /matches/:id

- Access: Protected, academy role, requireApproved
- Body validation: partial match fields
- Behavior: update academy-owned match

45. DELETE /matches/:id

- Access: Protected, academy role, requireApproved
- Behavior: delete academy-owned match + delete related MatchStats

46. GET /matches/:id/stats

- Access: Protected, academy role
- Behavior: list stats for academy-owned match

47. POST /matches/:id/stats

- Access: Protected, academy role, requireApproved
- Body validation: playerId + stat fields
- Behavior: add or update a player stat line, updates player aggregate totals

### Admin

48. GET /admin/dashboard

- Access: Protected, admin role
- Behavior: platform totals and pending counts

49. GET /admin/users

- Access: Protected, admin role
- Query: page, limit, role, status
- Behavior: paginated users list

50. GET /admin/academies

- Access: Protected, admin role
- Query: page, limit, status, search
- Behavior: paginated academy list across all statuses

51. PUT /admin/academies/:id/approve

- Access: Protected, admin role
- Behavior: approve academy and set linked user status approved

52. PUT /admin/academies/:id/reject

- Access: Protected, admin role
- Body: reason required
- Behavior: reject academy and set linked user status rejected

53. PUT /admin/academies/:id/suspend

- Access: Protected, admin role
- Body: reason required
- Behavior: suspend academy and set linked user status suspended

54. GET /admin/scouts

- Access: Protected, admin role
- Query: page, limit
- Behavior: paginated scouts list

55. PUT /admin/scouts/:id/approve

- Access: Protected, admin role
- Behavior: set linked user status approved

56. PUT /admin/scouts/:id/suspend

- Access: Protected, admin role
- Behavior: set linked user status suspended

### Messages

57. POST /messages

- Access: Protected + requireApproved
- Body validation: receiverId, content
- Behavior:
  - cannot message self
  - for first message between two users, only scout -> player is allowed
  - existing conversation participants can continue messaging

58. GET /messages/:userId

- Access: Protected
- Path validation: userId must be MongoId
- Behavior: conversation history sorted oldest-first

Important counting note:

- Route operations under /api are 58 as mounted in router files.
- If you exclude the health endpoint, the remaining domain operations are 57.

## 5. Features Explicitly Not Implemented in Current Backend

These were present in older documentation but are not implemented in current route/controller code:

- Notification REST endpoints under /api/notifications
- Auth forgot-password and reset-password endpoints
- Auth update profile endpoint at PUT /api/auth/me
- Admin user-by-id, user status update, and user delete endpoints
- Match score-verify-dispute workflow endpoints such as /matches/:id/score and /matches/:id/verify
- Admin video status moderation endpoint such as /admin/videos/:id/status
- Message conversation index endpoints such as /messages/conversations

## 6. Known Implementation Caveats

1. Academy license upload route currently expects req.file, but no upload middleware is attached in academy.routes.

- Endpoint: POST /api/academies/me/license
- Practical impact: it will return Please upload a file unless middleware is wired.

2. players.routes declares GET /players/saved twice.

- Both point to the same controller and same auth/role guards.
- Practical impact: no behavior difference, but duplicate declaration is redundant.

3. This backend currently uses Cloudinary middleware for POST /videos only.

- Required env keys for upload path:
  - CLOUDINARY_CLOUD_NAME
  - CLOUDINARY_API_KEY
  - CLOUDINARY_API_SECRET

## 7. Quick Access URLs

- API root health check: http://localhost:5000/api/health
- Swagger UI: http://localhost:5000/api-docs
- Backend root info endpoint: http://localhost:5000/

## 8. Maintenance Guidance

When routes or controller behavior changes, update this file and backend/src/docs/openapi.yaml together so markdown docs and Swagger remain consistent.
