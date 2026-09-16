# Rencana Implementasi: Expense & Budget Visualizer

## Ikhtisar

Codebase sudah tersedia (`index.html`, `css/style.css`, `js/app.js`). Rencana ini berfokus pada empat area utama:

1. **Verifikasi & penyempurnaan** implementasi yang sudah ada terhadap requirements
2. **Penambahan fitur** yang belum lengkap (edge case, UX, aksesibilitas)
3. **Keamanan & ketahanan** (XSS hardening, LocalStorage error handling)
4. **Property-Based Testing (PBT)** untuk memvalidasi 15 correctness properties dari design.md

Stack: Pure HTML · Pure CSS · Vanilla JavaScript · LocalStorage · Chart.js  
Test framework: [fast-check](https://github.com/dubzzz/fast-check) dimuat via CDN (tidak ada build tool).

---

## Tasks

- [ ] 1. Setup infrastruktur pengujian (fast-check via CDN)
  - [ ] 1.1 Buat file `tests/pbt-runner.html` sebagai test harness berbasis browser
    - Muat `fast-check` dari CDN `https://cdn.jsdelivr.net/npm/fast-check/lib/bundle/fast-check.min.js`
    - Muat `js/app.js` dalam mode test (tambahkan flag `window.__TEST_MODE__ = true` sebelum memuat app.js agar event listener DOM tidak meledak saat DOM tidak lengkap)
    - Sediakan area output `<pre id="results">` untuk menampilkan hasil pass/fail tiap property
    - _Requirements: 11.1 – 11.10_

  - [ ] 1.2 Buat file `tests/pbt-utils.js` berisi helper test
    - Ekspor `arbitraryTransaction()`: arbitrary fast-check yang menghasilkan objek `Transaction` valid (id acak, type income/expense, description non-whitespace maks 80 karakter, amount > 0, category dari VALID_CATEGORIES, date format YYYY-MM-DD)
    - Ekspor `arbitraryBudgets()`: arbitrary yang menghasilkan objek `Record<string, number>` dengan subset kategori pengeluaran dan nilai positif
    - Ekspor `arbitraryTransactionArray()`: array 0–50 transaksi acak
    - _Requirements: 11.1 – 11.10_

- [ ] 2. Verifikasi dan perkuat logika bisnis inti di `js/app.js`
  - [ ] 2.1 Verifikasi fungsi `renderSummary()` — pastikan kalkulasi income, expense, dan netBalance akurat
    - Cek apakah iterasi menggunakan `tx.type === 'income'` dan `tx.type === 'expense'` secara konsisten
    - Pastikan tidak ada double-counting atau tipe transaksi yang terlewat
    - Pastikan format Rupiah menggunakan `toLocaleString('id-ID')` dengan prefix "Rp "
    - _Requirements: 2.2, 2.3, 2.4, 2.6_

  - [ ]* 2.2 Tulis property test untuk Property 3 (Invariant Saldo Keuangan)
    - **Property 3: Invariant Saldo Keuangan**
    - Untuk sembarang array transaksi, totalIncome = Σamount(income), totalExpense = Σamount(expense), netBalance = totalIncome − totalExpense
    - **Validates: Requirements 2.2, 2.3, 2.4, 11.1, 11.2, 11.3**

  - [ ]* 2.3 Tulis property test untuk Property 5 (Format Rupiah Konsisten)
    - **Property 5: Format Rupiah Konsisten untuk Semua Angka Positif**
    - Untuk sembarang angka positif, `formatRupiah(n)` harus diawali "Rp " dan menggunakan pemisah ribuan titik
    - **Validates: Requirements 2.6**

- [ ] 3. Verifikasi dan perkuat manajemen transaksi di `js/app.js`
  - [ ] 3.1 Verifikasi validasi form transaksi — pastikan urutan fail-fast sudah sesuai design
    - Cek validasi deskripsi: `.trim() === ''` menampilkan "⚠️ Deskripsi tidak boleh kosong."
    - Cek validasi jumlah: `isNaN(amount) || amount <= 0` menampilkan "⚠️ Jumlah harus lebih dari 0."
    - Cek validasi kategori kosong menampilkan "⚠️ Pilih kategori terlebih dahulu."
    - Cek validasi tanggal kosong menampilkan "⚠️ Tanggal tidak boleh kosong."
    - Pastikan fokus berpindah ke field yang bermasalah setelah validasi gagal
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [ ] 3.2 Verifikasi reset form setelah transaksi berhasil ditambahkan
    - Pastikan hanya field `description`, `amount`, `category` yang dikosongkan
    - Pastikan `type` dan `date` dipertahankan
    - _Requirements: 1.7_

  - [ ] 3.3 Verifikasi fungsi `genId()` menghasilkan ID unik
    - Pastikan `genId()` menggunakan `Date.now().toString(36)` + string acak
    - Tambahkan guard: saat `push` transaksi baru, cek tidak ada ID duplikat di array (sangat jarang, tapi perlu dihandle)
    - _Requirements: 1.2, 11.4_

  - [ ]* 3.4 Tulis property test untuk Property 1 (Penambahan Transaksi Menambah Panjang Daftar)
    - **Property 1: Penambahan Transaksi Menambah Panjang Daftar**
    - Untuk sembarang daftar awal dan transaksi valid, setelah `transactions.push(tx)` panjang bertambah tepat satu
    - **Validates: Requirements 1.2, 11.4**

  - [ ]* 3.5 Tulis property test untuk Property 4 (Validasi Menolak Deskripsi Whitespace-Only)
    - **Property 4: Validasi Input Menolak Deskripsi Whitespace-Only**
    - Untuk sembarang string yang seluruhnya whitespace, transaksi tidak boleh ditambahkan
    - **Validates: Requirements 1.3**

- [ ] 4. Verifikasi dan perkuat penghapusan transaksi
  - [ ] 4.1 Verifikasi logika `confirmDelete` — pastikan filter menggunakan ID, bukan indeks
    - Cek `transactions = transactions.filter(tx => tx.id !== pendingDeleteId)` sudah benar
    - Verifikasi `renderAll()` dipanggil setelah penghapusan
    - _Requirements: 1.9_

  - [ ] 4.2 Verifikasi modal konfirmasi hapus — pastikan semua trigger close bekerja
    - Klik overlay (`e.target === dom.deleteModal`)
    - Klik tombol "Batal"
    - Tekan `Escape` via `document keydown`
    - _Requirements: 1.8, 1.10_

  - [ ] 4.3 Verifikasi tombol "Hapus Semua" — pastikan menggunakan `confirm()` browser dan hanya aktif jika ada transaksi
    - Cek `if (transactions.length === 0) return` sudah ada
    - _Requirements: 1.11_

  - [ ]* 4.4 Tulis property test untuk Property 2 (Penghapusan Mengurangi Panjang Tepat Satu)
    - **Property 2: Penghapusan Transaksi Mengurangi Panjang Daftar Tepat Satu**
    - Untuk sembarang array non-kosong, setelah filter berdasarkan ID valid, panjang berkurang tepat satu dan ID tidak ada lagi
    - **Validates: Requirements 1.9, 11.5**

- [ ] 5. Checkpoint — Verifikasi dasar
  - Pastikan semua tests dari task 2–4 pass, tanyakan kepada user jika ada pertanyaan.

- [ ] 6. Verifikasi dan perkuat manajemen budget
  - [ ] 6.1 Verifikasi validasi form budget — pastikan error message sesuai requirements
    - Cek "⚠️ Pilih kategori." saat kategori kosong
    - Cek "⚠️ Budget harus lebih dari 0." saat amount ≤ 0 atau NaN
    - _Requirements: 3.3, 3.4_

  - [ ] 6.2 Verifikasi render daftar budget — pastikan persentase dan badge "Over!" tampil benar
    - Cek `Math.min(Math.round((usedAmt / limit) * 100), 100)` sudah ada (capped 100%)
    - Pastikan badge "Over!" hanya muncul saat `isOver === true`
    - Pastikan teks "Belum ada budget diatur." muncul saat `budgets` kosong
    - _Requirements: 3.5, 3.6, 3.7, 3.9_

  - [ ] 6.3 Verifikasi hapus budget — pastikan `renderTransactionList()` dipanggil setelah hapus
    - Penghapusan budget harus memicu re-evaluasi status over-budget pada daftar transaksi
    - _Requirements: 3.8_

  - [ ]* 6.4 Tulis property test untuk Property 8 (Persentase Budget 0–100)
    - **Property 8: Persentase Pemakaian Budget Selalu dalam Rentang 0–100**
    - Untuk sembarang nilai actuel ≥ 0 dan budget > 0, `Math.min(Math.round((actual / budget) * 100), 100)` harus selalu bernilai antara 0 dan 100 inklusif
    - **Validates: Requirements 3.7, 11.9**

- [ ] 7. Verifikasi dan perkuat deteksi over-budget
  - [ ] 7.1 Verifikasi `getOverBudgetCategories()` menggunakan strict greater-than (`>`)
    - Buka `js/app.js`, cek baris `if ((spent[cat] || 0) > limit)` sudah menggunakan `>` bukan `>=`
    - _Requirements: 4.2, 11.8_

  - [ ] 7.2 Verifikasi highlight transaksi over-budget — pastikan kelas CSS dan badge hanya muncul untuk expense yang kategorinya over-budget
    - Cek `isOverBudget = tx.type === 'expense' && overCats.has(tx.category)`
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ]* 7.3 Tulis property test untuk Property 6 (Deteksi Over-Budget Strict Greater-Than)
    - **Property 6: Deteksi Over-Budget Menggunakan Strict Greater-Than**
    - Untuk sembarang kategori dengan budget, over-budget jika dan hanya jika spent > budget (pengeluaran tepat sama TIDAK over-budget)
    - **Validates: Requirements 4.2, 11.8**

  - [ ]* 7.4 Tulis property test untuk Property 7 (Tanpa Budget Tidak Ada Status Over-Budget)
    - **Property 7: Tanpa Budget Tidak Ada Status Over-Budget**
    - Untuk sembarang kategori yang tidak ada di objek `budgets`, `getOverBudgetCategories()` tidak boleh menyertakan kategori tersebut
    - **Validates: Requirements 4.5**

