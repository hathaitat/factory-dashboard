# Changelog

## [1.3.19] - 2026-06-24 - "Chart Date Bounds Full Period Fix"

### Fixed
- **กราฟรายเดือน/รายสัปดาห์/รายปี แสดงข้อมูลไม่ครบเดือน**:
  - แก้ไข `dateBounds` ใน `CustomLineChart.jsx` ที่ใช้ `endDate = วันนี้` ทำให้ข้อมูลของเดือนปัจจุบันแสดงไม่ครบ (เช่น PO ที่มี due_date หลังวันนี้แต่ยังอยู่ในเดือนเดียวกันจะไม่ถูกนับ)
  - **Monthly**: `endDate` เปลี่ยนเป็นวันสุดท้ายของเดือนปัจจุบัน
  - **Weekly**: `endDate` เปลี่ยนเป็นวันเสาร์ของสัปดาห์ปัจจุบัน
  - **Yearly**: `endDate` เปลี่ยนเป็น 31 ธ.ค. ของปีปัจจุบัน
  - ผลกระทบ: ทุก Tab ที่ใช้ `CustomLineChart` (ภาพรวม, PO, Invoice, Billing Note, Receipt, Supplier PO, ลูกค้า, ผู้ขาย, คลังสินค้า, ของใช้ฯ)

## [1.3.18] - 2026-06-23 - "Toggle Switcher CSS Refactoring"

### Improved
- **Premium Segmented Control Styling**:
  - Replaced the clunky, thick-bordered toggle buttons for grouping filters ("แยกตามหมวดหมู่" and "แยกตามรายการสินค้า") on the Internal Requisition tab with a premium segmented control look.
  - Implemented `.segmented-control` and `.segmented-button` classes in `src/index.css` featuring a soft pill design (`border-radius: 30px`), glassmorphism backdrop-blur, smooth transitions, and glowing shadow on the active item.

## [1.3.17] - 2026-06-06 - "Print Margins and Alignment Fix"

### Updated & Fixed
- **Certificate Receipt Print Margins Fix**:
  - Resolved the issue where the left and right print margins of "ใบรับรองแทนใบเสร็จรับเงิน" (`CertificateReceiptPage.jsx`) were not equal.
  - Replaced the hardcoded page margin (`margin: 0`) and page width (`width: 210mm`) print styles with standard A4 `@page` margins (`margin: 20mm 15mm 15mm 15mm`) and set layout containers to `width: 100%`. This guarantees perfectly symmetric and centered margins across all browsers and printing configurations.

## [1.3.16] - 2026-06-04 - "Certificate in Lieu of Receipt & Company Info Validation"

### Updated & Fixed
- **Company Info Form Input Validation (UAT Case SETUP-06)**:
  - Implemented client-side input validation on `CompanyInfoPage.jsx` when submitting the company form.
  - Enforced that logo, company name, address, phone number, email, and tax ID are required fields. If any are missing, the form submission is blocked and a friendly `useDialog()` popup alerts the user. Optional fax number is allowed to be empty.
  - Added a "ลบโลโก้" (Delete Logo) button to the logo section of the form to let users easily remove the logo for testing and editing.
  - Expanded `uat_test_script.md` with explicit validation scenarios (SETUP-06-01 to SETUP-06-08) matching the UAT spreadsheet specifications.
  - Enhanced Playwright bot test `company_info_bot_test.js` to simulate empty field submits, verify alert popups, and test successful submission without fax.
- **System Settings UAT Expansion (SETUP-16 to SETUP-22)**:
  - Updated `uat_test_script.md` with the new detailed testing steps and scenarios for the "ตั้งค่าระบบ" (System Settings) module based on UAT specifications: Working Hours, Late Penalty validations, Document Sequence dynamic formats (Invoice, Billing Note, Receipt), Auto Stock Deduction, Warehouse (Default checks, fields validation, and deletion item-transfer popups), and Supplier Categories creation/deletion lifecycle.
- **Certificate in Lieu of Receipt wording**:
  - Replaced the company name placeholder in the printable declaration sentence with the disburser name (`formData.disburserName`) as requested.
- **A4 Print Sizing and Overflow Fix**:
  - Fixed an issue where the printable certificate was slightly larger than standard A4 height (generating a blank 2nd page). Added dynamic CSS print overrides for `@page` layout (forcing `size: A4; margin: 0;`), locked `.invoice-paper` height to exactly `297mm` with safe margins (`15mm`), and adjusted baseline font size to `12pt` to ensure it fits perfectly on a single page.
