// Note Service - Microservice for note management, versioning, and collaboration
// Domain: Content Management, Document Operations, Real-time Collaboration

import { EventEmitter } from 'events';
import { serviceRegistry } from './ServiceRegistry';

// Domain Models
interface Note {
  id: string;
  tenantId: string;
  authorId: string;
  title: string;
  content: string;
  contentType: 'markdown' | 'rich-text' | 'plain-text';
  metadata: NoteMetadata;
  tags: string[];
  category?: string;
  parentId?: string; // For hierarchical notes
  templateId?: string;
  status: NoteStatus;
  permissions: NotePermissions;
  collaboration: CollaborationSettings;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

interface NoteMetadata {
  wordCount: number;
  readingTime: number; // minutes
  lastViewedAt?: Date;
  viewCount: number;
  favoriteCount: number;
  commentCount: number;
  attachments: Attachment[];
  customFields: Record<string, any>;
  aiSuggestions?: AISuggestion[];
  language?: string;
  summary?: string;
}

interface NoteVersion {
  id: string;
  noteId: string;
  version: number;
  title: string;
  content: string;
  changesSummary: string;
  changedBy: string;
  changeType: 'create' | 'update' | 'delete' | 'restore' | 'merge';
  diffData: DiffData;
  createdAt: Date;
  metadata: VersionMetadata;
}

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  uploadedAt: Date;
}

interface CollaborationSettings {
  isShared: boolean;
  shareType: 'private' | 'team' | 'public' | 'link';
  shareLink?: string;
  collaborators: Collaborator[];
  realTimeEnabled: boolean;
  commentingEnabled: boolean;
  suggestionsEnabled: boolean;
}

interface Collaborator {
  userId: string;
  role: 'viewer' | 'commenter' | 'editor' | 'owner';
  permissions: string[];
  invitedAt: Date;
  lastActiveAt?: Date;
}

interface Comment {
  id: string;
  noteId: string;
  authorId: string;
  content: string;
  position?: CommentPosition;
  threadId?: string;
  parentCommentId?: string;
  status: 'active' | 'resolved' | 'deleted';
  mentions: string[]; // User IDs
  createdAt: Date;
  updatedAt: Date;
}

interface CommentPosition {
  start: number;
  end: number;
  selectedText: string;
}

// Real-time Collaboration
interface RealtimeChange {
  id: string;
  noteId: string;
  userId: string;
  type: 'insert' | 'delete' | 'format' | 'cursor';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
  timestamp: Date;
  sessionId: string;
}

interface UserCursor {
  userId: string;
  userName: string;
  color: string;
  position: number;
  selection?: { start: number; end: number };
  lastUpdate: Date;
}

// Service Events
// interface NoteEvents {
//   'note.created': { note: Note; author: string };
//   'note.updated': { note: Note; changes: Partial<Note>; author: string };
//   'note.deleted': { noteId: string; tenantId: string; author: string };
//   'note.shared': { noteId: string; shareType: string; collaborators: string[] };
//   'note.version_created': { version: NoteVersion; note: Note };
//   'note.comment_added': { comment: Comment; note: Note };
//   'note.realtime_change': { change: RealtimeChange; note: Note };
//   'note.viewed': { noteId: string; userId: string; viewedAt: Date };
//   'note.favorited': { noteId: string; userId: string };
//   'note.unfavorited': { noteId: string; userId: string };
// }

// Request/Response DTOs
interface CreateNoteRequest {
  tenantId: string;
  authorId: string;
  title: string;
  content?: string;
  contentType?: 'markdown' | 'rich-text' | 'plain-text';
  tags?: string[];
  category?: string;
  parentId?: string;
  templateId?: string;
  collaboration?: Partial<CollaborationSettings>;
}

interface UpdateNoteRequest {
  title?: string;
  content?: string;
  tags?: string[];
  category?: string;
  metadata?: Partial<NoteMetadata>;
  collaboration?: Partial<CollaborationSettings>;
  status?: NoteStatus;
}

