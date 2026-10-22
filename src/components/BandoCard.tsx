import React from 'react';
import { ExternalLink, Info, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { STRATEGIC_LINES_MAP, type CanonicalBando } from '../types/schema.ts';

interface BandoCardProps {
  bando: CanonicalBando;
  onOpenDetails: (bando: CanonicalBando) => void;
}

export const BandoCard: React.FC<BandoCardProps> = ({ bando, onOpenDetails }) => {
  const refDate = new Date();
  refDate.setHours(0, 0, 0, 0);

  const isSportello = bando.deadlineType === 'sportello';

  let daysLeft: number | null = null;
  let urgency = 'ampia';
  let leftLabel = 'a sportello';

  if (!isSportello && bando.deadline && /^\d{4}-\d{2}-\d{2}$/.test(bando.deadline)) {
    const d = new Date(`${bando.deadline}T00:00:00`);
    daysLeft = Math.round((d.getTime() - refDate.getTime()) / 86400000);
    if (daysLeft < 0) {
      urgency = 'scaduto';
      leftLabel = 'terminato';
    } else if (daysLeft === 0) {
      urgency = 'urgente';
      leftLabel = 'scade oggi';
    } else if (daysLeft <= 15) {
      urgency = 'urgente';
      leftLabel = `scade tra ${daysLeft} gg`;
    } else if (daysLeft <= 60) {
      urgency = 'vicina';
      leftLabel = `${daysLeft} giorni`;
    } else {
      urgency = 'ampia';
      leftLabel = `${daysLeft} giorni`;
    }
  } else if (isSportello) {
    urgency = 'sportello';
    leftLabel = 'a sportello';
  }

  const formatDateIt = (str: string | null) => {
    if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return 'n.d.';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  };

  const getEligibilityBadge = () => {
    if (bando.eligibility === 'confirmed') {
      return (
        <span className="badge" style={{ backgroundColor: 'var(--ok-soft)', color: 'var(--ok)' }} title="Ammissibilità confermata per il Comune o ATS">
          <CheckCircle2 size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
          Ammissibile PA
        </span>
      );
    }
    if (bando.eligibility === 'potential') {
      return (
        <span className="badge" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }} title="Ammissibile in partenariato o consorzio">
          <Clock size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
          In Partenariato
        </span>
      );
    }
    if (bando.eligibility === 'excluded') {
      return (
        <span className="badge" style={{ backgroundColor: 'var(--danger-soft)', color: 'var(--danger)' }} title="Non ammissibile direttamente per l'Ente locale">
          <XCircle size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
          Escluso Ente
        </span>
      );
    }
    return (
      <span className="badge" style={{ backgroundColor: 'var(--warn-soft)', color: 'var(--warn)' }}>
        <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
        Verifica in corso
      </span>
    );
  };

  return (
    <article className="card" data-state={bando.state}>
      <div className="card-head">
        <div className="card-head-main">
          <div className="card-badges">
            <span className="badge">{bando.original.categoria}</span>
            <span className={`badge badge-state ${bando.state}`}>
              {bando.state === 'open' ? 'Aperto' :
               bando.state === 'rolling_verified' ? 'Sportello Attivo' :
               bando.state === 'closed' ? 'Chiuso' : 'In verifica'}
            </span>
            {getEligibilityBadge()}
            <span className="badge badge-score" title={`Score di priorità: ${bando.score0to100}/100`}>
              Priorità: {bando.score0to100}/100
            </span>
            {bando.strategicLines.map(l => (
              <span key={l} className="badge badge-line" title={STRATEGIC_LINES_MAP[l]}>
                {l} · {STRATEGIC_LINES_MAP[l].replace('Sostenibilità ', '')}
              </span>
            ))}
          </div>

          <h3 className="card-title">
            <a href={bando.sourceCanonicalUrl} target="_blank" rel="noopener" title="Visita il bando ufficiale">
              {bando.original.titolo}
            </a>
          </h3>

          <p className="card-ente">
            {bando.original.ente} {bando.original.programma && bando.original.programma !== 'n.d.' ? `· ${bando.original.programma}` : ''}
          </p>

          {bando.original.descrizione && (
            <p className="card-desc">
              {bando.original.descrizione}
            </p>
          )}
        </div>

        <div className="deadline-box">
          <span className="deadline-label">Scadenza</span>
          <span className="deadline-val">
            {isSportello ? 'A sportello' : formatDateIt(bando.deadline)}
          </span>
          <span className={`deadline-left ${urgency}`}>
            {leftLabel}
          </span>
        </div>
      </div>

      <div className="card-foot">
        <div className="facts-group">
          {bando.original.dotazione && (
            <div className="fact">
              <span className="fact-label">Dotazione</span>
              <span className="fact-value">{bando.original.dotazione}</span>
            </div>
          )}
          {bando.original.contributo_max && (
            <div className="fact">
              <span className="fact-label">Contributo Max</span>
              <span className="fact-value">{bando.original.contributo_max}</span>
            </div>
          )}
          {bando.original.cofinanziamento && (
            <div className="fact">
              <span className="fact-label">Cofinanziamento</span>
              <span className="fact-value">{bando.original.cofinanziamento}</span>
            </div>
          )}
          {bando.original.beneficiari && (
            <div className="fact" style={{ maxWidth: '300px' }}>
              <span className="fact-label">Beneficiari</span>
              <span className="fact-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={bando.original.beneficiari}>
                {bando.original.beneficiari}
              </span>
            </div>
          )}
        </div>

        <div className="card-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onOpenDetails(bando)}
            title="Visualizza scheda completa, motivazione score, rischi e tracciabilità"
          >
            <Info size={14} />
            Scheda & Audit
          </button>
          <a
            href={bando.sourceCanonicalUrl}
            target="_blank"
            rel="noopener"
            className="btn btn-primary"
            title="Apri il bando ufficiale sul portale erogatore"
          >
            Bando ufficiale
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </article>
  );
};
