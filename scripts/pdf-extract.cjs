// Dijalankan sebagai child process — bebas dari webpack Next.js
// Usage: node scripts/pdf-extract.cjs <filepath>
// Output: JSON ke stdout

const fs = require("fs");
const path = require("path");

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    process.stdout.write(JSON.stringify({ error: "No file path provided" }));
    process.exit(1);
  }

  try {
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ url: filePath });
    const result = await parser.getText();
    const text = result.text ?? "";
    process.stdout.write(JSON.stringify({ text, pages: result.pages?.length ?? 0 }));
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: e.message || String(e) }));
    process.exit(1);
  }
}

main();
