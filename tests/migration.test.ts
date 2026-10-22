import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CanonicalDatasetSchema } from '../src/types/schema.ts';

describe('Migrazione Legacy -> Canonico', () => {
  const legacyPath = path.resolve(__dirname, '../legacy_src/data/bandi.json');
  const canonicalPath = path.resolve(__dirname, '../public/data/bandi.json');

  it('deve caricare entrambi i file e verificare la conservazione dei 122 bandi originali', () => {
    const legacyRaw = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    const canonicalRaw = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));

    expect(legacyRaw.bandi).toHaveLength(122);
    expect(canonicalRaw.bandi.length).toBeGreaterThanOrEqual(122);
    expect(canonicalRaw.meta.totale).toBe(canonicalRaw.bandi.length);
  });

  it('deve superare la validazione Zod completa dello schema canonico', () => {
    const canonicalRaw = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
    const parseResult = CanonicalDatasetSchema.safeParse(canonicalRaw);
    if (!parseResult.success) {
      console.error(JSON.stringify(parseResult.error.format(), null, 2));
    }
    expect(parseResult.success).toBe(true);
  });

  it('deve garantire il roundtrip esatto di tutti i 14 campi originali per tutti i 122 record', () => {
    const legacyRaw = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    const canonicalRaw = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));

    for (let i = 0; i < 122; i++) {
      const leg = legacyRaw.bandi[i];
      const can = canonicalRaw.bandi[i];

      expect(can.original.titolo).toBe(leg.titolo);
      expect(can.original.ente).toBe(leg.ente);
      expect(can.original.programma).toBe(leg.programma);
      expect(can.original.categoria).toBe(leg.categoria);
      expect(can.original.linee).toEqual(leg.linee);
      expect(can.original.descrizione).toBe(leg.descrizione);
      expect(can.original.beneficiari).toBe(leg.beneficiari);
      expect(can.original.dotazione).toBe(leg.dotazione);
      expect(can.original.contributo_max).toBe(leg.contributo_max);
      expect(can.original.cofinanziamento).toBe(leg.cofinanziamento);
      expect(can.original.scadenza).toBe(leg.scadenza);
      expect(can.original.scadenza_tipo).toBe(leg.scadenza_tipo);
      expect(can.original.url).toBe(leg.url);
      expect(can.original.note).toBe(leg.note || '');
    }
  });

  it('deve verificare che tutti gli ID siano univoci e stabili', () => {
    const canonicalRaw = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
    const ids = canonicalRaw.bandi.map((b: { id: string }) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(canonicalRaw.bandi.length);
  });

  it('deve verificare che tutti gli URL canonici siano validi e abbiano un dominio estratto', () => {
    const canonicalRaw = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
    for (const b of canonicalRaw.bandi) {
      expect(b.sourceCanonicalUrl).toMatch(/^https?:\/\//);
      expect(b.sourceDomain.length).toBeGreaterThan(0);
      expect(b.sourceDomain).not.toBe('sconosciuto');
    }
  });

  it('deve garantire che lo score sia compreso tra 0 e 100 con motivazioni chiare', () => {
    const canonicalRaw = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
    for (const b of canonicalRaw.bandi) {
      expect(b.score0to100).toBeGreaterThanOrEqual(0);
      expect(b.score0to100).toBeLessThanOrEqual(100);
      expect(b.scoreReasons.length).toBeGreaterThan(0);
    }
  });
});
