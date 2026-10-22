import React from 'react';
import { Search, LayoutGrid, Table, X } from 'lucide-react';
import type { StrategicLine } from '../types/schema.ts';

export interface FilterState {
  q: string;
  cats: Set<string>;
  linee: Set<StrategicLine>;
  deadline: string;
  state: string;
  eligibility: string;
  priority: string;
  sort: string;
  viewMode: 'cards' | 'table';
}

interface FiltersBarProps {
  filters: FilterState;
  onUpdateFilters: (updater: (prev: FilterState) => FilterState) => void;
  onResetFilters: () => void;
  filteredCount: number;
  totalCount: number;
}

const CATEGORIES = ['UE', 'Nazionale/PNRR', 'Regione ER', 'Fondazioni'];
const STRATEGIC_LINES: StrategicLine[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
  filteredCount,
  totalCount,
}) => {
  const toggleCat = (cat: string) => {
    onUpdateFilters(prev => {
      const nextCats = new Set(prev.cats);
      if (nextCats.has(cat)) nextCats.delete(cat);
      else nextCats.add(cat);
      return { ...prev, cats: nextCats };
    });
  };

  const toggleLine = (line: StrategicLine) => {
    onUpdateFilters(prev => {
      const nextLinee = new Set(prev.linee);
      if (nextLinee.has(line)) nextLinee.delete(line);
      else nextLinee.add(line);
      return { ...prev, linee: nextLinee };
    });
  };

  const hasActiveFilters =
    filters.q !== '' ||
    filters.cats.size > 0 ||
    filters.linee.size > 0 ||
    filters.deadline !== 'all' ||
    filters.state !== 'all' ||
    filters.eligibility !== 'all' ||
    filters.priority !== 'all';

  return (
    <section className="filters" aria-label="Strumenti di ricerca e filtri">
      {/* Prima riga: Ricerca testuale e selezioni principali */}
      <div className="filter-row">
        <label className="search">
          <span className="sr-only">Cerca bandi</span>
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => onUpdateFilters(prev => ({ ...prev, q: e.target.value }))}
            placeholder="Cerca per titolo, ente, parole chiave, linea DUP, beneficiari..."
            autoComplete="off"
          />
        </label>

        <label className="select">
          <span className="sr-only">Scadenza</span>
          <select
            value={filters.deadline}
            onChange={(e) => onUpdateFilters(prev => ({ ...prev, deadline: e.target.value }))}
          >
            <option value="all">Tutte le scadenze</option>
            <option value="15">Entro 15 giorni (imminenti)</option>
            <option value="30">Entro 30 giorni</option>
            <option value="60">Entro 60 giorni</option>
            <option value="90">Entro 90 giorni</option>
            <option value="sportello">Solo a sportello aperto</option>
          </select>
        </label>

        <label className="select">
          <span className="sr-only">Stato apertura</span>
          <select
            value={filters.state}
            onChange={(e) => onUpdateFilters(prev => ({ ...prev, state: e.target.value }))}
          >
            <option value="all">Tutti gli stati</option>
            <option value="open">Solo aperti</option>
            <option value="rolling_verified">Solo sportello verificato</option>
            <option value="unknown">In verifica / sconosciuto</option>
            <option value="closed">Chiusi / scaduti</option>
          </select>
        </label>

        <label className="select">
          <span className="sr-only">Ammissibilità PA</span>
          <select
            value={filters.eligibility}
            onChange={(e) => onUpdateFilters(prev => ({ ...prev, eligibility: e.target.value }))}
          >
            <option value="all">Tutte le ammissibilità</option>
            <option value="confirmed">Confermata (Comune / ATS)</option>
            <option value="potential">Potenziale (Partenariati)</option>
            <option value="excluded">Esclusa per l'Ente</option>
          </select>
        </label>

        <label className="select">
          <span className="sr-only">Ordina per</span>
          <select
            value={filters.sort}
            onChange={(e) => onUpdateFilters(prev => ({ ...prev, sort: e.target.value }))}
          >
            <option value="score">Ordina: priorità più alta (score)</option>
            <option value="deadline">Ordina: scadenza più vicina</option>
            <option value="deadline_desc">Ordina: scadenza più lontana</option>
            <option value="ente">Ordina: ente erogatore</option>
            <option value="titolo">Ordina: titolo</option>
          </select>
        </label>

        {/* Toggle vista Cards / Table */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          <button
            type="button"
            className={`btn btn-icon ${filters.viewMode === 'cards' ? 'btn-primary' : ''}`}
            onClick={() => onUpdateFilters(prev => ({ ...prev, viewMode: 'cards' }))}
            aria-label="Vista a schede"
            title="Vista a schede"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${filters.viewMode === 'table' ? 'btn-primary' : ''}`}
            onClick={() => onUpdateFilters(prev => ({ ...prev, viewMode: 'table' }))}
            aria-label="Vista tabellare"
            title="Vista tabellare"
          >
            <Table size={16} />
          </button>
        </div>
      </div>

      {/* Seconda riga: Chips per Categorie e Linee di Mandato */}
      <div className="filter-row chips-row">
        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginRight: '4px' }}>
          Fonti:
        </span>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            className={`chip ${filters.cats.has(cat) ? 'active' : ''}`}
            onClick={() => toggleCat(cat)}
            aria-pressed={filters.cats.has(cat)}
          >
            {cat}
          </button>
        ))}

        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, margin: '0 4px 0 12px' }}>
          Linee:
        </span>
        {STRATEGIC_LINES.map(line => (
          <button
            key={line}
            type="button"
            className={`chip ${filters.linee.has(line) ? 'active' : ''}`}
            onClick={() => toggleLine(line)}
            aria-pressed={filters.linee.has(line)}
          >
            {line}
          </button>
        ))}

        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onResetFilters}
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <X size={14} />
            Azzera filtri
          </button>
        )}
      </div>

      {/* Conteggio risultati live accessibile */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p className="result-count" aria-live="polite">
          <strong>{filteredCount}</strong> bandi visualizzati su {totalCount} censiti
        </p>
      </div>
    </section>
  );
};
