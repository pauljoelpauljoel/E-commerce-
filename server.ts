import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { Groq } from 'groq-sdk';

import * as admin from 'firebase-admin';

// Initialize Firebase Admin (requires GOOGLE_APPLICATION_CREDENTIALS or proper config)
try {
  admin.initializeApp();
  console.log('Firebase Admin SDK Initialized');
} catch (e) {
  console.warn('Firebase Admin SDK Initialization failed:', e);
}

// Helper to sync order to Firestore for WhatsApp Cloud Functions
async function syncOrderToFirestore(order: any) {
  try {
    const db = admin.firestore();
    await db.collection('orders').doc(order.id).set({
      orderId: order.id,
      customerPhone: order.customerPhone,
      customerName: order.customerName,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      trackingLink: order.trackingNumber ? `https://omnibazaar.com/track/${order.trackingNumber}` : '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error(`Failed to sync order ${order?.id} to Firestore:`, e);
  }
}

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'database.json');
const JWT_SECRET = process.env.JWT_SECRET || 'omni_bazaar_secret_key_2026';

// Express middlewares
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Utility for hashing passwords using bcrypt (highly secure and industry standard)
function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

// Verify dynamic logins with cryptographically secure matching
function verifyPassword(password: string, hash: string): boolean {
  if (hash.length === 64 && !hash.startsWith('$2a$') && !hash.startsWith('$2b$')) {
    const legacy = crypto.createHash('sha256').update(password).digest('hex');
    return legacy === hash;
  }
  try {
    return bcrypt.compareSync(password, hash);
  } catch (e) {
    return false;
  }
}

// Token Generator utilizing production JWT
function generateToken(user: any): string {
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Database initial state with full premium seed data
let db: any = {
  users: [],
  vendors: [],
  vendor_requests: [],
  categories: [
    { id: '1', name: 'Mobiles & Electronics', slug: 'mobiles-electronics' },
    { id: '2', name: 'Apparel & Fashion', slug: 'fashion' },
    { id: '3', name: 'Grocery & Pantry', slug: 'grocery' },
    { id: '4', name: 'Spices & Indian Herbs', slug: 'spices' }
  ],
  brands: [
    { id: '1', name: 'AuraTech', slug: 'auratech' },
    { id: '2', name: 'BharatSpices', slug: 'bharatspices' },
    { id: '3', name: 'Tata Consumer', slug: 'tata-consumer' },
    { id: '4', name: 'Kanchipuram Weavers', slug: 'kanchipuram-weavers' }
  ],
  products: [
    {
      id: 'p1',
      vendorId: 'root-vendor',
      vendorStoreName: 'Universal Emporium',
      name: 'iPhone 15 Pro Max',
      price: 119900,
      description: 'Experience premium titanium design, A17 Pro performance, and standard smart lenses with a massive vibrant dynamic island display.',
      images: [
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80'
      ],
      video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      category: 'mobiles-electronics',
      brand: 'AuraTech',
      stock: 12,
      ratings: 4.8,
      reviewsCount: 3,
      isApproved: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'p2',
      vendorId: 'root-vendor',
      vendorStoreName: 'Universal Emporium',
      name: 'Banarasi Gold Saree',
      price: 4500,
      description: 'Elegant masterwork, traditional floral brocade, and pure gold zari borders made from authentic Varanasi mulberry silks.',
      images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80'],
      category: 'fashion',
      brand: 'Kanchipuram Weavers',
      stock: 25,
      ratings: 4.6,
      reviewsCount: 1,
      isApproved: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'p3',
      vendorId: 'root-vendor',
      vendorStoreName: 'Universal Emporium',
      name: 'Kerala Cardamom Pods',
      price: 190,
      description: 'Freshly handpicked premium green cardamoms from Idukki slopes, Kerala. Distinctive aroma, chemical free processing.',
      images: ['https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&q=80'],
      category: 'spices',
      brand: 'BharatSpices',
      stock: 50,
      ratings: 4.9,
      reviewsCount: 2,
      isApproved: true,
      createdAt: new Date().toISOString()
    }
  ],
  orders: [],
  reviews: [
    {
      id: 'rev1',
      productId: 'p1',
      userName: 'Prasanna Kumar',
      userInitial: 'P',
      rating: 5,
      reviewText: 'Outstanding build quality and battery life. Aura recommendations fit is amazing!',
      createdAt: new Date().toISOString()
    },
    {
      id: 'rev2',
      productId: 'p1',
      userName: 'Amal Nair',
      userInitial: 'A',
      rating: 4,
      reviewText: 'Perfect premium build, and the cameras shoot stellar high-res cinematic captures.',
      createdAt: new Date().toISOString()
    }
  ],
  wishlists: [],
  notifications: [],
  activity_logs: [],
  delivery_staff: [],
  shipments: [],
  shipment_logs: [],
  schemas: {}, // Holds dynamic multi-tenant sub-databases representing "vendor_[store_name]"
  vehicle_types: [],
  coupons: [],
  supportConfig: {
    whatsapp: {
      enabled: true,
      number: '+919876543210',
      defaultMessage: 'Hello, I need help regarding my order/product.'
    },
    calls: {
      enabled: true,
      numbers: ['+919876543210', '+918001234567']
    }
  },
  ai_histories: []
};

// Seed administrative and user roles in the database securely on startup
const adminPasswordHash = hashPassword('admin');

// Sync base roles if not existing
function seedDatabase() {
  db.users = db.users || [];
  db.delivery_staff = db.delivery_staff || [];
  db.shipments = db.shipments || [];
  db.shipment_logs = db.shipment_logs || [];
  db.ai_histories = db.ai_histories || [];
  db.vehicle_types = db.vehicle_types || [
    { id: 'vt-1', name: 'Motorcycle / Bike' },
    { id: 'vt-2', name: 'Electric Scooter' },
    { id: 'vt-3', name: 'Parcel Mini Truck' },
    { id: 'vt-4', name: 'Bicycle Fleet' }
  ];
  db.supportConfig = db.supportConfig || {
    whatsapp: {
      enabled: true,
      number: '+919876543210',
      defaultMessage: 'Hello, I need help regarding my order/product.'
    },
    calls: {
      enabled: true,
      numbers: ['+919876543210', '+918001234567']
    }
  };

  // Enforce admin@gmail.com exists
  if (!db.users.some((u: any) => u.email === 'admin@gmail.com')) {
    db.users.push({
      id: 'user-admin',
      name: 'OmniBazaar Admin',
      email: 'admin@gmail.com',
      phone: '9999999999',
      passwordHash: adminPasswordHash,
      role: 'admin',
      createdAt: new Date().toISOString()
    });
  }

  // Seed default vendor if not existing
  if (!db.users.some((u: any) => u.email === 'vendor@gmail.com')) {
    const vendorUser = {
      id: 'vendor-seeded',
      name: 'Universal Emporium',
      email: 'vendor@gmail.com',
      phone: '9876543210',
      passwordHash: hashPassword('vendor'),
      role: 'vendor',
      createdAt: new Date().toISOString()
    };
    db.users.push(vendorUser);

    // Auto-approve vendor request so they don't block
    if (!db.vendor_requests) db.vendor_requests = [];
    db.vendor_requests.push({
      id: 'req-seeded-vendor',
      vendorId: 'vendor-seeded',
      storeName: 'Universal Emporium',
      legalName: 'Universal Emporium Pvt Ltd',
      description: 'Handcrafted goods and regional specialties of India.',
      regNumber: 'REG987654321',
      gstNumber: '33AAACX9876A1Z3',
      businessPhone: '9876543210',
      address: 'Main Bazaar Street, Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641001',
      latitude: 11.0168,
      longitude: 76.9558,
      status: 'approved',
      documentUrl: '',
      remarks: 'Seeded default approved vendor profile.',
      history: [
        { status: 'draft', date: new Date().toISOString(), remark: 'Draft created.' },
        { status: 'approved', date: new Date().toISOString(), remark: 'Auto-approved.' }
      ],
      updatedAt: new Date().toISOString()
    });

    // Initialize vendor schema analytics
    const schemaName = `vendor_${'Universal Emporium'.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    if (!db.schemas) db.schemas = {};
    if (!db.schemas[schemaName]) {
      db.schemas[schemaName] = {
        products: [
          {
            id: 'p1',
            vendorId: 'vendor-seeded',
            vendorStoreName: 'Universal Emporium',
            name: 'iPhone 15 Pro Max',
            price: 119900,
            description: 'Experience premium titanium design, A17 Pro performance, and standard smart lenses with a massive vibrant dynamic island display.',
            images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80'],
            category: 'mobiles-electronics',
            brand: 'AuraTech',
            stock: 12,
            ratings: 4.8,
            reviewsCount: 3,
            isApproved: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 'p2',
            vendorId: 'vendor-seeded',
            vendorStoreName: 'Universal Emporium',
            name: 'Banarasi Gold Saree',
            price: 4500,
            description: 'Elegant masterwork, traditional floral brocade, and pure gold zari borders made from authentic Varanasi mulberry silks.',
            images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80'],
            category: 'fashion',
            brand: 'Kanchipuram Weavers',
            stock: 25,
            ratings: 4.6,
            reviewsCount: 1,
            isApproved: true,
            createdAt: new Date().toISOString()
          }
        ],
        inventory: {
          totalItems: 2,
          lowStockAlerts: []
        },
        analytics: {
          totalRevenue: 124400,
          completedOrdersCount: 2,
          averageRatings: 4.7
        },
        settings: {
          isOpen: true,
          gstRegistered: true,
          shipmentPartner: 'OmniCarrier Express'
        }
      };
    }
  }

  // Seed default customer if not existing
  if (!db.users.some((u: any) => u.email === 'customer@gmail.com')) {
    db.users.push({
      id: 'customer-seeded',
      name: 'Tharun R',
      email: 'customer@gmail.com',
      phone: '7777777777',
      passwordHash: hashPassword('customer'),
      role: 'customer',
      createdAt: new Date().toISOString()
    });
  }

  // Seed default delivery staff if not existing
  if (!db.users.some((u: any) => u.email === 'delivery@gmail.com')) {
    db.users.push({
      id: 'delivery-seeded',
      name: 'Ramesh Courier',
      email: 'delivery@gmail.com',
      phone: '8888888888',
      passwordHash: hashPassword('deliverypass'),
      role: 'delivery',
      createdAt: new Date().toISOString()
    });
  }

  // Synchronize db.delivery_staff list with delivery role users
  const deliveryUsers = db.users.filter((u: any) => u.role === 'delivery');
  deliveryUsers.forEach((du: any) => {
    if (!db.delivery_staff.some((ds: any) => ds.id === du.id)) {
      db.delivery_staff.push({
        id: du.id,
        name: du.name,
        email: du.email,
        phone_number: du.phone,
        status: 'active',
        created_at: du.createdAt
      });
    }
  });

  // Clear vendor requests tied to removed demo profiles
  db.vendor_requests = (db.vendor_requests || []).filter(
    (r: any) => r.vendorId === 'user-admin' || db.users.some((u: any) => u.id === r.vendorId)
  );

  // Add activity log safely
  db.activity_logs.push({
    id: 'log-' + Math.floor(Math.random() * 8999 + 1000),
    userId: 'user-admin',
    userName: 'System Administrator',
    role: 'admin',
    action: 'BOOTSTRAP',
    details: 'Self-healing database seeded with multi-vendor, customer and delivery roles.',
    timestamp: new Date().toISOString()
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://waorxklbcqwcfyynzjay.supabase.co/rest/v1/';
let SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'yJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indhb3J4a2xiY3F3Y2Z5eW56amF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDUwMDksImV4cCI6MjA5NDUyMTAwOX0.CqhFS9zfxKbqkB-TltPpIgT0oqmtNwsrqWY4Ja3EjOQ';

// Auto-heal the key if truncated 'e'
if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.startsWith('yJ')) {
  SUPABASE_ANON_KEY = 'e' + SUPABASE_ANON_KEY;
}

let supabaseConnected = false;
let supabaseError: string | null = null;
let lastSupabaseSync: string | null = null;

// Synchronize state with Supabase
async function loadStateFromSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    supabaseError = "Supabase configuration is missing.";
    return;
  }
  
  try {
    const cleanUrl = SUPABASE_URL.endsWith('/') ? SUPABASE_URL : SUPABASE_URL + '/';
    console.log(`Connecting to Supabase rest interface: ${cleanUrl}...`);
    const res = await fetch(`${cleanUrl}omnibazaar_state?select=id,json_data&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        if (data[0].json_data) {
          db = { ...db, ...data[0].json_data };
          console.log('✅ DATABASE SUCCESSFULLY LOADED AND SYNCED WITH SUPABASE CLOUD!');
          supabaseConnected = true;
          supabaseError = null;
          lastSupabaseSync = new Date().toISOString();
          return;
        }
      } else {
        console.log('Supabase table exists but has no entries. Seeding with default data...');
        await saveStateToSupabase();
      }
    } else {
      const errText = await res.text();
      console.warn('Could not read from Supabase table:', errText);
      supabaseError = `Table 'omnibazaar_state' not found or inaccessible. Error: ${errText}`;
    }
  } catch (err: any) {
    console.error('Supabase initialization error:', err);
    supabaseError = err.message || "Network request failed.";
  }
}

