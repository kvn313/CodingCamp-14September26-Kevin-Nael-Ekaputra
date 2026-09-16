# Requirements Document

## Pendahuluan

Expense & Budget Visualizer adalah aplikasi web berbasis browser yang memungkinkan pengguna mencatat transaksi keuangan pribadi (pemasukan dan pengeluaran), menetapkan batas anggaran per kategori, dan memvisualisasikan data keuangan melalui grafik interaktif. Aplikasi dibangun sepenuhnya dengan teknologi web standar (HTML, CSS, Vanilla JavaScript) tanpa backend, menggunakan LocalStorage sebagai mekanisme persistensi data, dan Chart.js sebagai library visualisasi.

Dokumen ini mendefinisikan persyaratan fungsional dan non-fungsional yang mencakup seluruh fitur yang telah diimplementasikan maupun kriteria kelengkapan implementasinya.

---

## Glosarium

- **Aplikasi**: Expense & Budget Visualizer — sistem pengelola keuangan pribadi berbasis browser.
- **Transaksi**: Satu catatan keuangan yang memiliki atribut: id, tipe (income/expense), deskripsi, jumlah, kategori, dan tanggal.
- **Pemasukan (Income)**: Transaksi bertipe `income` yang menambah saldo bersih.
- **Pengeluaran (Expense)**: Transaksi bertipe `expense` yang mengurangi saldo bersih.
- **Budget**: Batas anggaran maksimum yang ditetapkan pengguna untuk satu kategori pengeluaran tertentu.
- **Kategori**: Klasifikasi transaksi yang terdiri dari: Makanan, Transportasi, Hiburan, Kesehatan, Belanja, Tagihan, Pendidikan, Gaji, dan Lainnya.
- **Over-Budget**: Kondisi saat total pengeluaran suatu kategori melebihi nilai Budget yang ditetapkan untuk kategori tersebut.
- **Saldo Bersih (Net Balance)**: Selisih antara total pemasukan dan total pengeluaran.
- **LocalStorage**: Mekanisme penyimpanan data persisten di browser tanpa server.
- **Doughnut Chart**: Grafik lingkaran berlubang yang menampilkan distribusi pengeluaran per kategori.
- **Bar Chart**: Grafik batang yang menampilkan perbandingan Budget vs Aktual per kategori.
- **Tema**: Skema warna tampilan — `light` (terang) atau `dark` (gelap).
- **Sort Field**: Kriteria pengurutan transaksi: `date`, `amount`, atau `category`.
- **Sort Direction**: Arah pengurutan: `asc` (menaik) atau `desc` (menurun).
- **XSS (Cross-Site Scripting)**: Serangan injeksi skrip melalui input pengguna.

---

## Persyaratan

### Persyaratan 1 — Manajemen Transaksi

**User Story:** Sebagai pengguna, saya ingin menambahkan, melihat, dan menghapus transaksi keuangan, agar saya dapat mencatat pemasukan dan pengeluaran harian saya secara akurat.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menampilkan form transaksi dengan field: tipe (income/expense), deskripsi (maks. 80 karakter), jumlah (angka positif), kategori (dropdown), dan tanggal.

2. WHEN pengguna mengisi seluruh field form dengan data valid dan menekan tombol tambah transaksi, THE Aplikasi SHALL membuat objek transaksi baru dengan id unik yang dihasilkan dari kombinasi `Date.now().toString(36)` dan bilangan acak, kemudian menambahkan transaksi tersebut ke daftar.

3. WHEN pengguna menekan tombol tambah transaksi dengan field deskripsi kosong, THE Aplikasi SHALL menampilkan pesan error "⚠️ Deskripsi tidak boleh kosong." dan memfokuskan kursor ke field deskripsi tanpa menyimpan transaksi.

4. WHEN pengguna menekan tombol tambah transaksi dengan nilai jumlah kurang dari atau sama dengan 0, atau bukan angka, THE Aplikasi SHALL menampilkan pesan error "⚠️ Jumlah harus lebih dari 0." dan memfokuskan kursor ke field jumlah tanpa menyimpan transaksi.

