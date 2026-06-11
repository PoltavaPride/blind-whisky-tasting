# 🥃 Blind Whisky Tasting

A single-page Angular app for hosting blind whisky tasting games. A host
enters a bottle's true details, shares a QR code, and guests guess the
country, distillery, age, cask type, and strength from their phones. Guesses
are scored live on the host's leaderboard.

Built with Angular 22, standalone components, typed reactive forms, signals,
and lazy-loaded routes.

## Run it

```bash
npm install
npm start          # dev server at http://localhost:4200
npm run build      # production build into dist/
```

## How to play

1. Open `/admin`, fill in the bottle's true details, and **Save Bottle**.
2. Click **Generate QR Code** and let guests scan it (or share the link).
3. Guests enter a nickname, then pick their guesses and submit.
4. Watch the leaderboard at `/admin/results/:id` — it polls every 5 seconds.
   Use **Reveal** to show the bottle and highlight correct guesses.

Scoring: 1 point per correct field, max 5. Ties are broken by earliest
submission.

## Routes

| Route                | Who         | Purpose                              |
| -------------------- | ----------- | ------------------------------------ |
| `/admin`             | Host        | Create a bottle, generate the QR code |
| `/admin/results/:id` | Host        | Live leaderboard of scored guesses   |
| `/tasting/:id/join`  | Participant | Enter a nickname                     |
| `/tasting/:id/guess` | Participant | Submit guesses, see confirmation     |

## Architecture

```
src/app/
├── models/whisky.models.ts        # TypeScript interfaces for all domain models
├── data/whisky-data.ts            # Mock dataset (countries, distilleries, casks…)
├── services/tasting.service.ts    # localStorage-backed store + scoring
├── utils/whisky-form.ts           # Typed reactive form factory
├── components/
│   ├── qr-code/                   # Canvas QR renderer (qrcode lib)
│   └── whisky-fields/             # Shared whisky attribute selects
└── pages/
    ├── admin-create/              # /admin
    ├── admin-results/             # /admin/results/:id
    ├── join/                      # /tasting/:id/join
    └── guess/                     # /tasting/:id/guess
```

### Swapping in a real API

`TastingService` is the only place that touches storage, and every method
already returns an `Observable`. Replace its internals with `HttpClient`
calls (and `data/whisky-data.ts` with an options endpoint) and no component
changes are needed.

### Note on the mock store

Rounds and guesses live in the browser's `localStorage`, so cross-device
play (scanning the QR from a phone) requires the real backend mentioned
above. Everything else — routing, forms, scoring, QR generation — works
end to end locally.
