# Zet Studio

Website untuk menyimpan dan membagikan file `.rbxm` Roblox, ID Toolbox, dan ID Upload. Bisa diakses semua orang dan setiap item punya link unduh atau link Roblox yang bisa disalin.

## Fitur

- Upload file `.rbxm` / `.rbxmx` (maks 50 MB), dengan validasi isi file Roblox
- Simpan ID Toolbox dan ID Upload (bisa tempel angka ID atau link Roblox langsung)
- Semua item terlihat oleh semua pengunjung
- Link unduh langsung untuk file, dan tombol salin link
- Pencarian dan filter berdasarkan jenis
- Tema hitam, putih, dan abu gelap

## Menjalankan di komputer sendiri

Butuh Node.js 18 atau lebih baru.

```bash
cd zetstudio
npm install
npm start
```

Buka `http://localhost:3000`.

## Deploy agar bisa diakses semua orang

Website ini perlu server yang selalu menyala dan memiliki disk penyimpanan permanen, karena file dan data disimpan di folder `uploads/` dan `data/`. Platform yang cocok:

- **Render** atau **Railway**: buat Web Service dari repo ini, set start command `npm start`, lalu tambahkan Persistent Disk dan arahkan ke folder project (atau pindahkan `data/` dan `uploads/` ke path disk).
- **VPS** (DigitalOcean, Biznet, dll.): salin folder, jalankan `npm install` lalu jalankan dengan `pm2 start server.js --name zetstudio`, dan pasang Nginx sebagai reverse proxy ke port 3000 dengan domain dan HTTPS.

Hindari Vercel atau Netlify untuk bagian ini, karena keduanya tidak menyimpan file upload secara permanen.

## Variabel environment

| Nama | Fungsi |
| --- | --- |
| `PORT` | Port server (default 3000) |
| `ADMIN_KEY` | Kunci untuk menghapus item lewat API. Jika kosong, fitur hapus dinonaktifkan. |

Contoh hapus item:

```bash
curl -X DELETE https://domain-anda.com/api/items/ID_ITEM -H "x-admin-key: KUNCI_ANDA"
```

## Catatan

- Pastikan Anda memiliki hak atas file dan aset yang diunggah. Zet Studio tidak memeriksa hak cipta.
- Untuk penggunaan publik yang lebih besar, tambahkan rate limit (misalnya `express-rate-limit`) dan sistem login agar upload tidak disalahgunakan.
- Penyimpanan memakai file JSON sederhana. Untuk trafik tinggi, pindahkan ke database seperti SQLite atau PostgreSQL.
