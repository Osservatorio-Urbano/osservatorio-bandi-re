import React from 'react';
import { LayoutDashboard, ListFilter, Calendar, FolderGit2, Mail, BookOpen, Activity } from 'lucide-react';

export type NavTabId = 'dashboard' | 'bandi' | 'scadenziario' | 'progetti' | 'newsletter' | 'metodologia' | 'stato-fonti';

interface NavigationProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  counts: {
    total: number;
    open: number;
    urgent: number;
    rolling: number;
  };
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab, counts }) => {
  const tabs = [
    { id: 'dashboard' as NavTabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bandi' as NavTabId, label: `Tutti i bandi (${counts.total})`, icon: ListFilter },
    { id: 'scadenziario' as NavTabId, label: 'Scadenziario', icon: Calendar },
    { id: 'progetti' as NavTabId, label: 'Matching Progetti RE', icon: FolderGit2 },
    { id: 'newsletter' as NavTabId, label: 'Edizioni Newsletter', icon: Mail },
    { id: 'stato-fonti' as NavTabId, label: 'Stato Fonti & Pipeline', icon: Activity },
    { id: 'metodologia' as NavTabId, label: 'Fonti & Metodologia', icon: BookOpen },
  ];

  return (
    <nav className="nav-bar" aria-label="Navigazione principale">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`nav-tab ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
            aria-selected={isActive}
            role="tab"
          >
            <Icon size={16} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
