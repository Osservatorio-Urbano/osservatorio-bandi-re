import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, Clock, AlertTriangle, RefreshCw, Terminal, Cpu } from 'lucide-react';

interface SourceReport {
  id: string;
  name: string;
  method: string;
  status: 'operativa' | 'prevista' | 'errore';
  last_scanned_at: string | null;
  items_acquired: number;
  errors_count: number;
  errors: string[];
  response_time_ms: number;
  endpoint_reachable: boolean | null;
  note?: string;
}

interface SourcesStatusData {
  timestamp: string;
  total_sources_monitored: number;
  active_operative_sources: number;
  planned_sources: number;
  last_scan_date: string;
  new_opportunities_found: number;
  updated_opportunities: number;
  expired_opportunities: number;
  sources: SourceReport[];
}

export const SourcesStatusView: React.FC = () => {
  const [data, setData] = useState<SourcesStatusData | null>(null);
  const [logText, setLogText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('./data/quality/sources-status.json')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.warn('sources-status.json non ancora disponibile:', err);
        setLoading(false);
      });

    fetch('./data/quality/ingest.log')
      .then(res => res.text())
      .then(txt => setLogText(txt))
      .catch(() => setLogText('Log di esecuzione non disponibile.'));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: '12px' }} />
        <p>Caricamento dello stato operativo dei connettori...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Stato dei Connettori & Acquisizione Automatica</h2>
          <span className="badge badge-state open" style={{ fontWeight: 700 }}>
            PIPELINE ATTIVA
          </span>
        </div>
        <p className="section-desc" style={{ marginTop: '8px' }}>
          Cruscotto di monitoraggio trasparente: visualizza in tempo reale le fonti istituzionali interrogate, la cadenza di scansione (quotidiana ore 06:30 Europe/Rome), le metriche di latenza, i bandi estratti e gli eventuali errori rilevati.
        </p>
      </div>

      {/* KPI Cards di Pipeline */}
      {data && (
        <section className="kpis" aria-label="Metriche di acquisizione">
          <article className="kpi">
            <span className="kpi-label">Connettori Operativi Attivi</span>
            <strong className="kpi-value" style={{ color: 'var(--ok)' }}>
              {data.active_operative_sources} / {data.total_sources_monitored}
            </strong>
            <span className="kpi-foot">{data.planned_sources} fonti pianificate</span>
          </article>

          <article className="kpi">
            <span className="kpi-label">Nuovi Bandi Acquisiti</span>
            <strong className="kpi-value" style={{ color: 'var(--accent)' }}>
              +{data.new_opportunities_found}
            </strong>
            <span className="kpi-foot">nell'ultimo ciclo di scansione</span>
          </article>

          <article className="kpi">
            <span className="kpi-label">Proroghe & Modifiche</span>
            <strong className="kpi-value">
              {data.updated_opportunities}
            </strong>
            <span className="kpi-foot">scadenze o stati aggiornati</span>
          </article>

          <article className="kpi">
            <span className="kpi-label">Ultima Scansione Automatica</span>
            <strong className="kpi-value" style={{ fontSize: '1.25rem' }}>
              {data.last_scan_date}
            </strong>
            <span className="kpi-foot">
              {data.timestamp ? new Date(data.timestamp).toLocaleTimeString('it-IT') : '06:30'} Europe/Rome
            </span>
          </article>
        </section>
      )}

      {/* Tabella Dettagliata Connettori */}
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--accent)" />
          Registro Operativo dei Connettori Istituzionali
        </h3>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Fonte Istituzionale</th>
                <th scope="col">Metodo Tecnico</th>
                <th scope="col">Stato Connettore</th>
                <th scope="col">Ultima Scansione</th>
                <th scope="col">Bandi Ricevuti</th>
                <th scope="col">Latenza</th>
                <th scope="col">Esito / Errori</th>
              </tr>
            </thead>
            <tbody>
              {(data?.sources || []).map(s => {
                const isOperative = s.status === 'operativa';
                const hasErrors = s.errors_count > 0;

                return (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ fontSize: '13px', display: 'block' }}>{s.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {s.id}</span>
                    </td>
                    <td>
                      <span className="badge" style={{ fontFamily: 'monospace', fontSize: '10px' }}>
                        {s.method.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {isOperative ? (
                        <span className="badge" style={{ backgroundColor: 'var(--ok-soft)', color: 'var(--ok)' }}>
                          <CheckCircle size={10} style={{ display: 'inline', marginRight: '3px' }} />
                          Operativo
                        </span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                          <Clock size={10} style={{ display: 'inline', marginRight: '3px' }} />
                          Pianificato
                        </span>
                      )}
                    </td>
                    <td>
                      {s.last_scanned_at ? (
                        <span>{new Date(s.last_scanned_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>In programmazione</span>
                      )}
                    </td>
                    <td>
                      <strong>{s.items_acquired}</strong>
                    </td>
                    <td>
                      {s.response_time_ms > 0 ? (
                        <span>{s.response_time_ms} ms</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {isOperative ? (
                        hasErrors ? (
                          <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <AlertTriangle size={12} /> {s.errors_count} errore/i
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle size={12} /> 200 OK
                          </span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                          Cadenza programmata
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Regole di Ingestion & Politica Fail-Safe */}
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={18} color="var(--accent)" />
          Protocollo di Protezione Dati & Fail-Safe
        </h3>
        <ul style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--text)', paddingLeft: '20px', margin: 0 }}>
          <li><strong>Preservazione del dataset storico:</strong> Tutti i record censiti all'avvio e l'intero storico consolidato non vengono mai sovrascritti o cancellati; ogni acquisizione agisce in modalità incrementale (merge sicuro).</li>
          <li><strong>Tracciamento reale delle verifiche:</strong> Se una fonte non risponde o va in timeout, i relativi bandi non vengono falsamente marcati come verificati e il loro stato precedente viene rigorosamente preservato.</li>
          <li><strong>Deduplicazione tramite hash SHA-256:</strong> L'ID univoco calcolato su Ente + Programma + URL canonico previene doppioni e riconcilia modifiche e proroghe.</li>
          <li><strong>Schedulazione controllata:</strong> GitHub Actions esegue la scansione ogni giorno alle <strong>06:30 Europe/Rome</strong>, garantendo l'emissione della newsletter e del feed RSS pronti prima delle 08:00 del lunedì.</li>
        </ul>
      </section>

      {/* Console Log Esecuzione Recente */}
      {logText && (
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} color="var(--text-muted)" />
            Log di Esecuzione Ultima Pipeline (ingest.log)
          </h3>
          <pre
            style={{
              background: 'oklch(15% 0.01 260)',
              color: 'oklch(85% 0.08 150)',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontFamily: 'monospace',
              maxHeight: '320px',
              overflowY: 'auto',
              lineHeight: 1.5,
              margin: 0
            }}
          >
            {logText}
          </pre>
        </section>
      )}
    </div>
  );
};
