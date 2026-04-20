# CLAUDE.md — Rhyme Crime

A comprehensive game design document for use as context in future Claude conversations.

---

## Project Overview

**Rhyme Crime** is a mobile word-guessing puzzle game for Android and iOS, built with React Native + Expo.

The player is a master word thief.
Every valuable thing in the world is protected by a **Rhyme Lock** — a security system cracked only by solving a riddle.
Each level is a heist.
The answer to each riddle is always two rhyming words.

The game's name is itself a hink pink (1 syllable each, rhyming)

---

## Core Mechanic

The game is based on **Hink Pinks** — a classic word puzzle format.

Each level answer is two words:
- Word 1 is an **adjective**
- Word 2 is a **noun** that the adjective describes
- Both words **rhyme** with each other
- Both words have the **same number of syllables**
- The riddle is a description that clues both words

**Examples:**
- "A rude female monarch" → **Mean Queen** (1 syllable each)
- "A picture of a hot bread-making device" → **Toaster Poster** (2 syllables each)

### Syllable count is ALWAYS shown upfront

This is fundamental to the hink pink format.
The syllable count is not part of the puzzle — it is the first clue given.
It is displayed prominently on the case file before the player attempts the lock.

### Difficulty Tiers

| Tier | Syllables | Lock Type | What You're Stealing |
|---|---|---|---|
| Misdemeanor | 1 syllable each | Basic padlock | Small valuables |
| Felony | 2 syllables each | Vault door | Priceless artifacts |
| Most Wanted | 3 syllables each | Rhyme Fortress | Legendary treasures |

---

## Game Structure

### Level Select — The World Map

A vintage illustrated world map.
Heist locations are pinned across the globe, escalating in prestige and difficulty as the player progresses.
Completed heists show gold pins.
The active target shows a pulsing red pin with an animated flight path connecting it to the last completed location.

Each location has a heist list below the map showing:
- Target item and location
- Difficulty tier badge
- Completion status (DONE stamp for completed heists)

### Trophy Room — The Vault

A trophy room showing all acquired treasures on illuminated display pedestals.
Completed heists place the stolen item visibly in the vault.
Locked future items show silhouettes with question marks, creating intrigue.
A net worth bar tracks cumulative value stolen.

The vault also shows a **Criminal Record** breakdown — how many Misdemeanors, Felonies, and Most Wanted heists have been completed.

### Gameplay Screen

Each level presents:
1. **Case file** with riddle text and syllable count
2. **A single text input** — the player types both words separated by a space (e.g. `toaster poster`). The adjective and noun are parsed at the first space character.
3. A **"Crack It"** button to submit — disabled until the field contains at least one space with text on both sides
4. **Wrong guesses log** showing previous incorrect attempts as strikethrough pills
5. **Crew strip** — fixed at the bottom of the screen above the keyboard, always visible
6. **Custom in-app keyboard** — replaces the iOS system keyboard entirely. Letters A–Z, SPACE, and backspace. The Extortionist's eliminated letters appear greyed out with strikethrough and are disabled.
7. **Egress riddle** — appears after all locks are solved if The Courier was not selected. Single-word input (no space), 15-second countdown. One answer word is pre-revealed; player supplies the other. Failure ends the heist.

---

## The Timer

Each level is timed. The timer's visibility depends entirely on The Handler's availability.

- **Handler available:** Timer always visible, countdown shown in full
- **Handler unavailable:** Timer flashes briefly at :45, :30, :15, and :00 on each minute.
  The final :03, :02, :01 are always visible.
  The rest of the time the display is hidden — the player knows time is passing but cannot see exactly how much remains.

---

## Consequences — Wrong Answers

Wrong answers do not immediately fail the level. Instead:

1. A **random crew member gets busted** — sent to jail or tangled in legal proceedings for a set number of heists
2. The wrong guess is logged in the **wrong guesses list** with strikethrough
3. If **all crew members are simultaneously unavailable**, the heist fails

The heist fails only when the crew is entirely wiped — this is the terminal failure state, not a wrong answer count.

