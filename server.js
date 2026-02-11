const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Simple endpoint: generate invoice PDF and return download URL
app.post('/api/generate', (req, res) => {
  const data = req.body || {};
  const id = Date.now();
  const outDir = path.join(__dirname, 'public', 'generated');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filename = `invoice-${id}.pdf`;
  const filepath = path.join(outDir, filename);

  const doc = new PDFDocument({ size: 'A4' });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  // Minimal invoice layout
  doc.fontSize(20).text('Invoice', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`From: ${data.companyName || 'My Company'}`);
  doc.text(`To: ${data.clientName || 'Client'}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();
  doc.text('Items:');
  (data.items || []).forEach((it, i) => {
    doc.text(`${i+1}. ${it.description} — ${it.qty} x ${it.price} = ${it.qty * it.price}`);
  });
  doc.moveDown();
  doc.text(`Total: ${ (data.items||[]).reduce((s,it)=> s + (it.qty*it.price), 0) }`);

  doc.end();
  stream.on('finish', () => {
    res.json({ ok: true, url: `/generated/${filename}` });
  });
  stream.on('error', (err) => { res.status(500).json({ ok: false, error: err.message }); });
});

// Simulated PAYMENT endpoint (stub)
app.post('/api/payment/simulate', (req, res) => {
  // Do not call Stripe. Just return simulated paid status.
  res.json({ ok: true, status: 'paid', provider: 'simulation', ref: `sim-${Date.now()}` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Prototype server running on http://localhost:${PORT}`));
