import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Verifica Progetti Comunali projects.json', () => {
  const projectsPath = path.resolve(__dirname, '../projects.json');

  it('deve contenere i 7 progetti strategici comunali previsti dal capitolato', () => {
    expect(fs.existsSync(projectsPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

    expect(data.ente).toBe('Comune di Reggio Emilia');
    expect(Array.isArray(data.projects)).toBe(true);
    expect(data.projects.length).toBe(7);

    const names = data.projects.map((p: { name: string }) => p.name);
    expect(names).toContain('Osservatorio Urbano');
    expect(names).toContain('RE_ACTS');
    expect(names).toContain('Digital Twin');
    expect(names).toContain('Smart City');
    expect(names).toContain('Data Governance');
    expect(names).toContain('Innovazione Amministrativa');
    expect(names).toContain('Rigenerazione Urbana');

    // Tutti i progetti devono essere in modalità 'example' fino a validazione ufficiale
    for (const p of data.projects) {
      expect(p.mode).toBe('example');
      expect(p.strategicLines.length).toBeGreaterThan(0);
      expect(p.keywords.length).toBeGreaterThan(0);
    }
  });
});