**Max guesses formula:** `2 × number of locks + number of selected crew members`.
Selecting more crew gives more total guesses.
Displayed on the Heist Briefing screen with a colour-coded badge (red when at the floor, gold when low, green when comfortable).

**"The Kid"** is not a crew member.
The name appears only in the timer-expiry failure message as flavour: *"Time expired. The Kid called the abort."*

---

## The Crew

Six crew members, each interacting with a different layer of the Rhyme Lock system.
None of them know the answer — they only have partial intelligence based on their specific expertise.

### Passive Slot

One passive crew member can be selected per heist.
Before a heist begins, the player chooses either **The Handler** or **The Courier** as their passive operator for that op.
This is a loadout decision made on the briefing screen before entering gameplay.
Selecting one passive automatically deselects the other — only one can be active at a time.

- **The Handler** → timer stays visible throughout
- **The Courier** → egress is handled automatically

If neither is chosen (both unavailable or both deselected), the player enters without a passive: the timer flashes and an egress riddle appears at the end.

Passive crew members cannot be busted by wrong answers and do not contribute to the max guesses pool.

---

### The Extractor 🎩
**ID:** `fingers` | **Ability label:** First Letters

**Ability:** Highlights the first letter of each answer word on the custom keyboard in green.
The player sees which two letters to start from; the rest of the word is still on them.

**Bio:** Mid-fifties, weathered face, flat cap pulled low.
He has the kind of forgettable appearance that makes people comfortable — they relax around him, answer questions they hadn't planned to answer.
He's a pickpocket, con artist, and social engineer of the highest order, been doing it since he was eleven on the Deptford markets.
He'll get you what you need. He'll do it clean. He'll want paying promptly and he won't be making small talk about it.

**Justification:** He gets close to whoever manages access to the target — facilities staff, security contractors, the assistant who keeps passwords on a sticky note.
A bump in the corridor. A misdirected conversation. A moment of manufactured confusion.
Two letters: the ones the lock starts with. Not guessed. Lifted.

**Vacation message:** *"The Extractor is in Atlantic City. He says he'll be back when the chips run out. Back in 3 heists."*

**Bust message:** *"Got collared outside a pawn shop. He's saying nothing to nobody. Back in 4 heists."*

**Return message:** *"The Extractor is back. Doesn't say where he's been. You don't ask."*

---

### The Linguist 📚
**ID:** `linguist` | **Ability label:** Definition

**Ability:** Gives a dictionary definition of one of the two answer words (randomly selected, 50/50), without naming the word.
Definitions are curated per puzzle.
Message format: *"Partial decrypt secured. One word: [DEFINITION] — I'm billing for this."*

**Bio:** She had a tenure-track position at Oxford, two published monographs, and a reputation that made other academics nervous.
Then she got caught selling classified cryptographic research to the wrong people.
She's never confirmed the story. She hasn't denied it either.
She joined the crew for the money and has been making it very clear ever since that she's overqualified.

**Justification:** Every Rhyme Lock broadcasts an encrypted signal — a digital fingerprint.
She intercepts it and runs partial decryption.
She can't crack the word itself; the layering is too deep.
But the semantic data bleeds through. She gets the meaning, not the form.

**Vacation message:** *"She's presenting a paper at a conference in Geneva. 'Academic obligations,' she says. As if. Back in 2 heists."*

**Bust message:** *"Interpol flagged her passport. She's lecturing them on the flaws in their case. They're not listening. 3 heists."*

**Return message:** *"The Linguist is back. She looks insufferably pleased with herself."*

---

### The Extortionist 💎
**ID:** `rico` | **Ability label:** Cut 3 Letters

**Ability:** Eliminates 3 letters from the custom keyboard — red tint, strikethrough, disabled for input.
The 3 letters are chosen randomly from letters that do **not** appear in either answer word, so they are guaranteed safe eliminations.

**Bio:** Late fifties, looks like money — the old kind that doesn't announce itself. She dresses accordingly.
She has the bearing of someone who has sat across from difficult people in difficult rooms and waited them out.
Security guards, facility managers, contractors with gambling debts — she reads them before they've finished their first sentence and knows exactly which lever to pull.
Some get paid. Some get threatened. Most get both, sequenced carefully, and are left feeling like the outcome was their idea.
She doesn't work cheaply and she doesn't explain herself twice.

