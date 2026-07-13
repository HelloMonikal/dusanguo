# M2 · 句级对照联动 + 人物卡片（v0.2，2026-07-13）

## 完成内容

- **Schema v2**（docs/schema.md 已升版）：
  - `Paragraph.sentences: [{o, t}]` 句级对齐区间；`Entity.refId` 人物引用
  - 新数据文件：`persons.json`（人物库）、`person-index.json`（出现位置索引，生成物）
  - 章节 id 统一为全书卷号：`shu-05` → `shu-35`（旧 localStorage 进度/收藏失配，可接受）
  - 全部新字段可选，阅读器向后兼容 v1
- **句级对照联动**：悬停任一侧句子，两侧对应句同步高亮（`segmentBySentence` 句分组切分，实体/注释嵌套在句内；无对齐数据回退段级联动）
- **人物卡片**：带 refId 的人名可点击 → 卡片（姓名/字/生卒/籍贯/150–300 字生平/本书出现 N 处列表）；点出现位置跳转 `#段落id` 并滚动定位 + 闪烁提示
- **管线**：对齐源格式为句子字符串对（`sources/alignments/`），脚本子串定位换算区间并强校验拼接完整性；实体词典扩展 id/zi/native/bio，脚本抽取 persons.json、扫描生成 person-index.json；validate 新增 v2 全部规则（句区间、实体不跨句、refId 引用、人物库一致性）
- **数据**：52 段全部句级对齐（wei-01 十二段 + shu-35 四十段，约 190 句对，全部一次通过精确匹配校验）；人物库 47 人（含生平），索引 42 人
- **质量**：38 例测试全绿；浏览器实测（截图通道故障时改用 JS 驱动断言）：句联动双侧高亮、人物卡内容、出现位置跳转、卡片关闭均验证通过；生产构建通过

## 架构现状

数据流不变：`sources/`（wikisource + translations + alignments + entities）→ ingest → `public/data/`。核心切分算法 `src/lib/segment.ts`（`segmentBySentence`/`splitTranslation`），人物卡 `src/components/PersonCard.tsx`，跳转定位在 `src/pages/Reader.tsx`（location.hash 滚动 + flash）。

## 遗留问题 / 已知限制

1. **单字称谓不可点击**：正文中"亮""瞻""喬""琦"等单字指代未做实体匹配（歧义风险高），故诸葛瞻、诸葛乔等 5 人有生平而无出现位置
2. bundle 1.4MB（opencc 字典懒加载）仍未做（M1 遗留）
3. Chrome 插件截图通道在长页面偶发超时（用 javascript_tool 断言可绕过，不影响产品）
4. 裴注仍无白话（M3 蜀书批次时补）

## 下阶段（M3）

蜀书 15 卷内容生产，按计划分批会话内手翻：管线改数据驱动配置 + fetch 脚本 → 每批 1–2 卷（对齐翻译/裴注白话/实体增量/新人物 bio）→ 每批 commit 验收。建议顺序：卷32 先主传 → 卷33 后主传 → 卷36 关张马黄赵传 → 其余。
