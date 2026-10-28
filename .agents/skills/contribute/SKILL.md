---
name: contribute
description: Guides a contributor, usually a designer who doesn't code, from a fresh clone to an open pull request - running the site locally, building the change with them, checking it, and writing a PR that meets the review standard. Use when someone says "let's work on this", "I want to contribute", "I want to add a feature", "help me make a PR", "I want to design a new piece", "turn this idea into a configurator", or starts an AI coding agent (Claude Code, Codex or another) in the repo without a clear task.
---

# Contribute a change

This skill works with any AI coding agent that can run commands and edit files: Claude
Code, Codex, Cursor, Gemini CLI and others. Where a step depends on what the agent can do
(take screenshots, show images, run things in the background), use what yours has and
fall back as described.

The person you're working with is probably a **designer, not a developer**. They know
furniture, parts and how things look; they may never have used a terminal, git or GitHub.
You do the technical work. They make the design decisions and say whether it looks right.

## How to talk to them

- Plain words. Say "the site", "a copy of the project on your GitHub", "save a version",
  not "dev server", "fork", "commit". If a technical word is unavoidable, explain it once
  in half a sentence.
- One question at a time, and offer choices when you can ("Should the width go up in 10 mm
  steps, or 1 mm?").
- **Make choices clickable.** When your agent has a tool for asking a multiple-choice
  question (in Claude Code and the Claude desktop app, `AskUserQuestion`), use it for every
  question with a few clear answers: the opening menu, design options, "does this look
  right?" (*Looks right* / *Change something*), "ready to send it?". Put your suggested
  answer first. They can always pick "Other" and type. Without such a tool, write the
  options as a short numbered list.
- Run every command yourself. Only ask them to do something when you can't: signing in to
  GitHub, opening a page in their browser, taking a photo of a part, dragging an image.
  Then give exact clicks.
- Show, don't describe: after each visible change, take a screenshot and show it, or give
  them the link to the page that changed, and ask "does this look right?".
- **Always give the site as a clickable link to the exact page**, written as a Markdown
  link: [localhost:8000/#desk](http://localhost:8000/#desk), using the piece's id from
  `src/catalog.js` (`#shelf`, `#desk`, `#ideas`, or the new piece's id). In the Claude
  desktop app, clicking it opens the site in the Browser pane next to the chat, already
  refreshed; elsewhere it opens their browser. Never ask them to type an address.
- Never leave them on an error. If something breaks, fix it or explain in one line what's
  needed from them.
- Every few steps, say where they are: "Step 3 of 6: the 3D model."

## 0. Find out what they want

Start by saying "Hi! I'll help you add something to Open Source Modular Furniture and send
it to the owner for review." Then ask what they'd like to do, as a clickable question
(header *Task*) with these options:

| Option | Description |
|---|---|
| Design a new piece | A new configurator page, from an idea on the Ideas board or your own |
| Improve an existing piece | A new option, a part, or a fix to the shelf or desk |
| Change the site | Its design or how it works, e.g. a new sidebar or layout |
| Add an idea | Put an idea on the Ideas board, no design yet |

"Something else" is covered by the tool's own "Other" answer. Without the tool, list the
same four plus "Something else" as a numbered list.

- **Add an idea** → use the `add-idea` skill instead, then come back here at step 5 for the PR.
- **Design a new piece** → steps 1 to 6, with step 3 following [new-configurator.md](new-configurator.md).
- **Change the site** → steps 1 to 6, with step 3 following *Changing the site* below.
- **Improve an existing piece / something else** → steps 1 to 6; in step 3, ask what should change, read the code involved, and
  agree the change in a few bullet points before building.

## 1. Get set up

Check what's already done; skip what is.

1. **Where are we running?** The designer should try the site in their own browser, so
   the session has to run on their computer.
   - On their computer (the Claude desktop app with **This computer** as the environment, a terminal, or an
     editor such as VS Code or Cursor): continue below.
   - In the cloud (the desktop app with a **Cloud** environment such as **Default**, claude.ai/code, Codex cloud):
     `localhost` here is the cloud machine, not their computer, so they can't open the site
     in their browser. Explain that in one sentence and help them switch: in the Claude
     desktop app, open **Code**, start a new session, click the first button under the message box
     and pick **This computer** (under Local), then click **Choose…** next to it and pick
     the project folder (step 1.2). If they'd
     rather stay in the cloud, you run the site and show them screenshots instead.
   - **The project isn't on their computer yet** (the usual first time: they chose a
     folder such as Documents and asked you to clone the repository): clone it there with
     `git clone https://github.com/mfprado/open-source-modular-furniture.git`, then keep
     working inside the clone in this same session: run every command from that folder,
     and read its `AGENTS.md` and this skill from there. Tell them: "Downloaded. Next
     time, click **Choose…**, pick the folder *open-source-modular-furniture* inside
     <the folder they chose> and say *let's work on this*." Then carry on: ask what they want (step 0)
     if you haven't yet, and start the site (step 2).
2. **Tools.** Check `git --version` and `node --version` (Node 18 or later: it runs the
   site and the tests). If something is missing, give the one installer link they need
   (https://nodejs.org for Node; https://git-scm.com for Git on Windows; on a Mac,
   `xcode-select --install` gives git) and wait.
3. **Their copy on GitHub (fork).** Check `git remote -v`.
   - `origin` is their own fork: good.
   - `origin` is `mfprado/open-source-modular-furniture` and they are not the owner: they
     need a fork to send changes from. If `gh` is installed and signed in (`gh auth
     status`), run `gh repo fork --remote` (renames the original to `upstream`, adds their
     fork as `origin`). Otherwise walk them through it: open
     https://github.com/mfprado/open-source-modular-furniture, click **Fork**, then
     **Create fork**, and tell you their GitHub username; then
     `git remote rename origin upstream` and
     `git remote add origin https://github.com/<username>/open-source-modular-furniture.git`.
   - No GitHub account: send them to https://github.com/signup first.
4. **Up to date, on a new branch.** The project should already be on the latest `main` (see
   *Working here* in `AGENTS.md`; Claude Code pulls it when the session starts). Fetch
   it anyway (`git fetch upstream`, or `origin` if there's no upstream) and start a
   branch from it named `<username>-<title>`: their GitHub username (`gh api user -q
   .login`, or ask them) and a short title in lower case with hyphens:
   `git switch -c <username>-<title> upstream/main`, e.g. `mfprado-clamp-lamp`. Explain:
   "I've made a separate workspace for this change, so nothing else is affected."

## 2. Run the site

No build step and nothing to install. `.claude/launch.json` tells the Claude desktop app
how to start it; anywhere else, from the repo folder:

```sh
node scripts/serve.mjs        # http://localhost:8000
```

Run it in the background (or in a second terminal if your agent can't), then:

- **On their computer:** explain what a local version is, then have them open it. Say
  something like:

  > I've started a private copy of the website on your computer. Think of it as a
  > prototype on your workbench: the real site (mfprado.github.io/…) is the shop window
  > everyone sees, and this copy is yours to try things on. Nobody else can see it, and
  > nothing you do here changes the real site.
  >
  > Open it here: [localhost:8000](http://localhost:8000). `localhost` means "this
  > computer", and 8000 is just the door number I opened it on. When I change
  > something, I'll send you the link again, or press the ↻ refresh button. Keep this
  > chat open: if you close it, the copy stops and the page shows "This site can't be
  > reached". Just ask me to start it again.

  In the Claude desktop app the link opens the site in the app's **Browser** pane, to the
  right of the chat (it may already be open there, from `.claude/launch.json`). They can
  also open the same link in Chrome. Wait until they say they can see it.
- **In the cloud:** they can't open localhost. Take a screenshot (below) and show it.

Run the tests once now so you know they pass before anything changes: `node --test`.

### Taking screenshots

Screenshots go in `pr-screenshots/` (git ignores it; they're for the PR, not the repo).

1. If Playwright is available (`node -e "require('playwright')"` works), use it: open
   `http://localhost:8000`, open the right page (`http://localhost:8000/#shelf`, `#desk`, or the piece's id), set the form values, wait about 2 seconds
   for the 3D view, and save a 1400 × 800 screenshot.
2. Otherwise ask before installing anything: `npm i --no-save playwright` and
   `npx playwright install chromium` download a browser (a few hundred MB).
3. If they'd rather not, they take them: on a Mac Cmd+Shift+4 then drag over the area;
   on Windows Win+Shift+S. Ask them to save them in `pr-screenshots/`.

Name them for what they show: `wall-shelf-default.png`, `wall-shelf-too-wide-warning.png`.

## 3. Build it, together

Work in small rounds. Each round: say what you're about to do in one sentence, do it, run
`node --test`, show the result (screenshot or "refresh the page"), ask if it looks right,
then save a version:

```sh
git add <only the files you changed>
git commit -m "<what it does, in plain words>"
```

Commit messages say what the change does: `Add wall shelf parts list`, `Show a warning
when the shelf is wider than a sheet`. Not `update`, `wip` or `fix`.

For a new piece, follow [new-configurator.md](new-configurator.md) step by step. It
starts with a design brief written with the designer, before any code.

Rules for any change:

- **Match the code around it.** Same style, naming and comment density as the existing
  files (`src/calc.js` and `src/desk.js` are the examples). Keep geometry and parts maths
  in pure functions with no page code in them, so they can be tested.
- **Every new rule gets a test** in `test/`. A rule is anything that decides a number, a
  part or a warning.
- **Don't invent part facts.** Sizes, prices and specs come from a listing, a datasheet or
  the designer's measurements. Record where each came from in a comment with the date,
  like `FLANGES` in `src/calc.js`. If something isn't known, say so in the README's
  *Assumptions to verify*, not a made-up value.
- **Don't break the existing pieces.** After every round, check the Rod shelf and Profile
  desk pages still show their 3D view and parts list.
- Keep the change to what was agreed. Ideas for other changes go in a list for the PR's
  *Next steps*.

### Changing the site

For changes to the site itself rather than a piece: its layout, navigation, look, or how
something works (a new sidebar, a different top bar, a dark mode, a new kind of page).

1. **Understand the proposal.** Ask what they want to change and why: what's hard or
   missing today. Ask for a picture if they have one: a sketch, a screenshot of a site
   they like, or a marked-up screenshot of this one. Ask whether it applies to every page
   or only some.
2. **Show the current state.** Take a screenshot of the part they want to change, so you
   both talk about the same thing.
3. **Agree it in a few bullet points** before building: what moves, what's new, what
   goes away, and how it behaves on a phone. For a bigger change, offer to try it in
   small steps (layout first, then details) and show a screenshot after each.
4. **Keep it consistent with the site.** Reuse its colours and type (`--ink`, `--muted`,
   the `--mono` font, the dark top bar's `#2c3035`), and keep the existing pages and the
   3D view working. Ask before removing anything people use today.
5. In step 4 below, add to their checklist: the change on every page it affects, a
   narrow phone-width window, and "does anything look out of place now?". Put
   before/after screenshots in the PR.

## 4. They try it themselves, then you check it

First the designer uses it themselves, the way someone visiting the site would. Make
sure the local version is running (step 2), give them the link to the page
([localhost:8000/#<id>](http://localhost:8000/#<id>)), then give them this list one item
at a time and wait for their answer to each:

1. Open the new or changed piece from the top bar menu. Does the 3D view look like the piece?
2. Change the sizes to the smallest and the largest. Does it still look right?
3. Switch each option on and off.
4. Try to make each warning appear (too wide, too heavy…). Does the warning make sense?
5. Click a few parts in the 3D view. Is the description right?
6. Read the parts list. Is it what you'd buy?
7. Click **Download spec (PDF)** and read it. Could someone build it from this?
8. Check the Rod shelf and Profile desk pages still work.
9. Make the window narrow, like a phone. Is it still usable?

When something's wrong, fix it, send the link again, and ask again. When they're happy
(they'll often say "I'm happy, let's send it"), do your own checks and keep the evidence for
the PR:

1. `node --test`. Every test passes. Keep the output.
2. Screenshots in `pr-screenshots/`:
   - the new or changed page with its default settings, showing the 3D view and parts list;
   - one screenshot per scenario that matters: the smallest and largest sizes allowed,
     each option switched on, and each warning showing;
   - for anything that changes the PDF: click **Download spec (PDF)** and screenshot its
     first page and one assembly page;
   - the existing pages (Rod shelf, Profile desk) still working.
3. Open the browser console (or read Playwright's console messages): no errors.
4. Narrow window (about 400 px wide) for one screenshot: the page still works on a phone.
5. Read your own diff (`git diff upstream/main`) as the reviewer would: anything
   unexplained, unused, or not in the brief? Fix it.

Show the screenshots to the designer and ask: "These go in the pull request. Anything to
change before we send it?"

## 5. Send it (the pull request)

The pull request follows `.github/pull_request_template.md`. Every section is required;
write "None" rather than deleting one.

1. Push: `git push -u origin <branch>`.
2. Write the description from the template, in plain language the owner can review
   quickly:
   - **What this adds**: two or three sentences a non-coder understands.
   - **Idea / issue**: `Closes #<n>` when it builds an idea into the configurator (the
     issue is done); `Refs #<n>` when it only works towards one. None if it has no issue.
   - **Design brief**: link to `docs/designs/<piece>.md` for a new piece.
   - **Parts and sources**: each new part and where its sizes came from.
   - **How it was checked**: the `node --test` output in a code block, and the list of
     scenarios checked.
   - **Screenshots**: one per scenario, each with a caption.
   - **Assumptions to verify** and **Next steps**.
   - The checklist, ticked honestly. Leave a box unticked and say why rather than ticking
     something that wasn't done.
3. Open it against `mfprado/open-source-modular-furniture`, branch `main`:
   - with `gh`: `gh pr create --repo mfprado/open-source-modular-furniture --base main
     --title "<title>" --body-file <file>`;
   - without `gh`: open
     `https://github.com/mfprado/open-source-modular-furniture/compare/main...<username>:<branch>?expand=1`
     for them and give them the description to paste.
   Title: `Add <piece> configurator`, `Add <option> to the <piece>`, `Fix <what>`.
4. **Screenshots into the PR.** GitHub only takes images uploaded through the page. Tell
   them: "Open the pull request, click **Edit** on the description (… menu → Edit), and
   drag the images from the `pr-screenshots` folder in under each caption." In the cloud,
   send them the files first so they have them to drag.
5. Tell them what happens next: the owner reviews, may ask for changes in comments, and
   merges when it's ready. "If they ask for changes, open your AI assistant in this folder
   again and say *let's work on the review comments*." Then read the PR comments, make the changes in
   new commits on the same branch, push, and reply under each comment.
   If GitHub says the PR has **conflicts** (someone else changed the same files and theirs
   was merged first), that's normal: merge the latest `main` into the branch, combine both
   changes so neither is lost, run the tests, send them the link to see the result, and push.
   Tell them in plain words: "Someone else changed the same part of the site; I've
   combined their change with yours." Ask them only if the two changes really contradict
   each other.

## 6. Wrap up

Give them a short summary: what was built, the PR link, and anything they still need to do
(drag screenshots in, measure a part). Thank them.
