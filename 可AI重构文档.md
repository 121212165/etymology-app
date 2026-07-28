# etymology-app 可AI重构文档

> **元信息**
> - **一句话定位**：「林序 / 词源密码」—— 基于 5011 个英语单词 + 613 个词根的词根词缀拆解学习 Web 应用（Next.js 15 SSG 静态导出，部署于 Vercel）。
> - **生成日期**：2026-07-28
> - **复现深度**：精确级（单凭本文档 + 数据再生方法，AI 可完全复现该项目）
> - **与其他文档的关系声明**：本文档 = 完整复现规格（唯一权威）。`README.md`（create-next-app 模板原文，无项目信息）、`DEV-SUMMARY.md`（146 行开发史，背景资料）、`CLAUDE.md`/`AGENTS.md`（代理提示，非规格）均为背景资料；凡与源码冲突之处，本文档以**源码实际**为准并已在第 10 章标注差异。
> - **密钥零收录声明**：本项目无任何环境变量、API Key、token；本文档不含任何真实密钥。

---

## 1. 项目概述

### 1.1 定位

「林序」（英文包名 `etymology-app`，UI 标题「林序 - 英语词根词缀拆解」）是一个**纯前端、零后端**的英语词汇学习应用。核心理念：通过"前缀 + 词根 + 后缀"的词素拆解让用户以词根为线索批量记忆单词（目标：快速过完 4500 词）。全部数据在构建期生成为静态 JSON，运行时由浏览器 `fetch` 加载；学习进度、收藏、埋点全部存于 `localStorage`。

- 线上地址：https://lenovo-olive.vercel.app （Vercel，framework=nextjs）
- 数据规模：**5011 个单词条目、613 个词根**（词根 = 在词库中出现 ≥2 次的 root 型词素）
- 无登录、无数据库、无服务端 API（详见第 5 章）

### 1.2 编号功能清单

| 编号 | 功能 | 入口路由 | 实现状态 |
|---|---|---|---|
| F01 | 单词卡片浏览（分页，每页 20 张） | `/` | ✅ 已上线 |
| F02 | 三级搜索（单词前缀二分 → 词根倒排 → 释义全文扫描），200ms 防抖 | `/` 顶栏 | ✅ 已上线 |
| F03 | 词根侧栏：10 个语义分组 + "其他"组，折叠状态持久化，搜索时全展开 | `/` 左栏（lg 以上） | ✅ 已上线 |
| F04 | 词根筛选：点选词根仅显示同根词，FilterChips 显示当前筛选并可清除 | `/`、`/speed` | ✅ 已上线 |
| F05 | 收藏单词（Star 按钮，localStorage 持久化） | `/` 卡片 | ✅ 已上线 |
| F06 | 单词朗读（Web Speech API，en-US，rate 0.9） | 各卡片/详情页 | ✅ 已上线 |
| F07 | 明暗主题切换（next-themes，`data-theme` 属性，默认 dark） | 顶栏 | ✅ 已上线 |
| F08 | 单词详情页（SSG 5011 页）：词素拆解卡、词源故事（模板拼接）、同根词（≤20 个） | `/word/[slug]` | ✅ 已上线 |
| F09 | 词根详情页（SSG 613 页）：词根含义 + 全部同根词列表 | `/root/[slug]` | ✅ 已上线 |
| F10 | 速览模式：三列密集卡片 + IntersectionObserver 无限滚动（每批 100）+ 移动端底部抽屉筛选 | `/speed` | ✅ 已上线 |
| F11 | 词根推理挑战：10 题/轮四选一，干扰项优先取同根词，2s 反馈后自动下一题 | `/challenge` | ⚠️ 页面存在，但依赖 `data-loader` 未实现的 `getLoadedIndices/isIndexLoaded`（见 10.2） |
| F12 | SM-2 间隔复习算法（SRS）：词根级进度 unseen→learning→reviewing→mastered | 无页面挂载 | ⚠️ 逻辑完备（`lib/srs.ts`、`learn-store`、`useProgress`），UI 未接线 |
| F13 | 本地埋点：会话/TTFI/复习完成/拆解使用/次日留存，存 localStorage | 无页面挂载 | ⚠️ 逻辑完备（`lib/analytics.ts`、`useAnalytics`），UI 未接线 |
| F14 | 任意词实时拆解（Server Action `decompose` + `DecomposePanel` 浮层） | 未挂载 | ⚠️ 代码完备但与 `output:"export"` 冲突，未被引用（见 10.2） |
| F15 | 开屏顿悟动画（understand = under + stand，5 秒四阶段） | 未挂载 | ⚠️ `EpiphanyIntro` 组件完备，未被任何页面引用 |
| F16 | 学习统计条（已学/已掌握/待复习/覆盖率） | 未挂载 | ⚠️ `StatsBar` 组件完备，未被引用 |
| F17 | 数据分块（hot/warm/cool/cold 四档按词根频次分块，供渐进加载） | 构建脚本 | ⚠️ `scripts/build-chunks.ts` 已产出 chunks，但运行时 `data-loader` 仍整包加载 vocab.json |

> ⚠️ 项标注的"未接线/未实现"是**源码现状**，复现时必须原样保留（它们有对应测试或被测试引用），除非按 10.2 的修复建议行事。

### 1.3 项目关键数字（自查实测，2026-07-28）

| 指标 | 值 |
|---|---|
| 源码文件（src + scripts + tests，不含 node_modules） | 62 个（业务 39 + 测试 19 + setup 2 + favicon/css 计入业务） |
| 测试现状（`npx vitest run` 实测） | 17 个测试文件：15 通过 / 2 失败；370 条用例：357 通过 / 13 失败 |
| 失败原因 | `tests/search-engine.test.ts`、`tests/data-loader.test.ts` 面向"分块加载版"未实现 API（`quickDecompose`、chunk 化 data-loader），详见 10.3 |
| vocab.json | 5011 条，858 KB |
| roots-index.json | 613 词根，27 KB |
| chunks | hot 552 词/50 根，warm 595 词/150 根，cool 633 词/300 根，cold 3231 词/113 根 |

---

## 2. 技术栈与环境

### 2.1 精确版本表（与 package.json 逐字一致）

**dependencies**

| 包 | 版本 |
|---|---|
| lucide-react | ^1.17.0 |
| next | ^15.3.3 |
| next-themes | ^0.4.6 |
| react | ^19.0.0 |
| react-dom | ^19.0.0 |
| zustand | ^5.0.14 |

**devDependencies**

| 包 | 版本 |
|---|---|
| @tailwindcss/postcss | ^4 |
| @testing-library/jest-dom | ^6.9.1 |
| @testing-library/react | ^16.3.2 |
| @testing-library/user-event | ^14.6.1 |
| @types/node | ^20 |
| @types/react | ^19 |
| @types/react-dom | ^19 |
| @vitejs/plugin-react | ^4.5.2 |
| @vitest/coverage-v8 | ^3.2.6 |
| eslint | ^9 |
| eslint-config-next | ^15.3.3 |
| jsdom | ^29.1.1 |
| tailwindcss | ^4 |
| tsx | ^4.22.4 |
| typescript | ^5 |
| vitest | ^3.2.6 |

package.json 其余字段：`"name": "etymology-app"`，`"version": "0.1.0"`，`"private": true`。

### 2.2 npm scripts（原文）

```json
"scripts": {
  "dev": "next dev --turbopack=false",
  "build:data": "tsx scripts/build-data.ts",
  "build": "npm run build:data && next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

> ⚠️ **已知坑**：`build:data` 指向的 `scripts/build-data.ts` **不存在**（仓库中只有 `scripts/build-chunks.ts`），因此本地 `npm run build` 会在第一步失败。Vercel 部署之所以成功，是因为 `vercel.json` 用 `"buildCommand": "next build"` 覆盖了它（跳过 build:data）。见 10.1。

实际可用命令：

| 目的 | 命令 | 说明 |
|---|---|---|
| 安装依赖 | `npm install` | 仓库同时存在 package-lock.json 与 pnpm-lock.yaml，npm/pnpm 均可 |
| 开发 | `npm run dev` | 显式关闭 turbopack；http://localhost:3000 |
| 生成分块数据 | `npx tsx scripts/build-chunks.ts` | 从 public/data/vocab.json + roots-index.json 生成 chunks/*.json |
| 生产构建 | `npx next build` | `output:"export"` → 产物在 `out/`（含 5011 词页 + 613 词根页） |
| 测试 | `npm run test` | vitest run，jsdom 环境 |
| 覆盖率 | `npm run test:coverage` | v8 provider，阈值 90%（branches/functions/lines/statements） |
| Lint | `npm run lint` | eslint 9 flat config |

### 2.3 关键配置文件（白名单原样收录）

**next.config.ts（全文）**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

**vercel.json（全文）**

```json
{
  "framework": "nextjs",
  "buildCommand": "next build"
}
```

**vitest.config.ts（全文）**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/index.ts',
      ],
    },
  },
})
```

**postcss.config.mjs（全文）** —— Tailwind 4 只需这一个 PostCSS 插件，无 tailwind.config 文件（主题用 CSS `@theme inline` 声明，见第 8 章）：

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

**eslint.config.mjs（全文）**

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

**tsconfig.json 要点**：`target ES2017`、`strict: true`、`moduleResolution: "bundler"`、`jsx: "preserve"`、路径别名 `"@/*": ["./src/*"]`、plugins `[{"name":"next"}]`、include 含 `**/*.mts` 与 `.next/types/**/*.ts`。

**vitest.setup.ts / src/test/setup.ts / tests/setup.ts（三个文件内容相同，均 1 行）**：

```ts
import '@testing-library/jest-dom/vitest'
```

（vitest.config.ts 只引用了 `./src/test/setup.ts`；根目录 vitest.setup.ts 与 tests/setup.ts 为冗余残留。）

### 2.4 环境变量

**无。** 项目不读取任何 `process.env.*` 自定义变量，无 `.env` 文件。

### 2.5 运行环境注意事项

- Node.js ≥ 18（开发时使用过 Node 25）；Windows + 中文路径（如 `Desktop\项目`）下 Node ESM 曾出现模块解析失败——建议在纯 ASCII 路径下运行测试（DEV-SUMMARY 踩坑记录，10.6）。
- `next dev` 显式 `--turbopack=false`（Next 15.3 默认询问 turbopack，此项目用 webpack dev）。

---

## 3. 目录结构

带中文注释目录树（排除 node_modules/.next/out/.vercel-tmp/tsconfig.tsbuildinfo）：

