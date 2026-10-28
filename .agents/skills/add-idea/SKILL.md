---
name: add-idea
description: Adds a furniture idea to the Ideas tab (the ideas board) from a GitHub issue or a description. Use when someone opens an idea issue, says "add this idea", "put this on the ideas board", or gives an issue number to add.
---

# Add an idea to the board

The Ideas tab collects pieces that are not in the configurator yet. A card records the idea
**as it was proposed**. It is not a design.

Every idea has a GitHub issue, and **the issue stays open**: it is where people who want to
help build the idea leave notes, links and pictures. The card links to it and lists its
collaborators (whoever opened or commented on the issue), loaded live from GitHub, so the
list needs no upkeep.

## What a card holds

Each idea is one entry in `IDEAS` in `src/ideas.js`:

```js
{
  title: 'Clamp lamp',            // short name of the piece, 1 to 3 words
  points: [                       // the idea in bullet points, 1 to 4
    'A lamp held together with clamps.',
    'Inspired by glass clamps: very cheap on Amazon, and they look good.',
  ],
  links: [{ name: 'Glass clamps (inspiration)', url: 'https://…' }], // optional
  issue: 12,                      // the GitHub issue: link and collaborators
  sketch: `<svg …>`,              // optional: drawn from a reference image or a clear description, see below
  image: 'https://…',             // optional: a picture the proposer made themselves
}
```

## Rules

- **Keep the proposer's idea and words.** Shorten and tidy, but don't change what they said
  or add to it.
- **Products named are inspiration, not a parts list.** Write "inspired by glass clamps",
  not "uses glass clamps". Name what the link is in its `name`, e.g. "(inspiration)".
- **No design work.** Don't add parts lists, sizes, assembly steps, feasibility concerns,
  safety notes or open questions. Working those out is the designer's creative process,
  later. If the proposer included them, keep them only if they are the idea itself.
- **Don't invent facts.** No prices, sizes or specs that the issue doesn't give. If a link
  can't be read, keep it with a plain name and don't describe what's behind it.
- **Add a sketch whenever the issue gives enough to draw one.** That means a reference
  image ("a square lamp like this") or a description clear enough to say what the piece
  looks like: its overall shape and what it is made of. Draw it in `sketch` rather than
  showing a photo. Photos of other people's products aren't ours to republish, and sketches
  keep the board consistent. If there is neither a picture nor a clear description, leave
  the sketch out and don't guess. See *Drawing the sketch*.
- **`image` only for the proposer's own picture**, such as a photo of something they built,
  using the `github.com/user-attachments/…` URL from the issue. Never hotlink shop images.
- New ideas go at the end of `IDEAS`.

## Drawing the sketch

A sketch shows what the idea looks like. It is not a design.

- Trace what is in the picture, or, with only text, draw just what the words say: the
  overall shape and proportions, the main members (legs, frames, rails), the panels or
  shade, and visible clamps or joints. Nothing that isn't in the picture or the text: no
  dimensions, labels, hidden parts or invented details. From text, pick the simplest
  shape that fits the words.
- Inline SVG, `viewBox="0 0 200 240"`, three-quarter view, with `role="img"` and an
  `aria-label` that says what it shows ("Sketch: square paper shade on four thin legs…").
- Flat fills in the board's palette: rods and frames `#8a8f94`, clamps `#5b6168`, paper
  `#e9dfc7` / `#d6c8a6`, glow `#fff6dc`, acrylic `rgba(160,200,215,.45)`. No gradients,
  text or external images.
- Draw back members first, then panels, then front members, so the front rods sit on top.
- Add a one-line comment above `sketch` saying what it was traced from (the photo, or the
  issue text).
- Check it in the screenshot next to the reference image, or reread the issue text: does
  it read as the same piece?

## Steps

1. Read the issue (title, body, comments from the proposer). If the idea isn't clear enough
   for one bullet point, ask on the issue instead of guessing. If the idea came from
   somewhere else (a chat, a message), open an issue for it first with the `idea` label.
2. Add the entry to `src/ideas.js`, with `issue` set. If the issue or the request has a
   reference image or a description clear enough to draw, add its `sketch`.
3. Run `node --test`.
4. Serve the folder (`node scripts/serve.mjs`), open the Ideas page and take a
   screenshot of the board.
5. Open a PR titled `Add idea: <title>`, with the screenshot in the description and
   `Refs #<issue>`. **Never `Closes`/`Fixes`**: those keywords close the issue on merge, and
   the issue must stay open for collaborators.
6. Make sure the issue has the `idea` label. Close it only when the piece is built into the
   configurator, or the proposer drops it.
