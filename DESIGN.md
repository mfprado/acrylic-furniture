# Design guide

How the site looks and why. Read this before changing anything visible: a new piece, a new
panel, a button, the 3D view or the PDF. It is written for people and for AI coding agents.
Everything here is taken from what the site already does (`index.html`, `src/scene.js`,
`src/pdf.js`); when in doubt, copy the nearest existing pattern instead of inventing one.

## Direction

The site should feel like a **workshop tool, not a shop**: a spec sheet and a machined part.
The vocabulary comes from the hardware itself: anodised aluminium T-slot profile, steel
rods, acrylic sheet, technical drawings and IKEA-style assembly pages. Surfaces are brushed
metal grey, text is monospaced like a parts list, labels are stamped in capitals. The 3D
model is the hero; the interface around it stays quiet.

This direction is deliberate. Some design skills (including `frontend-design`) treat
monospaced labels and tracked capitals as generic defaults to avoid. **On this site they are
the brief.** Keep them, and spend new ideas on the furniture and the 3D view instead.

## Colour

Defined as custom properties on `:root` in `index.html`. Use the variable, not the raw value.

| Token | Value | Use |
|---|---|---|
| `--ink` | `#15171a` | Body text, active switch, part label background |
| `--muted` | `#5b6168` | Secondary text, section headings, hints, crumbs |
| `--line` | `rgba(0,0,0,0.12)` | Hairline dividers, table rows, card borders |
| `--bg` | `#f7f7f5` | Page background |
| `--chrome` | brushed aluminium gradient | Sidebar, dropdown menus, part info box |

Fixed colours used alongside the tokens:

| Value | Use |
|---|---|
| `#2c3035` | Top bar, primary button, outlined button border and hover fill |
| `#1b1e21` | Border under the top bar and around the primary button |
| `#e9ebed` | Text on the dark top bar and dark buttons |
| `#a3a8ad`, `#a9aeb3` | Panel and input borders (darker than `--line`, like a metal edge) |
| `#e6e8ea` | Input background |
| `#8a3a12` | Warnings, the only warm colour in the interface |

Added with the home page, for the flat panels described under *Surfaces and depth*:

| Token | Value | Use |
|---|---|---|
| `--ground` | `#eef0f1` | Background of full-width pages such as the home page |
| `--edge` | `#d3d7da` | Border of white panels and tags on `--ground` |
| `--radius` | `6px` | Corners of cards and buttons on the home page |

There is no brand accent colour. Colour in the 3D view (acrylic blue, board finishes, frame
colour) belongs to the furniture, not the interface.

## Type

- **JetBrains Mono** (`--mono`, weights 400 and 600) for everything inside the tool:
  sidebar, labels, inputs, buttons, menus, cards. Loaded once from Google Fonts.
- **system-ui** only for the page body fallback.
- **Labels and headings are uppercase with wide tracking**, set by size:

| Element | Size / weight | Tracking |
|---|---|---|
| Page title (`.page-title`) | 17px / 600 | 0.14em |
| Site name in top bar | 13px / 600 | 0.14em |
| Section heading (`h2`) | 11px / 600, `--muted`, hairline underneath | 0.16em |
| Crumb above the title | 10.5px / 600, `--muted` | 0.16em |
| Buttons and nav links | 10.5 to 11px / 600 | 0.1 to 0.12em |
| Card title (`.idea h3`) | 14px / 600 | 0.06em |

- Body text in the sidebar is 12px with line height 1.55. Explanations (intro, hints) stay
  sentence case; only labels, titles and buttons are capitals.
- Units always follow the number in the label: `Width (mm)`, `Ø8 mm`.

## Surfaces and depth

- **Brushed metal** (`--chrome`) is for panels that hold controls. Plain white (`#fff`) is for
  content: idea cards, part photos, the 3D viewer's light gradient (`#fff` to `#eceef0`).
- Edges look machined: a 1px darker border plus a 1px white inner highlight
  (`box-shadow: inset ... rgba(255,255,255,0.35)`) on the sidebar and section headings.
- Corners are small: **3px** for buttons, inputs, menus and cards in the configurator; 2px
  for menu items. No pill shapes except the on/off switch.
