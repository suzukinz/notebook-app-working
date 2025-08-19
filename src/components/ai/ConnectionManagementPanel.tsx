// Connection Management Panel
// Advanced interface for managing note connections and relationships

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Network, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff,
  ArrowRight,
  ArrowLeft,
  MoreHorizontal,
  Save,
  X,
  BookOpen,
  Link,
  Star,
  Clock,
  Tag,
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react';
import { 
  intelligentConnectionService, 
  type Note, 
  type NoteConnection, 
  ConnectionType 
} from '../../services/ai/IntelligentConnectionService';
import './ConnectionManagementPanel.css';

interface ConnectionManagementPanelProps {
  selectedNote: Note;
  allNotes: Note[];
  onNoteSelect?: (noteId: string) => void;
  onConnectionUpdate?: (connections: NoteConnection[]) => void;
  onBulkOperations?: (operation: string, connections: NoteConnection[]) => void;
}

interface ManagedConnection extends NoteConnection {
  id: string;
  isManual: boolean;
  isVisible: boolean;
  lastModified: Date;
  tags: string[];
  notes?: string;
}

interface ConnectionFilter {
  types: ConnectionType[];
  strengthRange: [number, number];
  showManual: boolean;
  showAuto: boolean;
  showHidden: boolean;
  dateRange: [Date?, Date?];
  searchQuery: string;
}

interface BulkOperation {
  type: 'delete' | 'hide' | 'show' | 'strengthen' | 'weaken' | 'export' | 'tag';
  label: string;
  icon: React.ReactNode;
  requiresConfirmation: boolean;
}