**Justification:** Lock installers document excluded characters for diagnostic purposes — regional settings, system constraints, client specifications.
She acquires this information through whatever combination of financial incentive and quiet pressure the situation requires.
The contacts always hand it over.

**Vacation message:** *"The Extortionist is unavailable. Her assistant says she's 'travelling for personal reasons.' Back in 3 heists."*

**Bust message:** *"A contact talked. She's dealing with the situation — not from a cell, but from somewhere inconvenient. Back in 4 heists."*

**Return message:** *"She's back. Whatever the problem was, it isn't anymore."*

---

### The Distractor 💃
**ID:** `distractor` | **Ability label:** Freeze Clock

**Ability:** Freezes the main timer for 15–25 seconds (random per use).
A cyan distraction countdown appears to the right of the frozen main timer.
When it hits zero, the main clock resumes.

**Bio:** Where the rest of the crew operates through precision or subtlety, she operates through sheer force of personality — equal parts charm and chaos.
She has started arguments, pulled fire alarms, impersonated health inspectors, and once drove a moped through a revolving door as a deliberate tactical decision.
She always gets away with it. Nobody has ever worked out how.

**Justification:** She works from outside — whatever the building needs to deal with, she provides it.
Fire alarms, domestic disturbances, suspicious packages, flash mobs organised that morning.
While the building scrambles, the clock stops.
How long depends on how far she decides to take it.
She doesn't plan it in advance. She reads the situation and acts.

**Vacation message:** *"The Distractor texted. One word: 'Ibiza.' Back in 2 heists, probably."*

**Bust message:** *"The distraction worked a little too well. They've got her. She seemed to be enjoying it though."*

**Return message:** *"She's back. Won't say what happened. Has a new coat and a very good story she's saving for later."*

---

### The Handler 🎧
**ID:** `handler` | **Ability label:** Passive

**Ability:** PASSIVE — always running in the background when available. No activation required.

**When present:** Timer is always visible. The countdown runs in everyone's earpiece in real time.

**When absent:** The timer shows a frozen snapshot that updates only at quarter-minute marks (:45, :30, :15, :00) and the final 3 seconds (:03, :02, :01), pulsing briefly when it updates.
The rest of the time the display is hidden.

**Bio:** He runs the whole operation from a car park two blocks away — laptop, police scanner, a burner that's been ringing since Tuesday.
Everything goes through him: countdowns, guard movements, entry signals.
When he's on the line you know exactly how much time you have.
When he goes dark, the silence is the worst part.

**Justification:** He counts down in everyone's earpiece.
The timer you see is his voice — calm, precise, relentless.
Without him on the line, all you get are flickers.

**Vacation message:** *"The Handler's gone quiet. He said something about a signal audit. You've stopped asking what that means. Back in 2 heists."*

**Bust message:** *"Someone ran a trace on the frequency. He cut the line the second he knew. He's fine — the operation isn't. Back in 2 heists."*

**Return message:** *"He's back on comms. The static's gone. You can breathe again."*

---

### The Courier 📦
**ID:** `courier` | **Ability label:** Passive

**Ability:** PASSIVE — always running in the background when available. No activation required.

**When present:** Egress is handled automatically after all locks are cracked. The heist completes normally.

**When absent:** After all locks are solved, an **Egress Riddle** appears — a full hink pink with one word pre-revealed.
The player must supply the rhyming partner within **15 seconds**.
Failure ends the heist even though all locks were cracked.

**Bio:** He doesn't crack locks. He moves things.
Fastest egress in the business — knows every service exit, loading dock, and camera blind spot in every city you've ever worked.
Never been caught carrying. Never asks what's in the package.

**Justification:** Every building has a Rhyme Lock on the exit too.
The Courier knows them all by heart — he's walked out of more places than most people have walked into.
Without him, you crack it yourself. In the dark. With fifteen seconds on the clock.