async function saveStateToSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  
  try {
    const cleanUrl = SUPABASE_URL.endsWith('/') ? SUPABASE_URL : SUPABASE_URL + '/';
    const payload = {
      id: 'omni_main_sandbox',
      json_data: db,
      updated_at: new Date().toISOString()
    };

    const res = await fetch(`${cleanUrl}omnibazaar_state`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates' // Handle UPSERT via PostgREST resolution header
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 201 || res.status === 200 || res.status === 204) {
      supabaseConnected = true;
      supabaseError = null;
      lastSupabaseSync = new Date().toISOString();
      console.log('📦 DATABASE STATE SAVED AND SYNCHRONIZED TO SUPABASE!');
    } else {
      const errText = await res.text();
      console.error('Failed to sync to Supabase:', errText);
      supabaseError = `Failed to sync database state: ${errText}`;
    }
  } catch (err: any) {
    console.error('Failed storing state to Supabase cloud:', err);
    supabaseError = err.message || "Network write request failed.";
  }
}

// Load DB helper
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const txt = fs.readFileSync(DB_FILE, 'utf-8');
      if (txt.trim()) {
        const parsed = JSON.parse(txt);
        db = { ...db, ...parsed };
      }
    }
    
    seedDatabase();
    
    // Asynchronously pull state from Supabase on launch
    loadStateFromSupabase().then(() => {
      // Ensure basic seed data is still present
      seedDatabase();
      // Ensure we immediately write to local file so cache is warm
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    }).catch(e => console.error('Supabase initial pull failed:', e));

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Critical database initialization error:', e);
    seedDatabase();
  }
}

// Save DB helper
function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    // Save state to Supabase background worker
    saveStateToSupabase().catch(e => console.error('Supabase background save fail:', e));
  } catch (e) {
    console.error('Failed writing sandbox persistence layer:', e);
  }
}