- [ ] 8. Verifikasi dan perkuat sort & filter transaksi
  - [ ] 8.1 Verifikasi `getSortedFiltered()` tidak memutasi array asli
    - Cek penggunaan spread `[...transactions]` atau `transactions.filter(...)` saat membuat salinan
    - Pastikan `list.sort(...)` bekerja pada salinan, bukan `transactions` langsung
    - _Requirements: 6.3, 11.7_

  - [ ] 8.2 Verifikasi semua kriteria sort bekerja benar
    - Sort by `date`: perbandingan leksikografis string `YYYY-MM-DD`
    - Sort by `amount`: perbandingan numerik
    - Sort by `category`: `toLowerCase()` case-insensitive
    - Arah `asc` dan `desc` benar
    - _Requirements: 6.4, 6.5, 6.6_

  - [ ] 8.3 Verifikasi filter kategori — filter diterapkan sebelum sort
    - Cek urutan operasi: filter dulu, kemudian sort
    - Pastikan "Semua Kategori" (value kosong) menampilkan semua transaksi
    - _Requirements: 6.8, 6.9, 6.10_

  - [ ]* 8.4 Tulis property test untuk Property 9 (getSortedFiltered Tidak Memutasi Array Asli)
    - **Property 9: getSortedFiltered Tidak Memutasi Array Asli**
    - Untuk sembarang array transaksi, memanggil `getSortedFiltered()` tidak boleh mengubah urutan atau isi `transactions` asli
    - **Validates: Requirements 11.7**

  - [ ]* 8.5 Tulis property test untuk Property 10 (Pengurutan Konsisten)
    - **Property 10: Pengurutan Konsisten untuk Semua Kriteria**
    - Untuk sembarang array transaksi dengan `sortDir === 'asc'`, hasil `getSortedFiltered()` harus terurut naik berdasarkan field yang aktif
    - **Validates: Requirements 6.3, 6.4, 6.5, 6.6**

  - [ ]* 8.6 Tulis property test untuk Property 11 (Filter Diterapkan Sebelum Sort)
    - **Property 11: Filter Diterapkan Sebelum Sort — Semua Hasil Sesuai Filter**
    - Untuk sembarang kategori filter yang dipilih, semua transaksi dalam hasil harus berkategori sama persis dengan filter
    - **Validates: Requirements 6.8, 6.10**

