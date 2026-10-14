# CURATED - V1 E-Commerce Website
## Business Requirements Document (PRD Reference)
**SEARCHED • FILTERED • QUALITY CHECKED • HANDPICKED**

---

### Document Control & Overview
- **Brand:** CURATED
- **Document Version:** 1.1 (Developer Draft & Permanent Reference)
- **Date:** 3 October 2026
- **Business Owner:** Nikhil Pol
- **Prepared For:** Website Development Team
- **Market & Currency:** India, INR (₹)
- **Primary Device:** Mobile-first (responsive desktop support)
- **Status:** Complete Developer Draft & Implementation Reference

---

### How to Read This Document
- **Priority:**
  - **P0:** Must be in the launch build.
  - **P1:** Important, built in V1 if it does not delay P0.
  - **P2:** Future scope, deferred.
- **Requirement IDs:** Every requirement is indexed (e.g., `INV-07`, `PC-12`, `SF-13`, `CK-05`).
- **Decisions:** Open decisions reference IDs (`D-01` through `D-15`). Built to recommended defaults unless overridden in writing.
- **Figures:** All price points, costs, and margins are working assumptions and dynamically configured—never hard-coded.

---

## 1. Executive Summary
CURATED is an Indian fashion retail brand built on a singular premise:
**SEARCHED • FILTERED • QUALITY CHECKED • HANDPICKED**

CURATED actively scouts quality fashion garments across diverse legitimate sources, eliminates the vast majority of items that fail strict aesthetic and physical standards, rigorously inspects what remains, and sells only the handpicked pieces that make the grade.

CURATED is **not** positioned as a thrift store, export-surplus discount outlet, or wholesale reseller. Sourcing origins remain strictly internal operational data; the discerning curation is the brand identity.

### What Distinguishes This Build from Standard E-Commerce
1. **Extremely Low Stock per Listing:** The predominant SKU pattern is **one-of-one** (stock = 1). Over-selling or double-selling the last physical garment is the single most catastrophic failure mode for the business.
2. **Two Sales Channels, Single Stock Pool:** Inventory is simultaneously sold online through the website and offline in person by the owner. Real-time atomic synchronization is mandatory.
3. **Weekly Batch Drops:** The owner uploads 40–50 garments per batch, predominantly using a mobile phone. Rapid product entry with remembered supplier/category defaults is critical.
4. **Transparent Physical Condition:** Every garment details its precise condition and any minute defects. Pre-owned items are never misrepresented as brand new.
5. **Verified "SOLD OUT" Archive:** Archived past pieces and authentic sold counts serve as genuine social proof. Numbers are calculated strictly from recorded database transactions.
6. **No Return Policy with Governed Exceptions:** Mandatory checkout acknowledgement. Exceptions (wrong item, undisclosed major flaw, shipping damage) follow a strict, auditable administrative workflow.
7. **Single Non-Technical Administrator:** Daily management requires a zero-friction, touch-friendly administrative experience without developer intervention.

---

## 2. Business Context & Brand Identity

### 2.1 Brand Standards
- **Name:** CURATED
- **Tagline:** `SEARCHED • FILTERED • QUALITY CHECKED • HANDPICKED` (mandatory exact wording and order)
- **Core Line:** *We search everywhere so our customers don't have to.*
- **Color Palette:** Deep Black (`#0B0B0C`), Champagne/Warm Gold (`#D4AF37` / `#C5A059`), Warm Ivory (`#F7F4EE` / `#EFECE6`), Slate Neutral (`#1E1E22`).
- **Voice & Tone:** Minimalist, editorial, confident, plainspoken, restrained. Never shouting, never discount-heavy or warehouse-like.

### 2.2 Sourcing & The Selection Process
1. **SEARCHED:** Scouted across brand surplus, export surplus, retail, wholesale, and curated thrift.
2. **FILTERED:** Unsuitable fabrics, poor fits, or mediocre silhouettes are rejected.
3. **QUALITY CHECKED:** Physical inspection covering stitching, prints, collar, pilling, buttons, and precise measurements.
4. **HANDPICKED:** Only approved pieces are photographed, cataloged, and released in weekly drops.

