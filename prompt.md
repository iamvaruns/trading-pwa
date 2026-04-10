# "Should I Be Trading?" — Project Prompt & Architecture Document

## Overview

**"Should I Be Trading?"** is a Bloomberg Terminal-inspired Progressive Web App (PWA) that helps traders make informed decisions about whether current market conditions favor active trading. It aggregates real-time data from Yahoo Finance, FRED, and Anthropic Claude AI to produce a **Market Quality Score (MQS)** and a clear **YES / CAUTION / NO** verdict.

This is a **read-only analytics tool** — it does not execute trades, connect to brokerages, or manage portfolios.

---

## Prompt 1: Core Concept

> Build a Bloomberg-style market dashboard PWA called "Should I Be Trading?" that answers one question: are current market conditions favorable for active trading? The app should aggregate VIX, SPY/QQQ trend data, sector ETF breadth, interest rates, dollar index, and FOMC proximity into a single weighted **Market Quality Score (0-100%)** that produces a YES / CAUTION / NO decision. Include an AI-powered terminal analysis using Claude, a stock screener with technical scoring, and a dark terminal aesthetic using Share Tech Mono font.

---

## Prompt 2: Tech Stack

> **Frontend:** React 18 with Vite 6, JavaScript + JSX (no TypeScript). Use `lightweight-charts` v4 for interactive candlestick charts in the stock detail view, and inline SVG for dashboard sparklines.
>
> **Backend:** Netlify Functions (serverless) for production, with a local `server.js` (Node HTTP) for development. The backend proxies all external API calls (Yahoo Finance, FRED, Anthropic) to keep API keys server-side.
>
> **Styling:** Inline React styles with a theme context system (dark/light). Global CSS in `index.css` for layout and animations. Google Fonts: "Share Tech Mono" (primary monospace) and "Exo 2".
>
> **State Management:** React `useState`/`useEffect`/`useCallback`/`useRef` — no external state library. `localStorage` for persistence of user preferences, watchlists, and settings.
>
> **PWA:** Manual service worker (`sw.js`) and `manifest.json` — standalone display, portrait orientation, custom shortcuts.

---

## Prompt 3: Project Structure

```
trading-pwa/
├── index.html                    # Vite entry HTML with PWA meta tags
├── package.json                  # Dependencies and scripts
├── vite.config.js                # Vite + React plugin, dev proxy config
├── server.js                     # Local dev server (Node HTTP, API proxy)
├── netlify.toml                  # Netlify build/deploy + function redirects
├── manifest.json                 # PWA manifest (repo root duplicate)
├── sw.js                         # Service worker (repo root duplicate)
│
├── public/
│   ├── manifest.json             # PWA manifest (served at /manifest.json)
│   └── sw.js                     # Service worker (cache-first strategy)
│
├── netlify/functions/
│   ├── yahoo.js                  # Yahoo Finance chart data proxy
│   ├── yahoo-quote.js            # Yahoo Finance quote summary proxy
│   ├── fred.js                   # FRED economic data proxy
│   └── analysis.js               # Anthropic Claude AI analysis proxy
│
└── src/
    ├── main.jsx                  # React root, ThemeProvider, SW registration
    ├── App.jsx                   # Shell: header, tab navigation, 3 screens
    ├── index.css                 # Global styles, animations, CSS variables
    │
    ├── context/
    │   └── ThemeContext.jsx       # Theme + layout context with localStorage
    │
    ├── constants/
    │   ├── index.js              # Re-exports all constants
    │   ├── sectors.js            # 11 sector ETFs, default screener tickers
    │   ├── themes.js             # Dark/light color palettes, dimension configs
    │   └── timeframes.js         # Chart timeframes, FOMC dates, default settings
    │
    ├── api/
    │   ├── yahoo.js              # fetchYahoo() and fetchYahooQuote() clients
    │   ├── fred.js               # fetchFRED() client
    │   └── analysis.js           # getAIAnalysis() — builds prompt, calls /api/analysis
    │
    ├── utils/
    │   ├── data.js               # Data orchestration (dashboard + screener loaders)
    │   ├── calculations.js       # Technical indicators (SMA, EMA, RSI, MACD, BB, ATR, S/R, signals)
    │   └── scoring.js            # MQS scoring engine + per-stock scoring engine
    │
    ├── screens/
    │   ├── DashboardScreen.jsx   # Main market dashboard with MQS verdict
    │   ├── ScreenerScreen.jsx    # Stock screener with watchlist management
    │   └── SettingsScreen.jsx    # App settings (mode, refresh, theme, layout)
    │
    └── components/
        ├── ui/
        │   ├── Panel.jsx         # Reusable panel container
        │   ├── Row.jsx           # Key-value data row
        │   ├── Gauge.jsx         # Circular MQS gauge
        │   ├── Badge.jsx         # YES/CAUTION/NO badge
        │   ├── ScoreBar.jsx      # Horizontal score bar with label + weight
        │   ├── SectorBar.jsx     # Sector heatmap visualization
        │   ├── Tape.jsx          # Scrolling ticker tape
        │   └── Skeleton.jsx      # Loading skeleton placeholders
        │
        ├── charts/
        │   └── Sparkline.jsx     # SVG sparkline with optional SMA overlays
        │
        └── screener/
            ├── StockCard.jsx     # Summary card for each screener stock
            ├── StockDetailView.jsx # Full-screen detail: charts, signals, risk calc
            ├── VolumeBar.jsx     # Volume indicator bar
            └── SMATag.jsx        # SMA relationship tag
```

