import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, Archive, CalendarDays } from 'lucide-react';
import type { CanonicalBando } from '../types/schema.ts';
import { BandoCard } from './BandoCard.tsx';

interface TimelineViewProps {
  bandi: CanonicalBando[];
  onOpenDetails: (bando: CanonicalBando) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ bandi, onOpenDetails }) => {
  const refDate = new Date();
  refDate.setHours(0, 0, 0, 0);

  const getDaysLeft = (b: CanonicalBando): number | null => {
    if (b.deadlineType === 'sportello' || !b.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(b.deadline)) {
      return null;
    }
    const d = new Date(`${b.deadline}T00:00:00`);
    return Math.round((d.getTime() - refDate.getTime()) / 86400000);
  };

  const urgent15 = bandi.filter(b => {
    if (b.state !== 'open') return false;
    const dl = getDaysLeft(b);
    return dl !== null && dl >= 0 && dl <= 15;
  });

  const next30 = bandi.filter(b => {
    if (b.state !== 'open') return false;
    const dl = getDaysLeft(b);
    return dl !== null && dl > 15 && dl <= 30;
  });

  const next60 = bandi.filter(b => {
    if (b.state !== 'open') return false;
    const dl = getDaysLeft(b);
    return dl !== null && dl > 30 && dl <= 60;
  });

  const later = bandi.filter(b => {
    if (b.state !== 'open') return false;
    const dl = getDaysLeft(b);
    return dl !== null && dl > 60;
  });

  const rolling = bandi.filter(b => b.deadlineType === 'sportello' || b.state === 'rolling_verified');

  const closed = bandi.filter(b => b.state === 'closed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h2 className="section-title">Scadenziario & Timeline delle Opportunità</h2>
        <p className="section-desc">
          Organizzazione temporale per priorità e termini di presentazione. I bandi con scadenza inferiore a 15 giorni richiedono l'avvio immediato della delibera di indirizzo o convenzione.
        </p>
      </div>

      {/* 1. Imminenti (0-15 gg) */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <AlertTriangle color="var(--danger)" size={20} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--danger)' }}>
            Scadenze Imminenti (Entro 15 giorni) — {urgent15.length} opportunità
          </h3>
        </div>
        {urgent15.length > 0 ? (
          <div className="list">
            {urgent15.map(b => (
              <BandoCard key={b.id} bando={b} onOpenDetails={onOpenDetails} />
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Nessuna scadenza critica nei prossimi 15 giorni.
          </p>
        )}
      </section>

      {/* 2. Breve termine (16-30 gg) */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Clock color="var(--warn)" size={20} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--warn)' }}>
            Breve Termine (16-30 giorni) — {next30.length} opportunità
          </h3>
        </div>
        {next30.length > 0 ? (
          <div className="list">
            {next30.map(b => (
              <BandoCard key={b.id} bando={b} onOpenDetails={onOpenDetails} />
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Nessun bando in scadenza in questa finestra temporale.
          </p>
        )}
      </section>

      {/* 3. Medio termine (31-60 gg) */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <CalendarDays color="var(--accent)" size={20} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent)' }}>
            Finestra Ottimale di Progettazione (31-60 giorni) — {next60.length} opportunità
          </h3>
        </div>
        {next60.length > 0 ? (
          <div className="list">
            {next60.map(b => (
              <BandoCard key={b.id} bando={b} onOpenDetails={onOpenDetails} />
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Nessun bando presente in questo arco temporale.
          </p>
        )}
      </section>

      {/* 4. A sportello aperto verificato */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <CheckCircle2 color="var(--ok)" size={20} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--ok)' }}>
            A Sportello Continuo (Senza data fissa, ad esaurimento) — {rolling.length} opportunità
          </h3>
        </div>
        <div className="list">
          {rolling.map(b => (
            <BandoCard key={b.id} bando={b} onOpenDetails={onOpenDetails} />
          ))}
        </div>
      </section>

      {/* 5. Lungo termine (>60 gg) */}
      {later.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CalendarDays color="var(--text-muted)" size={20} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
              Lungo Termine (Oltre 60 giorni) — {later.length} opportunità
            </h3>
          </div>
          <div className="list">
            {later.map(b => (
              <BandoCard key={b.id} bando={b} onOpenDetails={onOpenDetails} />
            ))}
          </div>
        </section>
      )}

      {/* 6. Bandi Chiusi / Archivio */}
      <details style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Archive size={16} /> Mostra archivio storico dei bandi scaduti ({closed.length})
        </summary>
        <div style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            I bandi seguenti sono scaduti e archiviati. Vengono conservati per fini statistici, trasparenza e consultazione di precedenti edizioni.
          </p>
          <div className="list">
            {closed.slice(0, 15).map(b => (
              <BandoCard key={b.id} bando={b} onOpenDetails={onOpenDetails} />
            ))}
          </div>
          {closed.length > 15 && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>
              Visualizzati 15 di {closed.length} bandi archiviati. Usa la sezione "Tutti i bandi" per consultare l'elenco integrale.
            </p>
          )}
        </div>
      </details>
    </div>
  );
};
