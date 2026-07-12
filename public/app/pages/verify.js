/**
 * verify.js — independent commit–reveal verification. Reads a share link
 * (#r=<code>) or a manually entered team list + seed, reproduces the exact
 * order in-browser, and checks it against the commitment posted before reveal.
 */
import { verifyRitual, decodePermalink } from '/engine/ritual.js';
import { h, icon, copyText } from '/app/ui.js';

const root = document.getElementById('verify-app');
let prefill = null;
try {
  const m = /(?:^|[#&?])r=([^&]+)/.exec(location.hash + '&' + location.search);
  if (m) prefill = decodePermalink(decodeURIComponent(m[1]));
} catch { prefill = null; }

function field(label, control, hint) {
  return h('div', { class: 'field' }, h('label', {}, label), control, hint ? h('p', { class: 'muted small', style: 'margin:4px 0 0' }, hint) : null);
}
function selectEl(name, opts, val) {
  const s = h('select', { name });
  opts.forEach(([v, l]) => { const o = h('option', { value: v }, l); if (v === val) o.selected = true; s.appendChild(o); });
  return s;
}

function view() {
  const form = h('form', { class: 'card stack' },
    h('h2', { style: 'margin-top:0' }, prefill ? 'Verify this shared draft order' : 'Verify a draft order'),
    field('Teams (one per line, in the exact original order)',
      h('textarea', { name: 'teams', required: 'required', rows: '8', text: prefill ? prefill.teamNames.join('\n') : '' })),
    h('div', { class: 'row' },
      field('Mode', selectEl('mode', [['instant', 'Instant'], ['suspense', 'Suspense'], ['weighted', 'Weighted lottery']], prefill?.mode || 'instant')),
      field('Seed', h('input', { name: 'seed', required: 'required', value: prefill?.seed || '', placeholder: 'the published seed' }))),
    field('Commitment posted before the reveal (optional but recommended)',
      h('input', { name: 'commitment', placeholder: 'the SHA-256 hash shared in chat before the reveal' }),
      'Paste it to confirm the seed wasn’t swapped after the fact.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-primary btn-lg', type: 'submit' }, icon('shieldCheck'), 'Verify')),
    h('div', { class: 'verify-result' }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = form.querySelector('.verify-result');
    const teams = form.teams.value.split('\n').map((t) => t.trim()).filter(Boolean);
    const seed = form.seed.value.trim();
    const commitment = form.commitment.value.trim();
    if (teams.length < 2 || !seed) { out.textContent = 'Need at least 2 teams and a seed.'; return; }
    const weights = prefill?.mode === form.mode.value ? prefill?.weights : null;
    try {
      const res = await verifyRitual(
        { teamNames: teams, mode: form.mode.value, seed, weights },
        commitment ? { commitment } : {});
      out.innerHTML = '';
      out.appendChild(resultPanel(res, commitment));
    } catch (err) { out.textContent = 'Could not verify: ' + err.message; }
  });
  root.innerHTML = ''; root.appendChild(form);
  if (prefill) form.requestSubmit();
}

function resultPanel(res, commitment) {
  const okCommit = res.commitmentValid;
  const items = [];
  items.push(h('h3', {}, 'Reproduced order'));
  const t = h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Pick'), h('th', {}, 'Team'))));
  const tb = h('tbody');
  res.recomputedOrder.forEach((tm, i) => tb.appendChild(h('tr', {}, h('td', { class: 'num' }, String(i + 1)), h('td', {}, tm))));
  t.appendChild(tb);

  const commitLine = commitment
    ? (okCommit
      ? h('p', { class: 'verify-ok' }, icon('shieldCheck'), ' Seed matches the commitment — this order is provably the one that was locked in.')
      : h('p', { class: 'verify-bad' }, icon('alert'), ' Seed does NOT match the commitment. The seed was changed after commitment.'))
    : h('p', { class: 'muted' }, 'No commitment provided. Above is the order this seed produces; paste the pre-reveal commitment to confirm it wasn’t swapped.');

  return h('div', { class: 'card stack', style: 'margin-top:16px' },
    commitLine,
    h('div', { class: 'stack' },
      h('label', {}, 'Commitment recomputed from this seed (SHA-256)'),
      h('code', { class: 'commitment-badge' }, res.recomputedCommitment),
      h('button', { class: 'btn btn-ghost small', type: 'button', onClick: (e) => copyText(res.recomputedCommitment, e.currentTarget) }, icon('copy'), 'Copy')),
    ...items, h('div', { class: 'table-scroll' }, t));
}

if (root) view();
