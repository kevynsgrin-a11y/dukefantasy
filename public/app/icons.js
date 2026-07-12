/**
 * Drawn SVG icons (portfolio rule: no emoji iconography). Each is a stroke-based
 * glyph that inherits `currentColor`. Return strings for easy innerHTML use.
 */
const svg = (paths, vb = '0 0 24 24') =>
  `<svg class="ico" viewBox="${vb}" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
  dice: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.1" fill="currentColor"/><circle cx="16" cy="8" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/><circle cx="8" cy="16" r="1.1" fill="currentColor"/><circle cx="16" cy="16" r="1.1" fill="currentColor"/>'),
  shieldCheck: svg('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'),
  trophy: svg('<path d="M7 4h10v3a5 5 0 0 1-10 0z"/><path d="M7 5H4a3 3 0 0 0 3 3M17 5h3a3 3 0 0 1-3 3"/><path d="M10 12.5V15M14 12.5V15M8 20h8M9 20a3 3 0 0 1 6 0"/>'),
  grid: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'),
  chart: svg('<path d="M4 4v16h16"/><path d="M7 15l3-4 3 2 4-6"/>'),
  layers: svg('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5M3 17l9 5 9-5" opacity=".6"/>'),
  calendar: svg('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
  clipboard: svg('<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4a3 3 0 0 1 6 0M9 11h6M9 15h6"/>'),
  money: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'),
  tag: svg('<path d="M3 12l9-9 8 8-9 9z"/><circle cx="8.5" cy="8.5" r="1.3"/>'),
  wind: svg('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h9a2.5 2.5 0 1 1-2.5 2.5"/>'),
  trending: svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  book: svg('<path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 3v18"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  scale: svg('<path d="M12 3v18M7 21h10M6 7h12"/><path d="M6 7l-3 6a3 3 0 0 0 6 0zM18 7l-3 6a3 3 0 0 0 6 0z"/>'),
  menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
  share: svg('<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>'),
  download: svg('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/>'),
  alert: svg('<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>'),
};

export function iconEl(name) {
  const span = document.createElement('span');
  span.innerHTML = ICONS[name] || '';
  return span.firstChild;
}
