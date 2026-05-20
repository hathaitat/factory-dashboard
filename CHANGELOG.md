# Changelog

## [1.3.5] - 2026-05-19 - "Warehouse Code Enforcements & Formatting Display"

### Fixed
- **Subcontract PO ReferenceError & BOM auto-calculation**:
  - Resolved `ReferenceError: subcontractMaterialsList is not defined` inside `handleItemChange` in `SupplierPoFormPage.jsx` by checking `subcontractInventoryId` directly.
  - Automatically calculate and populate `subcontractQty` based on matching BOM rules when item quantity is modified.
  - Added UI to display the detailed calculation steps (e.g. `(คำนวณจากสูตร: สินค้า (200 x 1.000) = 200.00)`) and a warning note positioned directly above the `subcontractQty` input to instruct users to verify the auto-calculated amount.
- **BOM Rules RLS Policies**:
  - Fixed database RLS policies on `inventory_bom_rules` to support public access (anon role), resolving 400/404 errors during save operations.

### Added
- **Warehouse Code Validation**:
  - Enforced warehouse code field as required (`*`) in the warehouse form in `SettingsPage.jsx`.

### Improved
- **Code-First Warehouse Name Rendering**:
  - Automatically display the warehouse code first followed by the warehouse name (`[CODE] NAME`) across all views, dropdowns, lists, and pages:
    - **Warehouse list tabs** in `WarehouseListPage.jsx`.
    - **Warehouse management list** in `SettingsPage.jsx`.
    - **Dashboard summary lists** in `WarehouseTab.jsx`.
    - **Target delivery warehouses** in `SupplierPoFormPage.jsx` select dropdown options.
    - **Warehouse details page title** in `WarehouseDetailPage.jsx` and `WarehouseInventoryComponent.jsx`.
    - **Vendor PO detail view** in `SupplierPoDetailPage.jsx` and PO lists in `SupplierPoListPage.jsx`.
    - **Inventory movement stats panel** in `InventoryHistoryPage.jsx`.
  - Updated `warehouseService.js` and `supplierPoService.js` Supabase select queries to fetch warehouse codes and format logged warehouse names accordingly.

## [1.3.4] - 2026-05-19 - "Goods Receipt Incremental Input Logic"

### Added
- **Incremental Received Qty Logic (รับเพิ่มรอบนี้)**:
  - Transitioned the Goods Receipt (PO Receiving) input interface in `SupplierPoFormPage.jsx` from cumulative input to incremental input (received this round).
  - The input field now resets to `0` representing items received in *this round* instead of displaying/editing the cumulative total.
  - Automatically calculates and previews the updated cumulative received quantity (`ยอดรับรวมใหม่`) below the input field if the entered incremental quantity is greater than 0.
  - Limits the incremental input range to `[0, quantity - previous_received]` and provides user feedback via a custom `showAlert()` popup when the user exceeds the maximum allowed quantity for the current round (clamping it to the remaining amount).
  - Strips UI-only properties (`received_this_round`, `previous_received`) from the payload before saving to the database.

### Improved
- **UAT Bot Test Adaptation**:
  - Updated `scripts/uat/general/uat_bot_test.js` to use incremental inputs (Round 1: 80/0, Round 2: 10/80, Round 3: 15/20) matching the new UI logic.
  - Added alert dismissal handling to the test script for Round 3 to verify clamping alert popups and ensure the E2E test runs successfully.

## [1.3.3] - 2026-05-19 - "Supplier Automated UAT Test & Script Organization"

### Added
- **Supplier Automated UAT Test Script**:
  - Implemented `scripts/uat/supplier_bot_test.js` to test the full E2E CRUD lifecycle of Supplier (ผู้ขาย) data via UI (Create, Read, Update, Delete) with Dialog integrations.
  - Added new test scenario `CS-13` to `uat_test_script.md` and set status to **Passed (Bot)**.

### Improved
- **Script Directory Reorganization**:
  - Moved UAT testing scripts to `scripts/uat/` and diagnostic helper scripts to `scripts/helpers/` to keep the codebase clean and tidy.

## [1.3.2] - 2026-05-19 - "PO Cancellation Stock Deduction & UAT Verification"

### Fixed
- **PO Cancellation Stock Deduction Logic**:
  - Updated `cancelSupplierPo` in `src/services/supplierPoService.js` to support partial or fully received status, accurately deducting inventory based on the actually received quantity (`received_quantity`) instead of the ordered quantity (`quantity`).
- **UAT Bot Test Button Selectors**:
  - Replaced ambiguous button selectors (like `text=ตกลง` and `text=ยืนยัน`) in `scripts/uat_bot_test.js` with specific `button:has-text(...)` selectors to prevent clicking incorrect title/body texts.

### Added
- **PO Cancellation & Stock Deduction Verification (Step 2.5)**:
  - Added step 2.5 to `scripts/uat_bot_test.js` to verify that when a PO is cancelled, the inventory level of received items in the delivery warehouse is correctly deducted in the database via direct Supabase assertions.

## [1.3.1] - 2026-05-19 - "Supplier PO Received Qty DB Sync"