// Dynamics of Sandbox E-commerce Multi-Tenant Schemas
// Creates specific schema for approved vendor: vendor_{[store_name_sanitized]}
function initializeVendorSchema(storeName: string) {
  const schemaName = `vendor_${storeName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
  if (!db.schemas) db.schemas = {};
  if (!db.schemas[schemaName]) {
    db.schemas[schemaName] = {
      products: [],
      inventory: {
        totalItems: 0,
        lowStockAlerts: []
      },
      analytics: {
        totalRevenue: 0,
        completedOrdersCount: 0,
        averageRatings: 5.0
      },
      settings: {
        isOpen: true,
        gstRegistered: true,
        shipmentPartner: 'OmniCarrier Express'
      }
    };
  }
  return schemaName;
}

// Sync products from dynamic schema to public.marketplace_products
function syncVendorProductsToPublic(schemaName: string, vendorId: string, storeName: string) {
  const schemaObj = db.schemas[schemaName];
  if (!schemaObj || !schemaObj.products) return;

  // Remove existing public products for this vendor
  db.products = db.products.filter((p: any) => p.vendorId !== vendorId);

  // Sync approved items
  schemaObj.products.forEach((p: any) => {
    db.products.push({
      ...p,
      vendorId,
      vendorStoreName: storeName,
      isApproved: true
    });
  });
  saveDB();
}

loadDB();

// ==========================================
// API REST ENDPOINTS
// ==========================================

// ==========================================
// COUPON ENDPOINTS
// ==========================================

app.get('/api/coupons', (req, res) => {
  const activeCoupons = db.coupons.filter((c: any) => c.isActive);
  res.json({ coupons: activeCoupons });
});

app.get('/api/admin/coupons', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role context required.' });
  }
  res.json({ coupons: db.coupons });
});

app.post('/api/admin/coupons', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role context required.' });
  }

  const { title, categorySlug, discountAmount, isActive } = req.body;
  const newCoupon = {
    id: 'coup-' + crypto.randomUUID().substring(0, 8),
    title,
    categorySlug,
    discountAmount: Number(discountAmount),
    isActive: !!isActive,
    createdAt: new Date().toISOString()
  };
  db.coupons.push(newCoupon);
  saveDB();
  res.json({ success: true, coupon: newCoupon });
});

app.put('/api/admin/coupons/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role context required.' });
  }

  const { id } = req.params;
  const { title, categorySlug, discountAmount, isActive } = req.body;
  const idx = db.coupons.findIndex((c: any) => c.id === id);
  
  if (idx === -1) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  db.coupons[idx] = {
    ...db.coupons[idx],
    ...(title !== undefined && { title }),
    ...(categorySlug !== undefined && { categorySlug }),
    ...(discountAmount !== undefined && { discountAmount: Number(discountAmount) }),
    ...(isActive !== undefined && { isActive: !!isActive }),
    updatedAt: new Date().toISOString()
  };
  saveDB();
  res.json({ success: true, coupon: db.coupons[idx] });
});

app.delete('/api/admin/coupons/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role context required.' });
  }

  const { id } = req.params;
  const initialLength = db.coupons.length;
  db.coupons = db.coupons.filter((c: any) => c.id !== id);
  
  if (db.coupons.length === initialLength) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  saveDB();
  res.json({ success: true, message: 'Coupon deleted successfully' });
});

// Get current user profile endpoint (Fixes forced logout bug on form submit)
app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized credentials session context.' });
  }

  const fullUser = db.users.find((u: any) => u.id === caller.id);
  if (!fullUser) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  let vendorRequest = null;
  if (fullUser.role === 'vendor') {
    vendorRequest = db.vendor_requests.find((v: any) => v.vendorId === fullUser.id && v.status === 'approved') || 
                    db.vendor_requests.find((v: any) => v.vendorId === fullUser.id);
  }

  res.json({
    user: {
      id: fullUser.id,
      name: fullUser.name,
      email: fullUser.email,
      phone: fullUser.phone,
      role: fullUser.role,
      addresses: fullUser.addresses || [],
      isSuspended: !!fullUser.isSuspended
    },
    vendorRequest
  });
});

// Authenticate / Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { emailOrPhone, password, captcha, expectedCaptcha } = req.body;

  if (!emailOrPhone || !password) {
    return res.status(400).json({ error: 'Email/phone and password are required.' });
  }

  // Captcha validation (skip if not provided)
  if (captcha && expectedCaptcha && captcha.toLowerCase() !== expectedCaptcha.toLowerCase()) {
    return res.status(400).json({ error: 'Verification code does not match. Please try again.' });
  }

  // Case-insensitive email OR exact phone match
  const user = db.users.find(
    (u: any) =>
      u.email.toLowerCase() === emailOrPhone.trim().toLowerCase() ||
      u.phone === emailOrPhone.trim()
  );

  if (!user) {
    return res.status(401).json({ error: 'No account found with this email or phone number.' });
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }

  // Check if account is suspended
  if (user.isSuspended) {
    return res.status(403).json({ error: 'Your account has been suspended. Contact the administrator.' });
  }

  // Generate Token
  const token = generateToken(user);
  
  // Log Action
  db.activity_logs.push({
    id: crypto.randomUUID(),
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'LOGIN',
    details: `Signed in as ${user.role}: ${user.email}`,
    timestamp: new Date().toISOString()
  });
  saveDB();

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  });
});

// Admin, Vendor, Customer, or Delivery Sign Up
app.post('/api/auth/signup', (req, res) => {
  const { name, email, phone, password, role, storeName, captcha, expectedCaptcha } = req.body;

  // Captcha validation
  if (captcha && expectedCaptcha && captcha.toLowerCase() !== expectedCaptcha.toLowerCase()) {
    return res.status(400).json({ error: 'Verification code does not match. Please try again.' });
  }

  // Required fields
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Prevent admin self-registration
  if (role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts cannot be self-registered. Contact a system administrator.' });
  }

  // Case-insensitive duplicate check
  const existing = db.users.find(
    (u: any) => u.email.toLowerCase() === normalizedEmail || (phone && u.phone === phone.trim())
  );
  if (existing) {
    if (existing.email.toLowerCase() === normalizedEmail) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please sign in instead.' });
    }
    return res.status(400).json({ error: 'This phone number is already registered to another account.' });
  }

  const newUser: any = {
    id: 'user-' + crypto.randomUUID().substring(0, 8),
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : '',
    passwordHash: hashPassword(password),
    role: role || 'customer',
    isApproved: role === 'delivery' ? true : undefined, // Delivery partners auto-approved
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  // If role is vendor, create initial pending request
  if (role === 'vendor' && storeName) {
    const freshRequest = {
      id: 'req-' + crypto.randomUUID().substring(0, 8),
      vendorId: newUser.id,
      storeName: storeName.trim(),
      legalName: `${name.trim()} General Ventures`,
      description: 'Handcrafted goods and regional specialties.',
      regNumber: 'PENDING',
      gstNumber: 'PENDING',
      businessPhone: phone || '',
      address: '',
      district: '',
      state: '',
      pincode: '',
      latitude: 20.5937,
      longitude: 78.9629,
      businessCategory: '',
      status: 'draft',
      documentUrl: '',
      remarks: 'Awaiting corporate verification documents.',
      history: [
        { status: 'draft', date: new Date().toISOString(), remark: 'Account created. Complete your store profile to apply.' }
      ],
      updatedAt: new Date().toISOString()
    };
    db.vendor_requests.push(freshRequest);
  }

  // If delivery, sync to delivery_staff table too
  if (role === 'delivery') {
    if (!db.delivery_staff) db.delivery_staff = [];
    db.delivery_staff.push({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone_number: newUser.phone,
      status: 'active',
      isApproved: true,
      created_at: newUser.createdAt
    });
  }

  db.activity_logs.push({
    id: crypto.randomUUID(),
    userId: newUser.id,
    userName: newUser.name,
    role: newUser.role,
    action: 'SIGNUP',
    details: `New account created: ${newUser.email} (${newUser.role})`,
    timestamp: new Date().toISOString()
  });

  saveDB();

  const token = generateToken(newUser);
  res.json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role
    }
  });
});

// Admin Credential Management Endpoint: commission new admin user
app.post('/api/admin/commission-admin', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized administrative control exception.' });
  }

  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'Missing commission parameters' });
  }

  const exists = db.users.find((u: any) => u.email === email || u.phone === phone);
  if (exists) {
    return res.status(400).json({ error: 'System already has a profile registered!' });
  }

  const newAdmin = {
    id: 'user-' + crypto.randomUUID().substring(0, 8),
    name,
    email,
    phone,
    passwordHash: hashPassword(password),
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  db.users.push(newAdmin);
  db.activity_logs.push({
    id: crypto.randomUUID(),
    userId: caller.id,
    userName: caller.name,
    role: 'admin',
    action: 'CREATE_ADMIN',
    details: `Commissioned admin capabilities to: ${name} (${email})`,
    timestamp: new Date().toISOString()
  });
  saveDB();

  res.json({ success: true, message: `Admin account of ${name} created successfully` });
});

// GET all users for admin accounts table
app.get('/api/admin/users', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role context required.' });
  }

  // Map users list to prevent sending password hashes
  const mappedUsers = db.users.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isSuspended: !!u.isSuspended,
    createdAt: u.createdAt
  }));

  res.json({ users: mappedUsers });
});

// Update user's authority level (UserRole)
app.put('/api/admin/users/:id/role', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role context required.' });
  }

  const { id } = req.params;
  const { role } = req.body;

  if (!['customer', 'vendor', 'admin', 'delivery'].includes(role)) {
    return res.status(400).json({ error: 'Invalid authority level role.' });
  }

  const u = db.users.find((user: any) => user.id === id);
  if (!u) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const oldRole = u.role;
  u.role = role;

  db.activity_logs.push({
    id: crypto.randomUUID(),
    userId: caller.id,
    userName: caller.name,
    role: 'admin',
    action: 'CHANGE_USER_ROLE',
    details: `Updated role of ${u.name} (${u.email}) from ${oldRole} to ${role}`,
    timestamp: new Date().toISOString()
  });

  saveDB();
  res.json({ success: true, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

// Toggle suspend/active account status
app.post('/api/admin/users/:id/toggle-suspend', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role context required.' });
  }

  const { id } = req.params;
  const u = db.users.find((user: any) => user.id === id);
  if (!u) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  // Prevent admin from suspending themselves
  if (u.id === caller.id) {
    return res.status(400).json({ error: 'You are forbidden from suspending your own administrative node.' });
  }

  u.isSuspended = !u.isSuspended;

  db.activity_logs.push({
    id: crypto.randomUUID(),
    userId: caller.id,
    userName: caller.name,
    role: 'admin',
    action: u.isSuspended ? 'SUSPEND_USER' : 'REACTIVATE_USER',
    details: `${u.isSuspended ? 'Suspended' : 'Reactivated'} account of ${u.name} (${u.email})`,
    timestamp: new Date().toISOString()
  });

  saveDB();
  res.json({ success: true, isSuspended: u.isSuspended });
});

// Get self profile
app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller) {
    return res.status(401).json({ error: 'Inactive credentials session context.' });
  }

  const full = db.users.find((u: any) => u.id === caller.id);
  if (!full) return res.status(404).json({ error: 'Profile not found' });

  // If vendor, attach their approval status
  let vendorRequest = null;
  if (full.role === 'vendor') {
    vendorRequest = db.vendor_requests.find((v: any) => v.vendorId === full.id);
  }

  res.json({
    user: {
      id: full.id,
      name: full.name,
      email: full.email,
      phone: full.phone,
      role: full.role
    },
    vendorRequest
  });
});

// Update self profile (name, email, phone, password) with validation
app.post('/api/auth/update', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller) {
    return res.status(401).json({ error: 'Session expired or invalid token.' });
  }

  const { name, email, phone, password } = req.body;

  const user = db.users.find((u: any) => u.id === caller.id);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  // Admin demo account cannot be edited or deleted to keep testing intact
  if (user.email === 'admin@gmail.com') {
    return res.status(403).json({ error: 'Admin demo account cannot be altered.' });
  }

  // Validate uniqueness of email and phone if being changed
  if (email && email.toLowerCase() !== user.email.toLowerCase()) {
    const emailDupe = db.users.find((u: any) => u.id !== user.id && u.email.toLowerCase() === email.toLowerCase());
    if (emailDupe) {
      return res.status(400).json({ error: 'This email is already in use by another profile.' });
    }
    user.email = email;
  }

  if (phone && phone !== user.phone) {
    const phoneDupe = db.users.find((u: any) => u.id !== user.id && u.phone === phone);
    if (phoneDupe) {
      return res.status(400).json({ error: 'This phone number is already registered to another user.' });
    }
    user.phone = phone;
  }

  if (name) {
    user.name = name;
  }

  if (password) {
    user.passwordHash = hashPassword(password);
  }

  saveDB();

  res.json({
    success: true,
    message: 'Profile details updated and stored securely.',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  });
});

// Admin: view all vendor intakes
app.get('/api/admin/vendor-requests', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role context required.' });
  }

  res.json({ requests: db.vendor_requests });
});

// Admin Audit: approve or reject vendor intake
app.post('/api/admin/vendor-requests/:id/audit', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role context required.' });
  }

  const { id } = req.params;
  const { status, remarks } = req.body; // 'approved' or 'rejected'

  const request = db.vendor_requests.find((r: any) => r.id === id);
  if (!request) return res.status(404).json({ error: 'Intake audit not found.' });

  request.status = status;
  request.remarks = remarks || 'Audit update processed.';
  request.history.push({
    status,
    date: new Date().toISOString(),
    remark: remarks || `Status updated to ${status}`
  });
  request.updatedAt = new Date().toISOString();

  if (status === 'approved') {
    // Automatically create dynamic sandbox schema for the approved vendor!
    const schemaName = initializeVendorSchema(request.storeName);
    
    // Create first stock items from default schema state inside vendor model list
    const schemaObj = db.schemas[schemaName];
    schemaObj.settings.approvedAt = new Date().toISOString();
  }

  db.activity_logs.push({
    id: crypto.randomUUID(),
    userId: caller.id,
    userName: caller.name,
    role: 'admin',
    action: `VENDOR_${status.toUpperCase()}`,
    details: `${status} corporate registry of vendor: ${request.storeName}`,
    timestamp: new Date().toISOString()
  });

  saveDB();
  res.json({ success: true, request });
});

// Vendor: Upload/Submit Corporate Profile Form
app.post('/api/vendor/profile/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'vendor') {
    return res.status(403).json({ error: 'Vendor profile required.' });
  }

  const {
    storeName,
    legalName,
    description,
    regNumber,
    gstNumber,
    businessPhone,
    address,
    district,
    state,
    pincode,
    latitude,
    longitude,
    additionalDetails,
    documentUrl,
    businessCategory
  } = req.body;

  let request = db.vendor_requests.find((r: any) => r.vendorId === caller.id);
  if (!request) {
    request = {
      id: 'req-' + crypto.randomUUID().substring(0, 8),
      vendorId: caller.id,
      history: []
    };
    db.vendor_requests.push(request);
  }

  request.storeName = storeName;
  request.legalName = legalName;
  request.description = description;
  request.regNumber = regNumber;
  request.gstNumber = gstNumber;
  request.businessPhone = businessPhone;
  request.address = address;
  request.district = district;
  request.state = state;
  request.pincode = pincode;
  request.latitude = parseFloat(latitude) || 20.5937;
  request.longitude = parseFloat(longitude) || 78.9629;
  request.businessCategory = businessCategory || '';
  request.status = 'pending'; // Marking as pending for admin review
  request.documentUrl = documentUrl || '';
  request.additionalDetails = additionalDetails || '';
  request.remarks = 'Company application documentation submitted. Evaluating credentials.';
  request.history.push({
    status: 'pending',
    date: new Date().toISOString(),
    remark: 'Corporate verification details submitted by merchant.'
  });
  request.updatedAt = new Date().toISOString();

  saveDB();
  res.json({ success: true, request });
});

// Admin Category, Brand Moderation API
app.post('/api/admin/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing standard category name value.' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const fresh = { id: crypto.randomUUID().substring(0, 8), name, slug };
  db.categories.push(fresh);
  saveDB();
  res.json({ success: true, category: fresh });
});

app.post('/api/admin/brands', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing standard brand name value.' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const fresh = { id: crypto.randomUUID().substring(0, 8), name, slug };
  db.brands.push(fresh);
  saveDB();
  res.json({ success: true, brand: fresh });
});

app.delete('/api/admin/categories/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role context required.' });
  }

  const { id } = req.params;
  db.categories = db.categories.filter((c: any) => c.id !== id);
  saveDB();
  res.json({ success: true, categories: db.categories });
});

app.delete('/api/admin/brands/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role context required.' });
  }

  const { id } = req.params;
  db.brands = db.brands.filter((b: any) => b.id !== id);
  saveDB();
  res.json({ success: true, brands: db.brands });
});

// Browser Catalog Search
app.get('/api/products', (req, res) => {
  // Only display approved and active products
  res.json({ products: db.products.filter((p: any) => p.isApproved && !p.disabledByAdmin) });
});

// AI-recommended Products route
app.get('/api/products/ai-recommendations', (req, res) => {
  const approved = db.products.filter((p: any) => p.isApproved && !p.disabledByAdmin);
  const sorted = [...approved].sort((a: any, b: any) => (b.ratings || 0) - (a.ratings || 0));
  const recommendations = sorted.slice(0, 3);
  res.json({ recommendations });
});

// Vendor Analytics Endpoint
app.get('/api/vendor/analytics', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'vendor') {
    return res.status(403).json({ error: 'Merchant context required.' });
  }

  const vendorProducts = db.products.filter((p: any) => p.vendorId === caller.id);
  const vendorProductIds = vendorProducts.map((p: any) => p.id);
  
  // Find all orders that contain at least one item from this vendor
  const vendorOrders = db.orders.filter((o: any) => 
    o.items.some((item: any) => vendorProductIds.includes(item.productId))
  );

  let totalRevenue = 0;
  vendorOrders.forEach((o: any) => {
    o.items.forEach((item: any) => {
      if (vendorProductIds.includes(item.productId)) {
        totalRevenue += item.price * item.quantity;
      }
    });
  });

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const salesByDay: Record<string, number> = {};
  last7Days.forEach(d => salesByDay[d] = 0);

  vendorOrders.forEach((o: any) => {
    const d = new Date(o.createdAt || new Date()).toISOString().split('T')[0];
    if (salesByDay[d] !== undefined) {
      o.items.forEach((item: any) => {
        if (vendorProductIds.includes(item.productId)) {
          salesByDay[d] += item.price * item.quantity;
        }
      });
    }
  });

  const topProductsRaw: Record<string, { name: string; sales: number }> = {};
  vendorOrders.forEach((o: any) => {
    o.items.forEach((item: any) => {
      if (vendorProductIds.includes(item.productId)) {
        if (!topProductsRaw[item.productId]) {
          topProductsRaw[item.productId] = { name: item.name, sales: 0 };
        }
        topProductsRaw[item.productId].sales += item.quantity;
      }
    });
  });

  let finalSalesByDay = last7Days.map(day => ({ date: day, amount: salesByDay[day] }));
  let finalTopProducts = Object.values(topProductsRaw)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  // If no orders exist, inject beautiful dummy data for demonstration
  if (vendorOrders.length === 0) {
    finalSalesByDay = last7Days.map((day) => ({ date: day, amount: Math.floor(Math.random() * 30000) + 5000 }));
    if (vendorProducts.length > 0) {
      finalTopProducts = vendorProducts.slice(0, 5).map((p: any) => ({ name: p.name, sales: Math.floor(Math.random() * 80) + 20 }));
    } else {
      finalTopProducts = [
        { name: 'Premium Leather Wallet', sales: 145 },
        { name: 'Wireless Noise-Canceling Earbuds', sales: 98 },
        { name: 'Organic Arabica Coffee', sales: 76 },
        { name: 'Smart Fitness Tracker', sales: 54 },
        { name: 'Ceramic Table Lamp', sales: 32 }
      ];
    }
  }

  res.json({
    salesByDay: finalSalesByDay,
    topProducts: finalTopProducts,
    totalRevenue: vendorOrders.length === 0 ? 124500 : totalRevenue,
    totalOrders: vendorOrders.length === 0 ? 42 : vendorOrders.length
  });
});

// Dynamic Multi-tenant Vendor Product Catalog endpoints
app.get('/api/vendor/products', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'vendor') {
    return res.status(403).json({ error: 'Merchant context required.' });
  }

  const vReq = db.vendor_requests.find((v: any) => v.vendorId === caller.id && v.status === 'approved');
  if (!vReq) {
    return res.status(403).json({ error: 'Corporate application must be APPROVED to access inventory schemas.' });
  }

  const schemaName = `vendor_${vReq.storeName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
  const vendorSchema = db.schemas[schemaName] || { products: [] };

  res.json({ products: vendorSchema.products || [], schemaName });
});

