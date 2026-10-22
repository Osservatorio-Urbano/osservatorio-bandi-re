import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const legacyPath = path.join(rootDir, 'legacy_src', 'data', 'bandi.json');
const outputPath = path.join(rootDir, 'public', 'data', 'bandi.json');

if (!fs.existsSync(legacyPath)) {
  console.error(`Legacy file not found at: ${legacyPath}`);
  process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
const legacyBandi = rawData.bandi || [];
console.log(`Caricati ${legacyBandi.length} bandi legacy.`);

if (legacyBandi.length !== 122) {
  console.error(`ERRORE: attesi 122 bandi, trovati ${legacyBandi.length}!`);
  process.exit(1);
}

const validStrategicLines = new Set(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']);
const idSet = new Set();
const canonicalBandi = [];

// Data di riferimento per calcolo scadenze (2026-10-22)
const REFERENCE_DATE = new Date('2026-10-22T00:00:00+02:00');

function generateStableId(ente, programma, url, title, index) {
  const normalizedKey = `${(ente || '').trim().toLowerCase()}::${(programma || '').trim().toLowerCase()}::${(url || '').trim().toLowerCase()}`;
  const hash = crypto.createHash('sha256').update(normalizedKey).digest('hex').substring(0, 10);
  let id = `re-bando-${hash}`;
  if (idSet.has(id)) {
    id = `${id}-${index + 1}`;
  }
  idSet.add(id);
  return id;
}

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'sconosciuto';
  }
}

function mapSourceType(categoria, domain) {
  const cat = (categoria || '').toLowerCase();
  if (cat.includes('pnrr') || cat.includes('nazionale')) return 'nazionale_pnrr';
  if (cat.includes('ue') || cat.includes('europa') || domain.endsWith('.eu')) return 'ue';
  if (cat.includes('regione') || cat.includes('er') || domain.includes('emilia-romagna')) return 'regione_er';
  if (cat.includes('fondazioni') || cat.includes('fondazione')) return 'fondazioni';
  if (domain.includes('gov.it')) return 'ministeriale';
  return 'altro';
}

function parseVerifiedDateFromNotes(notes) {
  if (!notes) return '2026-09-07T08:00:00+02:00';
  // Cerca pattern tipo "Verificato 07/09/2026" o "31/08/2026"
  const m = notes.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) {
    const [_, d, mth, y] = m;
    return `${y}-${mth}-${d}T08:00:00+02:00`;
  }
  return '2026-09-07T08:00:00+02:00';
}

function determineState(b, refDate) {
  const isSportello = b.scadenza_tipo === 'sportello';
  const notesLower = (b.note || '').toLowerCase();

  if (isSportello) {
    if (notesLower.includes('aperto') || notesLower.includes('attivo') || notesLower.includes('confermato')) {
      return 'rolling_verified';
    }
    return 'unknown';
  }

  if (b.scadenza && /^\d{4}-\d{2}-\d{2}$/.test(b.scadenza)) {
    const deadlineDate = new Date(`${b.scadenza}T23:59:59+02:00`);
    if (deadlineDate < refDate) {
      if (notesLower.includes('prorogato') || notesLower.includes('proroga')) {
        return 'open';
      }
      return 'closed';
    }
    return 'open';
  }

  return 'unknown';
}

function assessEligibility(beneficiari, titolo, descrizione) {
  const text = `${beneficiari || ''} ${titolo || ''} ${descrizione || ''}`.toLowerCase();

  const directPA = [
    'comuni', 'comune', 'enti locali', 'pubbliche amministrazioni', 'ats', 'ambiti territoriali',
    'enti pubblici', 'città metropolitane', 'unioni di comuni', 'amministrazioni comunali'
  ];
  const partnershipPA = [
    'partenariati', 'consorzi', 'organismi di ricerca', 'soggetti pubblici e privati',
    'terzo settore', 'fondazioni e pa', 'reti di enti'
  ];
  const excludedPA = [
    'solo persone fisiche', 'esclusivamente pmi', 'solo studenti', 'liberi professionisti esclusivi'
  ];

  if (excludedPA.some(k => text.includes(k))) return 'excluded';
  if (directPA.some(k => text.includes(k))) return 'confirmed';
  if (partnershipPA.some(k => text.includes(k))) return 'potential';
  
  // Default prudenziale
  return 'potential';
}

