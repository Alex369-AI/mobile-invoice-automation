const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// --- Persistence (SQLite) ----------------------------------------------------
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'invoices.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    company_name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    items_json TEXT NOT NULL,
    total REAL NOT NULL,
    pdf_path TEXT NOT NULL,
    pdf_url TEXT NOT NULL
  );
`);

// Ensure offer.html is served even if static lookup fails (explicit route)
app.get('/offer.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'offer.html'));
});

// List last invoices (mobile-friendly)
app.get('/api/invoices', (req, res) => {
  const rows = db.prepare('SELECT id, created_at, company_name, client_name, total, pdf_url FROM invoices ORDER BY created_at DESC LIMIT 20').all();
  res.json({ ok: true, invoices: rows });
});

function safeNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

// Generate invoice PDF and return download URL + persist record
app.post('/api/generate', (req, res) => {
  const data = req.body || {};
  const companyName = String(data.companyName || '').trim();
  const clientName = String(data.clientName || '').trim();
  const items = Array.isArray(data.items) ? data.items : [];

  if (!companyName || !clientName || items.length === 0) {
    return res.status(400).json({ ok: false, error: 'companyName, clientName, items required' });
  }

  const normalized = items
    .map(it => ({
      description: String(it.description || '').trim(),
      qty: safeNumber(it.qty, 0),
      price: safeNumber(it.price, 0)
    }))
    .filter(it => it.description && it.qty > 0 && it.price >= 0);

  if (normalized.length === 0) {
    return res.status(400).json({ ok: false, error: 'at least one valid item required' });
  }

  const total = normalized.reduce((s, it) => s + (it.qty * it.price), 0);

  const id = String(Date.now());
  const createdAt = new Date().toISOString();
  const outDir = path.join(__dirname, 'public', 'generated');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filename = `invoice-${id}.pdf`;
  const filepath = path.join(outDir, filename);
  const pdfUrl = `/generated/${filename}`;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  // Simple but cleaner invoice layout
  doc.fontSize(22).text('Invoice', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(12).text(`From: ${companyName}`);
  doc.text(`To: ${clientName}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown(1);

  doc.fontSize(12).text('Items:');
  doc.moveDown(0.5);
  normalized.forEach((it, i) => {
    const lineTotal = (it.qty * it.price).toFixed(2);
    doc.text(`${i + 1}. ${it.description} — ${it.qty} x ${it.price} = ${lineTotal}`);
  });
  doc.moveDown(1);
  doc.fontSize(14).text(`Total: ${total.toFixed(2)}`, { align: 'right' });

  doc.end();

  stream.on('finish', () => {
    db.prepare('INSERT INTO invoices (id, created_at, company_name, client_name, items_json, total, pdf_path, pdf_url) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, createdAt, companyName, clientName, JSON.stringify(normalized), total, filepath, pdfUrl);

    res.json({ ok: true, id, url: pdfUrl, total });
  });

  stream.on('error', (err) => res.status(500).json({ ok: false, error: err.message }));
});

// Simulated PAYMENT endpoint (stub)
app.post('/api/payment/simulate', (req, res) => {
  res.json({ ok: true, status: 'paid', provider: 'simulation', ref: `sim-${Date.now()}` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Prototype server running on http://localhost:${PORT}`));
