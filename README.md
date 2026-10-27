# Open Source Modular Furniture

An open source furniture project: Lego for adults. Standard off-the-shelf parts, sized to
your space, with everything you need to buy and build them.

Live: https://mfprado.github.io/open-source-modular-furniture/

Calculator for minimalist rod and acrylic shelf units in the style of the HushLume
3 tier keyboard stand. Enter width, depth, total height and number of shelves; get a
parts list, hole positions for the acrylic, assembly steps with clamp heights, and a 3D
preview.
<img width="1491" height="702" alt="Screenshot 2026-10-25 at 10 21 01" src="https://github.com/user-attachments/assets/8ebafba1-bb89-4ac9-928b-7aada4f8760e" />
<img width="1316" height="739" alt="Screenshot 2026-10-25 at 10 20 23" src="https://github.com/user-attachments/assets/1b1c4d9c-d27e-47c1-ba62-1e0e6279a9f3" />

## Site layout

The top bar groups the pieces by furniture type (Shelving, Desks & tables, …), one menu per
type, with the Ideas board at the end. Each piece has its own URL hash, so
`…/open-source-modular-furniture/#desk` opens the profile desk directly.

To add a piece, add it to its group in `src/catalog.js` (or start a new group) and give it
an entry in `TABS` in `src/main.js` with the same id.

## Ideas

The Ideas page is a board of pieces that are not in the configurator yet. Suggest one by
[opening an idea issue](https://github.com/mfprado/open-source-modular-furniture/issues/new?template=idea.md).

Each idea keeps its issue **open**: it's where anyone who wants to help build it leaves
notes, links and pictures. The card on the board links to the issue and lists its
collaborators (everyone who opened or commented on it), loaded live from GitHub.

Ideas go on the board as proposed. Working out parts and assembly comes later, when
someone designs the piece.

### Adding an idea to the board (contributors)

Ideas are plain data in `src/ideas.js`. The `add-idea` skill in
`.agents/skills/add-idea/SKILL.md` turns an issue into a card and follows the rules for
what goes on one. To run it with an AI coding agent (Claude Code, Codex or another):

1. Clone the repo and start the agent in it. Claude Code loads the skills automatically
   (`/add-idea`); other agents find them through `AGENTS.md`.
2. Ask with the issue number:

   ```text
   add the idea from issue #12 to the board
   ```

   In Claude Code you can also type `/add-idea 12`.
3. The agent reads the issue, adds the entry to `src/ideas.js`, draws a sketch if the
   issue has a picture of the goal (for example "a square lamp like this" plus a photo),
   runs `node --test`, takes a screenshot of the board and opens a PR that references the
   issue (`Refs #12`, never `Closes`, so the issue stays open).
4. Review the card wording against the issue, and the sketch against the picture, then
   merge.

Without an agent, follow the same rules by hand: copy an entry in `src/ideas.js`,
keep the proposer's words, add `issue`, and reference the issue in the PR without
closing it.

## Contributing

You don't need to code. Designers are welcome: the AI agent does the programming, you make
the design decisions.

**New here? Start with the contributor guide slides**
([Google Slides](https://docs.google.com/presentation/d/1I9-3j3nR0PeYaLsFDj4lVqFOk5Pe61Ug/edit) ·
[PDF](docs/contributing-guide.pdf)): a walkthrough of contributing with the Claude desktop
app, from opening the project to the pull request.

1. Fork the repo on GitHub and clone your fork (the agent can help with both).
2. Open the folder in an AI coding agent (the Claude desktop app, Claude Code, Codex, Cursor...) and
   say:

   ```text
   let's work on this
   ```

3. It follows `.agents/skills/contribute/SKILL.md`: it gets the site running on your
   computer, asks what you want to do, and builds it with you in small steps, showing a
   screenshot after each one. For a new piece it first writes a design brief with you
   (`docs/designs/<piece>.md`): parts and where their sizes come from, the settings people
   can change, the rules, the warnings and the assembly steps. Then it builds the parts
   list, the page, the 3D model and the PDF, one at a time.
4. It checks the work (tests plus screenshots of each scenario) and opens a pull request
   in the standard shape, `.github/pull_request_template.md`: what it adds, the issue,
   the design brief, parts and sources, test output, screenshots, assumptions to verify
   and next steps.

## Construction

- Chrome optical shaft posts stand in flange couplings (feet).
- Bottom sheet rests on the flanges, posts pass through holes, shaft collars lock it.
- Each upper shelf: a 90° cross clamp per post under the sheet holds a depth crossbar;
  a cross clamp per post over the sheet holds a width rail front and back.
- If the acrylic would sag more than span / 250, middle columns are added.

## Run

No build step. Serve the folder and open it:

```sh
node scripts/serve.mjs        # or: python3 -m http.server 8000
# http://localhost:8000
```

In the Claude desktop app (Code, **Local** environment, this folder), Claude starts it for
you from `.claude/launch.json`.

Tests: `node --test`

## Assumptions to verify

- Flange (`FLANGES`) and cross clamp (`CLAMPS`) sizes come from Temu listing images
  (2026-10-24). Clamp length and some flange plate diameters were not shown; measure
  real parts and update.
- Clamps on that listing only go to 10 mm bore, so rods are limited to Ø6, 8, 10.
- Sag check treats fluted acrylic as solid sheet of the same thickness; fluted is stiffer
  along the flutes, weaker across.

## Support

This project is free and open source. If it helped you build something, you can
[buy me a coffee on Cafecito](https://cafecito.app/mfprado).