const ConnectionManagementPanel: React.FC<ConnectionManagementPanelProps> = ({
  selectedNote,
  allNotes,
  onNoteSelect,
  onConnectionUpdate,
  onBulkOperations
}) => {
  // State Management
  const [connections, setConnections] = useState<ManagedConnection[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<Set<string>>(new Set());
  const [editingConnection, setEditingConnection] = useState<ManagedConnection | null>(null);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [filter, setFilter] = useState<ConnectionFilter>({
    types: Object.values(ConnectionType),
    strengthRange: [0, 1],
    showManual: true,
    showAuto: true,
    showHidden: false,
    dateRange: [],
    searchQuery: ''
  });
  const [sortBy, setSortBy] = useState<'strength' | 'type' | 'date' | 'name'>('strength');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  // Bulk Operations Configuration
  const bulkOperations: BulkOperation[] = [
    { type: 'delete', label: 'Delete Selected', icon: <Trash2 className="w-4 h-4" />, requiresConfirmation: true },
    { type: 'hide', label: 'Hide Selected', icon: <EyeOff className="w-4 h-4" />, requiresConfirmation: false },
    { type: 'show', label: 'Show Selected', icon: <Eye className="w-4 h-4" />, requiresConfirmation: false },
    { type: 'strengthen', label: 'Strengthen', icon: <TrendingUp className="w-4 h-4" />, requiresConfirmation: false },
    { type: 'weaken', label: 'Weaken', icon: <ArrowLeft className="w-4 h-4" />, requiresConfirmation: false },
    { type: 'export', label: 'Export', icon: <Download className="w-4 h-4" />, requiresConfirmation: false },
    { type: 'tag', label: 'Add Tags', icon: <Tag className="w-4 h-4" />, requiresConfirmation: false }
  ];

  // Load Connections
  const loadConnections = useCallback(async () => {
    setIsLoading(true);
    try {
      const discoveredConnections = await intelligentConnectionService.discoverConnections(selectedNote, allNotes);
      
      const managedConnections: ManagedConnection[] = discoveredConnections.map((conn, index) => ({
        ...conn,
        id: `${conn.sourceId}-${conn.targetId}-${index}`,
        isManual: false,
        isVisible: true,
        lastModified: new Date(),
        tags: [],
        notes: ''
      }));

      setConnections(managedConnections);
      
      if (onConnectionUpdate) {
        onConnectionUpdate(discoveredConnections);
      }
      
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedNote, allNotes, onConnectionUpdate]);

  // Filter and Sort Connections
  const filteredAndSortedConnections = useMemo(() => {
    let filtered = connections.filter(conn => {
      // Type filter
      if (!filter.types.includes(conn.type)) return false;
      
      // Strength filter
      if (conn.strength < filter.strengthRange[0] || conn.strength > filter.strengthRange[1]) return false;
      
      // Manual/Auto filter
      if (!filter.showManual && conn.isManual) return false;
      if (!filter.showAuto && !conn.isManual) return false;
      
      // Visibility filter
      if (!filter.showHidden && !conn.isVisible) return false;
      if (!conn.isVisible && !filter.showHidden) return false;
      
      // Date filter
      if (filter.dateRange[0] && conn.lastModified < filter.dateRange[0]) return false;
      if (filter.dateRange[1] && conn.lastModified > filter.dateRange[1]) return false;
      
      // Search filter
      if (filter.searchQuery) {
        const targetNote = allNotes.find(n => n.id === conn.targetId);
        const searchLower = filter.searchQuery.toLowerCase();
        if (!targetNote?.title.toLowerCase().includes(searchLower) &&
            !conn.reasoning?.toLowerCase().includes(searchLower) &&
            !conn.keywords.some(k => k.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      
      return true;
    });

    // Sort connections
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'strength':
          aValue = a.strength;
          bValue = b.strength;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'date':
          aValue = a.lastModified.getTime();
          bValue = b.lastModified.getTime();
          break;
        case 'name':
          const noteA = allNotes.find(n => n.id === a.targetId);
          const noteB = allNotes.find(n => n.id === b.targetId);
          aValue = noteA?.title || '';
          bValue = noteB?.title || '';
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    return filtered;
  }, [connections, filter, sortBy, sortOrder, allNotes]);

  // Effects
  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Event Handlers
  const handleSelectConnection = useCallback((connectionId: string, selected: boolean) => {
    setSelectedConnections(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(connectionId);
      } else {
        newSet.delete(connectionId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllVisible = useCallback((selected: boolean) => {
    if (selected) {
      const visibleIds = filteredAndSortedConnections.map(conn => conn.id);
      setSelectedConnections(new Set(visibleIds));
    } else {
      setSelectedConnections(new Set());
    }
  }, [filteredAndSortedConnections]);

  const handleDeleteConnection = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    setSelectedConnections(prev => {
      const newSet = new Set(prev);
      newSet.delete(connectionId);
      return newSet;
    });
  }, []);

  const handleToggleVisibility = useCallback((connectionId: string) => {
    setConnections(prev => prev.map(conn => 
      conn.id === connectionId ? { ...conn, isVisible: !conn.isVisible } : conn
    ));
  }, []);

  const handleEditConnection = useCallback((connection: ManagedConnection) => {
    setEditingConnection({ ...connection });
  }, []);

  const handleSaveConnection = useCallback((updatedConnection: ManagedConnection) => {
    setConnections(prev => prev.map(conn => 
      conn.id === updatedConnection.id 
        ? { ...updatedConnection, lastModified: new Date() }
        : conn
    ));
    setEditingConnection(null);
  }, []);

  const handleAddManualConnection = useCallback((targetNoteId: string, connectionType: ConnectionType, strength: number) => {
    const newConnection: ManagedConnection = {
      id: `manual-${Date.now()}`,
      sourceId: selectedNote.id,
      targetId: targetNoteId,
      strength,
      type: connectionType,
      reasoning: 'Manually created connection',
      keywords: [],
      contexts: [],
      isManual: true,
      isVisible: true,
      lastModified: new Date(),
      tags: [],
      notes: ''
    };

    setConnections(prev => [...prev, newConnection]);
    setShowAddConnection(false);
  }, [selectedNote.id]);

  const handleBulkOperation = useCallback(async (operation: BulkOperation) => {
    const selectedIds = Array.from(selectedConnections);
    const selectedConns = connections.filter(conn => selectedIds.includes(conn.id));
    
    if (operation.requiresConfirmation) {
      if (!window.confirm(`Are you sure you want to ${operation.label.toLowerCase()}?`)) {
        return;
      }
    }

    switch (operation.type) {
      case 'delete':
        setConnections(prev => prev.filter(conn => !selectedIds.includes(conn.id)));
        break;
      case 'hide':
        setConnections(prev => prev.map(conn => 
          selectedIds.includes(conn.id) ? { ...conn, isVisible: false } : conn
        ));
        break;
      case 'show':
        setConnections(prev => prev.map(conn => 
          selectedIds.includes(conn.id) ? { ...conn, isVisible: true } : conn
        ));
        break;
      case 'strengthen':
        setConnections(prev => prev.map(conn => 
          selectedIds.includes(conn.id) 
            ? { ...conn, strength: Math.min(1, conn.strength + 0.1) }
            : conn
        ));
        break;
      case 'weaken':
        setConnections(prev => prev.map(conn => 
          selectedIds.includes(conn.id) 
            ? { ...conn, strength: Math.max(0, conn.strength - 0.1) }
            : conn
        ));
        break;
      case 'export':
        const exportData = JSON.stringify(selectedConns, null, 2);
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `connections-${selectedNote.title}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        break;
    }

    if (onBulkOperations) {
      onBulkOperations(operation.type, selectedConns);
    }

    setSelectedConnections(new Set());
    setShowBulkMenu(false);
  }, [selectedConnections, connections, onBulkOperations, selectedNote.title]);

  const getConnectionTypeColor = useCallback((type: ConnectionType): string => {
    const colors = {
      [ConnectionType.SEMANTIC]: '#3b82f6',
      [ConnectionType.THEMATIC]: '#10b981',
      [ConnectionType.CONTEXTUAL]: '#f59e0b',
      [ConnectionType.TEMPORAL]: '#8b5cf6',
      [ConnectionType.STRUCTURAL]: '#6b7280',
      [ConnectionType.COLLABORATIVE]: '#ec4899'
    };
    return colors[type] || '#6b7280';
  }, []);

  const getConnectionTypeIcon = useCallback((type: ConnectionType) => {
    switch (type) {
      case ConnectionType.SEMANTIC: return <Network className="w-3 h-3" />;
      case ConnectionType.THEMATIC: return <Tag className="w-3 h-3" />;
      case ConnectionType.CONTEXTUAL: return <Link className="w-3 h-3" />;
      case ConnectionType.TEMPORAL: return <Clock className="w-3 h-3" />;
      case ConnectionType.STRUCTURAL: return <BookOpen className="w-3 h-3" />;
      case ConnectionType.COLLABORATIVE: return <Star className="w-3 h-3" />;
      default: return <Network className="w-3 h-3" />;
    }
  }, []);

  return (
    <div className="connection-management-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-title">
          <Network className="w-5 h-5 text-blue-500" />
          <h3>Manage Connections</h3>
          <span className="connections-count">
            {filteredAndSortedConnections.length} of {connections.length}
          </span>
        </div>
        
        <div className="header-actions">
          <button
            onClick={() => setShowAddConnection(true)}
            className="action-btn action-btn--primary"
            title="Add Manual Connection"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
          
          <button
            onClick={loadConnections}
            className="action-btn"
            disabled={isLoading}
            title="Refresh Connections"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="bulk-actions">
            <button
              onClick={() => setShowBulkMenu(!showBulkMenu)}
              className={`action-btn ${selectedConnections.size > 0 ? 'action-btn--secondary' : ''}`}
              disabled={selectedConnections.size === 0}
              title="Bulk Operations"
            >
              <MoreHorizontal className="w-4 h-4" />
              {selectedConnections.size > 0 && (
                <span className="selected-count">{selectedConnections.size}</span>
              )}
            </button>
            
            {showBulkMenu && selectedConnections.size > 0 && (
              <div className="bulk-menu">
                {bulkOperations.map(operation => (
                  <button
                    key={operation.type}
                    onClick={() => handleBulkOperation(operation)}
                    className="bulk-menu-item"
                  >
                    {operation.icon}
                    <span>{operation.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="panel-controls">
        <div className="search-filter">
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) => setFilter(prev => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Search connections..."
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Type</label>
            <div className="type-filters">
              {Object.values(ConnectionType).map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(prev => ({
                    ...prev,
                    types: prev.types.includes(type)
                      ? prev.types.filter(t => t !== type)
                      : [...prev.types, type]
                  }))}
                  className={`type-filter-btn ${filter.types.includes(type) ? 'active' : ''}`}
                  style={{ 
                    borderColor: filter.types.includes(type) ? getConnectionTypeColor(type) : undefined,
                    color: filter.types.includes(type) ? getConnectionTypeColor(type) : undefined
                  }}
                >
                  {getConnectionTypeIcon(type)}
                  <span>{type}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Strength: {Math.round(filter.strengthRange[0] * 100)}% - {Math.round(filter.strengthRange[1] * 100)}%</label>
            <div className="range-slider">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filter.strengthRange[0]}
                onChange={(e) => setFilter(prev => ({
                  ...prev,
                  strengthRange: [parseFloat(e.target.value), prev.strengthRange[1]]
                }))}
                className="range-input"
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filter.strengthRange[1]}
                onChange={(e) => setFilter(prev => ({
                  ...prev,
                  strengthRange: [prev.strengthRange[0], parseFloat(e.target.value)]
                }))}
                className="range-input"
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Show</label>
            <div className="visibility-filters">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filter.showAuto}
                  onChange={(e) => setFilter(prev => ({ ...prev, showAuto: e.target.checked }))}
                />
                <span>Auto</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filter.showManual}
                  onChange={(e) => setFilter(prev => ({ ...prev, showManual: e.target.checked }))}
                />
                <span>Manual</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filter.showHidden}
                  onChange={(e) => setFilter(prev => ({ ...prev, showHidden: e.target.checked }))}
                />
                <span>Hidden</span>
              </label>
            </div>
          </div>

          <div className="sort-controls">
            <label>Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="sort-select"
            >
              <option value="strength">Strength</option>
              <option value="type">Type</option>
              <option value="date">Date</option>
              <option value="name">Name</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="sort-order-btn"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Connections List */}
      <div className="connections-list">
        {/* Select All Header */}
        {filteredAndSortedConnections.length > 0 && (
          <div className="list-header">
            <label className="select-all-checkbox">
              <input
                type="checkbox"
                checked={selectedConnections.size === filteredAndSortedConnections.length}
                onChange={(e) => handleSelectAllVisible(e.target.checked)}
              />
              <span>Select All ({filteredAndSortedConnections.length})</span>
            </label>
          </div>
        )}

        {/* Connection Items */}
        {filteredAndSortedConnections.map(connection => {
          const targetNote = allNotes.find(n => n.id === connection.targetId);
          if (!targetNote) return null;

          return (
            <div
              key={connection.id}
              className={`connection-item ${!connection.isVisible ? 'hidden' : ''} ${selectedConnections.has(connection.id) ? 'selected' : ''}`}
            >
              <div className="connection-checkbox">
                <input
                  type="checkbox"
                  checked={selectedConnections.has(connection.id)}
                  onChange={(e) => handleSelectConnection(connection.id, e.target.checked)}
                />
              </div>

              <div className="connection-content">
                <div className="connection-header">
                  <div className="connection-title">
                    <div 
                      className="connection-type-badge"
                      style={{ backgroundColor: getConnectionTypeColor(connection.type) }}
                      title={connection.type}
                    >
                      {getConnectionTypeIcon(connection.type)}
                    </div>
                    <span 
                      className="note-title"
                      onClick={() => onNoteSelect?.(connection.targetId)}
                    >
                      {targetNote.title}
                    </span>
                    {connection.isManual && (
                      <span className="manual-badge">Manual</span>
                    )}
                  </div>

                  <div className="connection-meta">
                    <div className="connection-strength">
                      <div 
                        className="strength-bar"
                        style={{ width: `${connection.strength * 100}%`, backgroundColor: getConnectionTypeColor(connection.type) }}
                      />
                      <span>{Math.round(connection.strength * 100)}%</span>
                    </div>
                  </div>
                </div>

                {connection.reasoning && (
                  <div className="connection-reasoning">
                    {connection.reasoning}
                  </div>
                )}

                {connection.keywords.length > 0 && (
                  <div className="connection-keywords">
                    {connection.keywords.slice(0, 3).map((keyword, index) => (
                      <span key={index} className="keyword-tag">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}

                <div className="connection-footer">
                  <div className="connection-date">
                    <Clock className="w-3 h-3" />
                    {connection.lastModified.toLocaleDateString()}
                  </div>
                  
                  <div className="connection-actions">
                    <button
                      onClick={() => handleToggleVisibility(connection.id)}
                      className="connection-action-btn"
                      title={connection.isVisible ? 'Hide' : 'Show'}
                    >
                      {connection.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    
                    <button
                      onClick={() => handleEditConnection(connection)}
                      className="connection-action-btn"
                      title="Edit"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteConnection(connection.id)}
                      className="connection-action-btn connection-action-btn--danger"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredAndSortedConnections.length === 0 && !isLoading && (
          <div className="empty-connections">
            <Network className="w-8 h-8 text-gray-400" />
            <p>No connections found</p>
            <button
              onClick={() => setShowAddConnection(true)}
              className="action-btn action-btn--primary"
            >
              <Plus className="w-4 h-4" />
              Add First Connection
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="loading-connections">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <p>Loading connections...</p>
          </div>
        )}
      </div>

      {/* Edit Connection Modal */}
      {editingConnection && (
        <div className="modal-overlay">
          <div className="edit-connection-modal">
            <div className="modal-header">
              <h3>Edit Connection</h3>
              <button
                onClick={() => setEditingConnection(null)}
                className="close-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Connection Type</label>
                <select
                  value={editingConnection.type}
                  onChange={(e) => setEditingConnection(prev => prev ? {
                    ...prev,
                    type: e.target.value as ConnectionType
                  } : null)}
                  className="form-select"
                >
                  {Object.values(ConnectionType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Strength: {Math.round(editingConnection.strength * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editingConnection.strength}
                  onChange={(e) => setEditingConnection(prev => prev ? {
                    ...prev,
                    strength: parseFloat(e.target.value)
                  } : null)}
                  className="form-range"
                />
              </div>

              <div className="form-group">
                <label>Reasoning</label>
                <textarea
                  value={editingConnection.reasoning || ''}
                  onChange={(e) => setEditingConnection(prev => prev ? {
                    ...prev,
                    reasoning: e.target.value
                  } : null)}
                  className="form-textarea"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={editingConnection.notes || ''}
                  onChange={(e) => setEditingConnection(prev => prev ? {
                    ...prev,
                    notes: e.target.value
                  } : null)}
                  className="form-textarea"
                  rows={2}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setEditingConnection(null)}
                className="btn btn--secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => editingConnection && handleSaveConnection(editingConnection)}
                className="btn btn--primary"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Connection Modal */}
      {showAddConnection && (
        <div className="modal-overlay">
          <div className="add-connection-modal">
            <div className="modal-header">
              <h3>Add Manual Connection</h3>
              <button
                onClick={() => setShowAddConnection(false)}
                className="close-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="modal-content">
              <p>Select a note to connect with "{selectedNote.title}"</p>
              
              <div className="available-notes">
                {allNotes
                  .filter(note => note.id !== selectedNote.id)
                  .filter(note => !connections.some(conn => conn.targetId === note.id))
                  .slice(0, 10)
                  .map(note => (
                    <button
                      key={note.id}
                      onClick={() => handleAddManualConnection(note.id, ConnectionType.SEMANTIC, 0.8)}
                      className="note-option"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{note.title}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionManagementPanel;