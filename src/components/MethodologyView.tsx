import React, { useState } from 'react';
import { ShieldCheck, Database, Cpu, FileCode2, Scale, Activity, ExternalLink, CheckCircle, Clock } from 'lucide-react';

interface SourceItem {
  name: string;
  domain: string;
  type: 'UE' | 'Nazionale/PNRR' | 'Regione ER' | 'Fondazioni';
  tier: 'Tier 1' | 'Tier 2';
  status: 'operativa' | 'pianificata';
  method: string;
  note: string;
  url: string;
}

export const MethodologyView: React.FC = () => {
  const [filterType, setFilterType] = useState<string>('all');

  const sources: SourceItem[] = [
    // FONTI OPERATIVE CON CONNETTORE ATTIVO
    {
      name: 'PR FESR Emilia-Romagna 2021-2027',
      domain: 'fesr.regione.emilia-romagna.it',
      type: 'Regione ER',
      tier: 'Tier 1',
      status: 'operativa',
      method: 'RSS 2.0 Feed Ufficiale',
      note: 'Bandi regionali FESR per competitività, ricerca, transizione ecologica ed energetica.',
      url: 'https://fesr.regione.emilia-romagna.it/opportunita/bandi'
    },
    {
      name: 'Regione Emilia-Romagna - Energia, Clima & Ambiente',
      domain: 'energia.regione.emilia-romagna.it',
      type: 'Regione ER',
      tier: 'Tier 1',
      status: 'operativa',
      method: 'RSS 2.0 Feed Ufficiale',
      note: 'Avvisi e contributi per comunità energetiche rinnovabili, decarbonizzazione e tutela ambientale.',
      url: 'https://energia.regione.emilia-romagna.it/bandi'
    },
    {
      name: 'PA Digitale 2026 (Presidenza del Consiglio - DTD PNRR)',
      domain: 'padigitale2026.gov.it',
      type: 'Nazionale/PNRR',
      tier: 'Tier 1',
      status: 'operativa',
      method: 'Open Data API & Portale Avvisi',
      note: 'Avvisi PNRR Misura 1 per migrazione cloud, interoperabilità e servizi digitali per i Comuni.',
      url: 'https://padigitale2026.gov.it/avvisi/'
    },
    {
      name: 'European Commission Funding & Tenders Portal (API SEDIA)',
      domain: 'ec.europa.eu',
      type: 'UE',
      tier: 'Tier 1',
      status: 'operativa',
      method: 'API REST Ufficiale SEDIA',
      note: 'Opportunità a gestione diretta UE (Horizon Europe, LIFE, Digital Europe, CERV, Urban Mobility).',
      url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-search'
    },
    {
      name: 'Open Fundraising (Bandi Fondazioni Erogative Italiane)',
      domain: 'openfundraising.it',
      type: 'Fondazioni',
      tier: 'Tier 1',
      status: 'operativa',
      method: 'Open Data Aggregator & API',
      note: 'Monitoraggio centralizzato di Fondazioni di Origine Bancaria, Fondazioni di Comunità e Imprese Filantropiche.',
      url: 'https://www.openfundraising.it/bandi'
    },
    {
      name: 'Fondazione Unipolis (Welfare, Mobilità & Disuguaglianze)',
      domain: 'fondazioneunipolis.org',
      type: 'Fondazioni',
      tier: 'Tier 1',
      status: 'operativa',
      method: 'Web Ingestion & News Monitor',
      note: 'Bandi nazionali periodici (es. Bando POP, Bando ACT) per inclusione giovanile e mobilità sostenibile.',
      url: 'https://www.fondazioneunipolis.org/site/bandi/'
    },
    {
      name: 'Fondazione Cassa di Risparmio Pietro Manodori',
      domain: 'fondazionemanodori.it',
      type: 'Fondazioni',
      tier: 'Tier 2',
      status: 'operativa',
      method: 'Web Ingestion Strutturata',
      note: 'Erogazioni istituzionali e bandi territoriali a supporto di welfare, cultura ed educazione a Reggio Emilia.',
      url: 'https://fondazionemanodori.it/bandi'
    },
    {
      name: 'Fondazione Cariparma',
      domain: 'fondazionecariparma.it',
      type: 'Fondazioni',
      tier: 'Tier 2',
      status: 'operativa',
      method: 'Web Ingestion Strutturata',
      note: 'Bandi ed erogazioni per l\'area vasta emiliana nei settori sociale, salute e patrimonio culturale.',
      url: 'https://www.fondazionecariparma.it/bandi'
    },
    {
      name: 'Fondazione Cassa di Risparmio di Carpi (Terre d\'Argine)',
      domain: 'fondazionecrcarpi.it',
      type: 'Fondazioni',
      tier: 'Tier 2',
      status: 'operativa',
      method: 'Integrazione Open Fundraising',
      note: 'Bandi territoriali per l\'area contermine alla Bassa Reggiana e provincia di Reggio Emilia.',
      url: 'https://www.fondazionecrcarpi.it/'
    },
    {
      name: 'PR FSE+ Emilia-Romagna 2021-2027',
      domain: 'fse.regione.emilia-romagna.it',
      type: 'Regione ER',
      tier: 'Tier 1',
      status: 'operativa',
      method: 'Bandi e Avvisi Regionali',
      note: 'Fondo Sociale Europeo Plus per occupabilità, formazione, competenze e inclusione attiva.',
      url: 'https://formazionelavoro.regione.emilia-romagna.it/fse-2021-2027'
    },

    // FONTI PIANIFICATE O IN COORDINAMENTO
    {
      name: 'Ministero del Lavoro e delle Politiche Sociali',
      domain: 'lavoro.gov.it',
      type: 'Nazionale/PNRR',
      tier: 'Tier 1',
      status: 'pianificata',
      method: 'Integrazione API/Scrape Programmata',
      note: 'Avvisi e decreti di riparto per Piani Sociali di Zona, Terzo Settore e inclusione socio-lavorativa.',
      url: 'https://www.lavoro.gov.it/'
    },
    {
      name: 'Interreg Central Europe',
      domain: 'interreg-central.eu',
      type: 'UE',
      tier: 'Tier 1',
      status: 'pianificata',
      method: 'Monitoraggio Call Transnazionali',
      note: 'Cooperazione territoriale europea transnazionale per città intelligenti e connesse.',
      url: 'https://www.interreg-central.eu/calls'
    },
    {
      name: 'European Urban Initiative (EUI)',
      domain: 'urban-initiative.eu',
      type: 'UE',
      tier: 'Tier 1',
      status: 'pianificata',
      method: 'Monitoraggio Call Innovative Actions',
      note: 'Azioni urbane innovative per città sostenibili, transizione giusta e Nuovo Bauhaus Europeo.',
      url: 'https://www.urban-initiative.eu/calls'
    },
    {
      name: 'Fondazione Cariplo (Bandi Nazionali & Interregionali)',
      domain: 'fondazionecariplo.it',
      type: 'Fondazioni',
      tier: 'Tier 1',
      status: 'pianificata',
      method: 'Monitorato via Open Fundraising',
      note: 'Grandi call nazionali per ambiente, servizi alla persona, arte e ricerca scientifica.',
      url: 'https://www.fondazionecariplo.it/'
    },
    {
      name: 'Fondazione Compagnia di San Paolo',
      domain: 'compagniadisanpaolo.it',
      type: 'Fondazioni',
      tier: 'Tier 1',
      status: 'pianificata',
      method: 'Monitorato via Open Fundraising',
      note: 'Iniziative multiregionali per Pianeta, Persone e Cultura.',
      url: 'https://www.compagniadisanpaolo.it/'
    },
    {
      name: 'Fondazione CON IL SUD',
      domain: 'fondazioneconilsud.it',
      type: 'Fondazioni',
      tier: 'Tier 1',
      status: 'pianificata',
      method: 'Monitorato via Open Fundraising',
      note: 'Bandi per welfare comunitario, coesione sociale e beni comuni.',
      url: 'https://www.fondazioneconilsud.it/'
    }
  ];

  const filteredSources = sources.filter(s => {
    if (filterType === 'all') return true;
    if (filterType === 'operativa') return s.status === 'operativa';
    if (filterType === 'pianificata') return s.status === 'pianificata';
    return s.type === filterType;
  });

  const operativeCount = sources.filter(s => s.status === 'operativa').length;
  const plannedCount = sources.filter(s => s.status === 'pianificata').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="section-title">Fonti, Metodologia di Scoring & Trasparenza</h2>
            <p className="section-desc">
              Documentazione tecnica del sistema di funding intelligence: protocolli di acquisizione, quality gate di validazione, algoritmo di punteggio e vincoli operativi.
            </p>
          </div>

          <a
            href="#/stato-fonti"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Activity size={15} color="var(--accent)" />
            Apri Stato Fonti & Pipeline in tempo reale →
          </a>
        </div>
      </div>

      {/* 1. Fonti Autorizzate */}
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="var(--accent)" />
              Registro delle Fonti Istituzionali Monitorate (sources.yml)
            </h3>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              <strong>{operativeCount} fonti con connettori automatici attivi</strong> e <strong>{plannedCount} canali istituzionali monitorati</strong>.
            </span>
          </div>

          {/* Filtri categoria / stato */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterType('all')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              Tutte ({sources.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterType === 'operativa' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterType('operativa')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              ✓ Operative ({operativeCount})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterType === 'Fondazioni' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterType('Fondazioni')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              Fondazioni
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterType === 'Regione ER' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterType('Regione ER')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              Regione ER
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterType === 'UE' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterType('UE')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              UE
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterType === 'Nazionale/PNRR' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterType('Nazionale/PNRR')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              PNRR
            </button>
          </div>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: 1.5 }}>
          L'Osservatorio raccoglie e indicizza esclusivamente comunicati ufficiali, feed RSS, open data e pagine pubbliche nel pieno rispetto di robots.txt, con rate limit prudenziale di 1 richiesta al secondo e timeout di 10–12 secondi.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '14px' }}>
          {filteredSources.map(s => {
            const isOp = s.status === 'operativa';

            return (
              <div
                key={s.domain + s.name}
                style={{
                  background: 'var(--surface-2)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', gap: '8px' }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text)' }}>{s.name}</strong>
                    <span className="badge" style={{ flexShrink: 0, fontSize: '10px' }}>{s.tier}</span>
                  </div>

                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    {s.note}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isOp ? (
                      <span style={{ color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                        <CheckCircle size={12} /> Operativo
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={12} /> Pianificato
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)' }}>· {s.method}</span>
                  </div>

                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener"
                    style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    title={`Visita portale ${s.domain}`}
                  >
                    {s.domain} <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Quality Gate e Politica FAIL CLOSED */}
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="var(--ok)" />
          Quality Gate & Principio FAIL CLOSED
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
          Prima di qualunque pubblicazione o emissione della newsletter, una suite di test automatici (vitest + Zod + quality-gate.mjs) esegue 6 verifiche deterministiche bloccanti:
        </p>
        <ul style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--text)', paddingLeft: '20px', margin: 0 }}>
          <li><strong>Validazione Zod completa:</strong> conformità dello schema 2.0 per tutti i campi, tipi e vincoli numerici.</li>
          <li><strong>Integrità del volume:</strong> verifica di almeno 100 record consolidati per prevenire cancellazioni accidentali (preservazione dei 122 bandi originali).</li>
          <li><strong>Unicità e deduplicazione:</strong> nessun identificativo collisione hash o bando duplicato su base Ente + Programma + URL.</li>
          <li><strong>Integrità URL e domini:</strong> verifica formale del protocollo HTTP/HTTPS per il 100% delle schede ufficiali.</li>
          <li><strong>Schedulazione nativa Europe/Rome:</strong> esecuzione automatica quotidiana alle <strong>06:30 Europe/Rome</strong> con gestione integrata di ora solare (CET) e legale (CEST).</li>
          <li><strong>Coerenza semantica:</strong> esclusione immediata dalle raccomandazioni per bandi chiusi o privi di prova ufficiale.</li>
        </ul>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', fontStyle: 'italic' }}>
          In caso di fallimento di anche solo un controllo, la pipeline genera uno stato BLOCKED e nessun nuovo item READY viene inserito nel feed RSS, impedendo a Power Automate di effettuare invii errati.
        </p>
      </section>

      {/* 3. Algoritmo di Scoring (0-100) */}
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCode2 size={18} color="var(--accent)" />
          Algoritmo di Scoring Trasparente (0-100)
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Il punteggio è deterministico, calcolato lato build e sempre motivato con evidenze testuali:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px' }}>
          <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <strong>Base: 50 punti</strong>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>Punto di partenza per ogni bando censito da fonte autorizzata.</p>
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <strong>Ammissibilità PA: fino a +25</strong>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>+25 per Comune/ATS diretto, +10 partenariato, -30 escluso.</p>
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <strong>Stato Apertura: fino a +15</strong>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>+15 bando attivo verificato, -40 bando chiuso/scaduto.</p>
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <strong>Linee DUP: fino a +10</strong>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>+10 per 2 o più linee di mandato coperte, +5 per 1 linea.</p>
          </div>
        </div>
      </section>

      {/* 4. Modulo GenAI / Copilot M365 (NON ATTIVO) */}
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="var(--text-muted)" />
            Integrazione Microsoft Copilot M365 / GenAI
          </h3>
          <span className="badge" style={{ backgroundColor: 'var(--warn-soft)', color: 'var(--warn)', fontWeight: 700 }}>
            MODULO DISABILITATO / NON ATTIVO
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          In conformità ai vincoli del capitolato tecnico, il sistema core opera <strong>esclusivamente senza intelligenza artificiale generativa</strong>. Nessuna chiamata API automatica a Copilot Studio o OpenAI è configurata, in quanto le licenze Copilot Premium Microsoft 365 non garantiscono automazione unattended via API standard. L'interfaccia predispone hook per importare sintesi certificate solo qualora l'Ente approvi uno specifico connettore conforme.
        </p>
      </section>

      {/* 5. Disclaimer Legale */}
      <section style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <Scale size={24} color="var(--accent)" style={{ flex: 'none', marginTop: '2px' }} />
        <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text)' }}>
          <strong>Clausola di esclusione di responsabilità giuridica:</strong>
          <br />
          Le informazioni, i punteggi di priorità e le valutazioni di ammissibilità contenute in questo portale e nelle relative newsletter settimanali sono elaborate ad esclusivo scopo di intelligence, supporto strategico e monitoraggio preventivo. Esse <strong>non costituiscono parere legale, amministrativo o asseverazione ufficiale di ammissibilità</strong>. Prima di adottare determine, delibere di Giunta o presentare candidature vincolanti, i funzionari e dirigenti responsabili del procedimento devono verificare il testo integrale del bando e la documentazione originale pubblicata dall'ente erogatore.
        </div>
      </section>
    </div>
  );
};
