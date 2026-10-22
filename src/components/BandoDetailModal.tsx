import React, { useEffect } from 'react';
import { X, ExternalLink, ShieldCheck, AlertCircle, Calendar, Hash } from 'lucide-react';
import { STRATEGIC_LINES_MAP, type CanonicalBando } from '../types/schema.ts';

interface BandoDetailModalProps {
  bando: CanonicalBando | null;
  onClose: () => void;
}

export const BandoDetailModal: React.FC<BandoDetailModalProps> = ({ bando, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!bando) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Chiudi scheda dettaglio"
        >
          <X size={18} />
        </button>

        {/* Header Modal */}
        <div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className="badge">{bando.original.categoria}</span>
            <span className={`badge badge-state ${bando.state}`}>{bando.state}</span>
            <span className="badge badge-score">Score: {bando.score0to100}/100</span>
            <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Hash size={11} /> {bando.id}
            </span>
          </div>

          <h2 id="modal-title" style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', lineHeight: 1.35 }}>
            {bando.original.titolo}
          </h2>

          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Ente erogatore: <strong>{bando.original.ente}</strong> {bando.original.programma ? `· ${bando.original.programma}` : ''}
          </p>
        </div>

        {/* Descrizione completa */}
        <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Descrizione dell'opportunità
          </h4>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6 }}>
            {bando.original.descrizione || 'Nessuna descrizione testuale estesa fornita dalla fonte.'}
          </p>
        </div>

        {/* Griglia Dati Finanziari & Ammissibilità */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div className="fact" style={{ background: 'var(--surface)', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <span className="fact-label">Scadenza</span>
            <span className="fact-value">{bando.deadlineType === 'sportello' ? 'A sportello aperto' : bando.deadline || 'n.d.'}</span>
          </div>
          <div className="fact" style={{ background: 'var(--surface)', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <span className="fact-label">Dotazione Finanziaria</span>
            <span className="fact-value">{bando.original.dotazione || 'Non specificata'}</span>
          </div>
          <div className="fact" style={{ background: 'var(--surface)', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <span className="fact-label">Contributo Massimo</span>
            <span className="fact-value">{bando.original.contributo_max || 'Non specificato'}</span>
          </div>
          <div className="fact" style={{ background: 'var(--surface)', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <span className="fact-label">Cofinanziamento</span>
            <span className="fact-value">{bando.original.cofinanziamento || 'Non specificato'}</span>
          </div>
        </div>

        {/* Beneficiari */}
        <div style={{ background: 'var(--surface)', padding: '14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Beneficiari ammessi & Target
          </h4>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
            {bando.original.beneficiari || 'Consultare il testo del bando.'}
          </p>
        </div>

        {/* Motivazioni dello Score */}
        <div style={{ background: 'var(--surface)', padding: '14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} /> Criteri e motivazioni dello score ({bando.score0to100}/100)
          </h4>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', lineHeight: 1.6, color: 'var(--text)' }}>
            {bando.scoreReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        {/* Rischi e vincoli operativi per la PA */}
        {bando.risks.length > 0 && (
          <div style={{ background: 'var(--surface)', padding: '14px', borderRadius: 'var(--radius)', border: '1px solid var(--warn)', borderLeft: '4px solid var(--warn)' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} /> Rischi e vincoli operativi rilevati
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', lineHeight: 1.6, color: 'var(--text)' }}>
              {bando.risks.map((rk, i) => (
                <li key={i}>{rk}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Linee di mandato DUP collegate */}
        <div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Linee di mandato DUP 2026-2028
          </h4>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {bando.strategicLines.map(l => (
              <span key={l} className="badge badge-line">
                {l} · {STRATEGIC_LINES_MAP[l]}
              </span>
            ))}
          </div>
        </div>

        {/* Tracciabilità, verifica e note dell'istruttoria */}
        <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '12px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={14} /> Evidenze e note istruttorie
          </h4>
          <p style={{ margin: '0 0 6px 0', color: 'var(--text)' }}>
            {bando.sourceEvidence || 'Nessuna evidenza aggiuntiva annotata.'}
          </p>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '11px', flexWrap: 'wrap' }}>
            <span>Data primo censimento: <strong>{bando.discoveredAt.split('T')[0]}</strong></span>
            <span>Ultima verifica ufficiale: <strong>{bando.sourceCheckedAt.split('T')[0]}</strong></span>
            <span>Dominio fonte: <strong>{bando.sourceDomain}</strong></span>
          </div>
        </div>

        {/* Footer Modal con Link e Azioni */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Fonte ufficiale: {bando.sourceDomain}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Chiudi
            </button>
            <a
              href={bando.sourceCanonicalUrl}
              target="_blank"
              rel="noopener"
              className="btn btn-primary"
            >
              Consulta bando ufficiale
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
