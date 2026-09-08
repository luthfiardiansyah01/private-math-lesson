// Seed gamification content: achievements, bosses, puzzles.
// Run with: bun prisma/seed-games.ts
import { PrismaClient } from "@prisma/client";
import { ACHIEVEMENT_DEFS } from "../src/lib/game-engine";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding gamification content...");

  // 1. Achievements
  console.log("  → Achievements...");
  for (const def of ACHIEVEMENT_DEFS) {
    await db.achievement.upsert({
      where: { code: def.code },
      update: {
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        threshold: def.threshold,
        xpReward: def.xpReward,
      },
      create: {
        code: def.code,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        threshold: def.threshold,
        xpReward: def.xpReward,
      },
    });
  }
  console.log(`    ✓ ${ACHIEVEMENT_DEFS.length} achievements`);

  // 2. Bosses
  console.log("  → Bosses...");
  await db.boss.deleteMany({});
  const bosses = [
    {
      name: "Naga Aljabar",
      description: "Naga purba yang menjaga rahasia aljabar. Kalahkan dengan menyelesaikan soal-soal aljabar!",
      hp: 100,
      attack: 15,
      icon: "Dragon",
      color: "rose",
      difficulty: "NORMAL",
      rewardXP: 200,
      questions: JSON.stringify([
        { text: "Himpunan penyelesaian 2x - 6 > 0 adalah...", options: ["{x | x > 3}", "{x | x < 3}", "{x | x ≥ 3}", "{x | x > 6}"], correctAnswer: "{x | x > 3}", explanation: "2x > 6 → x > 3" },
        { text: "Penyelesaian 3x + 5 ≤ 2x + 1 adalah...", options: ["x ≤ -4", "x ≥ -4", "x ≤ 4", "x ≥ 4"], correctAnswer: "x ≤ -4", explanation: "3x - 2x ≤ 1 - 5 → x ≤ -4" },
        { text: "Hasil dari 2x + y = 7 dan x - y = 2 adalah x = ?", options: ["3", "2", "1", "4"], correctAnswer: "3", explanation: "Substitusi: 2x + y = 7, x - y = 2 → jumlahkan: 3x = 9 → x = 3" },
        { text: "Sederhanakan 3(x + 2) - 2(x - 1)", options: ["x + 8", "x + 4", "5x + 4", "x + 6"], correctAnswer: "x + 8", explanation: "3x + 6 - 2x + 2 = x + 8" },
        { text: "Faktorkan x² - 9", options: ["(x-3)(x+3)", "(x-9)(x+1)", "(x-3)²", "(x+3)²"], correctAnswer: "(x-3)(x+3)", explanation: "Selisih kuadrat: a² - b² = (a-b)(a+b)" },
        { text: "Nilai x pada 5x = 2x + 12", options: ["4", "3", "6", "2"], correctAnswer: "4", explanation: "3x = 12 → x = 4" },
        { text: "Hasil (x+2)(x-3) adalah...", options: ["x² - x - 6", "x² + x - 6", "x² - 5x - 6", "x² + x + 6"], correctAnswer: "x² - x - 6", explanation: "x² - 3x + 2x - 6 = x² - x - 6" },
        { text: "Akar-akar persamaan x² - 5x + 6 = 0 adalah...", options: ["2 dan 3", "1 dan 6", "-2 dan -3", "6 dan -1"], correctAnswer: "2 dan 3", explanation: "(x-2)(x-3) = 0 → x = 2 atau x = 3" },
      ]),
    },
    {
      name: "Raksasa Geometri",
      description: "Raksasa dari dunia bentuk dan ruang. Buktikan penguasaanmu atas geometri!",
      hp: 120,
      attack: 18,
      icon: "Mountain",
      color: "orange",
      difficulty: "HARD",
      rewardXP: 300,
      questions: JSON.stringify([
        { text: "Sisi miring segitiga siku-siku dengan sisi 3 dan 4 adalah...", options: ["5", "6", "7", "√7"], correctAnswer: "5", explanation: "3² + 4² = 9 + 16 = 25 = 5²" },
        { text: "Luas lingkaran jari-jari 7 (π=22/7) adalah...", options: ["154", "44", "49", "22"], correctAnswer: "154", explanation: "πr² = 22/7 × 49 = 154" },
        { text: "Keliling lingkaran diameter 14 (π=22/7) adalah...", options: ["44", "22", "154", "49"], correctAnswer: "44", explanation: "πd = 22/7 × 14 = 44" },
        { text: "Jumlah sudut segitiga adalah...", options: ["180°", "360°", "90°", "270°"], correctAnswer: "180°", explanation: "Sudut dalam segitiga selalu 180°" },
        { text: "Luas persegi panjang 8 × 5 adalah...", options: ["40", "13", "30", "45"], correctAnswer: "40", explanation: "panjang × lebar = 8 × 5 = 40" },
        { text: "Volume kubus sisi 4 adalah...", options: ["64", "16", "48", "12"], correctAnswer: "64", explanation: "s³ = 4³ = 64" },
        { text: "Manakah yang termasuk tripel Pythagoras?", options: ["(5,12,13)", "(2,3,4)", "(1,2,3)", "(4,5,6)"], correctAnswer: "(5,12,13)", explanation: "5² + 12² = 25 + 144 = 169 = 13²" },
        { text: "Sudut lurus sama dengan...", options: ["180°", "90°", "360°", "45°"], correctAnswer: "180°", explanation: "Sudut lurus = 180°" },
      ]),
    },
    {
      name: "Hantu Aritmatika",
      description: "Hantu lincah yang menguji kecepatan berhitungmu. Cocok untuk pemula!",
      hp: 80,
      attack: 10,
      icon: "Ghost",
      color: "violet",
      difficulty: "EASY",
      rewardXP: 150,
      questions: JSON.stringify([
        { text: "Berapa hasil 15 + 28?", options: ["43", "33", "53", "41"], correctAnswer: "43", explanation: "15 + 28 = 43" },
        { text: "Berapa hasil 100 - 37?", options: ["63", "73", "67", "53"], correctAnswer: "63", explanation: "100 - 37 = 63" },
        { text: "Berapa hasil 7 × 8?", options: ["56", "54", "64", "48"], correctAnswer: "56", explanation: "7 × 8 = 56" },
        { text: "Berapa hasil 144 ÷ 12?", options: ["12", "14", "11", "13"], correctAnswer: "12", explanation: "144 ÷ 12 = 12" },
        { text: "Berapa hasil 25 × 4?", options: ["100", "90", "80", "110"], correctAnswer: "100", explanation: "25 × 4 = 100" },
        { text: "Berapa hasil 81 - 46?", options: ["35", "45", "55", "25"], correctAnswer: "35", explanation: "81 - 46 = 35" },
      ]),
    },
  ];
  for (const b of bosses) {
    await db.boss.create({ data: b });
  }
  console.log(`    ✓ ${bosses.length} bosses`);

  // 3. Puzzles
  console.log("  → Puzzles...");
  await db.puzzle.deleteMany({});
  const puzzles = [
    // SEQUENCE
    { type: "SEQUENCE", question: "Temukan angka berikutnya: 2, 4, 8, 16, ?", options: ["24", "32", "20", "18"], answer: "32", explanation: "Pola: dikali 2 setiap langkah (2^n).", difficulty: "EASY", xpReward: 50 },
    { type: "SEQUENCE", question: "Temukan angka berikutnya: 1, 1, 2, 3, 5, 8, ?", options: ["11", "13", "12", "10"], answer: "13", explanation: "Deret Fibonacci: jumlah dua suku sebelumnya.", difficulty: "MEDIUM", xpReward: 75 },
    { type: "SEQUENCE", question: "Temukan angka berikutnya: 3, 6, 12, 24, ?", options: ["36", "48", "30", "42"], answer: "48", explanation: "Pola: dikali 2 setiap langkah.", difficulty: "EASY", xpReward: 50 },
    { type: "SEQUENCE", question: "Temukan angka berikutnya: 100, 50, 25, ?", options: ["12.5", "15", "20", "10"], answer: "12.5", explanation: "Pola: dibagi 2 setiap langkah.", difficulty: "MEDIUM", xpReward: 75 },
    { type: "SEQUENCE", question: "Temukan angka berikutnya: 2, 6, 12, 20, 30, ?", options: ["40", "42", "36", "44"], answer: "42", explanation: "Pola: n(n+1) → 1×2, 2×3, 3×4, 4×5, 5×6, 6×7=42.", difficulty: "HARD", xpReward: 100 },
    { type: "SEQUENCE", question: "Temukan angka berikutnya: 1, 4, 9, 16, 25, ?", options: ["36", "30", "49", "32"], answer: "36", explanation: "Pola: kuadrat sempurna 1², 2², 3², 4², 5², 6²=36.", difficulty: "MEDIUM", xpReward: 75 },
    // BALANCE
    { type: "BALANCE", question: "Jika 3 apel + 2 apel = 10, maka 1 apel = ?", options: ["2", "5", "3", "4"], answer: "2", explanation: "5 apel = 10, jadi 1 apel = 2.", difficulty: "EASY", xpReward: 50 },
    { type: "BALANCE", question: "Jika x + y = 10 dan x - y = 4, maka x = ?", options: ["7", "6", "8", "5"], answer: "7", explanation: "Jumlahkan: 2x = 14 → x = 7, y = 3.", difficulty: "MEDIUM", xpReward: 75 },
    { type: "BALANCE", question: "Jika 2x = 3y dan x = 9, maka y = ?", options: ["6", "4", "3", "12"], answer: "6", explanation: "2(9) = 3y → 18 = 3y → y = 6.", difficulty: "EASY", xpReward: 50 },
    // MISSING_OPERATOR
    { type: "MISSING_OPERATOR", question: "Isi operator: 8 ? 2 ? 3 = 14", options: ["+ , +", "× , −", "+ , ×", "× , +"], answer: "+ , ×", explanation: "8 + 2 × 3 = 8 + 6 = 14 (kali didahului).", difficulty: "HARD", xpReward: 100 },
    { type: "MISSING_OPERATOR", question: "Isi operator: 12 ? 4 ? 2 = 10", options: ["÷ , +", "+ , −", "× , −", "− , +"], answer: "÷ , +", explanation: "12 ÷ 4 + 2 = 3 + 2... bukan. Coba: 12 − 4 + 2 = 10. Jawaban: − , +", difficulty: "MEDIUM", xpReward: 75 },
    // PATTERN
    { type: "PATTERN", question: "Bilangan mana yang tidak termasuk: 2, 3, 5, 7, 9, 11, 13", options: ["9", "3", "5", "11"], answer: "9", explanation: "Sisanya bilangan prima; 9 = 3×3 bukan prima.", difficulty: "MEDIUM", xpReward: 75 },
    { type: "PATTERN", question: "Bilangan mana yang tidak termasuk: 4, 9, 16, 22, 25, 36", options: ["22", "9", "16", "25"], answer: "22", explanation: "Sisanya kuadrat sempurna (2²,3²,4²,5²,6²); 22 bukan.", difficulty: "MEDIUM", xpReward: 75 },
    // WORD_PROBLEM
    { type: "WORD_PROBLEM", question: "Andi punya 12 kelereng. Ia memberi 1/3 ke Budi. Berapa sisanya?", options: ["8", "4", "9", "6"], answer: "8", explanation: "1/3 × 12 = 4 diberikan. Sisa 12 - 4 = 8.", difficulty: "EASY", xpReward: 50 },
    { type: "WORD_PROBLEM", question: "Sebuah bus berangkat jam 07:30 dan tiba jam 10:15. Berapa lama perjalanan?", options: ["2 jam 45 menit", "3 jam 15 menit", "2 jam 15 menit", "3 jam 45 menit"], answer: "2 jam 45 menit", explanation: "10:15 - 07:30 = 2 jam 45 menit.", difficulty: "MEDIUM", xpReward: 75 },
    { type: "WORD_PROBLEM", question: "Harga 3 buku Rp 45.000. Berapa harga 5 buku?", options: ["Rp 75.000", "Rp 60.000", "Rp 90.000", "Rp 50.000"], answer: "Rp 75.000", explanation: "1 buku = 45.000/3 = 15.000. 5 buku = 75.000.", difficulty: "MEDIUM", xpReward: 75 },
  ];
  for (const p of puzzles) {
    await db.puzzle.create({
      data: { ...p, options: p.options ? JSON.stringify(p.options) : null },
    });
  }
  console.log(`    ✓ ${puzzles.length} puzzles`);

  console.log("✅ Gamification seed complete!");
  const counts = {
    achievements: await db.achievement.count(),
    bosses: await db.boss.count(),
    puzzles: await db.puzzle.count(),
  };
  console.log("   ", JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
