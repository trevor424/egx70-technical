const YahooFinance = require("yahoo-finance2").default;
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
    if (i + batchSize < EGX70_TICKERS.length) await new Promise(res => setTimeout(res, 200));
  }
  return results;
}

function buildHTML(data) {
  const time = new Date().toLocaleString("en-EG", { timeZone: "Africa/Cairo" });
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="300">
<title>EGX 70 Live Technical Data</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; padding: 20px; }
  .container { max-width: 900px; margin: 0 auto; }
  h1 { color: #1F4E79; text-align: center; margin-bottom: 5px; font-size: 24px; }
  .sub { text-align: center; color: #666; margin-bottom: 20px; font-size: 13px; }
  .live { display: inline-block; width: 8px; height: 8px; background: #00c853; border-radius: 50%; margin-right: 5px; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
  th { background: #1F4E79; color: white; padding: 10px 14px; text-align: center; font-size: 13px; }
  td { border-bottom: 1px solid #eee; padding: 8px 14px; text-align: center; font-size: 13px; }
  tr:hover { background: #f5f8fc; }
  .rsi-high { color: #d32f2f; font-weight: bold; }
  .rsi-low { color: #2e7d32; font-weight: bold; }
  .macd-pos { color: #2e7d32; }
  .macd-neg { color: #d32f2f; }
  .footer { text-align: center; color: #999; font-size: 11px; margin-top: 15px; }
</style></head><body>
<div class="container">
<h1>EGX 70 — Live Technical Data</h1>
<p class="sub"><span class="live"></span>Auto-refreshes every 5 min | Last update: ${time} (Cairo)</p>
<table><tr><th>No</th><th>Stock</th><th>RSI</th><th>MACD</th><th>MA20</th><th>MA50</th></tr>`;
  data.forEach((s, i) => {
    const rsiClass = s.rsi > 70 ? 'rsi-high' : s.rsi < 30 ? 'rsi-low' : '';
    const macdClass = s.macd > 0 ? 'macd-pos' : s.macd < 0 ? 'macd-neg' : '';
    html += `<tr>
      <td>${i+1}</td>
      <td><b>${s.ticker}</b></td>
      <td class="${rsiClass}">${s.rsi ?? "N/A"}</td>
      <td class="${macdClass}">${s.macd ?? "N/A"}</td>
      <td>${s.ma20 ?? "N/A"}</td>
      <td>${s.ma50 ?? "N/A"}</td>
    </tr>`;
  });
  html += `</table>
<p class="footer">Data source: Yahoo Finance | EGX 70 EWI Index Constituents</p>
</div></body></html>`;
  return html;
}

module.exports = async function handler(req, res) {
  try {
    const data = await fetchAll();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    res.status(200).send(buildHTML(data));
  } catch (err) {
    res.status(500).send("Error fetching data: " + err.message);
  }
};
