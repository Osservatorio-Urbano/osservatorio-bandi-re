const LINEE = {
  L1: 'Sostenibilità sociale',
  L2: 'Sostenibilità economica',
  L3: 'Sostenibilità ambientale',
  L4: 'Sostenibilità istituzionale',
  L5: 'Sostenibilità nei microcosmi',
  L6: 'Sostenibilità nell\'area vasta'
};
const CATS = ['UE', 'Nazionale/PNRR', 'Regione ER', 'Fondazioni'];

const state = { bandi: [], cats: new Set(), linee: new Set(), q: '', deadline: 'all', sort: 'deadline' };
const el = (id) => document.getElementById(id);
const today = new Date(); today.setHours(0, 0, 0, 0);

function daysLeft(b) {
  if (b.scadenza_tipo === 'sportello' || !b.scadenza || !/^\d{4}-\d{2}-\d{2}$/.test(b.scadenza)) return null;
  const d = new Date(b.scadenza + 'T00:00:00');
  return Math.round((d - today) / 86400000);
}
function urgency(b) {
  const d = daysLeft(b);
  if (d === null) return 'sportello';
  if (d <= 30) return 'urgente';
  if (d <= 60) return 'vicina';
  return 'ampia';
}
function fmtDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return s || 'n.d.';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
function leftLabel(b) {
  const d = daysLeft(b);
  if (d === null) return 'a sportello';
  if (d < 0) return 'scaduto';
  if (d === 0) return 'scade oggi';
  return `${d} giorni`;
}

function render() {
  const rows = filtered();
  el('count').textContent = `${rows.length} bandi visualizzati su ${state.bandi.length} censiti`;
  const list = el('list');
  list.innerHTML = '';
  el('empty').hidden = rows.length > 0;
  const frag = document.createDocumentFragment();
  for (const b of rows) frag.appendChild(card(b));
  list.appendChild(frag);
  renderChips();
  renderLines();
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  let rows = state.bandi.filter((b) => {
    if (state.cats.size && !state.cats.has(b.categoria)) return false;
    if (state.linee.size && !(b.linee || []).some((l) => state.linee.has(l))) return false;
    if (state.deadline === 'sportello' && urgency(b) !== 'sportello') return false;
    if (state.deadline !== 'all' && state.deadline !== 'sportello') {
      const d = daysLeft(b);
      if (d === null || d > Number(state.deadline)) return false;
    }
    if (q) {
      const hay = [b.titolo, b.ente, b.programma, b.descrizione, b.beneficiari, b.note, (b.linee || []).map((l) => LINEE[l]).join(' ')]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const byDate = (a, b) => {
    const da = daysLeft(a), db = daysLeft(b);
    if (da === null && db === null) return (a.titolo || '').localeCompare(b.titolo || '', 'it');
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  };
  if (state.sort === 'deadline') rows.sort(byDate);
  else if (state.sort === 'deadline_desc') rows.sort((a, b) => byDate(b, a));
  else if (state.sort === 'ente') rows.sort((a, b) => (a.ente || '').localeCompare(b.ente || '', 'it'));
  else rows.sort((a, b) => (a.titolo || '').localeCompare(b.titolo || '', 'it'));
  return rows;
}

function card(b) {
  const u = urgency(b);
  const art = document.createElement('article');
  art.className = 'card';
  art.dataset.urgency = u;
  const badges = [`<span class="badge">${esc(b.categoria || 'n.d.')}</span>`]
    .concat((b.linee || []).map((l) => `<span class="badge badge-line">${l} · ${esc(LINEE[l] || '')}</span>`))
    .join('');
  art.innerHTML = `
    <div class="card-head">
      <div>
        <h3 class="card-title">${esc(b.titolo || 'Senza titolo')}</h3>
        <p class="card-ente">${esc(b.ente || 'n.d.')}${b.programma && b.programma !== 'n.d.' ? ' · ' + esc(b.programma) : ''}</p>
        ${b.descrizione ? `<p class="card-desc">${esc(b.descrizione)}</p>` : ''}
        <div class="card-badges">${badges}</div>
      </div>
      <div class="deadline">
        <span class="fact-label">Scadenza</span>
        <span class="deadline-date">${u === 'sportello' ? 'a sportello' : fmtDate(b.scadenza)}</span>
        <span class="deadline-left u-${u}">${leftLabel(b)}</span>
      </div>
    </div>
    <div class="card-foot">
      ${fact('Dotazione', b.dotazione)}
      ${fact('Contributo max', b.contributo_max)}
      ${fact('Cofinanziamento', b.cofinanziamento)}
      ${fact('Beneficiari', b.beneficiari)}
      ${b.url ? `<a class="card-link" href="${esc(b.url)}" target="_blank" rel="noopener">Bando ufficiale →</a>` : ''}
    </div>`;
  return art;
}
function fact(label, value) {
  if (!value) return '';
  return `<div class="fact"><span class="fact-label">${label}</span><span class="fact-value">${esc(String(value))}</span></div>`;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderChips() {
  const box = el('catChips');
  if (!box.dataset.ready) {
    box.innerHTML = CATS.map((c) => `<button class="chip" type="button" data-cat="${c}" aria-pressed="false">${c}</button>`).join('');
    box.dataset.ready = '1';
    box.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]'); if (!btn) return;
      const c = btn.dataset.cat;
      state.cats.has(c) ? state.cats.delete(c) : state.cats.add(c);
      render();
    });
  }
  box.querySelectorAll('[data-cat]').forEach((btn) => btn.setAttribute('aria-pressed', String(state.cats.has(btn.dataset.cat))));

  const lbox = el('lineChips');
  if (!lbox.dataset.ready) {
    lbox.innerHTML = Object.keys(LINEE).map((k) => `<button class="chip" type="button" data-linea="${k}" aria-pressed="false">${k}</button>`).join('');
    lbox.dataset.ready = '1';
    lbox.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-linea]'); if (!btn) return;
      toggleLine(btn.dataset.linea);
    });
    lbox.querySelectorAll('[data-linea]').forEach((b) => (b.title = LINEE[b.dataset.linea]));
  }
  lbox.querySelectorAll('[data-linea]').forEach((btn) => btn.setAttribute('aria-pressed', String(state.linee.has(btn.dataset.linea))));
}
function toggleLine(k) {
  state.linee.has(k) ? state.linee.delete(k) : state.linee.add(k);
  render();
}

