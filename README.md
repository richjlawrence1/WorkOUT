# WorkOUT

A personal trainer and nutrition coach in one app. Built with Expo (React Native) for iOS and Android.

## What it does

- **Onboarding** – goal, body stats, experience, schedule and the equipment you have.
- **Training plan** – a split (full body, upper/lower or push/pull/legs) built only from exercises your equipment allows. Swap any exercise for an alternative.
- **Exercise demos** – every exercise has a looping start/end demonstration, muscles worked and step-by-step technique.
- **Workout logging with automatic progression** – log sets, reps and weight with a rest timer. Next session's targets update themselves: hit the top of the rep range and the weight goes up; miss twice and it deloads.
- **Coach** – during each exercise, a briefing explains today's target, what you did last time, why the weight or sets changed, and what the lift is for. It reacts after every set.
- **Progress photos** – front, side and back at each check-in, shown side by side against your first set.
- **Training and nutrition linked** – insights that read lifts, food and weight together (for example low protein alongside stalled lifts).
- **Coach chat** – ask questions answered from your own data. Uses Claude with your own Anthropic API key, entered in Settings and kept in the device keychain. Personal use only: a public release must move this behind a server.
- **Adjust today** – rebuilds a session around a sore area, limited time or low energy.
- **Reminders** – weigh-in, check-in, food log, training, and a rest-timer alert that reaches the lock screen and a paired watch.
- **Weekly report** – a shareable summary card.
- **Extras** – plate loading and warm-up sets for barbell lifts, stones/pounds for body weight, preferred supermarket in food search, estimated weekly shop cost.
- **Cardio, steps and warm-ups** – every session opens with a warm-up and closes with prescribed cardio; a daily step target is logged by hand.
- **Coach-led check-in** – the weekly review moves one lever at a time (steps, cardio, rep block, calories) and explains each change.
- **Dashboard** – goal, distance to go and forecast date, six weekly stats, and the coach's current prescription.
- **Built around age and injuries** – problem areas named in onboarding keep exercises that load them out of the programme; age raises the rep floor and sets a weekly mobility target.
- **Mobility** – a guided full-body mobility session, plus a 5-minute warm-up and 10-minute stretch in every workout, each with an on/off toggle.
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
node scripts/build-mobility.mjs path/to/exercises.json  # regenerate the mobility drills
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
| `src/lib/insights.ts` | Findings that link training, food and weight |
| `src/lib/adjust.ts` | Session changes for soreness, time and energy |
| `src/lib/coachChat.ts` | Coach chat: data snapshot and Claude API call |
| `src/lib/notify.ts` | Local reminders and rest alerts |
| `src/lib/off.ts` | Open Food Facts barcode and product search |
| `src/data/` | Exercise library (generated), recipes, staple foods |
| `src/store.ts` | App state, persisted on-device |
| `src/theme.ts`, `src/ui.tsx` | Design tokens and shared components |

## Data sources

- Exercises and demo images: [free-exercise-db](https://github.com/yuhonas/free-exercise-db), public domain (Unlicense).
- Packaged food data: [Open Food Facts](https://openfoodfacts.org), Open Database Licence. Attribution is required in the shipped app.
- Recipe photos: generated for this app and loaded from a remote URL (`src/data/mealImages.ts`). Bundle them into `assets/` before release.
- Recipe macros and staple food values are estimates.

## Not built yet (need an installed development build, not Expo Go)

- Apple Health sync
- Live Activity rest timer on the lock screen, and an Apple Watch app

## Before App Store submission

- Replace the placeholder icon and splash in `assets/`, and set your own `bundleIdentifier` / `package` in `app.json`.
- Build and submit with EAS: `npx eas-cli@latest build -p ios`, then `npx eas-cli@latest submit -p ios`. Requires an Apple Developer account.
- Add a privacy policy and an in-app credit for Open Food Facts.
