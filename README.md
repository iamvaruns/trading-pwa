# Should I Be Trading? — Setup Guide
## Bloomberg Terminal PWA for Samsung S24 Ultra

---

## Files in This Package

```
trading-pwa/
├── index.html      ← Main app (everything lives here)
├── manifest.json   ← PWA install config
├── sw.js           ← Service worker (offline support)
└── README.md       ← This file
```

---

## Step 1: Get Your Free API Keys

### Anthropic API Key (for AI analysis)
1. Go to **console.anthropic.com**
2. Sign up / log in
3. Go to **API Keys** → Create key
4. Copy the `sk-ant-...` key
5. Paste in app Settings → API Keys

> Cost: ~$0.01–0.05 per refresh. Free tier available.

### FRED API Key (optional, for Fed Funds rate)
1. Go to **fred.stlouisfed.org**
2. Click "My Account" → Register (free)
3. Go to "API Keys" → Request API key
4. Paste in app Settings → FRED API Key

> 100% free, no credit card needed.

### Yahoo Finance (no key needed)
- Data comes automatically via public API through a CORS proxy
- No account or key required

---

## Step 2: Host the App (Free Options)

You need to serve these 3 files over HTTPS for PWA install to work.

### Option A: Netlify (Recommended — 2 minutes)
1. Go to **netlify.com** → Sign up free
2. Drag the `trading-pwa/` folder onto the Netlify dashboard
3. Done! You get a URL like `https://your-app.netlify.app`

### Option B: GitHub Pages (Free)
1. Create a free GitHub account
2. New repository → upload all 3 files
3. Settings → Pages → Deploy from `main` branch
4. URL: `https://yourusername.github.io/trading-pwa`

### Option C: Local Network (no hosting needed)
If you have Python installed:
```bash
cd trading-pwa
python3 -m http.server 8080
```
Then open `http://YOUR_PC_IP:8080` on your phone (same WiFi).
> Note: PWA install won't work over HTTP — use a hosted option for install.

---

## Step 3: Install on Samsung S24 Ultra

### Chrome (Recommended)
1. Open Chrome on your S24 Ultra
2. Navigate to your hosted URL
3. Wait for the app to load
4. Tap the **⋮ menu** (top right)
5. Tap **"Add to Home screen"**
6. Tap **"Add"**
7. The app appears on your home screen with the ◈ icon

### Samsung Internet
1. Open Samsung Internet
2. Navigate to your hosted URL
3. Tap **≡ menu** (bottom right)
4. Tap **"Add page to"**
5. Select **"Home screen"**

### After Install
- Opens fullscreen, no browser UI
- Works offline (cached assets)
- Live data refreshes every 45s when connected

---

## Step 4: Configure the App

Open the app → tap **SETTINGS** tab:

1. Paste your **Anthropic API key** (for AI analysis)
2. Paste your **FRED API key** (optional)
3. Choose **SWING or DAY** trading mode
4. Set **refresh interval** (30s / 45s / 60s / 120s)
5. Tap **SAVE SETTINGS**

Settings persist across sessions via localStorage.

---

## How the Screener Works

**SCREENER tab** → type any ticker → press ADD

- Fetches 1 year of daily price history from Yahoo Finance
- Calculates SMA 20 / 50 / 100 / 200 and RSI(14) locally
- Shows price vs each SMA with % distance
- Volume bar shows today vs 20-day average volume
- Mini sparkline chart with optional SMA overlays
- Toggle indicators on/off at the top
- Remove stocks with ✕ REMOVE button
- Your stock list saves automatically

**Indicator toggles:**
- `SMA20` — 20-day moving average (swing trading signal)
- `SMA50` — 50-day (intermediate trend)
- `SMA100` — 100-day (medium-term structure)
- `SMA200` — 200-day (bull/bear regime)
- `VOL` — Volume vs 20-day average (volume confirmation)

---

## Scoring System

| Category   | Weight | Key Inputs                                |
|------------|--------|-------------------------------------------|
| Volatility | 25%    | VIX level, 5-day slope, 1yr percentile   |
| Momentum   | 25%    | Sector breadth, positive sectors, spread  |
| Trend      | 20%    | SPY vs MA20/50/200, RSI(14), QQQ vs MA50 |
| Breadth    | 20%    | Sectors above SMA50 and SMA200           |
| Macro      | 10%    | 10Y yield, DXY, FOMC calendar            |

**Decision:**
- 75–100% → **TRADE** (full size)
- 55–74% → **CAUTION** (half size, A+ only)
- 0–54% → **STAND DOWN** (preserve capital)

---

## Troubleshooting

**"Failed to load market data"**
- Check internet connection
- Yahoo Finance CORS proxy may be rate-limited (try again in 30s)
- Try refreshing manually with ⟳ button

**AI analysis not showing**
- Verify Anthropic API key in Settings
- Check key starts with `sk-ant-`
- Ensure you have API credits

**Data looks stale**
- Yahoo Finance updates during market hours
- Pre/post market: data reflects last close
- VIX data available 24/5

**Install option not showing in Chrome**
- App must be served over HTTPS (not HTTP)
- Clear Chrome cache and reload
- Wait 30 seconds on the page first

---

## Data Sources

| Data Point         | Source                | Notes                          |
|--------------------|----------------------|--------------------------------|
| SPY, QQQ prices   | Yahoo Finance        | Delayed ~15min (free tier)     |
| Sector ETFs (11)  | Yahoo Finance        | Real-time during market hours  |
| VIX                | Yahoo Finance ^VIX   | CBOE data via Yahoo            |
| TNX (10Y yield)   | Yahoo Finance ^TNX   | Treasury yield                 |
| DXY (Dollar)      | Yahoo Finance ^DXY   | ICE Dollar Index               |
| Fed Funds rate    | FRED API             | Optional; free API key         |
| Breadth data      | Approximated         | Calculated from sector ETFs    |
| AI Analysis       | Anthropic Claude     | Requires your API key          |

> For institutional-grade breadth data (% of stocks above 200d MA), consider:
> - **Polygon.io** (Starter: $29/mo) — full market breadth
> - **Nasdaq Data Link** (various tiers) — breadth + MCO
> - **FactSet / Bloomberg** — professional grade

---

## Customizing the Scoring

To adjust score weights, edit `index.html` and find the `computeMQS` function:

```javascript
function computeMQS(scores) {
  return Math.round(
    scores.volatility * 0.25 +  // ← change this weight
    scores.momentum  * 0.25 +
    scores.trend     * 0.20 +
    scores.breadth   * 0.20 +
    scores.macro     * 0.10
  );
}
```

To adjust VIX thresholds for scoring, edit `scoreVolatility()`.

---

*Not financial advice. For informational and educational use only.*
# trading-pwa