---

## Prompt 4: Dashboard Screen — Market Quality Score

> The Dashboard is the primary screen. On load (and every 45 seconds by default), it fetches data for **SPY, QQQ, ^VIX, ^TNX (10Y yield), ^DXY (dollar index), and 11 sector SPDR ETFs** (XLK, XLF, XLE, XLV, XLI, XLY, XLP, XLU, XLB, XLRE, XLC) from Yahoo Finance, plus **FEDFUNDS** from the FRED API.
>
> The data feeds into a **5-pillar scoring system** that produces the Market Quality Score:
>
> | Pillar | Weight | What It Measures |
> |--------|--------|------------------|
> | **Volatility** | 25% | VIX level, VIX 5-day slope, VIX 1-year percentile |
> | **Momentum** | 25% | Sector daily changes, positive/negative sector ratio, spread |
> | **Trend** | 20% | SPY vs MA200/MA50/MA20, RSI(14), QQQ vs MA50 |
> | **Breadth** | 20% | Sectors above 50-day SMA, sectors above 200-day SMA |
> | **Macro** | 10% | 10Y yield level, DXY level, FOMC proximity |
>
> The **weighted MQS** combines with an **equal-weight blend** (40% trend + 35% momentum + 25% breadth) to produce a final decision:
> - **MQS combined >= 75** → **YES** ("Full size, press risk")
> - **MQS combined >= 55** → **CAUTION** ("Half size, A+ setups only")
> - **MQS combined < 55** → **NO** ("Avoid, preserve capital")
>
> Display a **status bar** (LIVE/UPDATING/ERROR + seconds since last refresh + regime label), a **scrolling ticker tape**, an **FOMC warning banner** when a meeting is within 72 hours, **score breakdown bars** for each pillar, **data panels** (Volatility, Trend, Breadth, Macro), a **sector heatmap**, an **SPY sparkline chart** with MA20/MA50/MA200 overlays, and an **AI terminal analysis** panel powered by Claude.

---

## Prompt 5: AI Terminal Analysis (Anthropic Claude Integration)

> After the dashboard data loads, send a structured prompt to Anthropic Claude (model: `claude-sonnet-4-20250514`) via the `/api/analysis` serverless endpoint. The prompt includes the current decision, MQS score, VIX, SPY price, RSI, SPY vs moving averages, 10Y yield, DXY, sector breadth, score breakdown, FOMC risk status, and trading mode (SWING or DAY).
>
> Claude returns exactly **3 sentences** of plain prose (no markdown, no bullets): specific about numbers and conditions, ending with one concrete implication for position sizing or setup selection. The response renders in the "TERMINAL ANALYSIS — AI LAYER" panel with a monospace terminal aesthetic.
>
> The AI call is proxied server-side — the `ANTHROPIC_API_KEY` is never exposed to the browser.

---

## Prompt 6: Stock Screener

