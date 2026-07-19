# 书籍数据包 Schema 规范

**当前版本：v2.1**（对应 `book.json` 的 `schemaVersion: 2`；阅读器向后兼容 v1——v2/v2.1 新字段与新文件均为可选）

TS 类型定义：`src/lib/schema.ts`（与本文档同步维护；改动 schema 必须同时更新两处并在文末记录变更）。

## 目录布局

```
public/data/
  books.json                 # 书目索引
  <bookId>/
    book.json                # 书配置
    toc.json                 # 目录树
    chapters/<chapterId>.json  # 章节（按需加载）
    persons.json             # v2：人物库
    person-index.json        # v2：人物出现位置索引（生成物）
    updates.json             # v2.1：更新日志（可选）
```

**章节 id 规范**：`<部>-<两位全书卷号>`，如 `wei-01`（魏书卷一）、`shu-35`（蜀书五 = 全书卷三十五）。

## books.json —— 书目索引

```jsonc
[
  {
    "id": "sanguozhi",       // 目录名，全库唯一
    "title": "三国志",
    "author": "陈寿",
    "dynasty": "西晋",
    "blurb": "一句话简介（可选，书架卡片展示）"
  }
]
```

## book.json —— 书配置

```jsonc
{
  "schemaVersion": 1,
  "id": "sanguozhi",          // 必须与目录名一致
  "title": "三国志",
  "author": "陳壽",
  "dynasty": "西晉",
  "annotationLayers": [        // 注释层声明；chapters 中 annotation.layer 必须在此列出
    { "id": "peizhu", "label": "裴注", "source": "南朝宋·裴松之" }
  ]
}
```

注释层是通用机制：三国志=裴注，通鉴=胡注，可同时声明多层（如再加名家批注层）。

## toc.json —— 目录树

任意深度的节点数组。叶子节点带 `chapterId`（指向 chapters/ 下的文件名，不含 .json），分支节点带 `children`。

```jsonc
[
  { "id": "wei", "title": "魏書", "children": [
    { "id": "wei-01-node", "title": "卷一·武帝紀", "chapterId": "wei-01" }
  ]}
]
```

约束：节点 id 全书唯一；`chapterId` 必须有对应章节文件；阅读顺序 = 树的先序遍历。

**v2.1 `group`（可选）**：顶层节点可带分部名（如「魏書」「蜀書」）。当**所有**顶层节点都带 `group` 时，阅读器把目录渲染为分部 tab（tab 栏 + 当前分部的章节列表）；否则忽略该字段按普通树渲染。

```jsonc
[
  { "id": "wei-01-node", "title": "武帝紀-卷一", "chapterId": "wei-01", "group": "魏書" },
  { "id": "shu-32-node", "title": "先主傳-卷三十二", "chapterId": "shu-32", "group": "蜀書" }
]
```

## updates.json —— 更新日志（v2.1，可选）

书籍内容更新记录，数组按时间倒序（最新在前），阅读器在目录侧栏下方折叠展示；文件缺失时不展示。

```jsonc
[
  { "date": "2026-07-19", "note": "卷33 後主傳、卷36 關張馬黃趙傳上线" }
]
```

来源：`sources/updates.json`（按 bookId 分组），由导入脚本拷贝到各书数据包。

## chapters/<chapterId>.json —— 章节

```jsonc
{
  "id": "wei-01",             // 必须与文件名一致
  "title": "魏書一·武帝紀",
  "paragraphs": [
    {
      "id": "wei-01-p001",    // 全书唯一；约定 <chapterId>-p<三位序号>
      "original": "太祖武皇帝，沛國譙人也…",   // 文言原文，繁体
      "translation": "太祖武皇帝是沛国谯县人…", // 白话，简体；可为空串（校验器警告）
      "annotations": [         // 可选
        {
          "layer": "peizhu",  // 必须在 book.json.annotationLayers 中
          "anchor": [29, 29], // 原文字符区间 [start, end]，零宽=插入点
          "text": "《曹瞞傳》曰：…",   // 注释原文（繁体）
          "translation": "…"   // 注释白话（可选）
        }
      ],
      "entities": [            // 可选；span 之间不允许重叠
        { "type": "person", "span": [0, 2], "name": "太祖",
          "birth": 155, "death": 220, "note": "曹操，字孟德",
          "refId": "caocao" }, // v2：指向 persons.json，有则人名可点击
        { "type": "place", "span": [6, 8], "name": "沛國" }
      ],
      "sentences": [           // v2 可选：句级对齐（原文区间 ↔ 白话区间）
        { "o": [0, 30], "t": [0, 42] },
        { "o": [30, 52], "t": [42, 78] }
      ],
      "tags": [],              // 预留：分类标签
      "topics": []             // 预留：主题 id
    }
  ]
}
```