**Vacation message:** *"The Courier's on a private contract. Won't say who for. Back in 2 heists."*

**Bust message:** *"They spotted him at the loading dock. He burned the route but got clear. Cargo's on ice until he's back. Back in 3 heists."*

**Return message:** *"The Courier's back. He didn't say where he was. You didn't ask."*

---

## Crew Mood System

Each crew member has five mood states driven by an `incidents` counter.
Mood affects dialogue tone and visual indicators.

| Mood | Incidents threshold | Tone | Visual |
|---|---|---|---|
| Loyal | 0–2 | Warm, committed | Green dot |
| Irritated | 3–5 | Sarcastic, complaining | Gold dot |
| Angry | 6–8 | Openly hostile, demanding | Gold dot |
| Furious | 9–11 | Threatening, ultimatums | Orange dot |
| Mutinous | 12+ | One step from walking | Red dot |

Incidents are added on heist failure (1 per member present; 2 if they used their ability).
Incidents decrease on heist success — rolling back to the start of the current mood tier.
Maximum incidents is capped at **14**.
Crossing a mood threshold upward triggers a temporary Tilted period (see table below).

**Mutinous state:** The crew member issues an ultimatum — complete the next heist perfectly or they walk permanently.
A crew member quitting is a significant game event.

**Grievance mechanic:** Repeated busts caused by the player's wrong answers cause crew members to demand a bigger cut.
Their ability now costs more heists of absence when used.

**Example grievance messages:**
- *"The Extractor wants a bigger cut after last time. His fee just went up. Absence is now 5 heists."*
- *"The Extortionist has been talking. She wants double or she walks."*
- *"The Kid has been googling 'workers rights for criminals.' He wants paid time off. You're considering it."*

---

## Crew Status & Mechanics

### Status Definitions

Each crew member has one of five statuses at any given time, derived from their state and the current level.

| Status | Display Label | Trigger | Clears When |
|---|---|---|---|
| `ready` | READY | Default | — |
| `vacation` | VACATION | Used ability on a successful heist | Absence countdown reaches 0 (ticks on any heist start) |
| `laying_low` | LAYING LOW | Cover blown during a heist | Absence countdown reaches 0 (ticks on any heist start) |
| `cover_blown` | COVER BLOWN | Busted at a specific location | Loyalty spent via Master of Disguise (clears that location only) |
| `gone_awol` | TILTED | Crossed a mood threshold upward | Absence countdown reaches 0 (ticks on successful heists only) |

Status priority when multiple conditions apply: `cover_blown` > `gone_awol` > `vacation` > `laying_low` > `ready`.
Cover blown is level-specific — a member is only `cover_blown` at the location where they were busted.

### Tilted Thresholds

When a crew member's incidents counter crosses a mood threshold upward, they go Tilted for N successful heists:

| Threshold crossed | Tilted duration |
|---|---|
| Irritated (3) | 1 successful heist |
| Angry (6) | 2 successful heists |
| Furious (9) | 3 successful heists |
| Mutinous (12) | 4 successful heists |

The Tilted countdown only decrements on **successful** heists.
Vacation and Laying Low count down on **any** heist start (success or failure).

### Grievance Numbers

- **Failure, no ability used:** +1 incident to all present (non-cover-blown) crew
- **Failure, ability was used:** +2 incidents to all present crew
- **Success:** Incidents roll back to the start of the current mood tier (e.g. furious at 10 → rolls back to 9, not 0)
- **Maximum incidents:** 14 (hard cap)
- **Loyalty wipe:** Incidents reaching the irritated threshold (3+) wipes all banked loyalty

### Loyalty Mechanics

- Loyalty is earned **+1 per successful heist** when a crew member's incidents are at exactly 0
- Loyalty is **wiped to 0** whenever incidents reach 3 or above
- Loyalty is **spent** (set to 0) to clear a crew member's `cover_blown` status at one specific location
- Only one location is cleared per spend — if cover is blown at multiple locations, each requires a separate spend

---

## Crew Absence Narrative System

Every absence has flavour text written in second person to make the player feel responsible.

