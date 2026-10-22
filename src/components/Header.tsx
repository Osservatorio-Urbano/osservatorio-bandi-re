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
        <a href="#/dashboard" className="brand-logo-link" title="Torna alla Dashboard">
          <img
            src="./reggio-emilia.png"
            alt="Logo Comune di Reggio Emilia"
            className="brand-logo-img"
          />
        </a>

        <div className="brand-divider" aria-hidden="true" />

        <div className="brand-text">
          <span className="brand-title">Osservatorio Bandi</span>
          <span className="brand-sub">Comune di Reggio Emilia · Mandato 2024-2029 · Funding Intelligence</span>
        </div>
      </div>

      <div className="topbar-meta">
        <div className="live-status-pill" title="Stato del dataset consolidato">
          <span className="pulse-dot" aria-hidden="true" />
          <span>Aggiornato: <strong>{meta ? meta.aggiornato : '2026-10-22'}</strong></span>
        </div>

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
          title={`Tema attivo: ${theme}`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
};
