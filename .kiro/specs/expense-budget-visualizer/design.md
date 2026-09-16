# Design Document — Expense & Budget Visualizer

## Ikhtisar

Expense & Budget Visualizer adalah Single-Page Application (SPA) berbasis browser murni. Tidak ada build tool, tidak ada module bundler, dan tidak ada server — hanya tiga berkas statis: `index.html`, `css/style.css`, dan `js/app.js`. Seluruh state aplikasi hidup di memori JavaScript saat runtime dan dipersistensikan secara sinkron ke LocalStorage browser setiap kali terjadi mutasi data.

Library eksternal satu-satunya adalah **Chart.js** yang dimuat via CDN `<script>` tag, tersedia sebagai variabel global `Chart` di `window`.

---

## Arsitektur High-Level

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (DOM)                      │
│                                                         │
│  index.html ──── struktur HTML statis                   │
│  css/style.css ── CSS custom properties + dark/light    │
│  js/app.js ────── seluruh logika aplikasi               │
└──────────────┬──────────────────────────────────────────┘
               │ getElementById / querySelector
               ▼
┌─────────────────────────────────────────────────────────┐
│                   app.js — State Layer                  │
│                                                         │
│   transactions: Transaction[]                           │
│   budgets: Record<string, number>                       │
│   sortField: 'date' | 'amount' | 'category'             │
│   sortDir: 'asc' | 'desc'                               │
└──────────┬──────────────────────┬───────────────────────┘
           │ read/write           │ mutasi → saveXxx()
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────────┐
│   LocalStorage   │   │      Render Pipeline             │
│                  │   │                                  │
│ ebv_transactions │   │  renderSummary()                 │
│ ebv_budgets      │   │  renderTransactionList()         │
│ ebv_theme        │   │  renderBudgetList()              │
│ ebv_sort_field   │   │  renderPieChart()                │
│ ebv_sort_dir     │   │  renderBarChart()                │
└──────────────────┘   │  ──────────────────────────────  │
                       │  renderAll() memanggil semua     │
                       └──────────────────────────────────┘
```

### Prinsip Desain

- **Satu sumber kebenaran (Single Source of Truth):** Variabel `transactions` dan `budgets` adalah satu-satunya sumber data; DOM hanya sebagai cerminan (*projection*) dari state tersebut.
- **Render deterministik:** Setiap pemanggilan `renderAll()` menghasilkan DOM yang identik untuk state yang sama — tidak ada state tersembunyi di DOM.
- **Immutable state pada operasi sort/filter:** `getSortedFiltered()` selalu bekerja pada *salinan* array, tidak pernah mengubah urutan `transactions` asli.
- **Persistensi sinkron:** Setiap mutasi state langsung diikuti pemanggilan `saveXxx()` sebelum `renderAll()`, sehingga data tidak pernah kehilangan jika tab ditutup sesaat setelah mutasi.

---

## Struktur Data

### Transaction Object

```javascript
/**
 * @typedef {Object} Transaction
 * @property {string} id          - ID unik: Date.now().toString(36) + random(5 chars)
 * @property {'income'|'expense'} type
 * @property {string} description - Maks. 80 karakter, tidak boleh hanya whitespace
 * @property {number} amount      - Angka positif (> 0), representasi Rupiah integer/float
 * @property {string} category    - Salah satu dari VALID_CATEGORIES
 * @property {string} date        - Format ISO "YYYY-MM-DD"
 */
const transactionExample = {
  id:          "lf2k3abcx",
  type:        "expense",
  description: "Makan siang",
  amount:      45000,
  category:    "Makanan",
  date:        "2026-09-14"
};
```

### Budget Object

```javascript
/**
 * @typedef {Record<string, number>} Budgets
 * Kunci = nama kategori (string), Nilai = batas anggaran (angka positif)
 */