- **Printable Signature Blocks Refactoring**:
  - Removed the third signature block `(กรรมการผู้จัดการ)` from the printed A4 layout.
  - Replaced the dynamic first signature name label with the static text `(ผู้เบิกจ่าย)` (to match the required blank signature line pattern).
  - Configured signature layout columns to distribute evenly across 2 columns (`width: 40%`, `justify-content: space-around`).
- **Printable Header Metadata Rearrangement**:
  - Moved `เล่มที่` (Book No.), `เลขที่` (Doc No.), and `วันที่` (Date) into a single row at the top of the details table.
  - Relocated `ชื่อกิจการ` (Company Name) to its own row below them, setting `colSpan={5}` to prevent text wrapping.
  - Rearranged the third row to display `ข้าพเจ้า` (Disburser Name) and `ตำแหน่ง` (Position) with consistent padding and spacing.
- **Header Spacing Height Increase & Inline Styles Elimination**:
  - Removed all inline styling from the metadata table header and the printable paper wrapper in [CertificateReceiptPage.jsx](file:///Users/bell/.gemini/antigravity/scratch/factory_dashboard/src/pages/CertificateReceiptPage.jsx).
  - Consolidated and moved styles into the component's internal `<style>` block.
  - Increased table cell vertical padding to `16px` to add tall vertical height spacing between lines as requested.
  - Cleaned up and completely eliminated all remaining inline styling (`style={{ ... }}`) from the items table, declaration paragraphs, baht summary boxes, and signature grids, refactoring them into clean CSS classes mapped in the style tag.
- **Permission System Integration**:
  - Registered a new dedicated module ID `certificate_receipts` with label `ใบรับรองแทนใบเสร็จ` in the permission matrix of [UserDetailPage.jsx](file:///Users/bell/.gemini/antigravity/scratch/factory_dashboard/src/pages/UserDetailPage.jsx) and [UserFormPage.jsx](file:///Users/bell/.gemini/antigravity/scratch/factory_dashboard/src/pages/UserFormPage.jsx).
  - Secured the sidebar link in [DashboardLayout.jsx](file:///Users/bell/.gemini/antigravity/scratch/factory_dashboard/src/layouts/DashboardLayout.jsx) with `hasPermission('certificate_receipts', 'view')`.
  - Secured the routing inside [App.jsx](file:///Users/bell/.gemini/antigravity/scratch/factory_dashboard/src/App.jsx) with `PermissionRoute module="certificate_receipts" action="view"`.

## [1.3.15] - 2026-06-03 - "Warehouse & Internal Items Negative Stock Color Highlight"

### Fixed
- **Negative Stock Highlighting**:
  - Resolved an issue where negative stock quantities (e.g. `-30`) were displayed in black rather than red when `min_stock` was `0` or unset.
  - Standardized low stock condition across `WarehouseListPage.jsx`, `WarehouseDetailPage.jsx`, `WarehouseTab.jsx`, and `OverviewTab.jsx` to be `item.quantity < 0 || (item.min_stock > 0 && item.quantity <= item.min_stock)`.
  - Updated internal items' low stock condition in `InternalItemListPage.jsx` and `internalItemService.js` to ensure negative internal stock levels also display in red.

## [1.3.14] - 2026-05-26 - "PO Number List View Font Size & Clickable Item Names"

### Updated & Improved
- **Supplier PO List Font Size**:
  - Increased the font size of the PO Number text in `SupplierPoListPage.jsx` from default small size to `1.25rem` (using monospace family). This improves readability and visibility of PO numbers as requested by the user.
- **Clickable Warehouse Item Names**:
  - Refactored `WarehouseListPage.jsx` to make item names under "ชื่อรายการ" clickable. Clicking an item now navigates directly to its inventory details/history page (`/dashboard/inventory/:id`), styled with standard blue link styling to match other list views.
- **Return Subcontracting Stock on Cancellation**:
  - Updated `cancelSupplierPo` in `src/services/supplierPoService.js` to automatically return raw material stock that was issued out when a subcontracting PO was created. If a subcontract PO is cancelled, the system now checks `inventory_logs` for the initial deduction and adds an 'IN' entry to return the stock.

## [1.3.13] - 2026-05-26 - "Sidebar Logo Customization"

### Updated & Improved
- **Custom Sidebar Logo**:
  - Replaced the placeholder `Hexagon` icon in the dashboard's `Sidebar` component header with the official customized logo image (`/images/logo-nobg.png`).
  - Added dedicated styling for the new `.sidebar-logo` image elements in `DashboardLayout.css` (specifically configuring height, width, and `object-fit` containment) to guarantee optimal layout display across responsive states and when the sidebar is collapsed.
  - Removed the unused `Hexagon` lucide-react import in `DashboardLayout.jsx` to clean up code dependencies.

## [1.3.12] - 2026-05-25 - "Customer & Supplier Branch Print Suffix Integration"

### Added & Improved
- **Dynamic Branch Suffix on Print Templates**:
  - Appended the customer's branch name (if it exists) next to their name in all document printing layouts: Billing Notes, Invoices, Quotations, and Receipts.
  - Appended the supplier's branch name (if it exists) next to their name in the Supplier Purchase Order (PO) printing template.
  - Appended the branch name in the Customer Product Purchase History report printing layout.
  - Format used: `${name} (สาขา ${branch})` to maintain clear document representation and auditability.

## [1.3.11] - 2026-05-25 - "Premium Action Buttons & Grid Wrap Refactoring"

### Added & Improved
- **Table Action Icons Multi-line Grid Wrap**:
  - Refactored `.table-actions` in `src/index.css` to support wrapping (`flex-wrap: wrap`) and set `max-width: 120px` along with adjusting `.actions-column` padding to `0.4rem` to split rows with 4 or more icons into a two-line layout (max 3 icons per row). This prevents the "จัดการ" column from being too wide and overlapping or pushing against the document code cell.
  - Updated [AGENTS.md](file:///Users/bell/.gemini/antigravity/scratch/factory_dashboard/AGENTS.md) with guidelines on "การตัดบรรทัดปุ่มจัดการ (Action Column Wrapping)" to ensure all future table implementations follow this layout standard.
- **Premium Save & Cancel Buttons Layout**:
  - Refactored `CertificateFormPage.jsx` buttons to use the application's standard premium styles (`btn-primary` and `btn-secondary`) instead of plain blue inline styles.
  - Added both "บันทึกข้อมูล" (Save) and "ยกเลิก" (Cancel) buttons to the top-right header section of `CertificateFormPage.jsx` to adhere to the design guidelines in `AGENTS.md` and keep it consistent with the bottom action buttons.
  - Restored hover translate animations, active status transitions, and shadow glows for a premium interactive feel.

## [1.3.10] - 2026-05-25 - "Action Icon Buttons Alignment Refactoring"

### Fixed & Improved
- **Clean Flexbox-based Action Buttons**:
  - Replaced the CSS Grid layout in `.table-actions` with a Flexbox layout (`display: flex; justify-content: center; gap: 0.5rem`). This fixes layout misalignment in tables with 1 or 2 buttons (e.g. without the "View" button) and centers action buttons horizontally in their column.
- **Nested Table Alignment Standards**:
  - Refactored the "รายการสินค้า (Products)" table in [CustomerDetailPage.jsx](file:///Users/bell/.gemini/antigravity/scratch/factory_dashboard/src/pages/CustomerDetailPage.jsx) and [SupplierDetailPage.jsx](file:///Users/bell/.gemini/antigravity/scratch/factory_dashboard/src/pages/SupplierDetailPage.jsx) to use standard CSS classes (`actions-column`, `table-actions`, `action-edit`, `action-delete`, and `action-link`) and removed custom inline styles that broke alignment.

## [1.3.9] - 2026-05-25 - "Double Save Buttons Form Pattern Integration"

### Added & Improved
- **Standardized Save Buttons Guidelines in AGENTS.md**:
  - Updated rules requiring all document creation and editing form screens to display Save buttons at both the top-right header and bottom of the form consistently.
- **Double Save Button Integration**:
  - Added header-level Save buttons to `CustomerForm.jsx`, `SupplierForm.jsx`, `UserFormPage.jsx`, `EmployeeFormPage.jsx` (Profile tab), and `CertificateFormPage.jsx` using form IDs and HTML5 submission.
  - Added bottom-level Save buttons to `CompanyInfoPage.jsx`, `InvoiceFormPage.jsx`, `PurchaseOrderFormPage.jsx`, `QuotationFormPage.jsx`, `BillingNoteFormPage.jsx`, `SupplierPoFormPage.jsx`, and `InternalRequisitionFormPage.jsx`.

## [1.3.8] - 2026-05-24 - "Last Updated Date & Time Integration"

### Added & Improved
- **Reusable LastUpdated Component**:
  - Created a reusable React component `LastUpdated.tsx` that displays the editor name and the formatted update timestamp using the Thai Buddhist calendar format.
- **Database Schema Migration**:
  - Added an `updated_at` column to the `staff_members` table and deployed a trigger function to keep it automatically up to date on user edits.
- **System-Wide Last Updated Display**:
  - Integrated `LastUpdated` into `UserFormPage.jsx`, `UserDetailPage.jsx`, `EmployeeFormPage.jsx`, `PurchaseOrderFormPage.jsx`, `CompanyInfoPage.jsx`, and `CertificateFormPage.jsx`.
- **Sidebar Navigation Consolidation**:
  - Combined "ลงเวลาทำงาน" (Timesheet) and "รายชื่อพนักงาน" (Employee List) into a single "รายชื่อพนักงาน" sidebar menu item, letting users toggle views inside the page itself.
- **Required Customer Fields**:
  - Enforced "เครดิต (วัน)" (Credit Term) and "ที่อยู่" (Address) as required inputs in the customer form with visual indicator asterisks.

## [1.3.7] - 2026-05-23 - "Company Info Audit & Hardcode Elimination"

### Fixed & Improved
- **Hardcoded Company Info Elimination**:
  - Removed hardcoded company name (`MULTIPLY AUTO WORKS CO.,LTD.` and `บริษัท มัลติพลายส์ ออโต้ เวิร์ค จำกัด`) and logo from [SupplierPoPrintTemplate.jsx](file:///Users/bell/.gemini/antigravity/scratch/factory_dashboard/src/components/SupplierPoPrintTemplate.jsx).
  - Ensured all print templates dynamically render the company name and metadata from the database via `companyService`.
- **Company Info UAT Testing**:
  - Expanded UAT script in [uat_test_script.md](file:///Users/bell/.gemini/antigravity/scratch/factory_dashboard/uat_test_script.md) with explicit test steps for Full Update, Partial Update, and Dynamic Print Preview Check.
  - Enhanced automated Playwright UAT test in [company_info_bot_test.js](file:///Users/bell/.gemini/antigravity/scratch/factory_dashboard/scripts/uat/general/company_info_bot_test.js) to automate verification of all company info update scenarios and print preview validations.

## [1.3.6] - 2026-05-21 - "Warehouse & Supplier PO System Audit & Quality Enhancements"

### Fixed & Improved
- **Payload Sanitization (Supplier PO / Subcontracting)**:
  - Excluded the frontend-only calculated `raw_material_qty` field from the insert/update payload for `supplier_po_items` to prevent database schema mismatch errors (`PGRST204` conflict).
- **Negative Stock Prevention & Safeguards**:
  - Blocked stock adjustments from going negative inside `warehouseService.js` to ensure inventory level integrity.
  - Restricted deletion of Supplier POs in `Partial` or `Completed` status within `supplierPoService.js` to safeguard historical transaction logs.
- **Supplier PO Inventory Delta Automation**:
  - Auto-adjusts delivery warehouse stock by processing only the delta quantity (`item.quantity - item.received_quantity`) when PO transitions to `Completed` status.
  - Automatically updates `received_quantity` in `supplier_po_items` to guarantee database consistency.
  - Enforced PO cancellation trigger only for `Draft` status via the detail page's Cancel button.
  - Standardized name comparison using a new `normalizeStr` helper to avoid casing and whitespace mismatches when matching inventory items.
- **UI/UX & Page Layout Alignment**:
  - Cleaned up duplicate dead code by removing `WarehouseInventoryComponent.jsx`.
  - Updated `WarehouseDetailPage.jsx` to place action buttons in the left-most column, fixed `colSpan` bug in the empty state row, and added a "กำลังมาเพิ่ม (Pending)" column matching `WarehouseListPage.jsx`.
  - Standardized `SupplierPoFormPage.jsx` with the common `PageHeader` component, moved save actions to the top-right header, and implemented "Confirm Before Leaving" dirty state verification dialogs.
- **Print Template Customization**:
  - Updated `SupplierPoPrintTemplate.jsx` to extract supplier's `contact_name` for the ATTN field, falling back to `-` if missing.
  - Added item-level `due_date` display in the items list table with PO-level delivery date fallback.

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
