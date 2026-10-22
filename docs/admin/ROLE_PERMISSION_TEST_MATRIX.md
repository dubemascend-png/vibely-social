# Vibe.ly Admin Role / Permission Test Matrix

This matrix describes the intended result from the seeded permission arrays and server-side checks in the moderation, role, appeal, verification, and PII-reveal RPCs. It is a review checklist, not a claim that we authenticated as each role in a browser. Run the checks with separate test accounts before assigning production staff.

| Action | Owner | Super Administrator | Admin | Senior Moderator | Moderator | Support Agent | Community Manager | Verification Reviewer | Analyst |
|---|---|---|---|---|---|---|---|---|---|
| View overview | Allow | Allow | Allow | Allow | Allow | Allow | Allow | Allow | Allow |
| View users | Allow | Allow | Allow | Allow | Allow | Allow (masked) | Deny | Deny | Deny |
| Reveal email/phone | Allow only with explicit users.pii.reveal | Deny by default | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Temporarily restrict users | Allow | Allow | Allow | Allow | Allow | Deny | Deny | Deny | Deny |
| Permanently ban users | Allow | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Deny |
| Soft-delete account | Allow | Allow via users.manage | Allow via users.manage | Deny | Deny | Deny | Deny | Deny | Deny |
| Review reports / cases | Allow | Allow | Allow | Allow | Allow | Deny | Deny | Deny | Deny |
| Review appeals | Allow | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Deny |
| Decide own original appeal | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Approve verification request | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Allow | Deny |
| Manage communities | Allow | Allow | Allow | Deny | Deny | Deny | Allow | Deny | Deny |
| View analytics | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Deny | Allow |
| Manage support tickets | Allow | Allow | Allow | Deny | Deny | Allow | Deny | Deny | Deny |
| Manage announcements | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Deny | Deny |
| Change feature flags | Allow | Allow | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Create custom roles | Allow | Allow (custom roles only) | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Assign Admin / Super Administrator | Allow | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Assign lower-privilege role to another admin | Allow | Allow (not to self) | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Read sensitive report evidence | Allow | Allow with explicit reports.evidence.view | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Read private message bodies | Deny by default | Deny by default | Deny by default | Deny by default | Deny by default | Deny by default | Deny by default | Deny by default | Deny by default |

## Manual verification checklist

1. Sign in as an Owner and verify the complete navigation, live overview, and role list.
2. Create separate test accounts for each role and assign them through the audited role RPC.
3. Confirm forbidden navigation is hidden and direct RPC calls still fail with permission errors.
4. Confirm Moderator can restrict for 1/7/30 days but cannot ban or soft-delete.
5. Confirm an appeal reviewer cannot decide an appeal whose original enforcement actor is the same user.
6. Confirm PII stays masked in the admin directory; reveal requires explicit users.pii.reveal, a five-character reason, and an audit entry.
7. Confirm evidence-table reads fail without reports.evidence.view.
8. Confirm administrative table changes create an audit row, and ordinary user report submissions do not create admin audit entries.
9. Confirm two active Owner/Super Administrator memberships remain before any top-role demotion.
10. Confirm private message contents are never selected by the Messages Safety dashboard.

## Known remaining gaps

- The role schema and UI are in place, but invitation email delivery, mandatory 2FA, session revocation, and a full permission-by-resource custom matrix still need dedicated implementation.
- Two-person approval for high-risk bans, bulk deletes, and exports is not implemented yet.
- The console has live aggregate analytics; time-series charts and retention cohorts require a complete event pipeline.
- Community management, content takedowns, scheduled announcements, and support response templates need additional audited workflows.


## Upgrade branch security changes (2026-10-22)

The applied Supabase migration `20261022060048_admin_role_hierarchy_and_append_only_audit.sql` now:
- Enforces role hierarchy and permission-subset checks in `admin_assign_role` on the server.
- Rejects self-role changes and attempts to change an Owner or act on an equal/higher-ranked role.
- Rejects assigning permissions the acting Super Administrator does not hold.
- Keeps at least two active Owner/Super Administrator memberships when demoting a top-level membership.
- Revokes authenticated execution of the generic caller-controlled `admin_record_audit` RPC; trusted service-role code retains execution.
- Blocks UPDATE/DELETE of audit rows with a database trigger and revokes UPDATE/DELETE/TRUNCATE table grants from API roles.

### Verification performed
- Confirmed in Supabase that `admin_assign_role` remains executable by authenticated users (intentional: its body performs server-side role checks).
- Confirmed `admin_record_audit` is no longer executable by authenticated users.
- Confirmed the append-only trigger exists for both UPDATE and DELETE.
- Confirmed the migration is recorded in Supabase as version `20261022060048`.

### Still required before production staff onboarding
- Execute positive and negative role-assignment tests using separate authenticated accounts for Owner, Super Administrator, Admin, Senior Moderator and Moderator.
- Verify direct RPC attempts are denied for self-promotion, equal/higher role targets, assigning permissions not held, and demotion of the second remaining top-level admin.
- Verify UPDATE, DELETE and TRUNCATE against the audit table are denied for API roles.
- Mandatory 2FA, invite-email delivery, session revocation and two-person approvals remain separate implementation items; do not treat them as completed.


### Production safeguard finding
A live schema check currently finds only **one active Owner/Super Administrator membership**. The database guard is now installed to prevent demotion/deletion from reducing the count further, but it cannot create the second administrator by itself. Before onboarding additional staff or considering role administration complete, provision a second trusted top-level administrator through a verified, audited process. Invitation email and mandatory 2FA are not yet implemented, so do not use an ad-hoc client-side insert to bypass that workflow.
