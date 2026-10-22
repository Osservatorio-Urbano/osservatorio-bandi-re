import React from 'react';
import { Download, Moon, Sun, Printer, FileText } from 'lucide-react';
import type { CanonicalDatasetMeta } from '../types/schema.ts';

interface HeaderProps {
  meta: CanonicalDatasetMeta | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  meta,
  theme,
  onToggleTheme,
  onExportCsv,
  onExportJson,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="topbar">
      <div className="brand">
        <svg className="logo" viewBox="0 0 32 32" aria-label="Osservatorio Bandi Logo" fill="none">
          <rect x="2.5" y="2.5" width="27" height="27" rx="4" stroke="currentColor" strokeWidth="2" />
          <path d="M9 22V15M16 22V10M23 22V18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" />
        </svg>
        <div className="brand-text">
          <span className="brand-title">Osservatorio Bandi — Reggio Emilia</span>
          <span className="brand-sub">Comune di Reggio Emilia · Mandato 2024-2029 · Funding Intelligence</span>
        </div>
      </div>

      <div className="topbar-meta">
        <span className="meta-item" title="Data di aggiornamento consolidato">
          Aggiornato: <strong>{meta ? meta.aggiornato : '2026-10-22'}</strong>
        </span>
        <button
          className="btn"
          type="button"
          onClick={onExportCsv}
          title="Esporta il dataset filtrato o completo in formato CSV"
        >
          <Download size={14} />
          Esporta CSV
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={onExportJson}
          title="Esporta il dataset in formato JSON canonico"
        >
          <FileText size={14} />
          JSON
        </button>
        <button
          className="btn btn-icon"
          type="button"
          onClick={handlePrint}
          aria-label="Stampa scheda o pagina"
          title="Stampa pagina"
        >
          <Printer size={16} />
        </button>
        <button
          className="btn btn-icon"
          type="button"
          onClick={onToggleTheme}
          aria-label={`Passa a tema ${theme === 'dark' ? 'chiaro' : 'scuro'}`}
          title={`Tema: ${theme}`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
};