- **Flat panels** are where the site is heading: white cards with a hairline border on the
  light grey `--ground`, corners of `--radius` (6px), 8px for a large render frame. The home
  page uses them. The configurator keeps the brushed metal sidebar until it moves over
  (see *Where it's heading*); don't mix the two on one page.
- Shadows are soft and only on things that float: menus and the part info box
  (`0 6px 24px` to `0 8px 24px`, about 0.2 opacity). Cards get a faint `0 2px 8px` at 0.05.
- Inputs look pressed in: `inset 0 1px 1px rgba(0,0,0,0.08)`.

## Components

Reuse these; don't add a second version of any of them.

- **Primary button** (`#download`): full width, dark `#2c3035`, light uppercase text. One per
  panel, for the main action.
- **Outlined button** (`.ghost`, `.donate a`, `.idea .join`): transparent with a `#2c3035`
  border; fills dark on hover.
- **Number and select inputs**: 96px wide, 28px high, inside a `label` that puts the name
  left and the input right.
- **Switch** (`.switch`): for any setting with exactly two options. The real `select` stays in
  the form, hidden, as the value.
- **Section heading** (`h2`): splits the sidebar into groups such as Dimensions, Parts, Cut list.
- **Tables**: hairline rows, quantities right aligned and bold.
- **Part label and part info box**: dark label on hover, chrome box on click, over the 3D view.
- **Idea card**: white card with a sketch or photo, uppercase title, links, collaborators.
- **Button link** (`.button`, `.button.outline`): a link that looks like the primary or
  outlined button, for actions that go somewhere (home page calls to action). Same dark
  `#2c3035`, uppercase 11px text, `--radius` corners.
- **Piece card** (`.piece-card`): home page card for a piece, built from `src/catalog.js`:
  its render, group, name, a sentence about it and *Configure →*. The dashed
  `.piece-card.new` invites contributors.
- **Idea teaser** (`.idea-teaser`): short version of an idea card for the home page: issue
  number, title, first point, *Collaborate ↗*.

## Layout

- **Home page** (`#home`, the first page on a first visit; the site name links to it): full
  width on `--ground`, content at most 1280px wide. A hero with the pitch and a render of a
  piece, *How it works* in three steps, a card per piece, the ideas, a dark *Contribute*
  band and a footer. Write it like the rest of the site: plain words, sentence case for
  explanations.
- **Piece pages**: dark top bar (52px), then a **400px sidebar** of controls on the left and
  the 3D view filling the rest.
- Under 800px: everything stacks. Top bar wraps, sidebar goes below a 60vh 3D view, the
  ideas board becomes one column. Check every change at phone width.
- Sidebar padding is 24px; section headings have 26px above them.

## 3D view

The model should look like a product photo of real parts, not a game.

- `MeshPhysicalMaterial` with real metalness and roughness: polished chrome rods
  (roughness 0.08), anodised aluminium profile (0.38), transmissive acrylic (IOR 1.49).
- ACES filmic tone mapping at exposure 0.75, a `RoomEnvironment` for reflections, one soft
  shadowed sun and a shadow catcher on the ground.
- Model real hardware from manufacturer drawings (T-Nutz, McMaster, CPlot), down to bolts and
  T-nuts, and give each part a name and part info. Detail is what makes it believable.

- **Renders** on the home page are stills of the 3D view at a piece's default settings, saved
  in `assets/renders/` as JPEGs about 1400 × 1050 px. Take a new one when a piece's model or
  defaults change, and add one with every new piece (the tests check it exists).

## PDF build guide

Black and white line drawings in the style of an assembly manual: grey edges for parts
already placed, black edges and grey fill for the parts added in that step. Courier bold for
titles. Keep every label inside its box.

## Where it's heading

From the redesign mockup the owner approved, for later pull requests. Not built yet; when
building one of these, move it into the sections above.

- Piece pages in three columns: settings on the left, the 3D view in the middle, and a
  *Your build* panel on the right with the notices, a few key numbers and *Parts / Cut list /
  Steps* tabs. On a phone: the 3D view, then those tabs, with the PDF button fixed at the
  bottom.
- Settings grouped (Size, Frame, Shelves, Load), with the unit inside the input, a − / +
  stepper for counts and a row of segmented buttons for three to five options.
- A **Drawing / Realistic** switch on the 3D view: Drawing shows the piece as a technical
  drawing (white parts, dark edges, dimension lines with the sizes); Realistic is today's
  render. View buttons: 3D, Front, Side, Top.
- Notices such as "Added 2 middle columns" shown as a grey box at the top of the results,
  not as warning text under the buttons.
- Flat panels (see *Surfaces and depth*) replace the brushed metal sidebar.

## Writing on the page

- Plain words a maker understands: "Width", "Shelves", "Download PDF". Name things by what
  the person sees, not how the code works.
- Buttons say what happens. Errors and warnings say what is wrong and how to fix it.
- Sentence case for explanations; capitals only through CSS (`text-transform`), never typed.

## Before you call it done

- It matches the tokens and components above; no new colours, fonts or radii.
- Checked at desktop width and at 375px wide, with a screenshot of each.
- Keyboard focus is visible (`:focus-visible` outlines exist for nav, menus and switches;
  new controls need one too).
- The 3D view still loads and the PDF still downloads.
