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

## ✅ 2026-08-29 — GST Compliance subscription gate

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

## ⬜ 2026-08-27 — GSTR-2B filing/reconciliation cadence per client

**Migration**: `2026_08_27_120000_add_gstr2b_filing_frequency_to_client_profiles_table`

**What changed**: Added `gstr2b_filing_frequency` (nullable string, `monthly`|`quarterly`) to
`client_profiles`, alongside the existing `gst_filing_frequency` (GSTR-3B) and
`gstr1_filing_frequency` columns. GSTR-2B has no filing action of its own — it's an
auto-drafted GSTN statement — but the portal tracks its own display/reconciliation cadence per
client so Admin → Edit Client shows Monthly/Quarterly consistently across GSTR-1/GSTR-2B/GSTR-3B,
and so the GSTR-2B upload/reconciliation period picker (Admin + Client) offers the right period
shape (`YYYY-MM` vs `YYYY-Qn`) for that client.

**Why**: Follow-up to the GST Filing Requests auto-sync work — GSTR-2B's Tax Period picker was
hardcoded to months only, wrong for a client whose GSTR-2B cadence is quarterly. (This migration
was written as part of that same day's follow-up fixes but was missed from that entry's
**Files touched** list below — the note there claiming "no new migration" for the GSTR-2B cadence
fix was inaccurate; this is that migration.)

**Behavior after this change**:
- Defaults to `NULL` for every existing row, meaning "inherit `gst_filing_frequency`" (GSTR-3B's
  cycle) — resolved in application code (`ClientProfileController::normalizeGstFields()` /
  `BillingPolicy::gstr2bFrequency()`), same inheritance pattern as `gstr1_filing_frequency`.
  No client's behavior changes on deploy until an admin explicitly sets it.
