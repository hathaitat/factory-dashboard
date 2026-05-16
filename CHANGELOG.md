# Changelog

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
