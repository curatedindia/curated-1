const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

// Concurrency mutex lock per variant/resource
const locks = new Map();

async function acquireLock(key) {
  while (locks.get(key)) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  locks.set(key, true);
}

function releaseLock(key) {
  locks.delete(key);
}

// Seed initial curated inventory
function getInitialData() {
  const products = [
    {
      id: 'prod-001',
      sku: 'CUR-TS-001',
      name: 'Heavyweight Washed Vintage Boxy Tee',
      slug: 'heavyweight-washed-vintage-boxy-tee',
      category_id: 't-shirts',
      subcategory_id: 'oversized',
      description: 'Handpicked heavyweight cotton tee with a natural mineral wash. Dropped shoulders, reinforced double-needle collar, and zero side seams. Sourced from export surplus sample run.',
      fabric: '100% Ring-Spun Heavyweight Cotton (240 GSM)',
      fit: 'Oversized',
      care: 'Machine wash cold inside out, hang dry only. Do not iron directly on print.',
      condition: 'New / Unused',
      condition_notes: 'Pristine unworn condition with factory sample tags attached. Crisp neckline with zero stretching.',
      selling_price: 899,
      original_price: 1899,
      cost_price: 320,
      source_type: 'Export Surplus',
      source_name: 'Tirupur Apparel Export Lot #4',
      lot_ref: 'LOT-2026-OCT-A',
      acquisition_date: '2026-09-28',
      qc_passed: true,
      qc_notes: 'Seam tension verified, collar ribbing intact, zero oil marks or irregularities.',
      is_new_drop: true,
      status: 'ACTIVE',
      images: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80'
      ],
      seo_title: 'Heavyweight Washed Vintage Boxy Tee | CURATED',
      seo_description: 'Handpicked heavyweight 240 GSM washed boxy tee. One of one vintage silhouette in pristine unused condition.',
      created_at: new Date('2026-10-01T10:00:00Z').toISOString(),
      listed_at: new Date('2026-10-01T10:00:00Z').toISOString(),
      sold_at: null
    },
    {
      id: 'prod-002',
      sku: 'CUR-TS-002',
      name: 'Archival Japanese Typography Graphic Tee',
      slug: 'archival-japanese-typography-graphic-tee',
      category_id: 't-shirts',
      subcategory_id: 'graphic',
      description: 'Single-stitch retro graphic tee featuring distressed Tokyo underground typography. Meticulously inspected screen print with zero micro-cracking.',
      fabric: '100% Combed Cotton',
      fit: 'Relaxed',
      care: 'Gentle hand wash or cold cycle. Tumble dry low.',
      condition: 'Excellent - Pre-Owned',
      condition_notes: 'Extremely light wash wear consistent with archival character. Fabric is soft, neckline clean and firm.',
      selling_price: 749,
      original_price: 1499,
      cost_price: 260,
      source_type: 'Curated Thrift',
      source_name: 'Metro Archive Sourcing',
      lot_ref: 'LOT-2026-SEP-TH',
      acquisition_date: '2026-09-25',
      qc_passed: true,
      qc_notes: 'Print inspected under UV light. Zero odors, spotless underarms and hem.',
      is_new_drop: true,
      status: 'ACTIVE',
      images: [
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80'
      ],
      seo_title: 'Archival Japanese Typography Graphic Tee | CURATED',
      seo_description: 'Distressed archival graphic tee with zero print cracking. Handpicked relaxed silhouette.',
      created_at: new Date('2026-10-01T11:00:00Z').toISOString(),
      listed_at: new Date('2026-10-01T11:00:00Z').toISOString(),
      sold_at: null
    },
    {
      id: 'prod-003',
      sku: 'CUR-SH-001',
      name: 'Oversized Raw Indigo Utility Work Shirt',
      slug: 'oversized-raw-indigo-utility-work-shirt',
      category_id: 'shirts',
      subcategory_id: 'oversized',
      description: 'Double-pocket structured utility shirt in deep raw indigo. Features horn buttons, reinforced elbow patches, and curved split hem for layering over tees.',
      fabric: '100% Heavy Twill Cotton (8.5 oz)',
      fit: 'Oversized',
      care: 'Wash separately in cold water to preserve deep indigo dye. Hang dry in shade.',
      condition: 'New / Unused',
      condition_notes: 'Brand surplus. Crisply pressed, all replacement buttons intact on care tag.',
      selling_price: 1399,
      original_price: 2799,
      cost_price: 480,
      source_type: 'Brand Surplus',
      source_name: 'Bengaluru Export Surplus House',
      lot_ref: 'LOT-2026-OCT-SH',
      acquisition_date: '2026-09-29',
      qc_passed: true,
      qc_notes: 'All buttons tight, buttonholes cleanly edged, pockets aligned.',
      is_new_drop: true,
      status: 'ACTIVE',
      images: [
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80'
      ],
      seo_title: 'Oversized Raw Indigo Utility Work Shirt | CURATED',
      seo_description: 'Heavy twill double-pocket raw indigo utility shirt. Curated one-of-one piece.',
      created_at: new Date('2026-10-02T09:30:00Z').toISOString(),
      listed_at: new Date('2026-10-02T09:30:00Z').toISOString(),
      sold_at: null
    },
    {
      id: 'prod-004',
      sku: 'CUR-SH-002',
      name: 'Camp Collar Monochromatic Floral Linen Shirt',
      slug: 'camp-collar-monochromatic-floral-linen-shirt',
      category_id: 'shirts',
      subcategory_id: 'printed',
      description: 'Subtle charcoal and cream botanical print on breathable airy linen blend. Relaxed resort Cuban collar, straight hem, mother-of-pearl buttons.',
      fabric: '70% Linen, 30% Cotton Blend',
      fit: 'Relaxed',
      care: 'Machine wash delicate or dry clean. Warm iron while slightly damp.',
      condition: 'Very Good - Pre-Owned',
      condition_notes: 'Very light softening of linen hand-feel. Tiny 2mm natural slub thread near back yoke (inherent linen characteristic, not a flaw).',
      selling_price: 1099,
      original_price: 2199,
      cost_price: 390,
      source_type: 'Curated Thrift',
      source_name: 'Goa Coastal Vault',
      lot_ref: 'LOT-2026-SEP-LIN',
      acquisition_date: '2026-09-20',
      qc_passed: true,
      qc_notes: 'Steamed and sanitized. Seams solid, zero stains.',
      is_new_drop: false,
      status: 'ACTIVE',
      images: [
        'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1000&q=80'
      ],
      seo_title: 'Camp Collar Monochromatic Floral Linen Shirt | CURATED',
      seo_description: 'Breathable linen blend camp collar shirt with subtle botanical motif.',
      created_at: new Date('2026-09-22T14:00:00Z').toISOString(),
      listed_at: new Date('2026-09-22T14:00:00Z').toISOString(),
      sold_at: null
    },
    {
      id: 'prod-005',
      sku: 'CUR-JK-001',
      name: 'Vintage Acid Wash Heavy Denim Chore Jacket',
      slug: 'vintage-acid-wash-heavy-denim-chore-jacket',
      category_id: 'jackets',
      subcategory_id: 'statement',
      description: 'True vintage heavyweight denim chore jacket with four front utility pockets and genuine brass shank buttons. Stunning natural marbled acid wash fade that cannot be replicated by fast fashion.',
      fabric: '100% Rigid Denim (13.5 oz)',
      fit: 'Regular',
      care: 'Spot clean or gentle soak. Air dry flat.',
      condition: 'Excellent - Pre-Owned',
      condition_notes: 'Impeccable vintage condition. Authentic edge honeycombing on cuffs. Zero structural wear or fraying.',
      selling_price: 2299,
      original_price: 4999,
      cost_price: 850,
      source_type: 'Curated Thrift',
      source_name: 'Mumbai Heritage Vault',
      lot_ref: 'LOT-2026-SEP-JK',
      acquisition_date: '2026-09-18',
      qc_passed: true,
      qc_notes: 'Shank buttons reinforced, pockets double checked, steam sanitized.',
      is_new_drop: true,
      status: 'ACTIVE',
      images: [
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1000&q=80'
      ],
      seo_title: 'Vintage Acid Wash Heavy Denim Chore Jacket | CURATED',
      seo_description: 'Authentic 13.5 oz rigid denim chore jacket with marbled wash and brass shanks.',
      created_at: new Date('2026-10-02T15:00:00Z').toISOString(),
      listed_at: new Date('2026-10-02T15:00:00Z').toISOString(),
      sold_at: null
    },
    {
      id: 'prod-006',
      sku: 'CUR-HD-001',
      name: 'Pigment-Dyed French Terry Drop-Shoulder Hoodie',
      slug: 'pigment-dyed-french-terry-drop-shoulder-hoodie',
      category_id: 'hoodies',
      subcategory_id: 'oversized',
      description: 'Ultra-plush 420 GSM unbrushed loopback French Terry hoodie in weathered washed charcoal. Clean minimalist aesthetic with no garish logos, double-layer hood that stands tall, and rib knit gussets.',
      fabric: '100% French Terry Cotton (420 GSM)',
      fit: 'Oversized',
      care: 'Cold gentle wash. Dry flat to preserve silhouette.',
      condition: 'New / Unused',
      condition_notes: 'Brand new surplus overstock. Luxurious weight, pristine cuffs, perfectly clean kangaroo pocket.',
      selling_price: 1799,
      original_price: 3499,
      cost_price: 650,
      source_type: 'Brand Surplus',
      source_name: 'Ludhiana Knitwear Mills',
      lot_ref: 'LOT-2026-OCT-HD',
      acquisition_date: '2026-09-30',
      qc_passed: true,
      qc_notes: 'Kangaroo pocket bartacks inspected, hood drawcord tips checked.',
      is_new_drop: true,
      status: 'ACTIVE',
      images: [
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1000&q=80'
      ],
      seo_title: 'Pigment-Dyed French Terry Drop-Shoulder Hoodie | CURATED',
      seo_description: '420 GSM heavyweight French Terry hoodie in washed charcoal. Structural luxury fit.',
      created_at: new Date('2026-10-02T16:00:00Z').toISOString(),
      listed_at: new Date('2026-10-02T16:00:00Z').toISOString(),
      sold_at: null
    },
    // Past Sold Products for genuine SOLD OUT social proof archive
    {
      id: 'prod-007',
      sku: 'CUR-TS-003',
      name: 'Washed Olive Heavy Tactical Pocket Tee',
      slug: 'washed-olive-heavy-tactical-pocket-tee',
      category_id: 't-shirts',
      subcategory_id: 'plain',
      description: 'Combat olive heavyweight tee with modular ripstop chest pocket and d-ring loop.',
      fabric: '100% Heavy Combed Cotton',
      fit: 'Relaxed',
      care: 'Normal wash',
      condition: 'New / Unused',
      condition_notes: 'Flawless brand surplus.',
      selling_price: 799,
      original_price: 1599,
      cost_price: 280,
      source_type: 'Export Surplus',
      source_name: 'Surplus Depot 1',
      lot_ref: 'LOT-2026-AUG-1',
      acquisition_date: '2026-08-10',
      qc_passed: true,
      qc_notes: 'Passed',
      is_new_drop: false,
      status: 'SOLD_OUT',
      images: [
        'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1000&q=80'
      ],
      seo_title: 'Washed Olive Heavy Tactical Pocket Tee | CURATED',
      seo_description: 'Tactical pocket tee in washed olive.',
      created_at: new Date('2026-08-15T10:00:00Z').toISOString(),
      listed_at: new Date('2026-08-15T10:00:00Z').toISOString(),
      sold_at: new Date('2026-08-18T14:20:00Z').toISOString()
    },
    {
      id: 'prod-008',
      sku: 'CUR-JK-002',
      name: 'Minimalist Minimalist Harrington Cotton Bomber',
      slug: 'minimalist-harrington-cotton-bomber',
      category_id: 'jackets',
      subcategory_id: 'lightweight',
      description: 'Clean cream-toned Harrington jacket with matte silver zipper and tartan inner lining.',
      fabric: '100% Cotton Shell, Tartan Lining',
      fit: 'Regular',
      care: 'Dry clean recommended',
      condition: 'Excellent - Pre-Owned',
      condition_notes: 'Clean fabric, pristine zipper pull.',
      selling_price: 1999,
      original_price: 4200,
      cost_price: 700,
      source_type: 'Curated Thrift',
      source_name: 'Metro Archive Sourcing',
      lot_ref: 'LOT-2026-AUG-JK',
      acquisition_date: '2026-08-12',
      qc_passed: true,
      qc_notes: 'Passed',
      is_new_drop: false,
      status: 'SOLD_OUT',
      images: [
        'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=80'
      ],
      seo_title: 'Minimalist Harrington Cotton Bomber | CURATED',
      seo_description: 'Cream Harrington jacket.',
      created_at: new Date('2026-08-16T12:00:00Z').toISOString(),
      listed_at: new Date('2026-08-16T12:00:00Z').toISOString(),
      sold_at: new Date('2026-08-20T17:45:00Z').toISOString()
    }
  ];

  const variants = [
    {
      id: 'var-001',
      product_id: 'prod-001',
      size: 'L',
      measurements: { chest: 46, length: 29.5, shoulder: 21, sleeve: 9.5, unit: 'in' },
      stock_on_hand: 1
    },
    {
      id: 'var-002',
      product_id: 'prod-002',
      size: 'M',
      measurements: { chest: 42, length: 28, shoulder: 19.5, sleeve: 8.5, unit: 'in' },
      stock_on_hand: 1
    },
    {
      id: 'var-003',
      product_id: 'prod-003',
      size: 'XL',
      measurements: { chest: 48, length: 31, shoulder: 21.5, sleeve: 25.5, unit: 'in' },
      stock_on_hand: 1
    },
    {
      id: 'var-004',
      product_id: 'prod-004',
      size: 'M',
      measurements: { chest: 41, length: 28, shoulder: 18.5, sleeve: 9, unit: 'in' },
      stock_on_hand: 1
    },
    {
      id: 'var-005',
      product_id: 'prod-005',
      size: 'L',
      measurements: { chest: 45, length: 27.5, shoulder: 19.5, sleeve: 25, unit: 'in' },
      stock_on_hand: 1
    },
    {
      id: 'var-006',
      product_id: 'prod-006',
      size: 'L',
      measurements: { chest: 47, length: 28.5, shoulder: 22, sleeve: 24.5, unit: 'in' },
      stock_on_hand: 1
    },
    // Past sold variants
    {
      id: 'var-007',
      product_id: 'prod-007',
      size: 'M',
      measurements: { chest: 42, length: 28, shoulder: 19, sleeve: 8.5, unit: 'in' },
      stock_on_hand: 0
    },
    {
      id: 'var-008',
      product_id: 'prod-008',
      size: 'L',
      measurements: { chest: 44, length: 27, shoulder: 19, sleeve: 24.5, unit: 'in' },
      stock_on_hand: 0
    }
  ];

  const categories = [
    {
      id: 't-shirts',
      name: 'T-Shirts',
      slug: 't-shirts',
      subcategories: ['Plain', 'Graphic', 'Printed', 'Oversized']
    },
    {
      id: 'shirts',
      name: 'Shirts',
      slug: 'shirts',
      subcategories: ['Casual', 'Printed', 'Oversized', 'Fashion']
    },
    {
      id: 'jackets',
      name: 'Jackets',
      slug: 'jackets',
      subcategories: ['Casual', 'Lightweight', 'Statement']
    },
    {
      id: 'hoodies',
      name: 'Hoodies',
      slug: 'hoodies',
      subcategories: ['Hoodies', 'Oversized', 'Graphic']
    }
  ];

  const inventoryTransactions = [
    {
      id: 'tx-001',
      variant_id: 'var-001',
      product_id: 'prod-001',
      sku: 'CUR-TS-001',
      quantity_change: 1,
      reason: 'Initial Stock',
      channel: 'SYSTEM',
      order_id: null,
      admin_user: 'Nikhil Pol',
      note: 'Initial drop catalog entry',
      created_at: new Date('2026-10-01T10:00:00Z').toISOString()
    },
    {
      id: 'tx-002',
      variant_id: 'var-002',
      product_id: 'prod-002',
      sku: 'CUR-TS-002',
      quantity_change: 1,
      reason: 'Initial Stock',
      channel: 'SYSTEM',
      order_id: null,
      admin_user: 'Nikhil Pol',
      note: 'Initial drop catalog entry',
      created_at: new Date('2026-10-01T11:00:00Z').toISOString()
    },
    {
      id: 'tx-003',
      variant_id: 'var-003',
      product_id: 'prod-003',
      sku: 'CUR-SH-001',
      quantity_change: 1,
      reason: 'Initial Stock',
      channel: 'SYSTEM',
      order_id: null,
      admin_user: 'Nikhil Pol',
      note: 'Initial drop catalog entry',
      created_at: new Date('2026-10-02T09:30:00Z').toISOString()
    },
    {
      id: 'tx-004',
      variant_id: 'var-004',
      product_id: 'prod-004',
      sku: 'CUR-SH-002',
      quantity_change: 1,
      reason: 'Initial Stock',
      channel: 'SYSTEM',
      order_id: null,
      admin_user: 'Nikhil Pol',
      note: 'Initial drop catalog entry',
      created_at: new Date('2026-09-22T14:00:00Z').toISOString()
    },
    {
      id: 'tx-005',
      variant_id: 'var-005',
      product_id: 'prod-005',
      sku: 'CUR-JK-001',
      quantity_change: 1,
      reason: 'Initial Stock',
      channel: 'SYSTEM',
      order_id: null,
      admin_user: 'Nikhil Pol',
      note: 'Initial drop catalog entry',
      created_at: new Date('2026-10-02T15:00:00Z').toISOString()
    },
    {
      id: 'tx-006',
      variant_id: 'var-006',
      product_id: 'prod-006',
      sku: 'CUR-HD-001',
      quantity_change: 1,
      reason: 'Initial Stock',
      channel: 'SYSTEM',
      order_id: null,
      admin_user: 'Nikhil Pol',
      note: 'Initial drop catalog entry',
      created_at: new Date('2026-10-02T16:00:00Z').toISOString()
    },
    // Past sales transactions
    {
      id: 'tx-007',
      variant_id: 'var-007',
      product_id: 'prod-007',
      sku: 'CUR-TS-003',
      quantity_change: 1,
      reason: 'Initial Stock',
      channel: 'SYSTEM',
      order_id: null,
      admin_user: 'Nikhil Pol',
      note: 'August drop',
      created_at: new Date('2026-08-15T10:00:00Z').toISOString()
    },
    {
      id: 'tx-008',
      variant_id: 'var-007',
      product_id: 'prod-007',
      sku: 'CUR-TS-003',
      quantity_change: -1,
      reason: 'Online Sale',
      channel: 'ONLINE',
      order_id: 'ord-1000',
      admin_user: 'SYSTEM',
      note: 'Online purchase verified',
      created_at: new Date('2026-08-18T14:20:00Z').toISOString()
    },
    {
      id: 'tx-009',
      variant_id: 'var-008',
      product_id: 'prod-008',
      sku: 'CUR-JK-002',
      quantity_change: 1,
      reason: 'Initial Stock',
      channel: 'SYSTEM',
      order_id: null,
      admin_user: 'Nikhil Pol',
      note: 'August drop',
      created_at: new Date('2026-08-16T12:00:00Z').toISOString()
    },
    {
      id: 'tx-010',
      variant_id: 'var-008',
      product_id: 'prod-008',
      sku: 'CUR-JK-002',
      quantity_change: -1,
      reason: 'Offline Sale',
      channel: 'OFFLINE',
      order_id: 'ord-offline-001',
      admin_user: 'Nikhil Pol',
      note: 'Sold in person via UPI',
      created_at: new Date('2026-08-20T17:45:00Z').toISOString()
    }
  ];

  const orders = [
    {
      id: 'ord-1000',
      order_number: 'CUR-1000',
      channel: 'ONLINE',
      customer: {
        name: 'Aarav Mehta',
        mobile: '9820012345',
        email: 'aarav.m@example.com',
        address: 'Flat 402, Sea Crest Towers, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050'
      },
      items: [
        {
          product_id: 'prod-007',
          variant_id: 'var-007',
          name: 'Washed Olive Heavy Tactical Pocket Tee',
          sku: 'CUR-TS-003',
          size: 'M',
          quantity: 1,
          unit_price: 799,
          actual_sale_price: 799,
          cost_price: 280,
          image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1000&q=80'
        }
      ],
      subtotal: 799,
      shipping: 99,
      total: 898,
      payment_status: 'PAID',
      order_status: 'DELIVERED',
      payment_mode: 'UPI',
      gateway_id: 'pay_sim_1000',
      policy_version: '1.0',
      policy_ack_at: new Date('2026-08-18T14:18:00Z').toISOString(),
      courier: 'BlueDart Express',
      tracking_number: 'BD748291049IN',
      tracking_url: 'https://www.bluedart.com',
      notes: 'Delivered in mint condition.',
      created_at: new Date('2026-08-18T14:20:00Z').toISOString(),
      voided_at: null,
      void_reason: null
    },
    {
      id: 'ord-offline-001',
      order_number: 'CUR-OFF-001',
      channel: 'OFFLINE',
      customer: {
        name: 'Walk-in Buyer (Rohan)',
        mobile: '9819098765',
        email: null,
        address: 'Bandra Studio Meetup',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050'
      },
      items: [
        {
          product_id: 'prod-008',
          variant_id: 'var-008',
          name: 'Minimalist Harrington Cotton Bomber',
          sku: 'CUR-JK-002',
          size: 'L',
          quantity: 1,
          unit_price: 1999,
          actual_sale_price: 1900, // Bargained offline sale price
          cost_price: 700,
          image: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=80'
        }
      ],
      subtotal: 1900,
      shipping: 0,
      total: 1900,
      payment_status: 'PAID',
      order_status: 'COMPLETED',
      payment_mode: 'UPI',
      gateway_id: 'OFFLINE-UPI-REF89',
      policy_version: '1.0',
      policy_ack_at: new Date('2026-08-20T17:45:00Z').toISOString(),
      courier: 'Hand Delivery',
      tracking_number: null,
      tracking_url: null,
      notes: 'Customer tried on in person, paid via GPay.',
      created_at: new Date('2026-08-20T17:45:00Z').toISOString(),
      voided_at: null,
      void_reason: null
    }
  ];

  const settings = {
    shipping_flat_rate: 99,
    shipping_free_threshold: 1499,
    hold_duration_minutes: 10,
    claim_window_hours: 48,
    aging_days: 30,
    sold_out_section_enabled: true,
    hero_headline: 'SEARCHED • FILTERED • QUALITY CHECKED • HANDPICKED',
    hero_subline: "We search everywhere so our customers don't have to.",
    hero_button_text: 'EXPLORE NEW DROPS',
    whatsapp_number: '+919876543210',
    store_email: 'hello.curatedindia@gmail.com',
    dispatch_time_text: 'Dispatched within 24-48 hours across India via BlueDart / Delhivery Express.',
    gst_registered: false
  };

  const holds = [];
  const exceptionCases = [];
  const contactMessages = [];
  const subscribers = [];
  const activityLogs = [
    {
      id: 'act-001',
      time: new Date('2026-10-01T10:00:00Z').toISOString(),
      action: 'SYSTEM_INIT',
      entity_type: 'CATALOG',
      entity_id: 'ALL',
      summary: 'CURATED V1 Catalog initialized with initial drops & ledger transactions.',
      admin_user: 'Nikhil Pol'
    }
  ];

  return {
    products,
    variants,
    categories,
    inventoryTransactions,
    orders,
    holds,
    exceptionCases,
    contactMessages,
    subscribers,
    settings,
    activityLogs,
    nextOrderSeq: 1001
  };
}

