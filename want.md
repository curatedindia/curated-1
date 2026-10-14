# Developer Wishlist & Strategic Roadmap (`want.md`)
**Project:** CURATED — V1 E-Commerce Website  
**Recipient:** Nikhil Pol (Business Owner) & Engineering Leads  
**Purpose:** Honest assessment of high-leverage enhancements, UX opportunities, and future architectural additions.

---

## 1. Executive Summary & Product Vision
CURATED has one of the cleanest, most authentic positioning strategies in contemporary Indian fashion retail: **SEARCHED • FILTERED • QUALITY CHECKED • HANDPICKED**. 

Because the catalog relies on scarce, high-character 1-of-1 pieces, standard e-commerce paradigms (bulk discounting, massive warehouses, algorithmic flash sales) do not apply. Instead, CURATED thrives on **exclusivity, uncompromising aesthetic honesty, hyper-fast checkout, and surgical inventory integrity**.

Below are the key items on our wishlist—strategic improvements, automated tools, and open decision recommendations—that will transform CURATED into an iconic, highly profitable fashion brand.

---

## 2. Core Wishlist Items (What We Want Built Next)

### 2.1 Automated AI Background Cleaner & Color Calibrator for Mobile Product Entry
- **The Problem:** The owner takes 40–50 photos weekly in various lighting conditions. Inconsistent shadows, reflections, and wrinkles can make an otherwise luxury garment appear amateur.
- **The Solution:** An integrated client-side or microservice image pre-processor that:
  1. Detects garment contours and seamlessly applies an editorial warm-neutral studio background (`#F5F3EF`).
  2. Auto-balances white levels so black tees look true pitch black and ivory garments don't appear washed out.
  3. Formats all crops strictly to the optimal 4:5 mobile fashion portrait ratio.

---

### 2.2 Instant Mobile UPI Intent Flow
- **The Opportunity:** Over 85% of mobile fashion purchases in urban India happen via UPI (PhonePe, Google Pay, Paytm, CRED).
- **The Enhancement:** While web-based QR codes work on desktop, mobile shoppers want zero copy-pasting. A native UPI Intent deep link opens the customer's preferred UPI app in a single tap, completes the transaction with biometric authentication, and returns to the CURATED order confirmation screen in under 8 seconds.

---

### 2.3 Automated Courier API Integration (Shiprocket / Delhivery One)
- **Current V1 Scope:** The owner generates AWBs manually on a courier portal and types the tracking number into Admin (`SHP-04`).
- **Wishlist Upgrade:** Direct integration with Shiprocket or Delhivery APIs:
  - When an order moves to `PACKED`, a single button click generates the shipping label, requests courier pickup, and populates the tracking URL automatically.
  - Webhooks from the courier automatically transition the order to `SHIPPED` and `DELIVERED` without manual tracking.

---

### 2.4 WhatsApp Drop Alerts & VIP Early Access
- **Why It Matters:** Young fashion shoppers rarely check promotional emails. Instagram algorithmic reach is volatile. WhatsApp opening rates in India exceed 95%.
- **The Feature:** A 1-click "Notify me for Next Drop" phone collector on the homepage. When Nikhil marks a 40-piece batch as live in the Admin panel, a broadcast notification fires to VIP subscribers 15 minutes before the public Instagram announcement.

---

### 2.5 Automated GST B2C Invoicing Engine
- **Why It Matters:** Once annual turnover crosses threshold limits or when business customers request invoices, manual invoicing in Excel becomes a bottleneck.
- **The Feature:** Automated PDF invoice generation compliant with Indian GST rules (HSN code `6109` for knitted t-shirts, `6205` for woven shirts), calculating 5% or 12% GST splits, printable or downloadable directly from the order confirmation page.

---

### 2.6 Dynamic Sticky Size & Measurement Helper
- **The Problem:** Fit hesitation is the #1 reason fashion shoppers abandon carts or complain post-purchase.
- **The Solution:** A contextual "Compare Your Fit" modal on the product page. The customer inputs their favorite t-shirt's chest width (e.g. 21 inches), and the UI instantly highlights: *"This piece has a 22-inch chest — it will fit relaxed/oversized on you."*

---

## 3. Recommendations on the Open Decisions Register (`D-01` to `D-15`)

1. **D-01 (Hold Duration):** Set strictly to **10 minutes**. 5 minutes creates panic during UPI banking delays; 15 minutes holds up inventory too long for competing buyers.
2. **D-02 (Cash on Delivery):** **Keep 100% Prepaid at launch.** COD in Indian fashion apparel suffers 25–40% RTO (Return to Origin). For 1-of-1 pieces, an item locked in courier transit for 10 days before returning undelivered ruins the sell-through window.
3. **D-03 (Shipping Model):** **Flat ₹99, Free on orders ₹1,499+**. This incentivizes customers to purchase two pieces instead of one.
4. **D-04 (Size Exchange):** **Zero exchanges.** Because pieces are unique 1-of-1s, an identical replacement size rarely exists. Transparent measurements and condition badges protect against misunderstandings.
5. **D-05 (Exception Claim Window):** **48 hours from delivery timestamp.** Longer windows encourage buyer remorse; 48 hours is standard and fair for transit damage or fulfillment errors.
6. **D-09 (SOLD OUT Section Display):** **Keep turned OFF until 15 verified sales occur.** An empty SOLD OUT page looks like an untested brand; a page with 20+ sold pieces creates magnetic social proof.

---

## 4. Architectural Excellence & Quality Checklist
- [x] Zero double-sales through atomic inventory holds and concurrency mutexes.
- [x] 100% responsive, mobile-first luxury aesthetic with champagne accents and deep black backgrounds.
- [x] Offline sales recorded in 2 taps with negotiated pricing and ledger audit trail.
- [x] PC-12 publishing validation protecting the brand from incomplete or unverified listings.
- [x] Clean, standalone local hosting on localhost with automated health monitoring.
