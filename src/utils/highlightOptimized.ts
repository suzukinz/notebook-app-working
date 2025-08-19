// Optimized highlight.js configuration
// Only load languages that are actually used to reduce bundle size

import React from 'react';
import hljs from 'highlight.js/lib/core';

// Import only the languages we actually need
// This reduces bundle size from ~500KB to ~50KB
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml'; // xml includes html
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';

// Core web languages (always loaded)
const CORE_LANGUAGES = {
  javascript,
  js: javascript,
  typescript,
  ts: typescript,
  json,
  markdown,
  md: markdown,
  css,
  html,
  xml: html
};

// Additional languages (loaded on demand)
const ADDITIONAL_LANGUAGES = {
  python,
  py: python,
  bash,
  shell: bash,
  sh: bash,
  sql,
  yaml,
  yml: yaml
};

// Language aliases for common variations
const LANGUAGE_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'md': 'markdown',
  'py': 'python',
  'sh': 'bash',
  'shell': 'bash',
  'yml': 'yaml'
};

// Track which languages are loaded
const loadedLanguages = new Set<string>();

/**
 * Initialize core languages
 */
const initializeCore = (): void => {
  Object.entries(CORE_LANGUAGES).forEach(([name, language]) => {
    if (!loadedLanguages.has(name)) {
      hljs.registerLanguage(name, language);
      loadedLanguages.add(name);
    }
  });
};

/**
 * Load additional language on demand
 */
const loadLanguage = async (languageName: string): Promise<void> => {
  const normalizedName = LANGUAGE_ALIASES[languageName] || languageName;
  
  if (loadedLanguages.has(normalizedName)) {
    return; // Already loaded
  }

  // Check if it's in our predefined additional languages
  if (ADDITIONAL_LANGUAGES[normalizedName as keyof typeof ADDITIONAL_LANGUAGES]) {
    const language = ADDITIONAL_LANGUAGES[normalizedName as keyof typeof ADDITIONAL_LANGUAGES];
    hljs.registerLanguage(normalizedName, language);
    loadedLanguages.add(normalizedName);
    return;
  }

  // For other languages, try dynamic import
  try {
    const languageModule = await import(`highlight.js/lib/languages/${normalizedName}`);
    hljs.registerLanguage(normalizedName, languageModule.default);
    loadedLanguages.add(normalizedName);
  } catch (error) {
    console.warn(`Failed to load language: ${normalizedName}`, error);
  }
};

/**
 * Highlight code with automatic language detection or specified language
 */
export const highlightCode = async (code: string, language?: string): Promise<string> => {
  // Initialize core languages if not done already
  if (loadedLanguages.size === 0) {
    initializeCore();
  }

  // If language is specified, ensure it's loaded
  if (language) {
    await loadLanguage(language);
    
    const normalizedLanguage = LANGUAGE_ALIASES[language] || language;
    if (loadedLanguages.has(normalizedLanguage)) {
      try {
        const result = hljs.highlight(code, { language: normalizedLanguage });
        return result.value;
      } catch (error) {
        console.warn(`Failed to highlight with language ${normalizedLanguage}:`, error);
      }
    }
  }

  // Fallback to auto-detection with core languages only
  try {
    const result = hljs.highlightAuto(code, Array.from(loadedLanguages));
    return result.value;
  } catch (error) {
    console.warn('Failed to auto-highlight code:', error);
    return code; // Return original code if highlighting fails
  }
};

/**
 * Get CSS classes for highlighted code
 */
export const getHighlightClasses = (language?: string): string => {
  const baseClasses = 'hljs';
  if (language) {
    const normalizedLanguage = LANGUAGE_ALIASES[language] || language;
    return `${baseClasses} language-${normalizedLanguage}`;
  }
  return baseClasses;
};

/**
 * Check if a language is supported (either loaded or can be loaded)
 */
export const isLanguageSupported = (language: string): boolean => {
  const normalizedLanguage = LANGUAGE_ALIASES[language] || language;
  return loadedLanguages.has(normalizedLanguage) || 
         normalizedLanguage in ADDITIONAL_LANGUAGES ||
         normalizedLanguage in CORE_LANGUAGES;
};

/**
 * Get list of available/loaded languages
 */
export const getAvailableLanguages = (): string[] => {
  return [
    ...Object.keys(CORE_LANGUAGES),
    ...Object.keys(ADDITIONAL_LANGUAGES)
  ].sort();
};

/**
 * Preload commonly used languages
 */
export const preloadCommonLanguages = async (): Promise<void> => {
  const commonLanguages = ['python', 'bash', 'sql', 'yaml'];
  await Promise.all(commonLanguages.map(loadLanguage));
};

/**
 * React hook for code highlighting
 */
export const useCodeHighlight = () => {
  const [isLoading, setIsLoading] = React.useState(false);

  const highlight = async (code: string, language?: string): Promise<string> => {
    setIsLoading(true);
    try {
      const highlighted = await highlightCode(code, language);
      return highlighted;
    } finally {
      setIsLoading(false);
    }
  };

  return { highlight, isLoading };
};

// Initialize core languages on module load
initializeCore();

// Default export
export default {
  highlightCode,
  getHighlightClasses,
  isLanguageSupported,
  getAvailableLanguages,
  preloadCommonLanguages,
  loadLanguage
};