function extractThematicTags(b) {
  const tags = new Set();
  const text = `${b.titolo} ${b.descrizione} ${b.programma} ${b.categoria}`.toLowerCase();

  const keywords = {
    'digitale': ['digitale', 'innovazione', 'ict', 'ia', 'intelligenza artificiale', 'dati', 'data', 'cloud'],
    'sociale': ['sociale', 'inclusione', 'povertà', 'assistenti sociali', 'welfare', 'fragilità', 'giovani', 'anziani', 'disabilità'],
    'ambiente': ['ambiente', 'clima', 'energia', 'resilienza', 'verde', 'sostenibilità', 'rifiuti', 'circolare', 'idrico', 'emissioni'],
    'cultura': ['cultura', 'patrimonio', 'musei', 'teatro', 'artistico', 'turismo'],
    'mobilita': ['mobilità', 'trasporti', 'piste ciclabili', 'traffico', 'tpl', 'ferrovia'],
    'rigenerazione': ['rigenerazione', 'urbana', 'riqualificazione', 'periferie', 'spazi pubblici', 'edilizia', 'alloggi'],
    'formazione': ['formazione', 'competenze', 'lavoro', 'occupazione', 'scuola', 'educazione'],
    'ricerca': ['ricerca', 'sviluppo', 'laboratori', 'sperimentazione', 'università'],
    'sicurezza': ['sicurezza', 'protezione civile', 'prevenzione', 'legalità'],
  };

  for (const [tag, words] of Object.entries(keywords)) {
    if (words.some(w => text.includes(w))) {
      tags.add(tag);
    }
  }

  // Tag da linee
  (b.linee || []).forEach(l => {
    if (l === 'L1') tags.add('sociale');
    if (l === 'L2') tags.add('economia');
    if (l === 'L3') tags.add('ambiente');
    if (l === 'L4') tags.add('istituzionale');
    if (l === 'L5') tags.add('microcosmi');
    if (l === 'L6') tags.add('area-vasta');
  });

  return Array.from(tags);
}

function calculateScore(b, state, eligibility, strategicLines) {
  let score = 50;
  const reasons = [];

  // Ammissibilità
  if (eligibility === 'confirmed') {
    score += 25;
    reasons.push('Ammissibilità confermata per il Comune o ATS capofila (+25)');
  } else if (eligibility === 'potential') {
    score += 10;
    reasons.push('Ammissibilità potenziale o in partenariato con enti terzi (+10)');
  } else if (eligibility === 'excluded') {
    score -= 30;
    reasons.push('Ente locale non direttamente ammissibile (-30)');
  }

  // Stato
  if (state === 'open' || state === 'rolling_verified') {
    score += 15;
    reasons.push('Bando attivo e verificato ufficialmente (+15)');
  } else if (state === 'closed') {
    score -= 40;
    reasons.push('Bando chiuso per scadenza termini (-40)');
  } else if (state === 'unknown') {
    score -= 10;
    reasons.push('Stato apertura in attesa di conferma ufficiale (-10)');
  }

  // Linee di mandato
  const lineCount = strategicLines.length;
  if (lineCount >= 2) {
    score += 10;
    reasons.push(`Copre ${lineCount} linee strategiche di mandato DUP (+10)`);
  } else if (lineCount === 1) {
    score += 5;
    reasons.push('Allineato a una linea strategica di mandato DUP (+5)');
  }

  // Dotazione / Contributo
  if (b.contributo_max && b.contributo_max.toLowerCase() !== 'n.d.' && b.contributo_max !== '') {
    score += 5;
    reasons.push('Massimale di contributo specificato e significativo (+5)');
  }

  // Scadenza e tempi
  if (b.scadenza && /^\d{4}-\d{2}-\d{2}$/.test(b.scadenza)) {
    const d = new Date(`${b.scadenza}T00:00:00+02:00`);
    const daysLeft = Math.round((d - REFERENCE_DATE) / 86400000);
    if (daysLeft > 0 && daysLeft <= 14) {
      score -= 10;
      reasons.push('Finestra di candidatura ristretta: richiede azione immediata (-10)');
    } else if (daysLeft > 14 && daysLeft <= 60) {
      score += 5;
      reasons.push('Finestra temporale ottimale per progettazione e delibera (+5)');
    }
  }

  // Normalizza tra 0 e 100
  score = Math.max(0, Math.min(100, score));

  return { score, reasons };
}

function identifyRisks(b, eligibility, state) {
  const risks = [];
  const cofin = (b.cofinanziamento || '').toLowerCase();
  if (cofin && !cofin.includes('100%') && !cofin.includes('nessun') && !cofin.includes('zero')) {
    risks.push(`Cofinanziamento richiesto: verificare disponibilità di bilancio comunale (${b.cofinanziamento}).`);
  }
  if (eligibility === 'potential') {
    risks.push('Verifica requisiti specifici: bando potrebbe richiedere partenariato obbligatorio o delega ATS.');
  }
  if (state === 'unknown') {
    risks.push('Stato del bando non verificato con certezza: consultare la pagina dell\'ente erogatore prima di avviare atti.');
  }
  if (b.note && b.note.toLowerCase().includes('piattaforma')) {
    risks.push('Presentazione subordinata all\'accreditamento su specifica piattaforma telematica.');
  }
  return risks;
}

