// ============================================================
// db.js
// Fondasi akses data — pengganti fungsi generic di Code.gs lama
// (sheetToObjects, addRecord, updateRecord, deleteRecord) tapi
// dipanggil LANGSUNG dari browser lewat Firebase JS SDK, bukan
// lewat Apps Script doPost lagi.
//
// Dipakai di semua halaman modul (dashboard.html, pendaftaran.html,
// dst) dengan:
//   import { getAll, addRecord, updateRecord, deleteRecord, ... } from './db.js';
// ============================================================

import { auth, db } from './firebase-config.js?v=2';
import {
  ref, get, set, remove
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// ============================================================
// Cloudinary — HARUS SAMA dengan cloud name & preset yang dipakai
// di user.html dan di Cloudflare Worker (ktp-signer). Ambil nilai
// cloud name dari Cloudinary Dashboard (Settings → Account), jangan
// biarkan jadi placeholder karena upload akan selalu gagal.
// ============================================================
const CLOUDINARY_CLOUD_NAME = 'udsougfj'; // TODO: konfirmasi sama dengan Cloudinary Dashboard kamu
const CLOUDINARY_PRESET_KTP = 'foto_ktp_preset';     // Unsigned, Delivery type: Authenticated (privat)
const CLOUDINARY_PRESET_UMUM = 'bukti_umum_preset';  // Unsigned, Delivery type: Upload (publik)

// Pilih preset yang tepat berdasarkan folder tujuan, supaya foto KTP
// selalu lewat preset privat dan bukti transfer selalu lewat preset publik.
function pilihPreset(folder) {
  if (folder === 'foto_ktp') return CLOUDINARY_PRESET_KTP;
  return CLOUDINARY_PRESET_UMUM;
}

// ============================================================
// GENERIC CRUD (persis logika Code.gs lama, versi Firebase SDK)
// ============================================================

// Bikin ID unik, sama seperti generateId() di Code.gs lama
export function generateId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// Ambil semua record dalam satu node (setara sheetToObjects)
export async function getAll(node) {
  const snap = await get(ref(db, node));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.keys(val).map(function (key) {
    const obj = val[key];
    if (obj && typeof obj === 'object' && !obj.ID) obj.ID = key;
    return obj;
  });
}

// Ambil satu record berdasarkan ID
export async function getOne(node, id) {
  const snap = await get(ref(db, node + '/' + id));
  if (!snap.exists()) return null;
  const obj = snap.val();
  obj.ID = obj.ID || id;
  return obj;
}

// Tambah record baru (setara addRecord)
export async function addRecord(node, dataObj, prefix) {
  if (!dataObj.ID) {
    dataObj.ID = generateId(prefix || node.substring(0, 3).toUpperCase());
  }
  await set(ref(db, node + '/' + dataObj.ID), dataObj);
  return dataObj;
}

// Update sebagian field record (setara updateRecord — merge, bukan timpa total)
export async function updateRecord(node, id, dataObj) {
  const current = await getOne(node, id);
  if (!current) throw new Error('Data tidak ditemukan.');
  const merged = Object.assign({}, current, dataObj);
  await set(ref(db, node + '/' + id), merged);
  return merged;
}

// Hapus record (setara deleteRecord)
export async function deleteRecord(node, id) {
  const current = await getOne(node, id);
  if (!current) throw new Error('Data tidak ditemukan.');
  await remove(ref(db, node + '/' + id));
  return true;
}

// ============================================================
// UPLOAD FOTO — Cloudinary (pengganti Google Drive)
// Dipakai untuk Foto KTP (Pendaftaran) & Bukti Transfer (Pembayaran)
// Preset dipilih otomatis berdasarkan `folder`:
//   folder === 'foto_ktp'  -> foto_ktp_preset (privat/Authenticated)
//   folder lainnya         -> bukti_umum_preset (publik)
// ============================================================
export async function uploadBase64ToCloudinary(base64, folder, presetName) {
  const url = 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload';
  const formData = new FormData();
  formData.append('file', base64);
  formData.append('upload_preset', presetName || pilihPreset(folder));
  if (folder) formData.append('folder', folder);

  const res = await fetch(url, { method: 'POST', body: formData });
  const json = await res.json();
  if (!json.secure_url) {
    throw new Error(json.error && json.error.message ? json.error.message : 'Upload ke Cloudinary gagal.');
  }
  return json.secure_url;
}

export async function uploadToCloudinary(file, folder) {
  const url = 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', pilihPreset(folder));
  if (folder) formData.append('folder', folder);

  const res = await fetch(url, { method: 'POST', body: formData });
  const json = await res.json();
  if (!json.secure_url) {
    throw new Error(json.error && json.error.message ? json.error.message : 'Upload ke Cloudinary gagal.');
  }
  return json.secure_url;
}

// ============================================================
// AUTH GUARD — dipanggil di setiap halaman Admin
// Menggantikan checkAdminLogin() lama. Sekarang: user harus
// login via Firebase Auth DAN punya node Users/{uid}/role = "admin"
// (dibuat manual di Fase 3).
// ============================================================
export function requireAdmin(onReady) {
  onAuthStateChanged(auth, async function (user) {
    if (!user) {
      window.location.href = loginUrl();
      return;
    }
    try {
      const roleSnap = await get(ref(db, 'Users/' + user.uid + '/role'));
      const role = roleSnap.exists() ? roleSnap.val() : null;
      if (role !== 'admin') {
        alert('Akun ini login berhasil tapi belum punya akses Admin (role belum diset di node Users).');
        await signOut(auth);
        window.location.href = loginUrl();
        return;
      }
      onReady(user);
    } catch (err) {
      alert('Gagal memeriksa akses: ' + err.message);
      window.location.href = loginUrl();
    }
  });
}

export function doLogout() {
  return signOut(auth).then(function () {
    window.location.href = loginUrl();
  });
}

// Tentukan URL halaman Login: beda antara GitHub Pages (ada subfolder)
// dan domain custom treenetadmin.rtrwdigital.com (di root)
function loginUrl() {
  if (location.hostname === 'abduldicky212-eng.github.io') {
    return '/isp-billing-app/index.html';
  }
  return '/';
}

// ============================================================
// FORMAT HELPERS (sama seperti di Index.html lama)
// ============================================================
export function formatRupiah(num) {
  num = Number(num) || 0;
  return 'Rp' + num.toLocaleString('id-ID');
}

export const BULAN_SINGKAT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
export const BULAN_NAMA = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
