# FORGE — 自己変革プラットフォーム

Anti-Vision/Vision/Identity × 毎日のルーティン × AI対話（Mirror）を統合した自己変革アプリ。

## デプロイ手順

### 1. Supabaseプロジェクト作成

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. SQL Editor で `supabase/schema.sql` を実行
3. Authentication > Providers で Email を有効化（デフォルトで有効）
4. Project Settings > API から以下を控える：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Anthropic APIキー取得

1. [console.anthropic.com](https://console.anthropic.com) でAPIキーを作成
2. → `ANTHROPIC_API_KEY`

### 3. GitHubリポジトリ作成 & push

```bash
cd forge-app
git init
git add .
git commit -m "FORGE initial commit"
git remote add origin https://github.com/YOUR_USERNAME/forge-app.git
git push -u origin main
```

### 4. Vercelデプロイ

1. [vercel.com](https://vercel.com) でGitHubリポジトリをインポート
2. Environment Variables に以下を設定：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
3. Deploy

### 5. Supabase Auth設定

1. Supabase Dashboard > Authentication > URL Configuration
2. Site URL: `https://your-app.vercel.app`
3. Redirect URLs: `https://your-app.vercel.app/auth/callback`

### 6. 初回ログイン

1. デプロイされたURLにアクセス
2. 「アカウント作成」でメール+パスワードを登録
3. 確認メールのリンクをクリック
4. ログインしてFORGEを使い始める

## ローカル開発

```bash
cp .env.local.example .env.local
# .env.local に実際の値を記入
npm install
npm run dev
```

## 技術構成

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 14 App Router |
| DB / Auth | Supabase (PostgreSQL + Auth + RLS) |
| AI | Anthropic Claude API (サーバーサイド) |
| デプロイ | Vercel |
| コスト | Supabase Free + Vercel Hobby = 月額0円 (API使用料のみ) |
