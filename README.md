# EGX 70 Technical Analysis

Live technical data for all **EGX 70** (Egyptian Exchange) stocks — RSI, MACD, MA20, MA50.

## Features

- Fetches real-time data from Yahoo Finance for all 70 EGX 70 EWI index constituents
- Calculates **RSI (14)**, **MACD (12,26,9)**, **MA20**, **MA50**
- **Excel export** — generates a clean `.xlsx` file
- **Live server** — runs a local web server with auto-refreshing data every 5 minutes
- Connect Excel via **Data > From Web** for a live-updating spreadsheet

## Quick Start

```bash
# Clone the repo
git clone https://github.com/trevor424/egx70-technical.git
cd egx70-technical

# Install dependencies
npm install

# Option 1: Export to Excel file
npm run export
# Creates EGX70_Technical_Data.xlsx

# Option 2: Start live server
npm start
# Open http://localhost:3000 in your browser
```

## Connect Excel (Live Data)

1. Run `npm start` to start the live server
2. Open Excel > **Data** tab > **From Web**
3. Enter URL: `http://localhost:3000`
4. Click **Load**
5. Right-click the query > **Properties** > set **Refresh every 5 minutes**

## Output Format

| No | Stock | RSI | MACD | MA20 | MA50 |
|----|-------|-----|------|------|------|
| 1  | ISMA  | 71.692 | 0.268 | 13.392 | 13.303 |
| 2  | POUL  | 70.599 | 0.972 | 27.462 | 26.998 |
| ... | ... | ... | ... | ... | ... |

## Tech Stack

- **Node.js**
- **yahoo-finance2** — market data
- **exceljs** — Excel file generation

## License

MIT