- [ ] 9. Checkpoint — Sort, filter, dan budget
  - Pastikan semua tests dari task 6–8 pass, tanyakan kepada user jika ada pertanyaan.

- [ ] 10. Verifikasi dan perkuat persistensi LocalStorage
  - [ ] 10.1 Verifikasi semua operasi simpan dipanggil dengan benar setelah mutasi
    - `saveTransactions()` dipanggil setelah setiap tambah/hapus transaksi
    - `saveBudgets()` dipanggil setelah set/hapus budget
    - `saveSortPrefs()` dipanggil setelah ubah sortField atau sortDir
    - Tema disimpan via `localStorage.setItem(LS_KEYS.THEME, theme)` di `applyTheme()`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 10.2 Verifikasi `loadFromLS()` menggunakan `try/catch` untuk semua parse
    - Cek `try { transactions = JSON.parse(...) } catch { transactions = []; }`
    - Cek `try { budgets = JSON.parse(...) } catch { budgets = {}; }`
    - Pastikan nilai default yang benar digunakan jika parse gagal
    - _Requirements: 7.8_

  - [ ] 10.3 Verifikasi urutan `init()` — load → theme → sortUI → renderAll
    - Cek `init()` memanggil `loadFromLS()` sebelum `initTheme()` sebelum `initSortUI()` sebelum `renderAll()`
    - _Requirements: 7.5, 7.6, 7.7_

  - [ ]* 10.4 Tulis property test untuk Property 12 (Round-Trip Serialisasi LocalStorage)
    - **Property 12: Round-Trip Serialisasi LocalStorage**
    - Untuk sembarang array `Transaction[]` dan objek `Budgets` valid, `JSON.parse(JSON.stringify(data))` harus menghasilkan struktur yang semantik identik
    - **Validates: Requirements 7.1, 7.2, 11.10**

  - [ ]* 10.5 Tulis property test untuk Property 13 (LocalStorage Corrupt Tidak Merusak Aplikasi)
    - **Property 13: LocalStorage Corrupt Tidak Merusak Aplikasi**
    - Untuk sembarang string tidak valid sebagai JSON (string acak, kosong, JSON terpotong), `loadFromLS()` tidak boleh melempar exception dan state harus di-reset ke default
    - **Validates: Requirements 7.8**

