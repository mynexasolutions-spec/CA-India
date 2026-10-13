# Fix Summary: Party Search & Decimal Formatting Production Defects

## Section 1: Git Status & History

### `git log --oneline -6`
```text
1b3d453 feat(billing): delete party with confirmation, blocked when documents exist
9ed5cc6 fix(billing): load all parties for document party search
68bade2 fix(hsn): show exact decimals in HSN report taxable value
c6445ea fix(pdf): keep 2 decimals for rate, taxable value and tax amounts in invoice PDF
8c5e1e5 fix
3ceab18 Gap equal
```

### `git diff --stat main..HEAD`
```text
 backend/app/Http/Controllers/Api/Billing/MasterController.php   | 29 +++++++++-
 backend/resources/views/pdf/invoice.blade.php                   | 18 +++----
 backend/routes/api.php                                          |  1 +
 src/components/ActionConfirmationModal.jsx                      | 61 ++++++++++++++++++----
 src/pages/billing/HsnSummaryPage.jsx                            |  4 +-
 src/pages/billing/InvoiceForm.jsx                               | 11 +++-
 src/pages/billing/PartiesPage.jsx                               | 58 +++++++++++++++++++-
 src/pages/billing/PartySearchSelect.jsx                         | 10 ++--
 8 files changed, 163 insertions(+), 29 deletions(-)
```

---

## Section 2: Tasks Implemented & Key Code Diffs

### Task 1: PDF Decimal Formatting
- **Commit**: `c6445ea` (`fix(pdf): keep 2 decimals for rate, taxable value and tax amounts in invoice PDF`)
- **Files Changed**:
  - `backend/resources/views/pdf/invoice.blade.php`
- **Key Line Changes**:
  - Item Rate:
    - *Before* (line 622):
      ```php
      <td class="text-right">{{ $fmtMoney($item->unit_price ?? 0) }}</td>
      ```
    - *After*:
      ```php
      <td class="text-right">₹{{ number_format((float) ($item->unit_price ?? 0), 2) }}</td>
      ```
  - Item Taxable Value:
    - *Before* (line 626):
      ```php
      <td class="text-right">{{ $fmtMoney($item->taxable_value ?? 0) }}</td>
      ```
    - *After*:
      ```php
      <td class="text-right">₹{{ number_format((float) ($item->taxable_value ?? 0), 2) }}</td>
      ```
  - Summary / Totals Table (Lines 696, 702, 706, 711, 719, 724):
    - Replaced `$fmtMoney(...)` with `₹{{ number_format((float) (...), 2) }}` for:
      - Taxable Amount (`$doc->taxable_amount`)
      - CGST (`$doc->cgst_amount`)
      - SGST (`$doc->sgst_amount`)
      - IGST (`$doc->igst_amount`)
      - CESS (`$doc->cess_amount`)
      - Total Tax Amount (`$doc->total_tax_amount`)
  - *Note*: Preserved Grand Total (`$fmtMoney($doc->total_amount)`) and Round Off formatting as required by specifications.

---

### Task 2: HSN Report Taxable Value Decimal Formatting
- **Commit**: `68bade2` (`fix(hsn): show exact decimals in HSN report taxable value`)
- **Files Changed**:
  - `src/pages/billing/HsnSummaryPage.jsx`
- **Key Line Changes**:
  - Table Row Taxable Value:
    - *Before* (line 459):
      ```jsx
      <td className="text-end font-monospace">{numFmt(row.taxable_value, 0)}</td>
      ```
    - *After*:
      ```jsx
      <td className="text-end font-monospace">{numFmt(row.taxable_value, 2)}</td>
      ```
  - Summary Footer Taxable Value:
    - *Before* (line 473):
      ```jsx
      <td className="text-end font-monospace">{numFmt(totals.taxable, 0)}</td>
      ```
    - *After*:
      ```jsx
      <td className="text-end font-monospace">{numFmt(totals.taxable, 2)}</td>
      ```