```
etymology-app/
├── package.json                 # 依赖与脚本（见 2.1/2.2，注意 build:data 指向缺失文件）
├── package-lock.json            # npm 锁文件（340KB）
├── pnpm-lock.yaml               # pnpm 锁文件（并存）
├── next.config.ts               # output:"export" 静态导出 + images.unoptimized
├── vercel.json                  # 覆盖 buildCommand 为 next build
├── tsconfig.json                # strict + @/* → ./src/*
├── vitest.config.ts             # jsdom + 90% 覆盖率阈值
├── vitest.setup.ts              # （冗余）jest-dom 注册
├── postcss.config.mjs           # Tailwind 4 PostCSS 插件
├── eslint.config.mjs            # eslint 9 flat config（next vitals + ts）
├── next-env.d.ts                # Next 自动生成
├── README.md                    # create-next-app 模板原文（无项目信息）
├── DEV-SUMMARY.md               # 开发史（词根分组阶段 + 测试体系阶段）
├── AGENTS.md / CLAUDE.md        # AI 代理提示（CLAUDE.md 内容仅 "@AGENTS.md"）
├── scripts/
│   └── build-chunks.ts          # 【数据管线】按词根频次把 5011 词切成 4 档 chunk
├── public/
│   ├── file.svg globe.svg next.svg vercel.svg window.svg   # create-next-app 自带图标（未使用）
│   └── data/                    # 【核心静态数据，运行时 fetch】
│       ├── vocab.json           # 5011 条 VocabEntry[]（858KB，压缩 JSON）
│       ├── roots-index.json     # 613 词根倒排索引 RootIndex（27KB）
│       ├── sidebar.json         # 613 条 {t,m,c} 按词频降序（19KB；旧版侧栏数据，当前运行时未 fetch）
│       ├── word-sorted.json     # 5011 条 {w,i} 字典序（120KB；当前运行时未 fetch，改为前端现算）
│       └── chunks/
│           ├── manifest.json    # { chunks:[{name,roots,wordCount}], totalWords:5011 }
│           ├── chunk-hot.json   # 词根频次 Top50 覆盖的 552 词
│           ├── chunk-warm.json  # 排名 50-200 词根的 595 词
│           ├── chunk-cool.json  # 排名 200-500 词根的 633 词
│           └── chunk-cold.json  # 其余 3231 词
├── src/
│   ├── app/                     # Next App Router
│   │   ├── layout.tsx           # 根布局：三字体 + next-themes Provider（dark 默认）
│   │   ├── globals.css          # 设计系统：@theme inline + 明暗两套 CSS 变量 + 组件样式
│   │   ├── favicon.ico
│   │   ├── page.tsx             # 首页（"use client"）：搜索/侧栏/卡片/分页
│   │   ├── speed/page.tsx       # 速览模式：无限滚动 + 移动端筛选抽屉
│   │   ├── challenge/page.tsx   # 词根推理挑战（四选一）
│   │   ├── word/[slug]/page.tsx # 单词详情（SSG，generateStaticParams=5011 词）
│   │   ├── root/[slug]/page.tsx # 词根详情（SSG，generateStaticParams=613 根）
│   │   └── actions/decompose.ts # "use server" 任意词拆解（未挂载，与 export 冲突）
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.tsx       # 顶栏：Logo（TreesIcon+林序）+ SearchInput + ThemeToggle
│   │   │   ├── Sidebar.tsx      # 词根分组侧栏（折叠持久化 key: sidebar-collapsed-groups）
│   │   │   └── __tests__/       # Sidebar.test.tsx / TopBar.test.tsx
│   │   ├── search/
│   │   │   ├── SearchInput.tsx  # 防抖搜索框（200ms，defaultValue 非受控）
│   │   │   ├── FilterChips.tsx  # 结果数 + 词根/搜索 chip + 清除全部
│   │   │   ├── DecomposePanel.tsx # 拆解结果浮层（词素渐入动画；未挂载）
│   │   │   └── __tests__/       # FilterChips.test.tsx
│   │   ├── word/
│   │   │   ├── WordCard.tsx     # 标准卡片：词/释义/朗读/收藏/PartTags
│   │   │   ├── SpeedCard.tsx    # 速览密集卡片
│   │   │   ├── CardGrid.tsx     # auto-fill minmax(300px,1fr) 网格 + 空态
│   │   │   ├── PartTags.tsx     # 词素彩色药丸（prefix 橙/root 绿/suffix 紫）
│   │   │   └── __tests__/       # CardGrid.test.tsx
│   │   ├── ui/
│   │   │   ├── Pagination.tsx   # 7 格省略号分页
│   │   │   ├── SpeakButton.tsx  # 详情页朗读按钮（独立实现 speechSynthesis）
│   │   │   ├── ThemeToggle.tsx  # 主题切换（mounted 防水合闪烁）
│   │   │   └── __tests__/       # Pagination.test.tsx
│   │   ├── stats/StatsBar.tsx   # 学习统计条（未挂载）
│   │   └── epiphany/
│   │       ├── EpiphanyIntro.tsx / EpiphanyIntro.css  # 开屏顿悟动画（未挂载）
│   ├── hooks/
│   │   ├── useSearch.ts         # 触发 loadSearchIndex → 写入 app-store
│   │   ├── useFavorites.ts      # 收藏 Set<number>（key: linxu-favorites）
│   │   ├── useSpeak.ts          # speechSynthesis 封装
│   │   ├── useChallenge.ts      # 挑战状态机 + 干扰项算法（依赖缺失 API，见 10.2）
│   │   ├── useProgress.ts       # SM-2 的 hook 版实现（与 lib/srs.ts 平行，未挂载）
│   │   ├── useAnalytics.ts      # 埋点 hook（未挂载）
│   │   └── __tests__/           # useFavorites / useSearch / useSpeak
│   ├── lib/
│   │   ├── types.ts             # 【核心类型】VocabEntry 等（缺 RootProgress/ProgressMap，见 10.2）
│   │   ├── constants.ts         # PAGE_SIZE/DEBOUNCE_MS/MIN_SEARCH_LEN/STORAGE_KEYS/PART_COLORS
│   │   ├── data-loader.ts       # 整包 fetch vocab.json + roots-index.json，单例缓存
│   │   ├── search-engine.ts     # 三级搜索 + 索引构建 + 侧栏分组
│   │   ├── root-groups.ts       # 10 个语义分组 × 174 个核心词根（人工数据）
│   │   ├── srs.ts               # SM-2 算法 + localStorage 进度读写
│   │   ├── analytics.ts         # 本地埋点（linxu-events）
│   │   └── __tests__/           # constants/root-groups/search-engine/types/vocab-quality(.mjs)
│   ├── store/
│   │   ├── app-store.ts         # Zustand：搜索索引/查询/筛选/分页/视图
│   │   ├── learn-store.ts       # Zustand persist：SRS 进度（name: linxu-progress）
│   │   └── __tests__/           # app-store.test.ts
│   └── test/setup.ts            # vitest setupFile（jest-dom）
└── tests/                       # 【注意】面向"分块加载重构版"的测试，2 个当前失败
    ├── setup.ts                 # （冗余，未被 vitest.config 引用）
    ├── srs.test.ts              # lib/srs 测试（通过）
    ├── data-loader.test.ts      # 期望 manifest/chunk 式 loader（当前失败）
    └── search-engine.test.ts    # 期望 quickDecompose/prefixIndex API（部分失败）
```

<!-- SECTION 1-3 END -->

---

## 4. 数据模型

### 4.1 TypeScript 类型定义原文（src/lib/types.ts 全文，42 行，白名单逐字收录）

```ts
export interface VocabPart {
  type: "prefix" | "root" | "suffix";
  text: string;
  meaning: string;
  decomposed: boolean;
}

export interface VocabEntry {
  word: string;
  definition: string;
  parts: VocabPart[];
  source?: string;
}

export interface RootIndexEntry {
  m: string; // meaning
  w: number[]; // word indices in VOCAB_DATA
}

export type RootIndex = Record<string, RootIndexEntry>;

export interface SidebarRoot {
  t: string; // text
  m: string; // meaning
  c: number; // count
}

export interface SidebarGroup {
  label: string;      // 分组中文名
  icon: string;       // 图标标识
  roots: SidebarRoot[];
}

export interface SearchIndex {
  data: VocabEntry[];
  rootIndex: RootIndex;
  wordSorted: { w: string; i: number }[];
}

export type ViewMode = "list" | "flashcard" | "stats";
export type LearnStatus = "new" | "learning" | "learned";
```

> ⚠️ **类型缺口（复现必读，详见 10.2）**：`src/lib/srs.ts`、`src/store/learn-store.ts`、`src/hooks/useProgress.ts` 均 `import type { RootProgress, ProgressMap } from "@/lib/types"`，但 types.ts **并未定义**这两个类型；且上述文件实际使用的状态值是 `"unseen" | "learning" | "reviewing" | "mastered"`，与 types.ts 中 `LearnStatus = "new" | "learning" | "learned"` **不一致**。由于 `import type` 在运行期被擦除，vitest（esbuild 转译、不做类型检查）能跑通，但 `tsc --noEmit` / `next build` 的类型检查会失败。复现时若要求 `next build` 通过，必须在 types.ts 追加以下定义并修正 LearnStatus（这是从 srs.ts 用法反推出的唯一自洽定义）：

```ts
// —— 复现补丁（源码中缺失，按 srs.ts / learn-store.ts / useProgress.ts 的用法反推）——
export type LearnStatus = "unseen" | "learning" | "reviewing" | "mastered";

export interface RootProgress {
  status: LearnStatus;
  easeFactor: number;      // SM-2 易度因子，默认 2.5，下限 1.3
  interval: number;        // 复习间隔（天），初始 0
  nextReview: string;      // ISO 时间串（useProgress 的 INITIAL_ROOT 用 ""）
  reviewCount: number;     // 累计复习次数
  lastReview: string | null;
  correctStreak: number;   // 连续答对次数
}

export type ProgressMap = Record<string, RootProgress>;
```

### 4.2 vocab.json —— 词汇主数据（5011 条 VocabEntry[]）

- 路径：`public/data/vocab.json`，858 KB，压缩 JSON（无缩进），UTF-8。
- 结构：`VocabEntry[]` 顶层数组；**数组下标 = 全局词条 ID**，被 roots-index.json 的 `w`、word-sorted.json 的 `i`、收藏/搜索结果等一切索引引用，**顺序不可变**。
- 字段规范：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| word | string | ✅ | 英文单词（小写为主，个别首字母大写） |
| definition | string | ✅ | 中文释义（可含逗号分隔多义） |
| parts | VocabPart[] | ✅（≥1） | 词素拆解序列，按 prefix→root→suffix 顺序 |
| parts[].type | "prefix"\|"root"\|"suffix" | ✅ | 词素类型 |
| parts[].text | string | ✅ | 词素拼写（纯 ASCII，构建期清洗掉含中文/空串的 part） |
| parts[].meaning | string | ✅ | 词素中文含义（自动分解未识别时为 "待确认"/"整词" 等） |
| parts[].decomposed | boolean | ✅ | true=已成功拆解；false=整词兜底（text=整词） |
| source | string | ❌ | 数据来源标记，实测取值："manual"（人工词库）等；无该字段的为自动生成 |

- **完整样例记录（vocab.json 实际前 3 条，逐字）**：

```json
[
  { "word": "act", "definition": "行动",
    "parts": [ { "type": "root", "text": "act", "meaning": "做，行动", "decomposed": true } ],
    "source": "manual" },
  { "word": "action", "definition": "行动，行为",
    "parts": [ { "type": "root", "text": "act", "meaning": "做，行动", "decomposed": true },
               { "type": "suffix", "text": "ion", "meaning": "行为，状态", "decomposed": true } ],
    "source": "manual" },
  { "word": "active", "definition": "活跃的",
    "parts": [ { "type": "root", "text": "act", "meaning": "做，行动", "decomposed": true },
               { "type": "suffix", "text": "ive", "meaning": "倾向于...的", "decomposed": true } ],
    "source": "manual" }
]
```

（注：实际文件为单行压缩 JSON，`separators=(',',':')` 风格；此处为便于阅读加了换行。）

### 4.3 roots-index.json —— 词根倒排索引（613 键 RootIndex）

- 路径：`public/data/roots-index.json`，27 KB。
- 结构：`Record<词根text, { m: 首见meaning, w: 词条下标升序数组 }>`；**仅收录在 vocab.json 中作为 `type:"root"` 出现 ≥2 次的词根**（613 个）。`m` 取该词根在全库**首次出现**时的 meaning。
- 实际样例（截取）：

```json
{ "act": { "m": "做，行动", "w": [0, 1, 2, 3, 4, 5, 6, 7, ...] },
  "aud": { "m": "听", "w": [9, 10, 11, ...] } }
```

### 4.4 sidebar.json 与 word-sorted.json（构建产物，当前运行时未加载）

| 文件 | 结构 | 生成规则 | 运行时状态 |
|---|---|---|---|
| sidebar.json（19KB） | `SidebarRoot[]`（613 条 `{t,m,c}`） | 由 roots-index 映射 `{t:词根, m:meaning, c:w.length}` 按 c 降序 | ❌ 未被 fetch；侧栏数据改由前端 `buildSidebarData/buildSidebarGroups` 现算 |
| word-sorted.json（120KB） | `{w:小写词, i:下标}[]` 5011 条按 w 字典序 | `word.toLowerCase()` 后 sort | ❌ 未被 fetch；改由前端 `buildWordSorted`（localeCompare）现算。实际首 3 条：`{"w":"abandon","i":197}`、`{"w":"ability","i":198}`、`{"w":"able","i":199}` |

### 4.5 chunks/ —— 四档分块（scripts/build-chunks.ts 产物，运行时未加载）

- `manifest.json`（2 空格缩进）：

```json
{ "chunks": [
    { "name": "chunk-hot",  "roots": ["...Top50 词根名"],   "wordCount": 552 },
    { "name": "chunk-warm", "roots": ["...50-200 名词根"],  "wordCount": 595 },
    { "name": "chunk-cool", "roots": ["...200-500 名词根"], "wordCount": 633 },
    { "name": "chunk-cold", "roots": ["...其余 113 词根"],  "wordCount": 3231 } ],
  "totalWords": 5011 }
```

- `chunk-{hot|warm|cool|cold}.json`：各为 `VocabEntry[]`（**仅实体数组，不含原始下标**——这正是 tests/data-loader.test.ts 期望的分块 loader 未能实现的原因之一，见 10.3）。

### 4.6 Zustand store 结构（白名单逐字收录）

**src/store/app-store.ts —— 接口原文**（非持久化，全局 UI/搜索状态）：

```ts
interface AppState {
  // Data
  searchIndex: SearchIndex | null;
  filteredIndices: number[];

  // UI state
  query: string;
  activeRoot: string | null;
  currentPage: number;
  viewMode: ViewMode;

  // Actions
  setSearchIndex: (index: SearchIndex) => void;
  setQuery: (q: string) => void;
  setActiveRoot: (root: string | null) => void;
  setCurrentPage: (page: number) => void;
  setViewMode: (mode: ViewMode) => void;
  applyFilters: () => void;
}
```

初始值：`searchIndex:null, filteredIndices:[], query:"", activeRoot:null, currentPage:1, viewMode:"list"`。行为约定：`setSearchIndex` 写入索引后**立即**用当前 query/activeRoot 执行一次 `executeSearch` 并重置 `currentPage:1`；`setQuery`/`setActiveRoot` 均重置页码为 1 再调 `applyFilters()`；`applyFilters` 在 `searchIndex` 为 null 时直接 return。

**src/store/learn-store.ts —— 接口原文**（persist 持久化）：

```ts
interface LearnState {
  progress: ProgressMap;
  todayDue: string[];

  getRoot: (key: string) => RootProgress;
  recordReview: (rootKey: string, quality: number) => void;
  refreshDue: () => void;
  stats: () => ReturnType<typeof getProgressStats>;
}
```

persist 配置原文：`{ name: STORAGE_KEYS.progress, partialize: (state) => ({ progress: state.progress }) }`。行为：`getRoot` 未命中返回 `initializeProgress()`（不写入）；`recordReview` 用 `calculateNextReview` 生成新记录后整体替换 progress 并调 `refreshDue()`；`refreshDue` 调 `srs.getDueRoots()`——注意该函数**直接读 localStorage 原始 JSON** 而非 store state，与 persist 的包裹格式 `{state:{progress},version}` 存在双写冲突（见 10.4）。

### 4.7 localStorage / sessionStorage 全表

常量定义原文（src/lib/constants.ts，白名单）：

```ts
export const PAGE_SIZE = 20;
export const DEBOUNCE_MS = 200;
export const MIN_SEARCH_LEN = 2;

export const STORAGE_KEYS = {
  theme: "linxu-theme",
  favorites: "linxu-favorites",
  progress: "linxu-progress",
  vocabCache: "linxu-vocab-cache",
} as const;

export const PART_COLORS = {
  prefix: "#E8A84C",
  root: "#5BB89A",
  suffix: "#9B8EC4",
} as const;
```

