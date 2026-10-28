# From an idea to a configurator

A configurator is a page on the site, opened from the top bar menu, where someone sets the sizes of a piece and gets its
parts list, a 3D preview and a PDF build guide. The Rod shelf and the Profile desk are the
two that exist; read `src/desk.js` before starting, it's the clearest example.

The designer decides what the piece is, what it's made of and how it goes together. You
turn that into code. Nothing gets built until the two of you have agreed a **design
brief**: it's the plan, and it's what the owner reviews first.

The process has two halves:

- **A. Design it** (talking, no code): steps 1 to 4, ending in the brief.
- **B. Build it** (code, in rounds you show them): steps 5 to 10.

## A. Design it

### 1. Start from the idea

- If it's on the Ideas board, read its card in `src/ideas.js` and its GitHub issue
  (comments included): the proposer's words and pictures are the starting point.
- If it isn't, offer to add it to the board too with the `add-idea` skill. Not required.

### 2. Interview the designer

One topic at a time. Write down their answers as you go. Don't propose parts or sizes
yourself unless they ask; when they do, offer two or three options with the trade-off.

1. **What is it?** One sentence. Who is it for, where does it go?
2. **Pictures.** A sketch, a photo of something similar, a reference product. Ask them to
   drop images into the chat or the `reference/` folder (git ignores it).
3. **Parts.** Every part they'd buy, with a link to a real listing where possible: rods,
   profiles, clamps, sheets, screws, feet. For each: which sizes it comes in, and which
   dimensions matter (diameter, length, thickness, hole positions). Where a size isn't on
   the listing, it's *unknown*, and goes on the list to measure.
4. **How it goes together.** Walk through the build in order, as if explaining to a
   friend: what goes first, what holds what, what gets cut or drilled.
5. **What the user can change** on the site. Usually width, depth, height, plus a few
   options (number of shelves, material, colour). For each: the default, the smallest and
   largest that make sense, and the step (10 mm?).
6. **Rules.** What follows from the choices: "a middle leg when it's wider than 1200 mm",
   "thicker rods for taller pieces", "a part only comes in 2 m lengths". These are the
   heart of the configurator.
7. **What can go wrong.** When should the site warn: too tall to be stable, sags under
   load, longer than a stock sheet, a part that doesn't exist in that size.
8. **What it looks like** in 3D: materials and colours (chrome, wood, acrylic, painted).

### 3. Write the brief

Save it as `docs/designs/<piece>.md` (e.g. `docs/designs/wall-shelf.md`) in this shape:

```markdown
# <Piece name>

<One or two sentences: what it is.> Idea: #<issue>.

## Reference

<Images or links. Only link product photos; don't commit them.>

## Parts

| Part | Sizes available | Key dimensions | Source |
|---|---|---|---|
| Chrome rod | Ø8, Ø10 | cut to length | <listing link>, read 2026-10-27 |

## Settings on the site

| Setting | Default | Min | Max | Step / choices |
|---|---|---|---|---|
| Width (mm) | 800 | 300 | 1600 | 10 |

## Rules

- <Each rule, in plain words, with the numbers.>

## Warnings

- <When the site should warn, and what it says.>

## Assembly

1. <Each step, in order.>

## Unknown, to measure

- <Every size or fact nobody has confirmed yet.>
```

Only what the designer said, or what a source shows. Gaps go under *Unknown, to measure*,
never filled with a guess.

### 4. Agree it

Show them the brief and ask them to read it through: "This is what I'll build. Anything
wrong or missing?" Change it until they say yes. Commit it on its own:
`Add design brief for the <piece>`.

## B. Build it

Pick a short code name for the piece, e.g. `wallshelf` (one word, lower case). `<kind>`
below means that name, `<Kind>` the same with a capital letter. Each step is one round:
build, `node --test`, show, ask, commit.

### 5. The numbers and the parts list

New file `src/<kind>.js`, the same shape as `src/desk.js`:

