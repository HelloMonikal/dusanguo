# 书阁 · 古籍对照阅读器

对标「读通鉴」(dutongjian.com) 的通用古籍阅读 Web 应用。核心理念：**代码与内容彻底分离**——阅读器只认一套「书籍数据包」JSON schema，每本书是一个数据包；各书差异（注释体系、目录层级、实体标注）全部体现在数据/配置层，不写书籍专属代码。

## 常用命令

```bash
npm run dev        # 开发服务器
npm test           # 数据校验 + 全部测试（提交前必须通过）
npm run validate   # 仅数据包校验
npm run build      # 生产构建（含 tsc 类型检查）
npm run lint       # oxlint
node scripts/ingest/parse_wikisource.mjs [--draft]  # 维基文库原文 → 章节 JSON
```

## 架构速览

- `src/lib/schema.ts` —— 书籍数据包 TS 类型（规范文档 docs/schema.md，改 schema 必须同步文档并升版本号）
- `src/lib/segment.ts` —— 原文按实体/注释区间切分的核心算法
- `src/lib/chinese.ts` —— opencc 繁简转换、生卒年格式化
- `src/lib/settings.ts` —— 阅读设置/收藏/进度（localStorage）
- `src/pages/` —— Bookshelf（书架）、Reader（阅读页）
- `src/components/` —— TocTree、ParagraphView（段落双栏对照）、SettingsPanel
- `public/data/<bookId>/` —— 书籍数据包（book.json + toc.json + chapters/*.json）
- `sources/` —— 原始语料（wikisource 原文、人工翻译、实体词典），是数据包的“源码”
- `scripts/` —— 导入管线与校验

数据流：`sources/` --(scripts/ingest)--> `public/data/` --(fetch)--> 阅读器。
**不要手改 `public/data/*/chapters/*.json`**，改 sources 后重新生成。

## 文档维护（必须遵守）

- `docs/requirements.md` 需求与功能对照；`docs/schema.md` 数据包规范（版本化）；
  `docs/decisions.md` 技术决策（ADR 式，只追加）；`docs/CHANGELOG.md` 版本变更；
  `docs/ROADMAP.md` 任务看板
- 每个里程碑完成时写 `docs/milestones/Mx-*.md` 总结（完成内容、架构现状、遗留问题、下阶段建议），供后续会话接续开发
- CHANGELOG 顶部维护 `[Unreleased]` 段，发版时归档并打 git tag

## Git 与多线开发

- `main` 始终可构建、测试通过；功能在 `feature/*` 分支开发，小步快合；里程碑打 tag（v0.1 = M1）
- **模块边界即并行边界**：`src/`（阅读器）、`public/data/<book>/` + `sources/`（内容，按书分域）、`scripts/`（管线）、`docs/`（文档）——并行开发线尽量各占一域
- 开工前在 `docs/ROADMAP.md` 认领任务（标注状态/分支），避免重复开发
- 跨线共享的契约（schema、`src/lib/schema.ts`）改动前先更新 `docs/schema.md` 并在 ROADMAP 标注
- `docs/decisions.md` 只追加不改写；里程碑总结一事一文件（低合并冲突）

## 环境

- Vite 三环境：development / test（Vitest+jsdom）/ production
- 环境变量：`.env.development` / `.env.production`（`VITE_DATA_BASE` 数据基础路径）
- 测试用 `tests/` 内的内联 fixture，不依赖 `public/data/` 正式数据