5. WHEN pengguna menekan tombol tambah transaksi tanpa memilih kategori, THE Aplikasi SHALL menampilkan pesan error "⚠️ Pilih kategori terlebih dahulu." dan memfokuskan kursor ke dropdown kategori tanpa menyimpan transaksi.

6. WHEN pengguna menekan tombol tambah transaksi dengan field tanggal kosong, THE Aplikasi SHALL menampilkan pesan error "⚠️ Tanggal tidak boleh kosong." dan memfokuskan kursor ke field tanggal tanpa menyimpan transaksi.

7. WHEN transaksi berhasil ditambahkan, THE Aplikasi SHALL mengosongkan field deskripsi, jumlah, dan kategori, serta mempertahankan nilai tipe dan tanggal yang sebelumnya dipilih.

8. WHEN pengguna mengklik tombol hapus (🗑️) pada sebuah transaksi, THE Aplikasi SHALL menampilkan modal konfirmasi yang memuat teks "Yakin ingin menghapus '{deskripsi}'?" sebelum menghapus transaksi.

9. WHEN pengguna mengkonfirmasi penghapusan di modal, THE Aplikasi SHALL menghapus transaksi yang bersangkutan dari daftar dan memperbarui seluruh komponen tampilan (ringkasan, grafik, daftar transaksi).

10. WHEN pengguna membatalkan penghapusan di modal (klik Batal, klik overlay, atau tekan Escape), THE Aplikasi SHALL menutup modal tanpa menghapus transaksi.

11. WHEN pengguna mengklik tombol "Hapus Semua" dan daftar transaksi tidak kosong, THE Aplikasi SHALL menampilkan dialog konfirmasi browser (`confirm`) sebelum menghapus seluruh transaksi.

12. IF daftar transaksi kosong, THEN THE Aplikasi SHALL menampilkan pesan "Belum ada transaksi. Tambahkan transaksi pertama Anda!" di area daftar transaksi.

13. THE Aplikasi SHALL melakukan escape HTML pada nilai deskripsi dan kategori saat merender ke DOM untuk mencegah serangan XSS.

---

### Persyaratan 2 — Ringkasan Keuangan

**User Story:** Sebagai pengguna, saya ingin melihat ringkasan total pemasukan, total pengeluaran, dan saldo bersih secara real-time, agar saya dapat memahami kondisi keuangan saya sekilas.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menampilkan tiga kartu ringkasan: Total Pemasukan, Total Pengeluaran, dan Saldo Bersih.

2. WHEN terdapat perubahan pada daftar transaksi (tambah, hapus, hapus semua), THE Aplikasi SHALL memperbarui nilai Total Pemasukan sebagai penjumlahan seluruh transaksi bertipe `income`.

3. WHEN terdapat perubahan pada daftar transaksi (tambah, hapus, hapus semua), THE Aplikasi SHALL memperbarui nilai Total Pengeluaran sebagai penjumlahan seluruh transaksi bertipe `expense`.

4. WHEN terdapat perubahan pada daftar transaksi, THE Aplikasi SHALL memperbarui nilai Saldo Bersih sebagai selisih (Total Pemasukan − Total Pengeluaran).

5. WHILE nilai Saldo Bersih bernilai negatif, THE Aplikasi SHALL menerapkan kelas CSS `negative` pada elemen kartu saldo sehingga nilai ditampilkan dengan warna merah.

6. THE Aplikasi SHALL memformat seluruh nilai moneter menggunakan format Rupiah Indonesia dengan pola "Rp {angka dengan pemisah ribuan titik}" (contoh: Rp 150.000) menggunakan `toLocaleString('id-ID')`.

---

### Persyaratan 3 — Manajemen Budget per Kategori

**User Story:** Sebagai pengguna, saya ingin menetapkan dan mengelola batas anggaran per kategori pengeluaran, agar saya dapat mengendalikan pola pengeluaran saya.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menampilkan form penetapan budget yang terdiri dari dropdown kategori dan field jumlah budget.