class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(raw);
      } else {
        this.data = getInitialData();
        this.save();
      }
    } catch (err) {
      console.error('Failed to load database, recreating defaults:', err);
      this.data = getInitialData();
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving db.json:', err);
    }
  }

  // Helper to get active hold quantity for a variant
  getActiveHoldQuantity(variantId) {
    const now = new Date();
    return this.data.holds
      .filter((h) => h.variant_id === variantId && h.status === 'ACTIVE' && new Date(h.expires_at) > now)
      .reduce((sum, h) => sum + h.quantity, 0);
  }

  // Derive available stock (on hand - active holds)
  getVariantAvailability(variantId) {
    const variant = this.data.variants.find((v) => v.id === variantId);
    if (!variant) return { on_hand: 0, reserved: 0, available: 0 };
    const reserved = this.getActiveHoldQuantity(variantId);
    const available = Math.max(0, variant.stock_on_hand - reserved);
    return {
      on_hand: variant.stock_on_hand,
      reserved,
      available
    };
  }

  // Clean expired holds and release inventory
  cleanExpiredHolds() {
    const now = new Date();
    let changed = false;
    this.data.holds.forEach((hold) => {
      if (hold.status === 'ACTIVE' && new Date(hold.expires_at) <= now) {
        hold.status = 'EXPIRED';
        changed = true;
        this.logActivity('HOLD_EXPIRED', 'HOLD', hold.id, `Hold ${hold.id} for variant ${hold.variant_id} expired and released back to available.`, 'SYSTEM');
      }
    });
    if (changed) this.save();
  }

  // Calculate pieces sold for a product
  getPiecesSold(productId) {
    let count = 0;
    this.data.orders.forEach((ord) => {
      if (ord.order_status !== 'CANCELLED' && ord.payment_status !== 'REFUNDED' && !ord.voided_at) {
        ord.items.forEach((item) => {
          if (item.product_id === productId) {
            count += item.quantity;
          }
        });
      }
    });
    return count;
  }

  // Total sales across all products
  getTotalPiecesSold() {
    let count = 0;
    this.data.orders.forEach((ord) => {
      if (ord.order_status !== 'CANCELLED' && ord.payment_status !== 'REFUNDED' && !ord.voided_at) {
        ord.items.forEach((item) => {
          count += item.quantity;
        });
      }
    });
    return count;
  }

  logActivity(action, entityType, entityId, summary, adminUser = 'SYSTEM') {
    const log = {
      id: 'act-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      time: new Date().toISOString(),
      action,
      entity_type: entityType,
      entity_id: entityId,
      summary,
      admin_user: adminUser
    };
    this.data.activityLogs.unshift(log);
    if (this.data.activityLogs.length > 500) {
      this.data.activityLogs.pop();
    }
  }
}

const db = new Database();

module.exports = {
  db,
  acquireLock,
  releaseLock
};