### sentences 约束（v2）

- `o` 依阅读顺序排列、互不重叠，拼接（允许跳过空白）完整覆盖 original；`t` 同理对 translation
- 实体 span 不得跨句边界（校验器强制）
- 缺省时 UI 回退到段级悬停联动

## persons.json —— 人物库（v2）

```jsonc
[
  {
    "id": "zhugeliang",       // 全书唯一，小写拼音
    "name": "諸葛亮",
    "zi": "孔明",             // 表字（可选）
    "birth": 181, "death": 234,
    "native": "琅邪陽都（今山東沂南）",   // 籍贯（可选）
    "bio": "三国时期蜀汉丞相…"           // 150–300 字简体生平
  }
]
```

实体词典（sources/entities）中同一人物的多个称谓（太祖/曹公/魏武帝）共用同一 `id`，其中**恰好一条**（本名条目）带 `bio` 等人物字段，由脚本抽取生成 persons.json。

## person-index.json —— 出现位置索引（v2，生成物）

```jsonc
{
  "zhugeliang": [
    { "chapterId": "shu-35", "chapterTitle": "蜀書五·諸葛亮傳",
      "paragraphId": "shu-35-p001", "preview": "諸葛亮字孔明，琅邪陽都人也…" }
  ]
}
```

由 ingest 脚本扫描全部章节生成（每人每段最多一条），**勿手改**。

### 字段约束

- **original 存繁体**；简体视图由前端 opencc 实时转换，数据不存两份
- **entity.span**：`[start, end)` 左闭右开，`original.slice(start, end) === name` 必须成立；不重叠、不越界
- **annotation.anchor**：`[start, end]`，渲染为锚点处的行内〔标〕记；锚点落在实体内部时渲染时顺延到实体尾
- **生卒年**：公元前用负数（前196 → `-196`）；未知则省略字段
- **entity.type**：`person` / `place` / `office`，开放扩展（未知类型按通用样式渲染）

校验：`npm run validate`（scripts/validate.mjs）强制以上全部约束。

## 数据生产流程

`sources/` 是数据包的源码：

- `sources/wikisource/*.txt` —— 维基文库原始 wikitext
- `sources/translations/<chapterId>.json` —— 段序号 → 白话翻译（人工/LLM 撰写）
- `sources/alignments/<chapterId>.json` —— v2：段序号 → 句对数组 `[{ "o": "原文句", "t": "白话句" }]`。
  **用句子字符串而非区间**（防手数偏移出错）；脚本按顺序子串定位换算区间并校验拼接完整性，定位失败即报错
- `sources/entities/<bookId>.json` —— 实体词典（name/type/birth/death/note），由脚本在原文中自动匹配生成 span；
  v2 增加人物字段：`id`（多称谓共用）、本名条目带 `zi`/`native`/`bio`

`node scripts/ingest/parse_wikisource.mjs` 解析原文（分段、提取裴注并计算锚点）、合入翻译、匹配实体，输出章节 JSON。**不要手改生成物。**

## 变更记录

- **v2.1**（2026-07-19）：新增 `TocNode.group` 分部字段（目录分部 tab）与 `updates.json` 更新日志文件。均可选，不影响 `schemaVersion`，阅读器向后兼容。
- **v2**（2026-07-12）：新增 `Paragraph.sentences` 句级对齐、`Entity.refId`、`persons.json` 人物库、`person-index.json` 出现位置索引；章节 id 统一为全书卷号（`shu-05` → `shu-35`）。新字段全部可选，阅读器向后兼容 v1。
- **v1**（2026-07-12）：初版。
