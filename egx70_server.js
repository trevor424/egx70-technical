const YahooFinance = require("yahoo-finance2").default;
const http = require("http");
const yahooFinance = new YahooFinance();

const EGX70_TICKERS = [
  "POUL.CA","PRCL.CA","ASPI.CA","MCRO.CA","ASCM.CA","PHAR.CA","EGTS.CA",
  "EHDR.CA","MTIE.CA","ATQA.CA","BIOC.CA","NIPH.CA","OBRI.CA","AIHC.CA",
  "AFMC.CA","AMER.CA","AMIA.CA","OCDI.CA","ALCN.CA","HDBK.CA","SWDY.CA",
  "ICFC.CA","SVCE.CA","KRDI.CA","AIDC.CA","IFAP.CA","ISMA.CA","IDRE.CA",
  "IEEC.CA","TANM.CA","ELSH.CA","SDTI.CA","SCEM.CA","ENGC.CA","MEPA.CA",
  "FAITA.CA","EXPA.CA","SKPC.CA","TALM.CA","ACTF.CA","MFPC.CA","AFDI.CA",
  "ISMQ.CA","LCSW.CA","KABO.CA","VALU.CA","MOED.CA","MASR.CA","CNFN.CA",
  "ECAP.CA","NCCW.CA","MPRC.CA","OFH.CA","MPCI.CA","MPCO.CA","SIPC.CA",
  "COSG.CA","COMI.CA","TAQA.CA","UEGC.CA","CIEB.CA","UNIP.CA","ARAB.CA",
  "ZEOT.CA","DAPH.CA","ZMID.CA","CSAG.CA","DSCW.CA","RACC.CA","ATLC.CA"
];

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calcSMA(data, period) {
  if (data.length < period) return null;
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calcMACD(closes) {
  if (closes.length < 26) return null;
  let ema12 = closes.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  let ema26 = closes.slice(0, 26).reduce((a, b) => a + b, 0) / 26;
  const k12 = 2 / 13, k26 = 2 / 27;
  for (let i = 12; i < 26; i++) ema12 = closes[i] * k12 + ema12 * (1 - k12);
  const macdLine = [ema12 - ema26];
  for (let i = 26; i < closes.length; i++) {
    ema12 = closes[i] * k12 + ema12 * (1 - k12);
    ema26 = closes[i] * k26 + ema26 * (1 - k26);
    macdLine.push(ema12 - ema26);
  }
  return macdLine[macdLine.length - 1];
}

function r3(v) { return v == null || isNaN(v) ? null : Math.round(v * 1000) / 1000; }

async function fetchStock(ticker) {
  try {
    const end = new Date(), start = new Date();
    start.setMonth(start.getMonth() - 6);
    const result = await yahooFinance.chart(ticker, { period1: start, period2: end, interval: "1d" });
    if (!result?.quotes?.length) return null;
    const quotes = result.quotes.filter(q => q.close != null);
    if (quotes.length < 50) return null;
    const closes = quotes.map(q => q.close);
    return {
      ticker: ticker.replace(".CA", ""),
      rsi: r3(calcRSI(closes)),
      macd: r3(calcMACD(closes)),
      ma20: r3(calcSMA(closes, 20)),
      ma50: r3(calcSMA(closes, 50)),
    };
  } catch { return null; }
}

async function fetchAll() {
  const results = [];
  const batchSize = 5;
  for (let i = 0; i < EGX70_TICKERS.length; i += batchSize) {
    const batch = EGX70_TICKERS.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(t => fetchStock(t)));
    for (const r of batchResults) if (r) results.push(r);
    if (i + batchSize < EGX70_TICKERS.length) await new Promise(res => setTimeout(res, 300));
  }
  return results;
}

// Cache
let cachedData = [];
let lastUpdate = null;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function getData() {
  const now = Date.now();
  if (!lastUpdate || now - lastUpdate > REFRESH_INTERVAL) {
    console.log(`[${new Date().toLocaleTimeString()}] Refreshing data...`);
    cachedData = await fetchAll();
    lastUpdate = now;
    console.log(`[${new Date().toLocaleTimeString()}] Done - ${cachedData.length} stocks loaded`);
  }
  return cachedData;
}

// HTML table that Excel "From Web" can read
function buildHTML(data) {
  const time = new Date().toLocaleString();
  let html = `<html><head><meta charset="utf-8"><meta http-equiv="refresh" content="300">
<style>
  body { font-family: Arial; margin: 20px; }
  h2 { color: #1F4E79; }
  table { border-collapse: collapse; width: auto; }
  th { background: #1F4E79; color: white; padding: 8px 16px; text-align: center; }
  td { border: 1px solid #ccc; padding: 6px 14px; text-align: center; }
  tr:nth-child(even) { background: #f2f6fa; }
  .ts { color: #888; font-size: 12px; margin-top: 10px; }
</style></head><body>
<h2>EGX 70 - Live Technical Data</h2>
<table><tr><th>No</th><th>Stock</th><th>RSI</th><th>MACD</th><th>MA20</th><th>MA50</th></tr>`;
  data.forEach((s, i) => {
    html += `<tr><td>${i+1}</td><td><b>${s.ticker}</b></td><td>${s.rsi ?? "N/A"}</td><td>${s.macd ?? "N/A"}</td><td>${s.ma20 ?? "N/A"}</td><td>${s.ma50 ?? "N/A"}</td></tr>`;
  });
  html += `</table><p class="ts">Last updated: ${time} | Auto-refreshes every 5 minutes</p></body></html>`;
  return html;
}

// Start server
const PORT = 3000;
const server = http.createServer(async (req, res) => {
  const data = await getData();
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(buildHTML(data));
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  EGX70 Live Server running on:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`\nTo connect Excel:`);
  console.log(`  1. Open Excel > Data tab > From Web`);
  console.log(`  2. Enter URL: http://localhost:${PORT}`);
  console.log(`  3. Right-click the query > Properties`);
  console.log(`  4. Set "Refresh every X minutes"\n`);
  console.log(`Data refreshes every 5 minutes automatically.`);
  console.log(`Keep this terminal open for live data.\n`);
});
