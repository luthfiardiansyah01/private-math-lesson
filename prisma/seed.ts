/**
 * EduTrack LMS — Database Seed Script
 * Task ID: 4
 *
 * Populates the database with realistic Indonesian education content
 * for demo purposes: 1 tutor + 2 students, 3 subjects, topics, lessons,
 * exercises, and MCQ questions.
 *
 * Usage:
 *   bun prisma/seed.ts
 *   (or `bun run db:seed`)
 */

import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const db = new PrismaClient();

/**
 * Hash a password with scrypt + random salt.
 * Format: "salt:hash" (same convention as src/lib/password.ts).
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// ---------- Lesson markdown content (Indonesian, real educational value) ----------

const LESSON_PERTIDAKSAMAAN_LINEAR = `# Pertidaksamaan Linear Satu Variabel

## Pengertian

**Pertidaksamaan linear satu variabel** adalah kalimat terbuka matematika yang memuat tanda pertidaksamaan (\`<\`, \`>\`, \`≤\`, \`≥\`) dan hanya memiliki satu variabel berpangkat satu. Bentuk umumnya adalah:

\`\`\`
ax + b < 0   |   ax + b > 0   |   ax + b ≤ 0   |   ax + b ≥ 0
\`\`\`

dengan \`a ≠ 0\` dan \`a, b\` adalah bilangan real.

## Tanda Pertidaksamaan

- \`<\` : kurang dari
- \`>\` : lebih dari
- \`≤\` : kurang dari atau sama dengan
- \`≥\` : lebih dari atau sama dengan

## Langkah Penyelesaian

1. **Pindahkan** semua suku yang memuat variabel ke satu sisi, dan konstanta ke sisi lain.
2. **Sederhanakan** kedua sisi jika memungkinkan.
3. **Bagi atau kali** kedua ruas dengan koefisien variabel.
   - **Penting:** Jika kedua ruas dikali atau dibagi bilangan **negatif**, maka **tanda pertidaksamaan berubah arah**.
4. Tuliskan himpunan penyelesaian dalam bentuk notasi himpunan.

## Contoh 1

Selesaikan \`2x - 6 > 0\`.

\`\`\`
2x - 6 > 0
2x > 6          (tambah 6 ke kedua sisi)
x > 3           (bagi kedua sisi dengan 2)
\`\`\`

Himpunan penyelesaian: \`{ x | x > 3 }\`

## Contoh 2

Selesaikan \`-3x + 5 ≤ 2\`.

\`\`\`
-3x + 5 ≤ 2
-3x ≤ 2 - 5
-3x ≤ -3
x ≥ 1           (dibagi -3, tanda ≤ berubah menjadi ≥)
\`\`\`

Himpunan penyelesaian: \`{ x | x ≥ 1 }\`

## Tips Penting

- Selalu perhatikan tanda koefisien saat membagi/mengalikan.
- Garis bilangan dapat membantu memvisualisasikan himpunan penyelesaian.
- Untuk pertidaksamaan berbentuk pecahan, kalikan silang dengan hati-hati terhadap tanda penyebut.

## Kesimpulan

Pertidaksamaan linear satu variabel diselesaikan dengan manipulasi aljabar seperti persamaan, **kecuali** saat mengalikan atau membagi dengan bilangan negatif, tanda pertidaksamaan harus dibalik. Latih dengan berbagai variasi soal agar terbiasa menangani kasus khusus seperti koefisien negatif dan pecahan.`;

const LESSON_SPLDV = `# Sistem Persamaan Linear Dua Variabel (SPLDV)

## Pengertian

**SPLDV** adalah sistem yang terdiri dari dua persamaan linear dengan dua variabel, biasanya \`x\` dan \`y\`. Bentuk umumnya:

\`\`\`
a₁x + b₁y = c₁
a₂x + b₂y = c₂
\`\`\`

Tujuannya adalah mencari nilai \`x\` dan \`y\` yang memenuhi **kedua** persamaan secara bersamaan.

## Metode Penyelesaian

### 1. Metode Substitusi

- Ubah salah satu persamaan ke bentuk \`y = ...\` atau \`x = ...\`.
- Substitusikan ke persamaan lainnya untuk mencari satu variabel.
- Substitusikan kembali untuk mendapatkan variabel kedua.

**Contoh:**
\`\`\`
x + y = 5
x - y = 1
\`\`\`
Dari persamaan kedua: \`x = y + 1\`.
Substitusi ke persamaan pertama: \`(y + 1) + y = 5 → 2y = 4 → y = 2\`.
Maka \`x = 3\`. **HP: (3, 2)**.

### 2. Metode Eliminasi

- Samakan koefisien salah satu variabel pada kedua persamaan.
- Eliminasi variabel tersebut dengan menjumlah atau mengurangkan kedua persamaan.
- Selesaikan untuk satu variabel, lalu substitusi kembali.

**Contoh:**
\`\`\`
3x + 2y = 12
x  + 2y = 8
\`\`\`
Kurangi persamaan pertama dengan kedua: \`2x = 4 → x = 2\`.
Substitusi: \`2 + 2y = 8 → 2y = 6 → y = 3\`. **HP: (2, 3)**.

### 3. Metode Grafik

Setiap persamaan linear digambar sebagai garis lurus pada bidang kartesius. Titik potong kedua garis adalah penyelesaiannya.

- Jika kedua garis berpotongan → ada satu penyelesaian.
- Jika berimpit → banyak penyelesaian tak hingga.
- Jika sejajar → tidak ada penyelesaian.

### 4. Metode Determinan (Crammer)

Untuk sistem:
\`\`\`
a₁x + b₁y = c₁
a₂x + b₂y = c₂
\`\`\`
Determinan utama \`D = a₁b₂ - a₂b₁\`. Jika \`D ≠ 0\`:
\`\`\`
x = (c₁b₂ - c₂b₁) / D
y = (a₁c₂ - a₂c₁) / D
\`\`\`

## Tips Memilih Metode

- Koefisien salah satu variabel mudah disamakan → **eliminasi**.
- Salah satu persamaan mudah diisolasi → **substitusi**.
- Butuh visualisasi → **grafik**.
- Sistem kompleks → **determinan**.

## Kesimpulan

SPLDV dapat diselesaikan dengan berbagai metode. Pilihan metode bergantung pada bentuk persamaan. Berlatih dengan beragam soal akan mempercepat recognisi pola dan menentukan metode paling efisien.`;

const LESSON_PYTHAGORAS = `# Teorema Pythagoras

## Pengertian

**Teorema Pythagoras** berlaku pada segitiga siku-siku dan menyatakan hubungan antara panjang sisi-sisinya. Pada segitiga siku-siku dengan sisi siku-siku \`a\` dan \`b\`, serta sisi miring (hipotenusa) \`c\`, berlaku:

\`\`\`
a² + b² = c²
\`\`\`

Sisi miring \`c\` selalu berhadapan dengan sudut siku-siku (90°) dan merupakan sisi terpanjang.

## Penggunaan Rumus

Tergantung variabel yang dicari:

\`\`\`
c = √(a² + b²)     → mencari sisi miring
a = √(c² - b²)     → mencari salah satu sisi siku-siku
b = √(c² - a²)     → mencari sisi siku-siku lainnya
\`\`\`

## Tripel Pythagoras

Tripel Pythagoras adalah tiga bilangan bulat positif \`(a, b, c)\` yang memenuhi \`a² + b² = c²\`. Contoh:

- \`(3, 4, 5)\`
- \`(5, 12, 13)\`
- \`(6, 8, 10)\`
- \`(8, 15, 17)\`
- \`(7, 24, 25)\`

Mengingat tripel ini sangat membantu menyelesaikan soal dengan cepat tanpa kalkulator.

## Contoh Soal

### Contoh 1
Sebuah segitiga siku-siku memiliki sisi siku-siku 3 cm dan 4 cm. Berapa panjang sisi miringnya?

\`\`\`
c = √(3² + 4²) = √(9 + 16) = √25 = 5 cm
\`\`\`

### Contoh 2
Sebuah tangga sepanjang 5 m bersandar pada dinding. Kaki tangga berjarak 3 m dari dinding. Berapa tinggi tangga di dinding?

\`\`\`
tinggi = √(5² - 3²) = √(25 - 9) = √16 = 4 m
\`\`\`

## Aplikasi dalam Kehidupan

- Menghitung jarak terpendek antara dua titik.
- Menentukan panjang diagonal persegi atau persegi panjang.
- Arsitektur dan konstruksi (memastikan sudut siku-siku).
- Navigasi dan koordinat geografis.

## Kesimpulan

Teorema Pythagoras adalah fondasi geometri segitiga siku-siku. Kuasai rumus \`a² + b² = c²\` dan hafalkan tripel Pythagoras utama untuk menyelesaikan soal dengan cepat dan akurat.`;

const LESSON_LINGKARAN = `# Luas dan Keliling Lingkaran

## Pengertian Lingkaran

**Lingkaran** adalah himpunan titik-titik pada bidang yang berjarak sama dari satu titik pusat. Jarak dari pusat ke titik pada lingkaran disebut **jari-jari** (\`r\`), sedangkan jarak melintasi pusat dari sisi ke sisi disebut **diameter** (\`d = 2r\`).

## Rumus Dasar

### Keliling Lingkaran
\`\`\`
K = 2 × π × r = π × d
\`\`\`

### Luas Lingkaran
\`\`\`
L = π × r²
\`\`\`

Nilai \`π\` (pi) umumnya dibulatkan menjadi:
- \`π = 22/7\` (untuk perhitungan dengan kelipatan 7)
- \`π = 3,14\` (umum)
- \`π = 3,14159...\` (presisi tinggi)

## Contoh Soal

### Contoh 1: Mencari Luas
Lingkaran dengan jari-jari 7 cm. Hitunglah luasnya (π = 22/7).

\`\`\`
L = π × r² = (22/7) × 7² = (22/7) × 49 = 22 × 7 = 154 cm²
\`\`\`

### Contoh 2: Mencari Keliling
Lingkaran berdiameter 14 cm. Hitunglah kelilingnya (π = 22/7).

\`\`\`
K = π × d = (22/7) × 14 = 22 × 2 = 44 cm
\`\`\`

### Contoh 3: Mencari Jari-jari dari Luas
Sebuah lingkaran memiliki luas 616 cm². Tentukan jari-jarinya (π = 22/7).

\`\`\`
616 = (22/7) × r²
r² = 616 × 7 / 22 = 4312 / 22 = 196
r = √196 = 14 cm
\`\`\`

## Tips Memilih Nilai π

- Jika \`r\` atau \`d\` kelipatan 7 → gunakan \`π = 22/7\` agar perhitungan bulat.
- Jika \`r\` bukan kelipatan 7 → gunakan \`π = 3,14\` atau biarkan simbolik.
- Pada soal UTBK/SNBT, perhatikan instruksi soal tentang nilai π yang digunakan.

## Aplikasi

- Menghitung luas taman berbentuk lingkaran.
- Menentukan panjang pagar melingkar.
- Merancang roda, torsi, dan komponen mesin.
- Analisis gerak melingkar dalam fisika.

## Kesimpulan

Lingkaran memiliki dua rumus utama: keliling \`K = 2πr\` dan luas \`L = πr²\`. Pemilihan nilai \`π\` yang tepat akan mempermudah perhitungan, terutama pada soal-soal dengan jari-jari kelipatan 7.`;

const LESSON_GLB = `# Gerak Lurus Beraturan (GLB)

## Pengertian

**Gerak Lurus Beraturan (GLB)** adalah gerak benda pada lintasan lurus dengan **kecepatan konstan**. Artinya, baik besar maupun arah kecepatan benda tidak berubah sepanjang waktu.

Karena kecepatan konstan, **percepatan (a) = 0**.

## Rumus Utama

\`\`\`
v = s / t
s = v × t
t = s / v
\`\`\`

Keterangan:
- \`v\` = kecepatan (m/s atau km/jam)
- \`s\` = jarak tempuh (m atau km)
- \`t\` = waktu (s atau jam)

## Karakteristik GLB

- Kecepatan **konstan** (tetap).
- Percepatan **nol**.
- Lintasan berupa **garis lurus**.
- Grafik jarak-waktu (s-t) berupa **garis lurus** melalui titik asal.
- Grafik kecepatan-waktu (v-t) berupa **garis horizontal**.

## Contoh Soal

### Contoh 1: Mencari Kecepatan
Sebuah mobil menempuh jarak 120 km dalam waktu 2 jam. Berapa kecepatan rata-ratanya?

\`\`\`
v = s / t = 120 / 2 = 60 km/jam
\`\`\`

### Contoh 2: Mencari Jarak
Sepeda motor bergerak dengan kecepatan 20 m/s selama 5 detik. Berapa jarak tempuhnya?

\`\`\`
s = v × t = 20 × 5 = 100 m
\`\`\`

### Contoh 3: Mencari Waktu
Sebuah kereta berjalan dengan kecepatan 80 km/jam. Berapa waktu yang diperlukan untuk menempuh 240 km?

\`\`\`
t = s / v = 240 / 80 = 3 jam
\`\`\`

## Perbedaan dengan GLBB

| Aspek | GLB | GLBB |
|---|---|---|
| Kecepatan | Konstan | Berubah beraturan |
| Percepatan | Nol | Konstan (≠ 0) |
| Grafik s-t | Garis lurus | Parabola |
| Grafik v-t | Garis horizontal | Garis miring |

## Aplikasi

- Menghitung waktu tempuh perjalanan.
- Analisis kelajuan rata-rata kendaraan.
- Sistem transportasi dan logistik.
- Mesin konveyor di pabrik.

## Kesimpulan

GLB adalah gerak paling dasar dalam kinematika. Kunci utamanya adalah **kecepatan konstan** dan **percepatan nol**. Pahami rumus \`v = s/t\` beserta turunannya, serta visualisasikan dalam bentuk grafik untuk memperkuat pemahaman.`;

const LESSON_NEWTON = `# Hukum Newton tentang Gerak

Sir Isaac Newton merumuskan tiga hukum dasar yang menjelaskan hubungan antara gaya dan gerak benda. Ketiga hukum ini menjadi fondasi mekanika klasik.

## Hukum I Newton (Hukum Kelembaman)

> "Setiap benda akan tetap diam atau bergerak lurus beraturan jika tidak ada gaya luar yang bekerja padanya."

\`\`\`
ΣF = 0  →  benda diam atau GLB
\`\`\`

**Inti:** Benda cenderung mempertahankan keadaannya (kelembaman/inersia). Massa adalah ukuran inersia.

**Contoh:** Penumpang yang terdorong ke depan saat mobil direm mendadak; buah jatuh dari pohon tetap di tempat jika tidak ada gaya.

## Hukum II Newton (Hukum Percepatan)

> "Percepatan suatu benda berbanding lurus dengan gaya yang bekerja padanya, dan berbanding terbalik dengan massanya."

\`\`\`
F = m × a
\`\`\`

Keterangan:
- \`F\` = gaya (Newton, N)
- \`m\` = massa (kg)
- \`a\` = percepatan (m/s²)

**Contoh Soal:** Benda bermassa 4 kg dipercepat 3 m/s². Berapa resultan gaya yang bekerja?

\`\`\`
F = m × a = 4 × 3 = 12 N
\`\`\`

## Hukum III Newton (Hukum Aksi-Reaksi)

> "Untuk setiap aksi, ada reaksi yang sama besar tetapi berlawanan arah."

\`\`\`
F_aksi = -F_reaksi
\`\`\`

**Inti:** Gaya selalu bekerja berpasangan. Aksi dan reaksi memiliki besar sama, arah berlawanan, dan bekerja pada **benda yang berbeda**.

**Contoh:** Saat berjalan, kaki mendorong tanah ke belakang (aksi), tanah mendorong kaki ke depan (reaksi); roket mendorong gas ke belakang, gas mendorong roket ke depan.

## Ringkasan dan Strategi Soal

| Hukum | Kondisi | Rumus |
|---|---|---|
| I | ΣF = 0 (diam/GLB) | — |
| II | ΣF ≠ 0 (ada percepatan) | F = m·a |
| III | Interaksi dua benda | F_aksi = -F_reaksi |

**Langkah penyelesaian soal:**
1. Identifikasi benda yang dianalisis.
2. Gambar diagram benda bebas (free body diagram).
3. Tentukan resultan gaya.
4. Pilih hukum yang sesuai.
5. Selesaikan secara aljabar.

## Aplikasi

- Desain kendaraan dan sistem pengereman.
- Rekayasa struktur dan jembatan.
- Analisis gerak roket dan satelit.
- Olahraga (lompat, lempar, tendang).

## Kesimpulan

Tiga hukum Newton saling melengkapi: Hukum I menjelaskan kelembaman, Hukum II mengaitkan gaya-massa-percepatan secara kuantitatif (\`F = m·a\`), dan Hukum III menjelaskan pasangan gaya aksi-reaksi. Kuasai ketiganya untuk menyelesaikan soal mekanika dengan sistematis.`;

const LESSON_OHM = `# Hukum Ohm

## Pengertian

**Hukum Ohm** menyatakan bahwa **kuat arus listrik** yang mengalir melalui sebuah penghantar **berbanding lurus** dengan **tegangan** antara ujung-ujungnya, dan **berbanding terbalik** dengan **hambatan** penghantar, asalkan suhu konstan.

## Rumus Utama

\`\`\`
V = I × R
I = V / R
R = V / I
\`\`\`

Keterangan:
- \`V\` = tegangan (Volt, V)
- \`I\` = kuat arus (Ampere, A)
- \`R\` = hambatan (Ohm, Ω)

## Anehakan Satuan

Pastikan satuan konsisten sebelum menghitung:
- \`1 kV = 1000 V\`
- \`1 mA = 0,001 A\`
- \`1 kΩ = 1000 Ω\`

## Contoh Soal

### Contoh 1: Mencari Arus
Sebuah hambatan 4 Ω diberi tegangan 12 V. Berapa kuat arus yang mengalir?

\`\`\`
I = V / R = 12 / 4 = 3 A
\`\`\`

### Contoh 2: Mencari Tegangan
Arus 2 A mengalir melalui hambatan 6 Ω. Berapa tegangannya?

\`\`\`
V = I × R = 2 × 6 = 12 V
\`\`\`

### Contoh 3: Mencari Hambatan
Tegangan 9 V menghasilkan arus 3 A pada suatu penghantar. Berapa hambatannya?

\`\`\`
R = V / I = 9 / 3 = 3 Ω
\`\`\`

## Aplikasi Hukum Ohm

- **Rangkaian seri:** \`R_total = R₁ + R₂ + ... + Rₙ\`. Arus sama di semua titik, tegangan terbagi.
- **Rangkaian paralel:** \`1/R_total = 1/R₁ + 1/R₂ + ... + 1/Rₙ\`. Tegangan sama, arus terbagi.
- **Pengukuran:** Voltmeter dipasang paralel (hambatan besar), amperemeter dipasang seri (hambatan kecil).
- **Desain elektronik:** menentukan resistor pembatas arus untuk LED, motor, dll.

## Hubungan dengan Daya Listrik

Daya listrik \`P\` dapat dihitung dengan:

\`\`\`
P = V × I = I² × R = V² / R
\`\`\`

Satuan daya adalah Watt (W).

## Kesimpulan

Hukum Ohm (\`V = I·R\`) adalah pondasi analisis rangkaian listrik arus searah. Pahami konversi satuan, perbedaan rangkaian seri/paralel, dan hubungannya dengan daya untuk menyelesaikan berbagai soal listrik dasar.`;

const LESSON_TENSES = `# Tenses Dasar: Simple Present, Past, dan Future

Tenses adalah bentuk kata kerja yang menunjukkan **waktu** terjadinya suatu peristiwa. Tiga tenses dasar yang paling sering digunakan adalah **Simple Present**, **Simple Past**, dan **Simple Future**.

## 1. Simple Present Tense

**Fungsi:** Menyatakan kebiasaan, fakta, atau kebenaran umum.

**Rumus:**
\`\`\`
(+): S + V1(s/es) + O
(-): S + do/does + not + V1 + O
(?): Do/Does + S + V1 + O?
\`\`\`

**Aturan \`-s/-es\`:** Ditambahkan pada subjek **he/she/it**.

**Contoh:**
- She **goes** to school every day.
- The sun **rises** in the east.
- They **play** football on weekends.

**Kata keterangan waktu:** always, usually, often, sometimes, every day, generally.

## 2. Simple Past Tense

**Fungsi:** Menyatakan peristiwa yang terjadi di masa lampau dan sudah selesai.

**Rumus:**
\`\`\`
(+): S + V2 + O
(-): S + did + not + V1 + O
(?): Did + S + V1 + O?
\`\`\`

**Bentuk kata kerja:**
- **Regular verb:** tambah \`-ed\` (play → played, work → worked).
- **Irregular verb:** bentuk berbeda (go → went, eat → ate, see → saw).

**Contoh:**
- They **played** football yesterday.
- She **went** to Jakarta last week.
- I **did not see** him at the party.

**Kata keterangan waktu:** yesterday, last week, ago, in 1990, this morning.

## 3. Simple Future Tense

**Fungsi:** Menyatakan kejadian yang akan terjadi di masa depan, keputusan spontan, atau janji.

**Rumus:**
\`\`\`
(+): S + will/shall + V1 + O
(-): S + will/shall + not + V1 + O
(?): Will/Shall + S + V1 + O?
\`\`\`

**Contoh:**
- I **will** visit my grandmother tomorrow.
- She **will** finish the report soon.
- They **will not** attend the meeting.

**Kata keterangan waktu:** tomorrow, next week, soon, later, in the future.

## Perbandingan Singkat

| Tense | Waktu | Kata Kerja | Contoh |
|---|---|---|---|
| Simple Present | Sekarang/Kebiasaan | V1 (+s/es) | She **studies** English. |
| Simple Past | Lampau | V2 | She **studied** English. |
| Simple Future | Masa depan | will + V1 | She **will study** English. |

## Tips Belajar

- Hafalkan daftar **irregular verbs** untuk Simple Past.
- Perhatikan **subject-verb agreement** pada Simple Present (he/she/it → +s/es).
- Identifikasi **kata keterangan waktu** (signal words) untuk menentukan tense yang tepat.
- Latih dengan membaca dan menulis kalimat sendiri.

## Kesimpulan

Tiga tenses dasar (Simple Present, Past, Future) adalah fondasi grammar bahasa Inggris. Kuasai rumus, signal words, dan irregular verbs untuk berkomunikasi dengan tepat dalam berbagai konteks waktu.`;

const LESSON_PASSIVE_VOICE = `# Passive Voice

## Pengertian

**Passive voice** (kalimat pasif) adalah struktur kalimat di mana **subjek menerima aksi**, bukan melakukan aksi. Lawannya adalah **active voice** (kalimat aktif), di mana subjek melakukan aksi.

**Active:** The teacher **explains** the lesson. (Subjek = pelaku)
**Passive:** The lesson **is explained** by the teacher. (Subjek = penerima)

## Rumus Umum

\`\`\`
Active:  S + V(active) + O
Passive: O + to be + V3 + by + S
\`\`\`

- \`to be\` disesuaikan dengan tense dan subjek pasif.
- \`V3\` adalah past participle (contoh: written, built, eaten, done).

## Pola Passive Voice per Tense

| Tense | Active | Passive |
|---|---|---|
| Simple Present | writes / write | is/am/are + V3 |
| Simple Past | wrote | was/were + V3 |
| Simple Future | will write | will be + V3 |
| Present Continuous | is writing | is being + V3 |
| Past Continuous | was writing | was being + V3 |
| Present Perfect | has written | has been + V3 |
| Modals (can, must) | can write | can be + V3 |

## Contoh Lengkap

### Simple Present
- Active: She **writes** a letter.
- Passive: A letter **is written** by her.

### Simple Past
- Active: They **built** the house in 1990.
- Passive: The house **was built** in 1990.

### Simple Future
- Active: He **will finish** the project.
- Passive: The project **will be finished** by him.

### Dengan Modal
- Active: You **must complete** the form.
- Passive: The form **must be completed**.

## Kapan Menggunakan Passive Voice?

1. **Pelaku tidak diketahui atau tidak penting:**
   - "The window was broken." (Tidak tahu siapa yang memecahkan.)
2. **Fokus pada objek/penerima aksi:**
   - "The Mona Lisa was painted in 1503." (Fokus pada lukisan, bukan pelukonnya yang sudah jelas.)
3. **Bahasa formal/ilmiah:**
   - "The experiment was conducted in a laboratory."
4. **Untuk membuat kalimat lebih sopan:**
   - "Mistakes were made." (lebih halus daripada "You made mistakes.")

## Catatan Penting

- Hanya kalimat dengan **objek langsung** yang dapat dipasifkan. Verba tak transitif (seperti *sleep*, *arrive*) tidak bisa.
- Frasa \`by + agent\` dapat dihilangkan jika pelaku tidak penting.
- Untuk dua objek (direct & indirect), umumnya **indirect object** menjadi subjek pasif.

## Kesimpulan

Passive voice berguna ketika fokus pada **penerima aksi** atau ketika pelaku tidak penting. Kuasai pola \`to be + V3\` untuk berbagai tense dan latih konversi active → passive secara konsisten untuk memperkuat pemahaman grammar.`;

// ---------- Main seed function ----------

async function main() {
  console.log("🧹 Cleaning database (idempotent)...");

  // Delete children first to respect FK constraints.
  await db.$transaction([
    db.exerciseAttempt.deleteMany(),
    db.mastery.deleteMany(),
    db.progress.deleteMany(),
    db.learningSession.deleteMany(),
    db.question.deleteMany(),
    db.exercise.deleteMany(),
    db.lesson.deleteMany(),
    db.topic.deleteMany(),
    db.subject.deleteMany(),
    db.profile.deleteMany(),
    db.user.deleteMany(),
  ]);
  console.log("   ✓ All tables cleared");

  // ---------- Users ----------
  console.log("👤 Seeding users...");

  const tutor = await db.user.create({
    data: {
      email: "tutor@edutrack.id",
      name: "Budi Santoso",
      role: "TUTOR",
      passwordHash: hashPassword("tutor123"),
    },
  });

  const student1 = await db.user.create({
    data: {
      email: "student@edutrack.id",
      name: "Andi Wijaya",
      role: "STUDENT",
      passwordHash: hashPassword("student123"),
    },
  });

  const student2 = await db.user.create({
    data: {
      email: "siti@edutrack.id",
      name: "Siti Rahma",
      role: "STUDENT",
      passwordHash: hashPassword("student123"),
    },
  });

  console.log("   ✓ Created 1 tutor + 2 students");

  // ---------- Profiles ----------
  console.log("📝 Seeding student profiles...");

  await db.profile.create({
    data: {
      userId: student1.id,
      bio: "Siswa kelas 12 yang sedang mempersiapkan UTBK",
      educationLevel: "SMA",
      targetExam: "UTBK 2025",
      studyGoals: "Masuk FKUI",
    },
  });

  await db.profile.create({
    data: {
      userId: student2.id,
      bio: "Fokus Matematika dan Fisika",
      educationLevel: "SMA",
      targetExam: "SNBT 2025",
      studyGoals: "PTN Favorit",
    },
  });

  console.log("   ✓ Created 2 student profiles");

  // ---------- Subjects ----------
  console.log("📚 Seeding subjects, topics, lessons, exercises, questions...");

  // ===== Subject 1: Matematika =====
  const matematika = await db.subject.create({
    data: {
      title: "Matematika",
      description: "Fundamental matematika untuk persiapan ujian",
      color: "emerald",
      icon: "Calculator",
      tutorId: tutor.id,
    },
  });

  // --- Topic 1.1: Aljabar ---
  const aljabar = await db.topic.create({
    data: {
      title: "Aljabar",
      description: "Konsep aljabar dasar: pertidaksamaan dan sistem persamaan",
      order: 0,
      subjectId: matematika.id,
    },
  });

  // Lesson 1.1.1: Pertidaksamaan Linear
  const lessonPertidaksamaan = await db.lesson.create({
    data: {
      title: "Pertidaksamaan Linear",
      content: LESSON_PERTIDAKSAMAAN_LINEAR,
      summary: "Memahami konsep dan penyelesaian pertidaksamaan linear satu variabel",
      durationMin: 20,
      order: 0,
      topicId: aljabar.id,
    },
  });

  const exPertidaksamaan = await db.exercise.create({
    data: {
      title: "Latihan Pertidaksamaan Linear",
      type: "MCQ",
      lessonId: lessonPertidaksamaan.id,
    },
  });

  await db.question.createMany({
    data: [
      {
        exerciseId: exPertidaksamaan.id,
        text: "Himpunan penyelesaian dari 2x - 6 > 0 adalah...",
        options: JSON.stringify(["{x | x > 3}", "{x | x < 3}", "{x | x ≥ 3}", "{x | x > 6}"]),
        correctAnswer: "{x | x > 3}",
        explanation: "2x > 6 → x > 3",
        points: 1,
        order: 0,
      },
      {
        exerciseId: exPertidaksamaan.id,
        text: "Penyelesaian dari 3x + 5 ≤ 2x + 1 adalah...",
        options: JSON.stringify(["x ≤ -4", "x ≥ -4", "x ≤ 4", "x ≥ 4"]),
        correctAnswer: "x ≤ -4",
        explanation: "3x - 2x ≤ 1 - 5 → x ≤ -4",
        points: 1,
        order: 1,
      },
      {
        exerciseId: exPertidaksamaan.id,
        text: "Nilai x yang memenuhi -2x + 7 < 3 adalah...",
        options: JSON.stringify(["x > 2", "x < 2", "x > -2", "x < -2"]),
        correctAnswer: "x > 2",
        explanation: "-2x < 3-7 → -2x < -4 → x > 2",
        points: 1,
        order: 2,
      },
    ],
  });

  // Lesson 1.1.2: Sistem Persamaan Linear
  const lessonSpldv = await db.lesson.create({
    data: {
      title: "Sistem Persamaan Linear",
      content: LESSON_SPLDV,
      summary: "Menyelesaikan sistem persamaan linear dua variabel",
      durationMin: 25,
      order: 1,
      topicId: aljabar.id,
    },
  });

  const exSpldv = await db.exercise.create({
    data: {
      title: "Latihan SPLDV",
      type: "MCQ",
      lessonId: lessonSpldv.id,
    },
  });

  await db.question.createMany({
    data: [
      {
        exerciseId: exSpldv.id,
        text: "Penyelesaian SPLDV x + y = 5 dan x - y = 1 adalah...",
        options: JSON.stringify(["(3,2)", "(2,3)", "(4,1)", "(1,4)"]),
        correctAnswer: "(3,2)",
        explanation: "Substitusi: x = y + 1 → 2y + 1 = 5 → y = 2, x = 3",
        points: 1,
        order: 0,
      },
      {
        exerciseId: exSpldv.id,
        text: "Diketahui 2x + y = 7 dan x - y = 2. Nilai x = ...",
        options: JSON.stringify(["3", "2", "1", "4"]),
        correctAnswer: "3",
        explanation: "Jumlahkan kedua persamaan: 3x = 9 → x = 3",
        points: 1,
        order: 1,
      },
      {
        exerciseId: exSpldv.id,
        text: "Hasil dari metode eliminasi pada 3x + 2y = 12 dan x + 2y = 8 adalah nilai x = ...",
        options: JSON.stringify(["2", "4", "6", "8"]),
        correctAnswer: "2",
        explanation: "Kurangi: 2x = 4 → x = 2",
        points: 1,
        order: 2,
      },
    ],
  });

  // --- Topic 1.2: Geometri ---
  const geometri = await db.topic.create({
    data: {
      title: "Geometri",
      description: "Pythagoras dan lingkaran",
      order: 1,
      subjectId: matematika.id,
    },
  });

  // Lesson 1.2.1: Teorema Pythagoras
  const lessonPythagoras = await db.lesson.create({
    data: {
      title: "Teorema Pythagoras",
      content: LESSON_PYTHAGORAS,
      summary: "Konsep dasar teorema Pythagoras dan penerapannya",
      durationMin: 15,
      order: 0,
      topicId: geometri.id,
    },
  });

  const exPythagoras = await db.exercise.create({
    data: {
      title: "Latihan Pythagoras",
      type: "MCQ",
      lessonId: lessonPythagoras.id,
    },
  });

  await db.question.createMany({
    data: [
      {
        exerciseId: exPythagoras.id,
        text: "Sisi miring segitiga siku-siku dengan sisi 3 dan 4 adalah...",
        options: JSON.stringify(["5", "6", "7", "√7"]),
        correctAnswer: "5",
        explanation: "c = √(3² + 4²) = √25 = 5",
        points: 1,
        order: 0,
      },
      {
        exerciseId: exPythagoras.id,
        text: "Sebuah tangga 5m bersandar pada dinding, kaki tangga 3m dari dinding. Tinggi tangga di dinding...",
        options: JSON.stringify(["4m", "3m", "5m", "√34m"]),
        correctAnswer: "4m",
        explanation: "tinggi = √(5² - 3²) = √16 = 4m",
        points: 1,
        order: 1,
      },
      {
        exerciseId: exPythagoras.id,
        text: "Manakah yang termasuk tripel Pythagoras?",
        options: JSON.stringify(["(5,12,13)", "(2,3,4)", "(1,2,3)", "(4,5,6)"]),
        correctAnswer: "(5,12,13)",
        explanation: "5² + 12² = 25 + 144 = 169 = 13²",
        points: 1,
        order: 2,
      },
    ],
  });

  // Lesson 1.2.2: Luas dan Keliling Lingkaran
  const lessonLingkaran = await db.lesson.create({
    data: {
      title: "Luas dan Keliling Lingkaran",
      content: LESSON_LINGKARAN,
      summary: "Rumus luas dan keliling lingkaran beserta aplikasinya",
      durationMin: 20,
      order: 1,
      topicId: geometri.id,
    },
  });

  const exLingkaran = await db.exercise.create({
    data: {
      title: "Latihan Lingkaran",
      type: "MCQ",
      lessonId: lessonLingkaran.id,
    },
  });

  await db.question.createMany({
    data: [
      {
        exerciseId: exLingkaran.id,
        text: "Luas lingkaran dengan jari-jari 7 (π=22/7) adalah...",
        options: JSON.stringify(["154", "44", "49", "22"]),
        correctAnswer: "154",
        explanation: "L = πr² = (22/7)(49) = 154",
        points: 1,
        order: 0,
      },
      {
        exerciseId: exLingkaran.id,
        text: "Keliling lingkaran berdiameter 14 (π=22/7) adalah...",
        options: JSON.stringify(["44", "22", "154", "49"]),
        correctAnswer: "44",
        explanation: "K = πd = (22/7)(14) = 44",
        points: 1,
        order: 1,
      },
      {
        exerciseId: exLingkaran.id,
        text: "Jika luas lingkaran 616 (π=22/7), jari-jarinya...",
        options: JSON.stringify(["14", "7", "21", "28"]),
        correctAnswer: "14",
        explanation: "r² = 616×7/22 = 196 → r = 14",
        points: 1,
        order: 2,
      },
    ],
  });

  // ===== Subject 2: Fisika =====
  const fisika = await db.subject.create({
    data: {
      title: "Fisika",
      description: "Konsep fisika dasar SMA",
      color: "orange",
      icon: "Atom",
      tutorId: tutor.id,
    },
  });

  // --- Topic 2.1: Mekanika ---
  const mekanika = await db.topic.create({
    data: {
      title: "Mekanika",
      description: "Kinematika dan dinamika gerak benda",
      order: 0,
      subjectId: fisika.id,
    },
  });

  // Lesson 2.1.1: Gerak Lurus Beraturan
  const lessonGlb = await db.lesson.create({
    data: {
      title: "Gerak Lurus Beraturan",
      content: LESSON_GLB,
      summary: "Memahami gerak lurus beraturan dan rumus kecepatan",
      durationMin: 18,
      order: 0,
      topicId: mekanika.id,
    },
  });

  const exGlb = await db.exercise.create({
    data: {
      title: "Latihan GLB",
      type: "MCQ",
      lessonId: lessonGlb.id,
    },
  });

  await db.question.createMany({
    data: [
      {
        exerciseId: exGlb.id,
        text: "Sebuah mobil menempuh 120 km dalam 2 jam. Kecepatan rata-ratanya...",
        options: JSON.stringify(["60 km/jam", "240 km/jam", "30 km/jam", "120 km/jam"]),
        correctAnswer: "60 km/jam",
        explanation: "v = s/t = 120/2 = 60 km/jam",
        points: 1,
        order: 0,
      },
      {
        exerciseId: exGlb.id,
        text: "GLB terjadi jika...",
        options: JSON.stringify(["Kecepatan konstan", "Percepatan konstan", "Benda diam", "Arah berubah"]),
        correctAnswer: "Kecepatan konstan",
        explanation: "Pada GLB kecepatan konstan dan percepatan = 0",
        points: 1,
        order: 1,
      },
      {
        exerciseId: exGlb.id,
        text: "Jarak tempuh benda dengan v=20 m/s selama 5 detik...",
        options: JSON.stringify(["100 m", "25 m", "4 m", "15 m"]),
        correctAnswer: "100 m",
        explanation: "s = v×t = 20×5 = 100 m",
        points: 1,
        order: 2,
      },
    ],
  });

  // Lesson 2.1.2: Hukum Newton
  const lessonNewton = await db.lesson.create({
    data: {
      title: "Hukum Newton",
      content: LESSON_NEWTON,
      summary: "Tiga hukum Newton tentang gerak dan penerapannya",
      durationMin: 30,
      order: 1,
      topicId: mekanika.id,
    },
  });

  const exNewton = await db.exercise.create({
    data: {
      title: "Latihan Hukum Newton",
      type: "MCQ",
      lessonId: lessonNewton.id,
    },
  });

  await db.question.createMany({
    data: [
      {
        exerciseId: exNewton.id,
        text: "Resultan gaya pada benda bermassa 4 kg yang dipercepat 3 m/s² adalah...",
        options: JSON.stringify(["12 N", "7 N", "1 N", "4 N"]),
        correctAnswer: "12 N",
        explanation: "F = m·a = 4×3 = 12 N",
        points: 1,
        order: 0,
      },
      {
        exerciseId: exNewton.id,
        text: "Hukum II Newton dirumuskan...",
        options: JSON.stringify(["F = m.a", "F = m/v", "F = m.g", "F = p.t"]),
        correctAnswer: "F = m.a",
        explanation: "Hukum II Newton: percepatan berbanding lurus dengan gaya, berbanding terbalik dengan massa",
        points: 1,
        order: 1,
      },
      {
        exerciseId: exNewton.id,
        text: "Sebuah benda didorong tetapi tidak bergerak. Ini adalah penerapan...",
        options: JSON.stringify(["Hukum I Newton", "Hukum II Newton", "Hukum III Newton", "Hukum Gravitasi"]),
        correctAnswer: "Hukum I Newton",
        explanation: "Hukum I Newton (kelembaman): benda cenderung mempertahankan keadaannya",
        points: 1,
        order: 2,
      },
    ],
  });

  // --- Topic 2.2: Listrik ---
  const listrik = await db.topic.create({
    data: {
      title: "Listrik",
      description: "Konsep dasar listrik arus searah",
      order: 1,
      subjectId: fisika.id,
    },
  });

  // Lesson 2.2.1: Hukum Ohm
  const lessonOhm = await db.lesson.create({
    data: {
      title: "Hukum Ohm",
      content: LESSON_OHM,
      summary: "Hubungan tegangan, arus, dan hambatan",
      durationMin: 20,
      order: 0,
      topicId: listrik.id,
    },
  });

  const exOhm = await db.exercise.create({
    data: {
      title: "Latihan Hukum Ohm",
      type: "MCQ",
      lessonId: lessonOhm.id,
    },
  });

  await db.question.createMany({
    data: [
      {
        exerciseId: exOhm.id,
        text: "Tegangan 12 V mengalir melalui hambatan 4 Ω. Arusnya...",
        options: JSON.stringify(["3 A", "48 A", "8 A", "16 A"]),
        correctAnswer: "3 A",
        explanation: "I = V/R = 12/4 = 3 A",
        points: 1,
        order: 0,
      },
      {
        exerciseId: exOhm.id,
        text: "Hukum Ohm dirumuskan...",
        options: JSON.stringify(["V = I.R", "V = I/R", "V = R/I", "I = V.R"]),
        correctAnswer: "V = I.R",
        explanation: "Tegangan = arus × hambatan",
        points: 1,
        order: 1,
      },
      {
        exerciseId: exOhm.id,
        text: "Arus 2 A mengalir pada hambatan 6 Ω. Tegangannya...",
        options: JSON.stringify(["12 V", "3 V", "8 V", "4 V"]),
        correctAnswer: "12 V",
        explanation: "V = I·R = 2×6 = 12 V",
        points: 1,
        order: 2,
      },
    ],
  });

  // ===== Subject 3: Bahasa Inggris =====
  const bahasaInggris = await db.subject.create({
    data: {
      title: "Bahasa Inggris",
      description: "Penguatan bahasa Inggris akademik",
      color: "rose",
      icon: "Languages",
      tutorId: tutor.id,
    },
  });

  // --- Topic 3.1: Grammar ---
  const grammar = await db.topic.create({
    data: {
      title: "Grammar",
      description: "Tenses dasar dan passive voice",
      order: 0,
      subjectId: bahasaInggris.id,
    },
  });

  // Lesson 3.1.1: Tenses Dasar
  const lessonTenses = await db.lesson.create({
    data: {
      title: "Tenses Dasar",
      content: LESSON_TENSES,
      summary: "Penggunaan simple present, past, dan future tense",
      durationMin: 25,
      order: 0,
      topicId: grammar.id,
    },
  });

  const exTenses = await db.exercise.create({
    data: {
      title: "Latihan Tenses",
      type: "MCQ",
      lessonId: lessonTenses.id,
    },
  });

  await db.question.createMany({
    data: [
      {
        exerciseId: exTenses.id,
        text: "She ___ to school every day.",
        options: JSON.stringify(["goes", "go", "going", "went"]),
        correctAnswer: "goes",
        explanation: "Simple present: subjek 'she' (third person singular) → V1 + s/es",
        points: 1,
        order: 0,
      },
      {
        exerciseId: exTenses.id,
        text: "They ___ football yesterday.",
        options: JSON.stringify(["played", "play", "plays", "playing"]),
        correctAnswer: "played",
        explanation: "Simple past: 'yesterday' → V2 (regular: play → played)",
        points: 1,
        order: 1,
      },
      {
        exerciseId: exTenses.id,
        text: "I ___ visit my grandmother tomorrow.",
        options: JSON.stringify(["will", "was", "have", "did"]),
        correctAnswer: "will",
        explanation: "Simple future: 'tomorrow' → will + V1",
        points: 1,
        order: 2,
      },
    ],
  });

  // Lesson 3.1.2: Passive Voice
  const lessonPassive = await db.lesson.create({
    data: {
      title: "Passive Voice",
      content: LESSON_PASSIVE_VOICE,
      summary: "Struktur dan penggunaan passive voice",
      durationMin: 20,
      order: 1,
      topicId: grammar.id,
    },
  });

  const exPassive = await db.exercise.create({
    data: {
      title: "Latihan Passive Voice",
      type: "MCQ",
      lessonId: lessonPassive.id,
    },
  });

  await db.question.createMany({
    data: [
      {
        exerciseId: exPassive.id,
        text: "Active: 'She writes a letter.' Passive: ___",
        options: JSON.stringify([
          "A letter is written by her",
          "A letter writes by her",
          "A letter was writing by her",
          "A letter is writing by her",
        ]),
        correctAnswer: "A letter is written by her",
        explanation: "Simple present passive: S + is/am/are + V3 → 'is written by her'",
        points: 1,
        order: 0,
      },
      {
        exerciseId: exPassive.id,
        text: "Passive of 'They built the house in 1990' is...",
        options: JSON.stringify([
          "The house was built in 1990",
          "The house is built in 1990",
          "The house built in 1990",
          "The house has built in 1990",
        ]),
        correctAnswer: "The house was built in 1990",
        explanation: "Simple past passive: was/were + V3 → 'was built'",
        points: 1,
        order: 1,
      },
    ],
  });

  console.log("   ✓ Created 3 subjects, 5 topics, 9 lessons, 9 exercises, 26 questions");
  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
