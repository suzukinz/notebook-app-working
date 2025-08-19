import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Folder, 
  FileText, 
  Star, 
  Tag, 
  Clock, 
  Settings,
  Filter,
  BookOpen,
  Grid,
  List,
  Pin,
  ChevronRight,
  ChevronDown,
  Edit3,
  Trash2,
  MoreHorizontal,
  FolderPlus,
  Activity,
  ChevronLeft,
  Copy,
  Move,
  Eye,
  Map,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2
} from 'lucide-react';

const NotebookApp = () => {
  // サブフォルダの構造
  const subFoldersInitial = {
    projects: [
      { id: 'frontend', name: 'フロントエンド', count: 5, color: 'blue' },
      { id: 'backend', name: 'バックエンド', count: 4, color: 'green' },
      { id: 'database', name: 'データベース', count: 3, color: 'purple' }
    ],
    meetings: [
      { id: 'weekly', name: '週次会議', count: 6, color: 'orange' },
      { id: 'project', name: 'プロジェクト会議', count: 2, color: 'blue' }
    ],
    ideas: [
      { id: 'product', name: '新商品アイデア', count: 8, color: 'yellow' },
      { id: 'improvement', name: '改善案', count: 7, color: 'green' }
    ],
    // Personal ワークスペース
    diary: [
      { id: 'daily', name: '日々の記録', count: 20, color: 'pink' },
      { id: 'reflection', name: '振り返り', count: 10, color: 'purple' }
    ],
    recipes: [
      { id: 'japanese', name: '和食', count: 15, color: 'red' },
      { id: 'western', name: '洋食', count: 10, color: 'blue' }
    ],
    // Learning ワークスペース
    tech: [
      { id: 'programming', name: 'プログラミング', count: 12, color: 'green' },
      { id: 'design', name: 'デザイン', count: 6, color: 'purple' }
    ],
    books: [
      { id: 'fiction', name: '小説', count: 15, color: 'orange' },
      { id: 'nonfiction', name: 'ノンフィクション', count: 7, color: 'blue' }
    ]
  };

  const notesInitial = {
    // Work ワークスペース
    frontend: [
      {
        id: 1,
        title: 'React コンポーネント設計',
        tags: ['design', 'react', 'urgent'],
        createdAt: '2025-07-03',
        updatedAt: '2025-07-05',
        isPinned: true,
        isFavorite: true,
        pages: [
          { id: 1, title: '基本概念', content: '# React コンポーネント設計 - 基本概念\n\n## 1. コンポーネントの分類\n\n### 機能別分類\n- **Presentational Components**: 見た目に関する責務\n- **Container Components**: ロジックに関する責務\n\n### 再利用性別分類\n- **Generic Components**: 汎用的なコンポーネント\n- **Specific Components**: 特定の機能に特化したコンポーネント\n\n## 2. 設計原則\n\n### Single Responsibility Principle\n各コンポーネントは単一の責務を持つべき\n\n### Composition over Inheritance\n継承よりもコンポジションを優先する\n\n### Props Down, Events Up\n- データは上から下へ (props)\n- イベントは下から上へ (callbacks)' },
          { id: 2, title: '設計パターン', content: '# React コンポーネント設計 - 設計パターン\n\n## 1. Composition Pattern\n\n```jsx\nconst Layout = ({ children }) => (\n  <div className="layout">\n    <Header />\n    <main>{children}</main>\n    <Footer />\n  </div>\n);\n```\n\n## 2. Render Props Pattern\n\n```jsx\nconst DataProvider = ({ render }) => {\n  const [data, setData] = useState(null);\n  \n  useEffect(() => {\n    fetchData().then(setData);\n  }, []);\n  \n  return render(data);\n};\n```\n\n## 3. Custom Hooks Pattern\n\n```jsx\nconst useCounter = (initialValue = 0) => {\n  const [count, setCount] = useState(initialValue);\n  \n  const increment = () => setCount(count + 1);\n  const decrement = () => setCount(count - 1);\n  \n  return { count, increment, decrement };\n};\n```' },
          { id: 3, title: 'ベストプラクティス', content: '# React コンポーネント設計 - ベストプラクティス\n\n## 1. 命名規則\n\n### コンポーネント名\n- PascalCase を使用\n- 名詞で命名\n- 具体的で分かりやすい名前\n\n```jsx\n// Good\nconst UserProfile = () => {};\nconst ProductCard = () => {};\n\n// Bad\nconst user = () => {};\nconst Card = () => {};\n```\n\n### Props名\n- camelCase を使用\n- boolean の場合は is/has/can で始める\n\n```jsx\n// Good\nconst Button = ({ isDisabled, hasIcon, onClick }) => {};\n\n// Bad\nconst Button = ({ disabled, icon, click }) => {};\n```\n\n## 2. パフォーマンス最適化\n\n### React.memo\n```jsx\nconst ExpensiveComponent = React.memo(({ data }) => {\n  // 重い処理\n});\n```\n\n### useMemo & useCallback\n```jsx\nconst Component = ({ items, filter }) => {\n  const filteredItems = useMemo(() => \n    items.filter(filter), [items, filter]\n  );\n  \n  const handleClick = useCallback(() => {\n    // クリックハンドラー\n  }, []);\n};\n```' }
        ]
      },
      {
        id: 2,
        title: 'CSS アニメーション実装',
        tags: ['css', 'animation', 'frontend'],
        createdAt: '2025-07-02',
        updatedAt: '2025-07-04',
        isPinned: false,
        isFavorite: false,
        pages: [
          { id: 1, title: 'Framer Motion 基礎', content: '# CSS アニメーション実装 - Framer Motion基礎\n\n## 1. インストール\n\n```bash\nnpm install framer-motion\n```\n\n## 2. 基本的な使用方法\n\n### motion要素\n```jsx\nimport { motion } from "framer-motion";\n\nconst AnimatedDiv = () => (\n  <motion.div\n    initial={{ opacity: 0, y: 20 }}\n    animate={{ opacity: 1, y: 0 }}\n    transition={{ duration: 0.5 }}\n  >\n    アニメーションするコンテンツ\n  </motion.div>\n);\n```\n\n### アニメーションの種類\n- **initial**: 初期状態\n- **animate**: アニメーション後の状態\n- **exit**: 要素が削除される時の状態\n- **whileHover**: ホバー時の状態\n- **whileTap**: タップ時の状態' },
          { id: 2, title: '複雑なアニメーション', content: '# CSS アニメーション実装 - 複雑なアニメーション\n\n## 1. シーケンシャルアニメーション\n\n```jsx\nconst container = {\n  hidden: { opacity: 0 },\n  show: {\n    opacity: 1,\n    transition: {\n      staggerChildren: 0.1\n    }\n  }\n};\n\nconst item = {\n  hidden: { y: 20, opacity: 0 },\n  show: { y: 0, opacity: 1 }\n};\n\nconst List = () => (\n  <motion.ul\n    variants={container}\n    initial="hidden"\n    animate="show"\n  >\n    {items.map(item => (\n      <motion.li key={item.id} variants={item}>\n        {item.text}\n      </motion.li>\n    ))}\n  </motion.ul>\n);\n```\n\n## 2. ジェスチャーアニメーション\n\n```jsx\nconst DraggableCard = () => (\n  <motion.div\n    drag\n    dragConstraints={{ left: 0, right: 300, top: 0, bottom: 300 }}\n    whileDrag={{ scale: 1.1 }}\n    dragElastic={0.2}\n  >\n    ドラッグ可能なカード\n  </motion.div>\n);\n```' }
        ]
      },
      {
        id: 3,
        title: 'レスポンシブデザイン対応',
        tags: ['css', 'responsive'],
        createdAt: '2025-07-01',
        updatedAt: '2025-07-03',
        isPinned: false,
        isFavorite: true,
        pages: [
          { id: 1, title: 'Tailwind CSS基礎', content: '# レスポンシブデザイン対応\n\n## Tailwind CSSを使用したレスポンシブ対応について\n\n### 1. ブレークポイント\n- `sm:` - 640px以上\n- `md:` - 768px以上\n- `lg:` - 1024px以上\n- `xl:` - 1280px以上\n- `2xl:` - 1536px以上\n\n### 2. 実装例\n\n```html\n<!-- モバイルファーストアプローチ -->  \n<div class="w-full sm:w-1/2 lg:w-1/3 xl:w-1/4">\n  <div class="p-4 sm:p-6 lg:p-8">\n    <h2 class="text-xl sm:text-2xl lg:text-3xl">\n      レスポンシブタイトル\n    </h2>\n    <p class="text-sm sm:text-base lg:text-lg">\n      レスポンシブテキスト\n    </p>\n  </div>\n</div>\n```\n\n### 3. グリッドレイアウト\n\n```html\n<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">\n  <div class="bg-white p-4 rounded-lg shadow">Card 1</div>\n  <div class="bg-white p-4 rounded-lg shadow">Card 2</div>\n  <div class="bg-white p-4 rounded-lg shadow">Card 3</div>\n</div>\n```' }
        ]
      }
    ],
    backend: [
      {
        id: 4,
        title: 'API仕様書',
        tags: ['api', 'backend'],
        createdAt: '2025-07-02',
        updatedAt: '2025-07-04',
        isPinned: false,
        isFavorite: false,
        pages: [
          { id: 1, title: 'RESTful API設計', content: '# API仕様書 - RESTful API設計\n\n## 1. エンドポイント設計\n\n### ユーザー管理\n- `GET /api/users` - ユーザー一覧取得\n- `GET /api/users/:id` - 特定ユーザー取得\n- `POST /api/users` - ユーザー作成\n- `PUT /api/users/:id` - ユーザー更新\n- `DELETE /api/users/:id` - ユーザー削除\n\n### 認証\n- `POST /api/auth/login` - ログイン\n- `POST /api/auth/logout` - ログアウト\n- `POST /api/auth/refresh` - トークンリフレッシュ\n\n## 2. レスポンス形式\n\n### 成功レスポンス\n```json\n{\n  "status": "success",\n  "data": {\n    "id": 1,\n    "name": "John Doe",\n    "email": "john@example.com"\n  },\n  "message": "User retrieved successfully"\n}\n```\n\n### エラーレスポンス\n```json\n{\n  "status": "error",\n  "error": {\n    "code": "VALIDATION_ERROR",\n    "message": "Invalid input data",\n    "details": [\n      {\n        "field": "email",\n        "message": "Invalid email format"\n      }\n    ]\n  }\n}\n```' }
        ]
      },
      {
        id: 5,
        title: '認証システム実装',
        tags: ['auth', 'jwt', 'security'],
        createdAt: '2025-06-30',
        updatedAt: '2025-07-02',
        isPinned: true,
        isFavorite: true,
        pages: [
          { id: 1, title: 'JWT実装', content: '# 認証システム実装\n\n## 1. JWT (JSON Web Token) とは\n\nJWTは、当事者間で安全に情報を転送するための手法です。\n\n### 構造\n- **Header**: アルゴリズムとトークンタイプ\n- **Payload**: クレーム（ユーザー情報など）\n- **Signature**: ヘッダーとペイロードの署名\n\n## 2. 実装例\n\n### トークン生成\n```javascript\nconst jwt = require("jsonwebtoken");\n\nconst generateToken = (user) => {\n  return jwt.sign(\n    { \n      id: user.id, \n      email: user.email \n    },\n    process.env.JWT_SECRET,\n    { expiresIn: "24h" }\n  );\n};\n```\n\n### トークン検証\n```javascript\nconst verifyToken = (token) => {\n  try {\n    return jwt.verify(token, process.env.JWT_SECRET);\n  } catch (error) {\n    throw new Error("Invalid token");\n  }\n};\n```\n\n### ミドルウェア\n```javascript\nconst authenticate = (req, res, next) => {\n  const token = req.header("Authorization")?.replace("Bearer ", "");\n  \n  if (!token) {\n    return res.status(401).json({ message: "Access denied" });\n  }\n  \n  try {\n    const decoded = verifyToken(token);\n    req.user = decoded;\n    next();\n  } catch (error) {\n    res.status(401).json({ message: "Invalid token" });\n  }\n};\n```' }
        ]
      }
    ],
    database: [
      {
        id: 6,
        title: 'データベース設計',
        tags: ['database', 'postgresql'],
        createdAt: '2025-07-01',
        updatedAt: '2025-07-03',
        isPinned: false,
        isFavorite: true,
        pages: [
          { id: 1, title: 'データベース設計', content: '# データベース設計\n\n## PostgreSQLを使用したデータベース構造\n\n### 1. テーブル設計\n\n#### users テーブル\n```sql\nCREATE TABLE users (\n    id SERIAL PRIMARY KEY,\n    email VARCHAR(255) UNIQUE NOT NULL,\n    password_hash VARCHAR(255) NOT NULL,\n    first_name VARCHAR(100) NOT NULL,\n    last_name VARCHAR(100) NOT NULL,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n```\n\n#### posts テーブル\n```sql\nCREATE TABLE posts (\n    id SERIAL PRIMARY KEY,\n    user_id INTEGER REFERENCES users(id),\n    title VARCHAR(255) NOT NULL,\n    content TEXT,\n    status VARCHAR(20) DEFAULT \'draft\',\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n```\n\n### 2. インデックス設計\n\n```sql\n-- 検索パフォーマンス向上のためのインデックス\nCREATE INDEX idx_users_email ON users(email);\nCREATE INDEX idx_posts_user_id ON posts(user_id);\nCREATE INDEX idx_posts_status ON posts(status);\nCREATE INDEX idx_posts_created_at ON posts(created_at);\n```\n\n### 3. 制約設定\n\n```sql\n-- チェック制約\nALTER TABLE posts ADD CONSTRAINT chk_status \n    CHECK (status IN (\'draft\', \'published\', \'archived\'));\n\n-- 外部キー制約\nALTER TABLE posts \n    ADD CONSTRAINT fk_posts_user_id \n    FOREIGN KEY (user_id) REFERENCES users(id) \n    ON DELETE CASCADE;\n```' }
        ]
      }
    ],
    weekly: [
      {
        id: 7,
        title: '週次ミーティング 7/1',
        tags: ['meeting', 'weekly'],
        createdAt: '2025-07-01',
        updatedAt: '2025-07-01',
        isPinned: false,
        isFavorite: false,
        pages: [
          { id: 1, title: '会議記録', content: '# 週次ミーティング 7/1\n\n## 参加者\n- 田中 (PM)\n- 佐藤 (フロントエンド)\n- 鈴木 (バックエンド)\n- 高橋 (デザイナー)\n\n## 議題\n1. 先週の進捗確認\n2. 今週のタスク割り当て\n3. 技術的な課題について\n4. 次週の計画\n\n## 進捗報告\n\n### フロントエンド (佐藤)\n- ユーザーダッシュボードの実装完了\n- レスポンシブデザインの調整中\n- 予定より1日遅れ\n\n### バックエンド (鈴木)\n- API認証機能の実装完了\n- データベース最適化実施\n- 予定通り進行中\n\n### デザイン (高橋)\n- UIコンポーネントライブラリの更新\n- 新しいページのモックアップ作成\n- 予定より1日早く完了\n\n## 決定事項\n1. レスポンシブデザインの優先度を上げる\n2. 次回までにコードレビューを実施\n3. 新しいテスト戦略の検討\n\n## アクションアイテム\n- [ ] 佐藤: レスポンシブデザイン完了 (7/3まで)\n- [ ] 鈴木: API仕様書更新 (7/2まで)\n- [ ] 高橋: 新ページのデザイン確認 (7/4まで)\n- [ ] 田中: テスト戦略文書作成 (7/5まで)\n\n## 次回会議\n日時: 2025年7月8日 10:00-11:00\n場所: 会議室A / オンライン併用' }
        ]
      }
    ],
    // Personal ワークスペース
    daily: [
      {
        id: 8,
        title: '今日の出来事',
        tags: ['diary', 'daily'],
        createdAt: '2025-07-16',
        updatedAt: '2025-07-16',
        isPinned: false,
        isFavorite: false,
        pages: [
          { id: 1, title: '今日の出来事', content: '# 今日の出来事\n\n## 朝\n朝から雨が降っていた。いつもより30分早く起きて、ゆっくりとコーヒーを飲む時間を作った。\n最近忙しくて、こういう静かな時間が貴重に感じる。\n\n## 午前中\n- 9:00 - チームミーティング\n  - 新しいプロジェクトの進捗確認\n  - 思ったより順調に進んでいる\n- 10:30 - コーディング作業\n  - Reactコンポーネントの修正\n  - 予想以上に時間がかかった\n\n## 午後\n- 13:00 - ランチ\n  - 同僚と近くのカフェでサンドイッチ\n  - 最近読んだ本について話した\n- 14:00 - 設計レビュー\n  - データベース設計の見直し\n  - 指摘事項がいくつかあったので修正が必要\n\n## 夕方\n- 17:00 - 1on1ミーティング\n  - 上司とのキャリア相談\n  - 来年の目標設定について話し合った\n- 18:30 - 退社\n  - 雨は止んでいて、空がきれいだった\n\n## 今日の良かったこと\n- 朝の静かな時間を持てた\n- チームの雰囲気が良かった\n- 新しいアイデアが浮かんだ\n\n## 明日やること\n- データベース設計の修正\n- 新しいテストケースの作成\n- 技術書の続きを読む\n\n## 感想\n忙しい一日だったけど、充実していた。\n特に1on1で将来について話せたのが良かった。\n明日も頑張ろう。' }
        ]
      }
    ],
    reflection: [
      {
        id: 9,
        title: '今週の振り返り',
        tags: ['reflection', 'weekly'],
        createdAt: '2025-07-15',
        updatedAt: '2025-07-15',
        isPinned: true,
        isFavorite: false,
        pages: [
          { id: 1, title: '今週の振り返り', content: '# 今週の振り返り\n\n## 良かった点\n\n### 技術面\n- **新しいフレームワークの学習**\n  - Reactの新しいフックを覚えた\n  - パフォーマンスが向上した\n  - コードがより読みやすくなった\n\n- **プロジェクトの進捗**\n  - 予定通りに機能を実装できた\n  - バグの発見と修正が早かった\n  - テストカバレッジが向上した\n\n### 個人面\n- **時間管理**\n  - 朝の時間を有効活用できた\n  - 集中する時間を作れた\n  - 残業時間が減った\n\n- **健康面**\n  - 毎日散歩をした\n  - 睡眠時間を確保できた\n  - 栄養バランスを意識した\n\n## 改善点\n\n### 技術面\n- **ドキュメント作成**\n  - APIドキュメントが不十分\n  - コメントが少ない\n  - 仕様書の更新が遅れた\n\n### 個人面\n- **コミュニケーション**\n  - もう少し積極的に質問すべきだった\n  - 他のチームとの連携が不足\n  - 進捗報告のタイミングが遅い\n\n## 来週の目標\n\n### 技術目標\n1. **TypeScriptの学習**\n   - 基本的な型定義をマスターする\n   - 既存のコードをTypeScriptに移行する\n\n2. **テストの改善**\n   - ユニットテストの充実\n   - E2Eテストの導入検討\n\n### 個人目標\n1. **コミュニケーション向上**\n   - 朝会での発言を増やす\n   - 他チームとの情報共有を積極的に行う\n\n2. **継続学習**\n   - 技術書を週に1冊読む\n   - オンライン講座の受講\n\n## 今週の学び\n- **技術的な学び**\n  - パフォーマンス最適化の重要性\n  - コードレビューの価値\n  - チーム開発での役割分担\n\n- **個人的な学び**\n  - 時間管理の大切さ\n  - 健康管理の重要性\n  - 継続的な学習の必要性\n\n## 今後の課題\n1. **スキルアップ**\n   - アーキテクチャ設計の理解を深める\n   - 新しい技術トレンドをキャッチアップする\n\n2. **チームワーク**\n   - より良いコミュニケーションを心がける\n   - 知識の共有を積極的に行う\n\n3. **プロダクト品質**\n   - ユーザー体験を常に意識する\n   - 保守性の高いコードを書く\n\n## 感想\n今週は全体的に充実した一週間だった。\n技術的な成長を実感できたし、チームとの連携も改善された。\n来週は今週の反省を活かして、さらに良いパフォーマンスを目指したい。' }
        ]
      }
    ],
    japanese: [
      {
        id: 10,
        title: '親子丼のレシピ',
        tags: ['recipe', 'japanese', 'chicken'],
        createdAt: '2025-07-14',
        updatedAt: '2025-07-14',
        isPinned: false,
        isFavorite: true,
        pages: [
          { id: 1, title: '親子丼のレシピ', content: '# 親子丼のレシピ\n\n## 材料（2人分）\n\n### メイン材料\n- **鶏もも肉**: 200g\n- **玉ねぎ**: 1個（中サイズ）\n- **卵**: 3個\n- **ご飯**: 2杯分\n- **三つ葉**: 適量（お好みで）\n\n### 調味料\n- **だし汁**: 200ml\n- **醤油**: 大さじ2\n- **みりん**: 大さじ2\n- **砂糖**: 大さじ1\n- **酒**: 大さじ1\n\n## 作り方\n\n### 下準備\n1. **鶏肉の準備**\n   - 鶏もも肉を一口大に切る\n   - 余分な脂を取り除く\n\n2. **野菜の準備**\n   - 玉ねぎを薄切りにする\n   - 三つ葉を3cm程度に切る\n\n3. **卵の準備**\n   - 卵を溶いておく（少しかき混ぜる程度）\n\n### 調理手順\n\n#### ステップ1: 調味料を合わせる\n```\nだし汁 + 醤油 + みりん + 砂糖 + 酒\n```\n小鍋に入れて混ぜ合わせる\n\n#### ステップ2: 鶏肉と玉ねぎを煮る\n1. 調味料を沸騰させる\n2. 鶏肉を入れて中火で3分煮る\n3. 玉ねぎを加えて2分煮る\n\n#### ステップ3: 卵を加える\n1. 溶き卵の2/3を回し入れる\n2. 蓋をして1分弱火で煮る\n3. 残りの卵を加える\n4. 蓋をして30秒〜1分（お好みの固さまで）\n\n#### ステップ4: 仕上げ\n1. 温かいご飯の上に盛り付ける\n2. 三つ葉を散らす\n3. 完成！\n\n## コツ・ポイント\n\n### 美味しく作るコツ\n- **鶏肉は煮すぎない**\n  - 固くならないよう注意\n  - 中火で短時間で調理\n\n- **卵は2回に分けて入れる**\n  - 最初の卵で基本の固さを作る\n  - 2回目の卵で仕上げの食感を調整\n\n- **だし汁の濃さを調整**\n  - 市販のだしの素を使う場合は薄めに\n  - 味見をして調整\n\n### アレンジ\n- **きのこ入り**: しめじやえのきを追加\n- **野菜増量**: 人参やピーマンを追加\n- **辛味**: 七味唐辛子をかける\n\n## 栄養価（1人分）\n- カロリー: 約580kcal\n- たんぱく質: 25g\n- 脂質: 18g\n- 炭水化物: 75g\n\n## 保存方法\n- 作り置きは冷蔵庫で1日程度\n- 冷凍保存は卵の食感が変わるため不向き\n- 食べる前に再加熱する\n\n## 一緒に食べたい副菜\n- **味噌汁**: わかめや豆腐\n- **漬物**: きゅうりや大根\n- **小鉢**: ほうれん草の胡麻和え\n\n## 評価\n★★★★★ (5/5)\n- 作りやすさ: ★★★★☆\n- 美味しさ: ★★★★★\n- 栄養バランス: ★★★★☆\n- コスト: ★★★★★\n\n## 作った日の感想\n家族にとても好評だった。\n特に卵の食感が絶妙で、だしの味もよく染みていた。\n次回は三つ葉を多めに入れてみたい。' }
        ]
      }
    ],
    western: [
      {
        id: 11,
        title: 'パスタカルボナーラ',
        tags: ['recipe', 'western', 'pasta'],
        createdAt: '2025-07-13',
        updatedAt: '2025-07-13',
        isPinned: false,
        isFavorite: false,
        pages: [
          { id: 1, title: 'パスタカルボナーラ', content: '# パスタカルボナーラ\n\n## 材料（2人分）\n\n### パスタ\n- **スパゲッティ**: 200g\n- **塩**: 適量（茹で用）\n\n### カルボナーラソース\n- **ベーコン**: 100g（厚切り）\n- **卵黄**: 3個\n- **全卵**: 1個\n- **パルミジャーノ・レッジャーノ**: 60g（すりおろし）\n- **黒胡椒**: 適量（粗挽き）\n- **オリーブオイル**: 大さじ1\n\n### 仕上げ\n- **パセリ**: 適量（みじん切り）\n\n## 作り方\n\n### 準備\n1. **ベーコンを切る**\n   - 1cm幅の短冊切りにする\n\n2. **卵液を作る**\n   - ボウルに卵黄3個と全卵1個を入れる\n   - パルミジャーノ・レッジャーノを加える\n   - 黒胡椒を加えて混ぜる\n\n### 調理手順\n\n#### ステップ1: パスタを茹でる\n1. 大きな鍋にたっぷりの湯を沸かす\n2. 塩を加える（湯の1%程度）\n3. スパゲッティを茹でる（表示時間より1分短く）\n\n#### ステップ2: ベーコンを炒める\n1. フライパンにオリーブオイルを入れる\n2. ベーコンを中火で炒める\n3. カリッとするまで3-4分炒める\n\n#### ステップ3: 仕上げ\n1. 茹で上がったパスタをフライパンに移す\n2. 茹で汁を少し加える（大さじ2-3）\n3. 火を止めて卵液を加える\n4. 素早く混ぜ合わせる（卵が固まらないように）\n5. 黒胡椒をたっぷりかける\n\n#### ステップ4: 盛り付け\n1. 温めた皿に盛る\n2. パルミジャーノ・レッジャーノを追加\n3. 黒胡椒とパセリを散らす\n\n## 成功のポイント\n\n### 重要なコツ\n1. **火加減が重要**\n   - 卵液を加える時は火を止める\n   - 余熱で卵をふんわりと固める\n\n2. **茹で汁の活用**\n   - 茹で汁でソースの濃度を調整\n   - 塩分も調整できる\n\n3. **タイミング**\n   - パスタとベーコンの調理タイミングを合わせる\n   - 卵液は最後に素早く混ぜる\n\n### よくある失敗と対策\n\n#### 卵がスクランブルエッグになる\n- **原因**: 火が強すぎる\n- **対策**: 火を完全に止めてから卵液を加える\n\n#### ソースが水っぽい\n- **原因**: 茹で汁が多すぎる\n- **対策**: 茹で汁は少しずつ加える\n\n#### パスタが固まる\n- **原因**: 混ぜ方が不十分\n- **対策**: 茹で汁を適量加えて滑らかにする\n\n## アレンジ\n\n### 具材のアレンジ\n- **きのこ**: しめじやマッシュルームを追加\n- **野菜**: アスパラガスやほうれん草\n- **肉**: ベーコンの代わりにパンチェッタ\n\n### チーズのアレンジ\n- **ペコリーノ・ロマーノ**: より強い味わい\n- **パルミジャーノ・レッジャーノ**: まろやかな味\n\n## 栄養価（1人分）\n- カロリー: 約650kcal\n- たんぱく質: 30g\n- 脂質: 28g\n- 炭水化物: 75g\n\n## ワインペアリング\n- **白ワイン**: ピノ・グリージョ\n- **赤ワイン**: キャンティ・クラシコ\n- **スパークリング**: プロセッコ\n\n## 作った感想\n本格的なイタリアの味を再現できた。\nベーコンの塩気と卵のクリーミーさが絶妙で、\n黒胡椒の効いた大人の味わいに仕上がった。\n次回はパンチェッタを使ってみたい。' }
        ]
      }
    ],
    // Learning ワークスペース
    programming: [
      {
        id: 12,
        title: 'JavaScript基礎',
        tags: ['programming', 'javascript', 'basics'],
        createdAt: '2025-07-12',
        updatedAt: '2025-07-12',
        isPinned: true,
        isFavorite: true,
        pages: [
          { id: 1, title: 'JavaScript基礎', content: '# JavaScript基礎\n\n## 1. 変数の宣言\n\n### var, let, const の違い\n\n#### var\n- 関数スコープ\n- 再宣言可能\n- 再代入可能\n- ホイスティング対象\n\n```javascript\nvar name = "John";\nvar name = "Jane"; // 再宣言可能\nname = "Bob"; // 再代入可能\n```\n\n#### let\n- ブロックスコープ\n- 再宣言不可\n- 再代入可能\n- ホイスティング対象（但し、アクセス不可）\n\n```javascript\nlet age = 30;\n// let age = 25; // SyntaxError: 再宣言不可\nage = 25; // 再代入可能\n```\n\n#### const\n- ブロックスコープ\n- 再宣言不可\n- 再代入不可\n- ホイスティング対象（但し、アクセス不可）\n\n```javascript\nconst pi = 3.14159;\n// const pi = 3.14; // SyntaxError: 再宣言不可\n// pi = 3.14; // TypeError: 再代入不可\n```\n\n## 2. データ型\n\n### プリミティブ型\n1. **Number**: 数値\n2. **String**: 文字列\n3. **Boolean**: 真偽値\n4. **null**: null値\n5. **undefined**: 未定義\n6. **Symbol**: シンボル（ES6以降）\n7. **BigInt**: 大きな整数（ES2020以降）\n\n### オブジェクト型\n- **Object**: オブジェクト\n- **Array**: 配列\n- **Function**: 関数\n- **Date**: 日付\n- **RegExp**: 正規表現\n\n```javascript\n// プリミティブ型\nconst num = 42;\nconst str = "Hello";\nconst bool = true;\nconst empty = null;\nconst undef = undefined;\n\n// オブジェクト型\nconst obj = { name: "John", age: 30 };\nconst arr = [1, 2, 3, 4, 5];\nconst func = function() { return "Hello"; };\n```\n\n## 3. 関数の定義\n\n### 関数宣言\n```javascript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("John")); // "Hello, John!"\n```\n\n### 関数式\n```javascript\nconst greet = function(name) {\n  return `Hello, ${name}!`;\n};\n```\n\n### アロー関数（ES6以降）\n```javascript\n// 基本形\nconst greet = (name) => {\n  return `Hello, ${name}!`;\n};\n\n// 省略形（単一式）\nconst greet = name => `Hello, ${name}!`;\n\n// 複数パラメータ\nconst add = (a, b) => a + b;\n\n// パラメータなし\nconst sayHello = () => \"Hello!\";\n```\n\n## 4. 配列の操作\n\n### 基本的な配列メソッド\n\n#### push / pop\n```javascript\nconst fruits = [\"apple\", \"banana\"];\nfruits.push(\"orange\"); // [\"apple\", \"banana\", \"orange\"]\nconst lastFruit = fruits.pop(); // \"orange\"\n```\n\n#### shift / unshift\n```javascript\nconst numbers = [2, 3, 4];\nnumbers.unshift(1); // [1, 2, 3, 4]\nconst firstNumber = numbers.shift(); // 1\n```\n\n#### map\n```javascript\nconst numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map(num => num * 2);\n// [2, 4, 6, 8, 10]\n```\n\n#### filter\n```javascript\nconst numbers = [1, 2, 3, 4, 5];\nconst evens = numbers.filter(num => num % 2 === 0);\n// [2, 4]\n```\n\n#### reduce\n```javascript\nconst numbers = [1, 2, 3, 4, 5];\nconst sum = numbers.reduce((acc, num) => acc + num, 0);\n// 15\n```\n\n## 5. オブジェクトの操作\n\n### オブジェクトの作成\n```javascript\n// オブジェクトリテラル\nconst person = {\n  name: \"John\",\n  age: 30,\n  greet: function() {\n    return `Hello, I\'m ${this.name}`;\n  }\n};\n\n// コンストラクタ関数\nfunction Person(name, age) {\n  this.name = name;\n  this.age = age;\n}\n\nconst john = new Person(\"John\", 30);\n```\n\n### プロパティのアクセス\n```javascript\nconst person = { name: \"John\", age: 30 };\n\n// ドット記法\nconsole.log(person.name); // \"John\"\n\n// ブラケット記法\nconsole.log(person[\"age\"]); // 30\n\n// 動的なプロパティアクセス\nconst prop = \"name\";\nconsole.log(person[prop]); // \"John\"\n```\n\n### オブジェクトの展開（ES6以降）\n```javascript\nconst person = { name: \"John\", age: 30 };\nconst updatedPerson = { ...person, age: 31 };\n// { name: \"John\", age: 31 }\n```\n\n## 6. 条件分岐\n\n### if文\n```javascript\nconst age = 20;\n\nif (age >= 18) {\n  console.log(\"成人です\");\n} else if (age >= 13) {\n  console.log(\"ティーンエイジャーです\");\n} else {\n  console.log(\"子供です\");\n}\n```\n\n### switch文\n```javascript\nconst day = \"Monday\";\n\nswitch (day) {\n  case \"Monday\":\n    console.log(\"月曜日\");\n    break;\n  case \"Tuesday\":\n    console.log(\"火曜日\");\n    break;\n  default:\n    console.log(\"その他の曜日\");\n}\n```\n\n### 三項演算子\n```javascript\nconst age = 20;\nconst status = age >= 18 ? \"成人\" : \"未成年\";\nconsole.log(status); // \"成人\"\n```\n\n## 7. ループ\n\n### for文\n```javascript\nfor (let i = 0; i < 5; i++) {\n  console.log(i); // 0, 1, 2, 3, 4\n}\n```\n\n### for...of文（配列）\n```javascript\nconst fruits = [\"apple\", \"banana\", \"orange\"];\nfor (const fruit of fruits) {\n  console.log(fruit);\n}\n```\n\n### for...in文（オブジェクト）\n```javascript\nconst person = { name: \"John\", age: 30 };\nfor (const key in person) {\n  console.log(`${key}: ${person[key]}`);\n}\n```\n\n### while文\n```javascript\nlet i = 0;\nwhile (i < 5) {\n  console.log(i);\n  i++;\n}\n```\n\n## 8. エラーハンドリング\n\n### try...catch文\n```javascript\ntry {\n  const result = riskyOperation();\n  console.log(result);\n} catch (error) {\n  console.error(\"エラーが発生しました:\", error.message);\n} finally {\n  console.log(\"処理が完了しました\");\n}\n```\n\n### エラーの投げ方\n```javascript\nfunction divide(a, b) {\n  if (b === 0) {\n    throw new Error(\"ゼロで割ることはできません\");\n  }\n  return a / b;\n}\n```\n\n## 9. まとめ\n\nJavaScriptの基礎を理解することで、より複雑なプログラムを作成できるようになります。\n\n### 重要なポイント\n1. **変数の適切な宣言**（const > let > var）\n2. **データ型の理解**\n3. **関数の使い分け**\n4. **配列・オブジェクトの操作**\n5. **制御構造の活用**\n6. **エラーハンドリング**\n\n### 次のステップ\n- DOM操作\n- 非同期処理（Promise、async/await）\n- ES6+の新機能\n- モジュールシステム\n- フレームワーク（React、Vue.js など）' }
        ]
      }
    ],
    design: [
      {
        id: 13,
        title: 'UIデザインの原則',
        tags: ['design', 'ui', 'principles'],
        createdAt: '2025-07-11',
        updatedAt: '2025-07-11',
        isPinned: false,
        isFavorite: true,
        pages: [
          { id: 1, title: 'UIデザインの原則', content: '# UIデザインの原則\n\n## 1. 一貫性（Consistency）\n\n### 視覚的一貫性\n- **色の統一**: 同じ機能には同じ色を使用\n- **フォントの統一**: 階層に応じたフォントサイズとウェイト\n- **間隔の統一**: 要素間の余白を一定のルールで設定\n\n```css\n/* 例：ボタンの一貫性 */\n.primary-button {\n  background-color: #007bff;\n  color: white;\n  padding: 12px 24px;\n  border-radius: 4px;\n  font-weight: 600;\n}\n\n.secondary-button {\n  background-color: transparent;\n  color: #007bff;\n  border: 2px solid #007bff;\n  padding: 10px 22px; /* ボーダー分を調整 */\n  border-radius: 4px;\n  font-weight: 600;\n}\n```\n\n### 機能的一貫性\n- **操作の統一**: 同じ操作は同じ方法で実行\n- **配置の統一**: 類似機能は同じ場所に配置\n- **表現の統一**: 同じ情報は同じ形式で表示\n\n## 2. フィードバック（Feedback）\n\n### 即座なフィードバック\n- **ホバー効果**: マウスオーバー時の視覚的変化\n- **クリック反応**: ボタンを押した時の視覚的変化\n- **ローディング状態**: 処理中であることを明確に表示\n\n### 状態の伝達\n```javascript\n// 例：ボタンの状態管理\nconst Button = ({ loading, onClick, children }) => {\n  return (\n    <button\n      onClick={onClick}\n      disabled={loading}\n      className={`\n        px-4 py-2 rounded font-medium\n        ${loading \n          ? \'bg-gray-300 cursor-not-allowed\' \n          : \'bg-blue-500 hover:bg-blue-600 active:bg-blue-700\'}\n        text-white transition-colors duration-200\n      `}\n    >\n      {loading ? (\n        <>\n          <Spinner className="mr-2" />\n          処理中...\n        </>\n      ) : (\n        children\n      )}\n    </button>\n  );\n};\n```\n\n## 3. 可用性（Usability）\n\n### アクセシビリティ\n- **キーボードナビゲーション**: Tabキーで操作可能\n- **スクリーンリーダー対応**: 適切なARIAラベル\n- **コントラスト比**: 読みやすい色の組み合わせ\n\n### レスポンシブデザイン\n```css\n/* モバイルファーストアプローチ */\n.container {\n  padding: 16px;\n  max-width: 100%;\n}\n\n/* タブレット */\n@media (min-width: 768px) {\n  .container {\n    padding: 24px;\n    max-width: 768px;\n    margin: 0 auto;\n  }\n}\n\n/* デスクトップ */\n@media (min-width: 1024px) {\n  .container {\n    padding: 32px;\n    max-width: 1024px;\n  }\n}\n```\n\n## 4. 階層構造（Hierarchy）\n\n### 視覚的階層\n- **サイズ**: 重要度に応じたフォントサイズ\n- **色**: 重要な要素は目立つ色を使用\n- **位置**: 重要な要素は上部や中央に配置\n\n### 情報の整理\n```css\n/* 例：タイトルの階層 */\n.title-h1 {\n  font-size: 2.5rem;\n  font-weight: 800;\n  color: #1a1a1a;\n  margin-bottom: 1rem;\n}\n\n.title-h2 {\n  font-size: 2rem;\n  font-weight: 700;\n  color: #333;\n  margin-bottom: 0.75rem;\n}\n\n.title-h3 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  color: #555;\n  margin-bottom: 0.5rem;\n}\n```\n\n## 5. 認知負荷の軽減\n\n### シンプルなインターフェース\n- **必要最小限の要素**: 不要な装飾を排除\n- **直感的な操作**: 学習コストの低い操作方法\n- **明確なラベル**: 分かりやすい文言を使用\n\n### プログレッシブディスクロージャー\n```javascript\n// 例：段階的な情報開示\nconst ExpandableCard = ({ title, children }) => {\n  const [isExpanded, setIsExpanded] = useState(false);\n  \n  return (\n    <div className="border rounded-lg p-4">\n      <div \n        className="flex justify-between items-center cursor-pointer"\n        onClick={() => setIsExpanded(!isExpanded)}\n      >\n        <h3 className="font-semibold">{title}</h3>\n        <ChevronIcon \n          className={`transform transition-transform ${\n            isExpanded ? \'rotate-180\' : \'\'\n          }`} \n        />\n      </div>\n      {isExpanded && (\n        <div className="mt-4 text-gray-600">\n          {children}\n        </div>\n      )}\n    </div>\n  );\n};\n```\n\n## 6. エラー防止と回復\n\n### 入力値の検証\n```javascript\n// 例：リアルタイム検証\nconst EmailInput = ({ onValidationChange }) => {\n  const [email, setEmail] = useState(\'\');\n  const [error, setError] = useState(\'\');\n  \n  const validateEmail = (value) => {\n    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n    if (!emailRegex.test(value)) {\n      setError(\'有効なメールアドレスを入力してください\');\n      onValidationChange(false);\n    } else {\n      setError(\'\');\n      onValidationChange(true);\n    }\n  };\n  \n  return (\n    <div className="mb-4">\n      <input\n        type="email"\n        value={email}\n        onChange={(e) => {\n          setEmail(e.target.value);\n          validateEmail(e.target.value);\n        }}\n        className={`\n          w-full p-3 border rounded-lg\n          ${error ? \'border-red-500\' : \'border-gray-300\'}\n          focus:outline-none focus:ring-2 focus:ring-blue-500\n        `}\n        placeholder="example@email.com"\n      />\n      {error && (\n        <p className="mt-1 text-sm text-red-500">{error}</p>\n      )}\n    </div>\n  );\n};\n```\n\n### 元に戻す機能\n```javascript\n// 例：アンドゥ機能\nconst useUndo = (initialState) => {\n  const [history, setHistory] = useState([initialState]);\n  const [currentIndex, setCurrentIndex] = useState(0);\n  \n  const setState = (newState) => {\n    const newHistory = history.slice(0, currentIndex + 1);\n    newHistory.push(newState);\n    setHistory(newHistory);\n    setCurrentIndex(newHistory.length - 1);\n  };\n  \n  const undo = () => {\n    if (currentIndex > 0) {\n      setCurrentIndex(currentIndex - 1);\n    }\n  };\n  \n  const redo = () => {\n    if (currentIndex < history.length - 1) {\n      setCurrentIndex(currentIndex + 1);\n    }\n  };\n  \n  return {\n    state: history[currentIndex],\n    setState,\n    undo,\n    redo,\n    canUndo: currentIndex > 0,\n    canRedo: currentIndex < history.length - 1\n  };\n};\n```\n\n## 7. パフォーマンス\n\n### 認知的パフォーマンス\n- **レスポンス時間**: 0.1秒以内が理想\n- **ローディング体験**: プログレスバーやスケルトンスクリーン\n- **画像の最適化**: 適切なフォーマットとサイズ\n\n### 技術的パフォーマンス\n```javascript\n// 例：遅延読み込み\nconst LazyImage = ({ src, alt, className }) => {\n  const [isLoaded, setIsLoaded] = useState(false);\n  const [isInView, setIsInView] = useState(false);\n  const imgRef = useRef();\n  \n  useEffect(() => {\n    const observer = new IntersectionObserver(\n      ([entry]) => {\n        if (entry.isIntersecting) {\n          setIsInView(true);\n          observer.disconnect();\n        }\n      },\n      { threshold: 0.1 }\n    );\n    \n    if (imgRef.current) {\n      observer.observe(imgRef.current);\n    }\n    \n    return () => observer.disconnect();\n  }, []);\n  \n  return (\n    <div ref={imgRef} className={`${className} relative`}>\n      {!isLoaded && (\n        <div className="absolute inset-0 bg-gray-200 animate-pulse" />\n      )}\n      {isInView && (\n        <img\n          src={src}\n          alt={alt}\n          onLoad={() => setIsLoaded(true)}\n          className={`${className} transition-opacity duration-300 ${\n            isLoaded ? \'opacity-100\' : \'opacity-0\'\n          }`}\n        />\n      )}\n    </div>\n  );\n};\n```\n\n## 8. 感情的なデザイン\n\n### マイクロインタラクション\n- **ボタンのアニメーション**: 心地よい動きを演出\n- **ページ遷移**: スムーズな画面変化\n- **成功・エラー通知**: 適切な感情を伝える\n\n### ブランドの一貫性\n```css\n/* 例：ブランドカラーの定義 */\n:root {\n  --primary-color: #007bff;\n  --primary-hover: #0056b3;\n  --primary-active: #004085;\n  --secondary-color: #6c757d;\n  --success-color: #28a745;\n  --warning-color: #ffc107;\n  --error-color: #dc3545;\n  --info-color: #17a2b8;\n}\n\n.brand-primary {\n  color: var(--primary-color);\n}\n\n.brand-bg-primary {\n  background-color: var(--primary-color);\n}\n\n.brand-border-primary {\n  border-color: var(--primary-color);\n}\n```\n\n## 9. テストとイテレーション\n\n### A/Bテスト\n```javascript\n// 例：A/Bテストの実装\nconst useABTest = (testName, variants) => {\n  const [variant, setVariant] = useState(null);\n  \n  useEffect(() => {\n    // ユーザーIDや他の要因に基づいてバリアントを決定\n    const selectedVariant = Math.random() < 0.5 ? variants.A : variants.B;\n    setVariant(selectedVariant);\n    \n    // 分析ツールにイベントを送信\n    analytics.track(\'ab_test_assigned\', {\n      test_name: testName,\n      variant: selectedVariant\n    });\n  }, [testName, variants]);\n  \n  return variant;\n};\n\n// 使用例\nconst ButtonTest = () => {\n  const buttonVariant = useABTest(\'cta_button_test\', {\n    A: { text: \'今すぐ始める\', color: \'blue\' },\n    B: { text: \'無料で開始\', color: \'green\' }\n  });\n  \n  if (!buttonVariant) return null;\n  \n  return (\n    <button \n      className={`px-6 py-3 rounded-lg font-semibold text-white\n        ${buttonVariant.color === \'blue\' ? \'bg-blue-600\' : \'bg-green-600\'}\n      `}\n    >\n      {buttonVariant.text}\n    </button>\n  );\n};\n```\n\n## 10. まとめ\n\n### 良いUIデザインの特徴\n1. **使いやすい**: 直感的で学習コストが低い\n2. **一貫している**: 全体を通して統一感がある\n3. **フィードバックがある**: ユーザーの操作に適切に反応\n4. **アクセシブル**: 誰でも使える\n5. **パフォーマンスが良い**: 快適に動作する\n6. **美しい**: 視覚的に魅力的\n\n### 継続的な改善\n- **ユーザーフィードバック**: 実際の使用感を収集\n- **データ分析**: 使用パターンの分析\n- **ユーザビリティテスト**: 定期的な検証\n- **トレンドの把握**: 新しい手法の学習\n\n### 参考リソース\n- **デザインシステム**: Material Design、Apple HIG\n- **アクセシビリティ**: WCAG ガイドライン\n- **パフォーマンス**: Core Web Vitals\n- **ツール**: Figma、Sketch、Adobe XD\n\n優れたUIデザインは、技術的な実装とデザインの知識を組み合わせることで実現できます。常にユーザーの立場に立って考え、継続的に改善していくことが重要です。' }
        ]
      }
    ],
    fiction: [
      {
        id: 14,
        title: '村上春樹「ノルウェイの森」',
        tags: ['book', 'fiction', 'japanese'],
        createdAt: '2025-07-10',
        updatedAt: '2025-07-10',
        isPinned: false,
        isFavorite: false,
        pages: [
          { id: 1, title: '村上春樹「ノルウェイの森」', content: '# 村上春樹「ノルウェイの森」\n\n## 作品概要\n\n### 基本情報\n- **作者**: 村上春樹\n- **出版年**: 1987年\n- **ジャンル**: 恋愛小説、青春小説\n- **舞台**: 1960年代後半の東京\n- **主要テーマ**: 青春、恋愛、死、喪失、成長\n\n### あらすじ\n主人公のワタナベトオルが、大学時代の恋愛と友情を回想する物語。\n親友のキズキの自殺後、その恋人だった直子との複雑な関係、\nそして活発な緑との出会いを通じて、青春の喪失と成長を描く。\n\n## 主要登場人物\n\n### ワタナベトオル\n- **主人公**: 東京の大学生\n- **性格**: 内向的、思慮深い、現実的\n- **特徴**: 読書好き、音楽愛好家\n- **成長**: 恋愛を通じて大人になっていく\n\n### 直子（ナオコ）\n- **ワタナベの恋人**: 美しく繊細な女性\n- **背景**: キズキの恋人だった\n- **問題**: 精神的な病気を患っている\n- **象徴**: 失われた青春、純粋さ\n\n### 緑（ミドリ）\n- **もう一人のヒロイン**: 活発で現実的\n- **性格**: 明るく、率直、生命力に満ちている\n- **役割**: ワタナベに新しい可能性を示す\n- **象徴**: 現実、未来、希望\n\n### キズキ\n- **ワタナベの親友**: 物語開始前に自殺\n- **影響**: 物語全体に大きな影響を与える\n- **象徴**: 失われた青春、死\n\n## 主要テーマ\n\n### 1. 死と喪失\n- **キズキの自殺**: 物語の出発点\n- **直子の死**: 青春の終わり\n- **喪失感**: 大切なものを失う痛み\n- **受容**: 失ったものを受け入れる過程\n\n### 2. 愛と選択\n- **直子への愛**: 過去への愛着\n- **緑への愛**: 未来への愛\n- **選択の重さ**: 人生の分岐点\n- **責任**: 愛することの責任\n\n### 3. 青春と成長\n- **大学時代**: 自由と迷い\n- **自己発見**: 自分を知る過程\n- **大人になること**: 責任を持つこと\n- **ノスタルジア**: 失われた時への憧れ\n\n## 印象的なシーン\n\n### 1. 冒頭の飛行機のシーン\n```\n\"37歳になった今でも、あの草原の風景を思い出すことができる。\"\n```\n- **効果**: 物語への導入\n- **意味**: 記憶の鮮明さ\n- **感情**: ノスタルジア\n\n### 2. 直子の20歳の誕生日\n- **場面**: 二人だけの静かな夜\n- **意味**: 関係の深化\n- **象徴**: 青春の頂点\n\n### 3. 阿美寮でのシーン\n- **場所**: 直子が療養する施設\n- **雰囲気**: 静寂と癒し\n- **意味**: 現実逃避と向き合い\n\n### 4. 緑との出会い\n- **対比**: 直子との関係との違い\n- **活気**: 生命力の象徴\n- **可能性**: 新しい未来\n\n### 5. 直子との別れ\n- **悲しみ**: 避けられない別れ\n- **成長**: 受け入れることの学び\n- **決断**: 人生の選択\n\n## 文学的技法\n\n### 語り手の視点\n- **一人称**: ワタナベの回想\n- **時間軸**: 現在から過去を振り返る\n- **距離感**: 時間による客観性\n\n### 象徴的な表現\n- **音楽**: 感情の表現手段\n- **自然**: 心情の反映\n- **色彩**: 感情の色付け\n\n### 対比の構造\n- **直子 vs 緑**: 過去と未来\n- **死 vs 生**: 喪失と希望\n- **静 vs 動**: 内向と外向\n\n## 読書メモ\n\n### 個人的な感想\n- **共感**: 青春の迷いと成長に共感\n- **美しさ**: 文章の美しさに感動\n- **哀しみ**: 直子の運命に心を痛める\n- **希望**: 緑との関係に希望を見る\n\n### 印象に残った名言\n\n#### 1. \"死は生の対極にあるのではない。生の一部として存在している。\"\n- **意味**: 死への向き合い方\n- **哲学**: 生と死の関係性\n\n#### 2. \"僕は君を愛しているし、君がいなければやっていけない。\"\n- **場面**: ワタナベから緑への告白\n- **意味**: 選択の決断\n\n#### 3. \"完璧を求めるのではなく、理解を求めるべきだ。\"\n- **教訓**: 人間関係の本質\n- **成長**: 大人になることの学び\n\n### 現代的な意義\n- **普遍性**: 青春の悩みは時代を超える\n- **心理描写**: 内面の繊細な描写\n- **恋愛観**: 現代の恋愛関係への示唆\n\n## 関連作品\n\n### 村上春樹の他の作品\n- **「海辺のカフカ」**: 成長と自己発見\n- **「ねじまき鳥クロニクル」**: 現実と非現実\n- **「1Q84」**: 愛と運命\n\n### 同時代の作品\n- **「太陽の季節」**: 石原慎太郎\n- **「青春の蹉跌」**: 石川達三\n\n## 評価\n\n### 文学的評価\n- **文体**: 洗練された文章\n- **構成**: 巧妙な物語構造\n- **テーマ**: 普遍的なテーマ\n- **影響**: 多くの読者に影響を与えた\n\n### 個人的評価\n- **読みやすさ**: ★★★★★\n- **感動度**: ★★★★★\n- **文学性**: ★★★★★\n- **再読価値**: ★★★★★\n\n### 推薦度\n- **青春小説好き**: 必読\n- **恋愛小説好き**: 強く推薦\n- **文学初心者**: 入門書として最適\n- **人生に悩む人**: 示唆に富む\n\n## 読後の課題\n\n### 深く考えたいこと\n1. **愛とは何か**: 直子への愛と緑への愛の違い\n2. **成長とは何か**: 大人になることの意味\n3. **選択の重さ**: 人生の分岐点での決断\n4. **記憶の役割**: 過去を振り返ることの意味\n\n### 再読のポイント\n- **細部の表現**: 繊細な心理描写\n- **象徴の意味**: 隠された意味を探る\n- **構造の分析**: 物語の構成を理解\n\n## まとめ\n\n「ノルウェイの森」は、青春の美しさと哀しさを描いた不朽の名作。\n愛と死、選択と成長という普遍的なテーマを通じて、\n人間の深い感情と心の動きを繊細に描写している。\n\n読むたびに新しい発見があり、人生の様々な段階で\n異なる読み方ができる作品として、多くの人に愛され続けている。\n\n特に、恋愛や人間関係で悩む人、\n人生の選択に迷う人にとって、\n深い共感と示唆を与えてくれる作品である。' }
        ]
      }
    ],
    nonfiction: [
      {
        id: 15,
        title: '「FACTFULNESS」読書メモ',
        tags: ['book', 'nonfiction', 'data'],
        createdAt: '2025-07-09',
        updatedAt: '2025-07-09',
        isPinned: true,
        isFavorite: true,
        pages: [
          { id: 1, title: '「FACTFULNESS」読書メモ', content: '# 「FACTFULNESS」読書メモ\n\n## 書籍概要\n\n### 基本情報\n- **原題**: Factfulness: Ten Reasons We\'re Wrong About the World – and Why Things Are Better Than You Think\n- **著者**: ハンス・ロスリング（Hans Rosling）\n- **共著者**: オーラ・ロスリング、アンナ・ロスリング・ロンランド\n- **出版年**: 2018年\n- **翻訳**: 上杉周作、関美和\n- **ページ数**: 約400ページ\n\n### 本書の目的\nデータに基づいて世界を正しく見る方法を教え、\n私たちが持つ思い込みや偏見を正すこと。\n\n## 中心的なメッセージ\n\n### 世界は思っているより良くなっている\n- **事実**: 多くの指標で世界は改善されている\n- **認識**: 多くの人は悲観的に捉えている\n- **原因**: メディアや本能による歪み\n\n### データリテラシーの重要性\n- **情報の見方**: 統計データを正しく解釈する\n- **思考の訓練**: 感情ではなく事実で判断する\n- **継続的学習**: 常に新しい情報を取り入れる\n\n## 10の思い込み（本能）\n\n### 1. 分断本能（Gap Instinct）\n\n#### 概要\n世界を「私たち」と「彼ら」の2つに分けて考えがち\n\n#### 現実\n- 実際は連続的な分布\n- 中間層が最も多い\n- 極端な例は少数\n\n#### 対策\n- **平均を見る**: 全体の分布を確認\n- **重複を探す**: 共通点を見つける\n- **大多数を見る**: 極端な例に惑わされない\n\n#### 具体例\n```\n所得分布（世界人口）:\n- 低所得（1日2ドル未満）: 9%\n- 中所得（1日2-32ドル）: 75%\n- 高所得（1日32ドル以上）: 16%\n```\n\n### 2. ネガティブ本能（Negativity Instinct）\n\n#### 概要\n悪いニュースに注目し、改善を見落とす傾向\n\n#### 現実\n- 多くの指標で世界は改善\n- 悪いニュースほど報道される\n- 緩やかな改善は目立たない\n\n#### 対策\n- **改善を期待する**: 悪いと改善は両立する\n- **長期的視点**: 短期的な変動に惑わされない\n- **データを見る**: 感情的な判断を避ける\n\n#### 具体例\n```\n世界の改善例:\n- 極度の貧困率: 1990年 37% → 2015年 9%\n- 子どもの死亡率: 1990年 12% → 2016年 4%\n- 識字率: 1980年 66% → 2014年 85%\n```\n\n### 3. 直線本能（Straight Line Instinct）\n\n#### 概要\n直線的な変化を仮定し、曲線を見落とす\n\n#### 現実\n- 多くの現象は S字カーブ\n- 指数関数的変化\n- 限界や飽和点がある\n\n#### 対策\n- **様々な形を覚える**: 直線以外のパターンを知る\n- **制約を考える**: 物理的・論理的制限\n- **データを見る**: 推測より実際のデータ\n\n### 4. 恐怖本能（Fear Instinct）\n\n#### 概要\n恐ろしいものに過度に注意を向ける\n\n#### 現実\n- 恐怖と実際のリスクは比例しない\n- 感情的な判断は不正確\n- メディアは恐怖を煽る\n\n#### 対策\n- **冷静に分析**: 感情と事実を分ける\n- **リスクを計算**: 確率的に考える\n- **対策を講じる**: 心配より行動\n\n### 5. 過大視本能（Size Instinct）\n\n#### 概要\n単独の数字に惑わされ、比較を忘れる\n\n#### 現実\n- 数字は文脈で意味が変わる\n- 比較なしでは判断できない\n- 割合や比率が重要\n\n#### 対策\n- **比較する**: 他の数字と比べる\n- **比率を使う**: 絶対数より相対数\n- **分母を確認**: 全体の大きさを把握\n\n### 6. 一般化本能（Generalization Instinct）\n\n#### 概要\n少数の例から全体を判断する\n\n#### 現実\n- 例外的な事例が目立つ\n- カテゴリー内の多様性\n- ステレオタイプの危険性\n\n#### 対策\n- **違いを探す**: 同じカテゴリー内の違い\n- **共通点を探す**: 異なるカテゴリー間の共通点\n- **大多数を見る**: 例外ではなく一般的なケース\n\n### 7. 宿命本能（Destiny Instinct）\n\n#### 概要\n運命や文化で決まっていると考える\n\n#### 現実\n- 多くのことは変化する\n- 文化や価値観も進化\n- 教育や環境の影響\n\n#### 対策\n- **変化を探す**: 小さな変化も見逃さない\n- **知識を更新**: 古い知識を見直す\n- **例外を探す**: 「普通」と違う例\n\n### 8. 単純化本能（Single Perspective Instinct）\n\n#### 概要\n一つの視点や解決策に固執する\n\n#### 現実\n- 複雑な問題には複数の要因\n- 万能な解決策はない\n- 専門家も限界がある\n\n#### 対策\n- **多角的視点**: 様々な角度から見る\n- **専門家の限界**: 専門外の意見に注意\n- **複雑さを受け入れる**: 簡単な答えを求めない\n\n### 9. 犯人捜し本能（Blame Instinct）\n\n#### 概要\n悪いことには犯人がいると考える\n\n#### 現実\n- システムの問題が多い\n- 複数の要因が重なる\n- 個人の責任だけではない\n\n#### 対策\n- **システムを見る**: 構造的な問題を探す\n- **複数の要因**: 一つの原因に絞らない\n- **英雄を探さない**: 万能な解決者はいない\n\n### 10. 焦り本能（Urgency Instinct）\n\n#### 概要\n今すぐ行動しないと手遅れになると考える\n\n#### 現実\n- 緊急性は判断を鈍らせる\n- 時間をかけた方が良い解決策\n- 焦りは間違いを生む\n\n#### 対策\n- **深呼吸**: 一度立ち止まって考える\n- **データを要求**: 感情的な議論を避ける\n- **副作用を考える**: 急いだ行動のリスク\n\n## 実践的な教訓\n\n### データの見方\n\n#### 基本的な統計リテラシー\n- **平均値**: 全体の傾向を把握\n- **中央値**: 真ん中の値\n- **分散**: ばらつきの程度\n- **相関関係**: 因果関係ではない\n\n#### グラフの読み方\n```\n注意すべきポイント:\n- 軸の範囲と単位\n- 時系列データの期間\n- 母集団の大きさ\n- データの出典と信頼性\n```\n\n### 情報収集の方法\n\n#### 信頼できる情報源\n- **国際機関**: WHO、世界銀行、UNESCO\n- **政府統計**: 各国の統計局\n- **学術研究**: 査読済みの論文\n- **NGO**: 透明性の高い団体\n\n#### 情報の検証\n- **複数の情報源**: 一つの情報だけに依存しない\n- **更新日**: 最新のデータかどうか\n- **方法論**: データの収集方法\n- **利益相反**: 情報源の動機\n\n### 日常生活での応用\n\n#### ニュースの見方\n- **感情的な反応**: 一度冷静になる\n- **背景情報**: 文脈を理解する\n- **データの確認**: 数字の根拠を調べる\n- **長期的視点**: 短期的な変動に惑わされない\n\n#### 意思決定への応用\n- **事実の確認**: 思い込みを疑う\n- **複数の選択肢**: 一つの解決策に固執しない\n- **リスクの評価**: 感情的な判断を避ける\n- **継続的な学習**: 新しい情報を取り入れる\n\n## 世界の現状（主要なデータ）\n\n### 健康・医療\n```\n平均寿命（世界）:\n- 1960年: 52歳\n- 2016年: 72歳\n\n子どもの死亡率（5歳未満）:\n- 1990年: 12.6%\n- 2016年: 4.1%\n\n予防接種率（はしか）:\n- 1980年: 16%\n- 2016年: 85%\n```\n\n### 教育\n```\n識字率（世界）:\n- 1980年: 66%\n- 2014年: 85%\n\n初等教育就学率:\n- 1970年: 67%\n- 2014年: 91%\n\n男女格差（教育）:\n- 1970年: 大きな格差\n- 2014年: 大幅に改善\n```\n\n### 経済\n```\n極度の貧困率（1日1.90ドル未満）:\n- 1990年: 37%\n- 2015年: 9%\n\n中間所得層の人口:\n- 1980年: 少数\n- 2016年: 世界人口の大部分\n```\n\n### 環境\n```\n森林面積:\n- 減少傾向だが、速度は鈍化\n- 一部の地域では増加\n\n再生可能エネルギー:\n- 急速に拡大中\n- コストも大幅に削減\n```\n\n## 個人的な学び\n\n### 思考の変化\n- **悲観的な見方**: データで客観的に判断\n- **複雑な問題**: 単純な答えを求めない\n- **情報の評価**: 感情的な反応を控える\n- **継続的学習**: 知識を更新し続ける\n\n### 実践していること\n- **ニュースの見方**: 感情的な反応を避ける\n- **データの確認**: 数字の根拠を調べる\n- **多角的視点**: 様々な角度から考える\n- **長期的視点**: 短期的な変動に惑わされない\n\n### 今後の課題\n- **統計リテラシー**: さらに向上させる\n- **情報源の多様化**: 偏った情報を避ける\n- **批判的思考**: 常に疑問を持つ\n- **知識の共有**: 他の人にも伝える\n\n## 推薦と評価\n\n### 読むべき人\n- **ビジネスパーソン**: 意思決定の質向上\n- **教育者**: 教育内容の見直し\n- **政策関係者**: 政策立案の参考\n- **一般読者**: 世界観の更新\n\n### 本書の価値\n- **実用性**: 日常生活に直接応用可能\n- **科学的根拠**: データに基づく議論\n- **読みやすさ**: 一般読者向けに書かれている\n- **影響力**: 多くの人の考え方を変える\n\n### 個人的評価\n- **内容の質**: ★★★★★\n- **読みやすさ**: ★★★★☆\n- **実用性**: ★★★★★\n- **影響度**: ★★★★★\n\n## 関連図書\n\n### 同様のテーマ\n- **「統計でウソをつく法」**: ダレル・ハフ\n- **「ファスト&スロー」**: ダニエル・カーネマン\n- **「予想どおりに不合理」**: ダン・アリエリー\n\n### データ分析関連\n- **「統計学が最強の学問である」**: 西内啓\n- **「データサイエンティストの仕事」**: 各種\n\n## まとめ\n\n「FACTFULNESS」は、データに基づいて世界を正しく見るための\n実践的なガイドブック。10の思い込みを理解し、\nそれらを克服する方法を学ぶことで、\nより正確で客観的な判断ができるようになる。\n\n現代の情報過多の時代において、\n正しい情報を見極める能力は不可欠。\nこの本で学んだ考え方を日常生活や仕事に活かし、\nより良い意思決定をしていきたい。\n\n特に、感情的な反応を避け、データに基づいて判断する習慣を\n身につけることが重要だと感じた。' }
        ]
      }
    ]
  };

  const [selectedWorkspace, setSelectedWorkspace] = useState('work');
  const [selectedNotebook, setSelectedNotebook] = useState('projects');
  const [selectedSubFolder, setSelectedSubFolder] = useState('frontend');
  const [selectedNote, setSelectedNote] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [expandedNotebooks, setExpandedNotebooks] = useState(['projects', 'meetings', 'diary', 'recipes', 'tech', 'books']);
  const [expandedSubFolders, setExpandedSubFolders] = useState(['frontend', 'backend', 'daily', 'japanese', 'programming', 'fiction']);
  const [showMindMap, setShowMindMap] = useState(false);
  const [mindMapZoom, setMindMapZoom] = useState(1);
  const [mindMapLevel, setMindMapLevel] = useState('workspace');
  const [mindMapFocus, setMindMapFocus] = useState(null);
  const [mindMapHistory, setMindMapHistory] = useState([]);
  const [previewNote, setPreviewNote] = useState(null);
  const [previewPage, setPreviewPage] = useState(0);
  const [notesData, setNotesData] = useState(notesInitial);
  const [subFoldersData, setSubFoldersData] = useState(subFoldersInitial);
  const [showAddFolderDialog, setShowAddFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editableTitle, setEditableTitle] = useState('');
  const [editablePageTitle, setEditablePageTitle] = useState('');
  const [editableContent, setEditableContent] = useState('');
  
  // マインドマップのプレビュー用編集状態
  const [previewEditableTitle, setPreviewEditableTitle] = useState('');
  const [previewEditablePageTitle, setPreviewEditablePageTitle] = useState('');
  const [previewEditableContent, setPreviewEditableContent] = useState('');

  // currentPageDataをここで定義
  const currentPageData = selectedNote?.pages[currentPage];

  // ノートが変更されたときに編集可能なコンテンツを同期
  useEffect(() => {
    if (selectedNote) {
      setEditableTitle(selectedNote.title || '');
    }
  }, [selectedNote]);

  useEffect(() => {
    if (selectedNote && selectedNote.pages[currentPage]) {
      const pageData = selectedNote.pages[currentPage];
      setEditableContent(pageData.content || '');
      setEditablePageTitle(pageData.title || '');
    }
  }, [selectedNote, currentPage]);

  // プレビューノートが変更されたときに編集可能なコンテンツを同期
  useEffect(() => {
    if (previewNote) {
      setPreviewEditableTitle(previewNote.title || '');
    }
  }, [previewNote]);

  useEffect(() => {
    if (previewNote && previewNote.pages && previewNote.pages[previewPage]) {
      const pageData = previewNote.pages[previewPage];
      setPreviewEditableContent(pageData.content || '');
      setPreviewEditablePageTitle(pageData.title || '');
    }
  }, [previewNote, previewPage]);

  const handleTitleChange = (newTitle) => {
    setEditableTitle(newTitle);
    
    if (selectedNote) {
      setNotesData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(folderId => {
          newData[folderId] = newData[folderId].map(note => 
            note.id === selectedNote.id 
              ? {
                  ...note,
                  title: newTitle,
                  updatedAt: new Date().toISOString().split('T')[0]
                }
              : note
          );
        });
        return newData;
      });
    }
  };

  const handlePageTitleChange = (newPageTitle) => {
    setEditablePageTitle(newPageTitle);
    
    if (selectedNote && selectedNote.pages[currentPage]) {
      setNotesData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(folderId => {
          newData[folderId] = newData[folderId].map(note => 
            note.id === selectedNote.id 
              ? {
                  ...note,
                  pages: note.pages.map(page => 
                    page.id === selectedNote.pages[currentPage].id 
                      ? { ...page, title: newPageTitle }
                      : page
                  ),
                  updatedAt: new Date().toISOString().split('T')[0]
                }
              : note
          );
        });
        return newData;
      });
    }
  };

  const handleContentChange = (newContent) => {
    setEditableContent(newContent);
    
    // 実際のアプリでは、ここでnotesDataを更新
    if (selectedNote && selectedNote.pages[currentPage]) {
      setNotesData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(folderId => {
          newData[folderId] = newData[folderId].map(note => 
            note.id === selectedNote.id 
              ? {
                  ...note,
                  pages: note.pages.map(page => 
                    page.id === selectedNote.pages[currentPage].id 
                      ? { ...page, content: newContent }
                      : page
                  ),
                  updatedAt: new Date().toISOString().split('T')[0]
                }
              : note
          );
        });
        return newData;
      });
    }
  };

  // プレビューエリアでの編集ハンドラー
  const handlePreviewTitleChange = (newTitle) => {
    setPreviewEditableTitle(newTitle);
    
    if (previewNote) {
      setNotesData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(folderId => {
          newData[folderId] = newData[folderId].map(note => 
            note.id === previewNote.id 
              ? {
                  ...note,
                  title: newTitle,
                  updatedAt: new Date().toISOString().split('T')[0]
                }
              : note
          );
        });
        return newData;
      });
      
      // previewNoteの状態も更新
      setPreviewNote(prev => prev ? ({
        ...prev,
        title: newTitle,
        updatedAt: new Date().toISOString().split('T')[0]
      }) : null);
    }
  };

  const handlePreviewPageTitleChange = (newPageTitle) => {
    setPreviewEditablePageTitle(newPageTitle);
    
    if (previewNote && previewNote.pages && previewNote.pages[previewPage]) {
      setNotesData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(folderId => {
          newData[folderId] = newData[folderId].map(note => 
            note.id === previewNote.id 
              ? {
                  ...note,
                  pages: note.pages.map(page => 
                    page.id === previewNote.pages[previewPage].id 
                      ? { ...page, title: newPageTitle }
                      : page
                  ),
                  updatedAt: new Date().toISOString().split('T')[0]
                }
              : note
          );
        });
        return newData;
      });
      
      // previewNoteの状態も更新
      setPreviewNote(prev => prev ? ({
        ...prev,
        pages: prev.pages.map(page => 
          page.id === prev.pages[previewPage].id 
            ? { ...page, title: newPageTitle }
            : page
        ),
        updatedAt: new Date().toISOString().split('T')[0]
      }) : null);
    }
  };

  const handlePreviewContentChange = (newContent) => {
    setPreviewEditableContent(newContent);
    
    if (previewNote && previewNote.pages && previewNote.pages[previewPage]) {
      setNotesData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(folderId => {
          newData[folderId] = newData[folderId].map(note => 
            note.id === previewNote.id 
              ? {
                  ...note,
                  pages: note.pages.map(page => 
                    page.id === previewNote.pages[previewPage].id 
                      ? { ...page, content: newContent }
                      : page
                  ),
                  updatedAt: new Date().toISOString().split('T')[0]
                }
              : note
          );
        });
        return newData;
      });
      
      // previewNoteの状態も更新
      setPreviewNote(prev => prev ? ({
        ...prev,
        pages: prev.pages.map(page => 
          page.id === prev.pages[previewPage].id 
            ? { ...page, content: newContent }
            : page
        ),
        updatedAt: new Date().toISOString().split('T')[0]
      }) : null);
    }
  };

  // サンプルデータ
  const workspaces = [
    { id: 'work', name: 'Work', icon: '💼', color: 'blue' },
    { id: 'personal', name: 'Personal', icon: '🏠', color: 'green' },
    { id: 'learning', name: 'Learning', icon: '📚', color: 'purple' }
  ];

  const notebooks = {
    work: [
      { id: 'projects', name: 'プロジェクト', count: 12, color: 'blue' },
      { id: 'meetings', name: '会議記録', count: 8, color: 'green' },
      { id: 'ideas', name: 'アイデア', count: 15, color: 'yellow' }
    ],
    personal: [
      { id: 'diary', name: '日記', count: 30, color: 'pink' },
      { id: 'recipes', name: 'レシピ', count: 25, color: 'orange' }
    ],
    learning: [
      { id: 'tech', name: 'Tech Notes', count: 18, color: 'purple' },
      { id: 'books', name: '読書メモ', count: 22, color: 'indigo' }
    ]
  };

  const allTags = [
    // Work tags
    { name: 'urgent', color: 'red', count: 3 },
    { name: 'design', color: 'blue', count: 5 },
    { name: 'react', color: 'cyan', count: 8 },
    { name: 'api', color: 'green', count: 4 },
    { name: 'backend', color: 'gray', count: 6 },
    { name: 'database', color: 'purple', count: 3 },
    { name: 'meeting', color: 'orange', count: 12 },
    { name: 'weekly', color: 'yellow', count: 8 },
    { name: 'css', color: 'pink', count: 4 },
    { name: 'animation', color: 'indigo', count: 2 },
    { name: 'frontend', color: 'teal', count: 5 },
    // Personal tags
    { name: 'diary', color: 'pink', count: 4 },
    { name: 'daily', color: 'purple', count: 3 },
    { name: 'reflection', color: 'indigo', count: 2 },
    { name: 'recipe', color: 'orange', count: 6 },
    { name: 'japanese', color: 'red', count: 3 },
    { name: 'western', color: 'blue', count: 2 },
    { name: 'chicken', color: 'yellow', count: 1 },
    { name: 'pasta', color: 'green', count: 1 },
    // Learning tags
    { name: 'programming', color: 'green', count: 5 },
    { name: 'javascript', color: 'yellow', count: 3 },
    { name: 'basics', color: 'gray', count: 2 },
    { name: 'ui', color: 'blue', count: 4 },
    { name: 'principles', color: 'purple', count: 2 },
    { name: 'book', color: 'brown', count: 8 },
    { name: 'fiction', color: 'pink', count: 3 },
    { name: 'nonfiction', color: 'indigo', count: 4 },
    { name: 'data', color: 'cyan', count: 2 }
  ];

  // 最近のアクティビティ
  const recentActivity = [
    { action: 'edited', note: 'React コンポーネント設計', folder: 'フロントエンド', page: 'ベストプラクティス', time: '2分前' },
    { action: 'created', note: 'UIデザインの原則', folder: 'デザイン', page: '新規ページ', time: '1時間前' },
    { action: 'tagged', note: '今週の振り返り', folder: '振り返り', page: '', time: '2時間前' },
    { action: 'pinned', note: '「FACTFULNESS」読書メモ', folder: 'ノンフィクション', page: '', time: '3時間前' },
    { action: 'edited', note: '親子丼のレシピ', folder: '和食', page: '', time: '4時間前' }
  ];

  // フィルタリング済みのノート
  const filteredNotes = useMemo(() => {
    const currentNotes = notesData[selectedSubFolder] || [];
    return currentNotes.filter(note => {
      const searchText = searchQuery.toLowerCase();
      const matchesSearch = note.title.toLowerCase().includes(searchText) ||
                           note.pages.some(page => 
                             page.title.toLowerCase().includes(searchText) ||
                             page.content.toLowerCase().includes(searchText)
                           );
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.some(tag => note.tags.includes(tag));
      return matchesSearch && matchesTags;
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [notesData, selectedSubFolder, searchQuery, selectedTags]);

  // マインドマップのデータ構造を生成（階層レベルに応じて）
  const generateMindMapData = () => {
    const currentWorkspace = workspaces.find(w => w.id === selectedWorkspace);
    const currentNotebooks = notebooks[selectedWorkspace] || [];
    
    // ワークスペースレベル：ワークスペースとノートブックのみ表示
    if (mindMapLevel === 'workspace') {
      return {
        id: 'workspace',
        name: currentWorkspace?.name || 'Workspace',
        type: 'workspace',
        color: currentWorkspace?.color || 'gray',
        icon: currentWorkspace?.icon || '📁',
        x: 600,
        y: 200,
        children: currentNotebooks.map((notebook, nbIndex) => ({
          id: notebook.id,
          name: notebook.name,
          type: 'notebook',
          color: notebook.color,
          count: notebook.count,
          x: 200 + nbIndex * 300,
          y: 400,
          children: []
        }))
      };
    }
    
    // ノートブックレベル：選択されたノートブックとそのサブフォルダ表示
    if (mindMapLevel === 'notebook' && mindMapFocus) {
      const focusedNotebook = currentNotebooks.find(nb => nb.id === mindMapFocus);
      const notebookSubFolders = subFoldersData[mindMapFocus] || [];
      
      return {
        id: mindMapFocus,
        name: focusedNotebook?.name || 'Notebook',
        type: 'notebook',
        color: focusedNotebook?.color || 'blue',
        x: 600,
        y: 200,
        children: notebookSubFolders.map((subFolder, sfIndex) => ({
          id: subFolder.id,
          name: subFolder.name,
          type: 'subfolder',
          color: subFolder.color,
          count: subFolder.count,
          x: 200 + sfIndex * 250,
          y: 400,
          children: []
        }))
      };
    }
    
    // サブフォルダレベル：選択されたサブフォルダとそのノート表示
    if (mindMapLevel === 'subfolder' && mindMapFocus) {
      const focusedSubFolder = Object.values(subFoldersData).flat().find(sf => sf.id === mindMapFocus);
      const subFolderNotes = notesData[mindMapFocus] || [];
      
      return {
        id: mindMapFocus,
        name: focusedSubFolder?.name || 'SubFolder',
        type: 'subfolder',
        color: focusedSubFolder?.color || 'green',
        x: 600,
        y: 150,
        children: subFolderNotes.map((note, noteIndex) => ({
          id: note.id,
          name: note.title,
          type: 'note',
          color: note.isPinned ? 'blue' : 'gray',
          isPinned: note.isPinned,
          isFavorite: note.isFavorite,
          pageCount: note.pages.length,
          tags: note.tags,
          x: 150 + noteIndex * 200,
          y: 350,
          children: []
        }))
      };
    }
    
    // ノートレベル：選択されたノートとそのページ表示
    if (mindMapLevel === 'note' && mindMapFocus) {
      const allNotes = Object.values(notesData).flat();
      const focusedNote = allNotes.find(note => note.id === mindMapFocus);
      
      if (!focusedNote) return null;
      
      return {
        id: mindMapFocus,
        name: focusedNote.title,
        type: 'note',
        color: focusedNote.isPinned ? 'blue' : 'gray',
        isPinned: focusedNote.isPinned,
        isFavorite: focusedNote.isFavorite,
        x: 600,
        y: 150,
        children: focusedNote.pages.map((page, pageIndex) => ({
          id: page.id,
          name: page.title,
          type: 'page',
          x: 200 + pageIndex * 200,
          y: 350
        }))
      };
    }
    
    return null;
  };

  const mindMapData = generateMindMapData();

  // SVGの線を描画するヘルパー関数
  const drawConnection = (from, to, key) => (
    <line
      key={key}
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="#e5e7eb"
      strokeWidth="2"
      className="transition-all duration-300"
    />
  );

  const toggleNotebook = (notebookId) => {
    setExpandedNotebooks(prev => 
      prev.includes(notebookId) 
        ? prev.filter(id => id !== notebookId)
        : [...prev, notebookId]
    );
  };

  // ワークスペース切り替え時の処理
  const handleWorkspaceChange = (workspaceId) => {
    setSelectedWorkspace(workspaceId);
    
    // 各ワークスペースのデフォルト選択を設定
    const defaultSelections = {
      work: { notebook: 'projects', subfolder: 'frontend' },
      personal: { notebook: 'diary', subfolder: 'daily' },
      learning: { notebook: 'tech', subfolder: 'programming' }
    };
    
    const defaults = defaultSelections[workspaceId];
    if (defaults) {
      setSelectedNotebook(defaults.notebook);
      setSelectedSubFolder(defaults.subfolder);
    }
    
    // 選択されたノートをクリア
    setSelectedNote(null);
  };

  const toggleSubFolder = (subFolderId) => {
    setExpandedSubFolders(prev => 
      prev.includes(subFolderId) 
        ? prev.filter(id => id !== subFolderId)
        : [...prev, subFolderId]
    );
  };

  const toggleTag = (tagName) => {
    setSelectedTags(prev => 
      prev.includes(tagName)
        ? prev.filter(tag => tag !== tagName)
        : [...prev, tagName]
    );
  };

  const selectNote = (note) => {
    setSelectedNote(note);
    setCurrentPage(0);
    // 編集可能なコンテンツをリセット
    setEditableTitle(note.title || '');
    setEditablePageTitle(note.pages[0]?.title || '');
    setEditableContent(note.pages[0]?.content || '');
  };

  // プレビューノートを選択してメインエディタに移動
  const selectPreviewNote = (note, pageIndex = 0) => {
    setSelectedNote(note);
    setCurrentPage(pageIndex);
    // 編集可能なコンテンツをリセット
    setEditableTitle(note.title || '');
    setEditablePageTitle(note.pages[pageIndex]?.title || '');
    setEditableContent(note.pages[pageIndex]?.content || '');
  };

  const addNewPage = () => {
    if (!selectedNote) return;
    
    const newPage = {
      id: selectedNote.pages.length + 1,
      title: `ページ ${selectedNote.pages.length + 1}`,
      content: ''
    };
  };

  // 新しいノートを追加
  const addNewNote = (targetSubFolder = null) => {
    const subFolderId = targetSubFolder || selectedSubFolder;
    if (!subFolderId) return;
    
    const newNote = {
      id: Date.now(), // 簡単なID生成
      title: '新しいノート',
      tags: [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      isPinned: false,
      isFavorite: false,
      pages: [
        {
          id: 1,
          title: 'ページ 1',
          content: ''
        }
      ]
    };
    
    // stateを更新してノートを追加
    setNotesData(prev => ({
      ...prev,
      [subFolderId]: [...(prev[subFolderId] || []), newNote]
    }));
    
    // サブフォルダのカウントを更新
    setSubFoldersData(prev => {
      const newData = { ...prev };
      Object.keys(newData).forEach(notebookId => {
        newData[notebookId] = newData[notebookId].map(folder => 
          folder.id === subFolderId 
            ? { ...folder, count: folder.count + 1 }
            : folder
        );
      });
      return newData;
    });
    
    // 新しいノートを選択
    setSelectedSubFolder(subFolderId);
    selectNote(newNote);
  };

  // 新しいサブフォルダを追加
  const addNewSubFolder = () => {
    if (!selectedNotebook) {
      console.error('ノートブックが選択されていません');
      return;
    }
    
    setShowAddFolderDialog(true);
  };

  const confirmAddFolder = () => {
    if (!newFolderName.trim()) {
      alert('フォルダ名を入力してください');
      return;
    }
    
    const newSubFolder = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      count: 0,
      color: newFolderColor
    };
    
    // stateを更新してサブフォルダを追加
    setSubFoldersData(prev => ({
      ...prev,
      [selectedNotebook]: [...(prev[selectedNotebook] || []), newSubFolder]
    }));
    
    // 新しいフォルダ用の空のノート配列を作成
    setNotesData(prev => ({
      ...prev,
      [newSubFolder.id]: []
    }));
    
    // 新しいフォルダを選択
    setSelectedSubFolder(newSubFolder.id);
    
    // ダイアログを閉じて入力をリセット
    setShowAddFolderDialog(false);
    setNewFolderName('');
    setNewFolderColor('gray');
    
    console.log('新しいフォルダが作成されました:', newSubFolder);
  };

  const cancelAddFolder = () => {
    setShowAddFolderDialog(false);
    setNewFolderName('');
    setNewFolderColor('gray');
  };

  const folderColors = [
    { name: 'gray', label: 'グレー', bg: 'bg-gray-100', text: 'text-gray-600' },
    { name: 'blue', label: 'ブルー', bg: 'bg-blue-100', text: 'text-blue-600' },
    { name: 'green', label: 'グリーン', bg: 'bg-green-100', text: 'text-green-600' },
    { name: 'purple', label: 'パープル', bg: 'bg-purple-100', text: 'text-purple-600' },
    { name: 'orange', label: 'オレンジ', bg: 'bg-orange-100', text: 'text-orange-600' },
    { name: 'pink', label: 'ピンク', bg: 'bg-pink-100', text: 'text-pink-600' },
    { name: 'red', label: 'レッド', bg: 'bg-red-100', text: 'text-red-600' },
    { name: 'yellow', label: 'イエロー', bg: 'bg-yellow-100', text: 'text-yellow-600' }
  ];

  // ノードをクリックしたときの処理
  const handleNodeClick = (node) => {
    if (node.type === 'workspace') {
      return;
    }
    
    if (node.type === 'notebook') {
      setMindMapHistory(prev => [...prev, { level: mindMapLevel, focus: mindMapFocus }]);
      setMindMapLevel('notebook');
      setMindMapFocus(node.id);
      setSelectedNotebook(node.id);
      setPreviewNote(null); // プレビューをクリア
    } else if (node.type === 'subfolder') {
      setMindMapHistory(prev => [...prev, { level: mindMapLevel, focus: mindMapFocus }]);
      setMindMapLevel('subfolder');
      setMindMapFocus(node.id);
      setSelectedSubFolder(node.id);
      setPreviewNote(null); // プレビューをクリア
    } else if (node.type === 'note') {
      // ノートの場合はプレビューエリアに表示
      console.log('ノートをクリックしました:', node);
      
      const allNotes = Object.values(notesData).flat();
      const noteData = allNotes.find(n => n.id === node.id);
      console.log('見つけたノートデータ:', noteData);
      
      if (noteData && noteData.pages && noteData.pages.length > 0) {
        // プレビューエリアでノートを表示
        setPreviewNote(noteData);
        setPreviewPage(0);
        
        // プレビューエリアの編集状態を初期化
        setPreviewEditableTitle(noteData.title || '');
        setPreviewEditablePageTitle(noteData.pages[0]?.title || '');
        setPreviewEditableContent(noteData.pages[0]?.content || '');
        
        console.log('プレビューでノートを表示:', noteData.title);
      } else {
        console.log('ノートデータが見つかりませんでした');
      }
    } else if (node.type === 'page') {
      // ページの場合は該当ページを表示
      if (previewNote && previewNote.pages && previewNote.pages.length > 0) {
        const pageIndex = previewNote.pages.findIndex(p => p.id === node.id);
        if (pageIndex !== -1 && previewNote.pages[pageIndex]) {
          setPreviewPage(pageIndex);
          // プレビューエリアのページ編集状態を更新
          setPreviewEditablePageTitle(previewNote.pages[pageIndex]?.title || '');
          setPreviewEditableContent(previewNote.pages[pageIndex]?.content || '');
        }
      }
    }
  };

  // プレビューからメインエディタに移動
  const openInMainEditor = () => {
    if (previewNote) {
      // ノートが属するサブフォルダを見つける
      const noteSubFolder = Object.keys(notesData).find(key => 
        notesData[key].some(note => note.id === previewNote.id)
      );
      
      if (noteSubFolder) {
        // サブフォルダが属するノートブックを見つける
        const parentNotebook = Object.keys(subFoldersData).find(notebookId =>
          subFoldersData[notebookId] && subFoldersData[notebookId].some(sf => sf.id === noteSubFolder)
        );
        
        // 必要なワークスペースを見つける
        const targetWorkspace = Object.keys(notebooks).find(wsId => 
          notebooks[wsId].some(nb => nb.id === parentNotebook)
        );
        
        if (targetWorkspace && parentNotebook) {
          // ワークスペースを切り替え（必要に応じて）
          if (selectedWorkspace !== targetWorkspace) {
            setSelectedWorkspace(targetWorkspace);
          }
          
          // ノートブックを展開状態にする
          setExpandedNotebooks(prev => {
            const newExpanded = prev.includes(parentNotebook) ? prev : [...prev, parentNotebook];
            return newExpanded;
          });
          
          // ノートブックを選択
          setSelectedNotebook(parentNotebook);
          
          // サブフォルダを選択
          setSelectedSubFolder(noteSubFolder);
        }
      }
      
      // メインエディタでノートを開く（現在のプレビューページを反映）
      selectPreviewNote(previewNote, previewPage);
      
      // マインドマップを閉じる
      setShowMindMap(false);
    }
  };

  // 前の階層に戻る
  const goBackInMindMap = () => {
    if (mindMapHistory.length > 0) {
      const lastState = mindMapHistory[mindMapHistory.length - 1];
      setMindMapLevel(lastState.level);
      setMindMapFocus(lastState.focus);
      setMindMapHistory(prev => prev.slice(0, -1));
    }
  };

  // マインドマップを開く時の初期化
  const openMindMap = () => {
    setMindMapLevel('workspace');
    setMindMapFocus(null);
    setMindMapHistory([]);
    setPreviewNote(null);
    setPreviewPage(0);
    setShowMindMap(true);
  };

  const getActivityIcon = (action) => {
    switch(action) {
      case 'edited': return '✏️';
      case 'created': return '➕';
      case 'tagged': return '🏷️';
      case 'pinned': return '📌';
      default: return '📄';
    }
  };

  const TagBadge = ({ tag, isSelected, onClick }) => {
    const tagInfo = allTags.find(t => t.name === tag) || { color: 'gray' };
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
          isSelected 
            ? `bg-${tagInfo.color}-100 text-${tagInfo.color}-800 ring-2 ring-${tagInfo.color}-400` 
            : `bg-gray-100 text-gray-700 hover:bg-${tagInfo.color}-50`
        }`}
        onClick={() => onClick && onClick(tag)}
      >
        <Tag className="w-3 h-3 mr-1" />
        {tag}
      </span>
    );
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* サイドバー */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">📝 NoteSpace</h1>
            <div className="flex items-center space-x-2">
              <button
                className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                onClick={openMindMap}
                title="マインドマップで構造を確認"
              >
                <Map className="w-5 h-5" />
              </button>
              <Settings className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700" />
            </div>
          </div>
          
          {/* 検索バー */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ノートを検索..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* ワークスペース選択 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-2">
            {workspaces.map(workspace => (
              <button
                key={workspace.id}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedWorkspace === workspace.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => handleWorkspaceChange(workspace.id)}
              >
                <span className="mr-2">{workspace.icon}</span>
                {workspace.name}
              </button>
            ))}
          </div>
        </div>

        {/* ノートブック一覧 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {notebooks[selectedWorkspace]?.map(notebook => (
              <div key={notebook.id}>
                <div
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedNotebook === notebook.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedNotebook(notebook.id);
                    toggleNotebook(notebook.id);
                  }}
                >
                  <div className="flex items-center">
                    {expandedNotebooks.includes(notebook.id) ? (
                      <ChevronDown className="w-4 h-4 mr-2" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-2" />
                    )}
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span className="font-medium">{notebook.name}</span>
                  </div>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                    {notebook.count}
                  </span>
                </div>

                {/* サブフォルダ一覧 */}
                {expandedNotebooks.includes(notebook.id) && subFoldersData[notebook.id] && (
                  <div className="ml-6 mt-2 space-y-1">
                    {subFoldersData[notebook.id].map(subFolder => (
                      <div key={subFolder.id} className="flex items-center justify-between group">
                        <div
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors flex-1 ${
                            selectedSubFolder === subFolder.id
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedSubFolder(subFolder.id)}
                        >
                          <div className="flex items-center">
                            <Folder className="w-4 h-4 mr-2" />
                            <span className="text-sm">{subFolder.name}</span>
                          </div>
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                            {subFolder.count}
                          </span>
                        </div>
                        
                        {/* サブフォルダごとの+ボタン */}
                        <button
                          className="ml-2 p-1 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            addNewNote(subFolder.id);
                          }}
                          title={`${subFolder.name}にノートを追加`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    {/* サブフォルダ追加ボタン */}
                    {selectedNotebook && (
                      <div 
                        className="flex items-center p-2 rounded-lg cursor-pointer text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                        onClick={addNewSubFolder}
                      >
                        <FolderPlus className="w-4 h-4 mr-2" />
                        <span className="text-sm">フォルダ追加</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* タグフィルタ */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">タグでフィルタ</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <TagBadge
                  key={tag.name}
                  tag={tag.name}
                  isSelected={selectedTags.includes(tag.name)}
                  onClick={toggleTag}
                />
              ))}
            </div>
          </div>

          {/* 最近のアクティビティ */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Activity className="w-4 h-4 mr-1" />
              最近のアクティビティ
            </h3>
            <div className="space-y-2">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start text-xs text-gray-600 p-2 bg-gray-50 rounded-lg">
                  <span className="mr-2">{getActivityIcon(activity.action)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{activity.note}</div>
                    <div className="text-gray-500">
                      {activity.folder}
                      {activity.page && ` > ${activity.page}`}
                    </div>
                  </div>
                  <span className="text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex">
        {/* ノート一覧 */}
        <div className="w-96 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {subFoldersData[selectedNotebook]?.find(sf => sf.id === selectedSubFolder)?.name || 'ノート'}
                </h2>
                <p className="text-sm text-gray-500">
                  {notebooks[selectedWorkspace]?.find(nb => nb.id === selectedNotebook)?.name} > 
                  {subFoldersData[selectedNotebook]?.find(sf => sf.id === selectedSubFolder)?.name}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </button>
                <button 
                  className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                  onClick={() => addNewNote()}
                  title="新しいノートを追加"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-sm text-gray-500">フィルタ中:</span>
                {selectedTags.map(tag => (
                  <TagBadge key={tag} tag={tag} isSelected={true} onClick={toggleTag} />
                ))}
              </div>
            )}
          </div>

          <div className="overflow-y-auto h-full">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedNote?.id === note.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => selectNote(note)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    {note.isPinned && <Pin className="w-4 h-4 text-blue-500 mr-2" />}
                    <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
                    {note.isFavorite && <Star className="w-4 h-4 text-yellow-500 ml-2" />}
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {note.pages[0]?.content.substring(0, 100)}...
                </p>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map(tag => (
                      <TagBadge key={tag} tag={tag} />
                    ))}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <FileText className="w-3 h-3 mr-1" />
                    {note.pages.length} ページ
                  </div>
                </div>
                
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {note.updatedAt}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* エディタエリア */}
        <div className="flex-1 bg-white">
          {selectedNote ? (
            <div className="h-full flex flex-col">
              {/* エディタヘッダー */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="text"
                    value={editableTitle}
                    className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none w-full"
                    placeholder="ノートのタイトル"
                    onChange={(e) => handleTitleChange(e.target.value)}
                  />
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-500 hover:text-gray-700">
                      <Star className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700">
                      <Pin className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* ページナビゲーション */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <button
                      className="p-1 rounded text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <span className="text-sm text-gray-600">
                      {currentPage + 1} / {selectedNote.pages.length}
                    </span>
                    
                    <button
                      className="p-1 rounded text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      onClick={() => setCurrentPage(Math.min(selectedNote.pages.length - 1, currentPage + 1))}
                      disabled={currentPage === selectedNote.pages.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button 
                      className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                      onClick={addNewPage}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      新しいページ
                    </button>
                  </div>
                </div>

                {/* ページタイトル */}
                <input
                  type="text"
                  value={editablePageTitle}
                  className="text-lg font-medium text-gray-800 bg-transparent border-none outline-none w-full mb-2"
                  placeholder="ページタイトル"
                  onChange={(e) => handlePageTitleChange(e.target.value)}
                />
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedNote.tags.map(tag => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                  <button className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
                    <Plus className="w-3 h-3 mr-1" />
                    タグ追加
                  </button>
                </div>
                
                <div className="text-xs text-gray-500 flex items-center justify-between">
                  <div>
                    作成: {selectedNote.createdAt} | 更新: {new Date().toISOString().split('T')[0]}
                  </div>
                  <div className="text-blue-600">
                    💾 自動保存中
                  </div>
                </div>
              </div>

              {/* ページインジケーター */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-2 overflow-x-auto">
                  {selectedNote.pages.map((page, index) => (
                    <button
                      key={page.id}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        currentPage === index
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                      onClick={() => setCurrentPage(index)}
                    >
                      {index + 1}. {page.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* エディタコンテンツ */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="w-full h-full bg-gray-50 rounded-lg p-4">
                  <div className="w-full h-full">
                    <textarea
                      className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-700 leading-relaxed text-sm font-mono"
                      value={editableContent}
                      placeholder="ここにページの内容を書いてください..."
                      onChange={(e) => handleContentChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">ノートを選択してください</p>
                <p className="text-sm">左側のリストからノートを選んで内容を確認</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* マインドマップオーバーレイ */}
      {showMindMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl max-h-full w-full h-full m-4 flex flex-col">
            {/* マインドマップヘッダー */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Map className="w-5 h-5 mr-2" />
                  ノート構造マップ
                </h3>
                
                {/* パンくずリスト */}
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-blue-600 font-medium">
                    {workspaces.find(w => w.id === selectedWorkspace)?.name}
                  </span>
                  
                  {mindMapLevel === 'notebook' && mindMapFocus && (
                    <>
                      <ChevronRight className="w-4 h-4 mx-1" />
                      <span className="text-blue-600 font-medium">
                        {notebooks[selectedWorkspace]?.find(nb => nb.id === mindMapFocus)?.name}
                      </span>
                    </>
                  )}
                  
                  {mindMapLevel === 'subfolder' && mindMapFocus && (
                    <>
                      <ChevronRight className="w-4 h-4 mx-1" />
                      <span className="text-blue-600 font-medium">
                        {Object.values(subFoldersData).flat().find(sf => sf.id === mindMapFocus)?.name}
                      </span>
                    </>
                  )}
                  
                  {mindMapLevel === 'note' && mindMapFocus && (
                    <>
                      <ChevronRight className="w-4 h-4 mx-1" />
                      <span className="text-blue-600 font-medium">
                        {Object.values(notesData).flat().find(note => note.id === mindMapFocus)?.title}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* 戻るボタン */}
                {mindMapHistory.length > 0 && (
                  <button
                    className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    onClick={goBackInMindMap}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    戻る
                  </button>
                )}
                
                <button
                  className="p-2 text-gray-500 hover:text-gray-700"
                  onClick={() => setMindMapZoom(Math.max(0.5, mindMapZoom - 0.1))}
                  title="ズームアウト"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">{Math.round(mindMapZoom * 100)}%</span>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700"
                  onClick={() => setMindMapZoom(Math.min(2, mindMapZoom + 0.1))}
                  title="ズームイン"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700"
                  onClick={() => setMindMapZoom(1)}
                  title="リセット"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowMindMap(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* メインコンテンツエリア */}
            <div className="flex-1 flex overflow-hidden">
              {/* マインドマップエリア */}
              <div className={`${previewNote ? 'w-1/2' : 'w-full'} border-r border-gray-200 transition-all duration-300`}>
                {mindMapData && (
                  <div className="w-full h-full overflow-auto bg-gray-50">
                    <svg
                      className="w-full h-full min-w-[1200px] min-h-[600px]"
                      viewBox="0 0 1200 600"
                      style={{ transform: `scale(${mindMapZoom})` }}
                    >
                      {/* 接続線を描画 */}
                      {mindMapData.children.map(child => 
                        drawConnection(mindMapData, child, `root-${child.id}`)
                      )}

                      {/* ルートノード */}
                      <g className="cursor-pointer" onClick={() => handleNodeClick(mindMapData)}>
                        {mindMapLevel === 'workspace' ? (
                          // ワークスペースレベル：大きめの円
                          <>
                            <circle
                              cx={mindMapData.x}
                              cy={mindMapData.y}
                              r="50"
                              fill="#dbeafe"
                              stroke="#3b82f6"
                              strokeWidth="3"
                              className="hover:fill-blue-100 transition-all"
                            />
                            <text
                              x={mindMapData.x}
                              y={mindMapData.y - 60}
                              textAnchor="middle"
                              className="text-lg font-bold fill-gray-900"
                            >
                              {mindMapData.icon} {mindMapData.name}
                            </text>
                            <text
                              x={mindMapData.x}
                              y={mindMapData.y + 5}
                              textAnchor="middle"
                              className="text-sm fill-gray-600"
                            >
                              クリックして展開
                            </text>
                          </>
                        ) : (
                          // その他のレベル：四角形
                          <>
                            <rect
                              x={mindMapData.x - 80}
                              y={mindMapData.y - 25}
                              width="160"
                              height="50"
                              rx="8"
                              fill="#f3f4f6"
                              stroke="#6b7280"
                              strokeWidth="2"
                              className="hover:fill-gray-100 transition-all"
                            />
                            <text
                              x={mindMapData.x}
                              y={mindMapData.y + 5}
                              textAnchor="middle"
                              className="text-sm font-semibold fill-gray-900"
                            >
                              {mindMapData.type === 'notebook' ? '📚' : 
                               mindMapData.type === 'subfolder' ? '📁' : 
                               mindMapData.type === 'note' ? '📄' : '📋'} {mindMapData.name}
                            </text>
                          </>
                        )}
                      </g>

                      {/* 子ノード */}
                      {mindMapData.children.map(child => (
                        <g key={child.id} className="cursor-pointer" onClick={() => handleNodeClick(child)}>
                          {child.type === 'notebook' ? (
                            // ノートブック表示
                            <>
                              <rect
                                x={child.x - 80}
                                y={child.y - 30}
                                width="160"
                                height="60"
                                rx="10"
                                fill="#dbeafe"
                                stroke="#3b82f6"
                                strokeWidth="2"
                                className="hover:fill-blue-100 transition-all"
                              />
                              <text
                                x={child.x}
                                y={child.y - 5}
                                textAnchor="middle"
                                className="text-sm font-semibold fill-gray-900"
                              >
                                📚 {child.name}
                              </text>
                              <text
                                x={child.x}
                                y={child.y + 15}
                                textAnchor="middle"
                                className="text-xs fill-gray-600"
                              >
                                {child.count} ノート | クリックして展開
                              </text>
                            </>
                          ) : child.type === 'subfolder' ? (
                            // サブフォルダ表示
                            <>
                              <rect
                                x={child.x - 70}
                                y={child.y - 25}
                                width="140"
                                height="50"
                                rx="8"
                                fill="#dcfce7"
                                stroke="#16a34a"
                                strokeWidth="2"
                                className="hover:fill-green-100 transition-all"
                              />
                              <text
                                x={child.x}
                                y={child.y - 2}
                                textAnchor="middle"
                                className="text-sm font-medium fill-gray-900"
                              >
                                📁 {child.name}
                              </text>
                              <text
                                x={child.x}
                                y={child.y + 15}
                                textAnchor="middle"
                                className="text-xs fill-gray-600"
                              >
                                {child.count} ノート | クリックして展開
                              </text>
                            </>
                          ) : child.type === 'note' ? (
                            // ノート表示
                            <>
                              <rect
                                x={child.x - 60}
                                y={child.y - 20}
                                width="120"
                                height="40"
                                rx="6"
                                fill={previewNote?.id === child.id ? '#fef3c7' : '#ffffff'}
                                stroke={child.isPinned ? '#f59e0b' : '#e5e7eb'}
                                strokeWidth={child.isPinned ? "2" : "1"}
                                className="hover:fill-yellow-50 transition-all"
                              />
                              <text
                                x={child.x}
                                y={child.y + 2}
                                textAnchor="middle"
                                className="text-xs font-medium fill-gray-700"
                              >
                                {child.isPinned ? '📌' : '📄'} {child.name.length > 12 ? child.name.substring(0, 12) + '...' : child.name}
                              </text>
                              {child.isFavorite && (
                                <circle
                                  cx={child.x + 55}
                                  cy={child.y - 15}
                                  r="6"
                                  fill="#fbbf24"
                                />
                              )}
                              <text
                                x={child.x}
                                y={child.y + 30}
                                textAnchor="middle"
                                className="text-xs fill-gray-500"
                              >
                                {child.pageCount}ページ | クリックして表示
                              </text>
                            </>
                          ) : child.type === 'page' ? (
                            // ページ表示
                            <>
                              <rect
                                x={child.x - 40}
                                y={child.y - 15}
                                width="80"
                                height="30"
                                rx="4"
                                fill="#f8fafc"
                                stroke="#cbd5e1"
                                strokeWidth="1"
                                className="hover:fill-blue-50 transition-all"
                              />
                              <text
                                x={child.x}
                                y={child.y + 3}
                                textAnchor="middle"
                                className="text-xs fill-gray-700"
                              >
                                📄 {child.name.length > 8 ? child.name.substring(0, 8) + '...' : child.name}
                              </text>
                            </>
                          ) : null}
                        </g>
                      ))}
                    </svg>
                  </div>
                )}
                
                {!mindMapData && (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <Map className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">データを読み込み中...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ノートプレビュー・編集エリア */}
              {previewNote && (
                <div className="w-1/2 flex flex-col bg-gray-50">
                  {/* プレビューヘッダー */}
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="text"
                        value={previewEditableTitle}
                        onChange={(e) => handlePreviewTitleChange(e.target.value)}
                        className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none w-full"
                        placeholder="ノートのタイトル"
                      />
                      <div className="flex items-center space-x-2">
                        {previewNote.isPinned && <Pin className="w-4 h-4 text-blue-500" />}
                        {previewNote.isFavorite && <Star className="w-4 h-4 text-yellow-500" />}
                        <button
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          onClick={openInMainEditor}
                        >
                          メインエディタで開く
                        </button>
                      </div>
                    </div>
                    
                    {/* ページナビゲーション */}
                    {previewNote && previewNote.pages && previewNote.pages.length > 1 && (
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <button
                            className="p-1 rounded text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setPreviewPage(Math.max(0, previewPage - 1))}
                            disabled={previewPage === 0}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          
                          <span className="text-sm text-gray-600">
                            {previewPage + 1} / {previewNote.pages.length}
                          </span>
                          
                          <button
                            className="p-1 rounded text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setPreviewPage(Math.min(previewNote.pages.length - 1, previewPage + 1))}
                            disabled={previewPage === previewNote.pages.length - 1}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={previewEditablePageTitle}
                          onChange={(e) => handlePreviewPageTitleChange(e.target.value)}
                          className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none text-right"
                          placeholder="ページタイトル"
                        />
                      </div>
                    )}
                    
                    {/* タグ */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {previewNote && previewNote.tags && previewNote.tags.map(tag => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                      <button className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
                        <Plus className="w-3 h-3 mr-1" />
                        タグ追加
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-500 flex items-center justify-between">
                      <div>
                        作成: {previewNote ? previewNote.createdAt : ''} | 更新: {new Date().toISOString().split('T')[0]}
                      </div>
                      <div className="text-green-600">
                        💾 プレビューで編集中
                      </div>
                    </div>
                  </div>

                  {/* プレビュー・編集コンテンツ */}
                  <div className="flex-1 p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg h-full p-4">
                      <div className="w-full h-full">
                        <textarea
                          className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-700 leading-relaxed text-sm font-mono"
                          value={previewEditableContent}
                          placeholder="ここでノートの内容を直接編集できます..."
                          onChange={(e) => handlePreviewContentChange(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* マインドマップフッター */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  {mindMapLevel === 'workspace' && (
                    <>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded-full mr-2"></div>
                        <span>ワークスペース</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded mr-2"></div>
                        <span>ノートブック</span>
                      </div>
                    </>
                  )}
                  
                  {mindMapLevel === 'notebook' && (
                    <>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-gray-100 border border-gray-400 rounded mr-2"></div>
                        <span>ノートブック</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded mr-2"></div>
                        <span>サブフォルダ</span>
                      </div>
                    </>
                  )}
                  
                  {mindMapLevel === 'subfolder' && (
                    <>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-100 border border-green-400 rounded mr-2"></div>
                        <span>サブフォルダ</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded mr-2"></div>
                        <span>ノート</span>
                      </div>
                    </>
                  )}
                  
                  {mindMapLevel === 'note' && (
                    <>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-yellow-100 border border-yellow-400 rounded mr-2"></div>
                        <span>ノート</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-gray-100 border border-gray-400 rounded mr-2"></div>
                        <span>ページ</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <span>
                    {previewNote ? 'プレビューエリアで直接編集可能 | メインエディタで開くボタンでフル画面編集' : 'クリックで展開・表示'}
                  </span>
                  {mindMapHistory.length > 0 && (
                    <span className="text-blue-600">← 戻るボタンで前の階層へ</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAddFolderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">新しいフォルダを追加</h3>
            
            <div className="space-y-4">
              {/* フォルダ名入力 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  フォルダ名
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="例: プロジェクト資料"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      confirmAddFolder();
                    } else if (e.key === 'Escape') {
                      cancelAddFolder();
                    }
                  }}
                />
              </div>
              
              {/* フォルダ色選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  フォルダの色
                </label>
                <div className="flex flex-wrap gap-2">
                  {folderColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setNewFolderColor(color.name)}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        newFolderColor === color.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      title={color.label}
                    >
                      <div className={`w-6 h-6 rounded ${color.bg} ${color.text} flex items-center justify-center`}>
                        <Folder className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* プレビュー */}
              {newFolderName && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">プレビュー:</p>
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-2 ${folderColors.find(c => c.name === newFolderColor)?.bg || 'bg-gray-100'}`}>
                      <Folder className={`w-4 h-4 ${folderColors.find(c => c.name === newFolderColor)?.text || 'text-gray-600'}`} />
                    </div>
                    <span className="font-medium text-gray-900">{newFolderName}</span>
                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      0 ノート
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* ボタン */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={cancelAddFolder}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={confirmAddFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                フォルダを作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotebookApp;
                