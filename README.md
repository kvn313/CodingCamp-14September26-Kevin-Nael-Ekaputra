# 💰 Expense & Budget Visualizer

Aplikasi web sederhana untuk mencatat transaksi keuangan, mengatur budget per kategori, dan memvisualisasikan data pengeluaran menggunakan grafik interaktif.

---

## 📁 Struktur Proyek

```
├── index.html       # Struktur halaman utama
├── css/
│   └── style.css    # Styling lengkap (light & dark mode)
└── js/
    └── app.js       # Seluruh logika aplikasi
```

---

## ✨ Fitur

### Core
| Fitur | Deskripsi |
|---|---|
| Tambah Transaksi | Input pemasukan atau pengeluaran dengan deskripsi, jumlah, kategori, dan tanggal |
| Hapus Transaksi | Hapus item dengan konfirmasi modal agar tidak terhapus tidak sengaja |
| Summary Cards | Menampilkan total pemasukan, total pengeluaran, dan saldo bersih secara real-time |
| Pie Chart | Visualisasi distribusi pengeluaran per kategori (doughnut chart) |
| Bar Chart | Perbandingan budget yang diatur vs pengeluaran aktual per kategori |
| Set Budget | Atur batas pengeluaran per kategori; hapus budget kapan saja |
| LocalStorage | Semua data (transaksi, budget, preferensi) tersimpan di browser secara otomatis |

### Fitur Opsional
| Fitur | Cara Kerja |
|---|---|
| 🌙 Dark / Light Mode | Klik tombol di header untuk toggle tema. Preferensi disimpan ke `localStorage` dan chart menyesuaikan warna otomatis |
| ↕️ Sort Transactions | Urutkan daftar transaksi berdasarkan **Tanggal**, **Jumlah**, atau **Kategori**; toggle arah ascending/descending |
| 🚨 Highlight Over Budget | Transaksi pengeluaran yang kategorinya melampaui budget ditandai dengan border merah dan badge *"Over Budget"* |

---

## 🚀 Cara Menjalankan

Tidak memerlukan build tool atau instalasi apapun. Cukup:

1. Clone atau download repositori ini
2. Buka `index.html` langsung di browser

> Chart.js dimuat via CDN, jadi koneksi internet diperlukan saat pertama kali membuka aplikasi.

---

## 🛠️ Teknologi

| Teknologi | Versi | Keterangan |
|---|---|---|
| HTML5 | — | Semantik, aksesibel (ARIA labels) |
| CSS3 | — | CSS Custom Properties, Flexbox, Grid, animasi |
| Vanilla JavaScript | ES2015+ | Tanpa framework, `'use strict'` |
| [Chart.js](https://www.chartjs.org/) | 4.4.4 | Pie/doughnut chart & bar chart |
| LocalStorage API | — | Persistensi data di sisi klien |

---

## 📂 Kategori Tersedia

`Makanan` · `Transportasi` · `Hiburan` · `Kesehatan` · `Belanja` · `Tagihan` · `Pendidikan` · `Gaji` · `Lainnya`

---

## 🗂️ LocalStorage Keys

| Key | Isi |
|---|---|
| `ebv_transactions` | Array objek transaksi |
| `ebv_budgets` | Objek budget per kategori |
| `ebv_theme` | `"light"` atau `"dark"` |
| `ebv_sort_field` | Field sort aktif (`date` / `amount` / `category`) |
| `ebv_sort_dir` | Arah sort (`asc` / `desc`) |

---

## 📸 Tampilan

| Bagian | Deskripsi |
|---|---|
| Header | Judul app + tombol dark/light mode |
| Summary Cards | 3 kartu: Pemasukan, Pengeluaran, Saldo Bersih |
| Form Transaksi | Input tipe, deskripsi, jumlah, kategori, tanggal |
| Budget Setter | Pilih kategori + nominal → tampil di daftar budget dengan progress |
| Charts | Pie chart distribusi & bar chart budget vs aktual |
| Daftar Transaksi | Sortable, filterable, dengan highlight over-budget |

---

## 👤 Author

**Kevin Nael Ekaputra** — RevoU CodingCamp, September 2026
