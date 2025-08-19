import { NotebookState } from '../types';

export interface DashboardStats {
  totalWorkspaces: number;
  totalNotebooks: number;
  totalFolders: number;
  totalNotes: number;
  totalPages: number;
  recentNotes: Array<{
    id: string;
    title: string;
    lastModified: string;
    workspaceName: string;
    notebookName: string;
  }>;
  mostUsedTags: Array<{
    tag: string;
    count: number;
  }>;
  todayActivity: {
    notesCreated: number;
    notesModified: number;
    pagesAdded: number;
  };
  weekActivity: Array<{
    date: string;
    activity: number;
  }>;
}

export const calculateDashboardStats = (state: NotebookState): DashboardStats => {
  const now = new Date();
  const today = now.toDateString();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  let totalNotebooks = 0;
  let totalFolders = 0;
  let totalNotes = 0;
  let totalPages = 0;
  const recentNotes: DashboardStats['recentNotes'] = [];
  const tagCounts: Record<string, number> = {};
  let todayNotesCreated = 0;
  let todayNotesModified = 0;
  let todayPagesAdded = 0;

  // 各ワークスペースを分析
  state.workspaces.forEach(workspace => {
    const workspaceNotebooks = state.notebooks[workspace.id] || [];
    workspaceNotebooks.forEach(notebook => {
      totalNotebooks++;
      
      // サブフォルダを処理
      const subFolders = state.subFoldersData[notebook.id] || [];
      subFolders.forEach(folder => {
        totalFolders++;
        
        // ノートを処理
        const notes = state.notesData[folder.id] || [];
        notes.forEach((note: any) => {
          totalNotes++;
          totalPages += note.pages?.length || 0;
          
          // 最近のノートを収集
          if (note.updatedAt) {
            const lastModified = new Date(note.updatedAt);
            if (lastModified >= oneWeekAgo) {
              recentNotes.push({
                id: note.id,
                title: note.title,
                lastModified: note.updatedAt,
                workspaceName: workspace.name,
                notebookName: notebook.name
              });
            }
            
            // 今日の活動をカウント
            const noteDate = lastModified.toDateString();
            if (noteDate === today) {
              if (note.createdAt && new Date(note.createdAt).toDateString() === today) {
                todayNotesCreated++;
              } else {
                todayNotesModified++;
              }
            }
          }
          
          // タグをカウント
          note.tags?.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
          
          // 今日追加されたページをカウント
          note.pages?.forEach((page: any) => {
            if (page.createdAt && new Date(page.createdAt).toDateString() === today) {
              todayPagesAdded++;
            }
          });
        });
      });
    });
  });

  // 最近のノートをソート
  recentNotes.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

  // 人気タグをソート
  const mostUsedTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 週間アクティビティを生成
  const weekActivity = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toDateString();
    
    // その日のアクティビティをカウント
    const dayActivity = recentNotes.filter(note => 
      new Date(note.lastModified).toDateString() === dateStr
    ).length;
    
    weekActivity.push({
      date: date.toISOString().split('T')[0]!,
      activity: dayActivity
    });
  }

  return {
    totalWorkspaces: state.workspaces.length,
    totalNotebooks,
    totalFolders,
    totalNotes,
    totalPages,
    recentNotes: recentNotes.slice(0, 10),
    mostUsedTags,
    todayActivity: {
      notesCreated: todayNotesCreated,
      notesModified: todayNotesModified,
      pagesAdded: todayPagesAdded
    },
    weekActivity
  };
};