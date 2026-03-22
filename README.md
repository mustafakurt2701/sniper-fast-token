# Fast Sniper Signal Backend

Scam filtreli, `progress` odakli aday token tarayan ve uygun sinyalleri webhook ile ileten bir NestJS backend.

## Mantik

- Dexscreener search API ile hizli aday pair toplar.
- Harici bir watcher veya node stream varsa `POST /signals/ingest` webhook'u ile push tabanli calisir.
- `progress` degeri dogrudan resmi API'de acik olmadigi icin market cap veya FDV uzerinden yaklasik tahmin eder.
- Likidite, 5 dakikalik buy/sell baskisi, hacim, fiyat stabilitesi, pair yasi, boost anomalisi ve proje izi gibi kontrollerden scam skoru uretir.
- Solana icin ek olarak mint authority, freeze authority, top holder ve top 5 holder yogunlugunu RPC uzerinden kontrol eder.
- Esikleri gecen tokenlari webhook URL'lerine ve istenirse Telegram botuna gonderir.

## Endpointler

- `GET /health`
- `GET /signals/preview`
- `POST /signals/scan`
- `POST /signals/ingest`

## Kurulum

```bash
npm install
cp .env.example .env
npm run start:dev
```

## Webhook payload

```json
{
  "type": "progress_signal",
  "chainId": "solana",
  "tokenAddress": "base-token-address",
  "symbol": "TOKEN",
  "name": "Token Name",
  "pairAddress": "pair-address",
  "pairUrl": "https://dexscreener.com/...",
  "progress": 64,
  "momentumScore": 91,
  "scamScore": 22,
  "checks": [],
  "metrics": {
    "liquidityUsd": 32000,
    "volume5mUsd": 28000,
    "buys5m": 45,
    "sells5m": 14,
    "priceChange5mPct": 12.4,
    "marketCap": 44000,
    "fdv": 44000,
    "activeBoosts": 2,
    "pairAgeMinutes": 7,
    "topHolderPct": 9.8,
    "top5HolderPct": 28.4,
    "mintAuthorityRenounced": true,
    "freezeAuthorityRenounced": true
  },
  "discoveredAt": "2026-03-22T18:00:00.000Z"
}
```

## Ingest payload

```json
{
  "pair": {
    "chainId": "solana",
    "dexId": "pumpfun",
    "pairAddress": "pair-address",
    "baseToken": {
      "address": "token-address",
      "name": "Token Name",
      "symbol": "TOKEN"
    },
    "quoteToken": {
      "address": "So11111111111111111111111111111111111111112",
      "name": "Wrapped SOL",
      "symbol": "SOL"
    },
    "txns": {
      "m5": {
        "buys": 42,
        "sells": 11
      }
    },
    "volume": {
      "m5": 31000
    },
    "priceChange": {
      "m5": 14.2
    },
    "liquidity": {
      "usd": 28000
    },
    "marketCap": 45500,
    "boosts": {
      "active": 1
    }
  }
}
```

## Notlar

- Bu servis execution yapmaz; sadece sinyal uretir ve webhook dispatch eder.
- Telegram gonderimi icin `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID` tanimlayin. Bos birakirsan Telegram dispatch kapali kalir.
- `progress` burada tahmini bir metriktir. Kullandiginiz launchpad'e gore graduation esigini degistirmeniz gerekir.
- Solana filtreleri icin `SOLANA_RPC_URL`, `SOLANA_MAX_TOP_HOLDER_PCT`, `SOLANA_MAX_TOP5_HOLDER_PCT` ve `SOLANA_REQUIRE_RENOUNCED_AUTHORITIES` ayarlarini `.env` icinde duzenleyin.
- Scam orani dusurulur ama sifirlanmaz. Hala eksik kalan en kritik veri swap-level honeypot/sell testidir; bu daha sonra chain-specific executor simulasyonu ile eklenebilir.
