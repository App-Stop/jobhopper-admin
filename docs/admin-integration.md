# Admin integration coverage

Audited against `../job-hopper-backend/src/feature/*/*.routes.js`, the admin validators, controllers, services, transformers and OpenAPI schemas.

The admin screens integrate the routes below; platform settings are read-only. The 5 legacy `/reports` routes alias the same handlers used by `/admin/disputes`; they do not require another screen.

| Module / page | Backend routes | Frontend behavior |
| --- | --- | --- |
| Login and recovery | POST `/admin/login`, `/admin/forgot-password`, `/admin/verify-otp`, `/admin/reset-password` | Login, email recovery, OTP verification, password reset |
| Account | GET `/admin/me`, PATCH `/admin/change-password` | Session profile refresh and password change |
| Dashboard | GET `/admin/overview` | Marketplace overview, recent jobs and pending verifications |
| Users | GET `/admin/users`, GET `/admin/users/:id`, PATCH `/admin/users/:id/deactivate` | Server search, role/status/join-date filters, pagination, profile and activity details, deactivate/reactivate |
| Verification Queue | GET `/admin/verifications`, GET/PATCH `/admin/verifications/:id` | Counted status tabs, server search, UTC submission dates, pagination, detail drawer, current documents and attempt history, confirmed approve/reject with reason |
| Jobs & Orders | GET `/admin/jobs`, GET `/admin/jobs/:id` | Server search, grouped/exact statuses, post type, urgency, creation/scheduled dates, pagination; applicants, payment/refunds, cancellation, dispute summary and status history |
| Open Requests | GET `/admin/open-requests`, GET `/admin/open-requests/:id` | Search, post type, urgency, counts, pagination and request details |
| Payouts | GET `/admin/payouts`, GET `/admin/payouts/:id` | Search, single/multiple statuses, date range, counts, pagination, bank/payment/failure details |
| Disputes | GET `/admin/disputes`, GET/PATCH `/admin/disputes/:id`, POST `/admin/disputes/:id/requests`, POST `/admin/disputes/:id/resolve` | Server search/status/pagination, detail/evidence, mark under review, ask either party for evidence, resolve with refund and note |
| Support Tickets | GET `/admin/support-tickets`, GET/PATCH `/admin/support-tickets/:id` | Search/status/counts/pagination, detail, under review, resolve with an optional user-visible answer |
| User Reports | GET `/admin/user-reports`, GET/PATCH `/admin/user-reports/:id` | Search/status/reporter-role/reason filters, counts/pagination, both people, related report count, review/resolve with internal note |
| Categories | GET `/admin/categories`, POST `/categories`, PATCH/DELETE `/categories/:id` | Active/inactive list and search, create/edit/delete, nonnegative integer sort order |
| Fees & Platform | GET `/admin/settings`, GET `/admin/field-options` | Read-only settings and Veriff status, checkout preview, read-only choice lists |

Private images use authenticated GET `/files/:id/content`. Its 401 handling now follows the session-expiry flow used by JSON requests.

## Boundaries of the backend

- User activity lists contain the latest 10 records and a total. No dedicated admin payment/review list or activity-pagination endpoint exists; these are shown in user details using the available API.
- FAQ and static-content routes are public reads. The backend has no admin CMS mutation endpoints.
- Chat, calls, notifications, addresses, worker bank accounts and payment methods expose participant/account workflows, not admin management APIs. They are not separate admin modules.
- Payout administration is read-only. The backend provides no admin payout approval/retry action.
- Category icons can be uploaded/replaced. The backend provides no explicit icon removal action.

## Validation

`npm run test` exercises API authorization, validation error messages, multipart uploads, pagination, malformed responses, cancellation/network failures and private-file session expiry. `npm run lint`, `npm run build` and `git diff --check` validate the frontend source/build. Live authenticated end-to-end behavior requires a running configured backend and admin session; it has not been verified here.

The verification page follows `ADMIN_VERIFICATIONS_FRONTEND_INTEGRATION_GUIDE.md`. The local backend checkout inspected during implementation still exposes the legacy worker verification routes; it must provide the new `/admin/verifications` contract before this page can be exercised end to end.