| Key | 存储 | 写入方 | 值格式 |
|---|---|---|---|
| linxu-favorites | localStorage | useFavorites | `number[]`（词条下标数组，内存态为 Set<number>） |
| linxu-progress | localStorage | ①lib/srs.ts 直写：`ProgressMap` 裸对象 ②learn-store persist：`{state:{progress:ProgressMap},version:0}` | **两种格式互不兼容**（10.4） |
| linxu-theme | — | 常量已定义但 next-themes 实际使用默认 key `theme` | （未使用） |
| linxu-vocab-cache | — | 常量已定义，无任何代码写入 | （未使用） |
| sidebar-collapsed-groups | localStorage | Sidebar.tsx | `string[]`（折叠的分组 label 数组） |
| linxu-seen-intro | localStorage | EpiphanyIntro.tsx（未挂载） | `"1"` |
| linxu-events | localStorage | lib/analytics.ts | `AnalyticsEvent[]`（{type,ts,payload?}） |
| linxu-last-session | localStorage | lib/analytics.ts | 上次会话结束时间戳（ms 数字字符串），用于 24h 次日留存判定 |
| linxu-session-id | **sessionStorage** | lib/analytics.ts | 会话随机 ID |
| theme | localStorage | next-themes（默认 key） | `"dark"`/`"light"` |

<!-- SECTION 4 END -->

---

## 5. API 契约

### 5.1 结论：无后端 API

本项目 `output:"export"` 纯静态导出，**没有任何 HTTP API 端点、数据库、鉴权**。数据获取方式共三种：

| 方式 | 使用方 | 说明 |
|---|---|---|
| 运行时 `fetch("/data/*.json")` | `lib/data-loader.ts`（首页/速览/挑战页） | 并发 fetch vocab.json + roots-index.json，模块级单例缓存 |
| 构建期 `readFileSync` | `word/[slug]/page.tsx`、`root/[slug]/page.tsx` | `join(process.cwd(), "public", "data", "...")`，SSG 预渲染 5011+613 页 |
| Server Action（死代码） | `app/actions/decompose.ts` | `"use server"`，与静态导出冲突，未被任何组件调用 |

### 5.2 data-loader 契约（src/lib/data-loader.ts）

```
loadSearchIndex(): Promise<SearchIndex>
  ─ 首次调用：Promise.all([fetch("/data/vocab.json"), fetch("/data/roots-index.json")])
    → 任一 !res.ok 抛 Error("Failed to load vocabulary data")
    → wordSorted 由前端 buildWordSorted(data) 现算（localeCompare 排序）
    → 结果存模块级变量 cachedIndex
  ─ 并发调用：共享模块级 loadingPromise（去重）；失败后 loadingPromise 置 null 可重试
getCachedIndex(): SearchIndex | null   ─ 同步读缓存
```

> ⚠️ `useChallenge.ts` 与 `tests/*.test.ts` 期望的 `getLoadedIndices(): number[]` 与 `isIndexLoaded(i): boolean` **未实现/未导出**（分块加载重构未完成，见 10.2/10.3）。若要修复，最小实现：整包加载后 `getLoadedIndices = () => cachedIndex ? data.map((_,i)=>i) : []`，`isIndexLoaded = (i) => cachedIndex !== null && i >= 0 && i < data.length`。

### 5.3 decompose Server Action 契约（未挂载，但需原样复现）

接口定义原文（文件内联，不在 types.ts）：

```ts
interface DecomposePart {
  type: "prefix" | "root" | "suffix";
  text: string;
  meaning: string;
}

interface DecomposeResult {
  word: string;        // 小写 trim 后的输入
  parts: DecomposePart[];
  confidence: number;  // 0~1，词库命中=1，规则拆解按 6.4 计分
  family: string[];    // 同根词单词串 ≤12 个
  etymology: string;   // 中文拼接：`${word} 由 前缀 "x"（含义） + ... 构成。`
}

export async function decompose(word: string): Promise<DecomposeResult>
```

---

## 6. 核心业务逻辑与算法

### 6.1 数据管线全景

```
【上游（工作区根目录 c:\...\项目\，在 etymology-app 仓库外）】
 gen_vocab.py / gen_vocab_full.py（已佚失，见 10.5）
        │ 提供基础词表 + 人工拆解词库
        ▼
 gen_vocab_v2.py  ──自动分解引擎（见 6.7）──▶  vocab_data_v2.json（最后可再生源头，5000+条）
        │
 gen_build.py ──清洗+索引规则（见 6.2A）──▶ 旧版单文件 index.html（注入 4 个 const）

【本仓库（etymology-app）】
 public/data/vocab.json + roots-index.json + sidebar.json + word-sorted.json
   （= gen_build.py 同源逻辑的 JSON 化产物，由已缺失的 scripts/build-data.ts 生成，见 9.4 重建规格）
        │
 scripts/build-chunks.ts ──▶ public/data/chunks/{manifest,chunk-hot|warm|cool|cold}.json
        │
 运行时：data-loader 整包 fetch vocab+roots-index → 前端现算 wordSorted/sidebar 分组
```

### 6.2 构建期规则

**A. 数据清洗与索引生成规则**（源自上游 gen_build.py，也是缺失的 build-data.ts 应实现的规则，白名单级精确收录）：

1. 词条过滤：`word` 或 `definition` 为空 → 整条丢弃。
2. part 过滤（is_valid_part）：`text` 含中文（正则 `[\u4e00-\u9fff]`）或 `text.strip()` 为空 → 丢弃该 part；若清洗后 parts 为空 → 整条丢弃。
3. roots-index：遍历清洗后数据，对每个 `type=="root"` 的 part 以 `text` 为键累积下标；`m` 取首见 meaning（`if not root_index[key]['m']`）；最后**过滤 `len(w) < 2`**。
4. sidebar：`{t,m,c:len(w)}` 按 `c` 降序。
5. word-sorted：`{w: word.lower(), i}` 按 `w` 升序。
6. 序列化：`ensure_ascii=False, separators=(',',':')`（压缩 JSON）。

**B. 分块规则（scripts/build-chunks.ts，TIERS 常量原文）**：

```ts
const TIERS = [
  { name: "hot", start: 0, end: 50 },
  { name: "warm", start: 50, end: 200 },
  { name: "cool", start: 200, end: 500 },
  { name: "cold", start: 500, end: Infinity },
] as const;
```

算法：①词根按 `w.length` 降序排名；②按排名落入 tier，该词根的每个词条下标若未被 `assigned: Set<number>` 占用则归入该 tier（**先到先得，防重复归档**）；③扫尾：未被任何词根覆盖的词条全部进 cold；④输出 `chunk-{name}.json`（仅实体数组，无缩进）与 `manifest.json`（2 空格缩进，`{chunks:[{name,roots,wordCount}],totalWords}`）。实测产出：hot 552/50、warm 595/150、cool 633/300、cold 3231/113。

### 6.3 三级搜索引擎（src/lib/search-engine.ts · executeSearch）

签名：`executeSearch(index: SearchIndex, query: string, activeRoot: string | null): number[]`（返回词条下标数组）。

```
① activeRoot 短路：若 activeRoot 非空 → 直接返回 rootIndex[activeRoot].w（不存在则 []），忽略 query
② 空查询：q = query.trim().toLowerCase() 为空 → 返回全量 [0..data.length-1]
③ L1 前缀二分：lowerBound(wordSorted, q) 找起点，向后线扫所有 w.startsWith(q) 收录 i
④ L2 词根倒排：遍历 rootIndex，若 rootText.includes(q) → 合并该词根的 w 全部下标
⑤ L3 全文扫描：仅当 q.length >= MIN_SEARCH_LEN(2) → 线扫 data，word 或 definition 含 q 即命中
⑥ 三级结果用 Set 去重，保持 L1→L2→L3 首次命中顺序，转数组返回
```

`lowerBound`：经典左闭二分（lo=0, hi=len；arr[mid].w < target → lo=mid+1 否则 hi=mid），空数组返 0，全小于目标返 len。

索引构建函数（同文件）：`buildWordSorted(data)`（小写 + `localeCompare` 升序）；`buildRootIndex(data)`（同 6.2A 规则 3，前端版）；`buildSidebarData(rootIndex)`（{t,m,c} 按 c 降序）；`buildSidebarGroups(rootIndex)`：按 `ROOT_GROUPS` 声明顺序认领词根（members 中存在于 rootIndex 的才收录），组内按 c 降序；未被任何组认领的词根按 c 降序归入末尾「其他」组（icon: "more"）；空组不输出。

### 6.4 任意词拆解算法（app/actions/decompose.ts，未挂载）

内置词缀表：`PREFIXES` 52 对、`SUFFIXES` 52 对 `[text, meaning]`（匹配时拷贝后按 text 长度降序尝试；注意原文含重复项 `re`、`ence`，复现时保留）。两表不可推导，逐字收录：

```ts
const PREFIXES: [string, string][] = [
  ["un", "不，非"], ["re", "再，重新"], ["in", "不，进入"], ["im", "不，进入"],
  ["dis", "不，分离"], ["en", "使成为"], ["em", "使成为"], ["non", "非"],
  ["pre", "前，预先"], ["pro", "向前，赞成"], ["ex", "出，前"], ["sub", "下，次"],
  ["super", "超，上"], ["trans", "跨越"], ["inter", "在...之间"], ["mis", "错误"],
  ["over", "过度"], ["under", "不足"], ["out", "出，外"], ["up", "向上"],
  ["down", "向下"], ["fore", "前，预先"], ["self", "自我"], ["semi", "半"],
  ["anti", "反对"], ["auto", "自动"], ["bi", "二，双"], ["co", "共同"],
  ["con", "共同"], ["com", "共同"], ["de", "向下，去除"], ["di", "二，分离"],
  ["dif", "分离"], ["il", "不"], ["ir", "不"], ["macro", "大"],
  ["micro", "小"], ["mid", "中"], ["mini", "小"], ["mono", "单一"],
  ["multi", "多"], ["neo", "新"], ["omni", "全"], ["para", "旁，类似"],
  ["poly", "多"], ["post", "后"], ["pseudo", "假"], ["re", "再"],
  ["retro", "回，向后"], ["tri", "三"], ["uni", "一"], ["vice", "副"],
];

const SUFFIXES: [string, string][] = [
  ["tion", "行为，状态"], ["sion", "行为，状态"], ["ment", "行为，结果"], ["ness", "性质，状态"],
  ["ity", "性质"], ["ance", "性质，状态"], ["ence", "性质，状态"], ["able", "能够...的"],
  ["ible", "能够...的"], ["ful", "充满...的"], ["less", "无...的"], ["ous", "充满...的"],
  ["ious", "充满...的"], ["ive", "倾向于...的"], ["ative", "倾向于...的"], ["itive", "倾向于...的"],
  ["al", "...的"], ["ial", "...的"], ["ual", "...的"], ["ical", "...的"],
  ["ist", "做...的人"], ["ism", "主义，学说"], ["er", "做...的人"], ["or", "做...的人"],
  ["ar", "做...的人"], ["eer", "做...的人"], ["ier", "做...的人"], ["ee", "被...的人"],
  ["ant", "做...的人"], ["ent", "做...的人"], ["dom", "领域，状态"], ["ship", "身份，关系"],
  ["hood", "身份，状态"], ["age", "行为，状态"], ["ure", "行为，结果"], ["ence", "行为，状态"],
  ["ling", "小"], ["let", "小"], ["ette", "小"], ["fy", "使...化"],
  ["ify", "使...化"], ["ize", "使...化"], ["ise", "使...化"], ["ly", "...地"],
  ["ward", "向..."], ["wise", "以...方式"], ["teen", "十"], ["ty", "十"],
  ["th", "第..."], ["en", "使成为"], ["ish", "略带...的"], ["esque", "...风格的"],
];
```

流程（与源码逐行对齐）：

1. 输入 `word.toLowerCase().trim()`；模块级惰性缓存 `loadVocab()/loadRootIndex()`（readFileSync `process.cwd()/public/data/*.json`）；先查词库（`vocab.find` 小写全等），命中 → `confidence=1`，parts 直接映射，family 用 `findFamily`（同根 root text 交集，排除自身，`.slice(0,12)` 取词）。
2. 规则拆解（**各最多剥一层**）：`stripPrefix`：表按长度降序，条件 `word.length > text.length + 2` 且 `startsWith`，剥后剩余 `rest.length >= 3` 才接受；`stripSuffix`：同理 `endsWith`，剩余 `>= 2`。
3. 残段查根 `findRootMatch(stem)`：roots-index 键按长度降序，`stem.includes(rootText) && rootText.length >= 2` 首命中即返回；未命中且 `stem.length >= 3` → `{type:"root", text:stem, meaning:"词根（待确认）"}`。
4. 置信度：基础 0.6；前缀 +0.1；后缀 +0.1；词根命中 +0.15；词根待确认 −0.15；parts 为空时兜底 `{text:整词, meaning:"未知词根"}` 且 confidence=0.2；最后 `Math.min(Math.max(confidence,0),1)`。注意 parts push 顺序为 **prefix→suffix→root**（非阅读顺序，原样保留）。
5. 规则分支的 family：取 root part 在 roots-index 的 `w.slice(0,12)` 映射为单词，过滤掉自身与空值。
6. `buildEtymology`：`"${word} 由 前缀/词根/后缀 \"text\"（meaning） + ... 构成。"`；parts 空时 `"${word} 的词源分析暂无数据。"`。

### 6.5 SM-2 间隔复习（src/lib/srs.ts，白名单级规则）

常量：`MIN_EF = 1.3`、`DEFAULT_EF = 2.5`。`initializeProgress()` 返回 `{status:"unseen", easeFactor:2.5, interval:0, nextReview:当前ISO, reviewCount:0, lastReview:null, correctStreak:0}`。

`calculateNextReview(quality, current)` 关键逻辑（逐字）：

```ts
const q = Math.max(0, Math.min(5, quality));
if (q >= 3) {
  correctStreak += 1;
  if (interval === 0) { interval = 1; }
  else if (interval === 1) { interval = 6; }
  else { interval = Math.round(interval * easeFactor); }
} else {
  correctStreak = 0;
  interval = 1;
}
easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
if (easeFactor < MIN_EF) easeFactor = MIN_EF;
```