**Voluntary absence (ability used):** The crew member got their cut and is living it up.

**Involuntary absence (wrong answer bust):** A random crew member takes the heat for your mistake.

**Return:** Each crew member has a return message signalling they're back.

Messages are always framed to reinforce narrative consequence — *"The Extortionist is dealing with a situation. That's on you."*

---

## Reputation System

No wrong answers + no crew abilities used = Ghost run. The cleanest possible performance.

| Performance | Title |
|---|---|
| No wrong answers, no hints | Ghost |
| No wrong answers, hints used | Professional |
| 1–2 wrong answers, no arrest | Reckless |
| Arrests occurred | Heat Magnet |
| Perfect streak 5+ heists | Phantom |

Ghost runs leave a special ghost icon stamped on completed heist cards in the vault.
Collectors and perfectionists will obsess over completing their vault with all ghost stamps.

---

## UI Screens

### Gameplay Screen Layout (top to bottom)

1. **Top bar** — city name, location, dev unlock button, pause, abort
2. **Timer strip** — compact inline row: TIME label + countdown + progress bar + situational label
   (FLYING BLIND when Handler unavailable; frozen + cyan `💃 Ns` distraction countdown when Distractor is active)
3. **ScrollView** (flex, fills remaining space):
   - Lock cards — one per lock; collapsed/green when solved, expanded with riddle + input when active
   - Single text input — `adjective noun` placeholder, custom keyboard only (`showSoftInputOnFocus={false}`)
   - Crack It button — gold, full width
   - Egress riddle card — appears after all locks solved when Courier absent; shows pre-revealed word + live answer pill + ESCAPE button + 15s countdown
   - Wrong guesses — horizontal wrapping pills with strikethrough
   - Intel — crew hint messages with portrait icon
4. **Crew strip** — fixed row outside ScrollView, always above keyboard; one portrait card per selected crew member showing: portrait, short name, compact ThermometerBar (incidents), mood label, and an action area.
   Action area states:
   - **Gold ability button** — active member, ready to use
   - **ACTIVE pill** (green) — passive member (Handler/Courier) currently running
   - **EXPENDED** (gold border) — ability already used this heist
   - **COVER BLOWN** (red border) — busted during this heist
   - **TILTED / VACATION / LAYING LOW** — member unavailable mid-heist
5. **Custom keyboard** — fixed at bottom; A–Z + SPACE + ⌫; eliminated keys (The Extortionist) shown with red tint and strikethrough; highlighted keys (The Extractor) shown with green tint; SPACE disabled during egress phase

### Heist Result Flow

After a heist ends, the gameplay screen presents a sequence of full-screen result pages
(rendered via `StyleSheet.absoluteFillObject` with safe-area insets, not modals).
Each page shows an OK button that advances to the next step.

**Step 1 — Outcome**
Shows heist image, HEIST COMPLETE / HEIST FAILED title, lock answers (on success) or failure reason (on failure), and performance rating (Ghost, Professional, etc.).
Content is vertically centred.

**Step 2 — XP & Criminal Record** *(success only)*
Shows total XP, XP earned this heist, and Criminal Record breakdown by tier.
Skipped entirely on failure — there are no numbers to update.

**Step 3 — Debrief** *(only shown when there is something to report)*
Shows wrong guesses grouped by riddle — the riddle text appears as a header, with all wrong answers for that lock listed beneath it.
Only shows riddles the player never cracked.
Also lists crew members who were busted, went on vacation, or came back from being tilted.

**Step 4 — Crew Mood + Navigation**
Shows mood bar changes for any crew members whose incidents changed.
If there are no mood changes, buttons are centred vertically.
Buttons: RETRY HEIST (failure only) and BACK TO HEISTS.

### Heist Briefing Screen

Shown before each heist. Swipeable — three panels (previous heist, active heist, next heist) with the centre panel being interactive.

