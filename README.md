# Dimitris · Daily Rhythm

My hour-by-hour week, built around one question: *how can people live better lives?* It tells me what to eat, when to train, when to start and stop work, what I'm working on, when to see friends, and when to write. It also tracks the goals of the Mastery stage (2026–2029).

**Open it:** https://dimitrispapad.github.io/daily-rhythm/

## What's in the app

| Tab | What it does |
| --- | --- |
| **Today** | A "Now" card with what I should be doing this minute, the time left and what's next, then the whole day hour by hour. Tick each block when it's done. |
| **Week** | All seven days on one grid, plus how many hours go to SimasiaAI, Mastery, people and the body. |
| **Food** | Today's four meals, the eating rules and the week's Greek-Mediterranean menu. |
| **Goals** | 30-day sprint counters (10 applications, 4 conversations, 1 talk, 2 posts, the SimasiaAI agreement), a weekly scoreboard filled from my ticks, the Track A/B decision countdown and the 2026–2036 path. |
| **Setup** | Subscribe in Apple Calendar, install on the iPhone, back up progress. |

## The rules that hold the week together

- **Gym 08:00–09:00 every weekday** (strength Mon/Wed/Fri, lighter cardio Tue/Thu), then shower and a protein breakfast.
- **SimasiaAI 09:30–18:00**, Monday to Friday. **18:00 is STOP WORK.**
- Monday, Wednesday and Thursday evenings belong to my own future (Mastery): applications, study and posts, talks and conversations.
- Friends on Tuesday, Friday and Saturday evenings. Family on Sunday. A lunch with someone doing the work every Friday.
- Poetry on Thursday night and Sunday morning.
- Saturday has no work. The weekly review (with the money check) is Sunday at 17:00.

## Apple Calendar

The site publishes a calendar feed at
`https://dimitrispapad.github.io/daily-rhythm/Daily-Rhythm.ics`.

- **iPhone:** open the app, go to **Setup**, tap **Subscribe in Apple Calendar**.
- **Mac:** Calendar → File → New Calendar Subscription, paste the address, set Auto-refresh to *Every hour*.

Because it's a subscription, the calendar updates by itself whenever `plan.js` changes here.

## My iPhone calendar inside the app

The app also reads my real calendar, so appointments, meetings and parties show up in **Today** and **Week**. When one clashes with the routine, the block it covers is crossed out, and for the gym or a Mastery evening the app suggests where to move it.

How it works: every 15 minutes a GitHub Action reads my iCloud calendar link, keeps the next 5 weeks, **encrypts** them with my passphrase and publishes `events.enc.json`. The site is public, but without the passphrase nobody can read the events. The app decrypts them on my phone.

One-time setup:

1. **iPhone:** Calendar → Calendars → ⓘ next to the calendar → turn on **Public Calendar** → **Share Link…** → Copy. Repeat for each calendar (Home, Work…).
2. **GitHub:** this repo → Settings → Secrets and variables → Actions → **New repository secret**:
   - `ICLOUD_CALENDAR_URLS`: the link(s), one per line
   - `CAL_PASSPHRASE`: a passphrase I choose
3. Actions → **Build and publish** → **Run workflow** (or wait 15 minutes).
4. In the app: **Setup** → type the passphrase → **Unlock**. Once per device.

To stop: delete the two secrets and turn off Public Calendar on the iPhone (that also invalidates the old link).

## Install on the iPhone

Open the link in Safari, tap **Share** → **Add to Home Screen**. It opens full screen as **Rhythm** and works offline.

## Change the routine

Everything lives in **`plan.js`**: the days, blocks, meals and goals. Edit it on GitHub (pencil icon) and commit. A GitHub Action then checks the plan for mistakes (overlapping times, typos in times), rebuilds `Daily-Rhythm.ics` and publishes the site to the `gh-pages` branch in about a minute.

One-time setting: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / `(root)`**.

A block looks like this:

```js
B("mon-gym", "18:30", "19:45", "body", "Gym: Strength A", "Push + core. 60–75 min.", { tag: "gym", alarm: 30 })
//  id         start    end     category  title              details                    tag counts toward goals, alarm = minutes before
```

Categories: `ritual`, `food`, `deep` (Mastery), `work` (SimasiaAI), `body`, `people`, `create`, `rest`. Add `{ cal: false }` to keep a block in the app only, not in the calendar.

To check locally: `node scripts/build.js`.

## Privacy

Ticks, counters and backups stay on the device in the browser's storage. Calendar events are published only in encrypted form. The repository is public, so the routine itself is visible to anyone with the link.

## Files

```
index.html             page structure
styles.css             look and feel (brand colours, light and dark)
plan.js                the routine, meals, goals, and the calendar generator
app.js                 the app logic
sw.js                  offline support
manifest.webmanifest   home-screen install
scripts/build.js       checks the plan and writes Daily-Rhythm.ics
scripts/ical.js        reads .ics calendars, including repeating events
scripts/sync-calendar.js  fetches the iCloud calendar and encrypts it
.github/workflows/     builds and publishes to the gh-pages branch
```
