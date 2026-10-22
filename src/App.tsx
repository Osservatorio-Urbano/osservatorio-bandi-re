import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { Navigation, type NavTabId } from './components/Navigation.tsx';
import { KpiCards } from './components/KpiCards.tsx';
import { LineGrid } from './components/LineGrid.tsx';
import { FiltersBar, type FilterState } from './components/FiltersBar.tsx';
import { BandoCard } from './components/BandoCard.tsx';
import { BandoTable } from './components/BandoTable.tsx';
import { BandoDetailModal } from './components/BandoDetailModal.tsx';
import { TimelineView } from './components/TimelineView.tsx';
import { ProjectMatchingView } from './components/ProjectMatchingView.tsx';
import { NewsletterArchiveView } from './components/NewsletterArchiveView.tsx';
import { MethodologyView } from './components/MethodologyView.tsx';
import { SourcesStatusView } from './components/SourcesStatusView.tsx';
import { DisclaimerBanner } from './components/DisclaimerBanner.tsx';
import type { CanonicalBando, CanonicalDatasetMeta, StrategicLine } from './types/schema.ts';

export const App: React.FC = () => {
  const [bandi, setBandi] = useState<CanonicalBando[]>([]);
  const [meta, setMeta] = useState<CanonicalDatasetMeta | null>(null);
  const [selectedBando, setSelectedBando] = useState<CanonicalBando | null>(null);

  // Tema: 'light' | 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('re_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('re_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Navigazione & Hash Routing
  const getTabFromHash = (): NavTabId => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    if (['dashboard', 'bandi', 'scadenziario', 'progetti', 'newsletter', 'metodologia', 'stato-fonti'].includes(hash)) {
      return hash as NavTabId;
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<NavTabId>(getTabFromHash);

  useEffect(() => {
    const onHashChange = () => {
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSelectTab = (tab: NavTabId) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  };

  // Stato Filtri
  const initialFilters: FilterState = {
    q: '',
    cats: new Set<string>(),
    linee: new Set<StrategicLine>(),
    deadline: 'all',
    state: 'all',
    eligibility: 'all',
    priority: 'all',
    sort: 'score',
    viewMode: 'cards',
  };

  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Caricamento dati
  useEffect(() => {
    fetch('./data/bandi.json')
      .then(res => {
        if (!res.ok) throw new Error('Impossibile caricare data/bandi.json');
        return res.json();
      })
      .then(data => {
        setBandi(data.bandi || []);
        setMeta(data.meta || null);
      })
      .catch(err => {
        console.error('Errore nel caricamento del dataset canonico:', err);
      });
  }, []);

  // Toggle singola linea strategica (usato sia dalla LineGrid sia dai filtri)
  const handleToggleLine = useCallback((line: StrategicLine) => {
    setFilters(prev => {
      const nextLinee = new Set(prev.linee);
      if (nextLinee.has(line)) nextLinee.delete(line);
      else nextLinee.add(line);
      return { ...prev, linee: nextLinee };
    });
    // Se siamo su dashboard, passa alla vista bandi per esplorare
    if (activeTab === 'dashboard') {
      handleSelectTab('bandi');
    }
  }, [activeTab]);

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  // Calcolo scadenze e giorni rimanenti
  const refDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const getDaysLeft = useCallback((b: CanonicalBando): number | null => {
    if (b.deadlineType === 'sportello' || !b.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(b.deadline)) {
      return null;
    }
    const d = new Date(`${b.deadline}T00:00:00`);
    return Math.round((d.getTime() - refDate.getTime()) / 86400000);
  }, [refDate]);

  // Filtraggio & Ordinamento
  const filteredBandi = useMemo(() => {
    const query = filters.q.trim().toLowerCase();

    const result = bandi.filter(b => {
      // 1. Categoria
      if (filters.cats.size > 0 && !filters.cats.has(b.original.categoria)) {
        return false;
      }
      // 2. Linee DUP
      if (filters.linee.size > 0 && !b.strategicLines.some(l => filters.linee.has(l))) {
        return false;
      }
      // 3. Scadenza
      if (filters.deadline === 'sportello') {
        if (b.deadlineType !== 'sportello') return false;
      } else if (filters.deadline !== 'all') {
        const dl = getDaysLeft(b);
        if (dl === null || dl < 0 || dl > Number(filters.deadline)) return false;
      }
      // 4. Stato
      if (filters.state !== 'all') {
        if (b.state !== filters.state) return false;
      }
      // 5. Ammissibilità
      if (filters.eligibility !== 'all') {
        if (b.eligibility !== filters.eligibility) return false;
      }
      // 6. Priorità
      if (filters.priority === 'high' && b.score0to100 < 75) return false;
      if (filters.priority === 'medium' && (b.score0to100 < 50 || b.score0to100 >= 75)) return false;
      if (filters.priority === 'low' && b.score0to100 >= 50) return false;

      // 7. Ricerca testuale full-text
      if (query) {
        const haystack = [
          b.original.titolo,
          b.original.ente,
          b.original.programma,
          b.original.descrizione,
          b.original.beneficiari,
          b.original.note,
          b.sourceDomain,
          b.thematicTags.join(' '),
          b.strategicLines.join(' '),
        ].join(' ').toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    // Ordinamento
    result.sort((a, b) => {
      if (filters.sort === 'score') {
        return b.score0to100 - a.score0to100;
      }
      if (filters.sort === 'deadline') {
        const da = getDaysLeft(a);
        const db = getDaysLeft(b);
        if (da === null && db === null) return (a.original.titolo || '').localeCompare(b.original.titolo || '', 'it');
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      }
      if (filters.sort === 'deadline_desc') {
        const da = getDaysLeft(a);
        const db = getDaysLeft(b);
        if (da === null && db === null) return (a.original.titolo || '').localeCompare(b.original.titolo || '', 'it');
        if (da === null) return 1;
        if (db === null) return -1;
        return db - da;
      }
      if (filters.sort === 'ente') {
        return (a.original.ente || '').localeCompare(b.original.ente || '', 'it');
      }
      if (filters.sort === 'titolo') {
        return (a.original.titolo || '').localeCompare(b.original.titolo || '', 'it');
      }
      return 0;
    });

    return result;
  }, [bandi, filters, getDaysLeft]);

  // Esportazione CSV conforme
  const handleExportCsv = () => {
    const listToExport = filteredBandi.length > 0 ? filteredBandi : bandi;
    const headers = [
      'ID',
      'Titolo',
      'Ente',
      'Programma',
      'Categoria',
      'Linee DUP',
      'Scadenza',
      'Tipo Scadenza',
      'Stato',
      'Ammissibilita PA',
      'Score',
      'Dotazione',
      'Contributo Max',
      'Cofinanziamento',
      'Beneficiari',
      'URL Ufficiale',
      'Data Verifica',
    ];

    const rows = listToExport.map(b => [
      `"${b.id}"`,
      `"${(b.original.titolo || '').replace(/"/g, '""')}"`,
      `"${(b.original.ente || '').replace(/"/g, '""')}"`,
      `"${(b.original.programma || '').replace(/"/g, '""')}"`,
      `"${(b.original.categoria || '').replace(/"/g, '""')}"`,
      `"${b.strategicLines.join(', ')}"`,
      `"${b.deadline || ''}"`,
      `"${b.deadlineType}"`,
      `"${b.state}"`,
      `"${b.eligibility}"`,
      b.score0to100,
      `"${(b.original.dotazione || '').replace(/"/g, '""')}"`,
      `"${(b.original.contributo_max || '').replace(/"/g, '""')}"`,
      `"${(b.original.cofinanziamento || '').replace(/"/g, '""')}"`,
      `"${(b.original.beneficiari || '').replace(/"/g, '""')}"`,
      `"${b.sourceCanonicalUrl}"`,
      `"${b.sourceCheckedAt.split('T')[0]}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `osservatorio_bandi_re_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Esportazione JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ meta, bandi: filteredBandi }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `bandi_canonici_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Indicatori per la Navigation
  const navCounts = useMemo(() => {
    return {
      total: bandi.length,
      open: bandi.filter(b => b.state === 'open' || b.state === 'rolling_verified').length,
      urgent: bandi.filter(b => {
        if (b.state !== 'open' || !b.deadline) return false;
        const dl = getDaysLeft(b);
        return dl !== null && dl >= 0 && dl <= 30;
      }).length,
      rolling: bandi.filter(b => b.deadlineType === 'sportello' || b.state === 'rolling_verified').length,
    };
  }, [bandi, getDaysLeft]);

  return (
    <div className="app">
      <Header
        meta={meta}
        theme={theme}
        onToggleTheme={toggleTheme}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
      />

      <Navigation
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        counts={navCounts}
      />

      <main className="main" id="main">
        <DisclaimerBanner />

        {/* Tab 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <>
            <section className="hero-banner" aria-label="Introduzione istituzionale">
              <div className="hero-content">
                <div className="hero-badge">
                  <span className="pulse-dot" aria-hidden="true" />
                  <span>Mandato 2024-2029 · Monitoraggio Strategico DUP</span>
                </div>
                <h1 className="hero-title">Funding Intelligence &amp; Osservatorio Bandi</h1>
                <p className="hero-desc">
                  Presidio continuativo delle opportunità di finanziamento europee, nazionali e regionali per il Comune di Reggio Emilia, l&apos;Unione dei Comuni e gli enti del territorio.
                </p>
              </div>
              <div className="hero-logo-box">
                <img
                  src="./reggio-emilia.png"
                  alt="Stemma e Logo Ufficiale Comune di Reggio Emilia"
                  className="hero-logo"
                />
              </div>
            </section>

            <KpiCards bandi={bandi} />
            <LineGrid
              bandi={bandi}
              selectedLines={filters.linee}
              onToggleLine={handleToggleLine}
            />

            {/* Sezione Opportunità Prioritarie in Evidenza */}
            <section aria-label="Opportunità prioritarie">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 className="section-title" style={{ margin: 0 }}>Opportunità Prioritarie in Evidenza</h2>
                  <p className="section-desc" style={{ margin: '4px 0 0 0' }}>
                    I migliori bandi attivi selezionati con ammissibilità confermata o in partenariato.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => handleSelectTab('bandi')}
                >
                  Vedi tutti i {bandi.length} bandi →
                </button>
              </div>

              <div className="list">
                {bandi
                  .filter(b => b.state === 'open' || b.state === 'rolling_verified')
                  .sort((a, b) => b.score0to100 - a.score0to100)
                  .slice(0, 6)
                  .map(b => (
                    <BandoCard key={b.id} bando={b} onOpenDetails={setSelectedBando} />
                  ))}
              </div>
            </section>
          </>
        )}

        {/* Tab 2: TUTTI I BANDI */}
        {activeTab === 'bandi' && (
          <>
            <FiltersBar
              filters={filters}
              onUpdateFilters={setFilters}
              onResetFilters={handleResetFilters}
              filteredCount={filteredBandi.length}
              totalCount={bandi.length}
            />

            <section className="results" aria-label="Elenco dei bandi filtrati">
              {filteredBandi.length > 0 ? (
                filters.viewMode === 'cards' ? (
                  <div className="list">
                    {filteredBandi.map(b => (
                      <BandoCard key={b.id} bando={b} onOpenDetails={setSelectedBando} />
                    ))}
                  </div>
                ) : (
                  <BandoTable bandi={filteredBandi} onOpenDetails={setSelectedBando} />
                )
              ) : (
                <div className="empty">
                  <p className="empty-title">Nessun bando corrisponde ai filtri selezionati</p>
                  <p className="empty-sub">
                    Prova a modificare i termini di ricerca o clicca su "Azzera filtri" per ripristinare la visualizzazione completa.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleResetFilters}
                    style={{ marginTop: '16px' }}
                  >
                    Azzera filtri
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {/* Tab 3: SCADENZIARIO */}
        {activeTab === 'scadenziario' && (
          <TimelineView bandi={bandi} onOpenDetails={setSelectedBando} />
        )}

        {/* Tab 4: MATCHING PROGETTI */}
        {activeTab === 'progetti' && (
          <ProjectMatchingView bandi={bandi} onOpenDetails={setSelectedBando} />
        )}

        {/* Tab 5: EDIZIONI NEWSLETTER */}
        {activeTab === 'newsletter' && (
          <NewsletterArchiveView />
        )}

        {/* Tab 6: STATO FONTI & PIPELINE */}
        {activeTab === 'stato-fonti' && (
          <SourcesStatusView />
        )}

        {/* Tab 7: FONTI & METODOLOGIA */}
        {activeTab === 'metodologia' && (
          <MethodologyView />
        )}
      </main>

      <footer className="foot">
        <div className="foot-content">
          <p style={{ margin: 0 }}>
            <strong>Osservatorio Bandi — Comune di Reggio Emilia (Mandato 2024-2029)</strong>
          </p>
          <p style={{ margin: 0 }}>
            Fonte delle linee strategiche: <a href="https://risorse.comune.re.it/trasparenza/bilancio/2025/Allegato%20A_Nota%20aggiornamento%20DUP%202026_2028%20post%20emendamenti_.pdf" target="_blank" rel="noopener">Nota di aggiornamento al DUP 2026-2028 del Comune di Reggio Emilia</a>.
            Architettura: GitHub Pages + GitHub Actions + Power Automate + Office 365 Outlook (Senza SharePoint, Senza OneDrive).
          </p>
          <p style={{ margin: 0 }}>
            Ogni scheda rimanda direttamente alla pagina ufficiale dell'ente erogatore. Verificare sempre i requisiti e gli allegati tecnici sul bando originale prima di candidarsi.
          </p>
        </div>
      </footer>

      {/* Modal Dettagli Bando */}
      <BandoDetailModal
        bando={selectedBando}
        onClose={() => setSelectedBando(null)}
      />
    </div>
  );
};