**Active panel shows:**
- Heist image, target name, location, difficulty badge
- Partial progress indicator (if any locks were previously cracked)
- **Passive operator section** — Handler and Courier toggle rows; selecting one deselects the other
- **Active crew section** — toggle rows for The Extractor, The Linguist, The Extortionist, The Distractor
- Each crew row shows: portrait, name, status badge, mood dot, ability description, and a loyalty/absence detail line
- **Max guesses badge** — `2 × locks + selected crew count`, colour-coded: red (at floor), gold (low), green (comfortable)
- **BEGIN HEIST** button (or SOLO if no crew selected)

Crew selection is seeded from the last used selection filtered to currently available members (see Crew Selection Persistence).

### ThermometerBar

A visual component used throughout the game to show a crew member's incident level relative to mood thresholds.

- **5 threshold nodes** at positions proportional to `MAX_INCIDENTS (14)`: Loyal (0), Irritated (3/14), Angry (6/14), Furious (9/14), Mutinous (12/14)
- **Animated fill** with gradient from green → gold → orange → red
- **Two sizes**: normal (used in Crew tab and result MoodBar) and compact (used in Crew Strip during gameplay)
- **Optional labels** showing mood names at each threshold node

### Crew Selection Persistence

The player's last crew selection is stored in `GameStateContext` as `lastCrewSelection` (array of IDs).
When opening `HeistBriefingScreen`, the selection is seeded from `lastCrewSelection` filtered to members who are currently available.
If none of the previous selection are available, falls back to the default (all ready members).
Selection is saved via `saveCrewSelection` when the player hits Begin Heist.

### Colour Palette

- Background: `#04040A` (near black)
- Primary dark: `#080810`
- Gold accent: `#C9A84C`
- Gold light: `#E8C97A`
- Cream text: `#F0E6D0`
- Red threat: `#C0392B`
- Green safe: `#27AE60`
- Muted text: `#444438`

### Typography

- Display/headings: Playfair Display (serif, italic, 700/900)
- UI labels: Special Elite (mono-style, all caps, letter-spaced)
- Body/data: Courier Prime (monospace)

---

## Monetization

**Model:** Freemium with no ads, no energy systems, no pay-to-skip.

**Free tier:**
- First 2 cities (Paris, London) — all Misdemeanor levels
- Full crew available
- No ads

**Paid unlocks:**
- Additional cities as one-time purchases ($0.99–$1.99 each)
- Full "World Tour" bundle unlocking everything ($4.99–$6.99)

**Optional:**
- Cosmetic vault themes
- Crew outfit variants
- Alternative heist card styles

**Soft paywall:** When a crew member is busted or on vacation, players can pay a small amount to get them back instantly.
Optional — never required to complete any level.

**What to avoid:**
- Energy systems (waiting to play)
- Pay to skip puzzles
- Loot boxes
- Subscription model
- Ads of any kind (breaks the noir aesthetic)

---

## Crew Artwork

Character art lives in `assets/crew/`. Each crew member can have up to three variants:

| File pattern | Use |
|---|---|
| `{id}-face-transparent.png` | Circular portrait in crew cards, intel hints, result screen (transparent bg) |
| `{id}-bust-transparent.png` | Upper-body illustration for crew detail screen header (transparent bg) |
| `{id}.png` | Full-body art for future character/vault screens |

The `CrewPortrait` component (`src/components/CrewPortrait.js`) handles the image-or-emoji fallback.
The `PORTRAITS` map inside it uses static `require()` calls — add an entry there when new art is available.
The full image set is also registered in `src/data/crewImages.js` for screens that need bust or full variants directly.

**Current art:** The Distractor (all three variants). All other crew members fall back to their emoji.
Crew: The Extractor (🎩), The Linguist (📚), The Extortionist (💎), The Distractor (💃), The Handler (🎧), The Courier (📦).

---

## Crew Member Detail Screen

Accessible by tapping any crew card on the Crew tab. Pushes onto a stack navigator (CrewStack) within the Crew tab.

