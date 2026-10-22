import React from 'react';
import { STRATEGIC_LINES_MAP, type StrategicLine, type CanonicalBando } from '../types/schema.ts';

interface LineGridProps {
  bandi: CanonicalBando[];
  selectedLines: Set<StrategicLine>;
  onToggleLine: (line: StrategicLine) => void;
}

export const LineGrid: React.FC<LineGridProps> = ({ bandi, selectedLines, onToggleLine }) => {
  const lineKeys: StrategicLine[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

  return (
    <section className="lines" aria-label="Copertura per linea strategica">
      <h2 className="section-title">Copertura per linea strategica di mandato (DUP 2026-2028)</h2>
      <p className="section-desc">
        Clicca su una linea per filtrare istantaneamente i bandi allineati agli obiettivi dell'Amministrazione.
      </p>
      <div className="line-grid">
        {lineKeys.map((code) => {
          const count = bandi.filter(b => b.strategicLines.includes(code)).length;
          const openCount = bandi.filter(b => b.strategicLines.includes(code) && (b.state === 'open' || b.state === 'rolling_verified')).length;
          const isSelected = selectedLines.has(code);

          return (
            <div
              key={code}
              className={`line-card ${isSelected ? 'active' : ''}`}
              onClick={() => onToggleLine(code)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleLine(code);
                }
              }}
              aria-pressed={isSelected}
            >
              <div className="line-card-head">
                <span className="line-badge">{code}</span>
                <span className="line-count">
                  <strong>{openCount} aperti</strong> · {count} totali
                </span>
              </div>
              <h3 className="line-title">{STRATEGIC_LINES_MAP[code]}</h3>
            </div>
          );
        })}
      </div>
    </section>
  );
};