app.post('/api/vendor/products', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'vendor') {
    return res.status(403).json({ error: 'Merchant context required.' });
  }

  const vReq = db.vendor_requests.find((v: any) => v.vendorId === caller.id && v.status === 'approved');
  if (!vReq) return res.status(403).json({ error: 'Vendor profile not verified.' });

  const { name, price, description, images, category, brand, stock, video } = req.body;
  
  const schemaName = `vendor_${vReq.storeName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
  if (!db.schemas[schemaName]) initializeVendorSchema(vReq.storeName);

  const newProduct = {
    id: 'prod-' + crypto.randomUUID().substring(0, 8),
    vendorId: caller.id,
    vendorStoreName: vReq.storeName,
    name,
    price: parseFloat(price) || 0,
    description: description || '',
    images: images && images.length ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'],
    video: video || '',
    category,
    brand,
    stock: parseInt(stock) || 0,
    ratings: 5.0,
    reviewsCount: 0,
    isApproved: true,
    createdAt: new Date().toISOString()
  };

  db.schemas[schemaName].products.push(newProduct);
  
  // IMMEDIATELY sync vendor specific products array to the public.marketplace_products catalog
  syncVendorProductsToPublic(schemaName, caller.id, vReq.storeName);

  res.json({ success: true, product: newProduct });
});

app.put('/api/vendor/products/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'vendor') return res.status(403).json({ error: 'Vendor required.' });
  const vReq = db.vendor_requests.find((v: any) => v.vendorId === caller.id && v.status === 'approved');
  if (!vReq) return res.status(403).json({ error: 'Vendor not approved.' });

  const { name, price, description, images, category, brand, stock, video } = req.body;
  const schemaName = `vendor_${vReq.storeName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

  const vendorProducts = db.schemas[schemaName]?.products || [];
  const prodIndex = vendorProducts.findIndex((p: any) => p.id === req.params.id);

  if (prodIndex === -1) return res.status(404).json({ error: 'Item not in your tenancy schema.' });

  // Block editing if disabled by admin
  if (vendorProducts[prodIndex].disabledByAdmin) {
    return res.status(403).json({ error: 'This product has been disabled by the administrator and cannot be modified.' });
  }

  const updatedProd = {
    ...vendorProducts[prodIndex],
    name,
    price: parseFloat(price) || 0,
    description,
    images: images && images.length ? images : vendorProducts[prodIndex].images,
    video: video !== undefined ? video : vendorProducts[prodIndex].video,
    category,
    brand,
    stock: parseInt(stock) || 0
  };

  db.schemas[schemaName].products[prodIndex] = updatedProd;
  syncVendorProductsToPublic(schemaName, caller.id, vReq.storeName);

  res.json({ success: true, product: updatedProd });
});

app.delete('/api/vendor/products/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'vendor') return res.status(403).json({ error: 'Access denied.' });
  const vReq = db.vendor_requests.find((v: any) => v.vendorId === caller.id && v.status === 'approved');
  if (!vReq) return res.status(403).json({ error: 'Access restricted.' });

  const schemaName = `vendor_${vReq.storeName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
  
  if (db.schemas[schemaName]) {
    const prod = db.schemas[schemaName].products.find((p: any) => p.id === req.params.id);
    if (prod && prod.disabledByAdmin) {
      return res.status(403).json({ error: 'This product has been disabled by the administrator and cannot be deleted.' });
    }
    db.schemas[schemaName].products = (db.schemas[schemaName].products || []).filter((p: any) => p.id !== req.params.id);
    syncVendorProductsToPublic(schemaName, caller.id, vReq.storeName);
  }

  res.json({ success: true });
});

// Reviews and Ratings submissions
app.post('/api/products/:id/reviews', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller) return res.status(401).json({ error: 'Auth credentials context required.' });

  const { id } = req.params;
  const { rating, reviewText } = req.body;

  const prod = db.products.find((p: any) => p.id === id);
  if (!prod) return res.status(404).json({ error: 'Product not initialized in scope.' });

  const newReview = {
    id: 'rev-' + crypto.randomUUID().substring(0, 8),
    productId: id,
    userName: caller.name,
    userInitial: caller.name.charAt(0).toUpperCase(),
    rating: parseInt(rating) || 5,
    reviewText: reviewText || '',
    createdAt: new Date().toISOString()
  };

  db.reviews.push(newReview);

  // Recalculate average rating
  const pReviews = db.reviews.filter((r: any) => r.productId === id);
  const totalRating = pReviews.reduce((sum: number, r: any) => sum + r.rating, 0);
  prod.ratings = parseFloat((totalRating / pReviews.length).toFixed(1));
  prod.reviewsCount = pReviews.length;

  saveDB();
  res.json({ success: true, review: newReview, avgRating: prod.ratings });
});

app.get('/api/products/:id/reviews', (req, res) => {
  const reviews = db.reviews.filter((r: any) => r.productId === req.params.id);
  res.json({ reviews });
});

// Category and Brand catalog endpoints
app.get('/api/categories', (req, res) => res.json({ categories: db.categories }));
app.get('/api/brands', (req, res) => res.json({ brands: db.brands }));

// Global Reviews endpoints
app.get('/api/reviews', (req, res) => {
  res.json({ reviews: db.reviews || [] });
});

app.post('/api/reviews', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  const { productId, rating, comment, reviewText, reviewerName } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'productId is required.' });
  }

  const prod = db.products.find((p: any) => p.id === productId);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const uName = caller?.name || reviewerName || 'Aura Customer';
  const newReview = {
    id: 'rev-' + crypto.randomUUID().substring(0, 8),
    productId,
    userName: uName,
    userInitial: uName.charAt(0).toUpperCase(),
    rating: parseInt(rating) || 5,
    reviewText: reviewText || comment || '',
    createdAt: new Date().toISOString()
  };

  if (!db.reviews) {
    db.reviews = [];
  }
  db.reviews.push(newReview);

  // Recalculate average rating of that product
  const pReviews = db.reviews.filter((r: any) => r.productId === productId);
  const totalRating = pReviews.reduce((sum: number, r: any) => sum + r.rating, 0);
  prod.ratings = parseFloat((totalRating / pReviews.length).toFixed(1));
  prod.reviewsCount = pReviews.length;

  saveDB();
  res.json({ success: true, reviews: db.reviews, review: newReview, avgRating: prod.ratings });
});

// Customer Geolocated Addresses endpoints
app.get('/api/customer/addresses', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller) {
    return res.status(401).json({ error: 'Auth credentials context required.' });
  }

  const u = db.users.find((user: any) => user.email === caller.email || user.id === caller.id);
  if (!u) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  res.json({ addresses: u.addresses || [] });
});

app.post('/api/customer/addresses', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller) {
    return res.status(401).json({ error: 'Auth credentials context required.' });
  }

  const u = db.users.find((user: any) => user.email === caller.email || user.id === caller.id);
  if (!u) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  const { label, addressLine, district, state, pincode, latitude, longitude } = req.body;

  if (!addressLine) {
    return res.status(400).json({ error: 'Address line is mandatory.' });
  }

  const newAddress = {
    id: 'addr-' + crypto.randomUUID().substring(0, 8),
    label: label || 'Home',
    addressLine,
    district: district || '',
    state: state || '',
    pincode: pincode || '',
    latitude: parseFloat(latitude) || null,
    longitude: parseFloat(longitude) || null,
    createdAt: new Date().toISOString()
  };

  if (!u.addresses) {
    u.addresses = [];
  }
  u.addresses.push(newAddress);

  saveDB();
  res.json({ success: true, addresses: u.addresses });
});

app.delete('/api/customer/addresses/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller) {
    return res.status(401).json({ error: 'Auth credentials context required.' });
  }

  const u = db.users.find((user: any) => user.email === caller.email || user.id === caller.id);
  if (!u) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  const { id } = req.params;
  if (!u.addresses) return res.status(404).json({ error: 'No addresses found.' });
  
  const initialLength = u.addresses.length;
  u.addresses = u.addresses.filter((addr: any) => addr.id !== id);

  if (u.addresses.length === initialLength) {
    return res.status(404).json({ error: 'Address not found' });
  }

  saveDB();
  res.json({ success: true, addresses: u.addresses });
});

// Helper to ensure a shipment and its corresponding QR Code is created for an order
async function ensureShipmentByOrder(order: any) {
  if (!db.shipments) db.shipments = [];
  let shipment = db.shipments.find((s: any) => s.order_id === order.id);

  if (!shipment) {
    const tracking_number = 'TRK-' + order.id + '-' + Math.floor(Math.random() * 899 + 100);
    const shipmentId = 'SHP-' + Math.floor(Math.random() * 89999 + 10000);

    const qrPayload = {
      orderId: order.id,
      customerId: order.customerId,
      vendorId: order.vendorId,
      trackingNumber: tracking_number,
      currentStatus: order.orderStatus,
      timestamp: new Date().toISOString()
    };

    let qrBase64 = '';
    try {
      qrBase64 = await QRCode.toDataURL(JSON.stringify(qrPayload));
    } catch (err) {
      console.error('Failed to generate high fidelity QR via qrcode package:', err);
      qrBase64 = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify(qrPayload))}`;
    }

    shipment = {
      id: shipmentId,
      order_id: order.id,
      vendor_id: order.vendorId,
      delivery_staff_id: null,
      tracking_number,
      qr_code: qrBase64,
      shipment_status: order.orderStatus,
      shipped_at: null,
      delivered_at: null,
      created_at: new Date().toISOString()
    };

    db.shipments.push(shipment);

    // Initial log
    if (!db.shipment_logs) db.shipment_logs = [];
    db.shipment_logs.push({
      id: 'LOG-' + Math.floor(Math.random() * 89999 + 10000),
      shipment_id: shipment.id,
      scanned_by: 'System Auto-Processor',
      scanned_role: 'admin',
      old_status: 'none',
      new_status: order.orderStatus,
      scan_location: 'Fulfillment Logistics Center',
      created_at: new Date().toISOString()
    });

    order.shippingQrCode = qrBase64;
    order.trackingNumber = tracking_number;
    saveDB();
  } else {
    // Sync shipment status if order status changed
    if (shipment.shipment_status !== order.orderStatus) {
      const oldStatus = shipment.shipment_status;
      shipment.shipment_status = order.orderStatus;
      
      if (order.orderStatus === 'shipped') {
        shipment.shipped_at = new Date().toISOString();
      } else if (order.orderStatus === 'delivered') {
        shipment.delivered_at = new Date().toISOString();
      }

      // Re-generate QR mirroring new status
      const qrPayload = {
        orderId: order.id,
        customerId: order.customerId,
        vendorId: order.vendorId,
        trackingNumber: shipment.tracking_number,
        currentStatus: order.orderStatus,
        timestamp: new Date().toISOString()
      };
      try {
        shipment.qr_code = await QRCode.toDataURL(JSON.stringify(qrPayload));
        order.shippingQrCode = shipment.qr_code;
      } catch (e) {
        // Fallback
      }

      if (!db.shipment_logs) db.shipment_logs = [];
      db.shipment_logs.push({
        id: 'LOG-' + Math.floor(Math.random() * 89999 + 10000),
        shipment_id: shipment.id,
        scanned_by: 'Logistics Supervisor',
        scanned_role: 'admin',
        old_status: oldStatus,
        new_status: order.orderStatus,
        scan_location: 'Central Sorting Hub',
        created_at: new Date().toISOString()
      });
      saveDB();
    }
  }
  return shipment;
}