**Layout (top to bottom):**
- Large bust portrait (65% of screen width, transparent background, dark bg behind it) — or large emoji if no art
- Name, status badge, mood badge, absence countdown
- **Background** card — character bio paragraph
- **Ability** card — ability name (gold) + in-universe justification
- **Record** card — heists participated, ability uses, essential heists (ability used + success) with success rate %, loyalty banked, cover blown location count
- **Cover Blown** card — only shown if any level busts exist; lists each as "City — Target"
- **Accolades** card — only shown for non-passive members with at least one essential heist; lists every heist where the ability was used on a successful run, showing target name + city

**Stats tracked in GameStateContext per crew member:**
- `heistsParticipated` — incremented for all selected crew at every heist end
- `abilityUses` — incremented when ability fires
- `essentialUses` — incremented when ability fired AND heist succeeded
- `essentialHeists` — array of level IDs where ability was used on a successful heist (deduped; used to populate Accolades)

---

## Data Architecture

Level content is managed through two Excel files in `app/src/data/`:

### `rhymes.xlsx`

The puzzle pool. Four sheets by syllable count: Misdemeanor (1), Felony (2), Most Wanted (3), Most Wanted (4).
Columns: `#`, `RIDDLE`, `WORD 1 (Adjective)`, `WORD 2 (Noun)`, `NOTES`, `STATUS`.
Only rows with STATUS `✅ Approved` are exported. Each approved row gets a stable ID.

**Sync:** `npm run sync-rhymes` → outputs `rhymes.json`.

### `heists.xlsx`

Single source of truth for all heist configuration.
Columns: `COUNTRY`, `CITY`, `HEIST ID`, `TARGET`, `LOCATION`, `STATUS`, `RHYME SEQUENCE`.
120 rows (30 countries × 4 slots: rt1, rt2, rt3, absurd).

**`RHYME SEQUENCE`** is a comma-separated list of syllable counts — one number per lock.
The total difficulty of a heist is the sum of all values in the sequence.

Examples:
- `1` → one Misdemeanor lock (difficulty 1)
- `2,3` → Felony + Most Wanted (difficulty 5)
- `3,4,4` → Most Wanted + two Public Enemy locks (difficulty 11)

Syllable → difficulty name: `1` = misdemeanor, `2` = felony, `3` = most-wanted, `4` = public-enemy.

**No sync command needed.**
`metro.config.js` watches `heists.xlsx` and automatically regenerates `heists.json` whenever the file is saved.
Metro then hot-reloads the app.
To add or change a heist's locks, edit the `RHYME SEQUENCE` cell and save.

`heists.json` is the generated runtime file consumed by `src/data/levels.js`.
It contains locks as `{ syllables, difficulty }` — no riddle or answer embedded.

### Runtime rhyme assignment

Rhymes are assigned randomly at the moment a heist begins, not in advance. The logic lives in `GameStateContext`:

- **`getOrAssignRhymes(level)`** — called at the start of `GameplayScreen`.
  For each lock slot `{ syllables, difficulty }` in the level, picks a random rhyme from `rhymes.json` matching that difficulty.
  Avoids rhymes already used in completed heists and rhymes currently assigned to other in-progress heists.
  Falls back progressively if the exact pool is empty: same syllables ignoring used → same syllables any difficulty → any rhyme.

- **`clearRhymeAssignment(levelId)`** — called at the end of `handleFailure` (covers timer expiry, guesses exhausted, egress failure, and abort).
  Removes the cached assignment without adding IDs to `usedRhymeIds`, so the next attempt draws a fresh random set from the full available pool.

- **`markRhymesUsed(levelId)`** — called automatically by `recordHeistCompletion` on success.
  Moves the assigned rhyme IDs into the permanent `usedRhymeIds` set so they never appear in any future heist.

- **`usedRhymeIds`** — ref (not state) tracking rhyme IDs permanently retired by completed heists.

- **`heistRhymeAssignmentsRef`** — ref tracking active assignments for in-progress heists `{ [levelId]: rhyme[] }`.
  Populated by `getOrAssignRhymes`, cleared by `markRhymesUsed` on success or `clearRhymeAssignment` on failure/abort.
  Refs are used instead of state because nothing in the UI renders from these values.

---

## Tech Stack

- **Framework:** React Native + Expo
- **Target platforms:** Android and iOS
- **Distribution:** Google Play ($25 one-time) + Apple App Store ($99/year developer account, requires Mac)