---

## 3. Objectives & Key Metrics
- Establish a trustworthy, high-conversion, mobile-first brand storefront.
- Real-time online/offline atomic inventory synchronization preventing double-sales.
- Rapid mobile catalog entry (under 60 seconds per piece).
- Transparent condition grading and exact measurements to minimize post-purchase friction.
- Seamless guest checkout with automated 10-minute holds, UPI/Card simulation, and sequential order generation.
- Clear No Return Policy enforcement with structured exception claim handling.

---

## 4. Scope Breakdown

### 4.1 In Scope (P0 & P1)
- **Storefront (P0):** Homepage (Hero, New Drops, Categories, How it Works, Selected Pieces, Social Proof, Footer), Shop & Category views (`/shop`, `/shop/:category`), Search with fuzzy matching, Multi-faceted Filters, Product Detail Page (`/product/:slug`), New Drops view (`/new-drops`), SOLD OUT section (`/sold-out`) with admin toggle, About (`/about`), Contact (`/contact`), Policy pages (`/policies/:slug`), Cart drawer/page with real-time stock verification, Guest Checkout, Order Confirmation, Track Order lookup (`/track-order`).
- **Commerce Engine (P0):** Shared inventory ledger, 10-minute atomic reservation hold, concurrency protection, offline "Mark as Sold" in 2 taps, sequential order numbers (e.g. `CUR-1001`), exception management.
- **Admin Panel (P0):** Mobile-first single admin panel, mobile camera upload, quick defaults, inventory ledger, offline sales recording & voiding, order status management, printable packing slips, exception resolution, settings configuration, CSV exports, activity log.
- **P1 Items:** WhatsApp click-to-chat with pre-filled SKU links, aging-stock dashboard view (>30 days), editable homepage hero, GA4 standard e-commerce event triggers, CSV export for margin/lot analysis.

### 4.2 Out of Scope (P2)
- Customer accounts/logins, customer wishlists, customer reviews, product videos.
- Cash on Delivery (COD) at launch (prepaid only).
- Multi-role RBAC permissions.
- Automated WhatsApp Business API bots (manual click-to-chat links only).
- Courier aggregator automated shipping APIs (manual AWB entry in V1).

---

## 5. Universal Business Rules
- `BR-01`: CURATED is the sole seller; no third-party marketplace listings.
- `BR-02`: Garment sourcing origin is strictly an internal operational field.
- `BR-03`: Restricted claims (Authentic, Rare, Worn once, etc.) require admin verification before publishing.
- `BR-04`: Every product specifies an explicit condition grade (`New / Unused`, `Excellent - Pre-Owned`, `Very Good - Pre-Owned`).
- `BR-05`: Single source of truth for inventory across online and offline channels.
- `BR-06`: Concurrency protection: physical units can never be oversold.
- `BR-07`: Zero fabricated urgency (e.g. no fake countdowns or false viewer counts). "Only 1 left" renders only when available quantity is exactly 1.
- `BR-08`: Pieces sold counts calculate directly from verified database orders.
- `BR-09`: Sold units are archived; hard deletion is prohibited once a transaction exists.
- `BR-10`: Prices are dynamic per product; zero hard-coded currency values.
- `BR-11`: Customer personal data, cost prices, lots, and supplier names are strictly confidential.
- `BR-12`: No Return Policy acknowledgment is a prerequisite to checkout.
- `BR-13`: Returned exception units require mandatory manual inspection before restock.
- `BR-14`: No raw payment card/UPI PIN data touches CURATED infrastructure.
- `BR-15`: Publishing requires passing all PC-12 validation checks.

---

## 6. Detailed Requirements Matrix

