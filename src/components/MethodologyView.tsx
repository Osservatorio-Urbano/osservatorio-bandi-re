import React from 'react';
import { ShieldCheck, Database, Cpu, FileCode2, Scale } from 'lucide-react';

export const MethodologyView: React.FC = () => {
  const sources = [
    { name: 'Ministero del Lavoro e delle Politiche Sociali', domain: 'lavoro.gov.it', type: 'Nazionale/PNRR', tier: 'Tier 1' },
    { name: 'Regione Emilia-Romagna - Bandi e Finanziamenti', domain: 'regione.emilia-romagna.it', type: 'Regione ER', tier: 'Tier 1' },
    { name: 'PR FESR Emilia-Romagna 2021-2027', domain: 'fesr.regione.emilia-romagna.it', type: 'Regione ER', tier: 'Tier 1' },
    { name: 'PR FSE+ Emilia-Romagna 2021-2027', domain: 'fse.regione.emilia-romagna.it', type: 'Regione ER', tier: 'Tier 1' },
    { name: 'Fondazione Cassa di Risparmio Pietro Manodori', domain: 'fondazionemanodori.it', type: 'Fondazioni', tier: 'Tier 2' },
    { name: 'Fondazione Cariparma', domain: 'fondazionecariparma.it', type: 'Fondazioni', tier: 'Tier 2' },
    { name: 'European Commission Funding & Tenders Portal', domain: 'ec.europa.eu', type: 'UE', tier: 'Tier 1' },
    { name: 'Interreg Central Europe', domain: 'interreg-central.eu', type: 'UE', tier: 'Tier 1' },
    { name: 'European Urban Initiative (EUI)', domain: 'urban-initiative.eu', type: 'UE', tier: 'Tier 1' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h2 className="section-title">Fonti, Metodologia di Scoring & Trasparenza</h2>
        <p className="section-desc">
          Documentazione tecnica del sistema di funding intelligence: protocolli di acquisizione, quality gate di validazione, algoritmo di punteggio e vincoli operativi.
        </p>
      </div>

      {/* 1. Fonti Autorizzate */}
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} color="var(--accent)" />
          Fonti Istituzionali Autorizzate (sources.yml)
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Nessun endpoint inventato o non documentato: l'osservatorio raccoglie e indicizza esclusivamente comunicati ufficiali, feed e pagine pubbliche nel rispetto di robots.txt, con rate limit di 1 richiesta al secondo e timeout di 10 secondi.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {sources.map(s => (
            <div key={s.domain} style={{ background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong style={{ fontSize: '13px' }}>{s.name}</strong>
                <span className="badge">{s.tier}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{s.domain}</span>
                <span>{s.type}</span>
              </div>
            </div>
          ))}
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
          <li><strong>Integrità del volume:</strong> verifica di almeno 100 record consolidati per prevenire cancellazioni accidentali.</li>
          <li><strong>Unicità e deduplicazione:</strong> nessun identificativo collisione hash o bando duplicato.</li>
          <li><strong>Integrità URL e domini:</strong> verifica formale del protocollo HTTP/HTTPS per il 100% delle schede.</li>
          <li><strong>Freshness policy:</strong> blocco invii se i metadati o le verifiche superano la finestra temporale di freschezza.</li>
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