### Key Technical Challenges

- **Rhyme detection:** Use CMU Pronouncing Dictionary to compare phoneme endings
- **Syllable counting:** Same dictionary provides syllable counts
- **Level content:** Hand-curated for quality — Claude can assist generating hink pink pairs at scale

### Recommended Build Order

1. Static prototype — hardcode 5 levels, build UI flow
2. Input + validation — two text fields, Crack It button, rhyme and syllable checking
3. Crew system — abilities, absence tracking, mood states
4. Level progression — world map, vault, unlock system
5. Polish — animations, sound, crew dialogue system
6. Deploy — Expo build to TestFlight + Google Play beta

---

## Name & IP

**Game name:** Rhyme Crime

**Why it works:**
- It is itself a hink pink (1 syllable each, they rhyme)
- Double meaning: the rhyme is the crime (stealing) and the rhyme solves the crime (cracking the lock)
- No existing app by this name found on Google Play or App Store (as of April 2026)
- No registered trademark found for this name in a games context

**Recommended IP steps:**
1. Search USPTO (tmsearch.uspto.gov) directly for "Rhyme Crime"
2. Register rhymecrime.com domain
3. File trademark when game gains traction

---

## Open Design Questions

- Bust/fail screen design (heist failure animation)
- Level complete screen design (treasure acquisition animation)
- Crew notification/message delivery UI
- Sound design direction
- Onboarding flow for new players unfamiliar with hink pinks

---

## Future Features (Parked for Later)

### Completed Level Archive

Players can revisit the hink pink answers from any level they have previously completed.
Accessible from the vault or from the heist card itself.
Useful for sharing answers with friends, reminiscing about favourite puzzles, and providing a sense of accumulated achievement.

### Favourites List

Players can star any completed hink pink to add it to a personal favourites list.
Administered by a star icon on the completed heist card or in the archive view.
The favourites list lives in the vault as a curated sub-collection — the word pairs the player found most satisfying, funny, or clever.

### Day Streaks

Track consecutive days on which the player completes at least one heist. Displayed on the home/map screen.
Losing a streak (missing a day) should feel meaningful but not punishing — consider a streak freeze mechanic or a grace period.
Streak milestones could unlock cosmetic rewards or crew dialogue acknowledging the run.

### League System

Weekly league progression based on XP earned.
Players are promoted or demoted between league tiers based on their weekly XP total relative to other players in their bracket.

**XP formula:**

Base XP is determined by syllable count, then modified by performance:

| Difficulty | Syllables | Base XP |
|---|---|---|
| Misdemeanor | 1 each | 10 XP |
| Felony | 2 each | 25 XP |
| Most Wanted | 3 each | 50 XP |

Performance modifiers applied on top of base XP:

| Condition | Modifier |
|---|---|
| No wrong answers, no hints used (Ghost) | +100% bonus |
| No wrong answers, hints used | +40% bonus |
| 1 wrong answer | −10% |
| 2 wrong answers | −20% |
| 3+ wrong answers | −30% |
| Each crew hint used | −5% per hint (stacks) |

Modifiers combine — so a Felony (25 XP base) solved with no wrong answers but two hints used would be: 25 × (1 + 0.40 − 0.10) = 32 XP.
A Ghost run on Most Wanted (50 XP base) with no hints would be 50 × 2.0 = 100 XP.
Wrong answers and hints stack against each other, so a messy run with multiple wrong answers and multiple hints used can still net reasonable XP — the floor should never feel punishing enough to discourage casual players.

Minimum XP awarded for any completed level: 5 XP regardless of modifiers, so players always feel forward progress.

Ghost runs (no wrong answers, no crew abilities used) should award an XP bonus on top of the base difficulty value, rewarding clean play within the league system.

League tiers should be named thematically — for example: Pickpocket → Burglar → Thief → Mastermind → Phantom.
Promotion and demotion happen at the end of each weekly cycle.
The league screen should show the player's current standing, XP progress toward promotion, and how far above the demotion zone they are.
