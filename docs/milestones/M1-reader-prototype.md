# M1 · 阅读器原型（v0.1，2026-07-12）

## 完成内容

- **通用书籍数据包 schema v1**：books 索引 / book 配置（注释层声明）/ 任意深度 toc / 章节段落（原文+白话+注释锚点+实体区间，tags/topics 预留）。规范见 docs/schema.md
- **阅读器**（纯前端，Vite+React+TS）：
  - 书架页 → 阅读页（目录树、面包屑、前后章节导航、阅读进度记忆）
  - 文言/白话左右对照，段级悬停联动高亮；窄屏（<800px CSS 宽）自动上下堆叠、侧栏变浮层
  - 行内实体：人名生卒年下标（公元前负数）、地名加框；〔裴注〕点击展开注文（支持注文白话）
  - 阅读设置：简/繁（opencc 实时转换）、白话显隐、字体宋/楷/黑、字号滑杆、生卒开关；localStorage 持久化
  - 段落星标收藏（本地）
- **《三国志》样例数据包**：武帝纪节选 12 段 + 诸葛亮传全文 40 段；裴注 60 条（含后出师表、袁子评等长注）；白话翻译 52 段；实体词典 149 条自动标注
- **导入管线雏形** `scripts/ingest/parse_wikisource.mjs`：wikitext 括号感知解析（跨行模板）、分段、裴注锚点计算、实体词典长词优先匹配、翻译按段合入；`--draft` 模式输出原文清单供撰写翻译
- **质量**：`scripts/validate.mjs` 数据校验（span/锚点/id/引用完整性）+ Vitest 28 例（切分算法边界、opencc、localStorage hooks、ParagraphView/SettingsPanel 组件）；`npm test` 全绿；生产构建通过
- **浏览器实测通过**：对照渲染、裴注展开、简繁切换、星标、刷新后设置/收藏/进度持久化、窄屏堆叠

## 期间修复的 bug

- `readJson` 对数组类型用对象展开合并，导致刷新后收藏数组变对象、`favorites.includes` 崩溃（已修复 + 回归测试）

## 架构现状

数据流：`sources/`（wikisource 原文 + 人工翻译 + 实体词典）→ ingest 脚本 → `public/data/`（生成物，勿手改）→ 阅读器 fetch。代码入口 `src/main.tsx`（HashRouter），核心算法 `src/lib/segment.ts`。

## 遗留问题 / 已知限制

1. **bundle 1.4MB**（gzip 593KB），大头是 opencc-js 字典——应改为动态 import 懒加载（M2）
2. 裴注多数暂无白话翻译（schema 支持，缺内容）
3. 窄屏下目录侧栏默认展开会遮挡正文，宜默认收起（小改动）
4. 悬停联动是段级，未做句级对齐
5. 武帝纪仅节选前 12 段；整卷/整书需要批量翻译管线（M3，接 Claude API）
6. curl 本地冒烟测试需 `--noproxy '*'`（用户 shell 有代理环境变量）

## 下阶段建议（M2）

按 docs/ROADMAP.md：优先做「收藏页」「标签渲染」「主题聚合」中用户最想要的一项；顺手修 bundle 懒加载与移动端侧栏默认收起。多线开发可并行：UI 功能（src/）一条线，内容扩充（sources/）一条线，互不冲突。