// Order placement & cart validation Flow
app.post('/api/orders', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller) return res.status(401).json({ error: 'Customer session context needed.' });

  const { items, deliveryAddress, paymentMethod, appliedCouponId } = req.body;

  if (!items || !items.length) return res.status(400).json({ error: 'Empty transaction cart.' });

  let discountPercentage = 0;
  if (appliedCouponId) {
    const coupon = db.coupons.find((c: any) => c.id === appliedCouponId);
    if (coupon && coupon.isActive) {
      discountPercentage = Number(coupon.discountAmount) || 0;
    }
  }

  // Separate items by their vendor origin to instantiate sub-orders
  // As in true multi-vendor platform, orders are processed and shipped per vendor!
  const vendorGroups: Record<string, { storeName: string; list: any[] }> = {};
  
  items.forEach((item: any) => {
    const prod = db.products.find((p: any) => p.id === item.productId);
    if (!prod) return;
    const vId = prod.vendorId;
    if (!vendorGroups[vId]) {
      vendorGroups[vId] = { storeName: prod.vendorStoreName, list: [] };
    }
    // Decrement inventory stock securely
    prod.stock = Math.max(0, prod.stock - item.quantity);
    vendorGroups[vId].list.push({
      productId: item.productId,
      name: prod.name,
      price: prod.price,
      quantity: item.quantity,
      image: prod.images[0]
    });
  });

  const createdOrders: any[] = [];
  const generatedInvoiceId = 'INV-' + Math.floor(Math.random() * 89999 + 10000);

  for (const [vId, group] of Object.entries(vendorGroups)) {
    let subTotal = group.list.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
    if (discountPercentage > 0) {
      subTotal = Math.max(0, subTotal - (subTotal * discountPercentage / 100));
    }
    const orderId = 'OB-' + Math.floor(Math.random() * 89999) + '-' + Math.floor(Math.random() * 899 + 100);
    
    // Create status tracing QR Code URL (or a simulated asset)
    const qrData = JSON.stringify({
      orderId,
      vendor: group.storeName,
      customer: caller.name,
      address: deliveryAddress?.addressLine || 'Self Collect',
      itemsCount: group.list.length
    });

    const freshOrder = {
      id: orderId,
      customerId: caller.id,
      customerName: caller.name,
      customerPhone: caller.phone || '9876543210',
      vendorId: vId,
      vendorStoreName: group.storeName,
      items: group.list,
      totalAmount: subTotal,
      paymentMethod: paymentMethod || 'upi',
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'success', // UPI / Card is immediately completed in simulation
      orderStatus: 'pending',
      deliveryAddress: {
        fullName: deliveryAddress?.fullName || caller.name,
        phone: deliveryAddress?.phone || caller.phone,
        addressLine: deliveryAddress?.addressLine || 'Main Bazaar Road',
        district: deliveryAddress?.district || 'Central District',
        state: deliveryAddress?.state || 'State',
        pincode: deliveryAddress?.pincode || '600001',
        latitude: deliveryAddress?.latitude || 13.0827,
        longitude: deliveryAddress?.longitude || 80.2707
      },
      shippingQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`,
      invoiceId: generatedInvoiceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackingNumber: ''
    };

    db.orders.push(freshOrder);
    createdOrders.push(freshOrder);

    // Sync to Firestore for WhatsApp notifications
    await syncOrderToFirestore(freshOrder);

    // Dynamic QR and Shipment orchestration
    await ensureShipmentByOrder(freshOrder);

    // Increase total completed count in vendor dynamic schema metrics
    const schemaName = `vendor_${group.storeName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    if (db.schemas[schemaName]) {
      db.schemas[schemaName].analytics.totalRevenue += subTotal;
      db.schemas[schemaName].analytics.completedOrdersCount += 1;
    }

    // Add alert notification for vendor
    db.notifications.push({
      id: crypto.randomUUID().substring(0, 8),
      userId: vId,
      title: 'Incoming Transit Request',
      message: `New shipment order ${orderId} received. Fulfill immediately.`,
      type: 'order',
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  // Client notifications
  db.notifications.push({
    id: crypto.randomUUID().substring(0, 8),
    userId: caller.id,
    title: 'Order Confirmed',
    message: `Payment authorized successfully. Invoice ID ${generatedInvoiceId} generated.`,
    type: 'order',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDB();
  res.json({ success: true, orders: createdOrders });
});

// View My Orders / Vendor Orders / Carrier Logistics
app.get('/api/orders', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller) return res.status(401).json({ error: 'Context missing.' });

  // Filters based on role
  if (caller.role === 'admin') {
    return res.json({ orders: db.orders });
  } else if (caller.role === 'vendor') {
    return res.json({ orders: db.orders.filter((o: any) => o.vendorId === caller.id) });
  } else if (caller.role === 'delivery') {
    // Deliveries can see all shipped orders
    return res.json({ orders: db.orders.filter((o: any) => o.orderStatus === 'shipped' || o.orderStatus === 'out_for_delivery' || o.orderStatus === 'delivered') });
  } else {
    // Customer
    return res.json({ orders: db.orders.filter((o: any) => o.customerId === caller.id) });
  }
});

// Update Order status workflow containing strict QR interactions
app.post('/api/orders/:id/status', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller) return res.status(419).json({ error: 'Auth failed' });

  const { id } = req.params;
  const { status } = req.body; // 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered'

  const order = db.orders.find((o: any) => o.id === id);
  if (!order) return res.status(404).json({ error: 'Logistics cargo not found' });

  // Security authorization constraints per role
  if (caller.role === 'vendor' && order.vendorId !== caller.id) {
    return res.status(403).json({ error: 'Access denied: not your shipment tenancy.' });
  }

  order.orderStatus = status;
  order.updatedAt = new Date().toISOString();

  // Generate status milestones notification
  db.notifications.push({
    id: crypto.randomUUID().substring(0, 8),
    userId: order.customerId,
    title: `Shipment Milestone: ${status.replace('_', ' ').toUpperCase()}`,
    message: `Your Indian marketplace parcel ${id} from ${order.vendorStoreName} is now: ${status}.`,
    type: 'order',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  // Sync to shipments DB
  await ensureShipmentByOrder(order);

  // Sync to Firestore for WhatsApp notifications
  await syncOrderToFirestore(order);

  saveDB();
  res.json({ success: true, order });
});

// --- SHIPMENT & LOGISTICS DELIVERY STAFF ENDPOINTS ---

// GET /api/delivery/staff (Admin lists all staff)
app.get('/api/delivery/staff', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  
  const staffWithUsers = (db.delivery_staff || []).map((ds: any) => {
    const u = db.users.find((userObj: any) => userObj.id === ds.id);
    return {
      ...ds,
      isApproved: u ? (u.isApproved !== false) : true
    };
  });
  res.json({ delivery_staff: staffWithUsers });
});

// POST /api/delivery/staff (Admin registers/creates a new delivery staff)
app.post('/api/delivery/staff', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin authorization required.' });
  }

  const { id, name, email, phone, phone_number, password, vehicle_type, vehicle_plate } = req.body;
  const finalPhone = phone_number || phone;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields (name, email, password) are required.' });
  }

  // Check if user already exists
  const existing = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'A staff/user already exists with this email.' });
  }

  let finalUserId = id ? id.trim() : '';
  if (finalUserId) {
    // Sanitize slug format (all lowercase, dashes instead of spaces)
    finalUserId = finalUserId.toLowerCase().replace(/[^a-z0-0_-]/g, '-').replace(/-+/g, '-');
    const existingById = db.users.find((u: any) => u.id === finalUserId);
    if (existingById) {
      return res.status(400).json({ error: 'A user account already exists with this custom ID. Please provide a unique ID.' });
    }
  } else {
    finalUserId = 'user-' + crypto.randomUUID().substring(0, 8);
  }

  const newUser = {
    id: finalUserId,
    name,
    email,
    phone: finalPhone || '8888888888',
    passwordHash: hashPassword(password),
    role: 'delivery',
    isApproved: true, // Approved by default upon admin enrollment
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  const staffRecord = {
    id: finalUserId,
    name,
    email,
    phone_number: finalPhone || '8888888888',
    vehicle_type: vehicle_type || '',
    vehicle_plate: vehicle_plate || '',
    status: 'active',
    isApproved: true,
    created_at: new Date().toISOString()
  };

  db.delivery_staff = db.delivery_staff || [];
  db.delivery_staff.push(staffRecord);

  // Add notification
  db.notifications.push({
    id: 'notif-' + Math.floor(Math.random() * 89999),
    userId: finalUserId,
    title: 'Carrier Agent Onboarded',
    message: `Welcome ${name}! Your delivery agent credentials have been initialized under ID: ${finalUserId}.`,
    type: 'system',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDB();
  res.json({ success: true, staff: staffRecord });
});

// POST /api/delivery/staff/:id/approve (Admin toggles or sets approval state of a delivery staff for login)
app.post('/api/delivery/staff/:id/approve', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin authorization required.' });
  }

  const { id } = req.params;
  const { isApproved } = req.body;

  const u = db.users.find((userObj: any) => userObj.id === id);
  if (!u) {
    return res.status(404).json({ error: 'Delivery partner user account not found.' });
  }

  u.isApproved = !!isApproved;
  
  const ds = db.delivery_staff.find((dsObj: any) => dsObj.id === id);
  if (ds) {
    ds.isApproved = !!isApproved;
  }

  saveDB();
  res.json({ success: true, isApproved: u.isApproved });
});

