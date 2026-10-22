import React from 'react';
import { Info } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <aside
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: 'var(--text-xs)',
        color: 'var(--text-muted)',
      }}
      aria-label="Avviso trasparenza e verifica requisiti"
    >
      <Info size={16} color="var(--accent)" style={{ flex: 'none' }} />
      <span>
        <strong>Funding Intelligence PA:</strong> Le informazioni e gli score hanno scopo orientativo e decisionale. Verificare sempre i requisiti di ammissibilità, allegati tecnici e scadenze sul portale dell'ente erogatore prima di candidarsi.
      </span>
    </aside>
  );
};
