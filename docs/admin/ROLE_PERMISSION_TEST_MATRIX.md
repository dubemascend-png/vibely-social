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
