# Data Change Log

Every change here touches the database schema and/or existing data on the **Hostinger VPS
(KVM2) production server** (`/var/www/caindia`, SQLite at `backend/database/database.sqlite`).
This file exists so a production sync never has to be reconstructed from git log — read the
**"Production checklist"** on each entry and run it in order, top to bottom, oldest first.

**Baseline**: as of 2026-08-23, production was fully synced through migration
`2026_08_23_004503_add_proprietor_name_to_customers_table` (verified live via `migrate:status`
during that session's deploy). Every entry below is **newer** than that baseline and has not
yet been deployed unless marked ✅.

How to use this file when deploying:
1. SSH in, `git pull origin main`.
2. Back up `database.sqlite` first (always — see the deploy playbook from 2026-08-23 in this
   conversation history / your notes for the exact steps).
3. For each ⬜ entry below, run its "Production checklist" in order, then flip it to ✅ and
   note the date.
4. `php artisan migrate --force` covers the schema step for entries that are pure migrations;
   entries that also need a data backfill or admin action say so explicitly.

---

## ✅ 2026-08-25 — Independent GSTR-1 / GSTR-3B filing frequency

**Migration**: `2026_08_24_204738_add_gstr1_filing_frequency_to_client_profiles_table`

**What changed**: Added `gstr1_filing_frequency` (nullable string, `monthly`|`quarterly`) to
`client_profiles`. Previously a single `gst_filing_frequency` field drove both GSTR-1 and
GSTR-3B's dashboard timelines — the Compliance Status widget always showed the same cycle for
both, which is wrong for QRMP clients who can file GSTR-1 monthly (via IFF) while GSTR-3B stays
quarterly.

**Why**: Client-provided spec ("Compliance Status — Filing Frequency Display") explicitly
requiring GSTR-1 and GSTR-3B to be displayed and calculated independently.

**Behavior after this change**:
- `gst_filing_frequency` keeps its existing meaning — it now specifically represents **GSTR-3B's**
  cycle, and continues unchanged as the field driving the invoice-period-lock logic
  (`BillingPolicy::assertNotLocked`/`isPeriodFiled`) elsewhere in Billing. No other code needed
  to change because of that.
- `gstr1_filing_frequency` is new and represents **GSTR-1's** cycle only. When `NULL` (e.g. any
  row that existed before this migration, or any composition-dealer row), the app treats it as
  "inherit `gst_filing_frequency`" — handled entirely in application code
  (`GstReturnController::compliance()`), not backfilled at the DB level.
- Composition dealers are unaffected — they file CMP-08, not GSTR-1/GSTR-3B, and this field is
  forced to `NULL` for them.

