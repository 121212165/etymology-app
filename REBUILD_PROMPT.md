# 林序 (Linxu) — 英语词根词缀拆解应用 · 重建提示词

> 把这份文件完整交给一个 AI Agent，它应当能够从零开始（不依赖任何已有代码）重建出与本项目功能、架构、视觉、性能等效的 Web 应用。

---

## 一、项目概述

### 1.1 产品定位
**林序** 是一个英语词源学习工具，核心价值是"通过词根词缀拆解帮助用户理解 5000+ 英语单词的来源与构成"。它不是查词词典，而是"词素可视化 + 词源故事 + 同根词关联"的学习型应用。

### 1.2 目标用户
- 英语学习者（中高级）
- 需要快速扩充词汇量的人群
- 对词源学感兴趣的用户

### 1.3 核心体验
1. **首页**：搜索框 + 热门词根云 + 单词卡片网格（默认展示全部，可分页加载）
2. **搜索**：输入即时识别"用户输入的是不是某个前缀/词根/后缀"，给出含义提示
3. **单词详情页** `/word/[word]`：词素拆解 + 词源故事 + 同根词
4. **词根详情页** `/root/[root]`：列出所有含该词根的单词
5. **暗色为主** + 可切换浅色主题
6. **发音**：使用浏览器内置 Web Speech API

---

## 二、技术栈（必须使用）

| 类别 | 选型 | 版本 |
|---|---|---|
| 框架 | Next.js (App Router) | ^15.3.3 |
| UI 库 | React | ^19.0.0 |
| 语言 | TypeScript | ^5 |
| 样式 | Tailwind CSS v4（`@import "tailwindcss"` + `@theme inline`） | ^4 |
| 状态 | Zustand | ^5.0.14 |
| 主题 | next-themes | ^0.4.6 |
| 图标 | lucide-react | ^1.17.0 |
| 字体 | next/font/google（Inter + JetBrains Mono） | — |
| 测试 | Vitest + @testing-library/react + jsdom | ^3.2.1 / ^16.3.0 / ^26.1.0 |
| Lint | eslint + eslint-config-next | ^9 / ^15.3.3 |

**约束**：
- 使用 Next.js 15 的新约定：`params` 为 `Promise`，必须 `await`
- 路径别名 `@/*` → `src/*`
- 不使用 `next dev --turbopack`，dev 脚本为 `next dev --turbopack=false`

