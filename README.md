# Fast Sniper Signal Backend

Event-driven Solana narrative scanner. Sistem önce sosyal tarafta sıcak olayları çıkarır, olayları normalize eder, sonra yeni Solana pair'lerini bu aktif event'lerle eşleştirip Telegram/webhook sinyali üretir.

## Pipeline

1. `EventService` sosyal postları ve event provider'larını okuyup aktif event cache'ini günceller.
2. `DexscreenerSignalProvider` en yeni Solana pair'lerini çeker.
3. `NarrativeMatchingService` token metadata + event profile arasında eşleşme skoru üretir.
4. `EventTokenScoringService` dex kalite, event match, token social ve freshness skorlarını birleştirir.
5. `SignalsService` sadece güçlü event-driven signal type'larını Telegram ve webhook'a yollar.

## Modüller

- `src/event/`: event detection, normalization, clustering, active state, scoring
- `src/social/`: sosyal post toplama servisleri ve provider arayüzleri
- `src/token/`: token metadata enrichment
- `src/dexscreener/`: fresh pair provider
- `src/signals/`: scan endpoint ve alert dispatch

## Endpointler

- `GET /health`
- `GET /signals/preview`
- `POST /signals/scan`
- `POST /signals/ingest`

`preview` event-first skorlanmış candidate payload'ları döner. Response içinde `matchedEvent`, `eventCategory`, `eventMatchScore`, `tokenSocialScore`, `signalType` ve `reasonCodes` alanları bulunur.

## Demo / Mock Akış

Varsayılan olarak `ENABLE_MOCK_SOCIAL_POSTS=true`. Böylece gerçek Twitter/X bağlantısı olmadan örnek event cluster'ları oluşur. `TwitterEventProvider` interface seviyesinde hazırdır; gerçek API/scraper entegrasyonu buraya eklenebilir.

## Test

```bash
npm test
```

Bu testler event normalization, narrative matching ve signal scoring davranışını doğrular.
