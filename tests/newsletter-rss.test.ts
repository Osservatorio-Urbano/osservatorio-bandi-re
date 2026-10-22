import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Verifica Feed RSS 2.0 e Newsletter Email-Safe', () => {
  const rssPath = path.resolve(__dirname, '../public/newsletter/feed.xml');
  const latestJsonPath = path.resolve(__dirname, '../public/data/weekly/latest.json');
  const manifestPath = path.resolve(__dirname, '../public/newsletter/manifest.json');

  it('deve verificare che il feed.xml esista ed sia un RSS 2.0 valido', () => {
    expect(fs.existsSync(rssPath)).toBe(true);
    const content = fs.readFileSync(rssPath, 'utf8');

    expect(content).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(content).toContain('<rss version="2.0"');
    expect(content).toContain('</channel>');
    expect(content).toContain('</rss>');
  });

  it('deve contenere esattamente 1 ITEM per edizione READY nel feed', () => {
    const content = fs.readFileSync(rssPath, 'utf8');
    const items = content.match(/<item>[\s\S]*?<\/item>/g);
    expect(items).not.toBeNull();
    expect(items!.length).toBe(1);

    const item = items![0];
    expect(item).toContain('<title>RE-FUNDING-');
    expect(item).toContain('<guid isPermaLink="false">RE-FUNDING-');
    expect(item).toContain('<category>READY_LATEST</category>');
    expect(item).toContain('<description><![CDATA[');
    expect(item).toContain(']]></description>');
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

  it('deve verificare che latest.json sia conforme e contenga lo status READY', () => {
    expect(fs.existsSync(latestJsonPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));

    expect(data.status).toBe('READY');
    expect(data.quality_passed).toBe(true);
    expect(data.edition_id).toMatch(/^RE-FUNDING-\d{4}-W\d{2}$/);
    expect(data.selected_opportunities.length).toBeGreaterThanOrEqual(1);
    expect(data.selected_opportunities.length).toBeLessThanOrEqual(12);
  });

  it('deve verificare il manifest delle edizioni', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(Array.isArray(data.editions)).toBe(true);
    expect(data.editions.length).toBeGreaterThanOrEqual(1);
  });
});