2. WHEN pengguna memilih kategori dan memasukkan jumlah budget positif lalu menekan tombol Set, THE Aplikasi SHALL menyimpan atau memperbarui nilai budget untuk kategori tersebut dan memperbarui tampilan daftar budget serta Bar Chart.

3. WHEN pengguna menekan tombol Set tanpa memilih kategori, THE Aplikasi SHALL menampilkan pesan error "⚠️ Pilih kategori." tanpa menyimpan budget.

4. WHEN pengguna menekan tombol Set dengan nilai budget kurang dari atau sama dengan 0, atau bukan angka, THE Aplikasi SHALL menampilkan pesan error "⚠️ Budget harus lebih dari 0." tanpa menyimpan budget.

5. THE Aplikasi SHALL menampilkan daftar budget yang telah ditetapkan, masing-masing memuat: nama kategori dengan emoji, nilai aktual yang telah dibelanjakan (format Rupiah), nilai batas budget (format Rupiah), dan persentase pemakaian.

6. WHILE suatu kategori dalam kondisi Over-Budget, THE Aplikasi SHALL menampilkan badge "Over!" berwarna merah pada item budget yang bersangkutan di daftar budget.

7. WHILE suatu kategori tidak dalam kondisi Over-Budget, THE Aplikasi SHALL menampilkan persentase pemakaian budget (dibulatkan ke bilangan bulat, maksimum 100%) pada item budget yang bersangkutan.

8. WHEN pengguna mengklik tombol hapus (✕) pada item budget, THE Aplikasi SHALL menghapus budget untuk kategori tersebut, memperbarui daftar budget, Bar Chart, dan status over-budget pada daftar transaksi.

9. IF belum ada budget yang ditetapkan, THEN THE Aplikasi SHALL menampilkan teks "Belum ada budget diatur." di area daftar budget.

---

### Persyaratan 4 — Deteksi Over-Budget dan Highlight

**User Story:** Sebagai pengguna, saya ingin melihat secara visual mana transaksi yang kategorinya sudah melampaui budget, agar saya dapat segera mengetahui area pengeluaran yang berlebih.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menghitung total pengeluaran per kategori dari seluruh transaksi bertipe `expense` sebagai dasar deteksi over-budget.

2. WHEN total pengeluaran suatu kategori melebihi nilai budget yang ditetapkan untuk kategori tersebut, THE Aplikasi SHALL mengklasifikasikan kategori tersebut sebagai Over-Budget.

3. WHILE suatu kategori dalam kondisi Over-Budget, THE Aplikasi SHALL menerapkan kelas CSS `over-budget` pada setiap transaksi bertipe `expense` yang berkategori sama, mengubah tampilan latar belakang dan border item transaksi.

4. WHILE suatu kategori dalam kondisi Over-Budget, THE Aplikasi SHALL menampilkan badge "Over Budget" berwarna merah pada setiap transaksi bertipe `expense` yang berkategori sama.

5. IF tidak ada budget yang ditetapkan untuk suatu kategori, THEN THE Aplikasi SHALL tidak menampilkan badge over-budget pada transaksi kategori tersebut, tanpa memandang besarnya pengeluaran.

6. WHEN nilai budget atau transaksi berubah, THE Aplikasi SHALL mengevaluasi ulang status over-budget seluruh kategori dan memperbarui tampilan secara sinkron.

---

### Persyaratan 5 — Visualisasi Grafik

**User Story:** Sebagai pengguna, saya ingin melihat grafik distribusi pengeluaran dan perbandingan budget vs aktual, agar saya dapat menganalisis pola keuangan saya secara visual.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menampilkan Doughnut Chart yang memvisualisasikan distribusi total pengeluaran per kategori menggunakan library Chart.js.

2. WHEN terdapat transaksi pengeluaran, THE Aplikasi SHALL merender Doughnut Chart dengan label nama kategori, nilai pengeluaran per kategori, dan persentase pada tooltip.

3. IF tidak ada transaksi pengeluaran, THEN THE Aplikasi SHALL menyembunyikan Doughnut Chart dan menampilkan teks "Belum ada data pengeluaran."