**Data backfill needed?** No. Existing rows are left `NULL` and behave exactly as before
(GSTR-1 silently mirrors GSTR-3B's frequency) until an admin explicitly sets GSTR-1's frequency
differently for a given client via the Admin Portal's "Edit Client" → new "GSTR-1 Filing
Frequency" field.

**Files touched**:
- `backend/database/migrations/2026_08_24_204738_add_gstr1_filing_frequency_to_client_profiles_table.php`
- `backend/app/Models/ClientProfile.php` (added to `$fillable`)
- `backend/app/Http/Controllers/Api/Admin/ClientProfileController.php` (validation, normalization, field list)
- `backend/app/Http/Controllers/Api/Client/GstReturnController.php` (`compliance()` rebuilt to generate two independent period sets)
- `src/pages/admin/ClientProfileForm.jsx` (relabeled existing field to "GSTR-3B Filing Frequency", added new "GSTR-1 Filing Frequency" control)
- `src/pages/portal/ClientDashboardWidgets.jsx` (`ComplianceStatus` — independent cycle label per row)

**Production checklist**:
1. `git pull origin main`
2. `cd backend && composer install --no-dev --optimize-autoloader --ignore-platform-req=ext-gd`
3. Back up `database.sqlite` (see step 2 in the file header)
4. `php artisan migrate --force` — applies the migration; **no manual backfill SQL needed**
5. `php artisan config:clear && php artisan route:clear && php artisan cache:clear`
6. `cd .. && npm ci && npm run build`
7. `sudo systemctl restart php8.4-fpm`
8. Verify: log in as any real GST-enabled client, load the dashboard, confirm the Compliance
   Status widget still renders (existing clients should look unchanged — both rows same
   frequency as before, since `gstr1_filing_frequency` is `NULL` for all of them until an admin
   sets it)
9. Flip this entry to ✅ with today's date once confirmed live

---

## ⬜ 2026-08-25 — GST Compliance subscription gate

**Migration**: `2026_08_25_000000_add_gst_compliance_enabled_to_client_profiles_table`

**What changed**: Added `gst_compliance_enabled` (boolean, default `true`) to
`client_profiles`. GST Compliance (GSTR-2B, GST Returns, GST Filing Confirmation) is now
a separate subscription add-on from core Billing — when an admin sets a client's flag to
`false`, the client sees a "GST Compliance Not Subscribed" popup instead of those three
sections, both on the backend (403) and the frontend (route gate before even calling the
API).

**Why**: Client-provided spec/reference screenshot ("GST Compliance Not Subscribed"
popup) — the firm wants to sell Billing-only and Billing+GST-Compliance as distinct
subscription tiers.

**Behavior after this change**:
- Defaults to `true` for every existing row — **no client loses access** on deploy;
  only a client an admin explicitly flips to "Not Subscribed" via Admin → Edit Client →
  Registration tab is restricted.
- Backend: `EnsureGstComplianceSubscribed` middleware (aliased `gst.subscribed`) guards
  `/client/gstr2b*`, `/client/gst-returns`, `/client/gst-compliance`, and
  `/client/gst-filing/*` — returns `{"gst_compliance_locked": true, "message": "..."}`
  with HTTP 403 when blocked. The unrelated `/client/compliance` (general
  `ComplianceTask` tracker — ITR/ROC etc., not GST-specific) is untouched.
- Two new, ungated client routes support the popup itself even while locked:
  `GET /client/gst-compliance/admin-contact` (looks up the firm's admin dynamically —
  no hardcoded email) and `POST /client/gst-compliance/request-access` (logs an
  `ActivityLog` entry an admin can see, so "Request Access" is functionally real).
- Frontend: `GstComplianceGate` wraps the three routes in `App.jsx`; the dashboard's
  "Compliance Status" widget also checks the flag before fetching, to avoid an infinite
  loading skeleton for a locked client.

**Data backfill needed?** No — the `default(true)` on the migration itself backfills
every existing row to "subscribed" (unchanged behavior) with no separate SQL step.

**Files touched**:
- `backend/database/migrations/2026_08_25_000000_add_gst_compliance_enabled_to_client_profiles_table.php`
- `backend/app/Models/ClientProfile.php` (`$fillable`, cast)
- `backend/app/Http/Middleware/EnsureGstComplianceSubscribed.php` (new)
- `backend/bootstrap/app.php` (registered `gst.subscribed` alias)
- `backend/routes/api.php` (gated group + two new ungated routes)
- `backend/app/Http/Controllers/Api/Client/GstComplianceAccessController.php` (new)
- `backend/app/Http/Controllers/Api/Admin/ClientProfileController.php` (validation, field list)
- `src/components/GstComplianceLockedModal.jsx` (new)
- `src/components/GstComplianceGate.jsx` (new)
- `src/App.jsx` (wrapped the 3 GST Compliance routes)
- `src/pages/portal/ClientPages.jsx` / `ClientDashboardWidgets.jsx` (dashboard widget locked-state)
- `src/pages/admin/ClientProfileForm.jsx` (new "GST Compliance Subscription" toggle)

**Production checklist**:
1. `git pull origin main`
2. `cd backend && composer install --no-dev --optimize-autoloader --ignore-platform-req=ext-gd`
3. Back up `database.sqlite` (see step 2 in the file header)
4. `php artisan migrate --force` — applies the migration; **no manual backfill SQL needed**
   (default `true` covers every existing row)
5. `php artisan config:clear && php artisan route:clear && php artisan cache:clear`
6. `cd .. && npm ci && npm run build`
7. `sudo systemctl restart php8.4-fpm`
8. Verify: log in as any real client, confirm GSTR-2B/GST Returns/GST Filing Confirmation
   load exactly as before (unchanged — everyone defaults to subscribed). Then, as Admin,
   flip one demo client's "GST Compliance Subscription" to "Not Subscribed" and confirm
   that client now sees the popup on all three sections, "Request Access" appears in
   Admin → Activity, and flipping it back restores access immediately.
9. Flip this entry to ✅ with today's date once confirmed live

---

## ⬜ 2026-08-29 — GST Filing Requests now auto-sync to Client Portal → GST Returns

**Migrations**:
- `2026_08_29_000000_add_filing_details_to_gst_filing_requests_table`
- `2026_08_29_000001_add_ack_no_to_client_gst_returns_table`

**What changed**: Added `filing_date` (date, nullable) + `ack_no` (string, nullable) to
`gst_filing_requests`, and `ack_no` (string, nullable) to `client_gst_returns`. Previously,
Admin marking a GST Filing Request "GST Filed" (`/admin/gst-filing-requests/{id}` → Review)
only updated that request's own `status` — it never touched `client_gst_returns`, so the
Client Portal's GST Returns → Filing History table stayed empty even after the CA had filed
the return. These two tables were disconnected data sources reporting on the same fact.

**Why**: Client-reported bug — filed GSTR-1 for July 2026 via Admin, but the client's own GST
Returns page still showed "No return filings history found." and "Next Due Date: —". Client
spec: Admin and Client Portal "must use the same GST filing record/database. No manual entry
should be required on the Client Portal."

**Behavior after this change**:
- Admin → GST Filing Requests → Review: once a request is "Approved for Filing", the "Mark as
  GST Filed" action now requires **Filing Date** and **ACK. No.** (backend-enforced via
  `required_if:status,GST Filed`, not just a frontend disabled button).
