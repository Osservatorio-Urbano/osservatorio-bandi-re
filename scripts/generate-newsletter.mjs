import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDeliverySchedule, formatItalianLongDate } from './utils/date-iso.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const datasetPath = path.join(rootDir, 'public', 'data', 'bandi.json');
const qualityPath = path.join(rootDir, 'public', 'data', 'quality', 'latest.json');
const weeklyLatestPath = path.join(rootDir, 'public', 'data', 'weekly', 'latest.json');
const newsletterDir = path.join(rootDir, 'public', 'newsletter');
const manifestPath = path.join(newsletterDir, 'manifest.json');
const feedXmlPath = path.join(newsletterDir, 'feed.xml');
const latestHtmlPath = path.join(newsletterDir, 'latest.html');

// Parametri GitHub / URL base del portale pubblico
const GH_OWNER = process.env.GH_OWNER || 'Osservatorio-Urbano';
const GH_REPO = process.env.GH_REPOSITORY || 'osservatorio-bandi-re';
const BASE_URL = process.env.PAGES_BASE_URL || `https://${GH_OWNER}.github.io/${GH_REPO}`;

function formatDateIt(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || 'n.d.';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

console.log('--- GENERATORE NEWSLETTER SETTIMANALE & RSS ---');

// 1. Verifica Quality Gate (FAIL CLOSED)
let qualityGatePassed = false;
let qualityReport = null;
if (fs.existsSync(qualityPath)) {
  qualityReport = JSON.parse(fs.readFileSync(qualityPath, 'utf8'));
  qualityGatePassed = qualityReport.status === 'PASSED';
}

if (!qualityGatePassed) {
  console.error('FAIL CLOSED: Quality gate non superato o assente! Generazione newsletter bloccata.');
  const blockedMeta = {
    edition_id: 'BLOCKED',
    generated_at: new Date().toISOString(),
    status: 'BLOCKED',
    quality_passed: false,
    reason: 'Quality gate failed or missing. Execution aborted to prevent sending corrupt data.',
  };
  fs.mkdirSync(path.dirname(weeklyLatestPath), { recursive: true });
  fs.writeFileSync(weeklyLatestPath, JSON.stringify(blockedMeta, null, 2), 'utf8');
  process.exit(1);
}

// 2. Carica dataset canonico (Dinamico)
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
const allBandi = dataset.bandi || [];

// Calcola settimana di riferimento e data di consegna (Lunedì ore 08:00 Europe/Rome)
let weekOverride = null;
const argWeekIdx = process.argv.indexOf('--week');
if (argWeekIdx !== -1 && process.argv[argWeekIdx + 1]) {
  weekOverride = process.argv[argWeekIdx + 1];
}

const deliverySchedule = resolveDeliverySchedule(weekOverride);
const editionId = `RE-FUNDING-${deliverySchedule.id}`;
console.log(`Generazione per edizione: ${editionId}`);
console.log(`Data di consegna lunedì prevista (Power Automate): ${deliverySchedule.deliveryMonday}`);
console.log(`Categorie RSS configurate: ${deliverySchedule.categories.join(', ')}`);

// 3. Calcolo metriche dinamiche del dataset (Criteri coerenti e senza duplicazioni)
const totalCount = allBandi.length;
const openCount = allBandi.filter(b => b.state === 'open').length;
const rollingCount = allBandi.filter(b => b.state === 'rolling_verified').length;
const activeCount = openCount + rollingCount;
const closedCount = allBandi.filter(b => b.state === 'closed').length;
const unknownCount = allBandi.filter(b => b.state === 'unknown' || b.state === 'suspended').length;

const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
const newThisWeekCount = allBandi.filter(b => {
  const d = new Date(b.discoveredAt || b.lastChangedAt || 0);
  return d >= sevenDaysAgo;
}).length;

console.log(`Statistiche dataset consolidato:`);
console.log(`- Totale censiti: ${totalCount}`);
console.log(`- Opportunità attive: ${activeCount} (Aperti ordinari: ${openCount}, A sportello verificato: ${rollingCount})`);
console.log(`- Archiviati/Scaduti: ${closedCount}`);
console.log(`- In verifica/sospesi: ${unknownCount}`);
console.log(`- Nuovi/aggiornati ultimi 7gg: ${newThisWeekCount}`);

// 4. Seleziona le migliori opportunità (intervallo 8-12 come da capitolato)
const eligible = allBandi.filter(b => {
  const stateOk = b.state === 'open' || b.state === 'rolling_verified';
  const eligOk = b.eligibility === 'confirmed' || b.eligibility === 'potential';
  const verifiedOk = b.validity?.isOfficiallyVerified === true;
  return stateOk && eligOk && verifiedOk;
});

eligible.sort((a, b) => {
  if (b.score0to100 !== a.score0to100) return b.score0to100 - a.score0to100;
  if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
  return (a.original.titolo || '').localeCompare(b.original.titolo || '');
});

// Max 10 bandi selezionati per la newsletter
const selected = eligible.slice(0, 10);
const selectedCount = selected.length;
console.log(`Opportunità idonee trovate: ${eligible.length}, selezionate per newsletter: ${selectedCount}`);

const metrics = {
  totalCount,
  activeCount,
  openCount,
  rollingCount,
  closedCount,
  unknownCount,
  newThisWeekCount,
  selectedCount,
};

// 5. Costruzione HTML Email-Safe ispirata al modello ufficiale ComuneInforma (Outlook/Mobile safe)
function buildEmailHtml(edition, items, met, deliveryDateStr) {
  const dateFormatted = formatItalianLongDate(deliveryDateStr);

  const itemsHtml = items.map((item) => {
    const isSportello = item.deadlineType === 'sportello';
    const deadlineTxt = isSportello ? 'A sportello aperto (fino ad esaurimento risorse)' : formatDateIt(item.deadline);
    const badgeBg = isSportello ? '#e0f2fe' : '#fef3c7';
    const badgeColor = isSportello ? '#0369a1' : '#92400e';
    const linesTxt = item.strategicLines.map(l => `${l}`).join(', ');

    return `
      <tr>
        <td style="padding: 20px 0; border-bottom: 1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 8px; border-radius: 4px; background-color: ${badgeBg}; color: ${badgeColor}; margin-right: 6px;">
                    ${item.sourceType.toUpperCase()} · ${item.original.categoria}
                  </span>
                  <span style="display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px; background-color: #f1f5f9; color: #475569;">
                    Linea DUP: ${linesTxt}
                  </span>
                </div>

                <h3 style="margin: 8px 0 6px 0; font-size: 16px; line-height: 1.35; color: #000000; font-weight: 700;">
                  <a href="${item.sourceCanonicalUrl}" target="_blank" rel="noopener" style="color: #0f172a; text-decoration: none;">
                    ${item.original.titolo}
                  </a>
                </h3>

                <p style="margin: 0 0 10px 0; font-size: 13px; color: #64748b; font-weight: 500;">
                  Ente erogatore: <strong>${item.original.ente}</strong> ${item.original.programma ? '· ' + item.original.programma : ''}
                </p>

                <p style="margin: 0 0 14px 0; font-size: 13.5px; line-height: 1.55; color: #334155;">
                  ${item.publicSummary}
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 12px; color: #475569; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px;">
                  <tr>
                    <td style="padding: 2px 0;"><strong>Scadenza:</strong> ${deadlineTxt}</td>
                    <td style="padding: 2px 0; text-align: right;"><strong>Ammissibilità:</strong> ${item.eligibility === 'confirmed' ? 'Diretta PA / ATS' : 'In partenariato'}</td>
                  </tr>
                  ${item.original.dotazione ? `<tr><td colspan="2" style="padding: 2px 0;"><strong>Dotazione / Contributo:</strong> ${item.original.dotazione} ${item.original.contributo_max ? '· Max: ' + item.original.contributo_max : ''}</td></tr>` : ''}
                  <tr>
                    <td colspan="2" style="padding: 4px 0 0 0; color: #0f766e; font-size: 11px;">
                      <strong>Valutazione di priorità:</strong> ${item.score0to100}/100 — ${item.scoreReasons[0] || 'Allineato alle priorità strategiche'}
                    </td>
                  </tr>
                </table>

                <!-- Pulsante "Leggi di più" conforme allo stile ComuneInforma -->
                <div>
                  <a href="${item.sourceCanonicalUrl}" target="_blank" rel="noopener" style="display: inline-block; background-color: #e2e8f0; color: #0f172a; text-decoration: none; font-size: 12px; font-weight: 600; padding: 7px 16px; border-radius: 6px; border: 1px solid #cbd5e1;">
                    Leggi di più →
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Osservatorio Bandi Edizione settimanale - ${edition}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <center style="width: 100%; background-color: #ffffff; padding: 16px 0 32px 0;">
    <!-- Container 620px -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; margin: 0 auto; text-align: left;">
      <!-- Riga data testata top-right (stile ComuneInforma) -->
      <tr>
        <td style="text-align: right; font-style: italic; font-size: 13px; color: #475569; padding: 0 4px 8px 4px;">
          Newsletter del ${dateFormatted}
        </td>
      </tr>

      <!-- Banner Istituzionale Comune di Reggio Emilia / ComuneInforma -->
      <tr>
        <td style="padding: 0 0 16px 0;">
          <a href="${BASE_URL}/" target="_blank" rel="noopener" style="display: block; text-decoration: none;">
            <img
              src="${BASE_URL}/newsletter-header-banner.png"
              alt="Comune di Reggio Emilia - ComuneInforma - Osservatorio Bandi Edizione settimanale"
              width="620"
              style="width: 100%; max-width: 620px; height: auto; display: block; border-radius: 4px; border: 0;"
            />
          </a>
        </td>
      </tr>

      <!-- Saluto introduttivo -->
      <tr>
        <td style="padding: 8px 4px 12px 4px;">
          <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #0f172a;">
            Gentili dirigenti, amministratori e funzionari,
          </p>
          <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">
            ecco le opportunità di finanziamento e i bandi attivi per il Comune di Reggio Emilia e il territorio, allineati alle linee strategiche del DUP.
          </p>
        </td>
      </tr>

      <!-- Divisore orizzontale discreto (stile ComuneInforma) -->
      <tr>
        <td style="padding: 8px 0 16px 0;">
          <div style="width: 180px; height: 3px; background-color: #e2e8f0; margin: 0 auto; border-radius: 2px;"></div>
        </td>
      </tr>

      <!-- Box Riepilogo Monitoraggio Dataset -->
      <tr>
        <td style="padding: 0 4px 20px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #0f766e; border-radius: 6px; padding: 12px 16px; font-size: 12.5px; color: #166534; line-height: 1.6;">
            <tr>
              <td>
                <strong>Quadro settimanale del monitoraggio (dataset aggiornato):</strong><br />
                • <strong>${met.activeCount}</strong> opportunità attive (<strong>${met.openCount}</strong> a bando ordinario, <strong>${met.rollingCount}</strong> a sportello verificato)<br />
                • <strong>${met.selectedCount}</strong> opportunità prioritarie selezionate per questa edizione<br />
                • <strong>${met.newThisWeekCount}</strong> nuove opportunità o aggiornamenti monitorati nell'ultima settimana<br />
                • <strong>${met.totalCount}</strong> bandi complessivamente censiti nell'Osservatorio (${met.closedCount} archiviati per scadenza)
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Titolo Sezione Opportunità -->
      <tr>
        <td style="padding: 8px 4px 4px 4px;">
          <h2 style="margin: 0; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0f766e;">
            Opportunità prioritarie della settimana
          </h2>
        </td>
      </tr>

      <!-- Elenco Bandi / Articoli -->
      <tr>
        <td style="padding: 0 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${itemsHtml.length > 0 ? itemsHtml : `<tr><td style="padding: 24px; text-align: center; color: #64748b;">Nessuna nuova opportunità idonea verificata per questa settimana. Tutti i controlli sono stati superati regolarmente.</td></tr>`}
          </table>
        </td>
      </tr>

      <!-- CTA Finale con contatore DINAMICO dei bandi censiti -->
      <tr>
        <td style="padding: 28px 4px 20px 4px; text-align: center;">
          <a href="${BASE_URL}/#/bandi" target="_blank" rel="noopener" style="display: inline-block; background-color: #0f766e; color: #ffffff; text-decoration: none; font-size: 13.5px; font-weight: 600; padding: 12px 26px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            Accedi a tutti i ${met.totalCount} bandi sull'Osservatorio →
          </a>
        </td>
      </tr>

      <!-- Footer Istituzionale -->
      <tr>
        <td style="padding: 20px 4px 12px 4px; border-top: 1px solid #e2e8f0; font-size: 11.5px; line-height: 1.55; color: #64748b;">
          <p style="margin: 0 0 8px 0;">
            <strong>Comune di Reggio Emilia · Osservatorio Bandi Edizione settimanale · Mandato 2024-2029</strong><br />
            Presidio continuativo delle opportunità di finanziamento europee, nazionali e regionali per il territorio.
          </p>
          <p style="margin: 0 0 8px 0;">
            <strong>Nota metodologica e di trasparenza:</strong> Questo bollettino è emesso automaticamente via Microsoft Power Automate & Outlook su base del dataset pubblico GitHub. Nessun dato riservato né elenco destinatari è conservato nel repository pubblico.
          </p>
          <p style="margin: 0;">
            Le valutazioni hanno carattere indicativo di priorità strategica DUP. Si raccomanda di consultare sempre i bandi ufficiali degli enti erogatori.
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

const emailSafeHtml = buildEmailHtml(editionId, selected, metrics, deliverySchedule.deliveryMonday);

// Salva newsletter HTML per l'archivio: public/newsletter/YYYY-Www.html
fs.mkdirSync(newsletterDir, { recursive: true });
const archiveHtmlPath = path.join(newsletterDir, `${deliverySchedule.id}.html`);
fs.writeFileSync(archiveHtmlPath, emailSafeHtml, 'utf8');
console.log(`Newsletter salvata in archivio: ${archiveHtmlPath}`);

// Salva redirect/latest statico: public/newsletter/latest.html
const latestRedirectHtml = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Ultima edizione - Osservatorio Bandi Edizione settimanale</title>
  <meta http-equiv="refresh" content="0; url=${deliverySchedule.id}.html">
</head>
<body>
  <p>Reindirizzamento all'ultima edizione: <a href="${deliverySchedule.id}.html">${editionId}</a>...</p>
</body>
</html>`;
fs.writeFileSync(latestHtmlPath, latestRedirectHtml, 'utf8');

// 6. Genera JSON settimanale: public/data/weekly/latest.json
fs.mkdirSync(path.dirname(weeklyLatestPath), { recursive: true });
const weeklyLatestData = {
  edition_id: editionId,
  generated_at: new Date().toISOString(),
  delivery_monday: deliverySchedule.deliveryMonday,
  delivery_category: `DELIVERY_${deliverySchedule.deliveryMonday}`,
  week_start: `2026-W${String(deliverySchedule.weekNumber).padStart(2, '0')}`,
  week_end: `2026-W${String(deliverySchedule.weekNumber).padStart(2, '0')}`,
  status: 'READY',
  quality_passed: true,
  item_count: totalCount,
  active_count: activeCount,
  open_count: openCount,
  rolling_count: rollingCount,
  closed_count: closedCount,
  new_this_week_count: newThisWeekCount,
  selected_count: selectedCount,
  summary: `Osservatorio Bandi Edizione settimanale ${editionId} con ${selectedCount} opportunità prioritarie selezionate su ${activeCount} attive (${totalCount} censite).`,
  html_link: `${BASE_URL}/newsletter/${deliverySchedule.id}.html`,
  selected_opportunities: selected.map(s => ({
    id: s.id,
    titolo: s.original.titolo,
    ente: s.original.ente,
    scadenza: s.deadline || 'sportello',
    scadenza_label: s.deadline ? formatDateIt(s.deadline) : 'A sportello aperto',
    beneficiari: s.original.beneficiari,
    intensita_aiuto: s.original.dotazione || s.original.contributo_max || 'n.d.',
    fonte_url: s.sourceCanonicalUrl,
    ragione_strategica: s.scoreReasons[0] || 'Allineato al mandato',
    stato_verifica: s.validity?.verificationSource || 'Ufficiale',
    score: s.score0to100,
    linee: s.strategicLines,
  })),
  quality_report: {
    total_records: totalCount,
    valid_records: allBandi.filter(b => b.validity?.isOfficiallyVerified).length,
    active_opportunities: activeCount,
    open_bandi: openCount,
    rolling_verified: rollingCount,
    closed_bandi: closedCount,
    new_this_week: newThisWeekCount,
    selected_newsletter: selectedCount,
    unverified_excluded: unknownCount,
  }
};
fs.writeFileSync(weeklyLatestPath, JSON.stringify(weeklyLatestData, null, 2), 'utf8');

// 7. Aggiorna manifest.json con storico edizioni
let manifest = { editions: [] };
if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {}
}

const existingIdx = manifest.editions.findIndex(e => e.edition_id === editionId);
const editionEntry = {
  edition_id: editionId,
  iso_week: deliverySchedule.id,
  delivery_monday: deliverySchedule.deliveryMonday,
  delivery_category: `DELIVERY_${deliverySchedule.deliveryMonday}`,
  generated_at: new Date().toISOString(),
  item_count: selectedCount,
  active_pool: activeCount,
  total_pool: totalCount,
  status: 'READY',
  url: `${BASE_URL}/newsletter/${deliverySchedule.id}.html`,
};

if (existingIdx >= 0) {
  manifest.editions[existingIdx] = editionEntry;
} else {
  manifest.editions.unshift(editionEntry);
}
// Mantieni max 26 edizioni (6 mesi)
manifest.editions = manifest.editions.slice(0, 26);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

// 8. Genera Feed RSS 2.0 (1 ITEM PER EDIZIONE READY, GUID DETERMINISTICO, CDATA EMAIL-SAFE, CATEGORIE DI RECAPITO)
const nowRfc822 = new Date().toUTCString();

const categoriesXml = deliverySchedule.categories
  .map(cat => `      <category>${cat}</category>`)
  .join('\n');

const rssXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Osservatorio Bandi Edizione settimanale</title>
    <link>${BASE_URL}/</link>
    <description>Osservatorio Bandi Edizione settimanale - Opportunità di finanziamento verificate per il Comune di Reggio Emilia (${activeCount} attive su ${totalCount} censite)</description>
    <language>it-IT</language>
    <lastBuildDate>${nowRfc822}</lastBuildDate>
    <atom:link href="${BASE_URL}/newsletter/feed.xml" rel="self" type="application/rss+xml" />
    <item>
      <title>${editionId}</title>
      <link>${BASE_URL}/newsletter/${deliverySchedule.id}.html</link>
      <guid isPermaLink="false">${editionId}</guid>
      <pubDate>${nowRfc822}</pubDate>
${categoriesXml}
      <description><![CDATA[${emailSafeHtml}]]></description>
    </item>
  </channel>
</rss>`;

fs.writeFileSync(feedXmlPath, rssXml, 'utf8');
console.log(`Feed RSS 2.0 generato in: ${feedXmlPath}`);
console.log('--- GENERAZIONE NEWSLETTER COMPLETATA CON SUCCESSO ---');
