# WorkOUT

A personal trainer and nutrition coach in one app. Built with Expo (React Native) for iOS and Android.

## What it does

- **Onboarding** – goal, body stats, experience, schedule and the equipment you have.
- **Training plan** – a split (full body, upper/lower or push/pull/legs) built only from exercises your equipment allows. Swap any exercise for an alternative.
- **Exercise demos** – every exercise has a looping start/end demonstration, muscles worked and step-by-step technique.
- **Workout logging with automatic progression** – log sets, reps and weight with a rest timer. Next session's targets update themselves: hit the top of the rep range and the weight goes up; miss twice and it deloads.
- **Weigh-ins and weekly check-in** – a weekly review of weight trend, sessions and intake that retunes your calories.
- **Meal planner** – a seven-day plan fitted to your calorie and protein targets. Exclude foods you don't like, heart favourites to have them repeat, swap meals, and get a shopping list.
- **Food diary** – scan a barcode (Open Food Facts, good UK supermarket coverage including Aldi), search by name, or enter values manually.

All data is stored on the device. There are no accounts or servers.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with the Expo Go app on your phone. Barcode scanning needs a real device; everything else also runs in a browser with `npx expo start --web`.

```bash
npm run typecheck                                   # type-check
npm run build:exercises -- path/to/exercises.json   # regenerate the exercise library
```

## Project layout

| Path | Purpose |
| --- | --- |
| `src/app/` | Screens (Expo Router). `(tabs)/` holds Today, Train, Nutrition and Progress. |
| `src/lib/plan.ts` | Equipment list and training plan generator |
| `src/lib/progression.ts` | Progressive overload rules, estimated 1RM, PRs |
| `src/lib/nutrition.ts` | Calorie and macro targets |
| `src/lib/mealplan.ts` | Meal plan generator, swaps, shopping list |
| `src/lib/checkin.ts` | Weekly check-in analysis |
| `src/lib/off.ts` | Open Food Facts barcode and product search |
| `src/data/` | Exercise library (generated), recipes, staple foods |
| `src/store.ts` | App state, persisted on-device |
| `src/theme.ts`, `src/ui.tsx` | Design tokens and shared components |

## Data sources

- Exercises and demo images: [free-exercise-db](https://github.com/yuhonas/free-exercise-db), public domain (Unlicense).
- Packaged food data: [Open Food Facts](https://openfoodfacts.org), Open Database Licence. Attribution is required in the shipped app.
- Recipe macros and staple food values are estimates.

## Before App Store submission

- Replace the placeholder icon and splash in `assets/`, and set your own `bundleIdentifier` / `package` in `app.json`.
- Build and submit with EAS: `npx eas-cli@latest build -p ios`, then `npx eas-cli@latest submit -p ios`. Requires an Apple Developer account.
- Add a privacy policy and an in-app credit for Open Food Facts.