function renderLines() {
  const grid = el('lineGrid');
  const counts = Object.fromEntries(Object.keys(LINEE).map((k) => [k, 0]));
  for (const b of state.bandi) for (const l of b.linee || []) if (l in counts) counts[l]++;
  const max = Math.max(1, ...Object.values(counts));
  grid.innerHTML = Object.entries(LINEE).map(([k, name]) => `
    <button class="line-card" type="button" data-linea="${k}" aria-pressed="${state.linee.has(k)}">
      <span class="line-code">${k}</span>
      <span class="line-name">${name}</span>
      <span class="bar"><i style="width:${Math.round((counts[k] / max) * 100)}%"></i></span>
      <span class="line-count">${counts[k]} bandi attivi</span>
    </button>`).join('');
  if (!grid.dataset.ready) {
    grid.dataset.ready = '1';
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-linea]'); if (btn) toggleLine(btn.dataset.linea);
    });
  }
}

function renderKpis(meta) {
  const urg = state.bandi.filter((b) => urgency(b) === 'urgente').length;
  const sport = state.bandi.filter((b) => urgency(b) === 'sportello').length;
  const linee = new Set(state.bandi.flatMap((b) => b.linee || []));
  el('kpiTot').textContent = state.bandi.length;
  el('kpiUrg').textContent = urg;
  el('kpiSport').textContent = sport;
  el('kpiLinee').textContent = `${linee.size}/6`;
  const byCat = CATS.map((c) => `${state.bandi.filter((b) => b.categoria === c).length} ${c}`).join(' · ');
  el('kpiTotFoot').textContent = byCat;
  const next = state.bandi.map(daysLeft).filter((d) => d !== null && d >= 0).sort((a, b) => a - b)[0];
  el('kpiUrgFoot').textContent = next === undefined ? '\u00a0' : `prossima tra ${next} giorni`;
  el('updatedAt').textContent = meta && meta.aggiornato ? `Aggiornato il ${fmtDate(meta.aggiornato)}` : '';
}

function exportCsv() {
  const rows = filtered();
  const cols = ['titolo', 'ente', 'programma', 'categoria', 'linee', 'scadenza', 'dotazione', 'contributo_max', 'cofinanziamento', 'beneficiari', 'url'];
  const csv = [cols.join(';')].concat(rows.map((b) => cols.map((c) => {
    const v = Array.isArray(b[c]) ? b[c].join(' ') : (b[c] ?? '');
    return '"' + String(v).replace(/"/g, '""') + '"';
  }).join(';'))).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'bandi-reggio-emilia.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function wire() {
  el('q').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  el('deadline').addEventListener('change', (e) => { state.deadline = e.target.value; render(); });
  el('sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  el('resetBtn').addEventListener('click', () => {
    state.cats.clear(); state.linee.clear(); state.q = ''; state.deadline = 'all'; state.sort = 'deadline';
    el('q').value = ''; el('deadline').value = 'all'; el('sort').value = 'deadline';
    render();
  });
  el('exportBtn').addEventListener('click', exportCsv);
  el('themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
  });
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.dataset.theme = 'dark';
}

async function init() {
  el('list').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  wire();
  try {
    const res = await fetch('data/bandi.json', { cache: 'no-store' });
    const payload = await res.json();
    state.bandi = payload.bandi || [];
    renderKpis(payload.meta);
    render();
  } catch (err) {
    el('list').innerHTML = '';
    el('empty').hidden = false;
    el('empty').innerHTML = '<p class="empty-title">Dati non disponibili</p><p class="empty-sub">Il file dei bandi non è stato caricato correttamente.</p>';
  }
}
init();