const budgetsExample = {
  "Makanan":      500000,
  "Transportasi": 200000,
  "Hiburan":      150000
};
```

### Konstanta Kategori

```javascript
const VALID_CATEGORIES = [
  'Makanan', 'Transportasi', 'Hiburan', 'Kesehatan',
  'Belanja', 'Tagihan', 'Pendidikan', 'Gaji', 'Lainnya'
];
// Kategori 'Gaji' tersedia untuk transaksi, tetapi TIDAK untuk budget
// (sesuai implementasi dropdown di index.html)
```

### LocalStorage Schema

| Key               | Tipe    | Default        | Isi                                       |
|-------------------|---------|----------------|-------------------------------------------|
| `ebv_transactions`| string  | `"[]"`         | `JSON.stringify(Transaction[])`           |
| `ebv_budgets`     | string  | `"{}"`         | `JSON.stringify(Record<string, number>)`  |
| `ebv_theme`       | string  | `"light"`      | `"light"` atau `"dark"`                   |
| `ebv_sort_field`  | string  | `"date"`       | `"date"` \| `"amount"` \| `"category"`   |
| `ebv_sort_dir`    | string  | `"desc"`       | `"asc"` \| `"desc"`                       |

---

## Komponen Utama dan Tanggung Jawabnya

### 1. State Manager (variabel global di app.js)

**Tanggung jawab:** Menyimpan satu-satunya sumber data aplikasi di memori.

```javascript
let transactions = [];  // Transaction[]
let budgets      = {};  // Record<string, number>
let sortField    = 'date';
let sortDir      = 'desc';
```

### 2. LocalStorage Layer

**Tanggung jawab:** Membaca state saat inisialisasi dan menulis state setiap kali ada mutasi.

```
loadFromLS()      → membaca semua key dari LocalStorage saat page load
saveTransactions() → dipanggil setelah setiap mutasi transactions
saveBudgets()      → dipanggil setelah setiap mutasi budgets
saveSortPrefs()    → dipanggil setelah perubahan sortField atau sortDir
```

**Strategi error handling:** Seluruh operasi `localStorage.getItem` + `JSON.parse` dibungkus `try/catch`. Jika parse gagal (data corrupt), variabel di-reset ke nilai default (array/objek kosong).

### 3. Transaction Form Handler

**Tanggung jawab:** Validasi input pengguna dan pembuatan objek transaksi baru.

**Urutan validasi (fail-fast, sequential):**

```
1. description.trim() === ''      → error "⚠️ Deskripsi tidak boleh kosong."
2. isNaN(amount) || amount <= 0   → error "⚠️ Jumlah harus lebih dari 0."
3. category === ''                → error "⚠️ Pilih kategori terlebih dahulu."
4. date === ''                    → error "⚠️ Tanggal tidak boleh kosong."
5. Semua valid                    → buat transaksi, push ke array, saveTransactions()
```

**Reset form setelah berhasil:** Hanya field `description`, `amount`, dan `category` yang dikosongkan. Field `type` dan `date` dipertahankan untuk kemudahan entri berulang.

### 4. Delete Modal Controller

**Tanggung jawab:** Mengelola dialog konfirmasi penghapusan single transaction.

```
State internal: pendingDeleteId (string | null)

openDeleteModal(id, description)  → set pendingDeleteId, tampilkan modal
closeDeleteModal()                 → reset pendingDeleteId, sembunyikan modal
confirmDelete()                    → filter transactions, saveTransactions(), renderAll()

Trigger closeModal:
  - Klik tombol "Batal"
  - Klik overlay (e.target === modal overlay element)
  - Tekan tombol Escape (document keydown listener)
```

### 5. Budget Manager

**Tanggung jawab:** Menetapkan dan menghapus batas anggaran per kategori.

```
setBudget(category, amount):
  - Validasi: category tidak kosong, amount > 0
  - budgets[category] = amount
  - saveBudgets()
  - renderBudgetList() + renderBarChart() + renderTransactionList()

deleteBudget(category):
  - delete budgets[category]
  - saveBudgets()
  - renderBudgetList() + renderBarChart() + renderTransactionList()
```

### 6. Over-Budget Detector

**Tanggung jawab:** Menentukan kategori mana yang melebihi budget — komponen ini adalah *pure computation*.

```
getSpentByCategory(): Record<string, number>
  → iterasi transactions, akumulasi amount untuk type === 'expense' per category
  → mengembalikan objek { [category]: totalAmount }

getOverBudgetCategories(): Set<string>
  → panggil getSpentByCategory()
  → untuk setiap (category, limit) di budgets:
      IF spent[category] > limit (strict greater than)
      THEN tambahkan category ke Set
  → kembalikan Set
