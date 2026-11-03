import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDeliverySchedule } from './utils/date-iso.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const weeklyLatestPath = path.join(rootDir, 'public', 'data', 'weekly', 'latest.json');
const manifestPath = path.join(rootDir, 'public', 'newsletter', 'manifest.json');
const feedXmlPath = path.join(rootDir, 'public', 'newsletter', 'feed.xml');
const latestHtmlPath = path.join(rootDir, 'public', 'newsletter', 'latest.html');

// Parametri di configurazione ambiente
const GH_OWNER = process.env.GH_OWNER || process.env.GITHUB_REPOSITORY_OWNER || 'Osservatorio-Urbano';
const rawRepo = process.env.GH_REPOSITORY || process.env.GITHUB_REPOSITORY || 'osservatorio-bandi-re';
const GH_REPO = rawRepo.includes('/') ? rawRepo.split('/')[1] : rawRepo;
const BASE_URL = process.env.PAGES_BASE_URL || `https://${GH_OWNER}.github.io/${GH_REPO}`;

// Parsing argomenti CLI
const args = process.argv.slice(2);
let phase = 'local';
const phaseIdx = args.indexOf('--phase');
if (phaseIdx !== -1 && args[phaseIdx + 1]) {
  phase = args[phaseIdx + 1].toLowerCase();
}