> The Screener screen lets users manage a **watchlist** of stock tickers (default: AAPL, MSFT, NVDA, AMZN, META, GOOGL, TSLA, SPY, QQQ). Users can add/remove tickers, and the list persists in `localStorage`.
>
> For each ticker, fetch **1 year of daily OHLCV data** from Yahoo Finance and a **quote summary** (P/E, margins, growth, earnings date, 52-week range). Compute locally:
> - **Technical indicators:** SMA(20, 50, 100, 200), EMA, RSI(14), MACD (12/26/9), Bollinger Bands (20, 2), ATR(14), 5-day slope
> - **Support/Resistance levels** from price history
> - **Relative Strength** vs SPY (1-month, 3-month, 1-year ratios)
> - **Signals** (Golden Cross, Death Cross, RSI oversold/overbought, MACD crossover, Bollinger squeeze, volume spike, etc.)
>
> Each stock receives a **per-stock composite score** based on 4 sub-scores:
>
> | Sub-Score | What It Measures |
> |-----------|------------------|
> | **Technical** | Price vs SMAs, RSI positioning, MACD alignment, Bollinger proximity |
> | **Momentum** | Relative strength vs SPY, 5-day slope, volume ratio |
> | **Risk** | ATR as % of price, proximity to support/resistance |
> | **Fundamental** | Forward P/E, revenue growth, profit margins, earnings proximity |
>
> The sub-score **weights shift based on investment horizon**:
> - **SHORT (1-2 months):** 40% technical, 30% momentum, 20% risk, 10% fundamental
> - **MEDIUM (3-6 months):** 30% technical, 25% momentum, 20% risk, 25% fundamental
> - **LONG (1 year):** 20% technical, 20% momentum, 20% risk, 40% fundamental
>
> The total score maps to a verdict: **BUY** (>= 70), **HOLD** (50-69), or **AVOID** (< 50).
>
> Users toggle indicator overlays (SMA20, SMA50, SMA100, SMA200, Volume) on stock cards, which show a sparkline, key metrics, and the score badge.

---

## Prompt 7: Stock Detail View

> Tapping a stock card opens a **full-screen detail overlay** with:
>
> 1. **Interactive candlestick chart** using TradingView Lightweight Charts (v4) with volume histogram, RSI sub-chart, and MACD sub-chart
> 2. **Multi-timeframe switching:** 1H (2m candles), 1D (5m candles), 1M (60m candles), 1Y (daily candles)
> 3. **Signals panel:** Displays detected technical signals (Golden Cross, RSI oversold, MACD bullish crossover, volume spike, Bollinger squeeze, etc.)
> 4. **Score breakdown panel:** Shows technical, momentum, risk, and fundamental sub-scores with the composite verdict
> 5. **Fundamentals panel:** Forward P/E, revenue growth, profit margins, 52-week range, earnings countdown
> 6. **Risk/Position-Size calculator:** Takes account size and risk percentage (persisted in localStorage), suggests position size, stop-loss distance based on ATR, and calculates potential loss amount

---

## Prompt 8: API Architecture

> All external API calls are proxied through the backend to keep secrets server-side.
>
> **Client-side API modules** (`src/api/`) make relative-URL fetch calls:
> - `fetchYahoo(symbol, range, interval)` → `GET /api/yahoo?symbol=...&range=...&interval=...`
> - `fetchYahooQuote(symbol)` → `GET /api/yahoo-quote?symbol=...`
> - `fetchFRED(series)` → `GET /api/fred?series=...`
> - `getAIAnalysis(data, scores, decision, mode)` → `POST /api/analysis` with JSON body
>
> **Netlify Functions** (`netlify/functions/`) handle these in production:
> - `yahoo.js` — Uses cookie/crumb flow to authenticate with `query2.finance.yahoo.com/v8/finance/chart`
> - `yahoo-quote.js` — Fetches from `v10/finance/quoteSummary` with financial modules
> - `fred.js` — Calls `api.stlouisfed.org` with `FRED_API_KEY` from environment
> - `analysis.js` — Calls `api.anthropic.com/v1/messages` with `ANTHROPIC_API_KEY` from environment
>
> **Local dev server** (`server.js`) implements the same 4 endpoints on port 3000, with Vite's dev proxy forwarding `/api/*` from port 5173.
>
> **Netlify redirects** (`netlify.toml`) map `/api/*` to `/.netlify/functions/*` with status 200.

---

## Prompt 9: Scoring Engine Deep Dive

