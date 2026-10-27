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

## Ideas

The Ideas tab is a board of pieces that are not in the configurator yet. Suggest one by
[opening an idea issue](https://github.com/mfprado/open-source-modular-furniture/issues/new?template=idea.md).

Each idea keeps its issue **open**: it's where anyone who wants to help build it leaves
notes, links and pictures. The card on the board links to the issue and lists its
collaborators (everyone who opened or commented on it), loaded live from GitHub.

Ideas go on the board as proposed. Working out parts and assembly comes later, when
someone designs the piece.

### Adding an idea to the board (contributors)

Ideas are plain data in `src/ideas.js`. The `add-idea` skill in
`.claude/skills/add-idea/SKILL.md` turns an issue into a card and follows the rules for
what goes on one. To run it with [Claude Code](https://claude.com/claude-code):

1. Clone the repo and start Claude Code in it. Skills in `.claude/skills/` load
   automatically.
2. Run the skill with the issue number:

   ```text
   /add-idea 12
   ```

   or just ask: `add the idea from issue #12 to the board`.
3. Claude reads the issue, adds the entry to `src/ideas.js`, runs `node --test`, takes a
   screenshot of the board and opens a PR that references the issue (`Refs #12`, never
   `Closes`, so the issue stays open).
4. Review the card wording against the issue and merge.

Without Claude Code, follow the same rules by hand: copy an entry in `src/ideas.js`,
keep the proposer's words, add `issue`, and reference the issue in the PR without
closing it.

## Construction

- Chrome optical shaft posts stand in flange couplings (feet).
- Bottom sheet rests on the flanges, posts pass through holes, shaft collars lock it.
- Each upper shelf: a 90° cross clamp per post under the sheet holds a depth crossbar;
  a cross clamp per post over the sheet holds a width rail front and back.
- If the acrylic would sag more than span / 250, middle columns are added.

## Run

No build step. Serve the folder and open it:

```sh
python3 -m http.server 8000
# http://localhost:8000
```

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
