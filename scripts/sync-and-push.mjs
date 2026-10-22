import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const diagDir = path.join(rootDir, 'diagnostics');

const MAX_ATTEMPTS = 3;

function run(cmd, options = {}) {
  return execSync(cmd, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    ...options,
  });
}

function getOutput(cmd) {
  try {
    return run(cmd, { capture: true }).trim();
  } catch {
    return '';
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

console.log('=== AVVIO PROCEDURA DI SINCRONIZZAZIONE SICURA E PUSH ===');

// Configurazione autore commit bot standard GitHub Actions
run('git config user.name "github-actions[bot]"');
run('git config user.email "github-actions[bot]@users.noreply.github.com"');

let success = false;
let lastError = null;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`\n--- Tentativo ${attempt} di ${MAX_ATTEMPTS} ---`);

  // 1. Fetch dal branch remoto origin/main
  console.log('Recupero aggiornamenti remoti: git fetch origin main...');
  try {
    run('git fetch origin main');
  } catch (err) {
    console.warn(`Avviso: git fetch ha generato un errore: ${err.message}`);
  }

  const localSha = getOutput('git rev-parse HEAD');
  const remoteSha = getOutput('git rev-parse origin/main');
  console.log(`Commit Locale (HEAD): ${localSha}`);
  console.log(`Commit Remoto (origin/main): ${remoteSha}`);

  // 2. Se il remoto è avanzato (o su tentativi successivi), riallinea ed esegui nuovamente la pipeline
  if (localSha !== remoteSha) {
    console.log('Rilevati nuovi commit sul branch remoto origin/main.');
    console.log('Riallineamento sul branch remoto ed esecuzione pipeline sui dati aggiornati...');
    run('git reset --hard origin/main');

    console.log('Riesecuzione: Ingestion modulare multi-fonte...');
    run('node scripts/ingest.mjs');

    console.log('Riesecuzione: Generazione Newsletter e Feed RSS...');
    run('node scripts/generate-newsletter.mjs');

    console.log('Riesecuzione: Verifica Quality Gate...');
    run('node scripts/quality-gate.mjs');

    console.log('Riesecuzione: Test Automatici di Integrità...');
    run('npm test');
  }

  // 3. Stage ESCLUSIVO dei soli file generati dalla pipeline
  console.log('Staging dei soli percorsi generati: public/data/ e public/newsletter/...');
  run('git add public/data/ public/newsletter/');

  // 4. Verifica se ci sono modifiche effettive staged
  const stagedFiles = getOutput('git diff --staged --name-only');
  if (!stagedFiles) {
    console.log('Nessuna modifica rilevata nel dataset o nei feed. Push non necessario.');
    success = true;
    break;
  }

  console.log('File modificati pronti per il commit:');
  console.log(stagedFiles);

  // 5. Creazione commit
  run('git commit -m "chore(data): aggiornamento quotidiano dataset bandi e feed RSS [skip ci]"');

  // 6. Push non forzato verso origin/main
  try {
    console.log('Esecuzione: git push origin main...');
    run('git push origin main');
    console.log('SUCCESS: Commit e push completati con successo su origin/main!');
    success = true;
    break;
  } catch (pushErr) {
    lastError = pushErr;
    console.warn(`Tentativo ${attempt} fallito: push rifiutato (possibile commit concorrente su remoto).`);
    if (attempt < MAX_ATTEMPTS) {
      console.log('Attesa di 3 secondi prima del prossimo tentativo...');
      sleep(3000);
    }
  }
}

if (!success) {
  console.error(`\nERRORE CRITICO: Push non riuscito dopo ${MAX_ATTEMPTS} tentativi.`);

  if (!fs.existsSync(diagDir)) {
    fs.mkdirSync(diagDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(diagDir, `push-failure-report-${timestamp}.txt`);

  const report = [
    '=== REPORT DIAGNOSTICO FALLIMENTO SYNC/PUSH DATASET ===',
    `Data UTC: ${new Date().toISOString()}`,
    `Tentativi eseguiti: ${MAX_ATTEMPTS}`,
    `Ultimo errore: ${lastError ? lastError.message : 'Nessun errore specifico'}`,
    '',
    '--- GIT STATUS ---',
    getOutput('git status'),
    '',
    '--- LOCAL COMMITS (ultimi 5) ---',
    getOutput('git log -n 5 --oneline'),
    '',
    '--- REMOTE COMMITS (origin/main ultimi 5) ---',
    getOutput('git log origin/main -n 5 --oneline'),
    '',
    '--- GIT DIFF ORIGIN/MAIN ---',
    getOutput('git diff origin/main public/data/'),
  ].join('\n');

  fs.writeFileSync(reportPath, report, 'utf8');
  console.error(`Report diagnostico generato in: ${reportPath}`);
  process.exit(1);
}