### Fixed
- **Supplier PO Received Quantity Synchronization**:
  - Resolved database data integrity bug where `total_received_quantity` remained `0.00` in the `supplier_pos` table despite updates.
  - Implemented SQL database migration `20260519000001_sync_total_received_qty.sql` adding a trigger function `update_supplier_po_total_received` on `supplier_po_items` to automatically keep `total_received_quantity` inside the `supplier_pos` table in sync with the sum of items' `received_quantity`.
  - Updated `createSupplierPo` and `updateSupplierPo` in `src/services/supplierPoService.js` to compute and send `total_received_quantity` to ensure frontend-level consistency.

### Added
- **Multi-Step PO Receipt UAT & Bot Testing**:
  - Added new test case `DOC-09` (Multi-Step PO Goods Receipt) to `uat_test_script.md`.
  - Implemented automated reset script `scripts/reset_po_received_qty.js` to automatically prepare the database state.
  - Updated `scripts/uat_bot_test.js` to perform three consecutive goods receipt steps (80/0, 90/80, 100/100) and verify the final Completed status.

## [1.3.0] - 2026-05-19 - "Automated UAT Bot Test Integration"

### Added
- **Automated UAT Bot Testing Suite**:
  - Successfully executed a comprehensive automated "bot test" on the running application using the credentials `admin_bell` / `bellbabl1.`.
  - Implemented honeypot bypass logic (leaving `website_url_confirm` blank) to simulate real-user logging in and verify authorization.
  - Validated navigation, data loading, and layout rendering for 6 core pages: *คลังสินค้า (Warehouse)*, *ของใช้ในโรงงาน (Internal Items)*, *ลูกค้า (Customers)*, *รายชื่อพนักงาน (Employees)*, *ข้อมูลบริษัท (Company Info)*, และ *สิทธิ์การใช้งาน (User Permissions)*.
  - Created a permanent, runnable automated Playwright test script at `scripts/uat_bot_test.js` to allow easy local execution and continuous validation.
- **UAT Test Script Updates**:
  - Integrated automated testing documentation, credentials, and steps into `uat_test_script.md`.
  - Added an absolute link to the recorded WebP video session demonstrating the bot test's successful execution.
  - Updated critical test case statuses (`AUTH-01`, `DB-01`, `DB-04`, and `SYS-04`) to **Passed (Bot)**.

## [1.2.0] - 2026-05-16 - "Internal Requisition System"


### Added
- **Internal Requisition Module**: Fully integrated system for tracking factory supplies and equipment purchases/withdrawals.
  - New DB Schema with categories, items, and requisition history.
  - Category-based inventory management with low-stock alerts.
  - Auto-numbering for PUR (Purchase) and WDR (Withdrawal) documents.
  - Stock adjustment logic that automatically updates inventory upon completion.
- **Dashboard Integration**: Added "ของใช้ในโรงงาน" tab to the main Overview page to show stock KPIs and recent history.
- **Permission Matrix Update**: Added `internal_items` module to User Permissions for granular access control.
- **Updated AGENTS.md**: Added mandatory guidelines for adding new modules (Permissions and Dashboard integration).

### Improved
- **Sidebar Navigation**: Organized Internal Items and Requisitions under the Warehouse & Production group.

## [1.1.0] - 2026-05-16 - "Supplier PO & UAT Readiness"

### Added
- **AI Agent Guidelines (`AGENTS.md`)**: Formalized development rules, safety boundaries, and design standards for AI-assisted coding.
- **UAT Test Framework (`uat_test_script.md`)**: Created a comprehensive test script covering 6 critical modules for formal manual testing.
- **NPM Test Integration**: Added `npm run test` script to provide easy access to UAT documentation.

### Improved
- **Supplier PO Print Layout**: 
  - Hard-coded A4 dimensions (210mm x 297mm) with 15mm safety margins.
  - Optimized vertical spacing to ensure document fits on a single page.
  - Added product image support within PO table items.
  - Standardized font sizes and border consistency for professional output.
- **CRM/SRM Testing**: Expanded test cases to include data integrity checks for referenced entities and tab-based navigation.

### Fixed
- Fixed vertical overflow issue in Supplier PO print template when items exceeded 5 rows.
- Refined signature block alignment in print templates.

## [1.0.0] - 2026-04-27 - "Factory Dashboard V1"

### Added
- **Premium Dashboard Interface**: New tab-based navigation with 9 dedicated modules (Overview, PO, Quotation, Invoice, Billing Note, Receipt, Customer, Employee, Calendar).
- **Data Visualization**: Integrated `CustomLineChart` with dual-metric support (Amount | Quantity) and grouping by customer.
- **Auto-Status Management**: Smart Purchase Order status updates based on linked invoice delivery quantities.
- **Document Traceability**: Added `Created At` and `Last Modified` timestamps to all primary documents.
- **Enhanced Customer Profiles**: Added dedicated fields for `poNote` and `invoiceNote` to show critical alerts during document creation.
- **Premium UI Components**: Standardized loading spinners, pulse status dots, and glassmorphism panels using CSS variables.

### Improved
- **Document Generation**: Standardized date formatting to Thai Buddhist Era (+543) and currency display (฿) across the entire system.
- **Navigation & Layout**: Improved `DashboardLayout` with better padding, refined sidebar icons, and a global `PageLoader`.
- **Search & Filtering**: Comprehensive list filters with date-range selection and search-by-multiple-fields.

### Fixed
- Fixed hardcoded hex colors to use a centralized CSS variable theme.
- Improved invoice number generation logic to better handle sequence prefixes.
