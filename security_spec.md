# BEMS Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Authenticated & Verified Access Only**: All read and write operations require `request.auth != null` and `request.auth.token.email_verified == true`.
2. **PII Isolation**: User profile documents in `/users/{userId}` (containing `email`) are readable only by the document owner (`userId == request.auth.uid`) or a verified administrator.
3. **Strict Ownership & Query Enforcement**: Every operational document in `/equipment`, `/movements`, `/maintenanceTasks`, `/faultReports`, and `/historyEvents` carries an immutable `ownerUid` matching `request.auth.uid`. All `allow list` rules explicitly enforce `resource.data.ownerUid == request.auth.uid` without `get()` or `exists()` lookups.
4. **Relational Integrity**: Every child document in `/movements`, `/maintenanceTasks`, `/faultReports`, and `/historyEvents` must reference an `equipmentId` that exists in `/equipment` (`existsAfter(...)` to support atomic initial workspace seeding).
5. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation/update; `createdAt` and `ownerUid` are strictly immutable on updates.
6. **Terminal State Locking**: Movements with status `'Returned'`, maintenance tasks with status `'Completed'`, and fault reports with status `'Closed'` cannot be modified by non-admins. History events in `/historyEvents` are append-only (`allow update, delete: if false;`).
7. **Anti-Update-Gap & Payload Boundaries**: All document IDs match `^[a-zA-Z0-9_-]+$` (`<= 128` chars), all strings enforce bounded `.size()`, and all creates/updates validate strict `keys().hasAll(...) && keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Read**: Anonymous `get` on `/equipment/eq-1` -> Denied.
2. **Unverified Email Spoof**: Request with admin email `timbrelplatforms@gmail.com` and `email_verified: false` -> Denied.
3. **Self-Assigned Admin Role**: User creating `/users/{uid}` with `role: "Administrator"` -> Denied.
4. **Cross-User PII Read**: Non-admin user reading `/users/{otherUid}` -> Denied.
5. **Blanket List Scraping**: Querying `/equipment` without `where('ownerUid', '==', uid)` -> Denied.
6. **Shadow Ghost Field Injection**: Creating `/equipment/{id}` with extra field `isVerified: true` -> Denied.
7. **Identity Spoofing**: Creating `/equipment/{id}` with `ownerUid: "other-user-uid"` -> Denied.
8. **Orphaned Movement Write**: Creating `/movements/{id}` referencing non-existent `equipmentId: "nonexistent-eq"` -> Denied.
9. **Client Timestamp Forgery**: Creating `/faultReports/{id}` with backdated `createdAt` (`!= request.time`) -> Denied.
10. **Path Variable ID Poisoning**: Creating `/equipment/bad$id/with/invalid` or 1.5KB ID -> Denied.
11. **Terminal State Bypass**: Updating a `'Completed'` maintenance task back to `'Scheduled'` as a non-admin -> Denied.
12. **Audit Log Tampering**: Updating or deleting an existing `/historyEvents/{id}` record -> Denied.
