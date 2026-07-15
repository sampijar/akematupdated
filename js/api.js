'use strict';
/**
 * api.js — Akemat Foundation API Client
 * Menghubungkan frontend ke Netlify Functions (Supabase backend)
 * 
 * Cara kerja:
 * - Selama SUPABASE belum diset di Netlify → pakai localStorage (DB.*)
 * - Setelah SUPABASE diset → fungsi di sini kirim data ke Netlify Function
 * 
 * Untuk mengaktifkan Supabase:
 * 1. Buka db-schema.sql → jalankan di Supabase SQL Editor
 * 2. Set env vars di Netlify (lihat .env.example)
 * 3. Push ke GitHub → site otomatis pakai database real
 */

const API_BASE = '/api';

// ── Generic fetch helper ────────────────────────────────────
async function apiFetch(endpoint, body) {
  const res  = await fetch(`${API_BASE}/${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Server tidak merespons dengan benar (HTTP '+res.status+').'); }
  if (!res.ok) throw new Error(data.error || 'Request gagal');
  return data;
}

// ── Database via Netlify Function (db.js) ─────────────────
const Cloud = {
  async isAvailable() {
    try {
      const r = await fetch(`${API_BASE}/db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', table: 'campaigns', filters: { limit: 1 } }),
      });
      const d = await r.json();
      return r.ok && d.success;
    } catch { return false; }
  },

  async getNurses(filters = {}) {
    const params = {};
    if (filters.specialty) params.specialty = `eq.${filters.specialty}`;
    if (filters.is_available) params.is_available = 'eq.true';
    const d = await apiFetch('db', { action: 'select', table: 'nurse_profiles', filters: params });
    return d.data || [];
  },

  async getCampaigns() {
    const d = await apiFetch('db', { action: 'select', table: 'campaigns', filters: { order: 'created_at.desc' } });
    return d.data || [];
  },

  async addBooking(bookingData) {
    const d = await apiFetch('db', { action: 'insert', table: 'bookings', data: bookingData });
    return d.data?.[0] || null;
  },

  async addDonation(donationData) {
    const d = await apiFetch('db', { action: 'insert', table: 'donations', data: donationData });
    // Update campaign current amount
    if (donationData.campaign_id && donationData.amount) {
      await apiFetch('db', {
        action: 'update', table: 'campaigns', id: donationData.campaign_id,
        data: {
          current:     `current + ${donationData.amount}`,
          donor_count: `donor_count + 1`,
        },
      }).catch(() => {});
    }
    return d.data?.[0] || null;
  },

  async updateTransaction(referenceId, status, extra = {}) {
    return apiFetch('db', {
      action: 'update', table: 'transactions',
      filters: { reference_id: `eq.${referenceId}` },
      data: { status, ...extra },
    });
  },
};

// ── Auth via Supabase Auth ─────────────────────────────────
// (menggunakan Supabase JS SDK langsung dari CDN)
const SupabaseAuth = {
  client: null,

  async init() {
    const url = window.__SUPABASE_URL__;
    const key = window.__SUPABASE_ANON__;
    if (!url || !key) return false;
    // Lazy-load Supabase CDN hanya jika belum ada
    if (typeof supabase === 'undefined') {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    this.client = supabase.createClient(url, key);
    return true;
  },

  async signUp({ email, password, name, phone, role }) {
    if (!this.client) return null;
    const { data, error } = await this.client.auth.signUp({ email, password,
      options: { data: { name, phone, role } }
    });
    if (error) throw new Error(error.message);
    return data.user;
  },

  async signIn({ email, password }) {
    if (!this.client) return null;
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data.user;
  },

  async signOut() {
    if (!this.client) return;
    await this.client.auth.signOut();
  },

  getUser() {
    if (!this.client) return null;
    return this.client.auth.getUser();
  },
};

// ── Export global ──────────────────────────────────────────
window.CloudDB  = Cloud;
window.AuthAPI  = SupabaseAuth;
