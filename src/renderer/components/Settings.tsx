import React, { useState } from 'react';
import { useStore } from '../store';

interface SettingsProps {
  onStartServer: (port: number) => void;
  onStopServer: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onStartServer, onStopServer }) => {
  const { wsRunning, wsPort, localIp, connectedClient } = useStore();
  const [port, setPort] = useState(wsPort);

  return (
    <div className="settings">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>WebSocket Server</h3>
        <div className="settings-row">
          <label>Status:</label>
          <span className={wsRunning ? 'status-connected' : 'status-disconnected'}>
            {wsRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div className="settings-row">
          <label>Port:</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value) || 9898)}
            disabled={wsRunning}
            className="settings-input"
          />
        </div>
        <div className="settings-row">
          <label>Local IP:</label>
          <span>{localIp}</span>
        </div>
        <div className="settings-actions">
          {!wsRunning ? (
            <button className="btn btn-primary" onClick={() => onStartServer(port)}>
              Start Server
            </button>
          ) : (
            <button className="btn btn-danger" onClick={onStopServer}>
              Stop Server
            </button>
          )}
        </div>
      </div>

      {wsRunning && (
        <div className="settings-section">
          <h3>Pairing Info</h3>
          <div className="pairing-info">
            <p>IP Address: <strong>{localIp}</strong></p>
            <p>Port: <strong>{wsPort}</strong></p>
            <p className="hint">
              Open TV-K App → Settings → FreeBox Pairing<br />
              Enter the IP and Port above, then click Connect
            </p>
          </div>
        </div>
      )}

      {connectedClient && (
        <div className="settings-section">
          <h3>Connected Client</h3>
          <div className="client-info">
            <p>Name: <strong>{connectedClient.name}</strong></p>
            <p>ID: <strong>{connectedClient.id}</strong></p>
          </div>
        </div>
      )}
    </div>
  );
};