- On that transition, `GstFilingController@updateStatus` (Admin) does an
  `updateOrCreate` on `client_gst_returns` (`client_profile_id` + `tax_period` [=
  `filing_period`] + `return_type` [`GSTR-1` → `GSTR1`]) with `status=filed`,
  `filed_on=filing_date`, `ack_no`, `filed_by`=the admin user. This is the same table the
  Compliance Status dashboard widget and the GST Returns page already read from — no new
  read path needed.
- Client Portal → GST Returns: "Filing History" table's Filed On / ACK. No. columns now
  populate (frontend was reading a `filed_at` field that never existed on the model — fixed to
  read the real `filed_on` field). "Filing Frequency" card now shows GSTR-1's own resolved
  cycle ("Monthly", "Monthly (QRMP)", or "Quarterly") instead of always showing the raw
  GSTR-3B `gst_filing_frequency`. "Next Due Date" is now computed server-side
  (`GstReturnController@nextDue`, reusing the same period-grid/due-date logic as the
  Compliance widget) as the soonest not-yet-filed period across every return type the dealer
  actually files — it no longer goes blank, and no longer mis-computes off the *last filed*
  period.

**Data backfill needed?** No schema-level backfill (both new columns are nullable). **One
manual action**: any `gst_filing_requests` row already sitting at status `GST Filed` from
*before* this deploy (created via the old code path) has no `filing_date`/`ack_no` and never
created its `client_gst_returns` row, so it won't appear in that client's Filing History.
Fix per-row, not via SQL: open Admin → GST Filing Requests → that request's Review page — it
detects `status === 'GST Filed' && !ack_no` and re-shows the Filing Date/ACK No. fields
("Save Filing Details" button); filling them in and saving runs the exact same sync path as a
fresh filing. (Known example on this server: REQ-0005, client "Calculation Private Limited",
period `2026-07`.)

