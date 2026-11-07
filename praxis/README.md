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
| **Goals & habits** | Life question and stages, number goals, habit streaks. |
| **Mind** | Books with notes, therapy lessons, lessons, notes. |
| **Create** | Distraction-free writing mode, projects, hobbies. |
| **Whiteboard** | Sticky notes to think with; any note can become a task. |
| **Think with Claude** | A chat that knows my tasks, deadlines, goals and money. |

## How it's built

- One HTML page, no framework. `build.py` joins `src/shell.html`, `src/styles.css`, `../plan.js` (the Rhythm routine) and `src/1-core.js`, `src/2-views.js`, `src/3-app.js` into `index.html`.
- On claude.ai it uses the artifact runtime: `db` (private synced store, readable only by the owner), `sample` (Claude), `mcp` (Gmail: `search_threads`, `create_draft`), `downloads` (backup), `user`.
- Outside claude.ai it still works, saving to the browser only.
- My profile for Claude ("About me") is stored in the app's private settings, not in this code.

## Change it

Edit the files in `src/`, run `python3 build.py`, then ask Claude to republish PraxisAI from `praxis/index.html`.
