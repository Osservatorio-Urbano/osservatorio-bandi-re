import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fetchFesrEr } from './connectors/fesr-er.mjs';
import { fetchPaDigitale } from './connectors/padigitale.mjs';
import { fetchEuSedia } from './connectors/eu-sedia.mjs';
import { fetchFondazioni } from './connectors/fondazioni.mjs';
import { fetchOpenFundraising } from './connectors/openfundraising.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const datasetPath = path.join(rootDir, 'public', 'data', 'bandi.json');
const sourcesStatusPath = path.join(rootDir, 'public', 'data', 'quality', 'sources-status.json');
const logPath = path.join(rootDir, 'public', 'data', 'quality', 'ingest.log');

console.log('=== AVVIO SISTEMA DI ACQUISIZIONE AUTOMATICA BANDI (RE FUNDING) ===');

const nowRome = new Date();
const todayStr = nowRome.toISOString().split('T')[0];

const logEntries = [];
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logEntries.push(line);
}

// 1. Carica dataset consolidato esistente (FAIL-SAFE)
if (!fs.existsSync(datasetPath)) {
  console.error(`ERRORE CRITICO: dataset canonico non trovato in ${datasetPath}. Eseguire prima migrate-legacy.`);
  process.exit(1);
}

const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
const existingBandi = dataset.bandi || [];
log(`Dataset consolidato caricato: ${existingBandi.length} record attuali.`);

// Mappa per ricerca rapida e deduplicazione su ID e URL canonico
const bandoById = new Map();
const bandoByUrl = new Map();

for (const b of existingBandi) {
  bandoById.set(b.id, b);
  if (b.sourceCanonicalUrl) {
    bandoByUrl.set(normalizeUrl(b.sourceCanonicalUrl), b);
  }
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/$/, '')}`;
  } catch {
    return (url || '').trim().toLowerCase();
  }
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'sconosciuto';
  }
}

function generateStableId(ente, programma, url) {
  const key = `${(ente || '').trim().toLowerCase()}::${(programma || '').trim().toLowerCase()}::${(url || '').trim().toLowerCase()}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex').substring(0, 10);
  return `re-bando-${hash}`;
}

// 2. Classificazione automatica linee strategiche DUP (L1-L6)
function detectStrategicLines(titolo, descrizione, programma) {
  const text = `${titolo} ${descrizione} ${programma}`.toLowerCase();
  const lines = new Set();

  if (/sociale|inclusione|welfare|povert|anzian|disabil|giovan|famigli|scuol|educat|assistenz/i.test(text)) {
    lines.add('L1');
  }
  if (/economi|impres|pmi|commerci|innovazion|startup|lavoro|occupazion|competitiv|filiere/i.test(text)) {
    lines.add('L2');
  }
  if (/ambient|clim|energi|verde|resilien|rifiut|idric|forest|sostenibil|circolar|emission|decarbon/i.test(text)) {
    lines.add('L3');
  }
  if (/istituzional|pa\b|digital|comun|semplificazion|competen|trasparen|governan|open data|personale|suap|sue/i.test(text)) {
    lines.add('L4');
  }
  if (/microcosm|quartier|prossimit|frazion|comunit|territor|partecipazion|vicinato/i.test(text)) {
    lines.add('L5');
  }
  if (/area vasta|metropolitan|distrett|bacino|infrastruttur|mobilita|trasport|logist/i.test(text)) {
    lines.add('L6');
  }

  // Fallback garantito
  if (lines.size === 0) lines.add('L4');
  return Array.from(lines);
}

// 3. Verifica ammissibilità Comuni / PA
function detectEligibility(beneficiari, titolo, descrizione) {
  const text = `${beneficiari} ${titolo} ${descrizione}`.toLowerCase();
  if (/solo persone fisiche|solo studenti|esclusivamente pmi|solo liberi professionisti/i.test(text)) {
    return 'excluded';
  }
  if (/comun|enti locali|pubblich|ats|ambiti territoriali|enti pubblici|unioni di comuni/i.test(text)) {
    return 'confirmed';
  }
  return 'potential';
}

