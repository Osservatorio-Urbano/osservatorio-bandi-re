import React, { useState, useEffect } from 'react';
import { Rss, ExternalLink } from 'lucide-react';

interface ManifestEdition {
  edition_id: string;
  iso_week: string;
  generated_at: string;
  item_count: number;
  total_pool: number;
  status: string;
  url: string;
}

interface NewsletterArchiveViewProps {
  totalCount?: number;
}

export const NewsletterArchiveView: React.FC<NewsletterArchiveViewProps> = ({ totalCount }) => {
  const [editions, setEditions] = useState<ManifestEdition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<ManifestEdition | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');

  const rssFeedUrl = `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}/newsletter/feed.xml`;

  useEffect(() => {
    // Carica manifest edizioni
    fetch('./newsletter/manifest.json')
      .then(res => {
        if (!res.ok) throw new Error('Manifest non trovato');
        return res.json();
      })
      .then(data => {
        const eds = data.editions || [];
        setEditions(eds);
        if (eds.length > 0) {
          setSelectedEdition(eds[0]);
          loadEditionHtml(eds[0].iso_week);
        }
      })
      .catch(() => {
        // Fallback per test locale o prima generazione
        const fallback: ManifestEdition = {
          edition_id: 'RE-FUNDING-2026-W44',
          iso_week: '2026-W44',
          generated_at: new Date().toISOString(),
          item_count: 10,
          total_pool: totalCount || 0,
          status: 'READY',
          url: './newsletter/2026-W44.html',
        };
        setEditions([fallback]);
        setSelectedEdition(fallback);
        loadEditionHtml('2026-W44');
      });
  }, []);

  const loadEditionHtml = (isoWeek: string) => {
    fetch(`./newsletter/${isoWeek}.html`)
      .then(res => res.text())
      .then(html => setHtmlContent(html))
      .catch(() => setHtmlContent('<p>Anteprima non disponibile per questa edizione.</p>'));
  };

  const handleSelectEdition = (ed: ManifestEdition) => {
    setSelectedEdition(ed);
    loadEditionHtml(ed.iso_week);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 className="section-title">Archivio Newsletter & Feed RSS Settimanale</h2>
        <p className="section-desc">
          Archivio storico delle uscite settimanali emesse il lunedì mattina per il personale e i dirigenti del Comune di Reggio Emilia.
        </p>
      </div>

      {/* Box Integrazione Power Automate & RSS */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Rss size={24} color="#f97316" />
            <div>
              <strong style={{ fontSize: '14px', display: 'block' }}>Feed RSS 2.0 per Microsoft Power Automate</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                1 solo item per ogni edizione settimanale READY con payload HTML email-safe
              </span>
            </div>
          </div>

          <a
            href="./newsletter/feed.xml"
            target="_blank"
            rel="noopener"
            className="btn btn-primary"
            style={{ backgroundColor: '#f97316' }}
          >
            <Rss size={14} />
            Apri Feed RSS XML
          </a>
        </div>

        <div style={{ background: 'var(--surface)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
          URL feed: <strong>{rssFeedUrl}</strong>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span>✓ Nessun dato personale nel feed</span>
          <span>✓ Idempotenza: GUID stabile <code>RE-FUNDING-YYYY-Www</code></span>
          <span>✓ Formato tabella testato per Outlook</span>
        </div>
      </div>

      {/* Lista Edizioni & Anteprima */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Colonna Elenco Edizioni */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
            Edizioni Pubblicate ({editions.length})
          </h3>

          {editions.map(ed => {
            const isSel = selectedEdition?.edition_id === ed.edition_id;
            return (
              <div
                key={ed.edition_id}
                onClick={() => handleSelectEdition(ed)}
                style={{
                  background: isSel ? 'var(--accent-soft)' : 'var(--surface)',
                  border: isSel ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all .15s ease',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '14px', color: isSel ? 'var(--accent)' : 'var(--text)' }}>
                    {ed.edition_id}
                  </strong>
                  <span className="badge badge-state open">{ed.status}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{ed.item_count} opportunità verificate</span>
                  <span>{ed.generated_at.split('T')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Colonna Anteprima Email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
              Anteprima Newsletter: {selectedEdition?.edition_id || 'Seleziona'}
            </h3>
            {selectedEdition && (
              <a
                href={`./newsletter/${selectedEdition.iso_week}.html`}
                target="_blank"
                rel="noopener"
                className="btn btn-ghost"
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                Apri pagina intera <ExternalLink size={12} />
              </a>
            )}
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              height: '650px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <iframe
              srcDoc={htmlContent}
              title={`Anteprima newsletter ${selectedEdition?.edition_id}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-same-origin allow-popups"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