> The scoring engine lives in `src/utils/scoring.js` and has two parts:
>
> ### Part 1: Market Quality Score (Dashboard)
>
> **`scoreVolatility(data)`** — Starts at 100, penalizes for elevated VIX (>35: -60, >25: -40, >20: -20) and rising VIX slope (>2: -20, >0.5: -10), rewards falling VIX (<-1: +8) and very low VIX (<=13: +5).
>
> **`scoreTrend(data)`** — Starts at 50, evaluates SPY vs MA200 (+/-15), MA50 (+/-12), MA20 (+/-8), RSI zones, and QQQ vs MA50 (+/-5).
>
> **`scoreBreadth(data)`** — Averages the percentage of 11 sector ETFs above their 50-day SMA and above their 200-day SMA.
>
> **`scoreMomentum(data)`** — Measures sector daily changes: positive ratio drives 70% of score, top-3 vs bottom-3 sector spread adds/subtracts up to 20.
>
> **`scoreMacro(data)`** — Starts at 60, penalizes high yields (10Y >5%: -25, >4.5%: -12), strong dollar (DXY >107: -10), and FOMC proximity (-10). Rewards low yields (<3.5%: +10) and weak dollar (<99: +8).
>
> **`computeMQS(scores)`** — Weighted sum: Volatility 25% + Momentum 25% + Trend 20% + Breadth 20% + Macro 10%.
>
> **`getDecision(mqs, ew)`** — Blends MQS (75%) with equal-weight score (25%). YES >= 75, CAUTION >= 55, NO < 55.
>
> ### Part 2: Stock Score (Screener)
>
> **`scoreTechnical(data, horizon)`** — Evaluates price vs SMA stack, RSI zones (oversold is bullish for SHORT horizon), MACD alignment, Bollinger band proximity.
>
> **`scoreMomentumStock(data, rs, horizon)`** — Relative strength vs SPY (using horizon-appropriate lookback), 5-day slope, volume ratio vs 20-day average.
>
> **`scoreRisk(data)`** — ATR as % of price (lower = safer), proximity to support (bullish) vs resistance (bearish).
>
> **`scoreFundamental(fund)`** — Forward P/E, revenue growth, profit margins, earnings proximity (within 14 days = risk).
>
> **`scoreStock(data, fundamentals, rsData, horizon)`** — Combines sub-scores with horizon-dependent weights. Verdict: BUY >= 70, HOLD 50-69, AVOID < 50.

---

## Prompt 10: Theme & Layout System

