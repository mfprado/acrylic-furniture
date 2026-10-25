// What each part in the 3D model is, for the info box that opens when you click it.
// Matched on the part name the model gives each object (userData.part).

// Links go to an Amazon UK search (DIY department) rather than one shop, since equivalent
// parts are sold under many brands. Plain product names find more than part codes.
const amazon = (q) => `https://www.amazon.co.uk/s?k=${encodeURIComponent(q)}&i=diy`;
const series = (n) => n.match(/\d{4}/)?.[0] ?? '';

const PARTS = [
  {
    match: /^(Leg|Long rail|Short rail|Centre rail|End stretcher|Back stretcher)/,
    title: (n) => n,
    shot: 'profile',
    search: (n) => `${series(n)} T-slot aluminium extrusion profile`,
    text: 'T-slot aluminium profile, cut to length. Fittings bolt into its slots with drop-in T-nuts; the leg ends are tapped for the levelling feet.',
  },
  {
    match: /^4 Hole Inside Corner Gusset/,
    title: () => '4 Hole Inside Corner Gusset',
    text: '2" × 2" × 7/8" triangle, 3/16" walls, open window in the sides. Two Ø0.281" holes 1" apart in each leg, reached through Ø0.5" access holes in the diagonal face. Joins each long top rail to its leg, and lies flat in each back low corner joining the end and back stretchers.',
    code: 'CB-010-K',
    shot: 'largeGusset',
    search: () => '10 Series 4 Hole Inside Corner Gusset',
  },
  {
    match: /^2 Hole Inside Corner Gusset/,
    title: () => '2 Hole Inside Corner Gusset',
    text: '1" × 1" × 7/8" triangle, 3/16" walls, triangular window through the sides. One Ø0.281" hole in each leg, 0.5" from the corner. Joins each short top rail to its leg.',
    code: 'CB-010-A',
    shot: 'smallGusset',
    search: () => '10 Series 2 Hole Inside Corner Gusset',
  },
  {
    match: /^2 Hole Inside Corner Bracket/,
    title: () => '2 Hole Inside Corner Bracket',
    text: 'Plain L bracket, 1" × 1" legs (25.2 mm), 7/8" wide (22.6 mm), 3/16" thick, rounded free ends, one Ø0.27" hole in each leg. Sits under each low stretcher end, against the leg.',
    code: 'CBS-010-A',
    shot: 'lBracket',
    search: () => '10 Series 2 Hole Slotted Inside Corner Bracket',
  },
  {
    match: /^Hidden Corner Connector/,
    title: () => 'Hidden Corner Connector (inside to inside)',
    text: 'Small L (about 25 × 26 mm arms, 9 mm wide) that sits inside the slots of both profiles at an inside corner, one arm in each, locked with an M5 grub screw per arm. Barely visible once fitted.',
    code: 'HC-010-A',
    shot: 'hiddenConnector',
    search: () => '10 Series Hidden Corner Connector',
  },
  {
    match: /^Joining plate/,
    title: () => '2 Hole Joining Plate',
    text: '1" × 2" × 3/16" plate, Ø0.281" holes 1" between centres. Bolted under a top rail; the free hole takes a wood screw up into the top.',
    code: 'JP-010-A',
    shot: 'tab',
    search: () => '10 Series 2 Hole Joining Plate',
  },
  {
    match: /^3 Hole Joining Plate/,
    title: () => '3 Hole Joining Plate',
    shot: 'joiningPlate3',
    search: () => '10 Series 3 Hole Joining Plate',
    text: '3" × 7/8" × 3/16" straight plate, three holes 1" apart. Across the centre rail to carry both top panels: middle hole bolted into the rail, outer holes screwed up into the panels.',
  },
  {
    match: /^Levelling foot/,
    title: (n) => n,
    text: 'Antislip levelling mount for 1" rail: Ø1" base, 1/4"-20 stud into the tapped leg end, adjusting nut and lock nut. Turn to level the desk.',
    code: 'McMaster 47065T341',
    shot: 'foot',
    search: () => 'Antislip Leveling Mount for 1" High Single Rail',
  },
  { match: /^Plywood top/, title: (n) => n, text: '3/4" plywood, dropped in between the top rails flush with them and screwed up through the joining plates.' },
  { match: /^Linoleum/, title: () => 'Linoleum', text: 'Furniture linoleum glued to the plywood top.' },
  { match: /^Post/, title: (n) => n, shot: 'rod', search: (n) => `chrome optical shaft ${n.match(/Ø\d+/)?.[0] ?? ''} mm`, text: 'Chrome optical shaft standing in a flange coupling; the shelves are clamped to it.' },
  { match: /^(Rail|Crossbar)/, title: (n) => n, shot: 'rod', search: (n) => `chrome optical shaft ${n.match(/Ø\d+/)?.[0] ?? ''} mm`, text: 'Chrome rod held by cross clamps: rails run front and back over the sheet, crossbars under it.' },
  { match: /^Cross clamp/, title: (n) => n, shot: 'clamp', search: (n) => `cross optical axis fixing clamp ${n.match(/Ø\d+/)?.[0] ?? ''} mm`, text: '90° cross clamp that grips a post and a rail or crossbar.' },
  { match: /^Flange coupling/, title: (n) => n, shot: 'flange', search: (n) => `flange coupling ${n.match(/Ø\d+/)?.[0] ?? ''} mm`, text: 'Flange that the post stands in; the bottom sheet rests on it.' },
  { match: /^Shaft collar/, title: (n) => n, shot: 'collar', search: (n) => `shaft collar ${n.match(/Ø\d+/)?.[0] ?? ''} mm`, text: 'Collar that locks the bottom sheet on the posts.' },
  { match: /sheet$/, title: (n) => n, shot: 'sheet', text: 'Shelf sheet, drilled for the posts. Sizes and hole positions are in the parts list.' },
];

export function partInfo(name) {
  const p = PARTS.find((x) => x.match.test(name));
  if (!p) return { title: name, text: '' };
  return { title: p.title(name), text: p.text, code: p.code, shot: p.shot, link: p.search ? amazon(p.search(name)) : null };
}
