import { lazy, ComponentType } from 'react';
import type { ComponentProps } from 'react';

// Lazy load heavy components for better performance
// These components will only be loaded when actually needed

/**
 * Markdown Editor - Heavy component with syntax highlighting
 * Only loaded when user actually opens markdown editor
 */
export const LazyMarkdownEditor = lazy(() => 
  import('../notes/MarkdownEditor').then(module => ({
    default: module.default
  }))
);

/**
 * Rich Text Editor - Heavy component with formatting tools
 * Only loaded when user opens rich text editor
 */
export const LazyRichTextEditor = lazy(() => 
  import('../notes/RichTextEditor').then(module => ({
    default: module.default
  }))
);

/**
 * Mind Map Component - Heavy visualization library
 * Only loaded when user opens mind map view
 */
export const LazyMindMap = lazy(() => 
  import('../mindmap/TreeMindMap').then(module => ({
    default: module.default
  }))
);

/**
 * Export Components - Heavy file processing
 * Only loaded when user initiates export
 */
export const LazyExportModal = lazy(() => 
  import('../dialogs/DataExportImportDialog').then(module => ({
    default: module.default
  }))
);

/**
 * Import Components - Heavy file processing  
 * Only loaded when user initiates import
 */
export const LazyImportModal = lazy(() => 
  import('../dialogs/DataExportImportDialog').then(module => ({
    default: module.default
  }))
);

/**
 * Settings Panel - Loaded only when accessed
 */
export const LazySettingsPanel = lazy(() => 
  import('../dialogs/SettingsDialog').then(module => ({
    default: module.default
  }))
);

/**
 * Chart Components - Heavy charting library
 * Only loaded when user creates charts
 */
export const LazyChartComponent = lazy(() => 
  import('../dashboard/ActivityChart').then(module => ({
    default: module.default
  }))
);

/**
 * PDF Viewer - Heavy PDF processing
 * Only loaded when user opens PDF
 * Currently disabled - PDF directory not found
 */
// export const LazyPDFViewer = lazy(() => 
//   import('../pdf/PDFViewer').then(module => ({
//     default: module.default
//   }))
// );

// Type helpers for lazy components
export type LazyComponentType<T = {}> = ComponentType<T> & {
  displayName?: string;
};

// Wrapper for lazy loading with error boundaries
export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  displayName?: string
): LazyComponentType<ComponentProps<T>> => {
  const LazyComponent = lazy(importFn);
  
  if (displayName) {
    (LazyComponent as any).displayName = `Lazy(${displayName})`;
  }
  
  return LazyComponent as LazyComponentType<ComponentProps<T>>;
};

// Preload function for critical components
export const preloadComponent = (componentImport: () => Promise<any>): Promise<any> => {
  return componentImport();
};

// Preload critical components on user interaction
export const preloadCriticalComponents = (): void => {
  // Preload editor components on mouse enter or touch
  const preloadOnInteraction = () => {
    preloadComponent(() => import('../notes/RichTextEditor'));
    preloadComponent(() => import('../notes/MarkdownEditor'));
  };

  // Preload on first user interaction
  document.addEventListener('mouseenter', preloadOnInteraction, { once: true });
  document.addEventListener('touchstart', preloadOnInteraction, { once: true });
  document.addEventListener('click', preloadOnInteraction, { once: true });
};

// Dynamic imports for utilities that can be loaded on demand
export const dynamicUtils = {
  // Load heavy syntax highlighter only when needed
  loadHighlighter: () => import('highlight.js').then(hljs => hljs.default),
  
  // Load math renderer only when needed
  loadKatex: () => import('katex').then(katex => katex.default),
  
  // Load QR code generator only when needed
  loadQRCode: () => import('qrcode').then(qr => qr.default),
  
  // Load chart library only when needed (disabled - chart.js not installed)
  // loadChart: () => import('chart.js').then(chart => chart.default),
  
  // Load heavy markdown processor only when needed
  loadMarkdownProcessor: () => import('react-markdown').then(md => md.default)
};

export default {
  LazyMarkdownEditor,
  LazyRichTextEditor,
  LazyMindMap,
  LazyExportModal,
  LazyImportModal,
  LazySettingsPanel,
  LazyChartComponent,
  // LazyPDFViewer, // Disabled
  createLazyComponent,
  preloadComponent,
  preloadCriticalComponents,
  dynamicUtils
};