**Files touched**:
- `backend/database/migrations/2026_08_29_000000_add_filing_details_to_gst_filing_requests_table.php`
- `backend/database/migrations/2026_08_29_000001_add_ack_no_to_client_gst_returns_table.php`
- `backend/app/Models/GstFilingRequest.php` (`$fillable`, `filing_date` cast)
- `backend/app/Models/ClientGstReturn.php` (`$fillable`)
- `backend/app/Http/Controllers/Api/Admin/GstFilingController.php` (`updateStatus` validation + sync)
- `backend/app/Http/Controllers/Api/Client/GstReturnController.php` (`index()` adds
  `filing_frequency_label` + `next_due`; new private `nextDue()`)
- `src/pages/admin/AdminGstFilingReview.jsx` (Filing Date/ACK No. inputs, gated "Mark as GST
  Filed" button, backfill affordance for pre-fix rows)
- `src/pages/client/ClientGstDashboard.jsx` (`filed_at` → `filed_on` fix, Filing Frequency
  card, Next Due Date card)

**Follow-up fixes (same day, no new migration — pure application logic, no schema/data change)**:
- GSTR-2B's Tax Period picker (Admin upload + Client reconciliation) now shows **Monthly or
  Quarterly** periods depending on that client's actual GSTR-2B cadence (mirrors GSTR-3B's
  cycle 1:1 by default via `gstr2b_filing_frequency`, always quarterly for Composition) —
  new `BillingPolicy::gstr2bFrequency()`; `Admin\Gstr2bController::upload()`'s `tax_period`
  validation now accepts `YYYY-Qn` alongside `YYYY-MM`, and `deriveFinancialYear()` handles
  both shapes. New shared frontend helpers `fyQuarterPeriodOptions()` / `periodLabel()` in
  `src/pages/billing/billingUtils.js`, wired into `src/pages/admin/AdminClientGstr2b.jsx` and
  `src/pages/portal/ClientGstr2b.jsx`.
- Client Portal → GST Returns → "Integrated GST Filing Confirmation" panel: its "Return
  Period" filter had the same hardcoded-months bug, **plus** a pre-existing independent bug
  where "Return Type" compared `'GSTR-1'`/`'GSTR-3B'` (hyphenated) against the stored
  `'GSTR1'`/`'GSTR3B'` values — meaning that filter never matched anything. Both fixed:
  dropdown values now match the stored format, "Return Period" switches between Month/Quarter
  options per the selected Return Type's actual cadence, and `calculateDueDate()` now handles
  quarterly periods (and no longer silently mis-detects GSTR-3B due to the same hyphen bug).
  `GstReturnController::index()` now also returns `gstr1_quarterly` / `gstr3b_quarterly`
  booleans for this.
- HSN/SAC Summary report and Outstanding/Paid Invoices report (`ReportController.php`) now
  net **Tax Invoice + Bill of Supply + Debit Note − Credit Note** instead of summing only
  Tax Invoice (HSN) or only Tax Invoice + Bill of Supply (Outstanding) — pure query-logic
  fix, no schema change.

**Production checklist**:
1. `git pull origin main`
2. `cd backend && composer install --no-dev --optimize-autoloader --ignore-platform-req=ext-gd`
3. Back up `database.sqlite` (see step 2 in the file header)
4. `php artisan migrate --force` — applies both migrations; no manual backfill SQL needed
5. `php artisan config:clear && php artisan route:clear && php artisan cache:clear`
6. `cd .. && npm ci && npm run build`
7. `sudo systemctl restart php8.4-fpm`
8. Verify: as Admin, open REQ-0005's Review page, confirm it now shows the Filing Date/ACK
   No. fields (since `ack_no` is still empty on that row), fill in a real filing date + ACK
   number, save. Then log in as that client (Calculation Private Limited) and confirm GST
   Returns → Filing History now shows that row (Tax Period `2026-07`, Filed On = the date
   just entered, ACK. No. matching), Filing Frequency card reads correctly, and Next Due Date
   is no longer "—".
9. Flip this entry to ✅ with today's date once confirmed live

---
