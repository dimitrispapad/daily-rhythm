// Dimitris Daily Rhythm: the plan. Shared by the app (browser) and the .ics builder (node).
// Categories: ritual, food, deep (Mastery: your own future), work (SimasiaAI), body, people, create, rest
// Weekdays: gym 08:00, SimasiaAI 09:30–18:00, Mastery evenings Mon/Wed/Thu.
(function (root) {
  const B = (id, s, e, cat, t, d, o) => Object.assign({ id, s, e, cat, t, d, cal: true }, o || {});

  // Weekday frame: train 08:00–09:00, SimasiaAI 09:30–18:00, own future in the evening.
  const morning = (k, gymName, gymFocus) => [
    B(k + "-wake", "07:00", "07:30", "ritual", "Wake, water, pre-gym fuel", "Glass of water, a banana or toast with honey, coffee. Phone stays on airplane mode.", { cal: false }),
    B(k + "-go", "07:30", "08:00", "ritual", "Head to the gym", "Bag packed the night before. On the way, say today's 3 priorities out loud or as a voice note.", { cal: false }),
    B(k + "-gym", "08:00", "09:00", "body", "Gym: " + gymName, gymFocus, { tag: "gym", alarm: 30 }),
    B(k + "-bf", "09:00", "09:30", "food", "Shower + protein breakfast", "Eat within an hour of training. See Food for today's plate.")
  ];
  const workday = (k, w) => [
    B(k + "-w1", "09:30", "11:30", "work", w[0][0], w[0][1], { alarm: 10 }),
    B(k + "-b1", "11:30", "11:45", "rest", "Break", "Stand up, water, look out the window. No phone.", { cal: false }),
    B(k + "-w2", "11:45", "13:00", "work", w[1][0], w[1][1]),
    ...(w.lunch || [
      B(k + "-lunch", "13:00", "13:45", "food", "Lunch", "Away from the desk. See Food for today's plate."),
      B(k + "-walk", "13:45", "14:00", "body", "Short walk outside", "Daylight resets the afternoon. No calls.", { cal: false })
    ]),
    B(k + "-w3", "14:00", "16:00", "work", w[2][0], w[2][1]),
    B(k + "-snack", "16:00", "16:15", "food", "Snack + stretch", "Fruit and nuts, stand up, refill water.", { cal: false }),
    B(k + "-w4", "16:15", "18:00", "work", w[3][0], w[3][1]),
    B(k + "-stop", "18:00", "18:15", "ritual", "STOP WORK", "Shutdown ritual: write tomorrow's top 3, close the laptop, send one message to a friend. Work ends here.", { tag: "stop", alarm: 10 })
  ];
  const night = (k, s) => [
    B(k + "-wind", s || "22:00", "23:00", "rest", "Wind down", "Screens off by 22:30. Pack the gym bag, read a book.", { alarm: 5 }),
    B(k + "-sleep", "23:00", "24:00", "rest", "Sleep", "8 hours. Same time every weekday, because the gym starts at 08:00.", { cal: false })
  ];
  const dinner = (k, s, e) => B(k + "-dinner", s || "20:00", e || "20:45", "food", "Dinner", "See Food for tonight.");

  const days = {
    mon: { name: "Monday", short: "Mon", theme: "Build week momentum", blocks: [
      ...morning("mon", "Strength A", "Push + core: bench or push-ups, overhead press, dips, plank."),
      ...workday("mon", [
        ["SimasiaAI deep work: pipeline & week plan", "Proposals and the week's sales plan. Notifications off, door closed."],
        ["SimasiaAI: client calls & needs analysis", "Listen first: what does this organisation actually need?"],
        ["SimasiaAI: delivery sync with Stergios & team", "Weekly priorities, blockers, go-live dates."],
        ["SimasiaAI: email & admin, batched", "Inbox to zero, invoices, scheduling. Shallow work lives here."]
      ]),
      B("mon-m1", "18:30", "20:00", "deep", "Mastery: applications", "Target 2 per week toward 10 by 17 Nov. Tailor the CV (industry or academic switch).", { tag: "mastery", alarm: 10 }),
      dinner("mon"),
      B("mon-eve", "20:45", "22:00", "rest", "Free evening", "Music, a series, cooking. Nothing to optimise.", { cal: false }),
      ...night("mon")
    ]},
    tue: { name: "Tuesday", short: "Tue", theme: "Clients and friends", blocks: [
      ...morning("tue", "Cardio & mobility", "30 min run or swim, then 20 min mobility. Light day for the muscles."),
      ...workday("tue", [
        ["SimasiaAI deep work: proposals & contracts", "Write and send. Every open deal gets a next step and a date."],
        ["SimasiaAI: client calls & follow-ups", "Calls and replies. Write down their exact words."],
        ["SimasiaAI: operations", "Delivery checklists, contracts, the part-time agreement draft."],
        ["SimasiaAI: email & admin, batched", "Close the loops from today's calls."]
      ]),
      B("tue-free", "18:15", "19:00", "rest", "Transition", "Shower, change, phone back to people mode.", { cal: false }),
      B("tue-friends", "19:00", "22:00", "people", "Friends night", "Dinner or coffee with a friend. Phone face down. Ask one real question.", { tag: "friends" }),
      ...night("tue")
    ]},
    wed: { name: "Wednesday", short: "Wed", theme: "Grow the pipeline, write", blocks: [
      ...morning("wed", "Strength B", "Pull + legs: rows, pull-ups or lat pulldown, squats, lunges."),
      ...workday("wed", [
        ["SimasiaAI deep work: prospecting", "New organisations: patient associations, disability groups, institutions."],
        ["SimasiaAI: calls & demos", "Demo, listen, write down their exact words."],
        ["SimasiaAI: client work", "Requirements, RAG design choices, human-centred evaluation."],
        ["SimasiaAI: email & admin, batched", "Inbox to zero."]
      ]),
      B("wed-m1", "18:30", "20:00", "deep", "Mastery: study + write a post", "Behavioural science reading, then one post (Build, Research, Speak or Write). Target 2 posts by 17 Nov.", { tag: "mastery", alarm: 10 }),
      dinner("wed"),
      B("wed-eve", "20:45", "22:00", "create", "Read for pleasure", "Fiction, poetry, or the book you're studying. No laptop."),
      ...night("wed")
    ]},
    thu: { name: "Thursday", short: "Thu", theme: "Deliver, then speak and write", blocks: [
      ...morning("thu", "Easy cardio or yoga", "Easy run, swim or a yoga class. For the head as much as the body."),
      ...workday("thu", [
        ["SimasiaAI deep work: client delivery", "Test the assistants like a user would. What did they misunderstand?"],
        ["SimasiaAI: client calls", "Check-ins with live clients."],
        ["SimasiaAI: operations", "Contracts, delivery dates, team support."],
        ["SimasiaAI: close the week's loops", "Everything opened this week gets an answer."]
      ]),
      B("thu-m1", "18:30", "19:30", "deep", "Mastery: talks & conversations", "Pitch one talk (target 1 by 17 Nov). Message one person doing the work you want to do.", { tag: "mastery", alarm: 10 }),
      B("thu-free", "19:30", "20:00", "rest", "Free", "Walk, call home, nothing planned.", { cal: false }),
      dinner("thu"),
      B("thu-write", "20:45", "22:00", "create", "Write: poetry", "Γράφω. Free writing, a poem, or a reflection. No editing tonight.", { tag: "write" }),
      ...night("thu")
    ]},
    fri: { name: "Friday", short: "Fri", theme: "Ship, then celebrate", blocks: [
      ...morning("fri", "Full body", "Deadlift or hip hinge, push, pull, carries. Finish the week strong."),
      ...workday("fri", Object.assign([
        ["SimasiaAI deep work: product & evaluation", "Ship one visible improvement to a client."],
        ["SimasiaAI: delivery", "Demos, fixes, go-lives."],
        ["SimasiaAI: client work", "What's left for this week's deliveries."],
        ["SimasiaAI: weekly wrap & inbox zero", "What moved, what slipped, next week's top 3. Leave nothing for the weekend."]
      ], { lunch: [
        B("fri-conv", "13:00", "14:00", "people", "Lunch with someone doing the work", "Behavioural science, communication, policy. Target 4 by 17 Nov. Ask: how did you get here?", { tag: "conversation" })
      ]})),
      B("fri-rest", "18:15", "20:00", "rest", "Rest before the night", "Shower, nap, music.", { cal: false }),
      dinner("fri"),
      B("fri-out", "21:00", "24:00", "people", "Friends / night out", "Social night. Enjoy it fully, work is closed.", { tag: "friends" })
    ]},
    sat: { name: "Saturday", short: "Sat", theme: "No work. Body, people, play", blocks: [
      B("sat-wake", "08:30", "09:00", "ritual", "Slow wake", "No alarm if you can. Water, coffee, window.", { cal: false }),
      B("sat-bf", "09:00", "10:00", "food", "Long breakfast", "See Food."),
      B("sat-out", "10:00", "12:30", "body", "Outdoors: hike, swim or long walk", "Mountain, sea or a new neighbourhood. A bonus training day.", { tag: "gym" }),
      B("sat-lunch", "13:00", "14:30", "food", "Lunch with friends or family", "Taverna or home. Share plates."),
      B("sat-rest", "14:30", "16:30", "rest", "Rest", "Nap, read, music.", { cal: false }),
      B("sat-hobby", "17:00", "19:00", "create", "Hobby: culture & curiosity", "Museum, cinema, theatre, a bookshop, or a new skill."),
      B("sat-night", "20:00", "24:00", "people", "Evening with friends", "Dinner out or at home. Invest in the people who matter.", { tag: "friends" })
    ]},
    sun: { name: "Sunday", short: "Sun", theme: "Write, prepare, review", blocks: [
      B("sun-wake", "08:30", "09:00", "ritual", "Slow wake", "Water, coffee, window.", { cal: false }),
      B("sun-bf", "09:00", "09:30", "food", "Breakfast", "See Food."),
      B("sun-write", "09:30", "11:00", "create", "Write: poetry & surprise notebook", "What surprised you this week? What did you enjoy? Notes feed your flow.", { tag: "write" }),
      B("sun-prep", "11:00", "12:30", "food", "Market + meal prep", "Cook one pot of legumes and one protein for Mon–Wed lunches."),
      B("sun-family", "13:00", "14:30", "people", "Family lunch / call home", "Call family in Crete if you're apart.", { tag: "friends" }),
      B("sun-free", "14:30", "17:00", "rest", "Free afternoon", "Friends, sea, rest. Your choice.", { cal: false }),
      B("sun-review", "17:00", "18:00", "deep", "Weekly review, money & plan", "Open Goals: score the week. Money: floor and target, savings toward 6 months. Check next week's calendar and pick 3 outcomes.", { tag: "review", alarm: 10 }),
      B("sun-walk", "18:30", "19:30", "body", "Evening walk", "Clear the head before the week."),
      dinner("sun"),
      B("sun-read", "21:00", "22:00", "create", "Read", "A book, not a feed."),
      ...night("sun")
    ]}
  };

  // Meals: Mediterranean, Greek kitchen. Breakfast comes after the 08:00 gym on weekdays.
  const meals = {
    mon: { b: "Greek yogurt, honey, walnuts, berries + 2 boiled eggs", l: "Revithia (chickpeas) with lemon, big salad, feta, wholegrain bread", s: "Apple + a handful of almonds", d: "Grilled chicken, roasted vegetables, rice" },
    tue: { b: "2–3 eggs, wholegrain toast, tomato, olive oil", l: "Fakes (lentils) with a splash of vinegar, salad, olives", s: "Yogurt with fruit", d: "Out with friends: grilled fish or meat + salad, share plates" },
    wed: { b: "Oats with milk, banana, cinnamon, a spoon of tahini + yogurt", l: "Baked fish, horta (greens), potatoes", s: "Pear + walnuts", d: "Homemade souvlaki: pita, tzatziki, salad" },
    thu: { b: "Yogurt bowl with honey, fruit, oats", l: "Fasolada (bean soup), sardines or feta, bread", s: "Carrots + hummus", d: "Vegetable omelette, salad, wholegrain bread" },
    fri: { b: "Eggs, avocado or tomato toast", l: "Lunch out with your conversation: grilled protein + salad", s: "Fruit + nuts", d: "Salmon or chicken, quinoa, greens (before going out)" },
    sat: { b: "Strapatsada (eggs with tomato), bread, coffee", l: "Taverna: mezedes to share, grilled protein, horiatiki", s: "Fruit", d: "Out with friends, or a light salad with cheese and bread" },
    sun: { b: "Yogurt, honey, fruit, a koulouri", l: "Family lunch: oven chicken & potatoes, salad", s: "Nuts or fruit", d: "Light: soup or salad; prepare Monday's lunch" }
  };
  const foodRules = [
    "Before the 08:00 gym: something small and easy (banana, toast with honey) and water.",
    "After the gym: protein breakfast within an hour (eggs, yogurt).",
    "Half the plate vegetables, a quarter protein, a quarter whole grains or legumes.",
    "Olive oil as the main fat. Legumes 3 times a week, fish twice.",
    "Water 2 litres a day; a glass at wake-up and before every meal.",
    "Coffee before 14:00 so it doesn't steal your sleep.",
    "Alcohol only on social nights, and slowly.",
    "Last meal at least 2 hours before sleep."
  ];

  const cats = {
    ritual: "Ritual", food: "Food", deep: "Mastery", work: "SimasiaAI",
    body: "Body", people: "People", create: "Create", rest: "Rest"
  };

  const goals = {
    lifeQuestion: "How can people live better lives, and what must we understand about ourselves, how we communicate and how we decide, to achieve it together?",
    lifeQuestionGr: "Πώς μπορεί ο άνθρωπος να ζήσει καλύτερα;",
    sprint: { end: "2026-11-17", items: [
      { k: "applications", t: "Applications sent", target: 10 },
      { k: "conversations", t: "Conversations with people doing the work", target: 4 },
      { k: "talk", t: "Talk pitched", target: 1 },
      { k: "posts", t: "Posts published", target: 2 },
      { k: "agreement", t: "SimasiaAI part-time agreement written", target: 1 }
    ]},
    weekly: [
      { tag: "gym", t: "Training sessions", target: 5 },
      { tag: "mastery", t: "Mastery evenings done", target: 3 },
      { tag: "stop", t: "Stopped work at 18:00", target: 5 },
      { tag: "friends", t: "Time with friends & family", target: 3 },
      { tag: "write", t: "Writing sessions", target: 2 },
      { tag: "conversation", t: "Conversation with a practitioner", target: 1 },
      { tag: "review", t: "Weekly review", target: 1 }
    ],
    stages: [
      { name: "Mastery", when: "Now – 2029", age: "28–31", moves: "Paid role close to people, behavioural science study (Track A) or funded PhD (Track B), talks, writing, SimasiaAI 20%.", gate: "Mastery proven, 6 months of savings" },
      { name: "Voice", when: "2030 – 2033", age: "32–35", moves: "Lead a team or practice, a Greek book on people, a podcast of conversations, invited keynotes, advise policy.", gate: "Invited to set standards, 12 months saved" },
      { name: "Public life", when: "2034 – 2036", age: "36–38", moves: "Decide on public office or found an institute, mentor, keep writing.", gate: "Review the whole plan in October 2036" }
    ],
    decision: { date: "2027-08-31", t: "Track A or Track B", d: "Take Track B only with a fully funded, MSCA-level offer on your question. Otherwise Track A." }
  };

  // One-off list for today, from your plan "Tomorrow (Sunday 18 October)"
  const oneOffs = { "2026-10-18": [
    { id: "o1", t: "Write the life question by hand" },
    { id: "o2", t: "Map your money: the floor and the target" },
    { id: "o3", t: "Make the loved / hated lists" },
    { id: "o4", t: "Block next week's calendar (import the routine)" },
    { id: "o5", t: "Draft the message to Stergios" },
    { id: "o6", t: "Merge website PR #3" },
    { id: "o7", t: "Start the surprise notebook" },
    { id: "o8", t: "Stop working at 18:00" }
  ]};

  // ---------- Apple Calendar (.ics) ----------
  const ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  // First occurrence of each weekday: Sun 18 Oct 2026 (today), then Mon 19 ... Sat 24 Oct.
  const FIRST = { sun: "20261018", mon: "20261019", tue: "20261020", wed: "20261021", thu: "20261022", fri: "20261023", sat: "20261024" };
  const addDay = (ymd) => { const d = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8) + 1)); return d.toISOString().slice(0, 10).replace(/-/g, ""); };
  const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const fold = (line) => {
    // fold at 74 UTF-8 octets, never splitting a character (RFC 5545)
    const bytes = (c) => { const n = c.codePointAt(0); return n < 0x80 ? 1 : n < 0x800 ? 2 : n < 0x10000 ? 3 : 4; };
    const out = []; let cur = "", len = 0;
    for (const ch of line) {
      const b = bytes(ch);
      if (len + b > 74) { out.push(cur); cur = " "; len = 1; }
      cur += ch; len += b;
    }
    out.push(cur); return out.join("\r\n");
  };
  function makeICS() {
    const L = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dimitris Papadakis//Daily Rhythm//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "X-WR-CALNAME:Daily Rhythm", "X-WR-TIMEZONE:Europe/Athens",
      "BEGIN:VTIMEZONE", "TZID:Europe/Athens",
      "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0300", "TZNAME:EEST", "DTSTART:19700329T030000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
      "BEGIN:STANDARD", "TZOFFSETFROM:+0300", "TZOFFSETTO:+0200", "TZNAME:EET", "DTSTART:19701025T040000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
      "END:VTIMEZONE"
    ];
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    for (const k of ORDER) {
      for (const b of days[k].blocks) {
        if (!b.cal) continue;
        const d0 = FIRST[k];
        const st = d0 + "T" + b.s.replace(":", "") + "00";
        const en = b.e === "24:00" ? addDay(d0) + "T000000" : d0 + "T" + b.e.replace(":", "") + "00";
        L.push("BEGIN:VEVENT", "UID:rhythm-" + b.id + "@dimitrispapadakis.gr", "DTSTAMP:" + stamp,
          "DTSTART;TZID=Europe/Athens:" + st, "DTEND;TZID=Europe/Athens:" + en, "RRULE:FREQ=WEEKLY",
          fold("SUMMARY:" + esc(b.t)), fold("DESCRIPTION:" + esc(cats[b.cat] + " · " + b.d)),
          "CATEGORIES:" + esc(cats[b.cat]), "TRANSP:" + (b.cat === "work" || b.cat === "deep" ? "OPAQUE" : "TRANSPARENT"));
        if (b.alarm) L.push("BEGIN:VALARM", "ACTION:DISPLAY", fold("DESCRIPTION:" + esc(b.t)), "TRIGGER:-PT" + b.alarm + "M", "END:VALARM");
        L.push("END:VEVENT");
      }
    }
    const once = [
      { id: "sprint-review", d: "20261117", s: "170000", e: "180000", t: "30-day sprint review", desc: "10 applications, 4 conversations, 1 talk pitched, 2 posts, SimasiaAI agreement. Score it and set the next 30 days." },
      { id: "decision-2027", d: "20270831", s: "100000", e: "110000", t: "Decision: Track A or Track B", desc: goals.decision.d }
    ];
    for (const o of once) {
      L.push("BEGIN:VEVENT", "UID:rhythm-" + o.id + "@dimitrispapadakis.gr", "DTSTAMP:" + stamp,
        "DTSTART;TZID=Europe/Athens:" + o.d + "T" + o.s, "DTEND;TZID=Europe/Athens:" + o.d + "T" + o.e,
        fold("SUMMARY:" + esc(o.t)), fold("DESCRIPTION:" + esc(o.desc)),
        "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(o.t), "TRIGGER:-P1D", "END:VALARM", "END:VEVENT");
    }
    L.push("END:VCALENDAR");
    return L.join("\r\n") + "\r\n";
  }

  const PLAN = { days, meals, foodRules, cats, goals, oneOffs, ORDER, makeICS };
  if (typeof module !== "undefined" && module.exports) module.exports = PLAN; else root.PLAN = PLAN;
})(typeof window !== "undefined" ? window : globalThis);