```

**Catatan kritis:** Kondisi over-budget menggunakan `>` (strict), bukan `>=`. Pengeluaran tepat sama dengan budget **tidak** dianggap over-budget.

### 7. Sort & Filter Engine

**Tanggung jawab:** Menghasilkan tampilan transaksi yang terurut dan terfilter **tanpa mengubah array asli**.

```
getSortedFiltered(): Transaction[]
  1. Ambil nilai filter dari dom.filterCategory.value
  2. Buat salinan: list = filterCat ? transactions.filter(...) : [...transactions]
  3. list.sort(comparator) berdasarkan sortField:
       'date'     → perbandingan string leksikografis (YYYY-MM-DD)
       'amount'   → perbandingan numerik
       'category' → toLowerCase(), perbandingan string
  4. Arah urutan: sortDir === 'asc' ? -1 : 1
  5. Kembalikan list (bukan transactions asli)
```

### 8. Render Pipeline

**Tanggung jawab:** Memproyeksikan state ke DOM dan Chart.js instances.

```
renderSummary()
  → hitung totalIncome, totalExpense, netBalance dari transactions
  → update textContent ketiga kartu
  → toggle kelas 'negative' pada balanceCard jika net < 0

renderTransactionList()
  → panggil getSortedFiltered()
  → panggil getOverBudgetCategories()
  → rebuild innerHTML daftar transaksi via DocumentFragment
  → tampilkan/sembunyikan pesan empty state

renderBudgetList()
  → iterasi Object.entries(budgets)
  → hitung spent dan persen via getSpentByCategory()
  → rebuild innerHTML daftar budget
  → tampilkan badge "Over!" atau persentase (max 100%)

renderPieChart()
  → panggil getSpentByCategory()
  → jika data kosong: destroy chart, tampilkan empty text
  → jika chart instance ada: update data + options, panggil chart.update()
  → jika belum ada: buat instance Chart baru (type: 'doughnut')

renderBarChart()
  → iterasi Object.entries(budgets)
  → jika kosong: destroy chart, tampilkan empty text
  → warna bar Aktual: merah jika over-budget, hijau jika tidak
  → jika chart instance ada: update, panggil chart.update()
  → jika belum ada: buat instance Chart baru (type: 'bar')

renderAll()
  → memanggil kelima fungsi di atas secara berurutan
```

### 9. Theme Manager

**Tanggung jawab:** Mengelola skema warna dark/light mode.

```
applyTheme(theme: 'light' | 'dark')
  → setAttribute('data-theme', theme) pada <html>
  → localStorage.setItem('ebv_theme', theme)
  → update ikon (🌙/☀️) dan label tombol
  → re-render kedua chart (Chart.js menggunakan warna CSS yang dibaca ulang)
```

### 10. Security — XSS Prevention

**Tanggung jawab:** Memastikan nilai dari input pengguna tidak dieksekusi sebagai HTML.

```javascript
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

`escapeHtml()` **wajib** dipanggil pada setiap nilai `description` dan `category` sebelum disisipkan ke `innerHTML`.

---

## Alur Data Lengkap (State → Render Pipeline)

```
[Event Pengguna]
       │
       ▼
[Handler (form submit / button click)]
       │
       ├── Validasi input
       │       └── Gagal → tampilkan error, return
       │
       ├── Mutasi state (push/filter/delete pada transactions atau budgets)
       │
       ├── Persistensi (saveTransactions() / saveBudgets() / saveSortPrefs())
       │
       └── renderAll()
               │
               ├── renderSummary()       → update 3 kartu ringkasan
               ├── renderTransactionList() → rebuild ul#transactionList
               ├── renderBudgetList()    → rebuild ul#budgetList
               ├── renderPieChart()      → update/create Chart instance
               └── renderBarChart()      → update/create Chart instance
```

**Diagram siklus hidup aplikasi saat page load:**

```
init()
  ├── loadFromLS()    → populate transactions, budgets, sortField, sortDir
  ├── initTheme()     → applyTheme(saved) → set data-theme, update tombol
  │                     (juga memanggil renderPieChart + renderBarChart — aman
  │                      karena chart belum ada, hanya menampilkan empty state)
  ├── initSortUI()    → sync dom.sortField.value + sortDirIcon
  └── renderAll()     → render seluruh antarmuka
```

---

## Strategi Penanganan Error

| Skenario | Penanganan |
|---|---|
| JSON corrupt di LocalStorage | `try/catch` → gunakan nilai default, tidak throw |
| Amount non-numerik di form | `isNaN(parseFloat(value))` → tampilkan pesan error |
| Deskripsi hanya whitespace | `.trim() === ''` → tampilkan pesan error |
| Penghapusan id tidak ada | `Array.filter` tidak menghasilkan error; array tidak berubah |
| Chart.js tidak termuat | `new Chart(...)` akan throw; namun CDN sangat jarang gagal |

