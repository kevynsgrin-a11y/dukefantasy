/**
 * namegen.js — league name generator. Fully local, no data fetch.
 * A toy: Math.random combines football-flavored parts + hand-written puns.
 * Clean/family-friendly by design, and deliberately free of gambling content.
 */
import { h, icon, copyText } from '/app/ui.js';

const root = document.getElementById('namegen-app');

/* ---------- parts (40+ so it feels varied) ---------- */
const ADJ = [
  'Blitzing', 'Bruising', 'Clutch', 'Electric', 'Fearless', 'Feral', 'Galloping',
  'Gridiron', 'Mighty', 'Rampaging', 'Reckless', 'Roaring', 'Rowdy', 'Ruthless',
  'Scrappy', 'Thundering', 'Turbo', 'Undefeated', 'Unstoppable', 'Fighting',
  'Flying', 'Relentless', 'Iron', 'Rogue',
];
const MASCOT = [
  'Blitzers', 'Bootleggers', 'Ball Hawks', 'Cleats', 'Downfielders', 'End Zoners',
  'Field Generals', 'Gunslingers', 'Hail Marys', 'Hurdlers', 'Juggernauts',
  'Linebackers', 'Maulers', 'Playmakers', 'Pylons', 'Red Zoners', 'Sackmasters',
  'Scramblers', 'Stiff Arms', 'Tacklers', 'Touchdowns', 'Pocket Passers',
  'Blitz Brigade', 'Ball Hogs',
];
const THEME = [
  'Backfield', 'Blitz', 'End Zone', 'Red Zone', 'Gridiron', 'Pocket', 'Sideline',
  'Trenches', 'Secondary', 'Flat', 'Hash Marks', 'Two-Minute Drill', 'Fourth Down',
  'Overtime', 'Turf', 'Long Bomb', 'Play Action', 'Hurry-Up', 'Goal Line', 'Cover Two',
];
const PUN = [
  'Game of Throws', 'Blitz Please', 'Show Me Your TDs', 'The Fresh Prince of Ball Air',
  'Victorious Secret', 'Better Call Ball', 'Analysis Paralysis', 'Waiver Wire Warriors',
  'Sunday Scaries', 'Cleat Street', 'Fourth and Long Shots', 'The Pocket Rockets',
  'Hail Mary Full of Grace', 'Trust the Process', 'The Comeback Kids', 'Gridiron Gladiators',
  'Two-Point Conversationalists', 'Special Teams Assemble', 'The Zone Defenders',
  'Pigskin Prophets', 'The Bye Week Blues', 'Couch Potato Athletes',
  'The Armchair Quarterbacks', 'Fantasy Fumblers', 'Red Zone Renegades',
  'Draft Day Disasters', 'The Overtime Outlaws', 'The Scrambled Eggs',
  'End Zone Dance Party', 'The Blindside Bandits',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function buildName() {
  const r = Math.random();
  if (r < 0.35) return pick(PUN);
  if (r < 0.65) return `The ${pick(ADJ)} ${pick(MASCOT)}`;
  if (r < 0.85) return `${pick(MASCOT)} of the ${pick(THEME)}`;
  return `The ${pick(THEME)} ${pick(MASCOT)}`;
}

/* ---------- state ---------- */
const MAX = 8;
const history = []; // previously generated names, newest first
let current = '';
let nameEl, historyWrap;

function generate() {
  let next = buildName();
  // avoid an immediate repeat or a name already sitting in the list
  for (let i = 0; i < 24 && (next === current || history.includes(next)); i++) next = buildName();
  if (current) {
    history.unshift(current);
    if (history.length > MAX) history.pop();
  }
  current = next;
  render();
}

/* ---------- view ---------- */
function render() {
  if (nameEl) nameEl.textContent = current;
  if (historyWrap) historyWrap.replaceChildren(...historyView());
}

function historyView() {
  if (!history.length) {
    return [h('p', { class: 'muted small' }, 'Names you generate collect here — copy the one that sticks.')];
  }
  return history.map((name) =>
    h('div', { class: 'row', style: 'align-items:center;gap:8px' },
      h('span', { style: 'flex:1;min-width:0;overflow-wrap:anywhere' }, name),
      h('button', {
        class: 'btn btn-ghost small',
        type: 'button',
        'aria-label': `Copy “${name}”`,
        onClick: (e) => copyText(name, e.currentTarget),
      }, icon('copy'), 'Copy')));
}

function init() {
  nameEl = h('p', {
    style: 'font-size:clamp(1.7rem,6vw,2.7rem);font-weight:800;line-height:1.15;margin:4px 0 2px;min-height:1.2em;overflow-wrap:anywhere',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  });
  historyWrap = h('div', { class: 'stack' });

  const tool = h('div', { class: 'card stack' },
    h('p', { class: 'eyebrow' }, 'Your league needs a name'),
    nameEl,
    h('div', { class: 'row' },
      h('button', {
        class: 'btn btn-primary btn-lg',
        type: 'button',
        onClick: generate,
      }, icon('dice'), 'Generate'),
      h('button', {
        class: 'btn',
        type: 'button',
        onClick: (e) => copyText(current, e.currentTarget),
      }, icon('copy'), 'Copy')),
    h('p', { class: 'muted small' }, 'Clean by default. Tap Generate until one clicks.'));

  const recent = h('div', { class: 'card stack' },
    h('h2', { style: 'margin-top:0' }, 'Recent names'),
    historyWrap);

  root.replaceChildren(tool, recent);
  generate(); // show one immediately, above the fold
}

if (root) init();