let weekOverride = null;
const weekIdx = args.indexOf('--week');
if (weekIdx !== -1 && args[weekIdx + 1]) {
  weekOverride = args[weekIdx + 1].trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('===========================================================');
console.log(`[VERIFICA NEWSLETTER] Fase: ${phase.toUpperCase()}`);
console.log('===========================================================');

/**
 * Fase 1: Verifica Locale degli Artefatti Generati
 */
function verifyLocalArtifacts() {
  console.log('1. Verifica presenza dei file generati...');
  const errors = [];

  // 1.1 latest.json
  if (!fs.existsSync(weeklyLatestPath)) {
    errors.push(`File mancante: ${weeklyLatestPath}`);
  } else {
    try {
      const data = JSON.parse(fs.readFileSync(weeklyLatestPath, 'utf8'));
      if (data.status !== 'READY') errors.push(`Status in latest.json non valido: ${data.status} (atteso 'READY')`);
      if (data.quality_passed !== true) errors.push(`Quality gate fallito o non registrato in latest.json`);
      if (!data.edition_id || !/^RE-FUNDING-\d{4}-W\d{2}$/.test(data.edition_id)) {
        errors.push(`Identificativo edizione non valido: ${data.edition_id}`);
      }
      if (weekOverride && data.edition_id !== `RE-FUNDING-${weekOverride}`) {
        errors.push(`Edizione ${data.edition_id} non corrispondente all'override ${weekOverride}`);
      }
      if (!data.delivery_monday || !/^\d{4}-\d{2}-\d{2}$/.test(data.delivery_monday)) {
        errors.push(`Data delivery_monday non valida: ${data.delivery_monday}`);
      } else {
        const [y, m, d] = data.delivery_monday.split('-').map(Number);
        const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        if (dayOfWeek !== 1) {
          errors.push(`Data delivery_monday ${data.delivery_monday} non è un lunedì (giorno ${dayOfWeek})`);
        }
      }
      if (data.delivery_category !== `DELIVERY_${data.delivery_monday}`) {
        errors.push(`Categoria delivery non corrispondente: ${data.delivery_category} vs DELIVERY_${data.delivery_monday}`);
      }
      if (!Array.isArray(data.selected_opportunities) || data.selected_opportunities.length === 0) {
        errors.push(`Nessuna opportunità prioritaria selezionata in latest.json (newsletter vuota)`);
      }
      console.log(`  ✓ latest.json valido: ${data.edition_id} (${data.selected_opportunities?.length || 0} opportunità, consegna ${data.delivery_monday})`);
    } catch (err) {
      errors.push(`Errore lettura o parsing latest.json: ${err.message}`);
    }
  }

  // 1.2 manifest.json
  if (!fs.existsSync(manifestPath)) {
    errors.push(`File mancante: ${manifestPath}`);
  } else {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (!Array.isArray(manifest.editions) || manifest.editions.length === 0) {
        errors.push(`Manifest privo di edizioni`);
      } else {
        const topEdition = manifest.editions[0];
        console.log(`  ✓ manifest.json valido: ultima edizione ${topEdition.edition_id} (${manifest.editions.length} edizioni storiche)`);
        // Controllo duplicati
        const editionIds = manifest.editions.map(e => e.edition_id);
        const uniqueIds = new Set(editionIds);
        if (uniqueIds.size !== editionIds.length) {
          errors.push(`Rilevati duplicati nelle edizioni registrate in manifest.json!`);
        }
      }
    } catch (err) {
      errors.push(`Errore lettura manifest.json: ${err.message}`);
    }
  }

  // 1.3 feed.xml
  if (!fs.existsSync(feedXmlPath)) {
    errors.push(`File mancante: ${feedXmlPath}`);
  } else {
    try {
      const xml = fs.readFileSync(feedXmlPath, 'utf8');
      if (!xml.includes('<?xml version="1.0" encoding="utf-8"?>') || !xml.includes('<rss version="2.0"')) {
        errors.push(`feed.xml non è un documento RSS 2.0 valido`);
      }
      const titleMatch = xml.match(/<item>[\s\S]*?<title>(.*?)<\/title>/);
      const guidMatch = xml.match(/<item>[\s\S]*?<guid.*?>(.*?)<\/guid>/);
      const catMatches = [...xml.matchAll(/<category>(.*?)<\/category>/g)].map(m => m[1]);

      if (!titleMatch) errors.push(`Elemento <title> mancante in <item> nel feed.xml`);
      if (!guidMatch) errors.push(`Elemento <guid> mancante in <item> nel feed.xml`);

      const editionTitle = titleMatch ? titleMatch[1] : '';
      if (weekOverride && editionTitle !== `RE-FUNDING-${weekOverride}`) {
        errors.push(`Titolo feed ${editionTitle} non coerente con la settimana attesa RE-FUNDING-${weekOverride}`);
      }

      if (!catMatches.includes('READY_LATEST')) {
        errors.push(`Categoria 'READY_LATEST' mancante nel feed RSS per Power Automate`);
      }

      const deliveryCat = catMatches.find(c => c.startsWith('DELIVERY_'));
      if (!deliveryCat) {
        errors.push(`Categoria 'DELIVERY_YYYY-MM-DD' mancante nel feed RSS per Power Automate`);
      }

      const cdataMatch = xml.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
      if (!cdataMatch || cdataMatch[1].trim().length < 500) {
        errors.push(`Contenuto HTML della newsletter in CDATA mancante, corrotto o vuoto nel feed.xml`);
      } else {
        const html = cdataMatch[1];
        if (!html.includes('<table') || !html.includes('Osservatorio Bandi Edizione settimanale')) {
          errors.push(`Struttura HTML newsletter nel feed.xml incompleta o mancante di sezioni chiave`);
        }
      }
      console.log(`  ✓ feed.xml valido: Titolo=${editionTitle}, Categorie=[${catMatches.join(', ')}]`);
    } catch (err) {
      errors.push(`Errore verifica feed.xml: ${err.message}`);
    }
  }

  // 1.4 HTML Archivio e latest.html
  let latestEditionId = null;
  if (fs.existsSync(weeklyLatestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(weeklyLatestPath, 'utf8'));
      latestEditionId = data.edition_id ? data.edition_id.replace('RE-FUNDING-', '') : null;
    } catch {}
  }

  if (latestEditionId) {
    const archiveHtml = path.join(rootDir, 'public', 'newsletter', `${latestEditionId}.html`);
    if (!fs.existsSync(archiveHtml)) {
      errors.push(`File archivio HTML non trovato: ${archiveHtml}`);
    } else {
      const stat = fs.statSync(archiveHtml);
      if (stat.size < 500) {
        errors.push(`File archivio HTML ${archiveHtml} è vuoto o troppo piccolo (${stat.size} bytes)`);
      } else {
        console.log(`  ✓ Archivio HTML valido: ${latestEditionId}.html (${(stat.size / 1024).toFixed(1)} KB)`);
      }
    }
  }

  if (!fs.existsSync(latestHtmlPath)) {
    errors.push(`File redirect latest.html mancante: ${latestHtmlPath}`);
  } else {
    console.log(`  ✓ latest.html presente`);
  }

  if (errors.length > 0) {
    console.error('\n[ERRORE CRITICO] Rilevate anomalie nella verifica locale degli artefatti:');
    for (const e of errors) {
      console.error(`  ✖ ${e}`);
    }
    process.exit(1);
  }

  console.log('\n[SUCCESSO] Tutti gli artefatti locali sono integri, validi e pronti per il deploy.');
}

/**
 * Fase 2: Verifica della Pubblicazione Live su GitHub Pages
 */
