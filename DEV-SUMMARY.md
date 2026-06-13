# etymology-app 开发总结

## 项目概述

英语词根词缀学习网站，包含 5011 个词汇 + 613 个词根，核心目标是帮助用户快速过完 4500 词并通过词根关联记忆。

**技术栈**：Next.js 15 + TypeScript + Zustand + Tailwind CSS 4  
**部署**：Vercel (https://lenovo-olive.vercel.app)

---

## 第一阶段：词根侧栏语义分组

### 问题

- 600+ 词根仅按频率降序排列，无任何语义分组
- 大量释义错误（AI 自动翻译英文单词义，非词根义）
- 混入 400+ 普通英文单词（the, but, have, like, wear 等）

### 方案

通过 5 个角色子代理并行讨论确定方案：

| 角色 | 核心建议 |
|------|---------|
| 行为分析 | 辅音骨架分组，30-40 组 × 15-20 个，组内相似度递进 |
| 产品经理 | 分组 + 数据清洗一起做，删垃圾、修释义 |
| 开发负责人 | 纯前端映射方案，新增 root-groups.ts |
| 数据审计 | 75+ 条应删除，6+ 条释义需修正 |
| UX 设计 | 可折叠分组，搜索时自动展开，localStorage 持久化 |

### 实施

15 个子代理并行开发：

**数据代理（10 个）** — 各生成一组词根数据片段：

| 分组 | 词根数 | 核心词根 |
|------|--------|---------|
| 看与观察 | 10 | vis, vid, spect, spec, view |
| 说与语言 | 17 | dict, scribe, script, graph, voc |
| 行走与移动 | 20 | ced, cess, fer, port, duct, mot |
| 拿取与投掷 | 15 | cap, cept, tract, ject, mit, miss |
| 站立与放置 | 14 | sta, stit, ten, tain, pos, sid |
| 心智与感觉 | 17 | sci, sent, mem, cred, cord, psych |
| 建造与创造 | 13 | act, fac, fect, struct, cre, oper |
| 转变与状态 | 14 | vert, vers, gen, form, fin, rupt |
| 法律与社会 | 16 | leg, jur, sign, soci, civil, liber |
| 前缀与方向 | 36 | pre, re, dis, con, ex, sub, super |

**代码代理（5 个）** — 各修改一个独立文件：

- `src/lib/root-groups.ts` — 新建，10 个语义分组，174 个核心词根
- `src/lib/types.ts` — 新增 SidebarGroup 接口
- `src/lib/search-engine.ts` — 新增 buildSidebarGroups()
- `src/components/layout/Sidebar.tsx` — 分组折叠渲染
- `src/app/page.tsx` — 适配新数据结构

### 关键修改

**数据清洗**：
- 删除 400+ 非词根条目（the, but, have, like, wear, work, home...）
- 修正释义：rat(推理)、por(携带)、pass(通过)、van(空的)、vote(誓约)、not(标记)
- 移除非词根：scop, optic（不在 roots-index 中）

**侧栏交互**：
- 默认展开前 3 组，其余折叠
- 折叠状态持久化到 localStorage
- 搜索时自动展开所有分组
- 侧栏顶部显示总词根数

---

## 第二阶段：测试体系建设

### 问题

项目无任何测试基础设施，需要从零搭建并达到 90%+ 覆盖率。

### 实施

15 个子代理并行编写测试，最终修复整合：

| 测试文件 | 测试数 | 覆盖范围 |
|---------|--------|---------|
| search-engine.test.ts | 27 | 搜索算法、前缀匹配、词根索引、分组构建 |
| app-store.test.ts | 26 | Zustand store 全状态流 |
| types.test.ts | 26 | 5011 词 + 613 词根运行时接口验证 |
| vocab-quality.test.ts | 21 | 词汇分解准确性、词根索引一致性 |
| Sidebar.test.tsx | 17 | 折叠/展开、持久化、搜索、选择 |
| constants.test.ts | 14 | 常量合理性 |
| FilterChips.test.tsx | 14 | 标签渲染、清除、样式 |
| CardGrid.test.tsx | 9 | 卡片渲染、收藏、朗读 |
| TopBar.test.tsx | 9 | 搜索框、防抖、清除 |
| Pagination.test.tsx | 8 | 分页导航、边界 |
| useFavorites.test.ts | 8 | 收藏增删、localStorage |
| useSpeak.test.ts | 7 | 语音合成 |
| useSearch.test.ts | 5 | 数据加载、错误处理 |
| root-groups.test.ts | 多项 | 数据质量、去重、核心词根完整性 |

**总计：333 测试全部通过，14/14 文件绿灯**

### 测试验证的数据质量

- vocab.json：5011 条目，每条有 word/definition/parts
- roots-index.json：613 词根，索引边界全部有效
- 核心词根分解验证：action/act, visible/vis, transport/port, construct/struct, predict/dict, receive/ceive, inspect/spect, generate/gen 全部正确

### 踩坑记录

**中文路径 ESM 问题**：Node.js 25 + Windows 下，项目路径含中文字符（`项目`）导致 ESM 模块解析失败。解决：在纯 ASCII 路径下运行测试，或使用 `--experimental-strip-types`。

---

## 文件变更清单

### 新增文件

| 文件 | 用途 |
|------|------|
| `src/lib/root-groups.ts` | 词根语义分组定义 |
| `vitest.config.ts` | 测试框架配置 |
| `src/test/setup.ts` | 测试环境初始化 |
| `vercel.json` | Vercel 部署配置 |
| `src/**/__tests__/*` (14 个) | 测试文件 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/lib/types.ts` | 新增 SidebarGroup 接口 |
| `src/lib/search-engine.ts` | 新增 buildSidebarGroups() |
| `src/components/layout/Sidebar.tsx` | 分组折叠渲染 |
| `src/app/page.tsx` | 适配新 Sidebar 数据结构 |
| `package.json` | 测试依赖 + 脚本 |

---

## Git 提交记录

```
75c1bc8 test: 添加完整测试套件 (333 tests, 14 files)
5715be7 fix: 设置 Vercel 框架为 nextjs
a0731d4 feat: 按语义分组组织词根侧栏
```
