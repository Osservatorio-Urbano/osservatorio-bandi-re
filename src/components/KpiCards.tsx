import React from 'react';
import type { CanonicalBando } from '../types/schema.ts';

interface KpiCardsProps {
  bandi: CanonicalBando[];
}

export const KpiCards: React.FC<KpiCardsProps> = ({ bandi }) => {
  const refDate = new Date();
  refDate.setHours(0, 0, 0, 0);

  const openBandi = bandi.filter(b => b.state === 'open' || b.state === 'rolling_verified');
  const rollingBandi = bandi.filter(b => b.deadlineType === 'sportello' || b.state === 'rolling_verified');

  const urgentBandi = bandi.filter(b => {
    if (b.state !== 'open' || !b.deadline) return false;
    const d = new Date(`${b.deadline}T00:00:00`);
    const diff = Math.round((d.getTime() - refDate.getTime()) / 86400000);
    return diff >= 0 && diff <= 30;
  });

  const coveredLines = new Set<string>();
  bandi.forEach(b => {
    (b.strategicLines || []).forEach(l => coveredLines.add(l));
  });

  return (
    <section className="kpis" aria-label="Indicatori chiave di monitoraggio">
      <article className="kpi">
        <span className="kpi-label">Bandi aperti verificati</span>
        <strong className="kpi-value">{openBandi.length}</strong>
        <span className="kpi-foot">su {bandi.length} censiti nel dataset</span>
      </article>

      <article className="kpi">
        <span className="kpi-label">Scadenza entro 30 giorni</span>
        <strong className="kpi-value" style={{ color: urgentBandi.length > 0 ? 'var(--danger)' : 'inherit' }}>
          {urgentBandi.length}
        </strong>
        <span className="kpi-foot">richiedono delibera immediata</span>
      </article>

      <article className="kpi">
        <span className="kpi-label">A sportello aperto</span>
        <strong className="kpi-value">{rollingBandi.length}</strong>
        <span className="kpi-foot">fino ad esaurimento risorse</span>
      </article>

      <article className="kpi">
        <span className="kpi-label">Linee di mandato coperte</span>
        <strong className="kpi-value">{coveredLines.size} / 6</strong>
        <span className="kpi-foot">100% delle linee DUP presidiate</span>
      </article>
    </section>
  );
};