// DELETE /api/delivery/staff/:id (Admin deletes a delivery staff)
app.delete('/api/delivery/staff/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin authorization required.' });
  }

  const { id } = req.params;
  db.users = db.users.filter((u: any) => u.id !== id);
  db.delivery_staff = db.delivery_staff.filter((ds: any) => ds.id !== id);
  saveDB();
  res.json({ success: true });
});

// GET /api/admin/vehicle-types
app.get('/api/admin/vehicle-types', (req, res) => {
  res.json({ vehicle_types: db.vehicle_types || [] });
});

// POST /api/admin/vehicle-types
app.post('/api/admin/vehicle-types', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin authorization required.' });
  }

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  db.vehicle_types = db.vehicle_types || [];
  const newType = { id: 'vt-' + crypto.randomUUID().substring(0, 8), name };
  db.vehicle_types.push(newType);
  saveDB();
  res.json({ vehicle_type: newType });
});

// DELETE /api/admin/vehicle-types/:id
app.delete('/api/admin/vehicle-types/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin authorization required.' });
  }

  const { id } = req.params;
  db.vehicle_types = (db.vehicle_types || []).filter((vt: any) => vt.id !== id);
  saveDB();
  res.json({ success: true });
});

// GET /api/shipments (Filtered by roles)
app.get('/api/shipments', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller) return res.status(401).json({ error: 'Authentication required' });

  let shipmentsFiltered = db.shipments || [];

  // Match corresponding orders to enrich with address/customer details
  const shipmentsEnriched = shipmentsFiltered.map((s: any) => {
    const o = db.orders.find((ord: any) => ord.id === s.order_id);
    return {
      ...s,
      order: o || null,
      delivery_address: o ? o.deliveryAddress : null,
      customer_name: o ? o.customerName : 'N/A',
      customer_phone: o ? o.customerPhone : 'N/A'
    };
  });

  if (caller.role === 'admin') {
    return res.json({ shipments: shipmentsEnriched });
  } else if (caller.role === 'vendor') {
    const vendorShipments = shipmentsEnriched.filter((s: any) => s.vendor_id === caller.id);
    return res.json({ shipments: vendorShipments });
  } else if (caller.role === 'delivery') {
    // Deliveries can see shipments assigned to them or unassigned
    const deliveryShipments = shipmentsEnriched.filter((s: any) => s.delivery_staff_id === caller.id || !s.delivery_staff_id);
    return res.json({ shipments: deliveryShipments });
  } else {
    // Customer
    const ordersForCust = db.orders.filter((ord: any) => ord.customerId === caller.id);
    const orderIds = ordersForCust.map((ord: any) => ord.id);
    const customerShipments = shipmentsEnriched.filter((s: any) => orderIds.includes(s.order_id));
    return res.json({ shipments: customerShipments });
  }
});

// GET /api/shipments/logs (Admin & Delivery history check)
app.get('/api/shipments/logs', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller) return res.status(401).json({ error: 'Auth required.' });

  const logs = db.shipment_logs || [];
  res.json({ logs });
});

// POST /api/shipments/:id/assign
app.post('/api/shipments/:id/assign', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller) return res.status(401).json({ error: 'Auth session expired' });

  const { id } = req.params;
  const { delivery_staff_id } = req.body; // Can be manually passed by admin, or empty (means caller self-claims)

  const shipment = db.shipments.find((s: any) => s.id === id);
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

  const targetStaffId = delivery_staff_id || caller.id;
  const staff = db.delivery_staff.find((st: any) => st.id === targetStaffId);
  if (!staff) return res.status(404).json({ error: 'Delivery staff not registered on platform.' });

  shipment.delivery_staff_id = targetStaffId;
  
  // also update status from confirmed/processing to 'out_for_delivery' or keep status, we can keep status or set to out_for_delivery
  // To keep it standard, let's update order status to out_for_delivery when assigned or when running scanning!
  const order = db.orders.find((ord: any) => ord.id === shipment.order_id);
  if (order && order.orderStatus === 'shipped') {
    order.orderStatus = 'out_for_delivery';
    order.updatedAt = new Date().toISOString();
    shipment.shipment_status = 'out_for_delivery';
    
    // Add customer notifications
    db.notifications.push({
      id: 'notif-' + Math.floor(Math.random() * 8999),
      userId: order.customerId,
      title: 'Our Agent Is Arriving',
      message: `${staff.name} is arriving shortly to deliver your parcel ${order.id}.`,
      type: 'order',
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  // Create log
  db.shipment_logs.push({
    id: 'LOG-' + Math.floor(Math.random() * 89999 + 10000),
    shipment_id: shipment.id,
    scanned_by: caller.name,
    scanned_role: caller.role,
    old_status: shipment.shipment_status,
    new_status: shipment.shipment_status,
    scan_location: 'Assigned to Courier',
    created_at: new Date().toISOString()
  });

  saveDB();
  res.json({ success: true, shipment });
});

// POST /api/shipments/:id/cancel (Cancel courier assignment and return to pool)
app.post('/api/shipments/:id/cancel', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller) return res.status(401).json({ error: 'Auth session expired' });

  const { id } = req.params;
  const shipment = db.shipments.find((s: any) => s.id === id);
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

  const old_status = shipment.shipment_status;
  
  // Release delivery crew
  shipment.delivery_staff_id = null;
  shipment.shipment_status = 'shipped';

  // Sync to database orders model
  const order = db.orders.find((ord: any) => ord.id === shipment.order_id);
  if (order) {
    order.orderStatus = 'shipped';
    order.updatedAt = new Date().toISOString();
  }

  // Create log audit entry
  db.shipment_logs.push({
    id: 'LOG-' + Math.floor(Math.random() * 89999 + 10000),
    shipment_id: shipment.id,
    scanned_by: caller.name,
    scanned_role: caller.role,
    old_status,
    new_status: 'shipped',
    scan_location: 'Delivery Assignment Cancelled (Returned to Hub Queue)',
    created_at: new Date().toISOString()
  });

  saveDB();
  res.json({ success: true, shipment });
});

// POST /api/shipments/scan
app.post('/api/shipments/scan', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller) return res.status(401).json({ error: 'Identity validation failed' });

  const { qrPayload, scan_location } = req.body;
  if (!qrPayload) return res.status(400).json({ error: 'QR verification payload needed.' });

  let parsedPayload: any = null;
  try {
    parsedPayload = typeof qrPayload === 'string' ? JSON.parse(qrPayload) : qrPayload;
  } catch (err) {
    return res.status(400).json({ error: 'Invalid QR verification payload.' });
  }

  const { orderId, trackingNumber } = parsedPayload;
  if (!orderId) {
    return res.status(400).json({ error: 'No associated Order ID found in QR code.' });
  }

  // Find shipment
  const shipment = db.shipments.find((s: any) => s.order_id === orderId || s.tracking_number === trackingNumber);
  if (!shipment) return res.status(404).json({ error: 'No active shipment matches this QR matrix parameters.' });

  const order = db.orders.find((ord: any) => ord.id === shipment.order_id);
  if (!order) return res.status(404).json({ error: 'Order is no longer registered on our catalog.' });

  const old_status = shipment.shipment_status;
  let new_status = old_status;

  // Let's execute role-based scanning:
  if (caller.role === 'vendor') {
    if (shipment.vendor_id !== caller.id) {
       return res.status(403).json({ error: 'Access forbidden: You cannot scan shipment belonging to another vendor.' });
    }
    // Vendor scans -> Transition status to SHIPPED
    new_status = 'shipped';
    shipment.shipped_at = new Date().toISOString();
  } else if (caller.role === 'delivery') {
    // Delivery staff scans -> Transition status to DELIVERED
    new_status = 'delivered';
    shipment.delivered_at = new Date().toISOString();
    
    // Automatically assign delivery agent to this shipment if it was null
    if (!shipment.delivery_staff_id) {
      shipment.delivery_staff_id = caller.id;
    }
  } else if (caller.role === 'admin') {
    // Admin scan can alternate or transition pending/processing order to out_for_delivery or delivered
    if (shipment.shipment_status === 'shipped' || shipment.shipment_status === 'out_for_delivery') {
      new_status = 'delivered';
      shipment.delivered_at = new Date().toISOString();
    } else {
      new_status = 'shipped';
      shipment.shipped_at = new Date().toISOString();
    }
  } else {
    return res.status(403).json({ error: 'Action denied: customer role can trace, but cannot sign/seal scanning actions.' });
  }

  if (old_status === 'delivered') {
    return res.status(400).json({ error: 'Scan rejected: This shipment has already been officially DELIVERED.' });
  }

  // Update states
  shipment.shipment_status = new_status;
  order.orderStatus = new_status;
  order.updatedAt = new Date().toISOString();

  // Update dynamic QR representing status
  try {
    const updatedQrPayload = {
      orderId: order.id,
      customerId: order.customerId,
      vendorId: order.vendorId,
      trackingNumber: shipment.tracking_number,
      currentStatus: new_status,
      timestamp: new Date().toISOString()
    };
    shipment.qr_code = await QRCode.toDataURL(JSON.stringify(updatedQrPayload));
    order.shippingQrCode = shipment.qr_code;
  } catch (e) {
    // Fallback
  }

  // Log scan event
  const resolvedLocation = scan_location || 'GPS-Unlocked Location (India Central)';
  db.shipment_logs.push({
    id: 'LOG-' + Math.floor(Math.random() * 89999 + 10000),
    shipment_id: shipment.id,
    scanned_by: caller.name,
    scanned_role: caller.role,
    old_status,
    new_status,
    scan_location: resolvedLocation,
    created_at: new Date().toISOString()
  });

  // Notify customer
  db.notifications.push({
    id: crypto.randomUUID().substring(0, 8),
    userId: order.customerId,
    title: new_status === 'delivered' ? 'Order Delivered Successfully' : 'Order Shipped Out',
    message: new_status === 'delivered' 
      ? `Congratulations! Your order ${order.id} has been delivered successfully by ${caller.name}.`
      : `Your order ${order.id} has been shipped from the vendor storage facility and is in transit.`,
    type: 'order',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  // Notify vendor
  db.notifications.push({
    id: crypto.randomUUID().substring(0, 8),
    userId: order.vendorId,
    title: new_status === 'delivered' ? 'Logistics Delivery Completed' : 'Logistics Shipment Created',
    message: new_status === 'delivered'
      ? `Package ${shipment.tracking_number} has been safely coordinates verified and delivered.`
      : `Package ${shipment.tracking_number} has been logged in transit at ${resolvedLocation}.`,
    type: 'order',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDB();
  res.json({ 
    success: true, 
    message: new_status === 'delivered' ? 'Order Successfully Delivered' : 'Order Successfully Shipped', 
    shipment, 
    order 
  });
});

// Notifications
app.get('/api/notifications', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller) return res.status(401).json({ error: 'Session failed' });

  res.json({
    notifications: db.notifications.filter((n: any) => n.userId === caller.id || n.userId === 'all')
  });
});

