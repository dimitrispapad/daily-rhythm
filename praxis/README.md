# PraxisAI

My personal operations app, built for a brain that gets distracted easily. It runs as a private app on claude.ai, so it syncs between my phone and laptop and can use Claude and my Gmail. This folder holds its code. My data is not here: it lives in the app's private store on claude.ai.

## What's inside

| Section | What it's for |
| --- | --- |
| **Focus** | One thing at a time: the task, its next tiny step, a 25-minute timer, and a box to park distracting thoughts. "I'm overwhelmed" hides everything else. |
| **Overview** | Every area at a glance: today, overdue, deadlines for 30 days, focus minutes, money, open leads. |
| **Tasks** | Board (Inbox, Next, Doing, Waiting, Done) or by area. Claude breaks big tasks into small steps. |
| **Calendar** | The week: my Rhythm routine plus every dated thing in PraxisAI. |
| **Capture inbox** | Brain dump. Claude sorts it into tasks, notes, leads, events and expenses. |
| **SimasiaAI** | Leads and cold emails ("Today's 3"), Gmail inbox to tasks, invoices (paid adds income to Money), meeting prep, offering ideas. Claude drafts emails; they're saved as Gmail drafts, never sent. |
| **Career & PhD** | Opportunities with deadlines and status, career paths, the Track A/B decision countdown. |
| **Money** | Floor, freedom target, savings runway, income vs spending, categories, Claude's monthly read. |
| **Nutrition** | My dietitian's plan plus a food diary: tick a meal eaten as planned, or write what I actually ate and Claude estimates calories, protein, carbs and fat (editable). Running totals against 2300 kcal and the protein range, a 7-day log, a water tracker, the week, food swaps, supplements, a shopping list, weigh-ins and the next visit. The plan itself lives in the private store, not in this code. |
| **Goals & habits** | Life question and stages, number goals, habit streaks. |
| **Mind** | Books with notes, therapy lessons, lessons, notes. |
| **Create** | Distraction-free writing mode, projects, hobbies. |
| **Whiteboard** | Sticky notes to think with; any note can become a task. |
| **Think with Claude** | A chat that knows my tasks, deadlines, goals and money. |

## Two ways to run it

**1. On claude.ai** (private app): storage, Claude and Gmail come from claude.ai.

**2. Standalone, on my own stack** (`praxis/app/`): the same app, installable on the phone.

| Part | Where it lives |
| --- | --- |
| Code | This GitHub repo |
| Hosting | Netlify (serves `praxis/app`, see `netlify.toml`) |
| My data | Netlify Blobs, one private store on my Netlify site, behind my passcode (`netlify/functions/data.mjs`). Each device keeps an offline copy and sends changes when back online. |
| AI | Gemini, called from `netlify/functions/ai.mjs`, so the API key stays on the server |

Netlify setup, once:
1. app.netlify.com → Add new site → Import an existing project → GitHub → `daily-rhythm`. Keep the detected settings and deploy.
2. Site configuration → Environment variables, add:
   - `APP_PASSCODE`: a long passphrase only I know (12+ characters). It protects my data.
   - `GEMINI_API_KEY`: from aistudio.google.com/apikey.
   - optional `GEMINI_MODEL`: a specific model id; by default the newest Flash model is used.
3. Deploys → Trigger deploy. Open the site, type the passcode, then Settings → Restore from file to load a backup.
4. On the phone: open the site, Share → Add to Home Screen.

Without Netlify the same app also runs at https://dimitrispapad.github.io/daily-rhythm/praxis/ : data stays on that one device and Gemini uses a key pasted in Settings.

Gmail (inbox to tasks, saving drafts) only works in the claude.ai version.

## How it's built

- One HTML page, no framework. `build.py` joins `src/shell.html`, `src/styles.css`, `../plan.js` (the Rhythm routine) and `src/1-core.js`, `src/2-views.js`, `src/2b-food.js`, `src/3-app.js`, `src/4-food.js` into `index.html`.
- On claude.ai it uses the artifact runtime: `db` (private synced store, readable only by the owner), `sample` (Claude), `mcp` (Gmail: `search_threads`, `create_draft`), `downloads` (backup), `user`.
- Outside claude.ai it still works, saving to the browser only.
- My profile for Claude ("About me") is stored in the app's private settings, not in this code.

## Change it

Edit the files in `src/`, run `python3 build.py`, then push: Netlify and GitHub Pages redeploy the standalone app. For the claude.ai version, ask Claude to republish PraxisAI from `praxis/index.html`.
