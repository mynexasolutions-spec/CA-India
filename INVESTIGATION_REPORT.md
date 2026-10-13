# Investigation Report

## 0. Git state

```text
$ git status
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean

$ git branch --show-current
main

$ git log --oneline -5
8c5e1e5 fix
3ceab18 Gap equal
ab500f8 FIX
ee35abd Address icon
77eedff FIx
```

---

## 1. Defect 1: Party search + delete

### 1.1 Billing party search flow (frontend file, API call, backend route, controller, query)

- **Frontend files**:
  - Main Document Form: [`src/pages/billing/InvoiceForm.jsx`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/InvoiceForm.jsx)
  - Party Picker Component: [`src/pages/billing/PartySearchSelect.jsx`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartySearchSelect.jsx)
  - Renders in `InvoiceForm.jsx` at line 481:
    ```jsx
    <PartySearchSelect parties={parties} value={partyId} onSelect={onParty} />
    ```

- **API call made by `InvoiceForm.jsx`**:
  - **HTTP Method**: `GET`
  - **URL**: `/api/billing/parties` (via client helper `api('/billing/parties')` in [`src/pages/billing/InvoiceForm.jsx:180`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/InvoiceForm.jsx#L180))
  - **Query parameters**: *None* (`search`, `q`, `client_id`, `per_page`, `limit` are not passed).
  - **Response reading**:
    ```javascript
    // src/pages/billing/InvoiceForm.jsx:180
    api('/billing/parties').then((d) => setParties(d.data || []));
    ```
    It reads `d.data` (which for Laravel `LengthAwarePaginator` contains only the items on page 1).

- **In-memory Search Behavior in `PartySearchSelect.jsx`**:
  - The picker makes **no network calls** on user input. As stated in its docstring ([`src/pages/billing/PartySearchSelect.jsx:12-14`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartySearchSelect.jsx#L12-L14)):
    ```javascript
    /** Search-as-you-type party picker (Reference 2 mockup), reusing the already-loaded
     *  `parties` list — no extra network calls. "+ New" opens Add Company in a new tab so
     *  in-progress document details here are never lost. */
    ```
  - Filtering logic ([`src/pages/billing/PartySearchSelect.jsx:28-33`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartySearchSelect.jsx#L28-L33)):
    ```javascript
    const matches = query.trim()
      ? parties.filter((p) => (
        p.name.toLowerCase().includes(query.trim().toLowerCase())
        || (p.gstin || '').toLowerCase().includes(query.trim().toLowerCase())
      )).slice(0, 30)
      : parties.slice(0, 30);
    ```

- **Backend Route**:
  - File: [`backend/routes/api.php:102`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/routes/api.php#L102)
    ```php
    Route::middleware('auth:sanctum')->group(function () {
        ...
        Route::prefix('billing')->group(function () {
            ...
            Route::get('/parties', [MasterController::class, 'parties']);
    ```

- **Backend Controller & Query**:
  - File: [`backend/app/Http/Controllers/Api/Billing/MasterController.php:26-45`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Http/Controllers/Api/Billing/MasterController.php#L26-L45)
    ```php
    public function parties(Request $request)
    {
        $q = Customer::where('client_profile_id', $this->profileId($request))->latest();
        if ($request->filled('q')) {
            $s = $request->q;
            $q->where(function ($w) use ($s) {
                $w->where('name', 'like', "%{$s}%")
                    ->orWhere('gstin', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%");
            });
        }
        if ($request->filled('state')) {
            $q->where('state', $request->state);
        }
        if ($request->filled('gst_status')) {
            $q->where('gst_status', $request->gst_status);
        }

        return response()->json($q->paginate((int) $request->input('per_page', 10)));
    }
    ```
  - Query elements:
    - Scope: `where('client_profile_id', $this->profileId($request))` (authenticated client profile)
    - Order: `latest()` (`ORDER BY created_at DESC`)
    - Pagination: `->paginate((int) $request->input('per_page', 10))` — **defaults to 10 rows per page**.

---

### 1.2 Parties module flow (frontend file, API calls, controller, model, table)

- **Frontend files**:
  - Management Table / List: [`src/pages/billing/PartiesPage.jsx`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartiesPage.jsx) (Route: `/portal/billing/parties`)
  - Create / Edit Form: [`src/pages/billing/PartyForm.jsx`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartyForm.jsx) (Routes: `/portal/billing/parties/new` and `/portal/billing/parties/:id/edit`)

- **API calls used by Parties module**:
  - **List**:
    - Call in [`src/pages/billing/PartiesPage.jsx:46`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartiesPage.jsx#L46):
      `GET /api/billing/parties?q=${q}&state=${stateFilter}&gst_status=${gstFilter}&per_page=${perPage}&page=${targetPage}`
    - Backend route: `GET /api/billing/parties` -> `MasterController::parties`
  - **Create**:
    - Call in [`src/pages/billing/PartyForm.jsx:85`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartyForm.jsx#L85):
      `POST /api/billing/parties` with JSON body `{ name, proprietor_name, contact_person, email, phone, gst_status, gstin, state_code, state, billing_address, shipping_address, branch_name }`
    - Backend route: `POST /api/billing/parties` -> `MasterController::storeParty`
  - **Show (for Edit)**:
    - Call in [`src/pages/billing/PartyForm.jsx:57`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartyForm.jsx#L57):
      `GET /api/billing/parties/${id}`
    - Backend route: `GET /api/billing/parties/{id}` -> `MasterController::showParty`
  - **Update**:
    - Call in [`src/pages/billing/PartyForm.jsx:84`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartyForm.jsx#L84):
      `PUT /api/billing/parties/${id}` with JSON body
    - Backend route: `PUT /api/billing/parties/{id}` -> `MasterController::updateParty`
  - **Delete**:
    - **NOT FOUND**. Neither `PartiesPage.jsx` nor `PartyForm.jsx` has a delete button or calls a delete endpoint. `backend/routes/api.php` has no `DELETE /parties/{id}` route.

- **Model and Database Table**:
  - **Model**: [`App\Models\Customer`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Models/Customer.php)
  - **Table**: `customers`
  - **Migrations defining the schema**:
    - [`2026_07_14_100000_create_abkhan_core_tables.php:184-196`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/database/migrations/2026_07_14_100000_create_abkhan_core_tables.php#L184-L196): creates `id`, `client_profile_id` (foreign key constrained with `cascadeOnDelete`), `name`, `email`, `phone`, `gstin`, `state_code`, `billing_address`, `shipping_address`, `is_active` (boolean, default true), `created_at`, `updated_at`.
    - [`2026_07_14_160000_enhance_billing_portal_schema.php:11-15`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/database/migrations/2026_07_14_160000_enhance_billing_portal_schema.php#L11-L15): adds `contact_person`, `state`, `place_of_supply`.
    - [`2026_08_13_090000_add_gst_status_to_customers_table.php:12-14`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/database/migrations/2026_08_13_090000_add_gst_status_to_customers_table.php#L12-L14): adds `gst_status` varchar(20) default 'unregistered'.
    - [`2026_08_23_004503_add_proprietor_name_to_customers_table.php:11-16`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/database/migrations/2026_08_23_004503_add_proprietor_name_to_customers_table.php#L11-L16): adds `proprietor_name`.
    - [`2026_09_06_000000_add_branch_name_to_customers_table.php:11-16`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/database/migrations/2026_09_06_000000_add_branch_name_to_customers_table.php#L11-L16): adds `branch_name`.
  - **Soft Deletes**: **NONE**. The table has no `deleted_at` column, and `App\Models\Customer` does not use the `Illuminate\Database\Eloquent\SoftDeletes` trait.

---

### 1.3 Root cause (clear, one paragraph, backed by code snippets)

Both modules use the exact same database table (`customers`) and Eloquent model (`App\Models\Customer`), and write/read through `MasterController::parties()`. However, the Billing creation screen ([`src/pages/billing/InvoiceForm.jsx:180`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/InvoiceForm.jsx#L180)) fetches parties using an unparameterized call `api('/billing/parties')`, while the backend controller ([`backend/app/Http/Controllers/Api/Billing/MasterController.php:44`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Http/Controllers/Api/Billing/MasterController.php#L44)) paginates with `$q->paginate((int) $request->input('per_page', 10))`. Consequently, only the 10 most recently created parties for that client profile are returned in `d.data`. When the user types into the party search field, [`src/pages/billing/PartySearchSelect.jsx`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartySearchSelect.jsx) performs purely client-side in-memory filtering against that 10-item array without triggering any backend API query. If an existing party (such as `HARMONY INTERNATIONAL LOGISTICS SOLUTIONS`) is older than the latest 10 records, it was never loaded into the client-side state, causing the filter to evaluate to empty and display `"No matching parties"`. Additionally, in the multi-tenant architecture, all party queries are hard-scoped to the authenticated user's `client_profile_id` via `$this->profileId($request)` ([`MasterController.php:28`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Http/Controllers/Api/Billing/MasterController.php#L28)); if a user created a party under one business profile or is logged in under a different client profile, that party will not appear for the currently selected business.

```javascript
// src/pages/billing/InvoiceForm.jsx:180
api('/billing/parties').then((d) => setParties(d.data || [])); // Loads ONLY first page (10 records)
```

```php
// backend/app/Http/Controllers/Api/Billing/MasterController.php:44
return response()->json($q->paginate((int) $request->input('per_page', 10))); // Defaults to 10
```

```javascript
// src/pages/billing/PartySearchSelect.jsx:28-33
const matches = query.trim()
  ? parties.filter((p) => ( // Pure in-memory filter over the 10 loaded items; NO network call on typing
    p.name.toLowerCase().includes(query.trim().toLowerCase())
    || (p.gstin || '').toLowerCase().includes(query.trim().toLowerCase())
  )).slice(0, 30)
  : parties.slice(0, 30);
```

#### Detailed Answers to Brief Questions:
- **Do Billing search and the Parties module use the same table/model, or different ones?**
  They use the **same** table (`customers`) and the **same** model (`App\Models\Customer`).
- **Is there a filter in the Billing search (client id, financial year, status, party type such as customer/vendor, is_active, deleted_at) that excludes parties created via the Parties page?**
  No filter on financial year, party type, or `is_active` exists in `MasterController::parties()`. However, `client_profile_id` is unconditionally filtered to the authenticated client profile (`$this->profileId($request)`), and default pagination restricts the dataset to `limit 10 offset 0`.
- **Does the Parties module save fields (e.g. client_id, type, status) that the Billing search expects but that are saved as null/different?**
  No. Field names saved (`name`, `gstin`, `state_code`, `billing_address`) match what `InvoiceForm.jsx` expects.
- **Is the frontend reading the wrong response key, or does it require a minimum number of characters, or debounce, that may break the search?**
  The frontend reads `d.data`, which matches Laravel's paginated envelope. However, because it only ever receives the first page of 10 items and does not issue dynamic search requests on typing, search is constrained to those 10 loaded rows.
- **Is the search case-sensitive, or does it only search one column?**
  `PartySearchSelect.jsx` converts to lowercase (`.toLowerCase()`), but only searches `p.name` and `p.gstin`. It does not search `proprietor_name`, `branch_name`, or `phone`.
- **Is there a pagination or limit that hides results?**
  **YES.** This is the primary root cause. `MasterController::parties()` applies `per_page` with a default of `10`. `InvoiceForm.jsx` passes no `per_page`, receiving at most 10 items.
- **Is there any client scoping that could cause the party to belong to a different client?**
  Yes. In `MasterController.php:18`, `$profile = $request->user()->clientProfile` scopes all customer records to `client_profile_id`. If a company was entered under a different client account, it is inaccessible.
- **Check the data in local DB**:
  The local SQLite database (`backend/database/database.sqlite`) was queried across all tables. The party `HARMONY INTERNATIONAL LOGISTICS SOLUTIONS` was **NOT FOUND** in the local database. The local database contains 5 customer records:
  - ID 1: "Sample Buyer" (`client_profile_id`: 1)
  - ID 2: "Local Retail Counter" (`client_profile_id`: 3)
  - ID 3: "Coastal Retail Traders" (`client_profile_id`: 4)
  - ID 4: "ABC COMPANY PRIVATE LIMITED" (`client_profile_id`: 1)
  - ID 5: "BOARDWALA" (`client_profile_id`: 5)

---

### 1.4 Delete: current state, references, risks

- **Current state of Delete**:
  - In [`src/pages/billing/PartiesPage.jsx:174-176`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartiesPage.jsx#L174-L176), each table row contains only an "Edit" button:
    ```jsx
    <td>
      <Link to={`/portal/billing/parties/${p.id}/edit`} className="bp-btn bp-btn-outline" style={{ padding: '4px 8px' }}>Edit</Link>
    </td>
    ```
  - **No Delete button exists** on the page.
  - **No Delete route exists** in `backend/routes/api.php`.
  - **No Delete controller method exists** in `MasterController.php`.

- **Which tables reference a party? Foreign keys and onDelete behaviors**:
  - The table `commercial_documents` references `customers.id` via foreign key `customer_id`.
  - Defined in migration [`2026_07_14_100000_create_abkhan_core_tables.php:215`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/database/migrations/2026_07_14_100000_create_abkhan_core_tables.php#L215):
    ```php
    $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
    ```
  - SQLite foreign key pragma check:
    ```text
    Table commercial_documents references customers on customer_id (on_delete=SET NULL)
    ```

- **What happens to existing bills if a party is deleted?**
  - If a row in `customers` is deleted, SQLite/MySQL triggers `SET NULL` on `commercial_documents.customer_id`.
  - **Critical Risk**: `commercial_documents` does **not** duplicate or snapshot buyer fields (`name`, `gstin`, `billing_address`, `state`). All invoice views, PDFs, and export generators fetch buyer data dynamically via `$doc->customer` ([`CommercialDocument::customer()`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Models/CommercialDocument.php#L55)). If `customer_id` is set to null, historical tax invoices, debit notes, credit notes, and delivery challans will have null customer details, rendering blank buyer fields on invoices and corrupting tax audit records.

- **Does the model use `SoftDeletes`?**
  - **NO**. `Customer` has no `deleted_at` timestamp and does not import `SoftDeletes`.

- **Are deleted/inactive parties excluded from search?**
  - In `MasterController::parties()`, there is **no check** for `is_active` (`$q->where('is_active', true)` is missing). Even if a party has `is_active = false`, it is still returned in API results.

---

### 1.5 Proposed fix (files + changes, not applied)

1. **Fix Party Search in Billing**:
   - In [`src/pages/billing/InvoiceForm.jsx`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/InvoiceForm.jsx):
     - Line 180: change `api('/billing/parties')` to request all records for the client:
       ```javascript
       api('/billing/parties?per_page=1000').then((d) => setParties(d.data || []));
       ```
   - In [`backend/app/Http/Controllers/Api/Billing/MasterController.php`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Http/Controllers/Api/Billing/MasterController.php):
     - In `parties()`: allow `all=1` or `per_page=1000`, filter by active status (`$q->where('is_active', true)`), and order alphabetically or by usage:
       ```php
       public function parties(Request $request)
       {
           $q = Customer::where('client_profile_id', $this->profileId($request));
           if (! $request->boolean('include_inactive')) {
               $q->where('is_active', true);
           }
           ...
           if ($request->boolean('all')) {
               return response()->json(['data' => $q->orderBy('name')->get()]);
           }
           $perPage = min(1000, max(1, (int) $request->input('per_page', 10)));
           return response()->json($q->paginate($perPage));
       }
       ```
   - In [`src/pages/billing/PartySearchSelect.jsx`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartySearchSelect.jsx):
     - Enhance in-memory filter ([line 29-32](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartySearchSelect.jsx#L29-L32)) to also match against `p.proprietor_name`, `p.branch_name`, and `p.phone`.

2. **Implement Safe Delete Functionality**:
   - **Backend Route** in [`backend/routes/api.php`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/routes/api.php):
     ```php
     Route::delete('/parties/{id}', [MasterController::class, 'destroyParty']);
     ```
   - **Backend Controller** in [`backend/app/Http/Controllers/Api/Billing/MasterController.php`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Http/Controllers/Api/Billing/MasterController.php):
     ```php
     public function destroyParty(Request $request, int $id)
     {
         $pid = $this->profileId($request);
         $party = Customer::where('client_profile_id', $pid)->findOrFail($id);

         $hasInvoices = \App\Models\CommercialDocument::where('client_profile_id', $pid)
             ->where('customer_id', $id)
             ->exists();

         if ($hasInvoices) {
             return response()->json([
                 'message' => 'Cannot delete this company because existing invoices/documents are linked to it. You can deactivate it instead.'
             ], 422);
         }

         $party->delete();
         return response()->json(['message' => 'Company deleted successfully.']);
     }
     ```
   - **Frontend UI** in [`src/pages/billing/PartiesPage.jsx`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartiesPage.jsx):
     - Add Delete button in table rows next to Edit ([line 175](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/PartiesPage.jsx#L175)).
     - Bind click handler to open [`ActionConfirmationModal`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/components/ActionConfirmationModal.jsx) asking: *"Are you sure you want to delete this company? This action cannot be undone."*
     - On confirmation, dispatch `api(`/billing/parties/${party.id}`, { method: 'DELETE' })`.
     - Handle 422 responses by displaying the validation alert to the user.

---

## 2. Defect 2: Decimal rounding

### 2.1 Data flow table: field | frontend | request | DB column type | PDF template | HSN report

| Field | Frontend Input / State | Request Payload | DB Column Type | PDF Template (`invoice.blade.php`) | HSN Report (`HsnSummaryPage.jsx`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`qty`** | [`InvoiceForm.jsx:832`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/InvoiceForm.jsx#L832): `sanitizeDecimal(..., {decimals: 2})` | Numeric float, e.g. `1.0` | `decimal(12,3)` in `document_line_items` | [`L620`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L620): `number_format((float)$item->qty, 0)` **[ROUNDS TO WHOLE]** | [`L457`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/HsnSummaryPage.jsx#L457): `numFmt(r.qty, 2)` (2 decimals) |
| **`rate`** | [`InvoiceForm.jsx:850`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/InvoiceForm.jsx#L850): `sanitizeDecimal(..., {decimals: 2})` | Numeric float, e.g. `1000.5` | `decimal(14,2)` in `document_line_items` | [`L622`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L622): `number_format((float)$item->rate, 0)` **[ROUNDS TO WHOLE]** | *N/A* (grouped by HSN code) |
| **Line `taxable_amount`** | [`InvoiceForm.jsx:798`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/InvoiceForm.jsx#L798): `Number(l.qty)*Number(l.rate)` | Calculated by backend [`GstCalculator:36`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Services/Billing/GstCalculator.php#L36): `round(..., 2)` | `decimal(14,2)` in `document_line_items` | [`L626`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L626): `number_format((float)$item->taxable_amount, 0)` **[ROUNDS TO WHOLE]** | [`L459`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/HsnSummaryPage.jsx#L459): `numFmt(r.taxable, 0)` **[ROUNDS TO WHOLE]** |
| **Doc `taxable_amount`** | [`InvoiceForm.jsx:62`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/InvoiceForm.jsx#L62): `calcLocal()` | Calculated by backend [`GstCalculator:69`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Services/Billing/GstCalculator.php#L69): `round($taxable, 2)` | `decimal(14,2)` in `commercial_documents` | [`L696`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L696): `number_format((float)$doc->taxable_amount, 0)` **[ROUNDS TO WHOLE]** | [`L473`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/HsnSummaryPage.jsx#L473): `numFmt(totTaxable, 0)` **[ROUNDS TO WHOLE]** |
| **`cgst` / `sgst` / `igst`** | Computed in frontend & backend | Calculated by backend [`GstCalculator:44-48`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Services/Billing/GstCalculator.php#L44-L48): `round(..., 2)` | `decimal(14,2)` in `commercial_documents` & `document_line_items` | [`L702, 706, 711`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L702): `number_format(..., 0)` **[ROUNDS TO WHOLE]** | [`L460-462`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/HsnSummaryPage.jsx#L460): `numFmt(..., 2)` (2 decimals) |
| **`round_off`** | [`InvoiceForm.jsx:67`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/InvoiceForm.jsx#L67): `Math.round(sub) - sub` | Calculated by backend [`GstCalculator:85`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Services/Billing/GstCalculator.php#L85): `round($rounded - $subtotal, 2)` | `decimal(14,2)` in `commercial_documents` | [`L421`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L421): `number_format(abs($roundOffVal), 2)` (2 decimals) | *N/A* |
| **`grand_total`** | [`InvoiceForm.jsx:69`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/InvoiceForm.jsx#L69): `sub + round` | Calculated by backend [`GstCalculator:89`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Services/Billing/GstCalculator.php#L89): `round($subtotal + $roundOff, 2)` | `decimal(14,2)` in `commercial_documents` | [`L729, 738`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L729): `number_format((float)$grand, 0)` | *N/A* |

---

### 2.2 Every rounding point found (file:line, snippet, relevant yes/no)

| File : Line | Snippet | Relevant? | Notes |
| :--- | :--- | :--- | :--- |
| [`backend/resources/views/pdf/invoice.blade.php:620`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L620) | `{{ number_format((float) $item->qty, 0) }}` | **YES** | Drops decimals on item Quantity in PDF. |
| [`backend/resources/views/pdf/invoice.blade.php:622`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L622) | `{{ number_format((float) $item->rate, 0) }}` | **YES (ROOT CAUSE)** | Rounds ₹1,000.5 to 1,001 on PDF line item Rate. |
| [`backend/resources/views/pdf/invoice.blade.php:626`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L626) | `{{ number_format((float) $item->taxable_amount, 0) }}` | **YES (ROOT CAUSE)** | Rounds ₹1,000.5 to 1,001 on PDF line item Taxable Value. |
| [`backend/resources/views/pdf/invoice.blade.php:696`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L696) | `{{ number_format((float) $doc->taxable_amount, 0) }}` | **YES (ROOT CAUSE)** | Rounds Total Taxable Value to whole number in PDF totals box. |
| [`backend/resources/views/pdf/invoice.blade.php:702`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L702) | `{{ number_format((float) $doc->cgst_amount, 0) }}` | **YES** | Rounds CGST to whole rupee in PDF totals box. |
| [`backend/resources/views/pdf/invoice.blade.php:706`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L706) | `{{ number_format((float) $doc->sgst_amount, 0) }}` | **YES** | Rounds SGST to whole rupee in PDF totals box. |
| [`backend/resources/views/pdf/invoice.blade.php:711`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L711) | `{{ number_format((float) $doc->igst_amount, 0) }}` | **YES** | Rounds IGST to whole rupee in PDF totals box. |
| [`backend/resources/views/pdf/invoice.blade.php:719`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L719) | `{{ number_format((float) $doc->tds_tcs_amount, 0) }}` | **YES** | Rounds TDS deduction to whole rupee in PDF totals box. |
| [`backend/resources/views/pdf/invoice.blade.php:724`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L724) | `{{ number_format((float) $doc->tds_tcs_amount, 0) }}` | **YES** | Rounds TCS addition to whole rupee in PDF totals box. |
| [`src/pages/billing/HsnSummaryPage.jsx:459`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/HsnSummaryPage.jsx#L459) | `{numFmt(r.taxable \|\| r.taxable_value, 0)}` | **YES (ROOT CAUSE)** | Forces `dec = 0`, rounding HSN Taxable Value to whole number. |
| [`src/pages/billing/HsnSummaryPage.jsx:473`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/HsnSummaryPage.jsx#L473) | `{numFmt(totTaxable, 0)}` | **YES (ROOT CAUSE)** | Forces `dec = 0`, rounding HSN Total Taxable Value to whole number. |
| [`backend/resources/views/pdf/invoice.blade.php:421`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L421) | `number_format(abs($roundOffVal), 2)` | No | Intended behaviour: displays Round Off with 2 decimals. |
| [`backend/resources/views/pdf/invoice.blade.php:729, 738`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L729) | `number_format((float) $grand, 0)` | No | Intended behaviour: Grand Total after Round Off is integer. |
| [`backend/resources/views/pdf/invoice.blade.php:277`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L277) | `number_format((float) $r, 2)` | No | GST rate percentage formatter (`18.00` -> `18`). |
| [`backend/resources/views/pdf/report.blade.php:105`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/report.blade.php#L105) | `number_format((float) $v, 2)` | No | Report export PDF correctly formats currency to 2 decimals. |
| [`backend/app/Services/Billing/GstCalculator.php:31`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Services/Billing/GstCalculator.php#L31) | `round($qty * $rate, 2)` | No | Normal standard currency calculation to 2 decimal places. |
| [`backend/app/Services/Billing/GstCalculator.php:36`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Services/Billing/GstCalculator.php#L36) | `round(max(0, $gross - $discountAmount), 2)` | No | Normal standard currency calculation to 2 decimal places. |
| [`backend/app/Services/Billing/GstCalculator.php:84`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Services/Billing/GstCalculator.php#L84) | `$rounded = round($subtotal);` | No | Intended behaviour: calculates Round Off to nearest rupee. |
| [`backend/app/Services/Billing/GstCalculator.php:109-110`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Services/Billing/GstCalculator.php#L109-L110) | `(int) floor($amount); (int) round(($amount - $rupees)*100)` | No | Helper for `amount_in_words` (Rupees and Paise). |
| [`backend/app/Http/Controllers/Api/Billing/ReportController.php:390`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Http/Controllers/Api/Billing/ReportController.php#L390) | `round((float) ($arr['gst_rate'] ?? 0))` | No | Normalizes GST % rate in HSN summary export. |
| [`src/pages/billing/InvoiceForm.jsx:67`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/InvoiceForm.jsx#L67) | `Math.round(sub) - sub` | No | Intended behaviour: calculates Round Off in client form preview. |
| [`src/pages/billing/billingUtils.js:50-52`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/billingUtils.js#L50-L52) | `maximumFractionDigits: 2` | No | Custom helper `money()` preserves up to 2 decimal places. |
| [`src/pages/billing/InvoiceDetail.jsx:8-10`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/InvoiceDetail.jsx#L8-L10) | `maximumFractionDigits: 2` | No | View screen `money()` preserves up to 2 decimal places. |
| [`src/pages/billing/HsnSummaryPage.jsx:59-61`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/HsnSummaryPage.jsx#L59-L61) | `minimumFractionDigits: dec, maximumFractionDigits: dec` | No | `numFmt(v, dec = 2)` defaults to 2 decimals when called properly. |

- **Custom Helpers Behavior**:
  - `money(n)` in [`src/pages/billing/billingUtils.js:50`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/billingUtils.js#L50):
    ```javascript
    export function money(n) {
      return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }
    ```
    Preserves exact fractional numbers (e.g. `1000.5` renders as `₹1,000.5`).
  - `numFmt(v, dec = 2)` in [`src/pages/billing/HsnSummaryPage.jsx:59`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/HsnSummaryPage.jsx#L59):
    ```javascript
    function numFmt(v, dec = 2) {
      return Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    ```
    Correctly supports decimals when `dec = 2` is used, but was explicitly called with `0` for Taxable Value.

---

### 2.3 Root cause per symptom (PDF rate, PDF taxable, HSN taxable)

1. **PDF Rate (Rate ₹1,000.5 becomes 1,001 in PDF)**:
   - **Exact responsible file and line**: [`backend/resources/views/pdf/invoice.blade.php:622`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L622)
   - **Code**: `<td class="amt">{{ number_format((float) $item->rate, 0) }}</td>`
   - **Reason**: The second parameter `0` instructs PHP's `number_format()` to round the floating-point value to zero decimal places using standard half-up rounding (`1000.5` -> `1,001`).

2. **PDF Taxable Value (Taxable ₹1,000.5 becomes 1,001 in PDF)**:
   - **Exact responsible file and lines**:
     - Line Item: [`backend/resources/views/pdf/invoice.blade.php:626`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L626):
       `<td class="amt">{{ number_format((float) $item->taxable_amount, 0) }}</td>`
     - Summary Box: [`backend/resources/views/pdf/invoice.blade.php:696`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php#L696):
       `<td class="val">&#8377; {{ number_format((float) $doc->taxable_amount, 0) }}</td>`
   - **Reason**: Both locations specify `0` decimal places in `number_format()`, coercing `1000.5` to `1,001`.

3. **HSN report Taxable Value loses decimals (e.g. 3,00,001)**:
   - **Exact responsible file and lines**: [`src/pages/billing/HsnSummaryPage.jsx:459 and 473`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/HsnSummaryPage.jsx#L459)
   - **Code**:
     - Line 459: `<td ...>{numFmt(r.taxable || r.taxable_value, 0)}</td>`
     - Line 473: `<td ...>{numFmt(totTaxable, 0)}</td>`
   - **Reason**: While `qty`, `igst`, `cgst`, and `sgst` are formatted with `numFmt(..., 2)`, the Taxable Value and Total Taxable Value explicitly pass `0` as the `dec` argument, forcing `minimumFractionDigits: 0, maximumFractionDigits: 0`.

---

### 2.4 Is stored data already rounded? (evidence)

- **Finding**: **NO. The stored database values are NOT rounded.** Precision is preserved at save time; loss of precision occurs purely at presentation/formatting time.
- **Evidence from local SQLite database (`backend/database/database.sqlite`)**:
  - Direct read-only query on `document_line_items`:
    - Row 3: `taxable_amount = 184680`, `cgst_amount = 16621.2`, `sgst_amount = 16621.2`, `total_amount = 217922.4`
    - Row 7: `qty = 75`, `rate = 195`, `cgst_amount = 1316.25`, `sgst_amount = 1316.25`, `total_amount = 17257.5`
  - Direct read-only query on `commercial_documents`:
    - Row 29: `round_off = -0.4`, `taxable_amount = 194680`, `cgst_amount = 17521.2`, `total_amount = 229722.4`
    - Row 30: `round_off = 0.1`, `taxable_amount = 48555`, `cgst_amount = 4369.95`, `total_amount = 57294.9`
    - Row 31: `round_off = -0.06`, `taxable_amount = 15247.5`, `cgst_amount = 1372.28`, `total_amount = 17992.06`, `grand_total = 17992`
    - Row 33: `round_off = -0.05`, `taxable_amount = 15247.5`, `total_amount = 17992.05`, `grand_total = 17992`
  - Columns in migrations:
    - `document_line_items.rate`: `decimal(14,2)`
    - `document_line_items.taxable_amount`: `decimal(14,2)`
    - `commercial_documents.taxable_amount`: `decimal(14,2)`
    - `document_line_items.qty`: `decimal(12,3)`
  - **Conclusion**: Because stored records already retain accurate decimal values, **no data migration is needed**. Historical invoices will render accurate decimals immediately upon updating the presentation templates.

- **Check of other views / document types**:
  - Invoices list (`InvoiceList.jsx`), Invoice detail view (`InvoiceDetail.jsx`), and Dashboard (`BillingDashboard.jsx`) format amounts via `money()` which uses `maximumFractionDigits: 2`, preserving decimals on the web UI.
  - Export CSV and XLSX in `ReportController.php:xlsxDownload()` already use `NumberFormat ss:Format="#,##0.00"`.
  - All document types (`tax_invoice`, `bill_of_supply`, `credit_note`, `debit_note`, `quotation`, `delivery_challan`, `amendment`) share [`pdf/invoice.blade.php`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php). Therefore, fixing `invoice.blade.php` repairs all document types universally.

---

### 2.5 Proposed fix (files + changes, migration if needed, not applied)

- **Migration Required**: **NO**. Database column types are already `decimal(14, 2)` / `decimal(12, 3)` and data is intact.

- **File 1**: [`backend/resources/views/pdf/invoice.blade.php`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php)
  - **Line 620** (Quantity):
    - *Before*: `<td class="center qty-num">{{ number_format((float) $item->qty, 0) }}</td>`
    - *After*: `<td class="center qty-num">{{ (float) $item->qty == (int) $item->qty ? number_format((float) $item->qty, 0) : number_format((float) $item->qty, 2) }}</td>`
  - **Line 622** (Rate):
    - *Before*: `<td class="amt">{{ number_format((float) $item->rate, 0) }}</td>`
    - *After*: `<td class="amt">{{ number_format((float) $item->rate, 2) }}</td>`
  - **Line 626** (Line Taxable Amount):
    - *Before*: `<td class="amt">{{ number_format((float) $item->taxable_amount, 0) }}</td>`
    - *After*: `<td class="amt">{{ number_format((float) $item->taxable_amount, 2) }}</td>`
  - **Line 696** (Total Taxable Value):
    - *Before*: `<td class="val">&#8377; {{ number_format((float) $doc->taxable_amount, 0) }}</td>`
    - *After*: `<td class="val">&#8377; {{ number_format((float) $doc->taxable_amount, 2) }}</td>`
  - **Line 702** (CGST):
    - *Before*: `<td class="val">&#8377; {{ number_format((float) $doc->cgst_amount, 0) }}</td>`
    - *After*: `<td class="val">&#8377; {{ number_format((float) $doc->cgst_amount, 2) }}</td>`
  - **Line 706** (SGST):
    - *Before*: `<td class="val">&#8377; {{ number_format((float) $doc->sgst_amount, 0) }}</td>`
    - *After*: `<td class="val">&#8377; {{ number_format((float) $doc->sgst_amount, 2) }}</td>`
  - **Line 711** (IGST):
    - *Before*: `<td class="val">&#8377; {{ number_format((float) $doc->igst_amount, 0) }}</td>`
    - *After*: `<td class="val">&#8377; {{ number_format((float) $doc->igst_amount, 2) }}</td>`
  - **Line 719, 724** (TDS / TCS):
    - *Before*: `<td class="val">&#8377; {{ number_format((float) $doc->tds_tcs_amount, 0) }}</td>`
    - *After*: `<td class="val">&#8377; {{ number_format((float) $doc->tds_tcs_amount, 2) }}</td>`

- **File 2**: [`src/pages/billing/HsnSummaryPage.jsx`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/HsnSummaryPage.jsx)
  - **Line 459** (Row Taxable Value):
    - *Before*: `<td style={{ padding: '14px', textAlign: 'center', fontSize: 13, verticalAlign: 'middle', lineHeight: 1.4 }}>{numFmt(r.taxable || r.taxable_value, 0)}</td>`
    - *After*: `<td style={{ padding: '14px', textAlign: 'center', fontSize: 13, verticalAlign: 'middle', lineHeight: 1.4 }}>{numFmt(r.taxable || r.taxable_value, 2)}</td>`
  - **Line 473** (Total Row Taxable Value):
    - *Before*: `<td style={{ padding: '14px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#2563eb', verticalAlign: 'middle' }}>{numFmt(totTaxable, 0)}</td>`
    - *After*: `<td style={{ padding: '14px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#2563eb', verticalAlign: 'middle' }}>{numFmt(totTaxable, 2)}</td>`

- **Risk to Existing Invoices**:
  - **Zero Risk**. Because `DocumentController::pdf()` dynamically regenerates PDFs via `generatePdf()` upon request ([`DocumentController.php:310`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/app/Http/Controllers/Api/Billing/DocumentController.php#L310)), downloaded PDFs will immediately reflect exact decimal figures matching what the user sees in the web portal. Grand Total rounding (`round_off`) remains untouched and consistent.

---

## 3. Open questions / things I could not verify

1. **Production Tenant Context**:
   - The party `HARMONY INTERNATIONAL LOGISTICS SOLUTIONS` and the client profile `UNICO AIRCON` exist in the client's production MySQL database, not in the local development SQLite database (`backend/database/database.sqlite`).
2. **Local PHP CLI Environment**:
   - `php` is not registered in the system `PATH` on the local machine; all backend route verifications, code tracing, and database analyses were conducted via direct source analysis and Python's standard `sqlite3` driver.
3. **External Consumer Expectations**:
   - Whether any downstream third-party ERP or integration scripts parse downloaded PDF text specifically expecting integer numbers in the Rate column (extremely unlikely for accounting documents in India).

---

## 4. Suggested order of work and risk level

### Suggested Order of Execution:

1. **Step 1: Fix PDF Decimal Formatting in Blade View** (Lowest risk, immediate customer impact)
   - Edit [`backend/resources/views/pdf/invoice.blade.php`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/backend/resources/views/pdf/invoice.blade.php) lines 620, 622, 626, 696, 702, 706, 711, 719, 724 to use `number_format(..., 2)`.
   - **Risk Level**: **Very Low**. Affects only the presentation layer of downloaded and emailed PDFs. Stored data is untouched.

2. **Step 2: Fix HSN Summary Page Taxable Value Formatting** (Very low risk)
   - Edit [`src/pages/billing/HsnSummaryPage.jsx`](file:///c:/Users/LENOVO/OneDrive/Documents/projects/CA%20India/CA-India/src/pages/billing/HsnSummaryPage.jsx) lines 459 and 473 to use `numFmt(..., 2)`.
   - **Risk Level**: **Very Low**. Frontend presentation fix only.

3. **Step 3: Fix Billing Document Party Search Dropdown** (Low risk)
   - Update `InvoiceForm.jsx` to load all parties for the client (`/api/billing/parties?per_page=1000` or `all=1`).
   - Update `MasterController::parties()` to allow higher `per_page` limits or unpaginated listing for dropdowns, while adding an `is_active` filter.
   - Update `PartySearchSelect.jsx` matching logic to search across name, GSTIN, proprietor name, and branch.
   - **Risk Level**: **Low**. Ensures users can immediately find all existing parties when raising invoices.

4. **Step 4: Implement Safe Party Deletion** (Medium risk)
   - Implement `destroyParty()` in `MasterController.php` with foreign key protection (block deletion if linked commercial documents exist).
   - Register route `DELETE /api/billing/parties/{id}` in `backend/routes/api.php`.
   - Add Delete button and `ActionConfirmationModal` in `PartiesPage.jsx`.
   - **Risk Level**: **Low-to-Medium**. Strictly prevented from causing orphaned data by the server-side check.