`nextReview = 今天 + interval 天`（setDate）；`reviewCount+1`；`lastReview=现在`。

状态机 `deriveStatus(prev, q, streak, ef)`（逐字规则）：

| 条件 | 结果 |
|---|---|
| q < 3 | prev=="unseen" ? "unseen" : "learning"（降级） |
| prev=="unseen" 且 q≥3 | "learning" |
| prev=="learning" 且 streak≥2 | "reviewing" |
| prev=="reviewing" 且 streak≥4 且 ef>2.0 | "mastered" |
| 其他 | 保持 prev |

`getDueRoots()`：读 localStorage["linxu-progress"]，**跳过 status=="unseen"**，`nextReview <= now` 即到期。`getProgressStats(map)`：返回 `{unseen,learning,reviewing,mastered,due}` 五计数（due 同样排除 unseen）。全部读写都有 `typeof window === "undefined"` SSR 守卫与 try/catch。

> 平行实现差异（useProgress.ts，见 7.4）：升级更宽松——learning→reviewing 不看 streak，reviewing→mastered 不看 EF；q<3 时 unseen 也会变 learning；INITIAL_ROOT 的 nextReview 为 `""`。两套实现均未接 UI，复现时原样保留。

### 6.6 词根推理挑战状态机（src/hooks/useChallenge.ts）

常量：`ROUND_SIZE = 10`（题/轮）、`FEEDBACK_MS = 2000`。`Phase = "loading" | "idle" | "playing" | "feedback" | "results"`。

```
loading ─加载索引完成─▶ idle ─start()─▶ playing ─选答─▶ feedback(2s 定时)
   ▲                                    ▲──未满10题──┘   │满10题
   └────────────── restart() ◀────── results ◀───────┘
```

出题：从已加载词条中随机抽含 root 的词；题干=单词+释义，问该词核心词根的含义，四选一。`pickDistractors`：干扰项优先取**同词根家族以外、但词形相近/同频段**的词根含义，不足时从全部词根含义随机补齐，Fisher–Yates 洗牌后与正确项混排。计分：答对 +1，results 阶段显示 `score/10` 与正确率。

> ⚠️ 该 hook `import { getLoadedIndices, isIndexLoaded } from "@/lib/data-loader"`，两函数不存在 → `/challenge` 运行时崩溃（10.2）。

### 6.7 上游自动分解引擎（gen_vocab_v2.py，工作区根目录，492 行）

复现词库时若需从零再生数据，按以下规格重建（完整词缀表在原文件中，本文档只收录算法规则）：

- 资源表：`PREFIXES` 71 项、`ROOTS` ≈230 项、`SUFFIXES` ≈58 项（均为 text→meaning 字典）、`GERMANIC_WORDS` ≈230 词白名单（日耳曼词不拆）。
- `auto_decompose(word)`：①长度 <4 或在 GERMANIC_WORDS → 整词单 part（decomposed=False）；②最多剥 2 个前缀（长优先，剥后剩余 ≥3）；③最多剥 2 个后缀（短后缀（≤2 字符）仅在剩余 ≥5 时剥）；④残段匹配 ROOTS：精确命中，或词根为残段前缀且长度差 ≤3；⑤失败则整词兜底。
- `validate_decomposition` 四规则（全过才收）：拼接长度差 ≤2 或字符相似度 ≥0.75；meaning ≠ text；text 无中文；text ≥2 字符。
- ⚠️ 脚本开头 `import gen_vocab` 并读 `gen_vocab_full.py`，两文件均已佚失 → **gen_vocab_v2.py 当前不可直接运行**；`vocab_data_v2.json` 是事实上的最后可再生源头（10.5）。

### 6.8 边界条件汇总（全局）

| # | 边界 | 行为 |
|---|---|---|
| B1 | 搜索 query 仅 1 字符 | L1/L2 生效，L3 全文扫描跳过（MIN_SEARCH_LEN=2） |
| B2 | activeRoot 不在 rootIndex | executeSearch 返回 []（空态 UI） |
| B3 | 搜索结果跨页后缩小 | setQuery/setActiveRoot 强制 currentPage=1，不会越界 |
| B4 | searchIndex 未加载时操作 | applyFilters 直接 return；页面显骨架屏 |
| B5 | fetch 失败 | loadSearchIndex 抛错且 loadingPromise 置 null（可重试）；首页捕获后显错误态 |
| B6 | SSR 环境访问 storage | srs/analytics/favorites 均有 `typeof window` 守卫 |
| B7 | localStorage JSON 损坏 | 各读取处 try/catch 回退默认值 |
| B8 | quality 越界（<0 或 >5） | clamp 到 [0,5] |
| B9 | EF 跌破下限 | clamp 到 1.3 |
| B10 | interval 首两次固定 | 0→1→6，之后 round(i×EF) |
| B11 | 收藏空集 isWordMastered | useProgress 返回 false（空 parts 同） |
| B12 | 同根词列表上限 | word 详情页 ≤20（Set 去重 + 双 break）；decompose family ≤12 |
| B13 | 分页省略号 | Pagination 总页 ≤7 全显；否则首尾+当前邻域+“...” |
| B14 | 无障碍动画 | EpiphanyIntro 在 prefers-reduced-motion 时用 200/400/600/800ms 短时序 |
| B15 | 语音不可用 | useSpeak/SpeakButton 检测 `"speechSynthesis" in window`，不可用则静默降级 |
| B16 | 分块归档冲突 | build-chunks 用 assigned Set 保证每词条只入一个 chunk，总和恒等于 5011 |

<!-- SECTION 5-6 END -->

---

## 7. 核心文件逐一说明【文档主体】

本章覆盖全部 **39 个业务文件**（lib 7 + store 2 + hooks 6 + app 10 + components 16（含 1 个 css）+ scripts 1）与 **19 个测试/辅助文件**（分组说明）。格式：`路径 | 职责 | 实现要点 | 关键代码（仅不可推导部分） | 边界`。已在第 4/6 章全文收录的文件此处只补充未尽事项。

### 7.1 src/lib/（7 文件）

**7.1.1 lib/types.ts** —— 全部数据类型。全文见 4.1（含缺失类型补丁）。边界：`SearchIndex.wordSorted` 用内联 `{w,i}[]` 而非命名类型；tests/search-engine.test.ts 还期望 `SearchIndex` 含可选 `prefixIndex/suffixIndex: Record<string,string>`（当前类型无此二字段，测试传入时靠结构宽松性通过）。

**7.1.2 lib/constants.ts** —— 全局常量。全文见 4.7。边界：`STORAGE_KEYS.theme/vocabCache` 定义了但无人使用。

**7.1.3 lib/data-loader.ts**（约 45 行）
- 职责：运行时整包加载两个 JSON，构建 SearchIndex 单例。
- 实现要点：模块级 `let cachedIndex: SearchIndex | null = null; let loadingPromise: Promise<SearchIndex> | null = null;`；`loadSearchIndex` 先查 cachedIndex，再查 loadingPromise（并发去重），都没有才发起 `Promise.all` 双 fetch；wordSorted 由 `buildWordSorted(data)` 现算；`getCachedIndex()` 同步返回。
- 关键代码（失败可重试的细节，不可推导）：`loadingPromise = (async () => {...})().catch((e) => { loadingPromise = null; throw e; })` 风格——失败后清空 promise 允许重试。
- 边界：`!res.ok` 抛 `Error("Failed to load vocabulary data")`；**未导出** `getLoadedIndices/isIndexLoaded`（10.2）。

**7.1.4 lib/search-engine.ts**（约 130 行）
- 职责：搜索 + 索引/侧栏构建。算法全部见 6.3。
- 导出清单（复现时精确对齐）：`lowerBound`、`buildWordSorted`、`buildRootIndex`、`executeSearch`、`buildSidebarData`、`buildSidebarGroups`。**不导出** `quickDecompose`（tests/search-engine.test.ts 因此报 `quickDecompose is not a function`，10.3）。
- 边界：buildRootIndex 对同一词条内重复词根会重复计入 w（与上游 gen_build.py 行为一致，不去重）。

**7.1.5 lib/root-groups.ts**（人工数据，不可推导，全文 19 行逐字收录）：

```ts
export interface RootGroupDef {
  label: string;
  icon: string;
  members: string[];
}

export const ROOT_GROUPS: RootGroupDef[] = [
  { label: "看与观察", icon: "eye", members: ["vis", "vid", "vic", "spect", "spec", "view", "sight", "look", "see", "observ"] },
  { label: "说与语言", icon: "speak", members: ["dict", "dic", "scribe", "script", "graph", "gram", "log", "loqu", "nounce", "nunci", "fess", "parl", "voc", "vok", "son", "liter", "lingu"] },
  { label: "行走与移动", icon: "foot", members: ["ced", "cess", "ceed", "gress", "grad", "it", "fer", "port", "por", "duct", "duc", "duce", "mot", "mov", "mob", "migr", "vad", "ven", "vent", "vail"] },
  { label: "拿取与投掷", icon: "hand", members: ["cap", "cept", "ceive", "cep", "sum", "sume", "tract", "ject", "jec", "mit", "miss", "pel", "puls", "press", "sult"] },
  { label: "站立与放置", icon: "stand", members: ["sta", "stit", "sist", "ten", "tain", "tent", "pos", "pon", "set", "sit", "sid", "sess", "her", "hes"] },
  { label: "心智与感觉", icon: "mind", members: ["sci", "cogn", "sent", "sens", "mem", "cred", "fid", "cord", "cur", "psych", "path", "pati", "spir", "jud", "put", "tegr", "tect"] },
  { label: "建造与创造", icon: "build", members: ["act", "fac", "fact", "fect", "fic", "struct", "stru", "cre", "oper", "labor", "fabric", "mechan", "techn"] },
  { label: "转变与状态", icon: "turn", members: ["vert", "vers", "volve", "rot", "gen", "form", "sol", "fin", "termin", "solv", "clos", "clud", "clu", "rupt"] },
  { label: "法律与社会", icon: "scales", members: ["leg", "jur", "mand", "not", "sign", "soci", "civil", "popul", "dem", "liber", "equ", "just", "serv", "auth", "nomin", "nom"] },
  { label: "前缀与方向", icon: "prefix", members: ["a", "ap", "at", "ar", "ad", "ante", "pre", "pro", "sub", "super", "anti", "re", "de", "dis", "en", "em", "ex", "in", "im", "un", "con", "com", "per", "inter", "trans", "ob", "para", "dia", "circum", "contra", "extra", "infra", "intro", "retro", "ambi", "omni"] },
];
```

（10 组 × 共 174 个成员；注意 "a" 等单字符成员只有在 rootIndex 中存在时才会被 buildSidebarGroups 收录。）

**7.1.6 lib/srs.ts**（129 行）—— 算法全部见 6.5。补充：导出 `initializeProgress/calculateNextReview/getRootProgress/recordReview/getDueRoots/getProgressStats`；`loadProgressMap/saveProgressMap` 为私有，直读直写 `localStorage["linxu-progress"]` 裸 ProgressMap（与 learn-store persist 格式冲突，10.4）。

**7.1.7 lib/analytics.ts**（约 100 行）
- 职责：纯本地埋点（无上报）。
- 类型：`EventType = "ttfi" | "review_complete" | "decompose_use" | "session" | "next_day_retention"`；事件 `{ type: EventType; ts: number; payload?: Record<string, unknown> }`。
- 实现要点：`track(type, payload?)` 追加到 `localStorage["linxu-events"]` 数组；会话 ID 存 `sessionStorage["linxu-session-id"]`（首次生成随机串）；`checkRetention()` 读 `localStorage["linxu-last-session"]`，若上次会话在 24–48h 前则记 `next_day_retention`；`getMetrics()` 汇总事件计数。
- 边界：所有入口含 `typeof window === "undefined"` 守卫；JSON 损坏时重置为空数组。未被任何已挂载页面调用。

### 7.2 src/store/（2 文件）

**7.2.1 store/app-store.ts**（62 行）—— 接口与行为全部见 4.6。实现要点：`create<AppState>((set, get) => ...)` 无中间件；`setSearchIndex` 内先 `set({searchIndex})` 再用旧 state 的 query/activeRoot 算一次结果（注释原文 `// Apply initial filters with the new index`）。

**7.2.2 store/learn-store.ts**（54 行）—— 见 4.6。实现要点：`create<LearnState>()(persist(...))` 双括号 curried 写法；依赖 srs.ts 的四个纯函数；`stats: () => getProgressStats(get().progress)`（读 store 内存态，而 `refreshDue` 读 localStorage——不一致是已知问题）。

### 7.3 src/hooks/（6 文件）

**7.3.1 hooks/useSearch.ts**（约 35 行）
- 职责：页面挂载时拉起数据加载并注入 store。
- 要点：`useEffect(() => { loadSearchIndex().then(setSearchIndex).catch(setError) }, [])`；返回 `{ isLoading, error }`；已有缓存时 loadSearchIndex 同步快返回（promise 微任务）。
- 边界：卸载后 setState 防护（mounted flag）；StrictMode 双挂载靠 data-loader 单例去重。

**7.3.2 hooks/useFavorites.ts**（约 45 行）
- 职责：收藏集合。
- 要点：`useState<Set<number>>` 惰性初始化从 `localStorage["linxu-favorites"]`（number[] → Set）；`toggleFavorite(i)` 新建 Set 后整体回写 `JSON.stringify([...set])`；`isFavorite(i)` 查询。
- 边界：SSR 守卫；JSON 损坏回退空 Set。

**7.3.3 hooks/useSpeak.ts**（约 30 行）
- 要点：`speak(text)`：先 `window.speechSynthesis.cancel()` 再 `speak(new SpeechSynthesisUtterance(text))`，`lang="en-US"`、`rate=0.9`；`supported = "speechSynthesis" in window`。
- 边界：不支持时 speak 为空操作（B15）。

