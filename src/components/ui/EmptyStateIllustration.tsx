import React from 'react';

interface EmptyStateIllustrationProps {
  type: 'workspace' | 'notebook' | 'subfolder' | 'notes' | 'search';
  className?: string;
}

const EmptyStateIllustration: React.FC<EmptyStateIllustrationProps> = ({ 
  type, 
  className = "w-32 h-32" 
}) => {
  const illustrations = {
    workspace: (
      <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 背景グラデーション */}
        <defs>
          <linearGradient id="workspaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="100%" stopColor="#764ba2" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* メインの建物 */}
        <rect x="70" y="60" width="60" height="80" rx="8" fill="url(#workspaceGrad)" filter="url(#glow)"/>
        <rect x="75" y="65" width="10" height="10" rx="2" fill="white" opacity="0.8"/>
        <rect x="90" y="65" width="10" height="10" rx="2" fill="white" opacity="0.8"/>
        <rect x="105" y="65" width="10" height="10" rx="2" fill="white" opacity="0.8"/>
        <rect x="120" y="65" width="10" height="10" rx="2" fill="white" opacity="0.8"/>
        
        <rect x="75" y="80" width="10" height="10" rx="2" fill="white" opacity="0.6"/>
        <rect x="90" y="80" width="10" height="10" rx="2" fill="white" opacity="0.6"/>
        <rect x="105" y="80" width="10" height="10" rx="2" fill="white" opacity="0.6"/>
        <rect x="120" y="80" width="10" height="10" rx="2" fill="white" opacity="0.6"/>
        
        {/* 装飾的な要素 */}
        <circle cx="50" cy="50" r="3" fill="#8b5cf6" opacity="0.6" className="animate-pulse"/>
        <circle cx="150" cy="40" r="2" fill="#10b981" opacity="0.8" className="animate-pulse"/>
        <circle cx="160" cy="80" r="4" fill="#f59e0b" opacity="0.7" className="animate-pulse"/>
        
        {/* フローティング要素 */}
        <rect x="40" y="120" width="20" height="15" rx="3" fill="#3b82f6" opacity="0.3" className="animate-float"/>
        <rect x="140" y="110" width="25" height="18" rx="4" fill="#ec4899" opacity="0.3" className="animate-float" style={{animationDelay: '1s'}}/>
      </svg>
    ),
    
    notebook: (
      <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="notebookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
        </defs>
        
        {/* ノートブック */}
        <rect x="60" y="40" width="80" height="100" rx="8" fill="url(#notebookGrad)" filter="url(#glow)"/>
        <rect x="55" y="35" width="80" height="100" rx="8" fill="white" stroke="#e5e7eb" strokeWidth="2"/>
        <rect x="50" y="30" width="80" height="100" rx="8" fill="url(#notebookGrad)"/>
        
        {/* ページの線 */}
        <line x1="65" y1="50" x2="115" y2="50" stroke="white" strokeWidth="2" opacity="0.8"/>
        <line x1="65" y1="65" x2="110" y2="65" stroke="white" strokeWidth="2" opacity="0.6"/>
        <line x1="65" y1="80" x2="120" y2="80" stroke="white" strokeWidth="2" opacity="0.4"/>
        
        {/* 装飾的な星 */}
        <polygon points="160,60 162,66 168,66 163,70 165,76 160,72 155,76 157,70 152,66 158,66" fill="#fbbf24" className="animate-pulse"/>
        <polygon points="40,100 42,106 48,106 43,110 45,116 40,112 35,116 37,110 32,106 38,106" fill="#10b981" className="animate-pulse" style={{animationDelay: '0.5s'}}/>
      </svg>
    ),
    
    subfolder: (
      <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="folderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
        </defs>
        
        {/* フォルダー */}
        <path d="M50 70 L50 140 L150 140 L150 80 L120 80 L110 70 Z" fill="url(#folderGrad)" filter="url(#glow)"/>
        <path d="M50 70 L110 70 L120 80 L150 80 L150 75 L120 75 L110 65 L50 65 Z" fill="#67e8f9"/>
        
        {/* サブフォルダー */}
        <path d="M70 90 L130 90 L130 125 L70 125 Z" fill="white" opacity="0.9" rx="4"/>
        <path d="M75 95 L100 95" stroke="#0891b2" strokeWidth="2" opacity="0.6"/>
        <path d="M75 105 L115 105" stroke="#0891b2" strokeWidth="2" opacity="0.4"/>
        
        {/* ドキュメントアイコン */}
        <rect x="85" y="100" width="15" height="20" rx="2" fill="#3b82f6" opacity="0.7"/>
        <polygon points="100,100 100,108 108,108" fill="white" opacity="0.8"/>
      </svg>
    ),
    
    notes: (
      <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="notesGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        
        {/* 複数のノート */}
        <rect x="80" y="50" width="60" height="80" rx="6" fill="url(#notesGrad)" filter="url(#glow)"/>
        <rect x="75" y="45" width="60" height="80" rx="6" fill="white" stroke="#e5e7eb" strokeWidth="1"/>
        <rect x="70" y="40" width="60" height="80" rx="6" fill="url(#notesGrad)"/>
        
        {/* テキスト線 */}
        <line x1="80" y1="55" x2="115" y2="55" stroke="white" strokeWidth="2" opacity="0.8"/>
        <line x1="80" y1="65" x2="110" y2="65" stroke="white" strokeWidth="2" opacity="0.6"/>
        <line x1="80" y1="75" x2="120" y2="75" stroke="white" strokeWidth="2" opacity="0.4"/>
        <line x1="80" y1="85" x2="105" y2="85" stroke="white" strokeWidth="2" opacity="0.3"/>
        
        {/* ペンアイコン */}
        <circle cx="140" cy="60" r="15" fill="#f59e0b" opacity="0.8"/>
        <rect x="135" y="55" width="10" height="3" rx="1" fill="white"/>
        <polygon points="145,58 148,61 146,63 143,60" fill="white"/>
        
        {/* 装飾的な要素 */}
        <circle cx="50" cy="80" r="2" fill="#ec4899" className="animate-pulse"/>
        <circle cx="160" cy="120" r="3" fill="#8b5cf6" className="animate-pulse" style={{animationDelay: '1s'}}/>
      </svg>
    ),
    
    search: (
      <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="searchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
        </defs>
        
        {/* 虫眼鏡 */}
        <circle cx="85" cy="85" r="35" fill="none" stroke="url(#searchGrad)" strokeWidth="8" filter="url(#glow)"/>
        <circle cx="85" cy="85" r="25" fill="none" stroke="white" strokeWidth="2" opacity="0.6"/>
        <line x1="112" y1="112" x2="140" y2="140" stroke="url(#searchGrad)" strokeWidth="8" strokeLinecap="round"/>
        
        {/* 検索されるドキュメント */}
        <rect x="130" y="40" width="30" height="40" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="2" opacity="0.7"/>
        <line x1="135" y1="50" x2="150" y2="50" stroke="#9ca3af" strokeWidth="1"/>
        <line x1="135" y1="60" x2="155" y2="60" stroke="#9ca3af" strokeWidth="1"/>
        <line x1="135" y1="70" x2="145" y2="70" stroke="#9ca3af" strokeWidth="1"/>
        
        {/* 装飾的な点 */}
        <circle cx="40" cy="60" r="2" fill="#3b82f6" opacity="0.6" className="animate-pulse"/>
        <circle cx="160" cy="160" r="3" fill="#10b981" opacity="0.8" className="animate-pulse" style={{animationDelay: '0.7s'}}/>
        <circle cx="50" cy="150" r="2" fill="#f59e0b" opacity="0.7" className="animate-pulse" style={{animationDelay: '1.4s'}}/>
      </svg>
    )
  };

  return illustrations[type];
};

export default EmptyStateIllustration;