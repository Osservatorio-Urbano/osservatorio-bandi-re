import React, { useState } from 'react';
import { Sparkles, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import type { CanonicalBando } from '../types/schema.ts';
import projectsData from '../../projects.json';

interface ProjectMatchingViewProps {
  bandi: CanonicalBando[];
  onOpenDetails: (bando: CanonicalBando) => void;
}

export const ProjectMatchingView: React.FC<ProjectMatchingViewProps> = ({ bandi, onOpenDetails }) => {
  const [expandedProj, setExpandedProj] = useState<string | null>(projectsData.projects[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedProj(prev => prev === id ? null : id);
  };

  // Funzione di matching euristico tra progetto e bando
  const findMatches = (proj: typeof projectsData.projects[0]) => {
    return bandi.filter(b => {
      // Escludi bandi chiusi per le raccomandazioni
      if (b.state === 'closed') return false;

      // 1. Corrispondenza su linee strategiche
      const lineMatch = b.strategicLines.some(l => proj.strategicLines.includes(l));

      // 2. Corrispondenza semantica o testuale su keyword
      const textToSearch = `${b.original.titolo} ${b.original.descrizione} ${b.original.programma} ${(b.thematicTags || []).join(' ')}`.toLowerCase();
      const keywordMatch = proj.keywords.some(kw => textToSearch.includes(kw.toLowerCase()));

      return lineMatch && (keywordMatch || b.strategicLines.length > 0);
    }).sort((a, b) => b.score0to100 - a.score0to100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Matching Progetti Strategici — Comune di Reggio Emilia</h2>
          <span className="badge" style={{ backgroundColor: 'var(--warn-soft)', color: 'var(--warn)', fontWeight: 700 }}>
            MODALITÀ ESEMPIO
          </span>
        </div>
        <p className="section-desc" style={{ marginTop: '8px' }}>
          Incrocio automatico tra il portafoglio progetti dell'Amministrazione e i bandi attivi. I progetti sono impostati in modalità <em>example</em> in conformità al capitolato, in attesa di validazione formale dei quadri economici da parte dei singoli Settori.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {projectsData.projects.map(proj => {
          const isExpanded = expandedProj === proj.id;
          const matches = findMatches(proj);
          const openMatches = matches.filter(m => m.state === 'open' || m.state === 'rolling_verified');

          return (
            <article
              key={proj.id}
              style={{
                background: 'var(--surface)',
                border: isExpanded ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '20px',
                boxShadow: isExpanded ? 'var(--shadow-lg)' : 'var(--shadow)',
                transition: 'all .2s ease',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', gap: '16px', flexWrap: 'wrap' }}
                onClick={() => toggleExpand(proj.id)}
              >
                <div style={{ flex: '1 1 450px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="badge badge-line">{proj.sector}</span>
                    <span className="badge" style={{ backgroundColor: 'var(--surface-2)' }}>
                      Linee: {proj.strategicLines.join(', ')}
                    </span>
                    <span className="badge" style={{ backgroundColor: 'var(--ok-soft)', color: 'var(--ok)' }}>
                      {openMatches.length} bandi attivi compatibili
                    </span>
                  </div>

                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={18} color="var(--accent)" />
                    {proj.name}
                  </h3>

                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                    Referente interno: <strong>{proj.leadDepartment}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
                      Fabbisogno Stimato
                    </span>
                    <strong style={{ fontSize: '13px', color: 'var(--accent)' }}>
                      {proj.estimatedBudget}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-icon"
                    aria-label={isExpanded ? 'Riduci scheda progetto' : 'Espandi scheda progetto'}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: 'var(--radius)', fontSize: '13px', lineHeight: 1.6 }}>
                    <p style={{ margin: '0 0 6px 0' }}><strong>Sintesi del progetto:</strong> {proj.summary}</p>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}><strong>Linee guida di finanziamento:</strong> {proj.fundingNeeds}</p>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} color="var(--accent)" /> Opportunità di finanziamento prioritario ({openMatches.length})
                    </h4>

                    {openMatches.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {openMatches.slice(0, 5).map(m => (
                          <div
                            key={m.id}
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '12px 16px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ flex: '1 1 350px' }}>
                              <a
                                href={m.sourceCanonicalUrl}
                                target="_blank"
                                rel="noopener"
                                style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '2px' }}
                              >
                                {m.original.titolo}
                              </a>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {m.original.ente} · Scadenza: {m.deadlineType === 'sportello' ? 'A sportello' : m.deadline}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="badge badge-score">Score: {m.score0to100}</span>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                onClick={() => onOpenDetails(m)}
                              >
                                Analisi
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                        Nessun bando aperto corrisponde attualmente a questo profilo di ricerca.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