**7.3.4 hooks/useChallenge.ts**（约 170 行）—— 状态机/出题/计分见 6.6。补充实现要点：
- 内部 state：`phase/questions/currentIdx/score/selected/answers`；`feedback` 阶段用 `setTimeout(FEEDBACK_MS)` 自动 `next()`，卸载时 clearTimeout。
- Fisher–Yates 洗牌工具函数内联实现（`for (let i = arr.length - 1; i > 0; i--)` 交换）。
- **已知崩溃点**：顶部 `import { getLoadedIndices, isIndexLoaded } from "@/lib/data-loader"` —— 两者均未实现；复现时按 5.2 补丁实现即可跑通。

**7.3.5 hooks/useProgress.ts**（约 120 行，未挂载）
- 职责：SM-2 的 hook 版平行实现（与 lib/srs.ts 独立，都写 `linxu-progress`）。
- 要点：`INITIAL_ROOT = { status:"unseen", easeFactor:2.5, interval:0, nextReview:"", reviewCount:0, lastReview:null, correctStreak:0 }`（注意 nextReview 是空串，与 srs.ts 不同）；状态机更宽松：`unseen─q≥3─▶learning─q≥3─▶reviewing─q≥3─▶mastered`，`q<3` 一律回 learning（含 unseen）；`getStats()` 额外返回 `coveragePercent = round((learning+reviewing+mastered)/总词根数*100)`；`isWordMastered(parts)`：全部 root 型 part 均 mastered 才 true，**空数组返 false**。
- 边界：与 srs.ts 的差异已在 6.5 列表；复现时两套都要保留（tests/srs.test.ts 只测 srs.ts）。

**7.3.6 hooks/useAnalytics.ts**（约 40 行，未挂载）
- 要点：挂载时 `track("session", {action:"start"})` + `checkRetention()`；首次交互（pointerdown/keydown 一次性监听）记 `ttfi`；`beforeunload` 时记 session end 并写 `linxu-last-session`。

<!-- SECTION 7A END -->

### 7.4 src/app/（10 文件）

**7.4.1 app/layout.tsx**
- 职责：根布局：字体变量 + 主题 Provider + 全局元数据。
- 实现要点（不可推导细节）：用 `next/font/google` 加载三字体——`Inter` 与 `Noto_Sans_SC` **都声明 `variable: "--font-body"`**（后者覆盖前者，已知小 bug，原样保留），`JetBrains_Mono` 用 `--font-mono`；`<html lang="zh-CN" suppressHydrationWarning>`；`metadata = { title: "林序 - 英语词根词缀拆解", description: ... }`；`<ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>` 包裹 children。
- 边界：suppressHydrationWarning 必需（next-themes 首帧改 html 属性）。

**7.4.2 app/globals.css**（设计系统，约 300 行，详细约定见第 8 章）
- 结构：`@import "tailwindcss";` → `@theme inline` 把 CSS 变量映射为 Tailwind token → `:root`/`[data-theme="light"]` 两套变量 → 组件类（.part-tag/.root-item/.flash-card/.skeleton/.status-*）。

**7.4.3 app/page.tsx**（首页，"use client"）
- 职责：主学习页组装。
- 要点：`useSearch()` 拉数据；从 app-store 取 `searchIndex/filteredIndices/currentPage`；`pageEntries = filteredIndices.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(i => ({entry: data[i], index: i}))`；布局：`TopBar` 顶部固定 + `Sidebar`（`hidden lg:block` 左栏）+ 主区 `FilterChips`→`CardGrid`→`Pagination`；加载中显骨架屏（.skeleton 卡片 × 数张），error 时显错误文案。
- 边界：filteredIndices 为空 → CardGrid 空态；翻页后 `window.scrollTo({top:0})`。

**7.4.4 app/speed/page.tsx**（速览模式，"use client"）
- 要点：`BATCH = 100`；`visibleCount` state，尾部哨兵 div 用 `IntersectionObserver`（`rootMargin: "200px"`）触发 `visibleCount += BATCH`；卡片用 `SpeedCard` 三列密集网格（`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`）；移动端筛选：底部悬浮按钮开底部抽屉（词根列表），抽屉打开时 `document.body.style.overflow = "hidden"` 锁滚动，关闭时恢复。
- 边界：筛选变化时 `visibleCount` 重置回 BATCH；observer 卸载时 disconnect。

**7.4.5 app/challenge/page.tsx**（"use client"）
- 要点：消费 `useChallenge()`；四块 UI：loading 骨架 / idle（规则说明 + 开始按钮）/ playing+feedback（题干卡 + 四个选项按钮 A-D，feedback 阶段正确项绿色 `border-[--accent]`、选错项红色，其余置灰禁用）/ results（得分 + 逐题回顾 + 再来一轮）。
- 边界：进度条 `currentIdx+1 / 10`；目前因依赖缺失运行时崩溃（10.2）。

**7.4.6 app/word/[slug]/page.tsx**（SSG 服务端组件）
- 要点：模块顶部 `readFileSync(join(process.cwd(), "public", "data", "vocab.json"))` 解析为常量；`generateStaticParams()` 返回 5011 个 `{ slug: word.toLowerCase() }`；页内用 slug 小写匹配词条，未命中 `notFound()`。
- 词源故事：模板拼接——按 parts 顺序生成「`前缀 X（含义）` + `词根 Y（含义）` + `后缀 Z（含义）`→整句串联」的中文叙述段（纯函数，无 AI/外部调用）。
- 同根词：遍历该词各 root part → 查 roots-index → 收集其他词条，`Set` 去重，**满 20 个双层 break**；卡片链向 `/word/<小写词>`。
- 边界：重名 slug（大小写不同的同形词）取首个命中；朋友链接用 `encodeURIComponent`。

**7.4.7 app/root/[slug]/page.tsx**（SSG）
- 要点：同样 readFileSync vocab.json + roots-index.json；`generateStaticParams()` 返回 613 个 `{ slug: rootText }`；页面展示词根大字 + meaning + 该根全部同根词列表（w 全量，不截断），每项链向 `/word/...`。
- 边界：slug 需 `decodeURIComponent` 后查索引；未命中 `notFound()`。

**7.4.8 app/actions/decompose.ts**（"use server"，未挂载）—— 算法/契约见 6.4 与 5.3。补充：文件内联 `PREFIXES: [string,string][]`（52 对，含重复 `re`）与 `SUFFIXES`（52 对，含重复 `ence`），全表已逐字收录于 6.4；复现时若追求 `next build` 通过，需注意 `output:"export"` 下未被引用的 Server Action 不会报错，**但一旦被客户端组件 import 就会构建失败**——这正是 DecomposePanel 未挂载的原因。

**7.4.9 app/favicon.ico** —— create-next-app 默认图标（二进制资产，10.6）。

**7.4.10 路由与预渲染总览** —— 见 8.1 路由表。

### 7.5 src/components/（16 文件，按目录分组）

**A. layout/（2）**

| 文件 | 职责与要点 |
|---|---|
| TopBar.tsx | 顶栏：左 Logo（lucide `TreesIcon` + 文字「林序」，链向 `/`）；中部 `SearchInput`；右侧导航链接（速览 `/speed`、挑战 `/challenge`）+ `ThemeToggle`。`sticky top-0 z-50` + 背景模糊。 |
| Sidebar.tsx | 词根分组侧栏。数据：`buildSidebarGroups(rootIndex)`（useMemo）。常量：`STORAGE_KEY = "sidebar-collapsed-groups"`、`DEFAULT_EXPAND_COUNT = 3`（默认仅前 3 组展开，其余折叠）。折叠态存 localStorage（label 数组）；**有搜索词时强制全展开但不回写存储**；点词根调 `setActiveRoot`（再点取消），高亮当前 activeRoot；每项显示 `t (c)` 与 m。 |

**B. search/（3）**

| 文件 | 职责与要点 |
|---|---|
| SearchInput.tsx | 非受控 `defaultValue={query}` + `onChange` 启动 `setTimeout(DEBOUNCE_MS=200)` 防抖后调 `setQuery`（旧定时器 clear）；右侧清除按钮（有值时显示，同时清 input.value 与 store）；放大镜图标。边界：外部清空 query 时因非受控需用 ref 同步。 |
| FilterChips.tsx | 显示「共 N 个结果」+ activeRoot chip（含 meaning，可单独 ×）+ query chip（可单独 ×）+「清除全部」；无筛选时仅显结果数。 |
| DecomposePanel.tsx（未挂载） | 拆解结果浮层：词素药丸逐个渐入（每个延迟 `index*150ms`，CSS transition）；置信度色条：`confidence >= 0.8` 绿 / `>= 0.5` 橙 / 否则红；family 列表链接。props：`{ result: DecomposeResult; onClose }`。 |

**C. word/（4）**

| 文件 | 职责与要点 |
|---|---|
| WordCard.tsx | 标准卡片：词（链向 `/word/<小写>`）+ 释义 + 右上角播音（useSpeak）/收藏 Star（useFavorites，激活态填充色）+ 底部 `PartTags`。props：`{ entry: VocabEntry; index: number }`。 |
| SpeedCard.tsx | 速览密集卡：单行词 + 简短释义 + 内联小号 PartTags，无操作按钮，整卡可点链向详情。 |
| CardGrid.tsx | `display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`；空数组时渲染空态（图标+「没有找到匹配的单词」文案）。 |
| PartTags.tsx | 词素彩色药丸序列：颜色按 `PART_COLORS[part.type]`（prefix 橙 #E8A84C / root 绿 #5BB89A / suffix 紫 #9B8EC4），展示 `text` 与 `meaning`；root 型药丸链向 `/root/<text>`。 |

**D. ui/（3）**

| 文件 | 职责与要点 |
|---|---|
| Pagination.tsx | 7 格省略号分页：总页 ≤7 全显；否则固定首页+尾页，当前页邻域 ±1，缺口处 "..."（不可点）；上一页/下一页按钮在边界禁用；props `{ currentPage, totalPages, onPageChange }`；总页 ≤1 时返回 null。 |
| SpeakButton.tsx | 详情页大号播音按钮；**独立实现** speechSynthesis（不复用 useSpeak，因为详情页是服务端组件下的小客户端岛）；"use client"。 |
| ThemeToggle.tsx | `useTheme()` + `mounted` state（useEffect 后才渲染真实图标，防水合闪烁）；dark↔light 切换，Sun/Moon 图标。 |

**E. stats/（1，未挂载）**：`StatsBar.tsx` —— 消费 `useProgress().getStats()`，展示已学/已掌握/待复习/覆盖率四格 + 进度条（宽度 `coveragePercent%`）。

**F. epiphany/（2，未挂载）**：`EpiphanyIntro.tsx` + `EpiphanyIntro.css` —— 开屏顿悟动画：相位 `word → split → meaning → tagline → ready`，定时 1000/2500/4000/5000ms（`prefers-reduced-motion` 时 200/400/600/800ms）；演示词 `understand = under + stand`；完成后写 `localStorage["linxu-seen-intro"]="1"`，下次直接跳过；点击可跳过。CSS 文件定义关键帧（淡入/位移/拆分位移）。

### 7.6 scripts/build-chunks.ts —— 全部规则见 6.2B；运行方式 `npx tsx scripts/build-chunks.ts`（CJS 风格 `__dirname`，tsx 兼容）。

### 7.7 测试与辅助文件（19 个，分组）

| 组 | 文件 | 要点与现状 |
|---|---|---|
| setup ×3 | `src/test/setup.ts`（生效）、`vitest.setup.ts`、`tests/setup.ts`（后两个冗余） | 均仅 `import '@testing-library/jest-dom/vitest'` |
| lib 单测 ×5 | `src/lib/__tests__/{constants,root-groups,search-engine,types}.test.ts` + `vocab-quality.test.mjs` | 全部通过。vocab-quality.test.mjs 直读 public/data/vocab.json 做数据质量断言（非空/无中文 text/parts 非空等） |
| store ×1 | `src/store/__tests__/app-store.test.ts` | 通过；覆盖 setQuery/setActiveRoot/翻页重置 |
| hooks ×3 | `src/hooks/__tests__/{useFavorites,useSearch,useSpeak}.test.ts(x)` | 通过；useSpeak 用 speechSynthesis mock |
| 组件 ×5 | `Sidebar/TopBar/FilterChips/CardGrid/Pagination` 各自 `__tests__/` | 通过；@testing-library/react 渲染断言 |
| 根 tests/ ×3 | `tests/srs.test.ts`（通过，验 6.5 全部规则）；`tests/data-loader.test.ts`（**失败**：期望 manifest/chunk 式分块 loader）；`tests/search-engine.test.ts`（**部分失败**：期望 `quickDecompose`、`getLoadedIndices/isIndexLoaded` mock、`prefixIndex/suffixIndex` 字段） | 面向「分块加载重构版」的目标测试，实现未跟上（10.3）；复现时原样保留（它们是重构路线图） |

实测基线（`npx vitest run`，2026-07-28）：**17 文件：15 过 / 2 败；370 用例：357 过 / 13 败**。复现验收以此为基准（第 9 章）。

<!-- SECTION 7 END -->

---

## 8. UI 与交互

### 8.1 路由表（全部 SSG，out/ 静态产物）

| 路由 | 页数 | 类型 | 职责 | 状态 |
|---|---|---|---|---|
| `/` | 1 | 客户端页 | 主学习页（搜索/侧栏/卡片/分页） | ✅ |
| `/speed` | 1 | 客户端页 | 速览无限滚动 | ✅ |
| `/challenge` | 1 | 客户端页 | 词根推理挑战 | ⚠️ 运行时崩（10.2） |
| `/word/[slug]` | 5011 | 服务端 SSG | 单词详情（拆解/词源故事/同根词） | ✅ |
| `/root/[slug]` | 613 | 服务端 SSG | 词根详情（含义/全部同根词） | ✅ |

### 8.2 页面状态机

**首页 `/`**：