4. THE Aplikasi SHALL menampilkan Bar Chart yang memvisualisasikan perbandingan nilai Budget (dataset biru) dan nilai Aktual (dataset hijau/merah) per kategori.

5. WHEN suatu kategori dalam kondisi Over-Budget, THE Aplikasi SHALL menampilkan bar Aktual untuk kategori tersebut menggunakan warna merah (`rgba(252, 129, 129, 0.85)`). WHILE suatu kategori tidak dalam kondisi Over-Budget, THE Aplikasi SHALL menampilkan bar Aktual menggunakan warna hijau (`rgba(64, 192, 87, 0.85)`).

6. IF tidak ada budget yang ditetapkan, THEN THE Aplikasi SHALL menyembunyikan Bar Chart dan menampilkan teks "Belum ada budget yang diatur."

7. WHEN tema (dark/light) berubah, THE Aplikasi SHALL memperbarui warna teks label, warna garis grid, dan warna border chart untuk menyesuaikan dengan skema warna tema aktif.

8. THE Aplikasi SHALL menggunakan palet warna tetap (`CHART_COLORS`) untuk segmen Doughnut Chart sehingga warna kategori konsisten antar render.

9. WHEN data transaksi atau budget berubah, THE Aplikasi SHALL memperbarui kedua chart tanpa menghancurkan dan membuat ulang instance Chart.js kecuali jika data sebelumnya kosong.

---

### Persyaratan 6 — Pengurutan dan Filter Transaksi

**User Story:** Sebagai pengguna, saya ingin mengurutkan dan menyaring daftar transaksi, agar saya dapat menemukan dan menganalisis transaksi tertentu dengan mudah.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menyediakan dropdown pengurutan dengan opsi: Tanggal (`date`), Jumlah (`amount`), dan Kategori (`category`).

2. THE Aplikasi SHALL menyediakan tombol arah pengurutan yang menampilkan ikon `↑` untuk `asc` dan `↓` untuk `desc`, dan dapat diubah dengan satu klik.

3. WHEN pengguna mengubah kriteria sort field atau sort direction, THE Aplikasi SHALL mengurutkan ulang daftar transaksi yang ditampilkan sesuai preferensi baru secara real-time.

4. WHEN sort field adalah `date`, THE Aplikasi SHALL mengurutkan transaksi berdasarkan nilai string tanggal format `YYYY-MM-DD` secara leksikografis.

5. WHEN sort field adalah `amount`, THE Aplikasi SHALL mengurutkan transaksi berdasarkan nilai numerik jumlah transaksi.

6. WHEN sort field adalah `category`, THE Aplikasi SHALL mengurutkan transaksi berdasarkan nama kategori secara alfabetis case-insensitive.

7. THE Aplikasi SHALL menyediakan dropdown filter kategori dengan opsi "Semua Kategori" dan seluruh kategori yang tersedia.

8. WHEN pengguna memilih kategori pada filter, THE Aplikasi SHALL menampilkan hanya transaksi yang memiliki kategori yang sama persis dengan pilihan filter.

9. WHEN pengguna memilih "Semua Kategori" pada filter, THE Aplikasi SHALL menampilkan seluruh transaksi tanpa terkecuali.

10. THE Aplikasi SHALL menerapkan filter sebelum mengurutkan sehingga hasil tampil adalah subset yang sudah difilter kemudian diurutkan.

---

### Persyaratan 7 — Persistensi Data dengan LocalStorage

**User Story:** Sebagai pengguna, saya ingin data transaksi, budget, preferensi tampilan, dan pengaturan pengurutan tetap tersimpan setelah browser ditutup, agar saya tidak kehilangan catatan keuangan saya.

#### Kriteria Penerimaan

1. WHEN transaksi baru ditambahkan atau dihapus, THE Aplikasi SHALL menyimpan seluruh array transaksi ke LocalStorage dengan key `ebv_transactions` dalam format JSON.

2. WHEN nilai budget ditetapkan atau dihapus, THE Aplikasi SHALL menyimpan seluruh objek budget ke LocalStorage dengan key `ebv_budgets` dalam format JSON.