### package.json scripts
```json
{
  "dev": "next dev --turbopack=false",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

---

## 三、数据规格

### 3.1 数据文件（放在 `public/data/`）

#### `vocab.json`
顶层是 JSON 数组，每个元素结构：
```ts
interface VocabEntry {
  word: string;        // 单词，如 "act"
  definition: string;  // 中文释义，如 "行动"
  parts: VocabPart[];  // 词素拆解
}
interface VocabPart {
  type: "prefix" | "root" | "suffix";
  text: string;        // 形态素文本，如 "act"
  meaning: string;     // 中文含义，如 "做，行动"
}
```

**示例**：
```json
[
  {"word":"act","definition":"行动","parts":[{"type":"root","text":"act","meaning":"做，行动"}]},
  {"word":"action","definition":"行动","parts":[{"type":"root","text":"act","meaning":"做，行动"},{"type":"suffix","text":"ion","meaning":"行为"}]}
]
```

#### `roots-index.json`
顶层是 JSON 对象，键为词根文本，值为紧凑结构：
```ts
interface RootIndexEntry {
  m: string;   // meaning，含义
  w: number[]; // word indices，指向 vocab 数组的下标
}
type RootIndex = Record<string, RootIndexEntry>;
```

**示例**：
```json
{"act":{"m":"做，行动","w":[0,1,2,3,4,5,6,7,8]},"port":{"m":"携带","w":[82,83,84,85]}}
```

### 3.2 数据规模
- vocab.json：约 5011 个单词
- roots-index.json：约 300+ 个词根条目
- 数据需要由开发者自行准备（可使用 AI 生成或基于公开词源词典整理）

### 3.3 运行时派生索引
前缀/后缀索引在加载 vocab 后动态构建：
```ts
function buildPrefixSuffixIndices(data: VocabEntry[]) {
  const prefixMap: Record<string, string> = {};
  const suffixMap: Record<string, string> = {};
  for (const entry of data) {
    for (const part of entry.parts) {
      if (part.type === "prefix" && !prefixMap[part.text]) prefixMap[part.text] = part.meaning;
      if (part.type === "suffix" && !suffixMap[part.text]) suffixMap[part.text] = part.meaning;
    }
  }
  return [prefixMap, suffixMap];
}
```

---

## 四、目录结构

```
etymology-app/
├── public/
│   └── data/
│       ├── vocab.json
│       └── roots-index.json
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 根布局，字体+ThemeProvider+metadata
│   │   ├── page.tsx                # 首页（client component）
│   │   ├── globals.css             # 设计系统 + Tailwind v4
│   │   ├── error.tsx               # 错误边界
│   │   ├── loading.tsx             # 加载骨架
│   │   ├── not-found.tsx           # 404
│   │   ├── root/[slug]/page.tsx    # 词根详情（server，SSG）
│   │   └── word/[slug]/page.tsx    # 单词详情（server，SSG）
│   ├── components/
│   │   ├── layout/TopBar.tsx       # 顶部栏：logo + 搜索 + 主题切换
│   │   ├── search/
│   │   │   ├── SearchInput.tsx     # 防抖搜索 + 实时词素识别
│   │   │   └── RootCloud.tsx       # 词根云（按词频排序取前30）
│   │   ├── ui/ThemeToggle.tsx      # 主题切换按钮（防 hydration mismatch）
│   │   └── word/
│   │       ├── CardGrid.tsx        # 卡片网格（响应式 auto-fill）
│   │       ├── WordCard.tsx        # 单词卡片
│   │       ├── PartTags.tsx        # 词素标签（前缀/词根/后缀三色）
│   │       └── SpeakButton.tsx     # 发音按钮
│   ├── hooks/
│   │   ├── useSearch.ts            # 加载索引（带缓存、错误重试）
│   │   └── useSpeak.ts             # Web Speech API 封装
│   ├── lib/
│   │   ├── types.ts                # 类型定义
│   │   ├── constants.ts            # DEBOUNCE_MS, PART_COLORS
│   │   ├── data-loader.ts          # 客户端数据加载（带缓存）
│   │   └── search-engine.ts        # executeSearch + quickDecompose
│   └── store/
│       └── app-store.ts            # Zustand store
├── next.config.ts
├── tsconfig.json
├── package.json
└── AGENTS.md
```

---

## 五、各模块实现要点

### 5.1 `src/lib/types.ts`
```ts
export interface VocabPart {
  type: "prefix" | "root" | "suffix";
  text: string;
  meaning: string;
}
export interface VocabEntry {
  word: string;
  definition: string;
  parts: VocabPart[];
}
export interface RootIndexEntry {
  m: string;
  w: number[];
}
export type RootIndex = Record<string, RootIndexEntry>;
export interface SearchIndex {
  data: VocabEntry[];
  rootIndex: RootIndex;
  prefixIndex: Record<string, string>;
  suffixIndex: Record<string, string>;
}
```

### 5.2 `src/lib/constants.ts`
```ts
export const DEBOUNCE_MS = 200;
export const PART_COLORS = {
  prefix: "#E8A84C",
  root:   "#5BB89A",
  suffix: "#9B8EC4",
} as const;
```

### 5.3 `src/lib/data-loader.ts`
- 模块级缓存：`cachedIndex: SearchIndex | null`，`initialLoadPromise: Promise | null`
- `loadSearchIndex()`：并发 fetch `/data/vocab.json` 和 `/data/roots-index.json`，构建前后缀索引，写入缓存
- 失败时清空 `initialLoadPromise` 以便重试
- `getCachedIndex()`：同步读取缓存

### 5.4 `src/lib/search-engine.ts`
两个核心函数：

**`executeSearch(index, query, activeRoot): number[]`**
- 若 `activeRoot` 非空：返回 `index.rootIndex[activeRoot].w`（过滤越界索引）
- 若 query 为空：返回所有索引
- 否则：
  1. 第一遍：word 以 query 开头的（`startsWith`，case-insensitive）
  2. 第二遍：rootText 包含 query 的，把对应单词索引追加（去重）

**`quickDecompose(index, query): DecomposeResult`**
- 长度 < 2 直接返回 `{ matched: false }`
- 依次在前缀/词根/后缀索引中查找，匹配规则 `matchesMorpheme`：
  - `morpheme.startsWith(query)` 或 `query.startsWith(morpheme)`
  - 或 `query.length >= 3 && morpheme.includes(query)`
- 找到任一则返回 `{ type, text, meaning, matched: true }`

### 5.5 `src/store/app-store.ts`（Zustand）
状态：`searchIndex`, `filteredIndices`, `query`, `activeRoot`
动作：`setSearchIndex`、`setQuery`、`setActiveRoot`、`applyFilters`
- `setSearchIndex` 设置后立即调用 `executeSearch`
- `setQuery`/`setActiveRoot` 设置后调用 `applyFilters`

### 5.6 `src/hooks/useSearch.ts`
- 监听 store 中 `searchIndex`，若已存在则不重复加载
- 提供 `loading`, `error`, `retry`, `ready`
- 错误信息："数据加载失败，请检查网络连接"

### 5.7 `src/hooks/useSpeak.ts`
- 使用 `window.speechSynthesis`
- `lang = "en-US"`，`rate = 0.9`
- 每次发音前 `cancel()` 已有队列
- SSR 安全：检查 `typeof window === "undefined"`

### 5.8 `src/app/layout.tsx`
- 字体：`Inter` (`--font-inter`) + `JetBrains_Mono` (`--font-mono`)，`subsets: ["latin"]`，`display: "swap"`
- `<html lang="zh-CN" suppressHydrationWarning className={inter.variable + ' ' + jetbrains.variable}>`
- `<body className="antialiased">`
- `<ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>`
- metadata：title `"林序 - 英语词根词缀拆解"`，description `"5011个英语单词的词根词缀拆解学习工具"`

### 5.9 `src/app/page.tsx`（首页，client component）
- `PAGE_SIZE = 50`，本地 state `showCount`
- 使用 `useSearch`、`useAppStore`、`useSpeak`
- `hasQuery = query.trim().length > 0 || activeRoot !== null`
- 加载中：居中 spinner
- 错误：居中错误信息 + 重试按钮
- 主内容：
  - `<TopBar />`
  - 无 query 时：标题"掌握词根拆解，读懂英语世界" + `<RootCloud>`
  - 有 query 时：结果数量提示
  - `<CardGrid>` 渲染 `filteredIndices.slice(0, showCount)` 对应的 entry
  - "加载更多"按钮（仅 hasQuery 且还有剩余时显示）

### 5.10 `src/app/root/[slug]/page.tsx`（词根详情，server component）
- `loadData()`：`readFileSync` 读取 `public/data/*.json`
- `generateStaticParams()`：返回所有 rootIndex 的 key 作为 slug
- `params: Promise<{ slug: string }>`，必须 `await`
- `rootText = decodeURIComponent(slug)`
- 找不到词根时显示"未找到词根"+返回首页链接
- 找到时：
  - sticky header + 返回按钮
  - 标题：词根文本（mono font, root 色） + 含义
  - 副信息：单词数量
  - 单词列表：每个为 Link 到 `/word/[word]`，含 word、definition、词素数、PartTags

### 5.11 `src/app/word/[slug]/page.tsx`（单词详情，server component）
- 同样使用 `loadData()` 和 `generateStaticParams()`（返回所有 vocab.word）
- 找不到时显示"未找到单词"
- 找到时展示四块：
  1. **单词头部**：大号 word + definition + SpeakButton
  2. **词素拆解**：每个 part 一个圆角卡片，按 type 染色（border-prefix/30 bg-prefix/5 等）
  3. **词源故事**：一段连缀文字，形如 "X 由 act(做，行动) + ion(行为) 组成，字面意思为'做，行动 + 行为'，引申为'行动'。"
  4. **同根词**：取所有 root 类型 part 的 rootIndex 条目，去重当前 word，最多 20 个，渲染为圆角链接

### 5.12 `src/app/error.tsx`、`loading.tsx`、`not-found.tsx`
- error：`"use client"`，useEffect 打印 error，提供"重试"（reset）和"返回首页"链接
- loading：居中 spinner + "加载中..."
- not-found：居中"页面未找到"+返回首页

### 5.13 `src/components/layout/TopBar.tsx`
- `sticky top-0 z-50 h-[56px]`，`bg-bg-surface/95 backdrop-blur-sm`，底部 border
- 左：Link 到 `/`，TreesIcon（lucide，accent 色）+ "林序"文字（sm 以上显示）
- 中：flex-1 居中 SearchInput
- 右：ThemeToggle

### 5.14 `src/components/search/SearchInput.tsx`
- 圆角搜索框（`rounded-full`），左 Search 图标，右 X 按钮（仅 rawInput 非空时）
- placeholder："搜索单词、词根或定义..."
- 输入防抖：本地 `rawInput` 立即更新，`setQuery` 延迟 `DEBOUNCE_MS` 毫秒
- `quickDecompose` 实时识别，匹配时在搜索框下方显示 chip：
  - 背景色 = `PART_COLORS[type] + "22"`
  - 文字色 = `PART_COLORS[type]`
  - 文本：`"前缀/词根/后缀: text"`，旁边小字显示 meaning
- 清空按钮重置 query + rawInput + decompose

### 5.15 `src/components/search/RootCloud.tsx`
- 接收 `rootIndex` prop
- 按 `w.length` 降序排序，取前 30
- 渲染为圆角按钮云，选中态使用 accent 色
- 点击切换 `activeRoot`（再点一次取消）

### 5.16 `src/components/word/CardGrid.tsx`
- 空状态：居中"没有找到匹配的单词" + 提示
- 非空：`grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4`

### 5.17 `src/components/word/WordCard.tsx`
- `bg-bg-surface` 圆角 10px，`hover:border-accent/30 hover:-translate-y-0.5`，`transition-all`
- 顶部行：Link word + definition + 发音按钮
- 底部：PartTags

### 5.18 `src/components/word/PartTags.tsx`
- flex flex-wrap gap-1.5
- 每个 part 渲染为 `<span class="part-tag part-tag-{type}">`，含 mono 字体的 text + meaning

### 5.19 `src/components/word/SpeakButton.tsx`
- 独立使用 `useSpeak`，9x9 圆角按钮

### 5.20 `src/components/ui/ThemeToggle.tsx`
- `mounted` state 防 hydration mismatch
- 未 mounted 时显示占位
- 已 mounted 时根据 `theme` 切换 Sun/Moon 图标

---

## 六、设计系统（`globals.css`）

使用 Tailwind CSS v4 语法：

```css
@import "tailwindcss";

@theme inline {
  --color-bg-deep: var(--bg-deep);
  --color-bg-surface: var(--bg-surface);
  --color-bg-elevated: var(--bg-elevated);
  --color-bg-hover: var(--bg-hover);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-border: var(--border);
  --color-prefix: var(--prefix-color);
  --color-root: var(--root-color);
  --color-suffix: var(--suffix-color);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --font-sans: var(--font-inter), var(--font-body);
  --font-mono: var(--font-mono);
}

/* Dark theme (default) */
:root, [data-theme="dark"] {
  --bg-deep: #0F1410;
  --bg-surface: #171D18;
  --bg-elevated: #1F2820;
  --bg-hover: #2A352C;
  --text-primary: #E4EDE6;
  --text-secondary: #8FA394;
  --text-muted: #5A6B5E;
  --border: #2A352C;
  --prefix-color: #E8A84C;
  --root-color: #5BB89A;
  --suffix-color: #9B8EC4;
  --accent: #6AAF7B;
  --accent-hover: #82C792;
  --shadow: rgba(0, 0, 0, 0.4);
  --topbar-h: 56px;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Light theme */
[data-theme="light"] {
  --bg-deep: #F5F2ED;
  --bg-surface: #FFFFFF;
  --bg-elevated: #F0EDE7;
  --bg-hover: #E8E4DC;
  --text-primary: #1A2B1E;
  --text-secondary: #5C6E60;
  --text-muted: #9BA89E;
  --border: #D6D0C6;
  --prefix-color: #C4882E;
  --root-color: #3D8B52;
  --suffix-color: #7B6BA8;
  --accent: #3D8B52;
  --accent-hover: #2E7A42;
  --shadow: rgba(0, 0, 0, 0.08);
}
```

**设计要点**：
- 暗色为主（默认），墨绿色调（学习/森林感）
- 三色词素：橙(prefix) / 绿(root) / 紫(suffix)
- 主色调 accent：墨绿 `#6AAF7B`（暗）/ 深绿 `#3D8B52`（浅）
- 浅色主题为米白/暖白调，避免冷蓝

**基础样式**：
```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; scroll-behavior: smooth; }
body {
  font-family: var(--font-inter), system-ui, sans-serif;
  background: var(--bg-deep);
  color: var(--text-primary);
  line-height: 1.6;
  min-height: 100vh;
  transition: background 0.2s var(--ease), color 0.2s var(--ease);
}
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--text-muted); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); }
```

**词素标签**：
```css
.part-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  transition: opacity 0.15s var(--ease);
}
.part-tag:hover { opacity: 0.85; }
.part-tag-prefix  { background: color-mix(in srgb, var(--prefix-color) 18%, transparent); color: var(--prefix-color); }
.part-tag-root    { background: color-mix(in srgb, var(--root-color) 18%, transparent);   color: var(--root-color); }
.part-tag-suffix  { background: color-mix(in srgb, var(--suffix-color) 18%, transparent); color: var(--suffix-color); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 七、性能与体验要求

### 7.1 性能
- **静态生成**：所有 `/word/*` 和 `/root/*` 页面必须 SSG（用 `generateStaticParams`）
- **客户端索引缓存**：`loadSearchIndex` 使用模块级 `cachedIndex` + `initialLoadPromise` 双重缓存，避免重复请求
- **分页加载**：首页默认显示 50 个，"加载更多"按钮每次追加 50
- **搜索防抖**：200ms
- **并发加载**：vocab 和 roots-index 用 `Promise.all` 并发

### 7.2 可访问性
- 所有图标按钮带 `aria-label`
- 支持 `prefers-reduced-motion`
- 主题切换防 hydration mismatch（mounted 检查）
- 语义化 HTML：`<header>` `<main>` `<section>` `<h1>` `<h2>`

### 7.3 SEO
- 根 layout 设置 title 和 description
- 详情页可考虑 `generateMetadata`（可选）
- `lang="zh-CN"`

### 7.4 错误处理
- 数据加载失败提供"重试"按钮
- 找不到单词/词根时显示友好的"未找到"页面
- 全局 `error.tsx` 兜底

---

## 八、配置文件

### `next.config.ts`
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

### `tsconfig.json`（关键项）
- `target: ES2017` / `lib: ["dom", "dom.iterable", "esnext"]`
- `module: esnext` / `moduleResolution: bundler`
- `jsx: preserve` / `strict: true`
- `plugins: [{ name: "next" }]`
- `paths: { "@/*": ["./src/*"] }`

### `postcss.config.mjs`
```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

### `eslint.config.mjs`
使用 `next/core-web-vitals` 和 `next/typescript` 推荐配置。

---

## 九、验收标准

构建并运行后，应当满足：

1. ✅ `npm run dev` 启动开发服务器，首页正常加载
2. ✅ `npm run build` 成功，所有 `/word/*` 和 `/root/*` 路由被预渲染为静态 HTML
3. ✅ `npm run lint` 无 error
4. ✅ 首页搜索框输入"port"时，下方出现 chip 提示"词根: port 携带"
5. ✅ 点击词根云中的"act"，过滤出所有含该词根的单词
6. ✅ 访问 `/word/action` 显示词素拆解、词源故事、同根词
7. ✅ 访问 `/root/act` 列出所有 act 词根的单词
8. ✅ 暗色主题为默认，点击右上角可切换为浅色
9. ✅ 单词详情页点击发音按钮可朗读单词
10. ✅ 数据加载失败时显示重试按钮
11. ✅ 加载状态显示 spinner
12. ✅ 移动端响应式正常（grid auto-fill）
13. ✅ 词素标签三色清晰区分（橙/绿/紫）

---

## 十、给执行 Agent 的工作建议

1. **先建数据再建代码**：先准备至少 50 个单词 + 10 个词根的样本数据（vocab.json + roots-index.json），确保格式正确，再写代码。后续可扩展到 5000+ 规模。
2. **严格遵守 Next.js 15 约定**：`params` 是 Promise，必须 `await`；Server Component 不能用 `useState`，详情页用 `readFileSync` 直接读 `public/data/`。
3. **Tailwind v4 写法**：使用 `@theme inline` 把 CSS 变量桥接到 Tailwind 颜色系统，自定义颜色名 `bg-bg-deep` / `text-text-primary` 这种"双前缀"是正常的。
4. **状态管理**：搜索状态全部走 Zustand，组件不维护本地 query，只维护 `rawInput`（用于即时输入反馈）。
5. **测试驱动**：先写 `search-engine.ts` 的单测（executeSearch 和 quickDecompose 的边界情况），再实现。
6. **不要过度设计**：本项目刻意保持简单，没有数据库、没有后端 API、没有用户系统、没有进度追踪。所有功能都用客户端 + 静态文件实现。

---

## 附录：项目优点速览（供 Agent 理解设计意图）

| 维度 | 优点 |
|---|---|
| 定位 | 词源学习而非查词，差异化 |
| 架构 | SSG + 客户端搜索混合，性能与体验兼得 |
| 数据 | 紧凑 JSON 格式（m/w 单字母键），减少体积 |
| 设计 | 墨绿森林系暗色主题，三色词素可视化清晰 |
| 状态 | Zustand 轻量管理，避免 Redux 复杂 |
| 性能 | 模块级缓存 + Promise 共享 + 分页 + 防抖 |
| 可访问 | aria-label + reduced-motion + hydration 安全 |
| 工程 | TS 严格类型 + 路径别名 + 关注点分离目录 |

**核心哲学**：让 5000 个英语单词的"词根基因"在浏览器里以最快的速度、最美的形式呈现给学习者。

---

## 十一、思维导图与行为设计补充（v2）

### 11.1 数据增强
- 新增 `public/data/enhanced-roots.json`（由 `npm run build:mindmap` 生成）
- 三层结构：core (>=10词) / middle (4-9词) / edge (<4词)
- 同义词根保守合并：meaning 相等 + 首字母相同 + 编辑距离 <= 2
- TF-IDF 共现连接：权重 = 1/频次，阈值 0.1（过滤高频后缀噪声）

### 11.2 行为设计（福格模型）
- 首页改为单点焦点卡片（替代词根云）
- 词根页改为单词会话（替代列表）
- localStorage 持久化已看/已完成状态
- 永不暴露"未完成数量"
- 微庆祝反馈（0.8 秒 toast）

### 11.3 核心原则
- 数据构建只用算法，不用 AI 语义判断
- 宁可漏连，不要错连
- 单次行为 < 3 分钟
- 不引入艾宾浩斯式复习计划
