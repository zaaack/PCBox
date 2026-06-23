import React from 'react';
import { useStore } from '../store';
import { SourceBean } from '../types';
import { FiHome, FiSearch, FiClock, FiSettings } from 'react-icons/fi';

interface SidebarProps {
  onOpenSettings: () => void;
  showSettings: boolean;
  onNavigate: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings, showSettings, onNavigate }) => {
  const {
    viewMode,
    setViewMode,
    wsRunning,
    connectedClient,
    currentSource,
    sources,
    setCurrentSource,
    loadHomeContent,
  } = useStore();

  const handleSourceSelect = (source: SourceBean) => {
    onNavigate();
    setCurrentSource(source);
    setViewMode('home');
    setTimeout(() => {
      useStore.getState().loadHomeContent();
    }, 100);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="app-title">PcBox</h1>
      </div>

      <div className="sidebar-status">
        <div className={`status-indicator ${wsRunning ? 'connected' : 'disconnected'}`}>
          <span className="status-dot" />
          <span>{wsRunning ? 'Server Running' : 'Server Stopped'}</span>
        </div>
        {connectedClient && (
          <div className="client-status">
            <span className="client-dot" />
            <span>{connectedClient.name}</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${!showSettings && viewMode === 'home' ? 'active' : ''}`}
          onClick={() => { onNavigate(); setViewMode('home'); }}
        >
          <span className="nav-icon"><FiHome size={16} /></span>
          <span>Home</span>
        </button>

        <button
          className={`nav-item ${!showSettings && viewMode === 'search' ? 'active' : ''}`}
          onClick={() => { onNavigate(); setViewMode('search'); }}
        >
          <span className="nav-icon"><FiSearch size={16} /></span>
          <span>Search</span>
        </button>

        <button
          className={`nav-item ${!showSettings && viewMode === 'history' ? 'active' : ''}`}
          onClick={() => { onNavigate(); setViewMode('history'); }}
        >
          <span className="nav-icon"><FiClock size={16} /></span>
          <span>History</span>
        </button>

        <button
          className={`nav-item ${showSettings ? 'active' : ''}`}
          onClick={onOpenSettings}
        >
          <span className="nav-icon"><FiSettings size={16} /></span>
          <span>Settings</span>
        </button>
      </nav>

      {sources.length > 0 && (
        <div className="sidebar-sources">
          <h3>Sources</h3>
          <div className="source-list">
            {sources.map((source) => (
              <button
                key={source.key}
                className={`source-item ${currentSource?.key === source.key ? 'active' : ''}`}
                onClick={() => handleSourceSelect(source)}
              >
                {source.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