3. WHEN tema diubah, THE Aplikasi SHALL menyimpan nilai tema (`light` atau `dark`) ke LocalStorage dengan key `ebv_theme`.

4. WHEN sort field atau sort direction diubah, THE Aplikasi SHALL menyimpan nilai preferensi ke LocalStorage dengan key `ebv_sort_field` dan `ebv_sort_dir`.

5. WHEN aplikasi dimuat (page load), THE Aplikasi SHALL membaca seluruh data dari LocalStorage sebelum merender antarmuka.

6. WHEN aplikasi dimuat, THE Aplikasi SHALL menerapkan tema tersimpan sehingga tampilan langsung sesuai preferensi pengguna tanpa flicker.

7. WHEN aplikasi dimuat, THE Aplikasi SHALL menerapkan sort field dan sort direction tersimpan sehingga tampilan pengurutan konsisten dengan sesi sebelumnya.

8. IF data di LocalStorage berformat tidak valid (JSON corrupt atau nilai yang tidak terduga), THEN THE Aplikasi SHALL menggunakan nilai default (array kosong untuk transaksi, objek kosong untuk budget, `light` untuk tema, `date`/`desc` untuk sort) tanpa melempar error yang merusak tampilan.

---

### Persyaratan 8 — Dark/Light Mode

**User Story:** Sebagai pengguna, saya ingin mengubah skema warna tampilan antara mode terang dan gelap, agar kenyamanan visual saya terpenuhi di berbagai kondisi pencahayaan.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menyediakan tombol toggle tema di header yang dapat diakses kapan saja.

2. WHEN tema `light` aktif, THE Aplikasi SHALL menampilkan ikon 🌙 dan label "Dark Mode" pada tombol toggle.

3. WHEN tema `dark` aktif, THE Aplikasi SHALL menampilkan ikon ☀️ dan label "Light Mode" pada tombol toggle.

4. WHEN pengguna mengklik tombol toggle, THE Aplikasi SHALL mengubah atribut `data-theme` pada elemen `<html>` antara `light` dan `dark`.

5. WHILE tema `dark` aktif, THE Aplikasi SHALL menerapkan variabel CSS dark theme (latar belakang gelap, teks terang, border dan surface yang disesuaikan) di seluruh komponen tampilan.

6. WHEN tema berubah, THE Aplikasi SHALL memperbarui warna teks dan garis grid pada kedua chart (Doughnut dan Bar Chart) sesuai tema aktif.

---

### Persyaratan 9 — Tampilan Responsif

**User Story:** Sebagai pengguna, saya ingin mengakses aplikasi dari perangkat dengan berbagai ukuran layar, agar pengalaman penggunaan tetap nyaman di desktop, tablet, maupun mobile.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menampilkan tiga kartu ringkasan dalam tata letak tiga kolom pada layar dengan lebar lebih dari 768px.

2. WHEN lebar viewport kurang dari atau sama dengan 768px, THE Aplikasi SHALL menampilkan kartu ringkasan dalam tata letak satu kolom.

3. THE Aplikasi SHALL menampilkan form transaksi dan kartu chart dalam tata letak dua kolom (400px + 1fr) pada layar dengan lebar lebih dari 1024px.

4. WHEN lebar viewport kurang dari atau sama dengan 1024px, THE Aplikasi SHALL menampilkan form transaksi dan kartu chart dalam tata letak satu kolom, dengan kartu chart diletakkan di atas form.

5. WHEN lebar viewport kurang dari atau sama dengan 480px, THE Aplikasi SHALL mengurangi padding header, main content, dan card untuk mengoptimalkan penggunaan ruang layar sempit.

6. THE Aplikasi SHALL memastikan seluruh elemen interaktif (tombol, input, dropdown) dapat dijangkau dan digunakan dengan jari pada perangkat layar sentuh.

---

### Persyaratan 10 — Aksesibilitas dan Animasi

**User Story:** Sebagai pengguna, saya ingin antarmuka yang responsif terhadap interaksi dan mudah dioperasikan dengan berbagai perangkat input, agar pengalaman penggunaan inklusif dan menyenangkan.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL memberikan atribut `aria-label` yang deskriptif pada tombol delete transaksi, tombol toggle tema, canvas chart, daftar transaksi, dan daftar budget.

