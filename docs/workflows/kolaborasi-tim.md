# Panduan Kolaborasi Tim

Untuk menjaga alur kerja yang rapi dan terukur, kita menerapkan standar kolaborasi berikut pada platform Abstrakx Blueprint.

## 1. Aturan Penamaan Branch & Commit

Agar riwayat Git yang tampil di halaman **Overview Workspace** tetap rapi dan bermakna, gunakan format berikut saat melakukan _commit_:

- **feat:** Untuk penambahan fitur baru (contoh: `feat: add deep linking listener`)
- **fix:** Untuk perbaikan _bug_ (contoh: `fix: sync duplicate documents`)
- **docs:** Khusus pembaruan dokumentasi (contoh: `docs: update installation guide`)

## 2. Penggunaan Task Board (Kanban)

Fitur Task Board digunakan untuk pelacakan tugas tingkat teknis (mikro) antar tim.

- Penugasan dilakukan langsung ke anggota tim yang bersangkutan (misal: Syaiful, Hendra).
- Centang _checkbox_ langsung ketika tugas selesai. Jangan biarkan menumpuk karena klien juga melihat tampilan ini secara _real-time_.

## 3. Sinkronisasi Dokumen

Aplikasi membaca perubahan dari repositori GitHub secara _live_. Namun, untuk catatan (Notes Compiler) atau pencarian global yang di-_cache_, Anda harus menekan tombol **"Force Git Sync"** di sudut bawah layar (kiri) setelah melakukan _merge_ besar ke branch `main`.

💡 NOTE: All - Segera centang tugas kalian di Task Board jika sudah merge branch, karena status ini memantul seketika (realtime) ke layar client.