---

## Responsivitas dan CSS Architecture

Aplikasi menggunakan **CSS Custom Properties** sebagai sistem desain:

```css
/* Breakpoints */
@media (max-width: 1024px) { /* form + chart: 1 kolom, chart di atas */ }
@media (max-width: 768px)  { /* summary cards: 1 kolom */ }
@media (max-width: 480px)  { /* kurangi padding */ }

/* Tema dikelola via atribut data */
[data-theme="dark"] { /* override semua CSS variables */ }
```

Tidak ada JavaScript yang dibutuhkan untuk responsivitas — seluruhnya dikelola oleh CSS media queries.

---

## Correctness Properties

*Sebuah property adalah karakteristik atau perilaku yang harus berlaku benar di seluruh eksekusi sistem yang valid — pada dasarnya, pernyataan formal tentang apa yang harus dilakukan sistem. Properties berfungsi sebagai jembatan antara spesifikasi yang dapat dibaca manusia dan jaminan kebenaran yang dapat diverifikasi secara otomatis.*

### Property 1: Penambahan Transaksi Menambah Panjang Daftar

*Untuk sembarang* daftar transaksi awal dan data transaksi valid (deskripsi non-whitespace, amount > 0, kategori valid, tanggal non-kosong), menambahkan satu transaksi harus menghasilkan daftar dengan panjang bertambah tepat satu.

**Validates: Requirements 1.2, 11.4**

---

### Property 2: Penghapusan Transaksi Mengurangi Panjang Daftar Tepat Satu

*Untuk sembarang* array transaksi non-kosong dan satu id transaksi yang ada di dalamnya, menghapus transaksi dengan id tersebut harus menghasilkan array dengan panjang berkurang tepat satu, dan transaksi dengan id tersebut tidak lagi ada di array hasil.

**Validates: Requirements 1.9, 11.5**

---

### Property 3: Invariant Saldo Keuangan

*Untuk sembarang* koleksi transaksi, nilai totalIncome harus selalu sama dengan jumlah `amount` dari semua transaksi bertipe `income`, totalExpense harus selalu sama dengan jumlah `amount` dari semua transaksi bertipe `expense`, dan netBalance harus selalu sama dengan (totalIncome − totalExpense). Ketiga nilai tidak boleh pernah inkonsisten satu sama lain.

**Validates: Requirements 2.2, 2.3, 2.4, 11.1, 11.2, 11.3**

---

### Property 4: Validasi Input Menolak Deskripsi Whitespace-Only

*Untuk sembarang* string yang seluruhnya terdiri dari karakter whitespace (spasi, tab, newline), mencoba menambahkan transaksi dengan deskripsi tersebut harus ditolak dan panjang array `transactions` tidak boleh berubah.

**Validates: Requirements 1.3**

---

### Property 5: Format Rupiah Konsisten untuk Semua Angka Positif

*Untuk sembarang* angka positif, fungsi `formatRupiah` harus menghasilkan string yang diawali "Rp " dan menggunakan pemisah ribuan titik (sesuai `id-ID` locale), tanpa memandang besarnya nilai.

**Validates: Requirements 2.6**

---

### Property 6: Deteksi Over-Budget Menggunakan Strict Greater-Than

*Untuk sembarang* kategori dengan budget yang ditetapkan, kategori tersebut diklasifikasikan sebagai over-budget jika dan hanya jika total pengeluaran kategori tersebut **secara ketat lebih besar dari** nilai budget. Pengeluaran yang tepat sama dengan budget tidak boleh dikategorikan sebagai over-budget.

**Validates: Requirements 4.2, 11.8**

---

### Property 7: Tanpa Budget Tidak Ada Status Over-Budget

*Untuk sembarang* transaksi expense dengan kategori yang tidak memiliki budget yang ditetapkan, transaksi tersebut tidak boleh memiliki kelas CSS `over-budget` dan tidak boleh menampilkan badge "Over Budget", tanpa memandang besarnya nilai pengeluaran.

**Validates: Requirements 4.5**

---

### Property 8: Persentase Pemakaian Budget Selalu dalam Rentang 0–100