async function verifyRemotePublication() {
  let targetEditionId = null;
  let targetMonday = null;

  if (weekOverride) {
    const schedule = resolveDeliverySchedule(weekOverride);
    targetEditionId = `RE-FUNDING-${schedule.id}`;
    targetMonday = schedule.deliveryMonday;
  } else if (fs.existsSync(weeklyLatestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(weeklyLatestPath, 'utf8'));
      targetEditionId = data.edition_id;
      targetMonday = data.delivery_monday;
    } catch {}
  }

  if (!targetEditionId) {
    const schedule = resolveDeliverySchedule();
    targetEditionId = `RE-FUNDING-${schedule.id}`;
    targetMonday = schedule.deliveryMonday;
  }

  console.log(`Parametri di verifica pubblicazione GitHub Pages:`);
  console.log(`- Base URL Portale: ${BASE_URL}`);
  console.log(`- Edizione attesa: ${targetEditionId}`);
  console.log(`- Consegna lunedì attesa: ${targetMonday}`);

  const feedUrl = `${BASE_URL}/newsletter/feed.xml`;
  const archiveUrl = `${BASE_URL}/newsletter/${targetEditionId.replace('RE-FUNDING-', '')}.html`;
  const MAX_ATTEMPTS = 10;
  const DELAY_MS = 10000;

  console.log(`\nAvvio polling di verifica su: ${feedUrl}`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n--- Tentativo ${attempt} di ${MAX_ATTEMPTS} ---`);
    try {
      const cacheBuster = `?_cb=${Date.now()}`;
      const res = await fetch(`${feedUrl}${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'User-Agent': 'Publication-Verifier/1.0'
        }
      });

      if (!res.ok) {
        console.warn(`Risposta HTTP non soddisfacente dal feed: ${res.status} ${res.statusText}`);
      } else {
        const text = await res.text();
        const titleMatch = text.match(/<item>[\s\S]*?<title>(.*?)<\/title>/);
        const guidMatch = text.match(/<item>[\s\S]*?<guid.*?>(.*?)<\/guid>/);
        const catMatches = [...text.matchAll(/<category>(.*?)<\/category>/g)].map(m => m[1]);

        const publishedTitle = titleMatch ? titleMatch[1] : '';
        const publishedGuid = guidMatch ? guidMatch[1] : '';

        console.log(`Titolo rilevato nel feed remoto: "${publishedTitle}"`);
        console.log(`GUID rilevato nel feed remoto: "${publishedGuid}"`);
        console.log(`Categorie rilevate nel feed remoto: [${catMatches.join(', ')}]`);

        if (publishedTitle === targetEditionId && publishedGuid === targetEditionId) {
          const hasReadyLatest = catMatches.includes('READY_LATEST');
          const hasDeliveryDate = targetMonday ? catMatches.includes(`DELIVERY_${targetMonday}`) : true;

          if (!hasReadyLatest || !hasDeliveryDate) {
            console.warn(`Edizione corretta ma categorie incomplete (READY_LATEST=${hasReadyLatest}, DELIVERY_${targetMonday}=${hasDeliveryDate}). Attesa propagazione...`);
          } else {
            // Verifica anche raggiungibilità file HTML archivio
            console.log(`Verifico raggiungibilità pagina HTML dell'edizione: ${archiveUrl}...`);
            const htmlRes = await fetch(`${archiveUrl}${cacheBuster}`);
            if (!htmlRes.ok) {
              console.warn(`Pagina HTML non ancora disponibile (${htmlRes.status}). Attesa propagazione...`);
            } else {
              const htmlText = await htmlRes.text();
              if (htmlText.length < 500) {
                console.warn(`Pagina HTML troppo breve (${htmlText.length} bytes). Attesa...`);
              } else {
                console.log('\n===========================================================');
                console.log('✓ VERIFICA PUBBLICAZIONE COMPLETATA CON SUCCESSO!');
                console.log(`- Edizione pubblicata e attiva: ${targetEditionId}`);
                console.log(`- Categoria Power Automate: READY_LATEST, DELIVERY_${targetMonday}`);
                console.log(`- Feed RSS validato: ${feedUrl}`);
                console.log(`- Newsletter HTML: ${archiveUrl} (${(htmlText.length / 1024).toFixed(1)} KB)`);
                console.log('===========================================================');
                process.exit(0);
              }
            }
          }
        } else {
          console.log(`L'edizione remota (${publishedTitle || 'nessuna'}) non corrisponde all'attesa (${targetEditionId}). In attesa di propagazione CDN GitHub Pages...`);
        }
      }
    } catch (err) {
      console.warn(`Tentativo ${attempt} fallito con errore di connessione: ${err.message}`);
    }

    if (attempt < MAX_ATTEMPTS) {
      console.log(`Pausa di ${DELAY_MS / 1000}s prima del prossimo tentativo...`);
      await sleep(DELAY_MS);
    }
  }

  console.error('\n===========================================================');
  console.error('[ERRORE CRITICO] Timeout nella verifica della pubblicazione GitHub Pages!');
  console.error(`L'edizione ${targetEditionId} non risulta pubblicata o propagata dopo ${MAX_ATTEMPTS} tentativi.`);
  console.error(`Feed verificato: ${feedUrl}`);
  console.error('===========================================================');
  process.exit(1);
}

if (phase === 'remote' || phase === 'live') {
  verifyRemotePublication();
} else {
  verifyLocalArtifacts();
}
