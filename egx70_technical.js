const YahooFinance = require("yahoo-finance2").default;
const ExcelJS = require("exceljs");
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
  let avgGain = gains / period;
  let avgLoss = losses / period;
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

function r3(val) {
  if (val === null || val === undefined || isNaN(val)) return null;
  return Math.round(val * 1000) / 1000;
}

async function fetchStock(ticker) {
  try {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    const result = await yahooFinance.chart(ticker, { period1: start, period2: end, interval: "1d" });
    if (!result || !result.quotes || result.quotes.length === 0) return null;
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
  } catch (err) {
    console.error(`  [SKIP] ${ticker}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("=== EGX 70 Technical Data ===\n");
  const results = [];
  const batchSize = 5;
  for (let i = 0; i < EGX70_TICKERS.length; i += batchSize) {
    const batch = EGX70_TICKERS.slice(i, i + batchSize);
    console.log(`Batch ${Math.floor(i/batchSize)+1}/${Math.ceil(EGX70_TICKERS.length/batchSize)}: ${batch.map(t=>t.replace(".CA","")).join(", ")}`);
    const batchResults = await Promise.all(batch.map(t => fetchStock(t)));
    for (const r of batchResults) if (r) results.push(r);
    if (i + batchSize < EGX70_TICKERS.length) await new Promise(res => setTimeout(res, 500));
  }
  console.log(`\nFetched ${results.length} / ${EGX70_TICKERS.length} stocks\n`);

  // Build Excel
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("EGX70 Technical Data", { views: [{ state: "frozen", ySplit: 1 }] });

  // Columns matching the picture: No, Stock, RSI, MACD, MA20, MA50
  ws.columns = [
    { header: "No",    key: "no",    width: 6  },
    { header: "Stock", key: "stock", width: 12 },
    { header: "RSI",   key: "rsi",   width: 12 },
    { header: "MACD",  key: "macd",  width: 12 },
    { header: "MA20",  key: "ma20",  width: 12 },
    { header: "MA50",  key: "ma50",  width: 12 },
  ];

  // Header style — bold, centered
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, size: 12 };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.border = {
      top:    { style: "thin" },
      bottom: { style: "thin" },
      left:   { style: "thin" },
      right:  { style: "thin" },
    };
  });

  // Data rows
  results.forEach((s, idx) => {
    const row = ws.addRow({
      no: idx + 1,
      stock: s.ticker,
      rsi: s.rsi,
      macd: s.macd,
      ma20: s.ma20,
      ma50: s.ma50,
    });
    row.alignment = { horizontal: "center", vertical: "middle" };
    row.eachCell(cell => {
      cell.border = {
        top:    { style: "thin" },
        bottom: { style: "thin" },
        left:   { style: "thin" },
        right:  { style: "thin" },
      };
    });
  });

  const filePath = "C:/Users/pc/EGX70_Technical_Data.xlsx";
  await wb.xlsx.writeFile(filePath);
  console.log(`Excel saved: ${filePath}`);
}

main().catch(console.error);
