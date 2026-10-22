import React from 'react';
import { ExternalLink, Info } from 'lucide-react';
import type { CanonicalBando } from '../types/schema.ts';

interface BandoTableProps {
  bandi: CanonicalBando[];
  onOpenDetails: (bando: CanonicalBando) => void;
}

export const BandoTable: React.FC<BandoTableProps> = ({ bandi, onOpenDetails }) => {
  const formatDateIt = (str: string | null) => {
    if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return 'n.d.';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="table-container" tabIndex={0} aria-label="Elenco tabellare dei bandi">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col" style={{ minWidth: '320px' }}>Titolo & Ente</th>
            <th scope="col">Fonte</th>
            <th scope="col">Linee DUP</th>
            <th scope="col">Scadenza</th>
            <th scope="col">Ammissibilità</th>
            <th scope="col">Score</th>
            <th scope="col" style={{ textAlign: 'right' }}>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {bandi.map((b) => {
            const isSportello = b.deadlineType === 'sportello';
            return (
              <tr key={b.id}>
                <td>
                  <strong style={{ fontSize: '13px', display: 'block', marginBottom: '2px' }}>
                    {b.original.titolo}
                  </strong>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {b.original.ente} {b.original.programma ? `· ${b.original.programma}` : ''}
                  </span>
                </td>
                <td>
                  <span className="badge">{b.original.categoria}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                    {b.strategicLines.map(l => (
                      <span key={l} className="badge badge-line">{l}</span>
                    ))}
                  </div>
                </td>
                <td>
                  <strong>{isSportello ? 'A sportello' : formatDateIt(b.deadline)}</strong>
                </td>
                <td>
                  <span className={`badge badge-state ${b.eligibility === 'confirmed' ? 'open' : b.eligibility === 'potential' ? 'rolling_verified' : 'closed'}`}>
                    {b.eligibility === 'confirmed' ? 'PA / ATS' : b.eligibility === 'potential' ? 'Partenariato' : 'Escluso'}
                  </span>
                </td>
                <td>
                  <span className="badge badge-score">
                    {b.score0to100}
                  </span>
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px', fontSize: '11px', marginRight: '6px' }}
                    onClick={() => onOpenDetails(b)}
                    title="Dettagli e audit"
                  >
                    <Info size={12} />
                    Dettagli
                  </button>
                  <a
                    href={b.sourceCanonicalUrl}
                    target="_blank"
                    rel="noopener"
                    className="btn btn-primary"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    title="Apri bando ufficiale"
                  >
                    Bando
                    <ExternalLink size={10} />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
