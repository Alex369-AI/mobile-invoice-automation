Prototype — Mobile Invoice Automation (PoC)

Quickstart (local test):

1) From workspace root:
   cd jarvis/projects/mobile-invoice-automation/prototype
   npm install
   npm start

2) Open on mobile or desktop: http://localhost:3000

What this includes:
- Mobile-friendly single-page UI to create an invoice, add items, and generate a PDF
- Simple Express backend that generates PDF files (stored in public/generated/) and returns a download link
- Simulated payment endpoint at POST /api/payment/simulate which returns a paid status (no Stripe calls)

Notes / next steps:
- This is a PoC for the Wealth Factory flow: Product → Offer/Distribution → Payment (simulation)
- To integrate with OFFER & DISTRIBUTION, copy the generated PDF link into the offer package and mark payment as simulation
- For E2E tests from CI or device, consider ngrok or localtunnel to expose the server to the phone

Owner: Alex
