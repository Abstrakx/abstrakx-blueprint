# Panduan Instalasi Lokal

Selamat datang di tim Abstrakx Enterprise! Ikuti panduan di bawah ini untuk mengatur lingkungan pengembangan Abstrakx Blueprint di mesin lokal Anda.

## Prasyarat Sistem

1. **Node.js**: Versi 18 atau yang lebih baru.
2. **Rust Toolchain**: Instal via `rustup` untuk kompilasi backend Tauri.
3. **Tauri CLI**: Untuk manajemen proses _build_ dan _dev_.

## Langkah Instalasi

1. **Kloning Repositori**
   Lakukan kloning repositori Abstrakx Blueprint ke mesin lokal Anda:

   ```bash
   git clone git@github.com:Abstrakx/abstrakx-blueprint.git
   cd abstrakx-blueprint
   ```

2. **Instal Dependensi**
   Instal semua paket npm yang dibutuhkan:

   ```bash
   npm install
   ```

3. **Konfigurasi Environment**
   Salin file konfigurasi `.env.example` menjadi `.env` dan isi dengan kredensial Supabase Anda:

   ```env
   VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
   VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
   ```

4. **Jalankan Aplikasi**
   Gunakan perintah berikut untuk menjalankan aplikasi dalam mode _development_:
   ```bash
   npx tauri dev
   ```

💡 NOTE: All - Pastikan selalu run app pakai command "npx tauri dev" agar integrasi deep-link protokol (abstrakx-blueprint://) ter-register dengan baik di OS Windows.
