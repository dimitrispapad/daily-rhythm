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

- Work happens 08:00–18:00, Monday to Friday. **18:00 is STOP WORK.**
- Tuesday and Thursday mornings belong to my own future: applications and behavioural science.
- Gym on Monday, Wednesday and Friday at 18:30, outdoors on Saturday.
- Friends on Tuesday, Friday and Saturday evenings. Family on Sunday.
- Poetry on Thursday night and Sunday morning.
- Saturday has no work. The weekly review is Sunday at 17:00.

## Apple Calendar

The site publishes a calendar feed at
`https://dimitrispapad.github.io/daily-rhythm/Daily-Rhythm.ics`.

- **iPhone:** open the app, go to **Setup**, tap **Subscribe in Apple Calendar**.
- **Mac:** Calendar → File → New Calendar Subscription, paste the address, set Auto-refresh to *Every hour*.

Because it's a subscription, the calendar updates by itself whenever `plan.js` changes here.

## Install on the iPhone

Open the link in Safari, tap **Share** → **Add to Home Screen**. It opens full screen as **Rhythm** and works offline.

## Change the routine

Everything lives in **`plan.js`**: the days, blocks, meals and goals. Edit it on GitHub (pencil icon) and commit. A GitHub Action then checks the plan for mistakes (overlapping times, typos in times), rebuilds `Daily-Rhythm.ics` and republishes the site in about a minute.

A block looks like this:

```js
B("mon-gym", "18:30", "19:45", "body", "Gym: Strength A", "Push + core. 60–75 min.", { tag: "gym", alarm: 30 })
//  id         start    end     category  title              details                    tag counts toward goals, alarm = minutes before
```

Categories: `ritual`, `food`, `deep` (Mastery), `work` (SimasiaAI), `body`, `people`, `create`, `rest`. Add `{ cal: false }` to keep a block in the app only, not in the calendar.

To check locally: `node scripts/build.js`.

## Privacy

Ticks, counters and backups stay on the device in the browser's storage. Nothing is sent anywhere. The repository is public, so the routine itself is visible to anyone with the link.

## Files

```
index.html             page structure
styles.css             look and feel (brand colours, light and dark)
plan.js                the routine, meals, goals, and the calendar generator
app.js                 the app logic
sw.js                  offline support
manifest.webmanifest   home-screen install
scripts/build.js       checks the plan and writes Daily-Rhythm.ics
.github/workflows/     builds and publishes to GitHub Pages
```