### 6.1 Product Catalogue (`PC`)
- `PC-01`: Categories (T-Shirts, Shirts, Jackets, Hoodies) and subcategories stored as data.
- `PC-02`: Products map to single category/subcategory pairs.
- `PC-03`: Condition values: `New / Unused`, `Excellent - Pre-Owned`, `Very Good - Pre-Owned`.
- `PC-04`: Condition badge and condition notes displayed together prominently on product pages.
- `PC-05`: Garments with unacceptable defects are blocked from listing via QC checks.
- `PC-06`: Restricted claim verification required when sensitive keywords are detected.
- `PC-07`: Stored prices: Selling Price, Original Price (optional strike-through), Cost Price (internal).
- `PC-08`: Strike-through renders only if Original Price > Selling Price.
- `PC-09`: Multiple images per product; primary image acts as catalog thumbnail.
- `PC-10`: Direct mobile camera capture and gallery batch upload support.
- `PC-11`: Automatic aspect ratio optimization (4:5 portrait) and auto-alt tags.
- `PC-12`: **Publishing Gates:** Name, category, condition, selling price > 0, >= 1 image, measurements, stock >= 1, and QC Passed = Yes.
- `PC-13`: Auto-generated unique SKU format (e.g. `CUR-TS-001`, `CUR-SH-001`).

### 6.2 Inventory & Ledger (`INV`)
- `INV-01`: Unified database ledger as the solitary source of truth.
- `INV-02`: Immutable transaction ledger recording every stock variation (`Initial Stock`, `Online Sale`, `Offline Sale`, `Restock`, `Return/Exception`, `Damaged`, `Manual Adjustment`, `Correction`).
- `INV-03`: Inventory constraint: `stock_on_hand >= 0`. Negative stock is rejected at DB layer.
- `INV-04`: Dynamic status derivation: `stock_on_hand == 0` triggers `Sold Out`.
- `INV-05`: State handling: `available == 0` but `reserved > 0` shows *"Unavailable right now"*.
- `INV-06`: For 1-of-1 pieces, quantity input is locked at 1.
- `INV-07`: Inventory health tracking: Live pieces, Sold this week, Aging stock (>30 days).
- `INV-08`: Cart addition does **not** hold stock.
- `INV-09`: Hold initiated upon payment checkout initiation (`Hold` state).
- `INV-10`: Hold duration defaulted to 10 minutes (configurable).
- `INV-11`: Hold automatically expires/releases upon payment failure, abandonment, or timeout.
- `INV-12`: Gateway payment confirmation converts Hold to confirmed Sale and debits stock.
- `INV-13`: Late payment edge-case: If hold expired and stock was claimed offline, system initiates automatic refund and notifies admin/customer.
- `INV-14`: Webhook handling is strictly idempotent.
- `INV-15`: Customer with active hold can retry within the 10-minute window without losing allocation.
- `INV-16` to `INV-18`: Atomic transactional updates (row locking/mutex). Automated test verifying 20 parallel requests against 1 stock unit results in exactly 1 success.
- `INV-19` to `INV-24`: Mobile-optimized "Mark as Sold" in 2 taps with negotiated price, payment mode, hold conflict warning, and one-tap void with reason.

### 6.3 Storefront Experience (`SF`)
- `SF-01` to `SF-05`: High-end editorial navigation, mobile drawer, Champagne & Deep Black palette, WhatsApp chat integration.
- `SF-06` to `SF-11`: Shop catalog, faceted filters (Category, Size, Price, Condition, Fit), fuzzy search, empty states.
- `SF-12` to `SF-19`: Product cards with New Drop badges, comprehensive PDP with measurements table, honesty badge, native share sheet, disabled out-of-stock sizes.
- `SF-20` to `SF-22`: New Drops batch management and storefront spotlighting.
- `SF-23` to `SF-29`: Verified "SOLD OUT" archive with genuine pieces sold metrics, admin toggle switch, and clean fallback.
- `SF-30` to `SF-33`: About narrative, Contact portal with admin inbox, Policy pages, Track Order lookup by Order ID + Mobile.

