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
  image: 'https://…',             // optional: a picture the proposer shared
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
- **Images only from the issue.** Use a picture the proposer attached (its
  `github.com/user-attachments/…` URL). Never hotlink shop images.
- New ideas go at the end of `IDEAS`.

## Steps

1. Read the issue (title, body, comments from the proposer). If the idea isn't clear enough
   for one bullet point, ask on the issue instead of guessing. If the idea came from
   somewhere else (a chat, a message), open an issue for it first with the `idea` label.
2. Add the entry to `src/ideas.js`, with `issue` set.
3. Run `node --test`.
4. Serve the folder (`python3 -m http.server 8000`), open the Ideas tab and take a
   screenshot of the board.
5. Open a PR titled `Add idea: <title>`, with the screenshot in the description and
   `Refs #<issue>`. **Never `Closes`/`Fixes`**: those keywords close the issue on merge, and
   the issue must stay open for collaborators.
6. Make sure the issue has the `idea` label. Close it only when the piece is built into the
   configurator, or the proposer drops it.