- `<KIND>_DEFAULTS`: every setting from the brief with its default.
- Part tables (sizes per part) with a comment saying where each came from and when.
- `compute<Kind>(input)`: merges input over the defaults, applies the rules, returns
  `{ kind: '<kind>', input, parts, warnings, ... }`, plus whatever the 3D model and the
  steps need (positions, lengths, chosen sizes). Pure maths: no page or 3D code.
- `<kind>Rows(design)`: the parts list as `[name, spec, qty]` rows.
- `<kind>Steps(design)`: the assembly steps from the brief as sentences, with the actual
  lengths and counts filled in.

New file `test/<kind>.test.js`: one test with the defaults (check the part counts by hand
with the designer: "with the defaults, that's 4 legs and 8 clamps, right?"), one per rule,
one per warning.

Show the designer the parts list for the defaults (print `<kind>Rows(compute<Kind>({}))`
as a table) and the steps. Ask if they match what they'd buy and do.

### 6. The page, its menu entry and the form

- `src/catalog.js`: add the piece to its furniture type in `CATALOG`, e.g.
  `{ id: '<kind>', label: 'Wall shelf', blurb: 'Rods and a wall rail' }` under Shelving,
  or start a new group if none fits (ask the designer which). That puts it in the top bar
  menu, and `<kind>` becomes its address: `localhost:8000/#<kind>`. Don't rename it later,
  since links point to it.
- `index.html`:
  - a form `<form id="<kind>Config" data-for="<kind>">` with one `<label>` per setting,
    copying the existing ones (`type="number"` with `min`/`max`/`step` from the brief, or
    a `<select>`; a two-option select shows as a switch automatically);
  - add `<kind>` to the two `data-for="shelf desk"` lists (the results panel and
    `#viewer`) so they show on the new page.
- `src/main.js`: import from `./<kind>.js` and add an entry to `TABS` with `form`,
  `defaults`, `strings` (the settings that aren't numbers), `compute`, `rows`, `steps`,
  `summary` (one line of key figures) and `total`.

At this point the page works without a 3D model, so show the form and parts list.

### 7. The 3D model

In `src/scene.js`:

- `build<Kind>(design)` returning a `THREE.Group`, using the same axes as the others
  (x = width, y = up, z = depth, centred on the origin). Reuse the existing helpers
  (`rod`, `crossClamp`, `profileBar`, `sheet`, ...) where the brief uses those parts.
- Tag every object: `obj.userData = { tag, part }`. `part` is its name as shown when
  clicked (`Rail Ø8 × 800 mm`); `tag` is the assembly step that adds it.
- Dispatch on the kind at the top of `buildModel`, like `desk`.
- `<kind>StepTags(design)`: the tags each step in `<kind>Steps` adds, in the same order
  and the same length. The PDF draws one picture per step from it.
- In `renderParts`, add a `design.kind === '<kind>'` branch with a render of each new
  hardware part, if the PDF should show them.

Screenshot the default, the smallest and the largest. Ask: "Does this look like the piece?
Is anything the wrong size or in the wrong place?" This round usually takes a few tries.

### 8. Clicking a part

`src/partinfo.js`: one `PARTS` entry per new part name, with a short description and a
search term for the Amazon link, written with the designer. Check that clicking each part
in the 3D view opens the right box.

### 9. The PDF

`src/pdf.js` treats every design that isn't a desk as a shelf (`const desk = design.kind
=== 'desk'`), so a new kind needs its own branches: the title, the subtitle, the
*Configuration* paragraph, the total line, the hardware page and the file name. Add them
by kind and keep the shelf and desk output unchanged.

In `src/main.js` `buildPdf`, add the `<kind>` call with `renderSteps(current,
<kind>StepTags(current))`.

Download the PDF for the defaults and show the designer the first page and the assembly
pages.

### 10. Finish

- **README**: a short section on the new piece (what it is, how it's built) like the
  *Construction* section, and its unknowns under *Assumptions to verify*.
- **Ideas board**: if the piece came from an idea, remove its card from `src/ideas.js`,
  since it now has its own page, and use `Closes #<issue>` in the PR.
- `index.html` `<meta name="description">` and the intro can mention the new piece; ask
  the designer whether they want that.
- Then back to step 4 of `SKILL.md`: check it, and send it.