- [ ] 11. Verifikasi dan perkuat keamanan XSS
  - [ ] 11.1 Verifikasi semua tempat `innerHTML` dipanggil menggunakan `escapeHtml()` pada nilai user input
    - Di `renderTransactionList()`: cek `escapeHtml(tx.description)` dan `escapeHtml(tx.category)`
    - Di `renderBudgetList()`: cek `escapeHtml(cat)` pada nama kategori dan `data-cat` attribute
    - Di modal: cek `modalMessage.textContent` (bukan innerHTML) atau gunakan `escapeHtml()`
    - _Requirements: 1.13_

  - [ ] 11.2 Pastikan `escapeHtml()` meng-escape kelima karakter berbahaya: `&`, `<`, `>`, `"`, `'`
    - Verifikasi implementasi di `js/app.js` sudah mencakup semua lima karakter tersebut
    - _Requirements: 1.13_

  - [ ]* 11.3 Tulis property test untuk Property 14 (escapeHtml Mencegah XSS)
    - **Property 14: escapeHtml Mencegah XSS untuk Semua Input**
    - Untuk sembarang string yang mengandung satu atau lebih karakter `&<>"'`, hasil `escapeHtml()` tidak boleh mengandung karakter berbahaya tersebut dalam bentuk aslinya
    - **Validates: Requirements 1.13**

