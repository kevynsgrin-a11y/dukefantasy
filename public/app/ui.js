/**
 * ui.js — shared frontend runtime + cross-cutting component contract.
 *
 * Loaded on every page. Two jobs:
 *   1) Progressive enhancement of the static chrome (nav toggle, theme toggle,
 *      year stamp, email-capture + affiliate-gate wiring). The page works
 *      without JS; this only enhances.
 *   2) Export DOM-building component factories that page modules and v0 share.
 *      These are the documented, stable component contract (see
 *      docs/v0-handoff.md). v0 restyles via CSS classes + tokens, never markup.
 */

import { ICONS } from './icons.js';

/* ---------- tiny DOM helper ---------- */
export function h(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return node;
}
export const icon = (name) => {
  const s = document.createElement('span');
  s.innerHTML = ICONS[name] || '';
  s.className = 'ico-wrap';
  return s;
};
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- cross-cutting components ---------- */

/** DataAsOfStamp — "as of {date}" provenance chip. */
export function DataAsOfStamp(text) {
  return h('span', { class: 'stamp' }, icon('clock'), h('span', { text: text || '' }));
}

/** StalenessStrip — shown only when a feed is stale/degraded. */
export function StalenessStrip(feedState) {
  if (!feedState || (!feedState.stale && feedState.ok !== false)) return document.createComment('fresh');
  return h('div', { class: 'staleness-strip', role: 'status' },
    icon('alert'),
    h('span', { text: feedState.notice || 'Showing the last good copy — live sources are lagging.' }));
}

/** SourcesBlock — attribution exactly as terms require. */
export function SourcesBlock(sources) {
  const wrap = h('div', { class: 'sources-block' }, h('strong', { text: 'Sources & attribution: ' }));
  const list = (sources || []).map((s) =>
    s.url ? h('a', { href: s.url, rel: 'nofollow noopener', target: '_blank', text: s.label }) : h('span', { text: s.label }));
  list.forEach((n, i) => { if (i) wrap.appendChild(document.createTextNode(' · ')); wrap.appendChild(n); });
  return wrap;
}

/** AdSlot — CLS-safe reserved-height display ad placeholder. */
export function AdSlot(id, size = 'rectangle') {
  return h('div', { class: 'ad-slot', 'data-ad-slot': id, 'data-size': size, 'aria-hidden': 'true' },
    h('span', { text: `ad · ${size}` }));
}

/** FTCDisclosure — sits adjacent to every affiliate surface. */
export function FTCDisclosure() {
  return h('p', { class: 'ftc' }, 'Advertising disclosure: some links are partner links. If you sign up through them we may earn a commission, at no cost to you. It never changes our data or our picks — we don’t make picks.');
}

/**
 * AffiliateSlot — sportsbook/DFS CPA placeholder with NON-NEGOTIABLE compliance
 * gate rendered every time: 21+ notice, state-availability disclaimer, RG link,
 * and an FTC disclosure. Only placed on adult-intent pages by the generator.
 */
export function AffiliateSlot({ id, label = 'Partner offer', blurb = '' } = {}) {
  return h('aside', { class: 'affiliate-slot', 'data-affiliate-slot': id, role: 'complementary', 'aria-label': 'Partner offer' },
    h('div', { class: 'badge badge-accent', text: '21+ · sponsored' }),
    h('h3', { text: label }),
    blurb ? h('p', { class: 'muted small', text: blurb }) : null,
    h('button', { class: 'btn btn-accent', disabled: 'disabled', type: 'button' }, 'Offer coming soon'),
    h('div', { class: 'compliance-gate' },
      h('p', { html: '<strong>21+ only.</strong> Available only where legal. Void where prohibited. Eligibility and offers vary by state.' }),
      h('p', { html: 'If you or someone you know has a gambling problem, call <strong>1-800-GAMBLER</strong>. See our <a href="/responsible-gaming/">Responsible Gaming</a> resources.' }),
    ),
    FTCDisclosure());
}

/** CommitmentBadge — the copyable pre-reveal hash. */
export function CommitmentBadge(hash, { label = 'Commitment (SHA-256 of the seed)' } = {}) {
  const code = h('code', { class: 'commitment-badge', text: hash || '—' });
  const btn = h('button', { class: 'btn btn-ghost small', type: 'button',
    onClick: () => copyText(hash, btn) }, icon('copy'), 'Copy');
  return h('div', { class: 'stack' }, h('label', { text: label }), code, btn);
}

/** EmailCapture — wraps the KV /api/subscribe pattern. */
export function EmailCapture({ magnet = 'Draft Week Checklist', tag = 'general' } = {}) {
  const form = h('form', { class: 'email-capture card', 'data-tag': tag },
    h('h3', { text: `Get the ${magnet}` }),
    h('p', { class: 'muted small', text: 'One email. No spam. Unsubscribe anytime.' }),
    h('div', { class: 'row' },
      h('input', { type: 'email', name: 'email', required: 'required', placeholder: 'you@email.com', 'aria-label': 'Email address' }),
      h('button', { class: 'btn btn-primary', type: 'submit' }, icon('mail'), 'Send it')),
    h('p', { class: 'form-status small muted', role: 'status' }));
  wireEmailCapture(form);
  return form;
}

/* ---------- helpers ---------- */
export async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) { const old = btn.innerHTML; btn.textContent = 'Copied ✓'; setTimeout(() => (btn.innerHTML = old), 1400); }
  } catch { /* clipboard blocked; ignore */ }
}

function wireEmailCapture(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector('.form-status');
    const email = form.querySelector('input[name=email]').value.trim();
    if (!email) return;
    status.textContent = 'Sending…';
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, tag: form.dataset.tag || 'general' }),
      });
      status.textContent = res.ok ? 'You’re on the list. Check your inbox.' : 'Hmm, that didn’t go through. Try again shortly.';
    } catch {
      status.textContent = 'Network hiccup — try again shortly.';
    }
  });
}

/* ---------- a11y net: ensure every control has an accessible name ---------- */
function nameControls(root = document) {
  for (const el of root.querySelectorAll('select:not([aria-label]):not([aria-labelledby]), input:not([type=hidden]):not([aria-label]):not([aria-labelledby])')) {
    if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) continue;
    if (el.closest('label')) continue;
    const lbl = el.closest('.field, .row, .stack')?.querySelector('label')?.textContent
      || el.getAttribute('placeholder') || el.name;
    if (lbl) el.setAttribute('aria-label', lbl.trim());
  }
}

/* ---------- chrome enhancement (auto-run) ---------- */
function initChrome() {
  nameControls();
  // Tool modules render controls after load — keep naming them as they appear.
  if ('MutationObserver' in window) {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (n.nodeType === 1) { if (n.matches?.('select,input')) nameControls(n.parentNode || document); else nameControls(n); }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  // Mobile nav toggle.
  const toggle = $('.nav-toggle');
  const nav = $('#site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', String(!open));
      toggle.setAttribute('aria-expanded', String(!open));
    });
  }
  // Theme toggle (persisted).
  const saved = localStorage.getItem('duke-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  const tbtn = $('.theme-toggle');
  if (tbtn) tbtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme')
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('duke-theme', next);
  });
  // Year stamp.
  $$('.year-now').forEach((n) => (n.textContent = String(new Date().getFullYear())));
  // Wire any statically-rendered email capture forms.
  $$('.email-capture').forEach((f) => { if (!f.dataset.wired) { f.dataset.wired = '1'; wireEmailCapture(f); } });
}
if (document.readyState !== 'loading') initChrome();
else document.addEventListener('DOMContentLoaded', initChrome);
