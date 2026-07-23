// Plesk (Passenger) için Next.js başlangıç dosyası.
// Passenger bu dosyayı çalıştırır; Next tüm istekleri (sayfalar, /api, public, statik) karşılar.
const { createServer } = require("http");
const next = require("next");

const port = process.env.PORT || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log("Next.js hazır — port " + port);
  });
});
