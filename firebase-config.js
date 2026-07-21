import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDLMeWgXMTSaAP9qrgLx-SPdX0IReaTOzg",
  authDomain: "rtrwnet-86437.firebaseapp.com",
  databaseURL: "https://rtrwnet-86437-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rtrwnet-86437",
  storageBucket: "rtrwnet-86437.firebasestorage.app",
  messagingSenderId: "447566268085",
  appId: "1:447566268085:web:dac6cde26def589893e0fc"
};

import { initializeApp as initializeAppSecondary } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth as getAuthSecondary } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// App KEDUA — khusus untuk admin membuat akun Firebase Auth pelanggan baru,
// supaya sesi login Admin yang sedang aktif TIDAK ikut tertimpa/logout.
const secondaryApp = initializeAppSecondary(firebaseConfig, 'Secondary');
export const authSecondary = getAuthSecondary(secondaryApp);
// App KETIGA — khusus dipakai oleh user.html (Portal Pelanggan), supaya
// sesi loginnya benar-benar terpisah dari sesi Admin di dashboard.html,
// walau dibuka di browser yang sama. Ini didukung resmi oleh Firebase
// (App instance berbeda = tempat penyimpanan sesi yang berbeda pula).
import { getDatabase as getDatabaseCustomer } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const customerApp = initializeAppSecondary(firebaseConfig, 'Customer');
export const authCustomer = getAuthSecondary(customerApp);
export const dbCustomer = getDatabaseCustomer(customerApp);
