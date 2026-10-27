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

## Pull requests

Follow `.github/pull_request_template.md`; the `contribute` skill explains how to fill it
in, including the test output and screenshots it asks for.
