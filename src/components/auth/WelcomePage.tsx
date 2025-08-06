import React from 'react';
import { BookOpen, Cloud, Shield, Smartphone, Github } from 'lucide-react';

interface WelcomePageProps {
  onLogin: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              NoteSpace
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              階層構造で整理する、次世代ノートアプリ
            </p>
          </div>

          {/* 特徴セクション */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <Cloud className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                クラウド同期
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                すべてのデバイスで自動同期。どこからでもアクセス可能。
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <Shield className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                オフライン対応
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                インターネットがなくても作業を継続。後で自動同期。
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <BookOpen className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                4階層構造
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                ワークスペース → ノートブック → フォルダ → ノートで完璧に整理。
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <Smartphone className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                マルチプラットフォーム
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                PC、スマホ、タブレット。すべてのデバイスで快適に使用。
              </p>
            </div>
          </div>

          {/* CTAセクション */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              今すぐ始めよう
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              無料で始められます。クレジットカード不要。
            </p>
            
            <button
              onClick={onLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <Github className="w-5 h-5" />
              GitHubでログイン
            </button>
            
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              または
              <button
                onClick={onLogin}
                className="ml-1 text-blue-600 hover:text-blue-500 underline"
              >
                メールでログイン
              </button>
            </p>
          </div>

          {/* フッター */}
          <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
            <p>ローカルストレージ + Supabase同期で安全にデータを保護</p>
          </div>
        </div>
      </div>
    </div>
  );
};