---

### Task 3: Load All Parties for Document Party Search
- **Commit**: `9ed5cc6` (`fix(billing): load all parties for document party search`)
- **Files Changed**:
  - `backend/app/Http/Controllers/Api/Billing/MasterController.php`
  - `src/pages/billing/InvoiceForm.jsx`
  - `src/pages/billing/PartySearchSelect.jsx`
- **Key Line Changes**:
  - Backend controller `parties()`:
    - Added support for `$request->boolean('all')` returning unpaginated, alphabetized list:
      ```php
      if ($request->boolean('all')) {
          return response()->json([
              'data' => $q->reorder('name')->get(),
          ]);
      }
      ```
    - Clamped `per_page` pagination parameter to `min(1000, max(1, (int) $request->input('per_page', 20)))`.
  - Frontend `InvoiceForm.jsx`:
    - Changed parties load query:
      ```javascript
      const partiesRes = await api('/billing/parties?all=1');
      ```
    - Added `window.addEventListener('focus', reloadParties)` to auto-reload parties when switching back from another browser tab.
  - Frontend `PartySearchSelect.jsx`:
    - Updated in-memory filtering to search across party fields safely with optional chaining:
      ```javascript
      const q = search.trim().toLowerCase();
      const filtered = q
        ? parties.filter((p) =>
            p?.name?.toLowerCase().includes(q) ||
            p?.gstin?.toLowerCase().includes(q) ||
            p?.proprietor_name?.toLowerCase().includes(q) ||
            p?.branch_name?.toLowerCase().includes(q) ||
            p?.phone?.toLowerCase().includes(q)
          )
        : parties;
      ```

---

### Task 4: Party Deletion with Confirmation & Document Guard
- **Commit**: `1b3d453` (`feat(billing): delete party with confirmation, blocked when documents exist`)
- **Files Changed**:
  - `backend/routes/api.php`
  - `backend/app/Http/Controllers/Api/Billing/MasterController.php`
  - `src/components/ActionConfirmationModal.jsx`
  - `src/pages/billing/PartiesPage.jsx`
- **Key Line Changes**:
  - Added Route (`backend/routes/api.php`):
    ```php
    Route::delete('/parties/{id}', [MasterController::class, 'destroyParty']);
    ```
  - Added Controller method `destroyParty($id)`:
    - Checks document existence via `CommercialDocument::where('customer_id', $id)->exists()`.
    - If documents exist:
      ```php
      return response()->json([
          'message' => 'Cannot delete party with existing documents.',
      ], 422);
      ```
    - Otherwise deletes the party model and returns `['message' => 'Party deleted successfully.']`.
  - Refactored `ActionConfirmationModal.jsx`:
    - Enhanced modal supporting `onConfirm`, `confirmLabel`, `cancelLabel`, `danger`, and `busy` states while maintaining backwards compatibility with `onDone`.
  - Updated `PartiesPage.jsx`:
    - Added Delete button in the Actions column next to Edit.
    - Integrated `ActionConfirmationModal` confirming deletion.
    - Handled deletion API call `api('/billing/parties/' + id, { method: 'DELETE' })`.
    - Displays user-friendly error banners on 422 ("Cannot delete party with existing documents") and auto-adjusts pagination page if the deleted party was the only item on that page.

---

## Section 3: Extra Files Checked for the Same Defect

1. **Blade PDF Templates**:
   - Checked `backend/resources/views/pdf/report.blade.php`:
     - Uses `number_format((float) $v, 2)` throughout for currency columns. No 0-decimal truncation defect exists.
   - Grep confirmed no other Blade PDF templates exist under `backend/resources/views/`.
2. **Billing Reports**:
   - Checked `GstSummaryPage.jsx` and `GstLiabilityReport.jsx`:
     - Currency and tax numbers already use 2 decimal places (`numFmt(..., 2)` or standard currency formatters).

---

## Section 4: Deployment Findings