- Composition dealers: forced to `NULL` (they don't file GSTR-2B/1/3B at all).
- Admin → Edit Client now has a "GSTR-2B Filing Frequency" field; GSTR-2B upload (Admin) and
  reconciliation (Client) period pickers now show Monthly or Quarterly periods based on this
  resolved value.

**Data backfill needed?** No. All existing rows stay `NULL` (inherit GSTR-3B's cadence, same as
today) until an admin sets one explicitly.

**Files touched**:
- `backend/database/migrations/2026_08_27_120000_add_gstr2b_filing_frequency_to_client_profiles_table.php`
- `backend/app/Models/ClientProfile.php` (`$fillable`)
- `backend/app/Http/Controllers/Api/Admin/ClientProfileController.php` (validation, normalization, field list)
- `backend/app/Services/Billing/BillingPolicy.php` (new `gstr2bFrequency()`)
- `backend/app/Http/Controllers/Api/Admin/Gstr2bController.php` (`upload()` accepts `YYYY-Qn`, `deriveFinancialYear()` handles both shapes)
- `src/pages/admin/ClientProfileForm.jsx` (new "GSTR-2B Filing Frequency" field)
- `src/pages/admin/AdminClientGstr2b.jsx` / `src/pages/portal/ClientGstr2b.jsx` (period picker now Monthly or Quarterly)
- `src/pages/billing/billingUtils.js` (`fyQuarterPeriodOptions()`, `periodLabel()` helpers)

**Production checklist**:
1. `git pull origin main`
2. `cd backend && composer install --no-dev --optimize-autoloader --ignore-platform-req=ext-gd`
3. Back up `database.sqlite` (see step 2 in the file header)
4. `php artisan migrate --force` — applies the migration; **no manual backfill SQL needed**
5. `php artisan config:clear && php artisan route:clear && php artisan cache:clear`
6. `cd .. && npm ci && npm run build`
7. `sudo systemctl restart php8.4-fpm`
8. Verify: Admin → Edit Client on any real client — "GSTR-2B Filing Frequency" field shows
   (blank/inherit by default); GSTR-2B upload period picker still works exactly as before
   (monthly, since `gst_filing_frequency` unchanged). Then set one demo client's GSTR-2B
   frequency to "Quarterly" and confirm both Admin upload and Client reconciliation period
   pickers switch to quarter options for that client.
9. Flip this entry to ✅ with today's date once confirmed live

---

## ✅ 2026-08-29 — GST Filing Requests now auto-sync to Client Portal → GST Returns

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

## ⬜ 2026-09-06 — Branch (If any) field for Parties

**Migration**: `2026_09_06_000000_add_branch_name_to_customers_table`

**What changed**: Added `branch_name` (nullable string) to `customers`. The "Add New
Company" (Parties) form now has an optional "Branch (If any)" field, and the party
search/picker on document creation shows it next to the GSTIN when set (e.g.
`27ABCDE1234Q1Z3 (Branch Name - Kalyan)`) — lets a user tell branches of the same company
apart when picking a party.

**Why**: Client-requested field, screenshot spec ("Add Branch (if any) under Parties Tab
in New Company... should display while selecting Party").

**Behavior after this change**: Defaults to `NULL` for every existing party — no visible
change until a user fills it in on a party (new or edited). Nothing else reads or depends
on this column yet.

**Data backfill needed?** No — nullable, no default data required.

**Files touched**:
- `backend/database/migrations/2026_09_06_000000_add_branch_name_to_customers_table.php`
- `backend/app/Models/Customer.php` (`$fillable`)
- `backend/app/Http/Controllers/Api/Billing/MasterController.php` (validation)
- `src/pages/billing/PartyForm.jsx` (new "Branch (If any)" field)
- `src/pages/billing/PartySearchSelect.jsx` (shows branch name next to GSTIN in the picker)

**Production checklist**:
1. `git pull origin main`
2. `cd backend && composer install --no-dev --optimize-autoloader --ignore-platform-req=ext-gd`
3. Back up `database.sqlite` first
4. `php artisan migrate --force` — applies the migration; no manual backfill SQL needed
5. `php artisan config:clear && php artisan route:clear && php artisan cache:clear`
6. `cd .. && npm ci && npm run build`
7. `sudo systemctl restart php8.4-fpm`
8. Verify: Parties → Add New Company — "Branch (If any)" field saves correctly; on a
   document's Party picker, a party with a branch name set shows it next to the GSTIN.
9. Flip this entry to ✅ with today's date once confirmed live

---

## ⬜ 2026-09-06 — Delivery Challan document type

**Migrations**:
- `2026_09_06_000100_add_delivery_challan_fields_to_commercial_documents_table`
- `2026_09_06_000200_add_delivery_challan_next_number_to_client_profiles`

**What changed**: Added a brand-new "Delivery Challan" document type end-to-end — new
columns on `commercial_documents` (`reason_for_transportation`,
`reason_for_transportation_other`, `vehicle_no`, `transporter_name`, `eway_bill_no`,
`receiver_name`, `receiver_signature_datetime`) and a dedicated
`delivery_challan_next_number` counter on `client_profiles` (so its numbering never shares
or skips the Tax Invoice sequence). Delivery Challan now appears in the "Create Document"
dropdown (after Credit Note), the Billing Section tabs, has its own Create/Edit/List/Detail
pages reusing the existing invoice-style form, prints on the PDF with a Transportation
Details + Receiver Acknowledgement section, and is listed as a document type on the public
marketing page.

**Why**: Client spec — "Quotation Credit Note ke niche uske baad Delivery Challan bhi add
kar dena", plus the extra fields (Reason for Transportation, Vehicle No., Transporter Name,
E-Way Bill No., Receiver Name, Receiver Signature & Date/Time).

**Behavior after this change**: Purely additive — every existing document type/row is
unaffected. Also fixed two real pre-existing bugs found while building this: (1)
`BillingPolicy::allowedTypes()` never actually included `'delivery_challan'` for any
dealer type, so creating one would have 422'd even after this deploy without that fix;
(2) delivery challans would otherwise have silently shared the Tax Invoice number counter.
Both are already fixed in the application code that ships with this deploy — no separate
action needed for those two.

**Data backfill needed?** No — all new columns are nullable, and the new counter defaults
to `1`.

**Files touched** (highlights — this touched many files; see git history for the full list):
- Both migrations above
- `backend/app/Models/CommercialDocument.php`, `ClientProfile.php` (`$fillable`, casts)
- `backend/app/Services/Billing/BillingPolicy.php` (`allowedTypes()` fix)
- `backend/app/Services/Billing/InvoiceService.php` (numbering, docPayload, duplicate)
- `backend/app/Http/Controllers/Api/Billing/DocumentController.php` (validation)
- `backend/resources/views/pdf/invoice.blade.php` (Transportation Details / Receiver
  Acknowledgement sections)
- `src/App.jsx` (routes), `src/pages/billing/InvoiceForm.jsx`, `InvoiceList.jsx`,
  `InvoiceDetail.jsx`, `BillingDashboard.jsx`, `BillingSubNav.jsx`, `billingUtils.js`,
  `billingProfile.js`
- `src/pages/marketing/BillingManagement.jsx` (new tile + icon)

**Production checklist**:
1. `git pull origin main`
2. `cd backend && composer install --no-dev --optimize-autoloader --ignore-platform-req=ext-gd`
3. Back up `database.sqlite` first
4. `php artisan migrate --force` — applies both migrations; no manual backfill SQL needed
5. `php artisan config:clear && php artisan route:clear && php artisan cache:clear`
6. `cd .. && npm ci && npm run build`
7. `sudo systemctl restart php8.4-fpm`
8. Verify: as a client, Create Document → Delivery Challan appears after Credit Note;
   create one with all the new fields filled in, confirm it saves, appears in the Billing
   Section's Delivery Challan tab, and its PDF shows Transportation Details + Receiver
   Acknowledgement correctly. Also confirm its document number is its own independent
   sequence (e.g. `DC-01`), not skipping/sharing the Tax Invoice numbering.
9. Flip this entry to ✅ with today's date once confirmed live

---

## ⬜ 2026-09-06 — GSTR-2B "No Bills" status (Admin) for the GSTR-3B reconciliation gate

**Migration**: `2026_09_06_000300_add_no_bills_to_client_gstr2b_records_table`

**What changed**: Added `no_bills` (boolean, default `false`) to `client_gstr2b_records`,
and made `file_path` on that table nullable. Admin → Client → GSTR-2B now has a "Mark
'No Bills in GSTR-2B'" button (per period) as an alternative to uploading a file — it
creates/updates that period's record with no file attached, which satisfies the existing
reconciliation check (`Gstr2bReconciliationService::isMonthReconciled()`) with zero
invoices, so the client can raise their GSTR-3B filing request directly for that period
without a real GSTR-2B statement.

**Why**: Client spec — "If GSTR-2B contains bills, remain Reconciliation Pending... In the
Admin Portal, provide a simple status option: GSTR-2B Bills Available / No Bills in
GSTR-2B... period-wise."

**Behavior after this change**: Defaults to `false` for every existing record — no
existing upload's behavior changes. Only newly-created "No Bills" records (via the new
button) are affected.