```
mount ─▶ loading（骨架屏，useSearch 拉取中）
 loading ─成功─▶ ready（filteredIndices 全量） ─失败─▶ error（错误文案）
 ready 状态内三个正交维度：query（防抖 200ms）× activeRoot（侧栏点选）× currentPage
 任一筛选变化 → executeSearch 重算 + 页码归 1；结果空 → 空态插画
```

**速览 `/speed`**：`loading → ready(visibleCount=100) ─哨兵可见─▶ visibleCount+=100 … ≤ 结果总数`；筛选变化重置 visibleCount；移动端抽屉 `drawerOpen: boolean`（开启时锁 body 滚动）。

**挑战 `/challenge`**：见 6.6 状态机图（loading/idle/playing/feedback/results）。

**详情页**：无客户端状态（纯 SSG），仅 SpeakButton 小岛有播放态。

### 8.3 Store 结构 —— 见 4.6（app-store 非持久 / learn-store persist）；组件订阅约定：页面组件用选择器取最小字段（如 `useAppStore((s) => s.filteredIndices)`），避免全量重渲染。

### 8.4 Tailwind 4 与设计系统约定（globals.css，221 行）

**组织方式**：无 tailwind.config 文件；`@import "tailwindcss";` 后用 `@theme inline` 把运行时 CSS 变量映射为 Tailwind token（于是可写 `bg-bg-surface`、`text-text-secondary`、`border-border`、`text-prefix/root/suffix`、`bg-accent` 等工具类，且自动随主题切换）。

**@theme inline 映射表（原文要点）**：`--color-bg-deep/bg-surface/bg-elevated/bg-hover ← var(--bg-*)`；`--color-text-primary/secondary/muted`；`--color-border`；`--color-prefix/root/suffix ← var(--prefix-color/root-color/suffix-color)`；`--color-accent/accent-hover`；`--font-sans ← var(--font-body)`、`--font-display`、`--font-mono`。

**双主题变量表（逐字，复现必须精确）**：

| 变量 | dark（:root, [data-theme="dark"]） | light（[data-theme="light"]） |
|---|---|---|
| --bg-deep | #0F1410 | #F5F2ED |
| --bg-surface | #171D18 | #FFFFFF |
| --bg-elevated | #1F2820 | #F0EDE7 |
| --bg-hover | #2A352C | #E8E4DC |
| --text-primary | #E4EDE6 | #1A2B1E |
| --text-secondary | #8FA394 | #5C6E60 |
| --text-muted | #5A6B5E | #9BA89E |
| --border | #2A352C | #D6D0C6 |
| --prefix-color | #E8A84C | #C4882E |
| --root-color | #5BB89A | #3D8B52 |
| --suffix-color | #9B8EC4 | #7B6BA8 |
| --accent | #6AAF7B | #3D8B52 |
| --accent-hover | #82C792 | #2E7A42 |
| --shadow | rgba(0,0,0,0.4) | rgba(0,0,0,0.08) |

尺寸/动效变量（仅 dark 块声明，全局生效）：`--sidebar-w: 260px`、`--sidebar-collapsed-w: 64px`、`--topbar-h: 56px`、`--ease: cubic-bezier(0.4, 0, 0.2, 1)`。

**组件类清单（手写 CSS，非 Tailwind）**：

| 类 | 用途 | 关键实现 |
|---|---|---|
| `.part-tag` + `.part-tag-{prefix,root,suffix}` | 词素药丸 | `border-radius:9999px; font-size:.75rem`；背景 `color-mix(in srgb, var(--*-color) 18%, transparent)`，前景纯色 |
| `.status-dot` + `.status-{new,learning,learned}` | 卡片右上状态点 | 6px 圆点；new 透明/learning 橙/learned 绿（注意类名用的是旧版 LearnStatus 命名） |
| `.root-item`(.active) | 侧栏词根行 | 左 3px 透明边框，active 时 `border-left-color: var(--accent)` + 10% 混色背景 |
| `.flash-card-*` | 3D 翻牌（flashcard 视图预留，未挂载） | `perspective:1000px` + `rotateY(180deg)` + `backface-visibility:hidden` |
| `.skeleton` | 骨架屏 | `skeleton-pulse` 1.5s 呼吸动画（opacity 0.4↔0.8） |

**全局约定**：`*` 重置 margin/padding/box-sizing；body 背景/前景过渡 0.2s；自定义 6px 细滚动条；`@media (prefers-reduced-motion: reduce)` 全局把动画/过渡压到 0.01ms。

**主题切换链路**：next-themes 写 `<html data-theme="dark|light">`（localStorage key `theme`）→ CSS 变量块切换 → 所有 token 自动变色；默认 dark（`defaultTheme="dark"` 且 `enableSystem={false}`）。

<!-- SECTION 8 END -->

---

## 9. 从零复现步骤

### 9.1 脚手架（步骤 1–4）

1. `npx create-next-app@latest etymology-app --typescript --app --no-src-dir=false`（选 App Router + src 目录 + Tailwind 不勾，后手动装 Tailwind 4）；Node ≥ 18。
2. 把 package.json 的 name/version/scripts/依赖改为 2.1/2.2 逐字内容，`npm install`。
3. 按 2.3 原文创建 `next.config.ts`、`vercel.json`、`vitest.config.ts`、`postcss.config.mjs`、`eslint.config.mjs`；tsconfig 确保 `strict` 与 `"@/*": ["./src/*"]`。
4. 创建 `src/test/setup.ts`（及冗余的 `vitest.setup.ts`、`tests/setup.ts`，三文件同为一行 jest-dom import）。

### 9.2 数据就位（步骤 5，二选一）

**路径 A（推荐，有上游数据）**：取得 `vocab_data_v2.json`（工作区根目录，5000+ 条原始词条），运行 9.4 的 build-data.ts 生成 4 个 JSON 到 `public/data/`，再 `npx tsx scripts/build-chunks.ts` 生成 chunks。

**路径 B（无上游数据）**：按 6.7 规格重建词库生成器（词缀/词根/日耳曼表需重新整理，规模目标 5000 词），产出同构的 `vocab_data_v2.json` 后走路径 A。**注意：此路径无法复现逐条一致的 5011 词数据**，只能复现格式与量级（复现缺口，见 10.5）。

### 9.3 源码落地（步骤 6–10）

6. 按第 4 章创建 `src/lib/types.ts`（含补丁决策：要过 `next build` 就打补丁；要 100% 忠实现状就不打，并接受 build 失败）、`constants.ts`；按 6.3/6.5/7.1 实现 `search-engine.ts`、`srs.ts`、`data-loader.ts`、`analytics.ts`；原样拷入 7.1.5 的 `root-groups.ts`。
7. 按 4.6/7.2 实现两个 store；按 7.3 实现 6 个 hooks（useChallenge 的缺失依赖按 5.2 补丁或原样保留崩溃现状，二选一并在交付说明中标注）。
8. 按 7.4 实现 app/ 页面（globals.css 用第 8 章变量表逐字还原；decompose.ts 用 6.4 全表）；按 7.5 实现 16 个组件。
9. 按 6.2B 实现 `scripts/build-chunks.ts`。
10. 按 7.7 补齐测试文件（含两个面向未来重构的失败测试，原样保留）。

### 9.4 缺失的 build-data.ts 参考实现（补齐 `npm run build` 链路）

仓库现状没有此文件（10.1）。若要让 `npm run build` 完整可用，在 `scripts/build-data.ts` 按 6.2A 规则实现（与上游 gen_build.py 同构，输入路径按需调整）：

```ts
// scripts/build-data.ts —— 参考实现（仓库中缺失，规则源自上游 gen_build.py）
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const SRC = join(__dirname, "..", "..", "vocab_data_v2.json"); // 上游数据
const OUT = join(__dirname, "..", "public", "data");
type Part = { type: string; text: string; meaning: string; decomposed: boolean };
type Entry = { word: string; definition: string; parts: Part[]; source?: string };

const raw: Entry[] = JSON.parse(readFileSync(SRC, "utf-8"));
const hasCJK = (s: string) => /[\u4e00-\u9fff]/.test(s);
const clean = raw.filter((e) => e.word && e.definition)
  .map((e) => ({ ...e, parts: e.parts.filter((p) => p.text?.trim() && !hasCJK(p.text)) }))
  .filter((e) => e.parts.length > 0);

const rootIndex: Record<string, { m: string; w: number[] }> = {};
clean.forEach((e, i) => e.parts.forEach((p) => {
  if (p.type !== "root") return;
  rootIndex[p.text] ??= { m: "", w: [] };
  if (!rootIndex[p.text].m) rootIndex[p.text].m = p.meaning;
  rootIndex[p.text].w.push(i);
}));
const filtered = Object.fromEntries(Object.entries(rootIndex).filter(([, v]) => v.w.length >= 2));
const sidebar = Object.entries(filtered).map(([t, v]) => ({ t, m: v.m, c: v.w.length }))
  .sort((a, b) => b.c - a.c);
const wordSorted = clean.map((e, i) => ({ w: e.word.toLowerCase(), i }))
  .sort((a, b) => (a.w < b.w ? -1 : a.w > b.w ? 1 : 0));

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "vocab.json"), JSON.stringify(clean));
writeFileSync(join(OUT, "roots-index.json"), JSON.stringify(filtered));
writeFileSync(join(OUT, "sidebar.json"), JSON.stringify(sidebar));
writeFileSync(join(OUT, "word-sorted.json"), JSON.stringify(wordSorted));
console.log(`words=${clean.length} roots(>=2)=${Object.keys(filtered).length}`);
```

（若选择 100% 忠实仓库现状，则**不创建**此文件，并接受 `npm run build` 在 build:data 步失败、用 `npx next build` 代替——与 Vercel 线上行为一致。）

### 9.5 验收标准（步骤 11–15）

| # | 验收项 | 命令/方法 | 通过标准 |
|---|---|---|---|
| V1 | 依赖安装 | `npm install` | 无 error（peer 警告可忽略） |
| V2 | 单元测试 | `npm run test` | ≥357/370 用例通过；允许且仅允许 tests/data-loader.test.ts 与 tests/search-engine.test.ts 内合计 13 条失败（若实现了分块 loader + quickDecompose 则应 370/370） |
| V3 | Lint | `npm run lint` | 无 error |
| V4 | 静态构建 | `npx next build`（或打补丁后 `npm run build`） | 产出 `out/`，含 `word/` 5011 页、`root/` 613 页；types.ts 不打补丁时允许类型检查失败并在交付说明标注 |
| V5 | 数据一致性 | node 脚本校验 | vocab.json 长度 5011（路径 A）；roots-index 键数 613；每个键 w.length≥2；chunk 四文件词数总和 = vocab 长度 |
| V6 | 运行时冒烟 | `npm run dev` 后浏览器验证 | `/` 搜索 "bio" 有结果且防抖生效；侧栏点词根可筛选；主题切换持久；`/speed` 滚动加载；`/word/action` 显拆解+同根词；`/root/act` 显全部同根词 |

### 9.6 部署（步骤 16）：Vercel 导入仓库，framework=nextjs，`vercel.json` 已将 buildCommand 覆盖为 `next build`；无环境变量需配置。

---

## 10. 不可文本化资产与已知问题

### 10.1 build:data 指向不存在的文件（最大坑）

`package.json` 的 `"build": "npm run build:data && next build"` 依赖 `scripts/build-data.ts`，**仓库中不存在**（只有 build-chunks.ts）→ 本地 `npm run build` 必败。线上靠 `vercel.json` 的 `buildCommand: "next build"` 绕过。处置：按 9.4 补建或维持现状。

### 10.2 类型与导出缺口（会阻断 tsc/部分页面）

- types.ts 缺 `RootProgress/ProgressMap`，`LearnStatus` 与实际使用不一致（4.1 补丁）。
- data-loader 未导出 `getLoadedIndices/isIndexLoaded` → `/challenge` 运行时 `TypeError`（5.2 补丁）。
- 两处均属「分块加载重构进行到一半」的产物；源码现状如此，复现时二选一并标注。

### 10.3 失败测试是「目标态」而非回归

`tests/data-loader.test.ts`（期望 manifest/按 chunk 加载/已加载集合查询）与 `tests/search-engine.test.ts`（期望 `quickDecompose(index, morpheme)`、SearchIndex 含 `prefixIndex/suffixIndex`、executeSearch 空查询返回「已加载集合」而非全量）描述的是未完成的分块架构。实测 13 条失败全部集中于此二文件。它们同时是重构验收清单——若续建分块版，以这两个测试绿灯为完成标志。

### 10.4 linxu-progress 双写冲突

`lib/srs.ts` 直写裸 `ProgressMap`；`learn-store` persist 写 `{state:{progress},version}`。同一 key 两格式互碾：先用 store 再用 srs 直读会拿到包裹对象当 map 用。现状因两者都未接 UI 而未爆发；接线前必须二选一（建议统一走 learn-store，并让 getDueRoots 改读 store）。

### 10.5 数据源头佚失（复现缺口清单）

