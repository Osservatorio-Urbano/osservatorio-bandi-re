import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { QualityGateReportSchema } from '../src/types/schema.ts';

describe('Verifica Quality Gate', () => {
  const qualityReportPath = path.resolve(__dirname, '../public/data/quality/latest.json');

  it('deve verificare che il report esista e rispetti lo schema', () => {
    expect(fs.existsSync(qualityReportPath)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(qualityReportPath, 'utf8'));
    const res = QualityGateReportSchema.safeParse(raw);
    if (!res.success) {
      console.error(JSON.stringify(res.error.format(), null, 2));
    }
    expect(res.success).toBe(true);
    expect(raw.status).toBe('PASSED');
    expect(raw.schema_valid).toBe(true);
    expect(raw.duplicates_found).toBe(0);
    expect(raw.invalid_urls).toBe(0);
    expect(raw.total_records).toBe(122);
  });
});