**Data backfill needed?** No — additive, default-`false` column.

**Files touched**:
- `backend/database/migrations/2026_09_06_000300_add_no_bills_to_client_gstr2b_records_table.php`
- `backend/app/Models/ClientGstr2bRecord.php` (`$fillable`, cast)
- `backend/app/Http/Controllers/Api/Admin/Gstr2bController.php` (new `markNoBills()`;
  `upload()` and `destroy()` now null-guard `file_path`)
- `backend/routes/api.php` (`POST /admin/clients/{id}/gstr2b/no-bills`)
- `src/pages/admin/AdminClientGstr2b.jsx` (new button + "No Bills in GSTR-2B" badge in the
  Uploaded Statements table)

**Production checklist**:
1. `git pull origin main`
2. `cd backend && composer install --no-dev --optimize-autoloader --ignore-platform-req=ext-gd`
3. Back up `database.sqlite` first
4. `php artisan migrate --force` — applies the migration; no manual backfill SQL needed
5. `php artisan config:clear && php artisan route:clear && php artisan cache:clear`
6. `cd .. && npm ci && npm run build`
7. `sudo systemctl restart php8.4-fpm`
8. Verify: Admin → a client → GSTR-2B → pick a period with no upload yet → "Mark 'No Bills
   in GSTR-2B'" → confirm it shows the badge in the table. Then, as that client, confirm
   raising a GSTR-3B filing request for that exact period no longer shows "Reconciliation
   Pending" and can be submitted directly.
9. Flip this entry to ✅ with today's date once confirmed live

---

## ⬜ 2026-09-06 — HSN/SAC master code list import (21,935 HSN + 681 SAC codes)

**Migration**: None — `hsn_sac_codes` table already existed
(`2026_07_25_090000_create_hsn_sac_codes_table`). This is a pure data import, not a schema
change.

**What changed**: Imported the full official government HSN/SAC master list into
`hsn_sac_codes`. Before this, the table only had 23 HSN + 10 SAC demo/seed codes — real
invoices needing any HSN/SAC code outside that tiny list would find nothing in the HSN/SAC
search (Document creation → HSN/SAC field). Imported from a client-supplied file,
`HSN_SAC (1).xlsx` (sheets `HSN_MSTR` / `SAC_MSTR`, columns A=code/B=description — exactly
the format the existing `php artisan billing:import-hsn-sac` command expects). This session
had no PHP/artisan available locally, so the import was done straight into the local dev
`database.sqlite` via a one-off Python script instead — same upsert semantics as that command:
unique on `(type, code)`, only inserts new codes / updates matched ones, never touches or
deletes any other row.

**Why**: User reported "some code missing"; checked the local DB and found only 33 total
codes against 22,616 in the official government master.

**Behavior after this change**: No application code changed. The existing HSN/SAC search
endpoint (`Admin\MasterConfigController::hsnSacList`, used by `HsnSacSelect.jsx`) now has
full coverage automatically — nothing to wire up. This only *adds/updates* `hsn_sac_codes`
rows; it doesn't touch any client, party, or document data.

**Data backfill needed?** Yes — **this entire entry is the backfill.** Production's
`hsn_sac_codes` table almost certainly has the same small ~33-row seed set and needs the
identical import run against it.

**Files touched**: None — data-only, no code changed. Source file: `HSN_SAC (1).xlsx`
(client-supplied; not committed to the repo — get it from the user again, or reuse a saved
copy, before deploying this entry).

**Production checklist**:
1. Get `HSN_SAC (1).xlsx` onto the production server (e.g. `scp` it up).
2. SSH in, `cd /var/www/caindia/backend`
3. Back up `database.sqlite` first (per this file's header instructions) — always back up
   before any DB write, even an additive one.
4. `php artisan billing:import-hsn-sac "/path/to/HSN_SAC (1).xlsx"` — prints codes imported
   and final HSN/SAC totals (expect ~21,935 HSN / ~681 SAC).
5. No `migrate`, no `composer install`, no frontend build, no service restart needed — this
   only writes table rows, nothing schema- or code-related.
6. Verify: open any Document create form → HSN/SAC field → search for a code that previously
   wasn't found (e.g. full 8-digit HSN `01011010`) and confirm it now appears.
7. Flip this entry to ✅ with today's date once confirmed live.

---