2. THE Aplikasi SHALL memberikan atribut `aria-live="polite"` pada elemen pesan error form transaksi dan form budget agar perubahan pesan dapat dibacakan oleh screen reader.

3. THE Aplikasi SHALL memberikan atribut `role="dialog"` dan `aria-modal="true"` serta `aria-labelledby` yang merujuk judul modal pada elemen modal konfirmasi hapus.

4. WHEN item transaksi baru ditambahkan ke daftar, THE Aplikasi SHALL menerapkan animasi `fadeInUp` (opacity 0→1, translateY 8px→0, durasi 0.25s) pada item tersebut.

5. WHEN modal konfirmasi muncul, THE Aplikasi SHALL menerapkan animasi `slideUp` (opacity 0→1, translateY 16px→0, durasi 0.2s) dan overlay `fadeIn` (opacity 0→1, durasi 0.15s).

6. THE Aplikasi SHALL menampilkan teks tanggal dalam format yang dapat dibaca manusia (contoh: "14 Sep 2026") menggunakan konversi dari format `YYYY-MM-DD`, bukan dalam format mesin.

7. THE Aplikasi SHALL menetapkan tanggal hari ini sebagai nilai default pada field tanggal form transaksi saat halaman dimuat.

---

### Persyaratan 11 — Integritas Data dan Correctness Properties

**User Story:** Sebagai pengembang, saya ingin memastikan logika bisnis inti berjalan benar untuk semua kombinasi input yang valid, agar aplikasi dapat diandalkan dan tidak menghasilkan data yang inkonsisten.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL memastikan bahwa Total Pemasukan selalu sama dengan penjumlahan nilai `amount` dari seluruh transaksi bertipe `income` yang tersimpan, untuk semua kemungkinan koleksi transaksi.

2. THE Aplikasi SHALL memastikan bahwa Total Pengeluaran selalu sama dengan penjumlahan nilai `amount` dari seluruh transaksi bertipe `expense` yang tersimpan, untuk semua kemungkinan koleksi transaksi.

3. THE Aplikasi SHALL memastikan bahwa Saldo Bersih selalu sama dengan (Total Pemasukan − Total Pengeluaran), sehingga tidak pernah ada inkonsistensi antara ketiga nilai ringkasan tersebut.

4. THE Aplikasi SHALL memastikan bahwa setiap transaksi yang ditambahkan memiliki id yang unik sehingga tidak ada dua transaksi dengan id yang sama dalam satu sesi.

5. THE Aplikasi SHALL memastikan bahwa penghapusan satu transaksi berdasarkan id tidak menghapus transaksi lain, sehingga jumlah transaksi berkurang tepat satu setelah operasi hapus tunggal.

6. THE Aplikasi SHALL memastikan bahwa setelah operasi hapus semua, jumlah transaksi tersimpan adalah nol dan seluruh nilai ringkasan (pemasukan, pengeluaran, saldo) menjadi Rp 0.

7. THE Aplikasi SHALL memastikan bahwa fungsi `getSortedFiltered` tidak mengubah array transaksi asli (immutable sort), sehingga urutan penyimpanan di `transactions` tidak terpengaruh oleh operasi tampil.

8. THE Aplikasi SHALL memastikan bahwa suatu kategori dikategorikan sebagai Over-Budget jika dan hanya jika total pengeluaran kategori tersebut secara ketat lebih besar dari nilai budget yang ditetapkan (strict greater than, bukan greater than or equal).

9. THE Aplikasi SHALL memastikan bahwa persentase pemakaian budget yang ditampilkan bernilai antara 0 dan 100 (inklusif) untuk semua nilai pengeluaran aktual dan nilai budget yang valid, dengan nilai aktual melebihi budget dibulatkan ke 100%.

10. THE Aplikasi SHALL memastikan bahwa data yang disimpan ke LocalStorage dapat di-parse kembali menjadi struktur data yang secara semantik identik dengan data sebelum disimpan, untuk semua transaksi dan budget yang valid.

