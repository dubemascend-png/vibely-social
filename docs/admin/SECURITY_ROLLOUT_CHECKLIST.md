# Vibe.ly Admin Security Rollout Checklist

## Current state
- Responsive admin console and role-permission UI are in the upgrade branch.
- Role-assignment hierarchy checks and append-only audit protection are deployed to Supabase.
- TOTP enrollment/challenge UI is in the branch, but mandatory MFA enforcement migration is staged and not live.
- Invitation email is intentionally out of scope for this phase.
- The live database currently has only one active Owner/Super Administrator membership; establish a second trusted top-level administrator through a verified workflow before staff onboarding.

## MFA rollout gate
1. Deploy the upgrade UI to the intended admin URL.
2. Sign in as Owner and enroll a TOTP authenticator.
3. Verify the code and confirm Supabase reports currentLevel = aal2.
4. Refresh and sign in again; confirm challenge behavior below AAL2.
5. Confirm Overview, Users, Audit log and Admin Team & Roles load after verification.
6. Only after these checks pass, apply `20261022060500_require_mfa_for_admin_operations.sql`.
7. Test direct privileged RPC calls: AAL1 must fail and AAL2 must still obey role permissions.
8. Enroll a second trusted top-level administrator before wider staff onboarding.

## Role-assignment negative tests
- An administrator cannot change their own role.
- Super Administrator cannot assign Owner or Super Administrator.
- An actor cannot change a target with an equal or higher-ranked role.
- Non-Owners cannot assign permissions outside their own effective permission set.
- The last two active top-level accounts cannot be demoted below the minimum.
- Successful role changes create audit events.
- Authenticated clients cannot call `admin_record_audit`.
- UPDATE, DELETE and TRUNCATE of audit records are denied.

## Session management acceptance criteria
- Session metadata must be trusted and tied to the actual Supabase session ID.
- Session records need created, last-seen, expiry and revocation timestamps.
- Revocation must be server-side, permission-checked and audited.
- Revoked sessions must lose access to privileged RPCs and sensitive table reads, not merely disappear from the UI.
- Test that an already-open admin tab cannot continue privileged work after revocation.

## Two-person approval acceptance criteria
- Requester and approver must be different active administrators.
- Approval is bound to exact action, target set, reason and expiry.
- Changed, expired, rejected or already-used approvals cannot execute.
- Approval and execution are both recorded in the append-only audit log.
- Server-side action RPCs enforce approval; UI-only checks do not count.

## Release gate
Do not describe the admin console as production-hardened until mandatory MFA is deployed in the correct order, a second trusted top-level administrator is established, role-negative tests pass, and session revocation is enforced at the database/API boundary.