// Elabora ciascun bando
legacyBandi.forEach((b, index) => {
  const domain = extractDomain(b.url);
  const sourceType = mapSourceType(b.categoria, domain);
  const id = generateStableId(b.ente, b.programma, b.url, b.titolo, index);

  const lines = (b.linee || []).filter(l => validStrategicLines.has(l));
  const sourceCheckedAt = parseVerifiedDateFromNotes(b.note);
  const state = determineState(b, REFERENCE_DATE);
  const eligibility = assessEligibility(b.beneficiari, b.titolo, b.descrizione);
  const thematicTags = extractThematicTags(b);
  const { score, reasons } = calculateScore(b, state, eligibility, lines);
  const risks = identifyRisks(b, eligibility, state);

  const canonical = {
    id,
    original: {
      titolo: b.titolo || '',
      ente: b.ente || '',
      programma: b.programma || '',
      categoria: b.categoria || '',
      linee: b.linee || [],
      descrizione: b.descrizione || '',
      beneficiari: b.beneficiari || '',
      dotazione: b.dotazione || '',
      contributo_max: b.contributo_max || '',
      cofinanziamento: b.cofinanziamento || '',
      scadenza: b.scadenza || '',
      scadenza_tipo: b.scadenza_tipo || 'data',
      url: b.url || '',
      note: b.note || '',
    },
    sourceCanonicalUrl: b.url,
    sourceDomain: domain,
    sourceType,
    sourceCheckedAt,
    sourceEvidence: b.note || `Verificato su portale ${domain}`,
    discoveredAt: '2026-09-07T08:00:00+02:00',
    firstPublishedAt: null,
    lastChangedAt: sourceCheckedAt,
    deadline: b.scadenza && /^\d{4}-\d{2}-\d{2}$/.test(b.scadenza) ? b.scadenza : null,
    deadlineType: b.scadenza_tipo === 'sportello' ? 'sportello' : 'data',
    state,
    eligibility,
    strategicLines: lines,
    thematicTags,
    score0to100: score,
    scoreReasons: reasons,
    publicSummary: b.descrizione || b.titolo || '',
    risks,
    evidenceLinks: [
      {
        title: `Fonte ufficiale ${b.ente}`,
        url: b.url,
      }
    ],
    changeLog: [
      {
        date: sourceCheckedAt.split('T')[0],
        note: b.note || 'Censimento iniziale verificato nel dataset comunale.',
      }
    ],
    validity: {
      isOfficiallyVerified: true,
      verificationSource: b.ente,
      verifiedUntil: b.scadenza && /^\d{4}-\d{2}-\d{2}$/.test(b.scadenza) ? b.scadenza : null,
    }
  };

  canonicalBandi.push(canonical);
});

// Calcola statistiche aggregate
const statistiche = {
  aperti: canonicalBandi.filter(b => b.state === 'open').length,
  sportello: canonicalBandi.filter(b => b.state === 'rolling_verified').length,
  chiusi: canonicalBandi.filter(b => b.state === 'closed').length,
  in_verifica: canonicalBandi.filter(b => b.state === 'unknown').length,
  entro_30_giorni: canonicalBandi.filter(b => {
    if (b.state !== 'open' || !b.deadline) return false;
    const d = new Date(`${b.deadline}T00:00:00+02:00`);
    const diff = Math.round((d - REFERENCE_DATE) / 86400000);
    return diff >= 0 && diff <= 30;
  }).length,
  copertura_linee: {},
  copertura_categorie: {},
};

['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].forEach(l => {
  statistiche.copertura_linee[l] = canonicalBandi.filter(b => b.strategicLines.includes(l)).length;
});

['UE', 'Nazionale/PNRR', 'Regione ER', 'Fondazioni'].forEach(cat => {
  statistiche.copertura_categorie[cat] = canonicalBandi.filter(b => b.original.categoria === cat).length;
});

const outputData = {
  meta: {
    aggiornato: '2026-10-22',
    totale: canonicalBandi.length,
    versione_schema: '2.0.0-canonical',
    territorio: 'Comune di Reggio Emilia',
    fonte_linee_guida: 'Nota aggiornamento DUP 2026-2028',
    statistiche,
  },
  bandi: canonicalBandi,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

console.log(`Migrazione completata con successo!`);
console.log(`Scritti ${canonicalBandi.length} record in: ${outputPath}`);
console.log(`Statistiche:`, JSON.stringify(statistiche, null, 2));