### 6.4 Cart & Checkout (`CK`)
- `CK-01` to `CK-02`: Cart line items, real-time availability validation on open.
- `CK-03` to `CK-04`: Guest checkout with 10-digit mobile & 6-digit pincode validation.
- `CK-05` to `CK-06`: Mandatory No Return Policy checkbox with recorded timestamp and version.
- `CK-07` to `CK-10`: Seamless payment initiation, 10-minute hold countdown, mobile numeric keypads.
- `CK-11`: Sequential formatted order numbers (`CUR-1001`).

### 6.5 Payments (`PAY`)
- `PAY-01` to `PAY-04`: Indian gateway integration (UPI, Card, Net Banking), server-side signature verification, idempotent webhooks.
- `PAY-05`: Administrative one-click full/partial refund processing.
- `PAY-06`: Prepaid only (COD disabled at launch).
- `PAY-07`: Strict PCI compliance: zero card details stored on CURATED servers.

### 6.6 Shipping & Fulfilment (`SHP`)
- `SHP-01`: Domestic shipping across India.
- `SHP-02`: Configurable flat shipping fee and free-shipping order threshold.
- `SHP-04`: Courier name, AWB tracking number, and tracking URL management.
- `SHP-05`: Clean, printable packing slip generation.

### 6.7 Order Lifecycle (`ORD`)
- Status flow: `PENDING_PAYMENT` -> `CONFIRMED` -> `PROCESSING` -> `PACKED` -> `SHIPPED` -> `DELIVERED`.
- Cancellation & Exception states: `CANCELLED`, `EXCEPTION_RAISED`, `REFUND_INITIATED`, `REFUNDED`.
- Offline orders: `COMPLETED` immediately.

### 6.8 No Return Policy & Exceptions (`RET`)
- `RET-01` to `RET-02`: Policy ubiquitous across PDP, checkout, confirmation, and emails.
- `RET-03` to `RET-08`: Exception triage (Wrong item, materially incorrect, undisclosed defect, shipping damage) within 48-hour claim window.
- `RET-09` to `RET-10`: Returned unit quarantine: inspection pass restocks with `Return/Exception` ledger entry; inspection fail marks `Damaged`.

### 6.9 Admin Control Center (`ADM`)
- `ADM-01` to `ADM-03`: Single admin credentials, session security.
- `ADM-04` to `ADM-05`: Live KPIs (Live pieces, Sold counts, Revenue, AOV, Aging stock).
- `ADM-06` to `ADM-11`: Touch-friendly product catalog, remembered defaults, bulk actions, non-destructive archiving.
- `ADM-12` to `ADM-15`: Inventory ledger, offline sales recorder, orders manager, exceptions inbox.
- `ADM-16` to `ADM-19`: Store settings, hero banner management, CSV export, activity audit log.

---

## 7. Open Decisions Register (`D-01` to `D-15`)
| ID | Decision | Default Recommendation |
|---|---|---|
| `D-01` | Hold duration during checkout | 10 minutes (configurable in settings) |
| `D-02` | Cash on delivery at launch | No. 100% Prepaid to eliminate RTO |
| `D-03` | Shipping charge model | Flat ₹99, Free on orders ₹1499+ |
| `D-04` | Size exchange / store credit | None in V1; strict adherence to No Return |
| `D-05` | Exception claim window | 48 hours post-delivery |
| `D-06` | GST registration status | Tax-inclusive pricing supported |
| `D-07` | Payment Gateway | Razorpay / Cashfree simulation with UPI/Cards |
| `D-08` | Technology & Hosting | Node.js Express + React / Vite, zero lock-in |
| `D-09` | SOLD OUT section activation | Toggle on after >= 15 verified sales |
| `D-10` | Customer notification | Transactional Email + WhatsApp click-to-chat |
| `D-11` | Offline sale during active online hold | Permitted with alert; triggers auto-refund |
| `D-12` | Multi-size vs 1-of-1 | Variants data model supporting both |
| `D-13` | Legal terms review | Lawyer review of policy before launch |
| `D-14` | Brand assets & photography | 4:5 portrait ratio, neutral lighting |
| `D-15` | Support & SLA terms | Formal handover documentation & SLA |