- [ ] 12. Verifikasi dark/light mode dan chart responsivitas
  - [ ] 12.1 Verifikasi `applyTheme()` memperbarui atribut `data-theme`, ikon, label, dan re-render chart
    - Cek `document.documentElement.setAttribute('data-theme', theme)`
    - Cek ikon 🌙/☀️ dan label "Dark Mode"/"Light Mode" diperbarui
    - Cek `renderPieChart()` dan `renderBarChart()` dipanggil di akhir `applyTheme()`
    - _Requirements: 8.2, 8.3, 8.4, 8.6_

  - [ ] 12.2 Verifikasi strategi update Chart.js — update tanpa destroy jika data sudah ada
    - Cek pola: jika instance ada → `chart.data = newData; chart.update()`, jika tidak → `new Chart(...)`
    - Cek pola: jika data kosong → `chart.destroy(); chart = null`
    - _Requirements: 5.9_

  - [ ]* 12.3 Tulis property test untuk Property 15 (Toggle Tema Adalah Round-Trip)
    - **Property 15: Toggle Tema Adalah Round-Trip**
    - Untuk sembarang tema awal (light/dark), memanggil toggle dua kali harus mengembalikan `data-theme` ke nilai awal
    - **Validates: Requirements 8.4**

- [ ] 13. Verifikasi aksesibilitas dan responsivitas
  - [ ] 13.1 Verifikasi atribut ARIA pada semua elemen interaktif penting di `index.html`
    - Tombol delete: `aria-label="Hapus transaksi {deskripsi}"`
    - Tombol toggle tema: `aria-label="Toggle dark/light mode"`
    - Canvas chart: `aria-label` dan `role="img"`
    - Daftar transaksi: `aria-label="Daftar transaksi"`
    - Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 13.2 Verifikasi CSS media queries sudah ada di `css/style.css`
    - `@media (max-width: 1024px)`: grid form+chart menjadi 1 kolom, chart di atas
    - `@media (max-width: 768px)`: summary cards menjadi 1 kolom
    - `@media (max-width: 480px)`: padding dikurangi
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 13.3 Verifikasi animasi CSS sudah ada untuk item transaksi dan modal
    - `@keyframes fadeInUp` pada `.tx-item`
    - `@keyframes slideUp` pada `.modal`
    - `@keyframes fadeIn` pada `.modal-overlay`
    - _Requirements: 10.4, 10.5_

- [ ] 14. Checkpoint akhir — Verifikasi menyeluruh
  - Jalankan seluruh test suite di `tests/pbt-runner.html`
  - Pastikan semua 15 property test pass (atau catat hasilnya dengan jelas)
  - Pastikan semua tests pass, tanyakan kepada user jika ada pertanyaan.

---

## Catatan

- Task yang ditandai `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task verifikasi harus membuka file yang relevan dan membaca kode sebelum menyimpulkan status
- Jika saat verifikasi ditemukan ketidaksesuaian dengan requirements, perbaiki langsung di file yang bersangkutan
- Property tests dijalankan di browser (bukan Node.js) karena tidak ada build tool — gunakan `pbt-runner.html`
- `fast-check` dimuat via CDN; pastikan koneksi internet tersedia saat menjalankan tests
- Seluruh 15 correctness properties dari design.md harus dicakup oleh property tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.2", "3.3"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.4", "3.5", "4.1", "4.2", "4.3"] },
    { "id": 3, "tasks": ["4.4", "6.1", "6.2", "6.3", "7.1", "7.2"] },
    { "id": 4, "tasks": ["6.4", "7.3", "7.4", "8.1", "8.2", "8.3"] },
    { "id": 5, "tasks": ["8.4", "8.5", "8.6", "10.1", "10.2", "10.3"] },
    { "id": 6, "tasks": ["10.4", "10.5", "11.1", "11.2"] },
    { "id": 7, "tasks": ["11.3", "12.1", "12.2"] },
    { "id": 8, "tasks": ["12.3", "13.1", "13.2", "13.3"] }
  ]
}
```