// 4. Tag tematici
function extractTags(text) {
  const tags = new Set();
  const lower = text.toLowerCase();
  const map = {
    'digitale': /digital|cloud|ict|dati|interoperabil|software|piattaform/i,
    'ambiente': /ambient|clim|energi|idrogen|verde|emission|resilien/i,
    'sociale': /social|inclus|welfare|povert|fragil|famigli/i,
    'innovazione': /innovaz|ricerc|svilupp|laborator|tecnolog/i,
    'rigenerazione': /rigeneraz|urban|riqualific|patrimoni|spazi/i,
    'mobilita': /mobilit|trasport|ciclab|tpl|veicol/i,
  };
  for (const [tag, regex] of Object.entries(map)) {
    if (regex.test(lower)) tags.add(tag);
  }
  return Array.from(tags);
}

// 5. Calcolo Score motivato (0-100)
function computeScore(bando) {
  let score = 50;
  const reasons = [];

  if (bando.eligibility === 'confirmed') {
    score += 25;
    reasons.push('Ammissibilità confermata per il Comune o ATS capofila (+25)');
  } else if (bando.eligibility === 'potential') {
    score += 10;
    reasons.push('Ammissibilità potenziale o in partenariato pubblico-privato (+10)');
  } else {
    score -= 30;
    reasons.push('Bando non direttamente accessibile all\'Ente Locale (-30)');
  }

  if (bando.state === 'open' || bando.state === 'rolling_verified') {
    score += 15;
    reasons.push('Opportunità attiva e verificata con fonte ufficiale (+15)');
  } else if (bando.state === 'closed') {
    score -= 40;
    reasons.push('Bando concluso per scadenza termini (-40)');
  }

  if (bando.strategicLines.length >= 2) {
    score += 10;
    reasons.push(`Copre ${bando.strategicLines.length} linee strategiche di mandato DUP (+10)`);
  } else {
    score += 5;
    reasons.push('Allineato a una linea strategica di mandato DUP (+5)');
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

// 6. Esecuzione dei connettori ufficiali
log('Inizio interrogazione connettori ufficiali...');

const sourceReports = [];
let totalNew = 0;
let totalUpdated = 0;

const connectors = [
  { id: 'fesr_er', name: 'PR FESR ed Energia Emilia-Romagna', runner: fetchFesrEr, method: 'rss_2_0' },
  { id: 'pa_digitale_2026', name: 'PA Digitale 2026 (PNRR)', runner: fetchPaDigitale, method: 'open_data_portal' },
  { id: 'ec_funding_tenders', name: 'European Commission SEDIA API', runner: fetchEuSedia, method: 'api_rest' },
  { id: 'fondazioni_territoriali', name: 'Fondazioni Manodori e Cariparma', runner: fetchFondazioni, method: 'html_scrape' },
  { id: 'openfundraising_fondazioni', name: 'Open Fundraising & Fondazioni Erogative (incl. Unipolis)', runner: fetchOpenFundraising, method: 'open_data_portal' }
];

for (const conn of connectors) {
  const startTime = Date.now();
  log(`Interrogazione: ${conn.name}...`);
  try {
    const res = await conn.runner();
    const duration = Date.now() - startTime;
    const items = res.items || [];
    const errors = res.errors || [];

    log(`-> ${conn.name}: ${items.length} bandi ricevuti in ${duration}ms, ${errors.length} errori.`);

    sourceReports.push({
      id: conn.id,
      name: conn.name,
      method: conn.method,
      status: 'operativa',
      last_scanned_at: new Date().toISOString(),
      items_acquired: items.length,
      errors_count: errors.length,
      errors: errors.map(e => e.error || e),
      response_time_ms: duration,
      endpoint_reachable: errors.length === 0
    });

    // Elabora e fonde gli item
    for (const raw of items) {
      const normUrl = normalizeUrl(raw.url);
      const existing = bandoByUrl.get(normUrl) || bandoById.get(generateStableId(raw.ente, raw.programma, raw.url));

      if (existing) {
        // AGGIORNAMENTO / RILEVAZIONE PROROGHE O STATI
        let modified = false;

        // Se la scadenza è cambiata (es. proroga)
        if (raw.scadenza && raw.scadenza !== existing.deadline) {
          const oldD = existing.deadline || 'n.d.';
          existing.deadline = raw.scadenza;
          existing.deadlineType = 'data';
          existing.changeLog.push({
            date: todayStr,
            note: `Proroga/modifica scadenza da fonte ufficiale: da ${oldD} a ${raw.scadenza}.`
          });
          modified = true;
          log(`[PROROGA/MODIFICA] ${existing.original.titolo}: nuova scadenza ${raw.scadenza}`);
        }

        // Se lo stato è cambiato
        if (raw.rawStatus && raw.rawStatus.includes('TERMINATO') && existing.state !== 'closed') {
          existing.state = 'closed';
          existing.changeLog.push({
            date: todayStr,
            note: 'Bando chiuso/terminato ufficialmente sul portale erogatore.'
          });
          modified = true;
          log(`[CHIUSURA] ${existing.original.titolo}: terminato da fonte.`);
        }

        // Se confermato aperto
        if (existing.state === 'unknown' && (!existing.deadline || existing.deadline >= todayStr)) {
          existing.state = 'open';
          modified = true;
        }

        // Aggiorna data di verifica effettiva
        existing.sourceCheckedAt = `${todayStr}T08:00:00+02:00`;
        existing.lastChangedAt = `${todayStr}T08:00:00+02:00`;

        if (modified) totalUpdated++;
      } else {
        // NUOVO BANDO IDENTIFICATO
        const lines = detectStrategicLines(raw.titolo, raw.descrizione, raw.programma);
        const eligibility = detectEligibility(raw.beneficiari, raw.titolo, raw.descrizione);
        const thematicTags = extractTags(`${raw.titolo} ${raw.descrizione} ${raw.programma}`);
        const id = generateStableId(raw.ente, raw.programma, raw.url);

        let state = 'open';
        if (raw.rawStatus && raw.rawStatus.includes('TERMINATO')) {
          state = 'closed';
        } else if (raw.scadenza && raw.scadenza < todayStr) {
          state = 'closed';
        } else if (raw.scadenza_tipo === 'sportello') {
          state = 'rolling_verified';
        }

        const candidateBando = {
          id,
          original: {
            titolo: raw.titolo,
            ente: raw.ente,
            programma: raw.programma,
            categoria: raw.categoria,
            linee: lines,
            descrizione: raw.descrizione,
            beneficiari: raw.beneficiari,
            dotazione: raw.dotazione || '',
            contributo_max: raw.contributo_max || '',
            cofinanziamento: raw.cofinanziamento || '',
            scadenza: raw.scadenza || '',
            scadenza_tipo: raw.scadenza_tipo,
            url: raw.url,
            note: raw.note
          },
          sourceCanonicalUrl: raw.url,
          sourceDomain: extractDomain(raw.url),
          sourceType: raw.sourceType,
          sourceCheckedAt: `${todayStr}T08:00:00+02:00`,
          sourceEvidence: raw.note,
          discoveredAt: `${todayStr}T08:00:00+02:00`,
          firstPublishedAt: null,
          lastChangedAt: `${todayStr}T08:00:00+02:00`,
          deadline: raw.scadenza || null,
          deadlineType: raw.scadenza_tipo === 'sportello' ? 'sportello' : 'data',
          state,
          eligibility,
          strategicLines: lines,
          thematicTags,
          score0to100: 50,
          scoreReasons: [],
          publicSummary: raw.descrizione,
          risks: [],
          evidenceLinks: [
            {
              title: `Fonte ufficiale ${raw.ente}`,
              url: raw.url
            }
          ],
          changeLog: [
            {
              date: todayStr,
              note: `Nuova opportunità acquisita automaticamente tramite connettore ${conn.name}.`
            }
          ],
          validity: {
            isOfficiallyVerified: true,
            verificationSource: raw.ente,
            verifiedUntil: raw.scadenza || null
          }
        };

        const { score, reasons } = computeScore(candidateBando);
        candidateBando.score0to100 = score;
        candidateBando.scoreReasons = reasons;

        existingBandi.push(candidateBando);
        bandoById.set(id, candidateBando);
        bandoByUrl.set(normUrl, candidateBando);
        totalNew++;
        log(`[NUOVA OPPORTUNITA] ${raw.titolo} (${raw.ente}) - Score: ${score}`);
      }
    }
  } catch (err) {
    log(`ERRORE CRITICO in ${conn.name}: ${err.message}`);
    sourceReports.push({
      id: conn.id,
      name: conn.name,
      method: conn.method,
      status: 'errore',
      last_scanned_at: new Date().toISOString(),
      items_acquired: 0,
      errors_count: 1,
      errors: [err.message],
      response_time_ms: Date.now() - startTime,
      endpoint_reachable: false
    });
  }
}

// 7. Aggiungi nel report le fonti previste / in attesa di integrazione
const plannedSources = [
  { id: 'mlps_lavoro', name: 'Ministero del Lavoro e delle Politiche Sociali', method: 'html_scrape', status: 'prevista' },
  { id: 'interreg_central', name: 'Interreg Central Europe', method: 'html_scrape', status: 'prevista' },
  { id: 'urban_innovative_actions', name: 'European Urban Initiative (EUI)', method: 'html_scrape', status: 'prevista' }
];

for (const ps of plannedSources) {
  sourceReports.push({
    id: ps.id,
    name: ps.name,
    method: ps.method,
    status: 'prevista',
    last_scanned_at: null,
    items_acquired: 0,
    errors_count: 0,
    errors: [],
    response_time_ms: 0,
    endpoint_reachable: null,
    note: 'Fonte monitorata in modalità pianificata; integrazione connettore automatico programmata.'
  });
}

// 8. Controllo chiusure per scadenze trascorse
let totalExpired = 0;
for (const b of existingBandi) {
  if (b.state === 'open' && b.deadline && /^\d{4}-\d{2}-\d{2}$/.test(b.deadline)) {
    if (b.deadline < todayStr) {
      b.state = 'closed';
      b.changeLog.push({
        date: todayStr,
        note: 'Bando archiviato: termini di scadenza trascorsi.'
      });
      totalExpired++;
      log(`[SCADENZA AUTOMATICA] Archiviato bando ${b.original.titolo} (scaduto il ${b.deadline})`);
    }
  }
}

log(`Riepilogo scansione: ${totalNew} nuove opportunità, ${totalUpdated} aggiornate/prorogate, ${totalExpired} archiviate.`);

// 9. Calcola statistiche aggiornate per la dashboard
const aperti = existingBandi.filter(b => b.state === 'open').length;
const sportello = existingBandi.filter(b => b.state === 'rolling_verified').length;
const chiusi = existingBandi.filter(b => b.state === 'closed').length;
const inVerifica = existingBandi.filter(b => b.state === 'unknown').length;
const entro30 = existingBandi.filter(b => {
  if (b.state !== 'open' || !b.deadline) return false;
  const d = new Date(`${b.deadline}T00:00:00`);
  const diff = Math.round((d - nowRome) / 86400000);
  return diff >= 0 && diff <= 30;
}).length;

const coperturaLinee = {};
['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].forEach(l => {
  coperturaLinee[l] = existingBandi.filter(b => b.strategicLines.includes(l)).length;
});

const coperturaCategorie = {};
['UE', 'Nazionale/PNRR', 'Regione ER', 'Fondazioni'].forEach(c => {
  coperturaCategorie[c] = existingBandi.filter(b => b.original.categoria === c).length;
});

dataset.meta = {
  ...dataset.meta,
  aggiornato: todayStr,
  totale: existingBandi.length,
  ultima_acquisizione_automatica: new Date().toISOString(),
  statistiche: {
    aperti,
    sportello,
    chiusi,
    in_verifica: inVerifica,
    entro_30_giorni: entro30,
    copertura_linee: coperturaLinee,
    copertura_categorie: coperturaCategorie
  }
};
dataset.bandi = existingBandi;

// 10. Salva dataset aggiornato
fs.writeFileSync(datasetPath, JSON.stringify(dataset, null, 2), 'utf8');
log(`Dataset canonico salvato con ${existingBandi.length} record in: ${datasetPath}`);

// 11. Salva report operativo fonti: public/data/quality/sources-status.json
const sourcesStatusData = {
  timestamp: new Date().toISOString(),
  total_sources_monitored: sourceReports.length,
  active_operative_sources: sourceReports.filter(s => s.status === 'operativa').length,
  planned_sources: sourceReports.filter(s => s.status === 'prevista').length,
  last_scan_date: todayStr,
  new_opportunities_found: totalNew,
  updated_opportunities: totalUpdated,
  expired_opportunities: totalExpired,
  sources: sourceReports
};

fs.mkdirSync(path.dirname(sourcesStatusPath), { recursive: true });
fs.writeFileSync(sourcesStatusPath, JSON.stringify(sourcesStatusData, null, 2), 'utf8');
log(`Report stato fonti salvato in: ${sourcesStatusPath}`);

// 12. Salva log di esecuzione
fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.writeFileSync(logPath, logEntries.join('\n'), 'utf8');

console.log('=== ACQUISIZIONE AUTOMATICA COMPLETATA CON SUCCESSO ===');