| 资产 | 状态 | 处置 |
|---|---|---|
| gen_vocab.py / gen_vocab_full.py | **佚失**（gen_vocab_v2.py 的 import 与读文件依赖） | 无法从零重跑 v2 生成器；以 vocab_data_v2.json 为事实源头 |
| vocab_data_v2.json | 存于工作区根目录（仓库外） | 复现时随项目一并归档；丢失则只能按 6.7 规格重建同构数据（逐条不一致） |
| public/data/*.json | 仓库内，完整 | **实际复现最短路径：直接拷贝这 5 类 JSON**，再跑 build-chunks |
| 词源故事 | 无独立资产 | 纯模板拼接（7.4.6），可完全再生 |

### 10.6 public/ 二进制与模板资产

`favicon.ico`（src/app/）与 `file/globe/next/vercel/window.svg`（public/，均未被引用）都是 create-next-app 默认资产，任意同名替代品即可，不影响功能。大数据 JSON 不内嵌本文档：路径+格式规范（第 4 章）+再生方法（9.2/9.4）已齐备。

### 10.7 其余坑与 TODO 清单

1. **中文路径**：Windows + `Desktop\项目` 下 Node ESM 曾解析失败（DEV-SUMMARY 记录）；测试/构建建议纯 ASCII 路径。
2. **死代码清单（均未挂载，复现时原样保留）**：DecomposePanel、EpiphanyIntro(+css)、StatsBar、useAnalytics、useProgress、learn-store、actions/decompose.ts；运行时未加载的数据：sidebar.json、word-sorted.json、chunks/*。
3. **冗余 setup 文件**：vitest.setup.ts、tests/setup.ts（仅 src/test/setup.ts 生效）。
4. **layout.tsx 双字体同变量**：Inter 与 Noto_Sans_SC 都用 `--font-body`，后者覆盖前者；`--font-display` 在 CSS 中被引用但无字体注入。
5. **STORAGE_KEYS.theme 未接线**：next-themes 实用默认 key `theme`。
6. **双锁文件并存**：package-lock.json + pnpm-lock.yaml，团队应择一删一。
7. **TODO（源自测试目标态与 DEV-SUMMARY）**：完成分块渐进加载 loader；实现 quickDecompose 并接入搜索框；把 SRS/StatsBar/EpiphanyIntro/埋点接入 UI；统一 linxu-progress 存储格式。

---

<!-- SECTION 9-10 END -->

---

## 附录A：根级目标态测试全文（逐字收录）

> 收录理由：`tests/` 根目录下的 3 个测试文件是**目标态规格**（TDD 期望），其中部分用例因源码缺口（types.ts 缺 `RootProgress`/`ProgressMap` 导出、data-loader 缺 `getLoadedIndices`/`isIndexLoaded`）而处于失败基线中。这些期望**无法从现有源码推导**，必须逐字收录，复现时以它们为验收依据（配合 5.2/4.1 节补丁实现后应全部转绿）。`tests/unit/` 下的 16 个文件与源码一致、可推导，仅在 7.7 节表格中描述。

### A.1 tests/srs.test.ts（133 行，全文）

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RootProgress, ProgressMap } from "@/lib/types";

function makeProgress(overrides: Partial<RootProgress> = {}): RootProgress {
  return {
    status: "unseen",
    easeFactor: 2.5,
    interval: 0,
    nextReview: new Date().toISOString(),
    reviewCount: 0,
    lastReview: null,
    correctStreak: 0,
    ...overrides,
  };
}

let store: Record<string, string> = {};

beforeEach(() => {
  store = {};
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  });
});

describe("calculateNextReview", () => {
  it("quality=5 increases interval and easeFactor", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ interval: 6, easeFactor: 2.5 });
    const result = calculateNextReview(5, current);
    expect(result.interval).toBe(Math.round(6 * 2.5));
    expect(result.easeFactor).toBeGreaterThan(2.5);
    expect(result.correctStreak).toBe(1);
  });

  it("quality=0 resets interval to 1 and streak to 0", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ interval: 10, correctStreak: 5, easeFactor: 2.5 });
    const result = calculateNextReview(0, current);
    expect(result.interval).toBe(1);
    expect(result.correctStreak).toBe(0);
  });

  it("easeFactor never drops below 1.3", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ easeFactor: 1.3 });
    const result = calculateNextReview(0, current);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("quality=3 grows interval by formula", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ interval: 6, easeFactor: 2.5 });
    const result = calculateNextReview(3, current);
    expect(result.interval).toBe(Math.round(6 * 2.5));
    expect(result.correctStreak).toBe(1);
  });
});

describe("status transitions", () => {
  it("unseen + quality>=3 becomes learning", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const result = calculateNextReview(4, makeProgress({ status: "unseen" }));
    expect(result.status).toBe("learning");
  });

  it("learning + quality>=3 + streak>=3 becomes reviewing", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ status: "learning", correctStreak: 2, interval: 6 });
    const result = calculateNextReview(4, current);
    expect(result.correctStreak).toBe(3);
    expect(result.status).toBe("reviewing");
  });

  it("reviewing + quality>=3 + streak>=5 + EF>2.0 becomes mastered", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ status: "reviewing", correctStreak: 4, interval: 10, easeFactor: 2.1 });
    const result = calculateNextReview(4, current);
    expect(result.correctStreak).toBe(5);
    expect(result.easeFactor).toBeGreaterThan(2.0);
    expect(result.status).toBe("mastered");
  });

  it("quality<3 reverts to learning (from reviewing)", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ status: "reviewing", correctStreak: 5 });
    const result = calculateNextReview(1, current);
    expect(result.status).toBe("learning");
    expect(result.correctStreak).toBe(0);
  });
});

describe("getDueRoots", () => {
  it("returns roots with nextReview <= now", async () => {
    const past = new Date(Date.now() - 100000).toISOString();
    const future = new Date(Date.now() + 100000).toISOString();
    const map: ProgressMap = {
      a: makeProgress({ status: "learning", nextReview: past }),
      b: makeProgress({ status: "learning", nextReview: future }),
      c: makeProgress({ status: "unseen", nextReview: past }),
    };
    localStorage.setItem("linxu-progress", JSON.stringify(map));

    const { getDueRoots } = await import("@/lib/srs");
    const due = getDueRoots();
    expect(due).toContain("a");
    expect(due).not.toContain("b");
    expect(due).not.toContain("c");
  });
});

describe("getProgressStats", () => {
  it("returns correct counts per status", async () => {
    const map: ProgressMap = {
      a: makeProgress({ status: "unseen" }),
      b: makeProgress({ status: "learning", nextReview: new Date(Date.now() - 1000).toISOString() }),
      c: makeProgress({ status: "reviewing", nextReview: new Date(Date.now() + 100000).toISOString() }),
      d: makeProgress({ status: "mastered", nextReview: new Date(Date.now() - 1000).toISOString() }),
    };

    const { getProgressStats } = await import("@/lib/srs");
    const stats = getProgressStats(map);
    expect(stats.unseen).toBe(1);
    expect(stats.learning).toBe(1);
    expect(stats.reviewing).toBe(1);
    expect(stats.mastered).toBe(1);
    expect(stats.due).toBe(2);
  });
});
```

要点：`vi.stubGlobal("localStorage", ...)` 手工桩（jsdom 环境下仍显式替换，保证 `getDueRoots` 从 `linxu-progress` 键读取）；所有 `import("@/lib/srs")` 用动态导入配合 `beforeEach` 重置，避免模块级缓存污染。

### A.2 tests/data-loader.test.ts（91 行，全文）

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockManifest = {
  hot: { roots: ["test"], count: 1 },
};
const mockRoots = { test: { m: "test", w: [0] } };
const mockChunk = {
  indices: [0],
  entries: [{ word: "test", definition: "a test word", parts: [] }],
};

function mockFetchSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url === "/data/chunks/manifest.json") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) });
      }
      if (url === "/data/roots-index.json") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRoots) });
      }
      if (url === "/data/chunks/chunk-hot.json") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockChunk) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    })
  );
}

function mockFetchFail() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: false, status: 500 }))
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("loadSearchIndex", () => {
  it("loads and returns search index from fetch", async () => {
    mockFetchSuccess();
    const { loadSearchIndex } = await import("@/lib/data-loader");
    const index = await loadSearchIndex();
    expect(index.data.length).toBe(1);
    expect(index.data[0].word).toBe("test");
    expect(index.rootIndex).toEqual(mockRoots);
    expect(index.wordSorted.length).toBe(1);
  });

  it("returns cached index on second call", async () => {
    mockFetchSuccess();
    const { loadSearchIndex } = await import("@/lib/data-loader");
    const first = await loadSearchIndex();
    const second = await loadSearchIndex();
    expect(second).toBe(first);
  });

  it("throws on fetch failure", async () => {
    mockFetchFail();
    const { loadSearchIndex } = await import("@/lib/data-loader");
    await expect(loadSearchIndex()).rejects.toThrow("Failed to fetch");
  });

  it("deduplicates concurrent load calls", async () => {
    mockFetchSuccess();
    const { loadSearchIndex } = await import("@/lib/data-loader");
    const [a, b] = await Promise.all([loadSearchIndex(), loadSearchIndex()]);
    expect(a).toBe(b);
  });
});

describe("getCachedIndex", () => {
  it("returns null before any load", async () => {
    const { getCachedIndex } = await import("@/lib/data-loader");
    expect(getCachedIndex()).toBeNull();
  });

  it("returns cached index after load", async () => {
    mockFetchSuccess();
    const { loadSearchIndex, getCachedIndex } = await import("@/lib/data-loader");
    await loadSearchIndex();
    const cached = getCachedIndex();
    expect(cached).not.toBeNull();
    expect(cached!.data[0].word).toBe("test");
  });
});
```

要点：此文件锁定了 data-loader 的 fetch URL 契约（`/data/chunks/manifest.json` → `/data/roots-index.json` → `/data/chunks/chunk-hot.json`）、错误文案前缀 `Failed to fetch`、单例缓存（`second === first`）与并发去重（同一 Promise 复用）。`vi.resetModules()` 保证每个用例拿到全新模块实例。

<!-- APPENDIX A1 END -->

### A.3 tests/search-engine.test.ts（233 行，全文）

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  lowerBound,
  buildWordSorted,
  buildRootIndex,
  executeSearch,
  quickDecompose,
} from "@/lib/search-engine";
import type { VocabEntry, SearchIndex } from "@/lib/types";

vi.mock("@/lib/data-loader", () => ({
  getLoadedIndices: vi.fn(() => []),
  isIndexLoaded: vi.fn(() => false),
}));

import { getLoadedIndices, isIndexLoaded } from "@/lib/data-loader";

const mockGetLoadedIndices = vi.mocked(getLoadedIndices);
const mockIsIndexLoaded = vi.mocked(isIndexLoaded);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLoadedIndices.mockReturnValue([]);
  mockIsIndexLoaded.mockReturnValue(false);
});

const sampleData: VocabEntry[] = [
  {
    word: "Biology",
    definition: "the study of life",
    parts: [
      { type: "root", text: "bio", meaning: "life", decomposed: false },
      { type: "suffix", text: "logy", meaning: "study of", decomposed: false },
    ],
  },
  {
    word: "Biography",
    definition: "a written account of someone's life",
    parts: [
      { type: "root", text: "bio", meaning: "life", decomposed: false },
      { type: "root", text: "graph", meaning: "write", decomposed: false },
    ],
  },
  {
    word: "Geography",
    definition: "the study of earth's surface",
    parts: [
      { type: "root", text: "geo", meaning: "earth", decomposed: false },
      { type: "root", text: "graph", meaning: "write", decomposed: false },
    ],
  },
  {
    word: "Telephone",
    definition: "a device for transmitting sound over distance",
    parts: [
      { type: "root", text: "phone", meaning: "sound", decomposed: false },
    ],
  },
];

function buildIndex(data: VocabEntry[]): SearchIndex {
  return {
    data,
    rootIndex: buildRootIndex(data),
    wordSorted: buildWordSorted(data),
    prefixIndex: { un: "not", re: "again" },
    suffixIndex: { tion: "act of", ment: "result of" },
  };
}

describe("lowerBound", () => {
  const arr = [
    { w: "apple", i: 0 },
    { w: "banana", i: 1 },
    { w: "cherry", i: 2 },
    { w: "date", i: 3 },
  ];

  it("returns 0 for empty array", () => {
    expect(lowerBound([], "anything")).toBe(0);
  });

  it("returns 0 when target is less than all elements", () => {
    expect(lowerBound(arr, "a")).toBe(0);
  });

  it("returns length when target is greater than all elements", () => {
    expect(lowerBound(arr, "zzz")).toBe(4);
  });

  it("returns correct index for exact match", () => {
    expect(lowerBound(arr, "cherry")).toBe(2);
  });

  it("returns first index for multiple identical elements", () => {
    const dupes = [
      { w: "aaa", i: 0 },
      { w: "aaa", i: 1 },
      { w: "aaa", i: 2 },
      { w: "bbb", i: 3 },
    ];
    expect(lowerBound(dupes, "aaa")).toBe(0);
  });
});

describe("buildWordSorted", () => {
  it("returns sorted array", () => {
    const sorted = buildWordSorted(sampleData);
    expect(sorted.map((s) => s.w)).toEqual([
      "biography",
      "biology",
      "geography",
      "telephone",
    ]);
  });

  it("converts words to lowercase", () => {
    const sorted = buildWordSorted(sampleData);
    for (const entry of sorted) {
      expect(entry.w).toBe(entry.w.toLowerCase());
    }
  });

  it("index i maps to original data position", () => {
    const sorted = buildWordSorted(sampleData);
    for (const entry of sorted) {
      expect(sampleData[entry.i].word.toLowerCase()).toBe(entry.w);
    }
  });
});

describe("buildRootIndex", () => {
  it("correctly builds inverted index", () => {
    const rootIndex = buildRootIndex(sampleData);
    expect(rootIndex["bio"].w).toEqual([0, 1]);
    expect(rootIndex["graph"].w).toEqual([1, 2]);
  });

  it("filters out roots with < 2 occurrences", () => {
    const rootIndex = buildRootIndex(sampleData);
    expect(rootIndex["geo"]).toBeUndefined();
    expect(rootIndex["phone"]).toBeUndefined();
  });

  it("correctly records meaning", () => {
    const rootIndex = buildRootIndex(sampleData);
    expect(rootIndex["bio"].m).toBe("life");
    expect(rootIndex["graph"].m).toBe("write");
  });

  it("keeps roots with count >= 2", () => {
    const rootIndex = buildRootIndex(sampleData);
    for (const key of Object.keys(rootIndex)) {
      expect(rootIndex[key].w.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("executeSearch", () => {
  const index = buildIndex(sampleData);

  it("returns all loaded indices for empty query", () => {
    mockGetLoadedIndices.mockReturnValue([0, 1, 2, 3]);
    const results = executeSearch(index, "", null);
    expect(results).toEqual([0, 1, 2, 3]);
  });

  it("returns only activeRoot words when activeRoot is set", () => {
    mockIsIndexLoaded.mockImplementation((idx: number) => idx === 0 || idx === 1);
    const results = executeSearch(index, "", "bio");
    expect(results).toEqual([0, 1]);
  });

  it("prefix match works correctly", () => {
    const results = executeSearch(index, "bio", null);
    expect(results).toContain(0);
    expect(results).toContain(1);
    expect(results).not.toContain(2);
    expect(results).not.toContain(3);
  });

  it("root match works correctly", () => {
    mockIsIndexLoaded.mockImplementation((idx: number) => idx === 1 || idx === 2);
    const results = executeSearch(index, "graph", null);
    expect(results).toContain(1);
    expect(results).toContain(2);
  });

  it("returns empty array for no matches", () => {
    const results = executeSearch(index, "zzzzz", null);
    expect(results).toEqual([]);
  });
});

describe("quickDecompose", () => {
  const index = buildIndex(sampleData);

  it("matches known prefix and returns prefix", () => {
    const result = quickDecompose(index, "un");
    expect(result.matched).toBe(true);
    expect(result.prefix).toBeDefined();
    expect(result.prefix!.type).toBe("prefix");
    expect(result.prefix!.text).toBe("un");
    expect(result.prefix!.meaning).toBe("not");
  });

  it("matches known suffix and returns suffix", () => {
    const result = quickDecompose(index, "tion");
    expect(result.matched).toBe(true);
    expect(result.suffix).toBeDefined();
    expect(result.suffix!.type).toBe("suffix");
    expect(result.suffix!.text).toBe("tion");
    expect(result.suffix!.meaning).toBe("act of");
  });

  it("matches known root and returns root", () => {
    const result = quickDecompose(index, "bio");
    expect(result.matched).toBe(true);
    expect(result.root).toBeDefined();
    expect(result.root!.type).toBe("root");
    expect(result.root!.text).toBe("bio");
    expect(result.root!.meaning).toBe("life");
  });

  it("returns matched=false for no match", () => {
    const result = quickDecompose(index, "zzzzz");
    expect(result.matched).toBe(false);
    expect(result.prefix).toBeUndefined();
    expect(result.root).toBeUndefined();
    expect(result.suffix).toBeUndefined();
  });
});
```

要点：此文件是 13 条失败基线的主要来源——它期望 `search-engine.ts` 导出 `quickDecompose`、`SearchIndex` 含 `prefixIndex`/`suffixIndex` 字段、`data-loader.ts` 导出 `getLoadedIndices`/`isIndexLoaded`，而现有源码均未实现（见 10.2/10.3）。复现时必须按本文件契约补齐：`quickDecompose(index, term)` 依次查 `prefixIndex[term]`/`suffixIndex[term]`/`rootIndex[term]`，命中则返回 `{ matched: true, prefix|suffix|root: { type, text, meaning } }`，全部未命中返回 `{ matched: false }`（三字段均 undefined）；`executeSearch` 空查询无 activeRoot 时返回 `getLoadedIndices()` 全量，有 activeRoot 时返回该根倒排表中 `isIndexLoaded` 为真的索引。

<!-- APPENDIX A END -->

---

## 附录B：13 条失败基线逐条明细（2026-07-28 实测）

实测命令：`npx vitest run`；汇总：**Test Files: 2 failed | 15 passed (17)**；Tests: 357 passed | 13 failed (370)。失败全部集中在根级目标态测试（附录A），`tests/unit/` 下 15 个文件全部通过。复现验收时：**若不实施 5.2/4.1 补丁，必须复现出与本表完全一致的 13 条失败；若实施补丁，则 370 条应全绿**。

### B.1 tests/data-loader.test.ts（4 条失败）

| # | 用例 | 失败原因 |
|---|------|---------|
| 1 | `loadSearchIndex > loads and returns search index from fetch` | **格式冲突**：测试 mock 的 manifest 是 `{hot:{roots,count}}`、chunk 是 `{indices,entries}` 包装对象；而实际产线数据（及现有 data-loader 实现）的 manifest 是 `{chunks:[{name,roots,wordCount}],totalWords}`、chunk 是裸 `VocabEntry[]` 数组（实测见附录C），装配后 `data[0].word` 非 `"test"` |
| 2 | `loadSearchIndex > returns cached index on second call` | 同上，首次加载未成功完成导致缓存引用不等 |
| 3 | `loadSearchIndex > deduplicates concurrent load calls` | 同上，并发 Promise 复用链路受前置失败影响 |
| 4 | `getCachedIndex > returns cached index after load` | 同上，缓存内容断言 `cached!.data[0].word === "test"` 不成立 |

注：同文件中 `throws on fetch failure` 与 `returns null before any load` 两条**通过**（错误文案 `Failed to fetch` 与初始 null 契约现有实现已满足）。

### B.2 tests/search-engine.test.ts（9 条失败）

| # | 用例 | 失败原因 |
|---|------|---------|
| 5 | `lowerBound > returns 0 for empty array` | `lowerBound` 在源码中是**模块私有函数**（`function lowerBound(...)` 无 `export`），测试 import 到 `undefined`，调用即抛 TypeError |
| 6 | `lowerBound > returns 0 when target is less than all elements` | 同上 |
| 7 | `lowerBound > returns length when target is greater than all elements` | 同上 |
| 8 | `lowerBound > returns correct index for exact match` | 同上 |
| 9 | `lowerBound > returns first index for multiple identical elements` | 同上 |
| 10 | `quickDecompose > matches known prefix and returns prefix` | `quickDecompose` 在源码中**完全不存在**，import 到 `undefined` |
| 11 | `quickDecompose > matches known suffix and returns suffix` | 同上 |
| 12 | `quickDecompose > matches known root and returns root` | 同上 |
| 13 | `quickDecompose > returns matched=false for no match` | 同上 |

注：同文件中 `buildWordSorted`/`buildRootIndex`/`executeSearch` 共 12 条全部**通过**（这些导出已存在且行为一致；`getLoadedIndices`/`isIndexLoaded` 被 `vi.mock` 打桩替换，故不受 data-loader 缺口影响）。

### B.3 转绿修复清单（目标态）

若希望复现版 370 条全绿，在不改动任何测试文件的前提下按序实施：

1. **types.ts**：按 4.1 节补丁导出 `RootProgress`/`ProgressMap`（srs.test.ts 的 type import 依赖；当前 srs.test 能过是因 `import type` 被擦除，但 strict typecheck 会报错）。
2. **search-engine.ts**：给 `lowerBound` 加 `export`；新增并导出 `quickDecompose(index, term)`（契约见 A.3 末段要点）；`SearchIndex` 类型补 `prefixIndex: Record<string,string>` 与 `suffixIndex: Record<string,string>` 字段（可选字段以兼容现有调用点）。
3. **data-loader.ts**：按 5.2 节补丁新增 `getLoadedIndices()`/`isIndexLoaded(idx)`；确保 `loadSearchIndex` 首次装配即把 chunk-hot 的 entries 按 indices 写入 `data`，使 `data[0].word === entries[0].word`。
4. 回归：`npx vitest run` 应报 `Test Files 17 passed (17)`；再跑 `npm run lint`/`npm run build` 确认无类型回归。

> 提醒：若选择“忠实复制现状”而非“达成目标态”，则**不要**实施上述修复，并以本附录 13 条失败作为基线快照验收（V5 验收项）。

---

## 附录C：public/data 数据资产实测指纹（2026-07-28）

复现验收时，重跑数据管线（9.4 节 build-data.ts + `npm run build:chunks`）后应得到与下表**条数完全一致**的产物（字节数可因 JSON 序列化细节微小浮动，条数不得有差异）：

| 文件 | 实测字节 | 结构 | 条数/键数 |
|------|---------|------|-----------|
| `vocab.json` | 858,461 | `VocabEntry[]` | **5011** |
| `word-sorted.json` | 123,236 | `{w,i}[]`（小写字典序） | **5011**，首三条 `{"w":"abandon","i":197}` `{"w":"ability","i":198}` `{"w":"able","i":199}` |
| `roots-index.json` | 27,134 | `Record<root,{m,w[]}>` | **613** 根 |
| `sidebar.json` | 19,863 | `{t,m,c}[]` | **613**，首条 `{"t":"a","m":"朝向","c":30}` |
| `chunks/manifest.json` | 11,014 | `{chunks:[{name,roots,wordCount}],totalWords}` | 顶层 **2** 键；chunks 数组 4 项 |
| `chunks/chunk-hot.json` | 122,259 | 裸 `VocabEntry[]` | **552** |
| `chunks/chunk-warm.json` | 124,066 | 裸 `VocabEntry[]` | **595** |
| `chunks/chunk-cool.json` | 120,802 | 裸 `VocabEntry[]` | **633** |
| `chunks/chunk-cold.json` | 491,337 | 裸 `VocabEntry[]` | **3231** |

交叉校验关系（验收时逐条检查）：

1. `552 + 595 + 633 + 3231 = 5011 = vocab.json 条数 = word-sorted.json 条数 = manifest.totalWords`。
2. `roots-index.json 键数 = sidebar.json 条数 = 613`。
3. manifest 四层实测根数分布：`chunk-hot` **50** 根/552 词、`chunk-warm` **150** 根/595 词、`chunk-cool` **300** 根/633 词、`chunk-cold` **113** 根/3231 词，合计 613 根（与 TIERS 切片 0-50/50-200/200-500/500+ 完全吻合）；chunk-hot 首 4 个 roots 实测为 `["a","sta","pos","as",...]`（按该根词频降序）。
4. chunk-hot 首条实测：`{"word":"aspect","definition":"方面","parts":[{"type":"root","text":"a","meaning":"朝向","decomposed":false},{"type":"root","text":"spect","meaning":"看","decomposed":true}],"source":"auto","confidence":0}` —— 注意 chunk 内条目含 `source`/`confidence` 字段（直接由 vocab.json 条目复制，未裁剪）。
5. word-sorted 首条 `abandon` 映射到 `i:197`，证明 vocab.json **非字典序**（前 197 条为 manual 来源的高频词，act/action/active 居首，见 4.2 节样例）。

**重要格式冲突记录**（与附录 B.1 互引）：`tests/data-loader.test.ts` mock 的目标态格式（manifest `{hot:{roots,count}}`、chunk `{indices,entries}`）与上表实际产线格式不同。复现时二选一：
- **忠实现状**：保持产线格式（build-chunks.ts 输出裸数组），接受 data-loader 4 条失败基线；
- **目标态**：同时改造 build-chunks.ts 输出与 data-loader.ts 解析为 `{indices,entries}` 包装格式（indices 为条目在 vocab.json 中的全局下标，使懒加载可回填稀疏 data 数组），并把 manifest 改为以层名为键的对象；此时附录 B 的 4 条 data-loader 失败转绿，但需同步更新本附录指纹表。

<!-- APPENDIX C END -->

---

## 附录D：复现自查清单（Checklist，逐项勾选）

复现完成后，按序执行以下检查；全部通过即视为与原项目功能等价：

### D.1 环境与构建（对应第 2/9 章）

- [ ] `node -v` ≥ 18.18（Next.js 15 要求）；`npm install` 无 peer 冲突
- [ ] `npm run dev` 启动后 `http://localhost:3000` 首页可访问，默认 dark 主题（`#0F1410` 背景）
- [ ] `npm run lint` 零 error（warning 允许）
- [ ] `npm run build` 成功，输出 `out/` 目录，静态页总数 ≈ 5627（5011 词页 + 613 根页 + 固定路由）

### D.2 数据管线（对应第 6 章 + 附录C）

- [ ] 重跑 build-data（9.4 节参考实现）+ `npm run build:chunks` 后，9 个产物文件条数与附录C指纹表完全一致
- [ ] `vocab.json` 首三条为 act/action/active（source:"manual"）；`word-sorted.json` 首条 `{"w":"abandon","i":197}`
- [ ] 四层 chunk 词数 552/595/633/3231，根数 50/150/300/113

### D.3 功能验收（对应第 1 章 F01-F17 + 第 8 章）

- [ ] 搜索框输入 `bio` 前缀命中；输入完整根 `spect` 倒排命中；输入释义片段（≥2 字符）全文命中
- [ ] 侧边栏展示 613 根分组；点击根筛选该根词族
- [ ] 学习/复习流：新根 unseen→答对（q≥3）→learning；连对 3 次→reviewing；连对 5 次且 EF>2.0→mastered；答错→回 learning 且 interval=1
- [ ] 进度持久化：刷新后 localStorage `linxu-progress` 与 learn-store persist 键均存在（注意 10.4 双写冲突为已知问题，复现时应保留现状或统一，二选一并记录）
- [ ] 主题切换 dark/light 变量值与 8.4 节表一致

### D.4 测试基线（对应附录 A/B）

- [ ] 未实施补丁：`npx vitest run` → `Test Files 2 failed | 15 passed (17)`，13 条失败与附录B逐条一致
- [ ] 已实施补丁（B.3）：`Test Files 17 passed (17)`，370 条全绿
- [ ] 测试文件未被修改（附录A 三文件逐字一致）

### D.5 安全与约束

- [ ] 仓库内无任何 `.env*` 密钥（本项目无环境变量依赖，见 2.4 节）
- [ ] 部署产物为纯静态 `out/`，无服务端运行时（decompose.ts 仅构建期/开发期 Server Action，静态导出后不可用，见 7.4.8/10.7）

<!-- APPENDIX D END -->

---

> **文档完** —— 本文档与源码实测基线（2026-07-28，vitest 357/370，明细见附录B）互为验收锚点；凡未尽细节（纯展示性 JSX 结构、Tailwind 工具类组合）均可由第 7/8 章规格自由发挥，不影响功能等价性。

<!-- DOCUMENT END -->
