# crafting-a-beautiful-website

How a calm, trustworthy one-page website gets made for a real client: from the first briefing to the version she approved, round by round.

This folder holds the code of a **real project with a real client**, a clinical psychologist in Brazil who works online and only with women. Nobody wrote the site in one go. It came out of several rounds of briefing and information gathering, a moodboard, four copies and four designs shown side by side, a meeting where she picked pieces from each, and incremental passes until the copy and the design both felt like her.

**The final variation is design E with copy 5:** [`copy/5-copy-4-no-design-e.md`](copy/5-copy-4-no-design-e.md) + [`copy/paginas-5.md`](copy/paginas-5.md), rendered by [`prototipo/src/styles/temas/e.css`](prototipo/src/styles/temas/e.css) and served at **`/e/5/`** when you [run the prototype](#running-it). The live preview stays private because it carries the client's real name and contact details.

> **What was redacted.** The client's name, professional registration number, phone, email, domain, photo, the schools and teachers in her résumé, and the internal notes at the top of each copy file (they quoted private recordings and documents). Names became `Nome Sobrenome`, contacts became `example.com` and `00` numbers, and her photo became a CC0 crop. **Her copy stayed:** it is the text she approved, and the whole point of this class is to show how it got there. Everything is in Portuguese, like the site.

## Contents

1. [The process, step by step](#the-process-step-by-step)
2. [What I learned, in one list](#what-i-learned-in-one-list)
3. [The code](#the-code)
4. [Running it](#running-it)

---

## The process, step by step

Weeks count from the project's own schedule: week 0 is the week right after the kickoff. The whole project, from kickoff to QA, took about nine weeks.

| When | Step | Main output |
|---|---|---|
| Before the project | [1. Briefing](#1-briefing) | The real goal: stop explaining her work in layers |
| Before the project | [2. Proposal](#2-proposal) | 5 stages, 26 to 30 hours, 3 navigable variations |
| Just before week 0 | [3. Kickoff](#3-kickoff) | Site structure, the rules of the professional council, first copy ideas |
| Week 0 | [4. Schedule and infrastructure](#4-schedule-and-infrastructure) | 3 meetings, provisional page live, hosting plan |
| Week 1 | [5. Meeting 1: moodboard, voice, FAQ](#5-meeting-1-moodboard-voice-and-faq) | Visual axes, voice rules, spoken FAQ answers |
| Weeks 2 and 3 | [6. Async material](#6-async-material-after-meeting-1) | 11 voice notes, her bio, her photo, a change of visual direction |
| Weeks 6 and 7, over 5 days | [7. Transcription and extraction](#7-transcription-and-extraction) | Every recording turned into searchable, linked text |
| Week 6, 1 day | [8. Copy round 1](#8-copy-round-1-four-whole-sites-of-text) | Four complete copies with different lines, a draft FAQ |
| Weeks 6 and 7, over 4 days | [9. Design round 1](#9-design-round-1-a-navigable-grid) | A prototype with designs A to D × copies 1 to 4 |
| Week 7, the day of meeting 2 | [10. Copy review](#10-copy-review-by-a-copywriter) | Outside feedback from a copywriter |
| Week 7 | [11. Meeting 2](#11-meeting-2-she-sees-the-site) | Design A and copy 4 chosen, with pieces from the others |
| Weeks 7 and 8, over 4 days | [12. Round 2](#12-round-2-design-e-and-copy-5) | Design E (A adjusted) and copy 5 (copy 4 adjusted) |
| Week 8, 2 days | [13. Fine-tuning in place](#13-fine-tuning-in-place-switchers-and-measurement) | Switchers in the hero, analytics, current-section menu |
| Week 8, 1 day | [14. QA](#14-qa) | Must-fix list done, the rest waits for her review |
| From week 9 | [15. Her review and handover](#15-her-review-and-handover) | Async questions, photographer brief, mirror repo |

### 1. Briefing

A conversation recorded in three parts, before any proposal. She works by referral and has no Instagram. Every new person asks what she does, and she explains it again, in layers, then sends a long text over WhatsApp. She wanted one central place that explains her work and needs no maintenance.

**What I learned:** the client asked for "a site", but the job was **"stop having to explain myself"**. That shaped everything later: one page that reads top to bottom, two deeper pages for those who want more, and a single contact button (WhatsApp), because that is where her conversations already happen.

### 2. Proposal

Five stages: setup (domain and hosting), briefing and review meetings, **moodboard and visual direction**, rewriting her text for the web, **three navigable page variations** to compare, and the finishing work (subtle animation, image optimization, SEO, visit statistics, tests on phone and computer). Estimate: 26 to 30 hours. The price was fixed at the minimum, and any extra hours would be settled as an exchange instead of an extra bill.

**What I learned:** promising *navigable variations* instead of static mockups sets the expectation that she will judge the real thing, with her text inside, on her own phone. That turned out to be the most valuable promise in the proposal.

### 3. Kickoff

A long meeting that fixed the structure: one page with 8 sections (opening, approach, who listens to you, what makes us sick, women's health, complementary knowledge, FAQ, invitation) plus two deeper pages. The machine transcript came out badly degraded, so it was rebuilt into 26 thematic blocks with timestamps, plus a table of passages to double-check against the audio.

Decisions that came out of it:

- **The professional council (CFP).** Psychologists in Brazil cannot offer practices outside psychology as treatment. Her Ayurveda and Yoga studies stay on the site only as *study that widens her view*, never as something offered in sessions. Titles like "Ayurvedic psychologist" are out.
- **An exercise with five possible openings.** She approved only one: a concrete question about sleep, food and the cycle. The poetic "alchemy of knowledge" opening she liked moved to the complementary-knowledge section.
- **Vetoes:** the word "defect" (her request), anything about in-person sessions ("don't put anything"), and "feminist" out of the menu and the headline (the word stays in the body). Later rounds added more: no pain or suffering on the first screen (from a voice note), and no marketing formulas or slogan words (mine).
- **The menu changed.** "A feminist view" became "What makes us sick", and "Who listens" became "Who listens to *you*".

**What I learned:** write down the vetoes as rules the moment they are said. Several of them ("defect", in-person sessions, no pain on the first screen) came back in every later round, and having them as a checklist saved me from reintroducing them.

### 4. Schedule and infrastructure

The schedule became **three meetings** (planned for weeks 1, 5 and 8) with everything else being my work. Meeting 2 ended up happening in week 7. Week 0 was for putting the domain online with a provisional page, so the address would become a site before any content existed. It also listed, in one table, what depended on her and by when (a short bio, a photo, two or three real WhatsApp messages with clients, her choice of design).

Infrastructure, decided in a separate design session:

- **Repository:** private, in my account, with a one-way mirror in her account that the host builds from. At handover the mirror becomes the source, so she is independent and I keep the history.
- **Hosting:** Cloudflare Workers with static assets. Only `main` publishes, there are no preview branches.
- **Analytics:** [Umami](https://umami.is) instead of Google Analytics. It is free, simple for her, and needs no cookie banner.
- **Google Business Profile** as a service area, without a public address.
- **Independence after delivery:** an AI agent on her computer, so changing a word or a photo is a conversation and not a call to me.

**What I learned:** a few dense meetings with homework in between work better than many short ones for a client with a full agenda. The homework table did more for the deadlines than any reminder.

### 5. Meeting 1: moodboard, voice and FAQ

The densest meeting, prepared as a script with the agenda in order and the materials at hand. The Google Business Profile setup was moved out of it to fit 1h30.

- **Live moodboard.** I built a local HTML page with two parts: the references she had sent, then sites of other psychologists and therapists, with a short message sent to her WhatsApp before each part. The script for each reference was to ask *"what exactly caught your attention?"*, never *"did you like it?"*, to mark the visual axes (color, type, kind of image) on the side as we talked, to stop at one reference to find the right tone of purple with her, and to close with the favorites side by side so she could name what they had in common. The meeting ended with a top three.
- **Her voice.** Real WhatsApp messages and voice notes she had exchanged with new clients, used to calibrate how the site talks. That gave the most important rule for the copy: the subject pronoun is **"você"** with the verb agreeing ("o que você sente"), while possessives and object pronouns use **"tu"** forms ("teu", "tua", "te"), exactly as she writes. Never "tu" with a verb, never "vc".
- **FAQ by speaking.** She chose the relevant questions and answered them out loud. The recording became the text later, so she did not have to write anything.
- A quick test of first-screen variations in the browser.

**What I learned:** asking *what* someone noticed, instead of *whether* they liked it, turns taste into decisions you can design with. And her real messages to clients were a better voice guide than any adjectives she could have given me.

### 6. Async material after meeting 1

In the two weeks after meeting 1 she sent **11 WhatsApp voice notes**, a written "about you" text and a photo. In those notes she moved away from the top three of meeting 1, so the three designs follow what she said *after* the meeting, not the ranking from it:

| Design | Name | Direction | Reference |
|---|---|---|---|
| A | Folha | Gray and neutral, with the green coming from photos of plants | myeverroot.com |
| B | Lilás | White and clean, a light lilac and line drawings instead of photos | relacoesemterapia.com.br |
| C | Amanhecer | Light neutral with a single sun tone and dawn landscapes | renatamiguez.com.br, anabeatrizweller.com.br |

**What I learned:** when two statements contradict each other, **the most recent wins**, and an ambiguous one becomes a question instead of a guess. One ambiguous voice note (which reference site she meant) was settled without asking her, because design C worked under both readings.

### 7. Transcription and extraction

Every recording was transcribed locally with Whisper large-v3, then cross-checked: two acoustic models (wav2vec2) and Whisper large-v2 re-heard the doubtful passages, and the passes were aligned word by word. The reviewed transcripts were split into linked blocks, and each meeting got an **extraction**: what was decided, with the full quote and a link to the exact moment, what was proposed and undone, and what stayed open.

Two small scripts kept this honest:

- an **authorship analysis** that measures, word by word, how much of each copy comes from her written text, from her spoken words, or from me;
- a **citation and link checker** that flags quotes in the notes that do not exist in her texts and links that point nowhere.

**What I learned:** most of the "brief" of a small client lives in recordings, not documents. Turning the audio into linked, searchable text is what made it possible to defend every sentence on the site with *"she said this, here"*.

### 8. Copy round 1: four whole sites of text

Each copy is **the entire site**, all 8 sections plus the two deeper pages, written along a different line so she could compare whole experiences, not isolated sentences:

| Copy | Name | Line |
|---|---|---|
| 1 | Encontro | Direct and short: affirmative sentences, no questions, no metaphors |
| 2 | Pontes | Warm and poetic, made almost only of her own words |
| 3 | Olhar integrativo | Explanatory: every strong sentence comes with another that says what it means |
| 4 | Vínculos | Her written text almost unchanged, with the titles she gave it (about 93% hers) |

Copy 4 was added last, after the authorship script showed that even the closest copy was only 84% her text. The FAQ had 15 draft questions, and answers with nothing of hers behind them were marked `(sem fala dela)` so nobody would mistake them for her words. Anger, a theme she wanted "as a note", stayed in only two copies, in two different ways, so she could compare.

**What I learned:** measure fidelity instead of assuming it. The first three copies felt faithful to me and still drifted. Giving her one option that is *almost literally her text* made the meeting easier, because she could react to her own words on a real page.

### 9. Design round 1: a navigable grid

An [Astro](https://astro.build) site that reads the copies straight from the markdown files in [`copy/`](copy/) and renders each one in each design. Editing a copy file updates the prototype immediately. The index page shows one card per copy with the four designs as links, and a bar at the bottom of every page switches design and copy without leaving the section you were reading. The dev server opens on the local network, so the client could test on her own phone.

- **Photos:** CC0 images from StockSnap, chosen from what she described in the voice notes (plants in gray and green, a leaf with veins that looks like a brain, tea and books, dawn over mountains and sea). [`prototipo/IMAGENS.md`](prototipo/IMAGENS.md) links each original.
- **Design D, Horizonte**, came from my critique of C and her ask in a voice note for "more gray, more neutral" and less beige: gray instead of cream, one typeface with a book-like feel, and the opening photo in a half disc over a horizon line.
- **Published** as a private preview (a Cloudflare Worker with `robots.txt` blocking everything) and then fixed for phones: the registration number no longer breaks in half, one WhatsApp button per screen, no single word alone on the last line.
- **Same components and content model as the official site**, so whatever she chose could move there without rework.

**What I learned:** a design × copy grid lets the client separate "I like this look" from "I like these words". Seeing her text inside every design kept the conversation about the site and not about mockups.

### 10. Copy review by a copywriter

Before meeting 2, a copywriter read the four copies. Her points:

- copy 4's headline was the strongest;
- the second section of every copy started with "my", "mine". It should talk about what the reader gains, not about the psychologist;
- there was no rhythm: no bold, no variation in type, and the "my trajectory" text was a wall.

**What I learned:** an outside reader catches what the author and the client are too close to see. When her feedback clashed with what the client wanted, the client won, and having that rule up front avoided a lot of back and forth.

### 11. Meeting 2: she sees the site

She browsed the four designs and the four copies, on the computer and on the phone. What came out (33 points in total):

- **Design A** (Folha), adjusted: no line-break "dash" before titles, less space between sections, buttons in the style of the reference site, a three-column footer, a darker invitation band, and the green-beige of the footer reused in the other darker bands.
- **Copy 4** as the base, **with pieces of the others section by section**: the running text of the approach from copy 2, the title of women's health from copy 3, her own phrasing for "your food, your relationships and the choices of your lifestyle are elements of your mental health".
- **Criticism without a ready answer:** the trajectory was "a scary long text nobody would read", the approach was repetitive and self-centered, and the icons did not talk to the text.
- **The deeper pages must be her text, in her order.** She said it twice. The design adapts to the text, not the other way around.
- A phrase she loved, "O caminho começa dentro", had to find a place, ideally in the opening.
- **Every clickable element should be measured.**

After the meeting, an AI extraction of the recording was compared with **my own manual extraction**. Of 30 comparable points, the AI got 16 right, 8 partly, missed 4 and got 2 wrong. The reasons were specific:

1. It treated the existing prototype as proof, marking requests as "already done" because something similar existed.
2. Its "before → after" format dropped criticism that had no ready solution.
3. It was organized by copy section, so anything outside the copy (analytics, layout) had nowhere to go.
4. It could not see the screen, so a text she read aloud was attributed to the wrong source.
5. The transcript lost short "yes" replies, and with them some decisions.
6. It kept only her last word and hid how she got there.

**What I learned:** for the next projects, record the screen with the audio, record one track per person, say anchors aloud ("now I'm on copy 2, approach"), and end with a spoken summary she confirms. Extract in three passes: a chronological log of every evaluative remark first, then map each remark to a fixed list of categories (text, layout, components, color, icons, images, interaction, deeper pages, technical), then a per-point timeline when she changes her mind. **What already exists is never evidence of what was asked.**

### 12. Round 2: design E and copy 5

- **Design E** is design A rebuilt with everything from meeting 2: new header and buttons, the darker bands, the Djamila Ribeiro quote centered at the start of "What makes us sick", a three-column footer, and a "Who listens to you" section where the trajectory and the education list sit behind two tabs, in blocks instead of a wall of text.
- **Copy 5** is copy 4 with the decisions from meeting 2 applied. The deeper pages ([`copy/paginas-5.md`](copy/paginas-5.md)) were redone with her written text, in her order.
- A parallel **variation 6** applied the copywriter's review on top of copy 5. It was dropped: where it clashed with what the client had decided, the client won, and only a few finishing touches survived into copy 5.
- Tests on real devices: on an iPhone SE the first-screen button was hidden behind the browser bars, and the title over the fern photo had about 3:1 contrast. Both were fixed (the title reaches at least 11.5:1).

**What I learned:** consolidating into one variation and deleting the others is a decision in itself. Keeping the old designs and copies around made comparisons possible, but the final pass only went fast once a single version was being polished.

### 13. Fine-tuning in place: switchers and measurement

Instead of shipping more full variations, the last open questions were tested **inside the final page**. A hidden panel in the opening ([`prototipo/src/scripts/abertura.ts`](prototipo/src/scripts/abertura.ts)) switches the WhatsApp button style, the "Get to know my approach" link, where the "O caminho começa dentro" phrase sits, and the opening height. Each choice can also be set in the address (`?botao=cheio`, `?frase=foto`, `?aviso=0`…) and is remembered in the browser. The panel starts hidden and opens with a button or **Ctrl+Shift+U**, so the client sees a clean page unless she asks for the options.

Other work in this step:

- **A current-section menu** ([`secao-atual.ts`](prototipo/src/scripts/secao-atual.ts)): the item of the section at eye level (40% of the screen) is marked, a clicked item stays marked while the page scrolls to it, and after the FAQ a thin line circles the WhatsApp button in the menu.
- **Analytics** ([`analytics.ts`](prototipo/src/scripts/analytics.ts)) on top of Umami: every click with where it happened, scroll depth, sections seen, time with the tab visible, and reading time per section. With `?analytics=debug` the events show in the console.
- **A full-screen mobile menu** ([`menu.ts`](prototipo/src/scripts/menu.ts)) that traps focus while open and returns it on close or Esc.

**What I learned:** once the big choices are made, small options are cheaper to compare *in place* than as separate pages, and a shareable URL for each combination makes async feedback precise.

### 14. QA

A technical and design review, sorted into **must**, **should** and **polish**. All the must-fix items and the first should item were done: larger text for readers over 40 with the line length measured in letters, visible focus rings on filled buttons, contrast of the menu label over the photo, the menu closing when the screen widens, consistent margins, the opening text not falling on the fern on tablets, one column for women's health with the photo following the scroll.

The rest (responsive image sizes, font preloading, reduced motion, 44 px touch targets, a few breakpoints) was **deliberately paused** when she started reviewing the prototype.

**What I learned:** polish before the client's feedback is polish you may redo. Stop at "nothing is broken", hand it over, and resume after her round.

### 15. Her review and handover

- **Async questions.** Everything she can decide without a meeting goes into one shared document. Each item shows what is on the site now, what that causes (as "she reads / she finds"), and options A, B and C with my recommendation. Written to her, in the second person, without internal notes.
- **Photographer brief.** The eight images of design E, with where each goes, what to shoot, proportion, minimum size and how to deliver, measured on the site at four screen widths, plus a framing guide for the three images that get cropped the most.
- **Handover.** The approved copy and design move to the official repository (not this prototype). It is mirrored to her account, the host builds from the mirror, and at delivery the mirror becomes the source and she continues alone with the help of an AI agent.

---

## What I learned, in one list

1. **Find the real job behind the request.** "A site" meant "stop explaining myself".
2. **Turn vetoes into rules the moment they are said**, and check every round against them.
3. **Ask what caught their attention, not whether they liked it.**
4. **Calibrate the voice with real messages to clients**, not adjectives.
5. **The most recent statement wins; ambiguity becomes a question, not a reading.**
6. **Recordings are the brief.** Transcribe, cross-check, link every quote to its moment.
7. **Measure how much of the copy is the client's.** Faithful-feeling text drifts.
8. **Show whole sites, design × copy**, so taste in look and taste in words can be separated.
9. **Outside reviewers help; when they clash with the client, the client wins.**
10. **Extract meetings chronologically first, and never treat what exists as proof of what was asked.**
11. **Consolidate early to one variation, then test small options in place.**
12. **Stop QA at "nothing is broken" when the client's feedback is next.**

## The code

```text
crafting-a-beautiful-website/
├── copy/                         the text, in markdown, read by the site at build time
│   ├── 1-encontro.md … 4-vinculos.md    round 1: four whole copies
│   ├── paginas.md, perguntas.md         round 1: deeper pages and FAQ
│   ├── 5-copy-4-no-design-e.md          round 2: the final copy
│   └── paginas-5.md                     round 2: the final deeper pages
└── prototipo/                    the Astro 7 site
    ├── src/lib/copy.ts           markdown → sections, fields, cards, FAQ, trajectory blocks
    ├── src/content.config.ts     content collections built from the copies
    ├── src/data/                 site data and the list of designs and copies
    ├── src/components/           sections, header, footer, art direction (Arte.astro)
    ├── src/scripts/              browser code: menu, current section, analytics, opening switchers
    ├── src/styles/               base.css + one theme per design (temas/a.css … e.css)
    ├── src/pages/                index of variations, /[design]/[copy]/ and its deeper pages
    └── tests/                    Vitest tests (Node and happy-dom)
```

**The copy format.** Everything before the first `## ` is a note and never reaches the site. Each `## 01 · Abertura` is a section, and the name after `·` picks the component. Each `### Título` is a field. Inside `### Cards`, every `#### ` opens a card. This kept the text editable by someone who does not code, and every copy change shows up in the diff.

**Routes.** `/` is the index of variations. `/a/1/` to `/d/4/` are the 16 combinations from round 1. `/e/5/` is the final variation, with its deeper pages at `/e/5/saude-da-mulher/` and `/e/5/saberes-complementares/`.

## Running it

Requires Node 24 (see [`prototipo/.nvmrc`](prototipo/.nvmrc)).

```sh
cd crafting-a-beautiful-website/prototipo
nvm use
npm install
npm run dev      # http://localhost:4321, then open /e/5/ for the final variation
npm test         # Vitest
npm run check    # astro check (TypeScript in .ts and .astro files)
npm run build    # static site in dist/
```

Useful addresses on `/e/5/`: `?analytics=debug` logs every analytics event to the console, `?seletores=1` shows the opening switchers, and `?abertura=2`, `?botao=cheio` or `?aviso=0` set a single option.
