# 书籍数据包 Schema 规范

**当前版本：v1**（对应 `book.json` 的 `schemaVersion: 1`）

TS 类型定义：`src/lib/schema.ts`（与本文档同步维护；改动 schema 必须同时更新两处并在文末记录变更）。

## 目录布局

```
public/data/
  books.json                 # 书目索引
  <bookId>/
    book.json                # 书配置
    toc.json                 # 目录树
    chapters/<chapterId>.json  # 章节（按需加载）
```

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
          "birth": 155, "death": 220, "note": "曹操，字孟德" },
        { "type": "place", "span": [6, 8], "name": "沛國" }
      ],
      "tags": [],              // 预留：分类标签（M2）
      "topics": []             // 预留：主题 id（M2）
    }
  ]
}
```

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
- `sources/entities/<bookId>.json` —— 实体词典（name/type/birth/death/note），由脚本在原文中自动匹配生成 span

`node scripts/ingest/parse_wikisource.mjs` 解析原文（分段、提取裴注并计算锚点）、合入翻译、匹配实体，输出章节 JSON。**不要手改生成物。**

## 变更记录

- **v1**（2026-07-12）：初版。
