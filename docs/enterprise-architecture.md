# Enterprise Capability Architecture

## Purpose

This design restores enterprise support without replacing the individual-client marketplace. An enterprise account is a user with `userType = enterprise`; the organization remains the operational boundary for membership, projects, hiring, verification, workforce records, and audit history.

## Authorization Model

| Organization role | Access boundary |
|---|---|
| `OWNER` | Full control, including organization profile, members, invitations, projects, verification submission, jobs, and workforce assignment. |
| `ADMIN` | Full operating control except ownership transfer and owner removal. |
| `HIRING_MANAGER` | Jobs, candidates, application decisions, and workforce assignment. |
| `RECRUITER` | Candidate pipeline access and candidate communication; cannot change organization governance. |
| `PROJECT_MANAGER` | Project-scoped work, jobs, and workforce assignment. |
| `FINANCE_MANAGER` | Read-only job and workforce visibility in this release; escrow settlement remains centrally controlled until a verified payment configuration exists. |
| `VIEWER` and `MEMBER` | Read-only dashboard access. |

At the platform level, `admin` and `SUPER_ADMIN` can access moderation and review operations. Platform roles do not replace organization membership for normal operating actions, which keeps company activity scoped and auditable.

## Data Ownership

`organizations` holds the public enterprise profile and the verification state. `organization_members` holds the current user-to-company authorization edge, while `organization_invitations` holds hashed invitation tokens and their lifecycle. `organization_projects` groups enterprise work. Existing `jobs` records retain `clientId` as an accountable creator and gain optional `organizationId` and `projectId` references; this preserves individual-client records and enables enterprise attribution.

`organization_verification_requests` keeps sensitive document storage keys, not public access links. `organization_workforce_assignments` records professional placement independently of a job status so the dashboard can represent planned, active, completed, and removed workforce assignments. `audit_logs` records material operating actions, including organization membership and verification decisions.

## Protected File Access

Sensitive verification and transfer-proof storage keys are never served by the general storage proxy. Authorized backend procedures generate short-lived signed URLs only after verifying the viewer's platform or organization permission. This pattern applies to individual and enterprise verification documents.

## Backward Compatibility

All new database changes are additive. Existing individual users, profiles, jobs, applications, conversations, and payment records remain valid. The live database already has the initial organization tables; the reconciliation migration adds columns, constraints, roles, indexes, and new tables only when absent.