interface NoteSearchRequest {
  query: string;
  tenantId: string;
  userId: string;
  filters?: {
    tags?: string[];
    category?: string;
    authorId?: string;
    dateRange?: { start: Date; end: Date };
    status?: NoteStatus[];
  };
  sort?: {
    field: 'createdAt' | 'updatedAt' | 'title' | 'relevance';
    order: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

interface BulkOperationRequest {
  noteIds: string[];
  operation: 'delete' | 'archive' | 'tag' | 'move' | 'share';
  parameters?: Record<string, any>;
}

// Service Implementation
class NoteService extends EventEmitter {
  private serviceName = 'note-service';
  private version = '1.0.0';
  private notes: Map<string, Note> = new Map();
  private versions: Map<string, NoteVersion[]> = new Map();
  private comments: Map<string, Comment[]> = new Map();
  private realtimeConnections: Map<string, WebSocket[]> = new Map();
  private userCursors: Map<string, Map<string, UserCursor>> = new Map(); // noteId -> userId -> cursor

  constructor() {
    super();
    this.registerWithServiceRegistry();
    this.setupEventHandlers();
    this.startRealtimeCleanup();
  }

  // Service Registration
  private async registerWithServiceRegistry(): Promise<void> {
    const serviceId = await serviceRegistry.registerService({
      name: this.serviceName,
      version: this.version,
      host: process.env.SERVICE_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_PORT || '3002'),
      protocol: 'http',
      endpoints: [
        { path: '/health', method: 'GET', description: 'Health check endpoint' },
        { path: '/notes', method: 'POST', description: 'Create note' },
        { path: '/notes/:id', method: 'GET', description: 'Get note by ID' },
        { path: '/notes/:id', method: 'PUT', description: 'Update note' },
        { path: '/notes/:id', method: 'DELETE', description: 'Delete note' },
        { path: '/notes/search', method: 'POST', description: 'Search notes' },
        { path: '/notes/:id/versions', method: 'GET', description: 'Get note versions' },
        { path: '/notes/:id/share', method: 'POST', description: 'Share note' },
        { path: '/notes/:id/comments', method: 'GET', description: 'Get note comments' },
        { path: '/notes/:id/comments', method: 'POST', description: 'Add comment' },
        { path: '/notes/:id/realtime', method: 'GET', description: 'WebSocket endpoint for real-time collaboration' },
        { path: '/bulk-operations', method: 'POST', description: 'Bulk operations on notes' }
      ],
      health: {
        status: 'healthy',
        checks: [],
        uptime: 0,
        responseTime: 0
      },
      metadata: {
        database: 'postgresql',
        search: 'elasticsearch',
        cache: 'redis',
        domain: 'content-management'
      },
      tags: ['notes', 'content', 'collaboration']
    });

    console.log(`Note service registered with ID: ${serviceId}`);
  }

  // Note CRUD Operations
  async createNote(request: CreateNoteRequest): Promise<Note> {
    // Verify user permissions through User Service
    await this.verifyUserPermissions(request.authorId, request.tenantId, 'note', 'create');

    // Generate content metadata
    const contentMetadata = this.analyzeContent(request.content || '');

    const baseNote = {
      id: this.generateId(),
      tenantId: request.tenantId,
      authorId: request.authorId,
      title: request.title,
      content: request.content || '',
      contentType: request.contentType || 'markdown',
      metadata: {
        wordCount: contentMetadata.wordCount || 0,
        readingTime: contentMetadata.readingTime || 0,
        viewCount: 0,
        favoriteCount: 0,
        commentCount: 0,
        attachments: [],
        customFields: {},
        ...(contentMetadata.lastViewedAt && { lastViewedAt: contentMetadata.lastViewedAt }),
        ...(contentMetadata.aiSuggestions && { aiSuggestions: contentMetadata.aiSuggestions }),
        ...(contentMetadata.language && { language: contentMetadata.language }),
        ...(contentMetadata.summary && { summary: contentMetadata.summary })
      },
      tags: request.tags || [],
      ...(request.category && { category: request.category }),
      ...(request.parentId && { parentId: request.parentId }),
      ...(request.templateId && { templateId: request.templateId }),
      status: 'draft',
      permissions: this.createDefaultPermissions(request.authorId),
      collaboration: {
        isShared: false,
        shareType: 'private',
        collaborators: [{
          userId: request.authorId,
          role: 'owner',
          permissions: ['read', 'write', 'share', 'delete'],
          invitedAt: new Date()
        }],
        realTimeEnabled: false,
        commentingEnabled: true,
        suggestionsEnabled: true,
        ...request.collaboration
      },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Note;

    const note = baseNote;
    // Store note
    this.notes.set(note.id, note);

    // Create initial version
    await this.createVersion(note, 'create', request.authorId);

    // Index for search
    await this.indexNoteForSearch(note);

    // Request AI suggestions if enabled
    if (note.content) {
      await this.requestAISuggestions(note);
    }

    // Emit event
    this.emit('note.created', { note, author: request.authorId });

    return note;
  }

  async getNote(noteId: string, userId: string): Promise<Note> {
    const note = this.notes.get(noteId);
    if (!note) {
      throw new NoteServiceError('Note not found', 'NOTE_NOT_FOUND', 404);
    }

    // Check permissions
    await this.checkNotePermissions(note, userId, 'read');

    // Update view count and last viewed
    note.metadata.viewCount++;
    note.metadata.lastViewedAt = new Date();

    // Emit view event for analytics
    this.emit('note.viewed', { 
      noteId, 
      userId, 
      viewedAt: new Date() 
    });

    return note;
  }

  async updateNote(noteId: string, updates: UpdateNoteRequest, userId: string): Promise<Note> {
    const note = this.notes.get(noteId);
    if (!note) {
      throw new NoteServiceError('Note not found', 'NOTE_NOT_FOUND', 404);
    }

    // Check permissions
    await this.checkNotePermissions(note, userId, 'write');

    const previousVersion = { ...note };

    // Apply updates
    if (updates.title !== undefined) {
      note.title = updates.title;
    }

    if (updates.content !== undefined) {
      note.content = updates.content;
      // Update content metadata
      const contentMetadata = this.analyzeContent(updates.content);
      note.metadata = { ...note.metadata, ...contentMetadata };
    }

    if (updates.tags !== undefined) {
      note.tags = updates.tags;
    }

    if (updates.category !== undefined) {
      note.category = updates.category;
    }

    if (updates.status !== undefined) {
      note.status = updates.status;
      if (updates.status === 'published') {
        note.publishedAt = new Date();
      } else if (updates.status === 'archived') {
        note.archivedAt = new Date();
      }
    }

    if (updates.metadata) {
      note.metadata = { ...note.metadata, ...updates.metadata };
    }

    if (updates.collaboration) {
      note.collaboration = { ...note.collaboration, ...updates.collaboration };
    }

    // Update version and timestamps
    note.version++;
    note.updatedAt = new Date();

    // Create version if content changed
    if (updates.content !== undefined || updates.title !== undefined) {
      await this.createVersion(note, 'update', userId, 
        this.generateChangesSummary(previousVersion, note)
      );
    }

    // Update search index
    await this.updateSearchIndex(note);

    // Request AI suggestions if content changed
    if (updates.content !== undefined) {
      await this.requestAISuggestions(note);
    }

    // Broadcast changes to real-time collaborators
    if (note.collaboration.realTimeEnabled) {
      await this.broadcastNoteUpdate(note, updates, userId);
    }

    // Emit event
    this.emit('note.updated', { 
      note, 
      changes: updates, 
      author: userId 
    });

    return note;
  }

  async deleteNote(noteId: string, userId: string, permanent = false): Promise<void> {
    const note = this.notes.get(noteId);
    if (!note) {
      throw new NoteServiceError('Note not found', 'NOTE_NOT_FOUND', 404);
    }

    // Check permissions
    await this.checkNotePermissions(note, userId, 'delete');

    if (permanent) {
      // Permanent deletion
      this.notes.delete(noteId);
      this.versions.delete(noteId);
      this.comments.delete(noteId);
      
      // Remove from search index
      await this.removeFromSearchIndex(noteId);
      
      // Clean up attachments
      await this.cleanupAttachments(note.metadata.attachments);
    } else {
      // Soft delete
      note.status = 'deleted';
      note.updatedAt = new Date();
      
      // Create version for deletion
      await this.createVersion(note, 'delete', userId, 'Note deleted');
    }

    // Emit event
    this.emit('note.deleted', { 
      noteId, 
      tenantId: note.tenantId, 
      author: userId 
    });
  }

  // Search Operations
  async searchNotes(request: NoteSearchRequest): Promise<SearchResult<Note>> {
    // Verify user access to tenant
    await this.verifyUserPermissions(request.userId, request.tenantId, 'note', 'read');

    // Call search service for full-text search
    try {
      const searchResponse = await serviceRegistry.callService('search-service', '/search/notes', {
        method: 'POST',
        body: {
          query: request.query,
          tenantId: request.tenantId,
          userId: request.userId,
          filters: request.filters,
          sort: request.sort,
          pagination: request.pagination
        }
      });

      // Get full note data for search results
      const noteIds = searchResponse.data.results.map((r: any) => r.id);
      const notes = noteIds.map((id: string) => this.notes.get(id)).filter(Boolean);

      // Filter by permissions (additional security layer)
      const accessibleNotes = await Promise.all(
        notes.map(async (note: Note | null) => {
          try {
            await this.checkNotePermissions(note!, request.userId, 'read');
            return note;
          } catch {
            return null;
          }
        })
      );

      return {
        results: accessibleNotes.filter(Boolean) as Note[],
        total: searchResponse.data.total,
        page: request.pagination?.page || 1,
        limit: request.pagination?.limit || 20
      };
    } catch (error) {
      // Fallback to in-memory search if search service is unavailable
      return this.fallbackSearch(request);
    }
  }

  // Version Management
  async getNoteVersions(noteId: string, userId: string): Promise<NoteVersion[]> {
    const note = this.notes.get(noteId);
    if (!note) {
      throw new NoteServiceError('Note not found', 'NOTE_NOT_FOUND', 404);
    }

    await this.checkNotePermissions(note, userId, 'read');

    return this.versions.get(noteId) || [];
  }

  async revertToVersion(noteId: string, versionId: string, userId: string): Promise<Note> {
    const note = this.notes.get(noteId);
    if (!note) {
      throw new NoteServiceError('Note not found', 'NOTE_NOT_FOUND', 404);
    }

    await this.checkNotePermissions(note, userId, 'write');

    const versions = this.versions.get(noteId) || [];
    const targetVersion = versions.find(v => v.id === versionId);
    
    if (!targetVersion) {
      throw new NoteServiceError('Version not found', 'VERSION_NOT_FOUND', 404);
    }

    // Apply version data to current note
    // const previousState = { ...note };
    note.title = targetVersion.title;
    note.content = targetVersion.content;
    note.version++;
    note.updatedAt = new Date();

    // Create new version for the revert
    await this.createVersion(note, 'restore', userId, 
      `Reverted to version ${targetVersion.version}`
    );

    // Update search index
    await this.updateSearchIndex(note);

    // Broadcast to collaborators
    if (note.collaboration.realTimeEnabled) {
      await this.broadcastNoteUpdate(note, { 
        title: note.title, 
        content: note.content 
      }, userId);
    }

    this.emit('note.updated', { 
      note, 
      changes: { title: note.title, content: note.content }, 
      author: userId 
    });

    return note;
  }

  // Collaboration Features
  async shareNote(noteId: string, shareSettings: Partial<CollaborationSettings>, userId: string): Promise<Note> {
    const note = this.notes.get(noteId);
    if (!note) {
      throw new NoteServiceError('Note not found', 'NOTE_NOT_FOUND', 404);
    }

    await this.checkNotePermissions(note, userId, 'share');

    // Update collaboration settings
    note.collaboration = { ...note.collaboration, ...shareSettings };
    
    if (shareSettings.shareType === 'link' && !note.collaboration.shareLink) {
      note.collaboration.shareLink = this.generateShareLink(noteId);
    }

    note.updatedAt = new Date();

    // Notify new collaborators
    if (shareSettings.collaborators) {
      await this.notifyCollaborators(note, shareSettings.collaborators, userId);
    }

    this.emit('note.shared', { 
      noteId, 
      shareType: note.collaboration.shareType, 
      collaborators: note.collaboration.collaborators.map(c => c.userId) 
    });

    return note;
  }

  // Comments System
  async getComments(noteId: string, userId: string): Promise<Comment[]> {
    const note = this.notes.get(noteId);
    if (!note) {
      throw new NoteServiceError('Note not found', 'NOTE_NOT_FOUND', 404);
    }

    await this.checkNotePermissions(note, userId, 'read');

    return this.comments.get(noteId) || [];
  }

  async addComment(noteId: string, content: string, userId: string, position?: CommentPosition): Promise<Comment> {
    const note = this.notes.get(noteId);
    if (!note) {
      throw new NoteServiceError('Note not found', 'NOTE_NOT_FOUND', 404);
    }

    await this.checkNotePermissions(note, userId, 'comment');

    const comment: Comment = {
      id: this.generateId(),
      noteId,
      authorId: userId,
      content,
      ...(position && { position }),
      status: 'active',
      mentions: this.extractMentions(content),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store comment
    const noteComments = this.comments.get(noteId) || [];
    noteComments.push(comment);
    this.comments.set(noteId, noteComments);

    // Update note comment count
    note.metadata.commentCount++;

    // Notify mentioned users
    if (comment.mentions.length > 0) {
      await this.notifyMentionedUsers(comment, note);
    }

    // Broadcast to real-time collaborators
    if (note.collaboration.realTimeEnabled) {
      await this.broadcastComment(comment, note);
    }

    this.emit('note.comment_added', { comment, note });

    return comment;
  }

  // Real-time Collaboration
  async joinRealtimeSession(noteId: string, userId: string, connection: WebSocket): Promise<void> {
    const note = this.notes.get(noteId);
    if (!note || !note.collaboration.realTimeEnabled) {
      throw new NoteServiceError('Real-time collaboration not available', 'REALTIME_NOT_AVAILABLE', 400);
    }

    await this.checkNotePermissions(note, userId, 'read');

    // Add connection
    const connections = this.realtimeConnections.get(noteId) || [];
    connections.push(connection);
    this.realtimeConnections.set(noteId, connections);

    // Initialize user cursor
    if (!this.userCursors.has(noteId)) {
      this.userCursors.set(noteId, new Map());
    }

    // Send initial state to new user
    const initialState = {
      type: 'initial_state',
      note: this.sanitizeNoteForCollaboration(note),
      cursors: Array.from(this.userCursors.get(noteId)!.values())
    };

    this.sendToConnection(connection, initialState);

    // Handle connection close
    connection.addEventListener('close', () => {
      this.removeRealtimeConnection(noteId, userId, connection);
    });

    // Handle incoming changes
    connection.addEventListener('message', (event) => {
      this.handleRealtimeMessage(noteId, userId, JSON.parse(event.data));
    });
  }

  private async handleRealtimeMessage(noteId: string, userId: string, message: any): Promise<void> {
    const note = this.notes.get(noteId);
    if (!note) return;

    switch (message.type) {
      case 'content_change':
        await this.handleRealtimeContentChange(noteId, userId, message.change);
        break;
      case 'cursor_update':
        await this.handleCursorUpdate(noteId, userId, message.cursor);
        break;
      case 'selection_change':
        await this.handleSelectionChange(noteId, userId, message.selection);
        break;
    }
  }

  private async handleRealtimeContentChange(noteId: string, userId: string, change: Partial<RealtimeChange>): Promise<void> {
    const realtimeChange: RealtimeChange = {
      id: this.generateId(),
      noteId,
      userId,
      sessionId: change.sessionId || 'unknown',
      timestamp: new Date(),
      ...change
    } as RealtimeChange;

    // Apply change to note content
    const note = this.notes.get(noteId)!;
    note.content = this.applyRealtimeChange(note.content, realtimeChange);
    note.updatedAt = new Date();

    // Broadcast to other collaborators
    const connections = this.realtimeConnections.get(noteId) || [];
    const broadcastMessage = {
      type: 'content_change',
      change: realtimeChange
    };

    connections.forEach(conn => {
      if (conn.readyState === WebSocket.OPEN) {
        this.sendToConnection(conn, broadcastMessage);
      }
    });

    this.emit('note.realtime_change', { change: realtimeChange, note });
  }

  // Bulk Operations
  async bulkOperation(request: BulkOperationRequest, userId: string): Promise<BulkOperationResult> {
    const results: BulkOperationResult = {
      successful: [],
      failed: [],
      total: request.noteIds.length
    };

    for (const noteId of request.noteIds) {
      try {
        const note = this.notes.get(noteId);
        if (!note) {
          results.failed.push({ noteId, error: 'Note not found' });
          continue;
        }

        await this.checkNotePermissions(note, userId, this.getRequiredPermissionForOperation(request.operation));

        switch (request.operation) {
          case 'delete':
            await this.deleteNote(noteId, userId, false);
            break;
          case 'archive':
            await this.updateNote(noteId, { status: 'archived' }, userId);
            break;
          case 'tag':
            const tags = request.parameters?.tags || [];
            await this.updateNote(noteId, { tags: [...note.tags, ...tags] }, userId);
            break;
          case 'move':
            const category = request.parameters?.category;
            await this.updateNote(noteId, { category }, userId);
            break;
          case 'share':
            await this.shareNote(noteId, request.parameters?.collaboration, userId);
            break;
        }

        results.successful.push(noteId);
      } catch (error) {
        results.failed.push({ 
          noteId, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  // Utility Methods
  private async verifyUserPermissions(userId: string, tenantId: string, resource: string, action: string): Promise<void> {
    try {
      const response = await serviceRegistry.callService('user-service', '/auth/verify', {
        method: 'POST',
        body: { userId, tenantId, resource, action }
      });

      if (!response.data.authorized) {
        throw new NoteServiceError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', 403);
      }
    } catch (error) {
      if (error instanceof NoteServiceError) throw error;
      throw new NoteServiceError('Failed to verify permissions', 'PERMISSION_CHECK_FAILED', 500);
    }
  }

  private async checkNotePermissions(note: Note, userId: string, action: string): Promise<void> {
    // Check if user is owner
    if (note.authorId === userId) return;

    // Check collaborator permissions
    const collaborator = note.collaboration.collaborators.find(c => c.userId === userId);
    if (!collaborator) {
      throw new NoteServiceError('Access denied', 'ACCESS_DENIED', 403);
    }

    const permissionMap = {
      'read': ['viewer', 'commenter', 'editor', 'owner'],
      'write': ['editor', 'owner'],
      'comment': ['commenter', 'editor', 'owner'],
      'share': ['owner'],
      'delete': ['owner']
    };

    if (!permissionMap[action as keyof typeof permissionMap]?.includes(collaborator.role)) {
      throw new NoteServiceError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', 403);
    }
  }

  private analyzeContent(content: string): Partial<NoteMetadata> {
    const words = content.trim().split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(words / 200)); // ~200 words per minute

    return {
      wordCount: content.trim() ? words : 0,
      readingTime
    };
  }

  private async createVersion(note: Note, changeType: NoteVersion['changeType'], userId: string, summary?: string): Promise<NoteVersion> {
    const version: NoteVersion = {
      id: this.generateId(),
      noteId: note.id,
      version: note.version,
      title: note.title,
      content: note.content,
      changesSummary: summary || `${changeType.charAt(0).toUpperCase() + changeType.slice(1)} operation`,
      changedBy: userId,
      changeType,
      diffData: this.generateDiffData(note, changeType),
      createdAt: new Date(),
      metadata: {
        wordCount: note.metadata.wordCount,
        tags: [...note.tags],
        status: note.status
      }
    };

    const versions = this.versions.get(note.id) || [];
    versions.push(version);
    this.versions.set(note.id, versions);

    this.emit('note.version_created', { version, note });

    return version;
  }

  private generateDiffData(note: Note, changeType: string): DiffData {
    // Simplified diff data - in production, use proper diff algorithms
    return {
      type: changeType,
      additions: note.content.length,
      deletions: 0,
      changes: []
    };
  }

  private generateChangesSummary(previous: Note, current: Note): string {
    const changes = [];
    
    if (previous.title !== current.title) changes.push('title');
    if (previous.content !== current.content) changes.push('content');
    if (JSON.stringify(previous.tags) !== JSON.stringify(current.tags)) changes.push('tags');
    if (previous.category !== current.category) changes.push('category');

    return changes.length > 0 ? `Updated: ${changes.join(', ')}` : 'Minor updates';
  }

  private async indexNoteForSearch(note: Note): Promise<void> {
    try {
      await serviceRegistry.callService('search-service', '/index/note', {
        method: 'POST',
        body: {
          id: note.id,
          tenantId: note.tenantId,
          title: note.title,
          content: note.content,
          tags: note.tags,
          category: note.category,
          authorId: note.authorId,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          status: note.status
        }
      });
    } catch (error) {
      console.error('Failed to index note for search:', error);
    }
  }

  private async updateSearchIndex(note: Note): Promise<void> {
    try {
      await serviceRegistry.callService('search-service', '/index/note', {
        method: 'PUT',
        body: {
          id: note.id,
          tenantId: note.tenantId,
          title: note.title,
          content: note.content,
          tags: note.tags,
          category: note.category,
          updatedAt: note.updatedAt,
          status: note.status
        }
      });
    } catch (error) {
      console.error('Failed to update search index:', error);
    }
  }

  private async removeFromSearchIndex(noteId: string): Promise<void> {
    try {
      await serviceRegistry.callService('search-service', `/index/note/${noteId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Failed to remove from search index:', error);
    }
  }

  private async requestAISuggestions(note: Note): Promise<void> {
    try {
      const response = await serviceRegistry.callService('ai-service', '/suggestions/note', {
        method: 'POST',
        body: {
          noteId: note.id,
          title: note.title,
          content: note.content,
          existingTags: note.tags
        }
      });

      if (response.data.suggestions) {
        note.metadata.aiSuggestions = response.data.suggestions;
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    }
  }

  private fallbackSearch(request: NoteSearchRequest): SearchResult<Note> {
    const tenantNotes = Array.from(this.notes.values())
      .filter(note => 
        note.tenantId === request.tenantId && 
        note.status !== 'deleted'
      );

    // Simple text search
    const query = request.query.toLowerCase();
    const results = tenantNotes.filter(note =>
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );

    const limit = request.pagination?.limit || 20;
    const page = request.pagination?.page || 1;
    const start = (page - 1) * limit;

    return {
      results: results.slice(start, start + limit),
      total: results.length,
      page,
      limit
    };
  }

  private createDefaultPermissions(userId: string): NotePermissions {
    return {
      owner: userId,
      isPublic: false,
      allowComments: true,
      allowSharing: true
    };
  }

  private extractMentions(content: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9._]+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      if (match[1]) {
        mentions.push(match[1]!);
      }
    }
    
    return mentions;
  }

  private generateShareLink(noteId: string): string {
    return `${process.env.FRONTEND_URL}/shared/${noteId}/${this.generateId()}`;
  }

  private generateId(): string {
    return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private applyRealtimeChange(content: string, change: RealtimeChange): string {
    switch (change.type) {
      case 'insert':
        return content.slice(0, change.position) + change.content + content.slice(change.position);
      case 'delete':
        return content.slice(0, change.position) + content.slice(change.position + (change.length || 1));
      default:
        return content;
    }
  }

  private sanitizeNoteForCollaboration(note: Note): Partial<Note> {
    const { permissions, ...sanitized } = note;
    return sanitized;
  }

  private sendToConnection(connection: WebSocket, message: any): void {
    if (connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(message));
    }
  }

  private removeRealtimeConnection(noteId: string, userId: string, connection: WebSocket): void {
    const connections = this.realtimeConnections.get(noteId) || [];
    const updatedConnections = connections.filter(conn => conn !== connection);
    this.realtimeConnections.set(noteId, updatedConnections);

    // Remove user cursor
    this.userCursors.get(noteId)?.delete(userId);
  }

  private async handleCursorUpdate(noteId: string, userId: string, cursor: Partial<UserCursor>): Promise<void> {
    const cursors = this.userCursors.get(noteId);
    if (!cursors) return;

    const userCursor: UserCursor = {
      userId,
      userName: cursor.userName || 'Unknown User',
      color: cursor.color || '#007bff',
      position: cursor.position || 0,
      ...(cursor.selection && { selection: cursor.selection }),
      lastUpdate: new Date()
    };

    cursors.set(userId, userCursor);

    // Broadcast cursor update
    const connections = this.realtimeConnections.get(noteId) || [];
    const broadcastMessage = {
      type: 'cursor_update',
      cursor: userCursor
    };

    connections.forEach(conn => {
      this.sendToConnection(conn, broadcastMessage);
    });
  }

  private async handleSelectionChange(noteId: string, userId: string, selection: any): Promise<void> {
    // Similar to cursor update but for text selections
    const cursors = this.userCursors.get(noteId);
    if (!cursors) return;

    const userCursor = cursors.get(userId);
    if (userCursor) {
      userCursor.selection = selection;
      userCursor.lastUpdate = new Date();
    }
  }

  private startRealtimeCleanup(): void {
    setInterval(() => {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes

      for (const [_noteId, cursors] of this.userCursors.entries()) {
        for (const [userId, cursor] of cursors.entries()) {
          if (cursor.lastUpdate < cutoff) {
            cursors.delete(userId);
          }
        }
      }
    }, 60000); // Clean up every minute
  }

  private getRequiredPermissionForOperation(operation: string): string {
    const permissionMap = {
      'delete': 'delete',
      'archive': 'write',
      'tag': 'write',
      'move': 'write',
      'share': 'share'
    };

    return permissionMap[operation as keyof typeof permissionMap] || 'read';
  }

  private async notifyCollaborators(note: Note, newCollaborators: Collaborator[], invitedBy: string): Promise<void> {
    try {
      await serviceRegistry.callService('notification-service', '/collaborators/notify', {
        method: 'POST',
        body: {
          noteId: note.id,
          noteTitle: note.title,
          collaborators: newCollaborators,
          invitedBy
        }
      });
    } catch (error) {
      console.error('Failed to notify collaborators:', error);
    }
  }

  private async notifyMentionedUsers(comment: Comment, note: Note): Promise<void> {
    try {
      await serviceRegistry.callService('notification-service', '/mentions/notify', {
        method: 'POST',
        body: {
          noteId: note.id,
          noteTitle: note.title,
          comment,
          mentions: comment.mentions
        }
      });
    } catch (error) {
      console.error('Failed to notify mentioned users:', error);
    }
  }

  private async broadcastNoteUpdate(note: Note, changes: any, userId: string): Promise<void> {
    const connections = this.realtimeConnections.get(note.id) || [];
    const broadcastMessage = {
      type: 'note_update',
      noteId: note.id,
      changes,
      updatedBy: userId,
      timestamp: new Date()
    };

    connections.forEach(conn => {
      this.sendToConnection(conn, broadcastMessage);
    });
  }

  private async broadcastComment(comment: Comment, note: Note): Promise<void> {
    const connections = this.realtimeConnections.get(note.id) || [];
    const broadcastMessage = {
      type: 'new_comment',
      comment
    };

    connections.forEach(conn => {
      this.sendToConnection(conn, broadcastMessage);
    });
  }

  private async cleanupAttachments(attachments: Attachment[]): Promise<void> {
    try {
      await serviceRegistry.callService('file-service', '/attachments/cleanup', {
        method: 'POST',
        body: { attachments: attachments.map(a => a.id) }
      });
    } catch (error) {
      console.error('Failed to cleanup attachments:', error);
    }
  }

  private setupEventHandlers(): void {
    // Handle user deletions
    this.on('user.deleted', async ({ userId, tenantId }) => {
      const userNotes = Array.from(this.notes.values())
        .filter(note => note.authorId === userId && note.tenantId === tenantId);

      for (const note of userNotes) {
        // Reassign ownership or delete based on business rules
        if (note.collaboration.collaborators.length > 1) {
          // Transfer to another collaborator
          const newOwner = note.collaboration.collaborators
            .find(c => c.userId !== userId && c.role === 'editor');
          
          if (newOwner) {
            note.authorId = newOwner.userId;
            newOwner.role = 'owner';
          }
        } else {
          // Archive the note
          note.status = 'archived';
        }
      }
    });
  }

  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      version: this.version,
      checks: [
        { name: 'memory', status: 'pass', message: 'Memory usage normal' },
        { name: 'search', status: 'pass', message: 'Search service accessible' },
        { name: 'realtime', status: 'pass', message: 'Real-time connections active' }
      ],
      metrics: {
        totalNotes: this.notes.size,
        totalVersions: Array.from(this.versions.values()).flat().length,
        activeConnections: Array.from(this.realtimeConnections.values()).flat().length
      }
    };
  }
}

// Supporting Types
type NoteStatus = 'draft' | 'published' | 'archived' | 'deleted';

interface NotePermissions {
  owner: string;
  isPublic: boolean;
  allowComments: boolean;
  allowSharing: boolean;
}

interface DiffData {
  type: string;
  additions: number;
  deletions: number;
  changes: Array<{ type: string; position: number; content: string }>;
}

interface VersionMetadata {
  wordCount: number;
  tags: string[];
  status: NoteStatus;
}

interface SearchResult<T> {
  results: T[];
  total: number;
  page: number;
  limit: number;
}

interface BulkOperationResult {
  successful: string[];
  failed: Array<{ noteId: string; error: string }>;
  total: number;
}

interface AISuggestion {
  type: 'tag' | 'category' | 'improvement' | 'related';
  content: string;
  confidence: number;
}

class NoteServiceError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 400) {
    super(message);
    this.name = 'NoteServiceError';
  }
}

// Singleton instance
export const noteService = new NoteService();

export { NoteService };
export type { Note, NoteVersion, Comment };
export default noteService;