app.post('/api/notifications/read-all', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller) return res.status(401).json({ error: 'Session expired' });

  db.notifications.forEach((n: any) => {
    if (n.userId === caller.id) n.isRead = true;
  });
  saveDB();
  res.json({ success: true });
});

// Activity logs view (Admin only)
app.get('/api/admin/logs', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden.' });
  }

  res.json({ logs: db.activity_logs });
});

// Admin: view all registered vendors with request status and stats
app.get('/api/admin/vendors', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden. Admin role required.' });
  }

  const vendors = db.users.filter((u: any) => u.role === 'vendor').map((u: any) => {
    const request = db.vendor_requests.find((r: any) => r.vendorId === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      createdAt: u.createdAt,
      status: u.isSuspended ? 'suspended' : (request?.status || 'pending'),
      request: request || null
    };
  });

  res.json({ vendors });
});

// Admin: view single vendor details & dynamic statistics
app.get('/api/admin/vendors/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden. Admin role required.' });
  }

  const { id } = req.params;
  const vendorUser = db.users.find((u: any) => u.id === id && u.role === 'vendor');
  if (!vendorUser) {
    return res.status(404).json({ error: 'Vendor not found.' });
  }

  const request = db.vendor_requests.find((r: any) => r.vendorId === id);
  const vendorProducts = db.products.filter((p: any) => p.vendorId === id);
  const vendorOrders = db.orders.filter((o: any) => o.vendorId === id);

  // Calculate statistics
  const totalProducts = vendorProducts.length;
  const totalOrders = vendorOrders.length;
  const revenue = vendorOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
  const pendingOrders = vendorOrders.filter((o: any) => o.orderStatus === 'pending' || o.orderStatus === 'confirmed' || o.orderStatus === 'processing' || o.orderStatus === 'shipped' || o.orderStatus === 'out_for_delivery').length;
  const deliveredOrders = vendorOrders.filter((o: any) => o.orderStatus === 'delivered').length;
  const cancelledOrders = vendorOrders.filter((o: any) => o.orderStatus === 'cancelled').length;

  const totalRatingsSum = vendorProducts.reduce((sum: number, p: any) => sum + (p.ratings || 0), 0);
  const averageRating = totalProducts > 0 ? parseFloat((totalRatingsSum / totalProducts).toFixed(1)) : 5.0;

  res.json({
    vendor: {
      id: vendorUser.id,
      name: vendorUser.name,
      email: vendorUser.email,
      phone: vendorUser.phone,
      createdAt: vendorUser.createdAt,
      isSuspended: !!vendorUser.isSuspended,
      request
    },
    stats: {
      totalProducts,
      totalOrders,
      revenue,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      rating: averageRating
    },
    products: vendorProducts
  });
});

// Admin: Toggle marketplace visibility of product (ON/OFF Toggle)
app.post('/api/admin/products/:id/toggle-visibility', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden. Admin role required.' });
  }

  const { id } = req.params;
  const prod = db.products.find((p: any) => p.id === id);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  prod.disabledByAdmin = !prod.disabledByAdmin;

  // Sync to vendor schema
  const vendorRequest = db.vendor_requests.find((r: any) => r.vendorId === prod.vendorId && r.status === 'approved');
  if (vendorRequest) {
    const schemaName = `vendor_${vendorRequest.storeName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    const schemaObj = db.schemas[schemaName];
    if (schemaObj && schemaObj.products) {
      const schemaProd = schemaObj.products.find((p: any) => p.id === id);
      if (schemaProd) {
        schemaProd.disabledByAdmin = prod.disabledByAdmin;
      }
    }
  }

  saveDB();
  res.json({ success: true, disabledByAdmin: prod.disabledByAdmin, product: prod });
});

// System analysis schemas diagnostic (Admin only)
app.get('/api/admin/schema-diagnostics', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden.' });
  }

  res.json({
    schemasList: Object.keys(db.schemas || {}),
    schemasRaw: db.schemas || {},
    publicProductsCount: db.products.length,
    usersCount: db.users.length,
    vendorRequestsCount: db.vendor_requests.length
  });
});

// Admin Supabase Integration Status endpoint
app.get('/api/admin/supabase-status', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden.' });
  }

  res.json({
    connected: supabaseConnected,
    error: supabaseError,
    supabaseUrl: SUPABASE_URL,
    lastSync: lastSupabaseSync,
    sqlInstructions: `create table omnibazaar_state (
  id text primary key,
  json_data jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table omnibazaar_state enable row level security;
create policy "Allow public access" on omnibazaar_state for all using (true) with check (true);`
  });
});

// ==========================================
// AURA AI INTELLIGENT DELEGATE PROXY
// ==========================================
app.post('/api/gemini/aura', async (req, res) => {
  const { prompt, history } = req.body;

  if (!prompt) return res.status(400).json({ error: 'Empty text request.' });

  const systemPrompt = `You are "Aura", the modern AI e-commerce concierges for OmniBazaar, an Indian multi-vendor boutique marketplace. 
  Answer the customer queries politely with elegant, warm, and professional local Indian hospitality context.
  Reference Indian cities, states, traditional products, textiles, spices, or technical gadgets (e.g. iPhone, Silk Sarees, Spices, Teas, Bangalore tech, Kerala Spices).
  
  If the user asks about product recommendations, guide them to:
  - iPhone 15 Pro Max (Rs 1,19,900) - 99% Fit selection
  - Banarasi Saree (Rs 4,500)
  - Organic Assam Tea (Rs 350)
  - Kerala Cardamom Pods (Rs 190)
  
  Keep your answers short, crisp, highly visual, and formatted in clean user-friendly Markdown. Include a subtle touch of friendly conversational emojis!`;

  try {
    // Check for developer API key
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      // In sandbox development without injected keys, return beautiful smart simulated response!
      console.log('Using simulated smart concierges responses (no valid Gemini keys configured)...');
      
      const promptLower = prompt.toLowerCase();
      let simResponse = `Hello there! I am **Aura**, your personal shopping companion at OmniBazaar. ✨

I would be absolutely delighted to help you explore our authentic Indian multi-vendor catalog! 🇮🇳

Here is a smart recommendation for you today based on our best-seller stats:
1. 📱 **iPhone 15 Pro Max (99% Aura AI Fit)** — Premium titanium build for ultimate power cataloging. *₹1,19,900*
2. 🥻 **Banarasi Gold Silk Saree** — Pure golden zari threads perfect for Indian festive milestones. *₹4,500*
3. 🌿 **Premium Kerala Cardamom Pod pods** — Directly from Idukki slopes for your afternoon masala chai! *₹190*

Would you like me to add any of these premium products to your cart, or perhaps locate a local vendor mapping in Tamil Nadu or Karnataka? Let me know! 🌸`;

      if (promptLower.includes('phone') || promptLower.includes('mobile') || promptLower.includes('electronics')) {
        simResponse = `Excellent choice! Our prime electronic spotlight is on the **iPhone 15 Pro Max** (99% Aura AI Fit). 

Engineered with aerospace-grade titanium and powered by the blazing fast A17 Pro chip. 

Our verified vendor **Universal Emporium** is shipping this unit with a flat ₹2,000 instant bank discount today! 📦

*Would you like to browse details or navigate the product checkout pipeline directly?* 📱`;
      } else if (promptLower.includes('saree') || promptLower.includes('fashion') || promptLower.includes('cloth')) {
        simResponse = `Namaste! Our exquisite **Banarasi Silk Saree** (from our select *Kanchipuram Weavers* profile) is highly recommended. 

Handwoven with genuine mulberry silk strings and adorned with golden brocade zari borders. It represents centuries of classical Indian craftsmanship!

Available for prompt courier routing across Chennai, Madurai, Delhi, and Bangalore. 🥻🌸`;
      } else if (promptLower.includes('spice') || promptLower.includes('tea') || promptLower.includes('food') || promptLower.includes('grocery')) {
        simResponse = `Wonderful scent profiles! I highly recommend our hand-packed **Kerala Cardamom Pods** from *BharatSpices*! ☕️

It pairs beautifully with our single-estate **Organic Assam Tea** to create the perfect traditional Indian spiced chai.

*Both items are approved and ready for dispatch in 24 hours under priority multi-tenant schedules.*`;
      }

      return res.json({ response: simResponse });
    }

    // Actual calling of Gemini 3.5 Flash using new @google/genai SDK
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { text: systemPrompt },
        ...(history || []).map((h: any) => ({ text: `${h.role === 'user' ? 'Client' : 'Aura'}: ${h.text}` })),
        { text: `Client: ${prompt}` }
      ]
    });

    res.json({ response: response.text });
  } catch (error: any) {
    console.error('Gemini API execution failure:', error);
    res.status(500).json({ error: 'AI Concierges delay. Please check your credentials config or retry.' });
  }
});

// ==========================================
// ADMIN ANALYTICS ENDPOINT
// ==========================================
app.get('/api/admin/analytics', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;

  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const orders = db.orders || [];
  const users = db.users || [];
  const products = db.products || [];

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o: any) => o.orderStatus === 'delivered').length;
  const pendingOrders = orders.filter((o: any) => o.orderStatus === 'pending').length;
  const totalCustomers = users.filter((u: any) => u.role === 'customer').length;
  const totalVendors = users.filter((u: any) => u.role === 'vendor').length;
  const totalProducts = products.length;
  const activeProducts = products.filter((p: any) => p.isApproved && p.stock > 0).length;

  // Sales by day (last 7 days)
  const salesByDay: Record<string, number> = {};
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    last7Days.push(key);
    salesByDay[key] = 0;
  }
  orders.forEach((o: any) => {
    const day = (o.createdAt || '').split('T')[0];
    if (salesByDay[day] !== undefined) {
      salesByDay[day] += o.totalAmount || 0;
    }
  });

  // Top products by order count
  const productOrderCount: Record<string, number> = {};
  orders.forEach((o: any) => {
    (o.items || []).forEach((item: any) => {
      productOrderCount[item.productId || item.id] = (productOrderCount[item.productId || item.id] || 0) + (item.quantity || 1);
    });
  });
  const topProducts = Object.entries(productOrderCount)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const prod = products.find((p: any) => p.id === id);
      return { id, name: prod?.name || 'Unknown', count, price: prod?.price || 0 };
    });

  // Payment method breakdown
  const paymentBreakdown: Record<string, number> = {};
  orders.forEach((o: any) => {
    const pm = o.paymentMethod || 'unknown';
    paymentBreakdown[pm] = (paymentBreakdown[pm] || 0) + 1;
  });

  res.json({
    overview: {
      totalRevenue,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalCustomers,
      totalVendors,
      totalProducts,
      activeProducts
    },
    salesByDay: last7Days.map(day => ({ date: day, amount: salesByDay[day] })),
    topProducts,
    paymentBreakdown,
    recentOrders: orders.slice(-10).reverse().map((o: any) => ({
      id: o.id,
      customerName: o.customerName,
      vendorStoreName: o.vendorStoreName,
      totalAmount: o.totalAmount,
      orderStatus: o.orderStatus,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt
    }))
  });
});

// ==========================================
// SUPPORT CONFIGURATION ENDPOINTS
// ==========================================
app.get('/api/support', (req, res) => {
  res.json(db.supportConfig || {});
});

app.post('/api/admin/support', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { whatsapp, calls } = req.body;
  if (whatsapp) db.supportConfig.whatsapp = whatsapp;
  if (calls) db.supportConfig.calls = calls;
  
  saveDB();
  res.json({ success: true, supportConfig: db.supportConfig });
});

// --- AI CHATBOT LOGIC ---

type ChatMessage = { role: 'user' | 'model' | 'system'; content: string; audioBase64?: string };

const SYSTEM_PROMPT = `
You are Omni AI, an advanced, professional, and friendly AI Assistant for OmniBazaar, an e-commerce platform.
Your goals:
1. Answer customer questions intelligently, naturally, and professionally.
2. If the user asks about products, orders, coupons, or their account, use the provided context to answer.
3. NEVER say "I don't know", "I am an AI", or show internal errors. If you lack exact info, give a related helpful answer and ask a follow-up question.
4. Maintain a smart e-commerce assistant persona. 
5. Keep answers concise, modern, and friendly.
6. CRITICAL: ONLY suggest products that are explicitly provided in the live data context below. NEVER make up products. If a requested product or category (e.g., food) is not in the context, ALWAYS reply positively and encouragingly (e.g., "We don't have this right now, but we are looking forward to adding it in the future!"). Do not bluntly say no.
7. CRITICAL: If the user asks a general question (like payment methods or shipping), answer directly using Store Info. Do NOT invent or suggest products unless explicitly requested.

Here is the current live data context for the user. Use this to provide personalized answers:
`;

async function generateChatResponse(messages: ChatMessage[], context: string): Promise<string> {
  const fullMessages = [
    { role: 'system' as const, content: SYSTEM_PROMPT + context },
    ...messages
  ];

  let groqClient: Groq | null = null;
  const groqEnv = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
  const groqKeys = groqEnv.split(',').map(k => k.trim()).filter(Boolean);
  const randomGroqKey = groqKeys[Math.floor(Math.random() * groqKeys.length)];

  if (randomGroqKey) {
    try {
      groqClient = new Groq({ apiKey: randomGroqKey });
    } catch (e) {
      console.warn('Failed to init GROQ API', e);
    }
  }

  const geminiEnv = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  const geminiKeys = geminiEnv.split(',').map(k => k.trim()).filter(Boolean);

  if (groqClient) {
    try {
      const groqMessages = fullMessages.map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content
      }));

      const chatCompletion = await groqClient.chat.completions.create({
        messages: groqMessages as any,
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
      });

      if (chatCompletion.choices[0]?.message?.content) {
        return chatCompletion.choices[0].message.content;
      }
    } catch (error: any) {
      console.error('GROQ API failed, falling back to Gemini:', error);
      try { require('fs').appendFileSync('ai_error.log', 'GROQ Error: ' + (error.message || error) + '\n'); } catch(e){}
    }
  }

  if (geminiKeys.length > 0) {
    try {
      const randomKey = geminiKeys[Math.floor(Math.random() * geminiKeys.length)];
      const geminiClient = new GoogleGenAI({ apiKey: randomKey });

      const geminiHistory = fullMessages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      
      const response = await geminiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: geminiHistory,
      });

      if (response.text) return response.text;
    } catch (error: any) {
      console.error('Gemini API fallback failed as well:', error);
      try { require('fs').appendFileSync('ai_error.log', 'Gemini Error: ' + (error.message || error) + '\n'); } catch(e){}
    }
  }

  return "I'm currently processing a lot of requests, but I'm here to help! Could you provide a bit more detail, or would you like to connect with our human support team directly?";
}

// --- AI CHATBOT ENDPOINT ---
app.post('/api/ai/chat', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  const { messages, sessionId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  try {
    let userContext = "User is a Guest. They are not logged in.";
    if (caller) {
      const fullUser = db.users.find((u: any) => u.id === caller.id);
      if (fullUser) {
        userContext = `User Details:\n- Name: ${fullUser.name}\n- Email: ${fullUser.email}\n- Phone: ${fullUser.phone || 'N/A'}\n- Role: ${fullUser.role}\n- Address: ${fullUser.address || 'Address not provided'}\n- Joined On: ${new Date(fullUser.createdAt || Date.now()).toDateString()}.\nCRITICAL INSTRUCTION: If the user asks for their details or profile (e.g. "who am I" or "what is my name"), ALWAYS reply with ALL of this full information formatted nicely. DO NOT just say their name.\n`;
        
        const userOrders = db.orders.filter((o: any) => o.customerId === caller.id).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (userOrders.length > 0) {
          const lastOrder = userOrders[0];
          userContext += `Last order: ID ${lastOrder.id} for ₹${lastOrder.totalAmount}, Status: ${lastOrder.orderStatus}. `;
        } else {
          userContext += `They have no past orders. `;
        }
      }
    }

    const activeCoupons = db.coupons.filter((c: any) => c.isActive).map((c: any) => `${c.title} (${c.discountAmount}% off)`).join(', ');
    const couponContext = activeCoupons ? `Active coupons: ${activeCoupons}. ` : "No active coupons currently. ";

    const latestMsg = messages[messages.length - 1];
    let latestUserMsg = latestMsg?.content?.toLowerCase() || '';

    const groqEnv = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
    const groqKeys = groqEnv.split(',').map(k => k.trim()).filter(Boolean);
    const randomWhisperKey = groqKeys[Math.floor(Math.random() * groqKeys.length)];
    const whisperClient = randomWhisperKey ? new Groq({ apiKey: randomWhisperKey }) : null;

    // Handle Audio Transcription via Whisper if audioBase64 exists
    if (latestMsg?.audioBase64 && whisperClient) {
      try {
        const match = latestMsg.audioBase64.match(/^data:(audio\/[^;]+)/);
        let ext = 'webm';
        if (match) {
          if (match[1].includes('mp4')) ext = 'mp4';
          else if (match[1].includes('mpeg')) ext = 'mpeg';
          else if (match[1].includes('ogg')) ext = 'ogg';
          else if (match[1].includes('wav')) ext = 'wav';
        }
        
        const base64Data = latestMsg.audioBase64.substring(latestMsg.audioBase64.indexOf(',') + 1);
        if (base64Data) {
          const buffer = Buffer.from(base64Data, 'base64');
          const tempPath = path.join(process.cwd(), `temp_${Date.now()}.${ext}`);
          fs.writeFileSync(tempPath, buffer);
          
          const transcription = await whisperClient.audio.transcriptions.create({
            file: fs.createReadStream(tempPath),
            model: 'whisper-large-v3',
          });
          
          latestUserMsg = transcription.text.toLowerCase();
          latestMsg.content = transcription.text;
          
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
      } catch (e) {
        console.error('Whisper transcription error:', e);
      }
    }

    let searchContext = '';
    
    const lowerMsg = latestUserMsg.toLowerCase();
    
    // Check if the user is asking for a specific category
    const matchedCategory = db.categories.find((c: any) => 
      lowerMsg.includes(c.name.toLowerCase()) || 
      lowerMsg.includes(c.slug.toLowerCase().replace('-', ' ')) ||
      lowerMsg.includes(c.slug.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
    
    let matchedProducts: any[] = [];
    
    if (matchedCategory) {
      // Bring all products within that category as requested
      matchedProducts = db.products.filter((p: any) => p.category === matchedCategory.slug);
    } else {
      // Filter out common words that shouldn't trigger product search
      const stopWords = ['product', 'products', 'item', 'items', 'find', 'show', 'search', 'want', 'need', 'give', 'have'];
      const keywords = latestUserMsg.split(' ').filter((w: string) => w.length > 3 && !stopWords.includes(w.toLowerCase()));
      
      if (keywords.length > 0) {
        matchedProducts = db.products.filter((p: any) => 
          keywords.some((kw: string) => p.name.toLowerCase().includes(kw) || p.category.toLowerCase().includes(kw))
        ).slice(0, 10);
      }
    }
    
    if (matchedProducts.length > 0) {
      searchContext = `Search results relevant to query: \n` + matchedProducts.map((p: any) => 
        `- ${p.name} (₹${p.price})\n  ID: ${p.id}\n  Image: ${p.images?.[0] || ''}\n  Link: /product/${p.id}\n  Description: ${p.description}`
      ).join('\n\n') + `\n\nCRITICAL INSTRUCTION: When showing these products to the user, ALWAYS use markdown to display the image (e.g. ![${matchedProducts[0].name}](${matchedProducts[0].images?.[0]})) and provide a clickable link to view the product (e.g. [View ${matchedProducts[0].name}](/product/${matchedProducts[0].id})). You MUST list ALL provided search results.`;
    }

    const storeContext = `Store Info: We accept Cash on Delivery (COD), UPI (Google Pay, PhonePe, Paytm, etc.), Credit/Debit Cards, and Net Banking. We ship nationwide across India.`;
    const fullContext = `\n--- LIVE DATA CONTEXT ---\n${userContext}\n${couponContext}\n${storeContext}\n${searchContext}\n-----------------------\n`;

    const aiResponse = await generateChatResponse(messages, fullContext);
    
    // Save to history
    let activeSessionId = sessionId || Date.now().toString();
    if (caller) {
      const fullMessagesToSave = [
        ...messages, 
        { 
          id: Date.now().toString(), 
          role: 'model', 
          content: aiResponse, 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }
      ];
      let userHist = db.ai_histories.find((h: any) => h.userId === caller.id);
      if (!userHist) {
        userHist = { userId: caller.id, sessions: [] };
        db.ai_histories.push(userHist);
      }
      if (!userHist.sessions) {
        userHist.sessions = [{ id: 'legacy', title: 'Legacy Chat', date: new Date().toISOString(), messages: userHist.messages || [] }];
        delete userHist.messages;
      }
      
      let session = userHist.sessions.find((s: any) => s.id === activeSessionId);
      if (!session) {
        session = { 
          id: activeSessionId, 
          title: messages.find((m: any) => m.role === 'user')?.content.substring(0, 30) + '...' || 'New Chat',
          date: new Date().toISOString(),
          messages: [] 
        };
        userHist.sessions.push(session);
      }
      session.messages = fullMessagesToSave;
      saveDB();
    }
    
    res.json({ message: aiResponse, sessionId: activeSessionId });
  } catch (error) {
    console.error('AI Chatbot error:', error);
    res.json({ message: "I'm experiencing a bit of a delay connecting to our brain, but I'm here! Do you need help reaching a human agent?" });
  }
});

app.get('/api/ai/history', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller) return res.json({ sessions: [] });
  
  const userHist = db.ai_histories.find((h: any) => h.userId === caller.id);
  if (!userHist) return res.json({ sessions: [] });

  if (userHist.messages && !userHist.sessions) {
    userHist.sessions = [{ id: 'legacy', title: 'Legacy Chat', date: new Date().toISOString(), messages: userHist.messages }];
    delete userHist.messages;
    saveDB();
  }
  
  res.json({ sessions: userHist.sessions || [] });
});

app.delete('/api/ai/history/:sessionId', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const caller = token ? verifyToken(token) : null;
  if (!caller) return res.status(401).json({ error: 'Unauthorized' });
  
  const userHist = db.ai_histories.find((h: any) => h.userId === caller.id);
  if (userHist && userHist.sessions) {
    userHist.sessions = userHist.sessions.filter((s: any) => s.id !== req.params.sessionId);
    saveDB();
  }
  res.json({ success: true });
});

// ==========================================
// CUSTOM VITE INTEGRATION RUNTIME
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }



app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` OMNIBAZAAR MULTI-VENDOR SERVER BOUND TO PORT ${PORT}`);
    console.log(` Environment Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
  });
}

startServer();
