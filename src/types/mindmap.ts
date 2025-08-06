// Simple connection type for graph view
export interface GraphConnection {
  source: string;
  target: string;
  type: 'hierarchy' | 'relation' | 'tag' | 'recent' | 'favorite';
}