1. **How Frontend Reaches Production**:
   - Per `DEPLOY.md` and `deploychnage.txt`, static files are built directly on the server:
     ```bash
     cd /var/www/abkhanassociates  # or /var/www/caindia
     git pull origin main
     npm install # or npm ci
     npm run build
     ```
   - Nginx serves the built static frontend directly from `dist/` (configured in Nginx vhost config).
2. **Git Tracking of Build Artifacts**:
   - `dist/` is listed in `.gitignore` and is **not tracked in git** (`git ls-files dist` returns empty).
   - No built frontend assets reside in `backend/public/` (which only contains backend static assets like `favicon.ico`, `robots.txt`, and `pdf-assets/`).
3. **Local Build Verification**:
   - Ran `npm run build` locally:
     - Vite build succeeded with exit code 0 (`built in 5.84s`).
     - No tracked git files were dirtied or altered.
   - Ran `npm run lint` (`oxlint`):
     - Passed with 0 errors across 106 files.

---

## Section 5: Manual Test Checklist for Human Verification

- [ ] **Test Case 1: PDF Decimal Precision**
  - Create or view an invoice with fractional quantities or rates (e.g., Rate = ₹123.45, Taxable Value = ₹1234.50, CGST/SGST = ₹111.10).
  - Download or open the PDF.
  - Verify that Item Rate, Taxable Value, CGST, SGST, IGST, and Tax Totals columns display exactly 2 decimal places (e.g., ₹123.45) rather than whole integers (₹123).
  - Verify that Grand Total and Round Off formatting remain unaffected and match existing requirements.

- [ ] **Test Case 2: HSN Summary Decimal Precision**
  - Navigate to **Reports > HSN Summary**.
  - Select a date range containing invoices.
  - Verify that each row's **Taxable Value** column displays exact 2 decimal places (e.g. ₹12,345.67).
  - Verify that the footer total row for **Taxable Value** displays exact 2 decimal places.

- [ ] **Test Case 3: Party Search - Access All Parties**
  - On an account with >20 parties (or create parties until count > 20), open the Invoice creation page (`/billing/invoices/new`).
  - Click on the Party search dropdown.
  - Search for a party that appears beyond the first 20 records (e.g. alphabetically near 'Z').
  - Verify that the party appears in the dropdown list and can be selected.

- [ ] **Test Case 4: Party Search - Focus Event Auto-Refresh**
  - Open the Invoice creation page in Tab 1.
  - Open **Parties** in Tab 2 and create a new party (e.g. "Test Auto Refresh Buyer").
  - Switch back to Tab 1 without reloading the page.
  - In the Party search field, search for "Test Auto Refresh Buyer".
  - Verify the new party appears immediately in the search results upon tab focus.

- [ ] **Test Case 5: Safe Party Deletion Guard**
  - **5A (Party with Documents)**:
    - In **Billing > Parties**, locate a party that is attached to at least one invoice or commercial document.
    - Click the Delete (trash) icon.
    - Confirm the action in the confirmation modal.
    - Verify deletion is blocked with an error banner: *"Cannot delete party with existing documents."*
    - Verify the party remains in the table.
  - **5B (Party without Documents)**:
    - Create a temporary party without any associated documents.
    - Click Delete and confirm in the modal.
    - Verify that the party is deleted successfully and removed from the table.

---

## Section 6: Open Questions & Considerations

1. **Vendor / Purchase Party Invoices**:
   - `CommercialDocument` table tracks both sales invoices and purchase bills through the `customer_id` column (which references the party master record). Therefore, blocking deletion when `customer_id` exists in `commercial_documents` protects both sales and purchase records from losing historical party details.
2. **Server Deployment Note**:
   - When deploying to production on EC2:
     - Run `composer install` and `php artisan route:clear && php artisan cache:clear` so the new DELETE route `/api/billing/parties/{id}` is recognized.
     - Run `npm run build` on the server so that the updated React bundle is built into `dist/`.