> The app supports **two themes** (dark and light) and **two layouts** (mobile and desktop), toggled from the header and persisted in `localStorage`.
>
> `ThemeContext.jsx` provides the current color palette (`C`) and dimension config (`D`) to all components via React Context. On theme change, CSS custom properties (`--bg`, `--dimmer`, `--skel-a`, `--skel-b`) are updated on `document.documentElement`, along with `body.style.background` and the `theme-color` meta tag.
>
> **Dark theme:** Black background (#0a0a0a), green accents for positive (#00e676), red for negative (#ff3b5c), amber for caution (#ffb800), blue for UI highlights (#448aff).
>
> **Light theme:** White/gray backgrounds, same semantic color logic with adjusted values for readability.
>
> **Desktop layout** uses wider padding, larger fonts, grid layouts (2-column panels), and horizontal nav. **Mobile layout** uses compact padding, smaller fonts, stacked panels, and a bottom tab bar.

---

## Prompt 11: Navigation & Routing

> There is **no client-side router** (no React Router). Navigation is handled by a `tab` state variable in `App.jsx` with three values: `dashboard`, `screener`, `settings`.
>
> All three screens are rendered simultaneously but only the active one is visible (`display: 'block'` vs `display: 'none'`). This preserves state when switching tabs — the dashboard doesn't re-fetch when returning from settings.
>
> A **bottom tab bar** with three buttons (DASHBOARD, SCREENER, SETTINGS) controls the active tab. On desktop, the nav is centered with fixed-width buttons; on mobile, buttons stretch to fill the width.
>
> The **Stock Detail View** is a full-screen overlay within the screener — when `selectedStock` is set, the detail view replaces the screener content.

---

## Prompt 12: PWA Configuration

> The app is configured as an installable Progressive Web App:
>
> **`manifest.json`:**
> - Name: "Should I Be Trading?"
> - Display: standalone (no browser chrome)
> - Orientation: portrait
> - Theme/background colors match the dark theme
> - Shortcuts: Dashboard (`#dashboard`) and Screener (`#screener`)
>
> **`sw.js` (Service Worker):**
> - Cache name: `trading-v2`
> - Pre-caches: root page, `index.html`, `manifest.json`, Google Fonts CSS
> - Network-first for API calls — explicitly bypasses cache for Yahoo, FRED, Anthropic, and `/api/*` endpoints
> - Cache-first for all other assets (CSS, JS, fonts, images)
>
> **Registration:** The service worker is registered in `src/main.jsx` on the `window` `load` event.

---

## Prompt 13: Data Pipeline

> The data pipeline in `src/utils/data.js` orchestrates all fetching and processing:
>
> **`loadDashboardData()`** — Fetches all dashboard symbols in parallel using `Promise.allSettled()`. Each Yahoo response passes through `processChart()` from `calculations.js`, which extracts OHLCV arrays, computes SMAs (20, 50, 100, 200), RSI(14), latest price, 1-year percentile, and volume metrics. After all fetches resolve, it calculates VIX 5-day slope and FOMC proximity.
>
> **`loadStockDataWithScoring(symbol, spyCloses, horizon)`** — Fetches chart data and quote summary in parallel. Processes the chart, detects support/resistance levels, calculates relative strength vs SPY, detects technical signals, and runs the stock scoring engine. Returns a bundle of `{ data, fundamentals, rsData, signals, score, earningsDays }`.
>
> **`loadStockDataForChart(symbol, range, interval)`** — Used by the detail view for multi-timeframe chart data. Optionally trims to the last 30 bars for intraday timeframes.
>
> **`processChart()`** in `calculations.js` — The core data processing function. From raw Yahoo OHLCV arrays, it produces: `price`, `open`, `high`, `low`, `volume`, `change1d`, `sma20/50/100/200`, `rsi14`, `macdLine`, `macdSignal`, `macdHist`, `bbUpper/bbMid/bbLower`, `atr14`, `percentile1y`, `avgVol20`, `slope5d`, full `ohlc[]` and `volumeSeries[]` arrays, and all raw arrays (`allCloses`, `allHighs`, `allLows`, `allTimestamps`).

---

## Prompt 14: Environment Variables & Secrets

> The app requires two environment variables on the server side:
>
> | Variable | Used By | Purpose |
> |----------|---------|---------|
> | `ANTHROPIC_API_KEY` | `/api/analysis` | Authenticates with Anthropic's Claude API |
> | `FRED_API_KEY` | `/api/fred` | Authenticates with the FRED economic data API |
>
> Yahoo Finance does not require an API key — the proxy uses a cookie/crumb authentication flow.
>
> **Local development:** Set these in a `.env` file at the project root (read by `server.js`).
> **Production (Netlify):** Set these in Netlify's environment variables dashboard.
>
> API keys are **never** sent to the browser. The Settings screen explicitly states that keys are server-side only.

---

## Prompt 15: Key Constants & Configuration

> **Sector ETFs (11 SPDR sectors):** XLK (Technology), XLF (Financials), XLE (Energy), XLV (Health Care), XLI (Industrials), XLY (Consumer Discretionary), XLP (Consumer Staples), XLU (Utilities), XLB (Materials), XLRE (Real Estate), XLC (Communication Services).
>
> **Default Screener Watchlist:** AAPL, MSFT, NVDA, AMZN, META, GOOGL, TSLA, SPY, QQQ.
>
> **Dashboard Symbols:** SPY, QQQ, ^VIX, ^TNX, ^DXY, plus all 11 sector ETFs.
>
> **Chart Timeframes:** 1H (2m candles over 1 day), 1D (5m candles over 1 day), 1M (60m candles over 1 month), 1Y (daily candles over 1 year).
>
> **FOMC Dates:** Pre-loaded through 2026 for proximity alerting.
>
> **Default Settings:** Mode = SWING, Refresh Interval = 45 seconds.
>
> **Default Indicators:** SMA20 (on), SMA50 (on), SMA100 (off), SMA200 (on), Volume (on).

---

## Prompt 16: Running the Project

> **Install dependencies:**
> ```
> npm install
> ```
>
> **Local development (frontend + backend):**
> ```
> # Terminal 1: Start the API proxy server
> npm run server
>
> # Terminal 2: Start Vite dev server
> npm run dev
> ```
> The Vite dev server runs on port 5173 and proxies `/api/*` requests to the Node server on port 3000.
>
> **Production build:**
> ```
> npm run build
> ```
> Outputs to `dist/`. Deploy to Netlify with the included `netlify.toml` configuration.
>
> **Preview production build locally:**
> ```
> npm run preview
> ```

---

## Prompt 17: What This Project Does NOT Include

> - **No authentication or user accounts** — the app is anonymous and stateless (beyond localStorage)
> - **No database** — all data comes from live APIs; preferences are stored client-side
> - **No trade execution** — no brokerage integrations, no order placement
> - **No portfolio tracking** — no positions, P&L, or allocation management
> - **No TypeScript** — the entire codebase is JavaScript + JSX
> - **No testing framework** — no Jest, Vitest, Cypress, or Playwright
> - **No CSS-in-JS library** — styling is inline with theme context
> - **No client-side router** — tab-based navigation via React state
> - **No crypto-specific features** — designed for US equities/ETFs (though crypto tickers could theoretically be added to the screener)

---

## Summary

This project is a **single-purpose decision tool for traders**: it answers "should I be trading right now?" with data-driven scoring and AI commentary, while also providing a stock screener for evaluating individual setups. The Bloomberg Terminal aesthetic, real-time data refresh, and PWA installability make it a practical daily tool for swing and day traders who want a quick read on market conditions before committing capital.
