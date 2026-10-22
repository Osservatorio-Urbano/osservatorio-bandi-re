import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  getIsoWeek,
  getMondayOfIsoWeek,
  getDeliveryMondayForDate,
  resolveDeliverySchedule,
} from '../scripts/utils/date-iso.mjs';

describe('Verifica Feed RSS 2.0 e Newsletter Email-Safe', () => {
  const rssPath = path.resolve(__dirname, '../public/newsletter/feed.xml');
  const latestJsonPath = path.resolve(__dirname, '../public/data/weekly/latest.json');
  const manifestPath = path.resolve(__dirname, '../public/newsletter/manifest.json');
  const datasetPath = path.resolve(__dirname, '../public/data/bandi.json');

  it('deve verificare che il feed.xml esista ed sia un RSS 2.0 valido', () => {
    expect(fs.existsSync(rssPath)).toBe(true);
    const content = fs.readFileSync(rssPath, 'utf8');

    expect(content).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(content).toContain('<rss version="2.0"');
    expect(content).toContain('</channel>');
    expect(content).toContain('</rss>');
    expect(content).toContain('<atom:link href="https://Osservatorio-Urbano.github.io/osservatorio-bandi-re/newsletter/feed.xml" rel="self" type="application/rss+xml" />');
  });

  it('deve contenere esattamente 1 ITEM per edizione READY nel feed con GUID univoco', () => {
    const content = fs.readFileSync(rssPath, 'utf8');
    const items = content.match(/<item>[\s\S]*?<\/item>/g);
    expect(items).not.toBeNull();
    expect(items!.length).toBe(1);

    const item = items![0];
    expect(item).toContain('<title>RE-FUNDING-');
    expect(item).toContain('<guid isPermaLink="false">RE-FUNDING-');
    expect(item).toContain('<description><![CDATA[');
    expect(item).toContain(']]></description>');
  });

  it('deve contenere le categorie READY_LATEST e DELIVERY_YYYY-MM-DD per Power Automate', () => {
    const content = fs.readFileSync(rssPath, 'utf8');
    const item = content.match(/<item>[\s\S]*?<\/item>/)![0];

    // Verifica presenza READY_LATEST
    expect(item).toContain('<category>READY_LATEST</category>');

    // Verifica presenza del pattern DELIVERY_YYYY-MM-DD
    const deliveryMatch = item.match(/<category>DELIVERY_(\d{4}-\d{2}-\d{2})<\/category>/);
    expect(deliveryMatch).not.toBeNull();
    const deliveryDate = deliveryMatch![1];

    // Deve essere un lunedì valido
    const [y, m, d] = deliveryDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    expect(dateObj.getUTCDay()).toBe(1); // 1 = Lunedì

    // Per l'edizione RE-FUNDING-2026-W44, la data deve essere rigorosamente 2026-10-26
    if (item.includes('RE-FUNDING-2026-W44')) {
      expect(item).toContain('<category>READY_LATEST</category>');
      expect(item).toContain('<category>DELIVERY_2026-10-26</category>');
    }
  });

  it('deve calcolare correttamente le date dei lunedì ISO anche a cavallo d\'anno', () => {
    // 2026-W44 -> 26 ottobre 2026
    expect(getMondayOfIsoWeek(2026, 44)).toBe('2026-10-26');

    // Transizione anno: Settimana 1 del 2026 inizia lunedì 29 dicembre 2025 (il 4 gennaio 2026 è domenica)
    expect(getMondayOfIsoWeek(2026, 1)).toBe('2025-12-29');

    // Settimana 1 del 2027 inizia lunedì 4 gennaio 2027
    expect(getMondayOfIsoWeek(2027, 1)).toBe('2027-01-04');

    // Settimana 1 del 2025 inizia lunedì 30 dicembre 2024
    expect(getMondayOfIsoWeek(2025, 1)).toBe('2024-12-30');

    // Settimana 1 del 2024 inizia lunedì 1 gennaio 2024
    expect(getMondayOfIsoWeek(2024, 1)).toBe('2024-01-01');

    // Verifica coerenza bidirezionale getIsoWeek
    const monday2026W44 = new Date('2026-10-26T00:00:00Z');
    const isoResult = getIsoWeek(monday2026W44);
    expect(isoResult.id).toBe('2026-W44');
    expect(isoResult.year).toBe(2026);
    expect(isoResult.weekNumber).toBe(44);
  });

  it('deve calcolare il prossimo lunedì di invio in base al giorno della settimana', () => {
    // Giovedì 22 ottobre 2026 -> lunedì 26 ottobre 2026
    const thu = new Date(Date.UTC(2026, 9, 22));
    expect(getDeliveryMondayForDate(thu)).toBe('2026-10-26');

    // Lunedì 26 ottobre 2026 (stesso giorno prima delle 08:00) -> lunedì 26 ottobre 2026
    const mon = new Date(Date.UTC(2026, 9, 26));
    expect(getDeliveryMondayForDate(mon)).toBe('2026-10-26');

    // Martedì 27 ottobre 2026 -> lunedì 2 novembre 2026
    const tue = new Date(Date.UTC(2026, 9, 27));
    expect(getDeliveryMondayForDate(tue)).toBe('2026-11-02');

    // Domenica 25 ottobre 2026 -> lunedì 26 ottobre 2026
    const sun = new Date(Date.UTC(2026, 9, 25));
    expect(getDeliveryMondayForDate(sun)).toBe('2026-10-26');
  });

  it('deve verificare che resolveDeliverySchedule generi le categorie corrette', () => {
    const sched44 = resolveDeliverySchedule('2026-W44');
    expect(sched44.id).toBe('2026-W44');
    expect(sched44.deliveryMonday).toBe('2026-10-26');
    expect(sched44.categories).toEqual(['READY_LATEST', 'DELIVERY_2026-10-26']);

    // Simulazione esecuzione su giovedì 22 ottobre 2026
    const fakeThursday = new Date(Date.UTC(2026, 9, 22, 10, 0, 0));
    const schedAuto = resolveDeliverySchedule(null, fakeThursday);
    expect(schedAuto.id).toBe('2026-W44');
    expect(schedAuto.deliveryMonday).toBe('2026-10-26');
    expect(schedAuto.categories).toContain('READY_LATEST');
    expect(schedAuto.categories).toContain('DELIVERY_2026-10-26');
  });

  it('deve contenere HTML email-safe compatibile Outlook senza tag vietati o script', () => {
    const content = fs.readFileSync(rssPath, 'utf8');
    const match = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    expect(match).not.toBeNull();

    const html = match![1];
    // Vietati script, iframe, form, external css links
    expect(html).not.toMatch(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi);
    expect(html).not.toMatch(/<iframe\b/gi);
    expect(html).not.toMatch(/<form\b/gi);
    expect(html).not.toMatch(/<link\s+rel=["']stylesheet["']/gi);

    // Deve utilizzare tabelle responsive per compatibilità con Word/Outlook
    expect(html).toContain('<table role="presentation"');
    expect(html).toContain('RE Funding Intelligence');
    expect(html).toContain('Nota metodologica e di trasparenza');

    // La dimensione dell'HTML non deve superare la soglia di sicurezza (max 80KB)
    const byteSize = Buffer.byteLength(html, 'utf8');
    expect(byteSize).toBeLessThan(80 * 1024);
  });

  it('deve verificare che latest.json sia conforme e contenga delivery_monday e status READY', () => {
    expect(fs.existsSync(latestJsonPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));

    expect(data.status).toBe('READY');
    expect(data.quality_passed).toBe(true);
    expect(data.edition_id).toMatch(/^RE-FUNDING-\d{4}-W\d{2}$/);
    expect(data.delivery_monday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.delivery_category).toBe(`DELIVERY_${data.delivery_monday}`);
    expect(data.selected_opportunities.length).toBeGreaterThanOrEqual(1);
    expect(data.selected_opportunities.length).toBeLessThanOrEqual(12);
  });

  it('deve verificare il manifest delle edizioni con delivery_monday', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(Array.isArray(data.editions)).toBe(true);
    expect(data.editions.length).toBeGreaterThanOrEqual(1);
    expect(data.editions[0].delivery_monday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('deve verificare che la newsletter utilizzi contatori DINAMICI coerenti con il dataset e non contatori hardcoded', () => {
    expect(fs.existsSync(datasetPath)).toBe(true);
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    const totalBandi = dataset.bandi.length;

    const openCount = dataset.bandi.filter((b: any) => b.state === 'open').length;
    const rollingCount = dataset.bandi.filter((b: any) => b.state === 'rolling_verified').length;
    const activeCount = openCount + rollingCount;

    const content = fs.readFileSync(rssPath, 'utf8');
    const match = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    expect(match).not.toBeNull();
    const html = match![1];

    // Il pulsante NON deve contenere il vecchio contatore statico "122" se il dataset ne contiene un numero diverso
    if (totalBandi !== 122) {
      expect(html).not.toContain("Accedi a tutti i 122 bandi");
    }

    // Il pulsante finale della newsletter DEVE contenere esattamente il totale effettivo dei bandi censiti
    expect(html).toContain(`Accedi a tutti i ${totalBandi} bandi sull'Osservatorio →`);

    // Il riepilogo DEVE riportare i valori effettivi calcolati senza duplicazioni o numeri inventati
    expect(html).toContain(`<strong>${activeCount}</strong> opportunità attive`);
    expect(html).toContain(`<strong>${openCount}</strong> a bando ordinario`);
    expect(html).toContain(`<strong>${rollingCount}</strong> a sportello verificato`);
    expect(html).toContain(`<strong>${totalBandi}</strong> bandi complessivamente censiti`);

    // Verifica link del pulsante verso il portale pubblico aggiornato
    expect(html).toContain('https://Osservatorio-Urbano.github.io/osservatorio-bandi-re/#/bandi');

    // Anche il file archiviato YYYY-Www.html deve contenere lo stesso pulsante dinamico
    const latestData = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));
    const archiveFile = path.resolve(__dirname, `../public/newsletter/${latestData.edition_id.replace('RE-FUNDING-', '')}.html`);
    if (fs.existsSync(archiveFile)) {
      const archiveHtml = fs.readFileSync(archiveFile, 'utf8');
      expect(archiveHtml).toContain(`Accedi a tutti i ${totalBandi} bandi sull'Osservatorio →`);
    }
  });
});
