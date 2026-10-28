# Open Source Modular Furniture

Instructions for AI coding agents (Codex, Claude Code, Cursor, Gemini CLI and others).

A static site with no build step: `index.html` plus ES modules in `src/`. Serve the folder
(`node scripts/serve.mjs`, port 8000) and run the tests with `node --test`. See `README.md`.

## Skills

Step-by-step procedures live in `.agents/skills/<name>/SKILL.md`. When a request matches
one, read that file and follow it, even if your agent doesn't load skills by itself.

| Skill | Use when |
|---|---|
| [`contribute`](.agents/skills/contribute/SKILL.md) | Someone says "let's work on this", wants to contribute, add a feature, design a new piece or configurator, or make a pull request. Also when you're started here with no clear task. |
| [`add-idea`](.agents/skills/add-idea/SKILL.md) | Adding an idea to the Ideas board from a GitHub issue or a description. |

Contributors are often designers who don't code: explain in plain words, run the commands
yourself, and show results with screenshots.

Just cloned this repository for someone ("clone it and let's start working there")? Work
inside the clone and follow the `contribute` skill from the start: ask what they want to
do, then start the site.

## Working here

- **Start from the latest version.** When you open the repo, pull `main` first. In Claude
  Code the SessionStart hook in `.claude/settings.json` does it (`scripts/pull-main.mjs`);
  in other agents, run `node scripts/pull-main.mjs`. It only fast-forwards; if it reports a
  problem, tell the user before changing anything.
- **New work gets its own branch**, made from the latest `main` and named
  `<username>-<title>`: the contributor's GitHub username and a short title in lower case
  with hyphens, e.g. `mfprado-sidebar-navigation`.
- **Everything reaches `main` through a pull request.**
- **Conflicts are normal.** Several people can work on the same thing; if a PR conflicts
  with `main`, merge `main` into the branch, keep both sides' intent, run the tests, and
  explain to the contributor in plain words what you combined.

## Pull requests

Follow `.github/pull_request_template.md`; the `contribute` skill explains how to fill it
in, including the test output and screenshots it asks for.