*Untuk sembarang* nilai pengeluaran aktual dan nilai budget yang valid (positif), persentase pemakaian yang ditampilkan dalam daftar budget harus selalu bernilai antara 0 dan 100 (inklusif). Nilai aktual yang melebihi budget harus dibulatkan menjadi 100%, bukan nilai lebih dari 100%.

**Validates: Requirements 3.7, 11.9**

---

### Property 9: getSortedFiltered Tidak Memutasi Array Asli

*Untuk sembarang* array `transactions` dan parameter sort/filter apapun, memanggil `getSortedFiltered()` tidak boleh mengubah urutan atau isi array `transactions` asli. Array sumber harus identik sebelum dan sesudah pemanggilan.

**Validates: Requirements 11.7**

---

### Property 10: Pengurutan Konsisten untuk Semua Kriteria

*Untuk sembarang* pasangan transaksi dalam array hasil `getSortedFiltered()` dengan `sortDir === 'asc'`:
- Jika `sortField === 'date'`: tanggal elemen ke-i harus ≤ tanggal elemen ke-(i+1) secara leksikografis.
- Jika `sortField === 'amount'`: amount elemen ke-i harus ≤ amount elemen ke-(i+1).
- Jika `sortField === 'category'`: nama kategori elemen ke-i harus ≤ nama kategori elemen ke-(i+1) secara case-insensitive.

**Validates: Requirements 6.3, 6.4, 6.5, 6.6**

---

### Property 11: Filter Diterapkan Sebelum Sort — Semua Hasil Sesuai Filter

*Untuk sembarang* kategori filter yang dipilih (bukan "Semua Kategori"), semua transaksi dalam hasil `getSortedFiltered()` harus memiliki kategori yang sama persis dengan kategori filter yang dipilih. Tidak boleh ada transaksi dari kategori lain dalam hasil.

**Validates: Requirements 6.8, 6.10**

---

### Property 12: Round-Trip Serialisasi LocalStorage

*Untuk sembarang* array `Transaction[]` dan objek `Budgets` yang valid, menyimpan ke LocalStorage dengan `JSON.stringify` kemudian membaca ulang dengan `JSON.parse` harus menghasilkan struktur data yang secara semantik identik dengan data asli — semua field dengan nilai yang sama.

**Validates: Requirements 7.1, 7.2, 11.10**

---

### Property 13: LocalStorage Corrupt Tidak Merusak Aplikasi

*Untuk sembarang* string yang tidak valid sebagai JSON (termasuk string kosong, teks acak, atau JSON yang terpotong), fungsi `loadFromLS()` tidak boleh melempar exception yang tidak tertangani, dan state aplikasi harus di-reset ke nilai default: array transaksi kosong, objek budget kosong.

**Validates: Requirements 7.8**

---

### Property 14: escapeHtml Mencegah XSS untuk Semua Input

*Untuk sembarang* string input pengguna yang mengandung satu atau lebih karakter `&`, `<`, `>`, `"`, atau `'`, fungsi `escapeHtml()` harus menggantinya dengan entitas HTML yang sesuai, sehingga string hasil tidak mengandung karakter berbahaya tersebut dalam bentuk aslinya.

**Validates: Requirements 1.13**

---

### Property 15: Toggle Tema Adalah Round-Trip

*Untuk sembarang* tema awal (light atau dark), mengklik tombol toggle dua kali berturut-turut harus mengembalikan atribut `data-theme` pada elemen `<html>` ke nilai tema awal. Dua toggle = identitas.

**Validates: Requirements 8.4**

---

## Catatan Implementasi — Integrasi Chart.js

Chart.js diakses sebagai variabel global `window.Chart`. Dua instance dikelola:

```javascript
let pieChart = null;  // Chart instance untuk Doughnut Chart
let barChart = null;  // Chart instance untuk Bar Chart
```

**Strategi update chart (untuk menghindari memory leak):**

```
Jika data baru kosong:
  → chart.destroy()  // hapus instance lama
  → set variabel ke null
  → tampilkan teks empty

Jika data baru ada DAN instance sudah ada:
  → chart.data = newData
  → chart.options = newOptions
  → chart.update()  // re-render tanpa destroy

Jika data baru ada DAN instance null:
  → new Chart(canvas, config)  // buat instance baru
  → simpan ke variabel
```

Warna teks dan grid Chart.js dibaca dari CSS variables via `getComputedStyle` setiap kali `renderPieChart()` atau `renderBarChart()` dipanggil — ini memastikan chart secara otomatis beradaptasi saat tema berubah.
