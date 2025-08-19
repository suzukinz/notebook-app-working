import React, { useState, useCallback } from 'react';
import { safeReload } from '../../utils/safeReload';
import { useAIFeatures, useAIConfig } from '../../hooks/useAI';

import AIWritingAssistant from './AIWritingAssistant';
import SmartClassification from './SmartClassification';
import AutoSummary from './AutoSummary';
import { LoadingSpinner } from '../common/SuspenseWrapper';

interface AIFeaturesPanelProps {
  // Note content
  title: string;
  content: string;
  currentTags: string[];
  currentCategory?: string;
  existingTags: string[];
  
  // Callbacks
  onContentChange: (newContent: string) => void;
  onTagsChange: (tags: string[]) => void;
  onCategoryChange: (category: string, subcategory?: string) => void;
  onSummarySave?: (summary: string, keyPoints: string[]) => void;
  
  // Display options
  isVisible?: boolean;
  onToggle?: () => void;
}

type ActiveTab = 'assistant' | 'classification' | 'summary' | 'settings';

interface TabButtonProps {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isLoading?: boolean;
  badge?: number | string;
  onClick: (id: ActiveTab) => void;
}

const TabButton: React.FC<TabButtonProps> = ({
  id,
  label,
  icon,
  isActive,
  isLoading,
  badge,
  onClick
}) => (
  <button
    onClick={() => onClick(id)}
    className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    <div className="flex items-center space-x-2">
      {isLoading ? <LoadingSpinner size="small" /> : icon}
      <span>{label}</span>
    </div>
    {badge && (
      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
        isActive ? 'bg-white bg-opacity-20' : 'bg-red-500 text-white'
      }`}>
        {badge}
      </span>
    )}
  </button>
);

interface AIConfigurationProps {
  onConfigurationChange: () => void;
}

const AIConfiguration: React.FC<AIConfigurationProps> = ({ onConfigurationChange }) => {
  const { isConfigured, updateApiKey, clearConfig } = useAIConfig();
  const { ai } = useAIFeatures();
  const [inputApiKey, setInputApiKey] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);

  const handleConfigure = useCallback(async () => {
    setIsConfiguring(true);
    try {
      const success = await updateApiKey(inputApiKey);
      if (success) {
        setInputApiKey('');
        onConfigurationChange();
      }
    } finally {
      setIsConfiguring(false);
    }
  }, [inputApiKey, updateApiKey, onConfigurationChange]);

  const status = ai.getStatus();

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">AI Service Status</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className={`font-medium ${
              ai.isInitialized ? 'text-green-600' : 'text-red-600'
            }`}>
              {ai.isInitialized ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Health:</span>
            <span className={`font-medium ${
              ai.healthStatus === true ? 'text-green-600' : 
              ai.healthStatus === false ? 'text-red-600' : 
              'text-yellow-600'
            }`}>
              {ai.healthStatus === true ? 'Healthy' : 
               ai.healthStatus === false ? 'Unhealthy' : 
               'Checking...'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Model:</span>
            <span className="font-medium text-gray-900">{status.model}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cache Size:</span>
            <span className="font-medium text-gray-900">{status.cacheSize}</span>
          </div>
        </div>
      </div>

      {/* Configuration */}
      {!isConfigured ? (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">Configure AI Features</h4>
          <p className="text-sm text-yellow-800 mb-4">
            Enter your OpenAI API key to enable AI-powered features like smart classification, 
            writing assistance, and automatic summarization.
          </p>
          
          <div className="space-y-3">
            <input
              type="password"
              value={inputApiKey}
              onChange={(e) => setInputApiKey(e.target.value)}
              placeholder="Enter OpenAI API Key..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleConfigure}
              disabled={!inputApiKey.trim() || isConfiguring}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {isConfiguring ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="small" />
                  <span className="ml-2">Configuring...</span>
                </div>
              ) : (
                'Configure AI Features'
              )}
            </button>
          </div>
          
          <div className="mt-4 text-xs text-yellow-700">
            <p>🔒 Your API key is stored securely in your browser and never sent to our servers.</p>
            <p>📝 Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></p>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">AI Features Configured</h4>
          <p className="text-sm text-green-800 mb-4">
            All AI features are now available and ready to use.
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-green-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Smart Classification
            </div>
            <div className="flex items-center text-sm text-green-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Writing Assistant
            </div>
            <div className="flex items-center text-sm text-green-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Auto Summarization
            </div>
          </div>
          
          <button
            onClick={clearConfig}
            className="mt-4 text-sm text-red-600 hover:text-red-700 underline"
          >
            Reset Configuration
          </button>
        </div>
      )}

      {/* Rate Limits */}
      {isConfigured && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Usage Guidelines</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Rate Limit: 60 requests/minute</p>
            <p>• Token Limit: 90,000 tokens/minute</p>
            <p>• Responses are cached for 30 minutes</p>
            <p>• Long content is automatically chunked</p>
          </div>
        </div>
      )}
    </div>
  );
};

const AIFeaturesPanel: React.FC<AIFeaturesPanelProps> = ({
  title,
  content,
  currentTags,
  currentCategory,
  existingTags,
  onContentChange,
  onTagsChange,
  onCategoryChange,
  onSummarySave,
  isVisible = true,
  onToggle
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('assistant');
  const [showWritingAssistant, setShowWritingAssistant] = useState(false);
  const { status, enhancement, classification, summary } = useAIFeatures();

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
  }, []);

  const handleConfigurationChange = useCallback(() => {
    // Refresh status after configuration
    safeReload();
  }, []);

  // Calculate badges for tabs
  const assistantBadge = enhancement.suggestions.length > 0 ? enhancement.suggestions.length : 0;

  if (!isVisible) return null;

  return (
    <>
      <div className="bg-white border rounded-lg shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold">AI Features</h2>
              <p className="text-sm opacity-90">
                {status.isInitialized ? 'AI-powered productivity tools' : 'Configure to get started'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              status.health === true ? 'bg-green-400' : 
              status.health === false ? 'bg-red-400' : 
              'bg-yellow-400'
            }`} />
            {onToggle && (
              <button
                onClick={onToggle}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex space-x-2 overflow-x-auto">
            <TabButton
              id="assistant"
              label="Writing Assistant"
              isActive={activeTab === 'assistant'}
              isLoading={enhancement.isLoading}
              badge={assistantBadge}
              onClick={handleTabChange}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <TabButton
              id="classification"
              label="Smart Tags"
              isActive={activeTab === 'classification'}
              isLoading={classification.isLoading}
              onClick={handleTabChange}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                </svg>
              }
            />
            
            <TabButton
              id="summary"
              label="Auto Summary"
              isActive={activeTab === 'summary'}
              isLoading={summary.isLoading}
              onClick={handleTabChange}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <TabButton
              id="settings"
              label="Settings"
              isActive={activeTab === 'settings'}
              onClick={handleTabChange}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'assistant' && status.isInitialized && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Get AI-powered writing suggestions to improve grammar, style, and structure.
              </p>
              <button
                onClick={() => setShowWritingAssistant(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Open Writing Assistant
              </button>
            </div>
          )}
          
          {activeTab === 'classification' && status.isInitialized && (
            <SmartClassification
              title={title}
              content={content}
              currentTags={currentTags}
              currentCategory={currentCategory || ''}
              existingTags={existingTags}
              onTagsChange={onTagsChange}
              onCategoryChange={onCategoryChange}
              isVisible={true}
              autoClassify={true}
            />
          )}
          
          {activeTab === 'summary' && status.isInitialized && (
            <AutoSummary
              content={content}
              title={title}
              onSummarySave={onSummarySave || (() => {})}
              isVisible={true}
            />
          )}
          
          {activeTab === 'settings' && (
            <AIConfiguration onConfigurationChange={handleConfigurationChange} />
          )}
          
          {/* Not Configured State */}
          {!status.isInitialized && activeTab !== 'settings' && (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">AI Features Not Configured</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure your OpenAI API key to unlock powerful AI features.
              </p>
              <button
                onClick={() => handleTabChange('settings')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Configure AI Features
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Writing Assistant */}
      <AIWritingAssistant
        content={content}
        onContentChange={onContentChange}
        isVisible={showWritingAssistant}
        onToggle={() => setShowWritingAssistant(!showWritingAssistant)}
      />
    </>
  );
};

export default AIFeaturesPanel;