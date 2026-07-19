/**
 * 书籍数据包 schema v2
 * 规范文档：docs/schema.md（schema 变更必须同步该文档并升版本号）
 * v2 新增：句级对齐 Paragraph.sentences、人物引用 Entity.refId、
 *          人物库 persons.json、出现位置索引 person-index.json
 * 阅读器向后兼容 v1 数据（新字段均为可选）。
 */

/** 书目索引（public/data/books.json） */
export interface BookIndexEntry {
  id: string
  title: string
  author: string
  dynasty: string
  /** 一句话简介，书架页展示 */
  blurb?: string
}

/** 注释层定义，如 三国志 的裴松之注、通鉴 的胡三省注 */
export interface AnnotationLayer {
  id: string
  /** 行内标记文字，如「裴注」「胡注」 */
  label: string
  /** 注者说明，如「南朝宋·裴松之」 */
  source?: string
}

/** 书配置（public/data/<book>/book.json） */
export interface BookConfig {
  schemaVersion: 1 | 2
  id: string
  title: string
  author: string
  dynasty: string
  annotationLayers: AnnotationLayer[]
}

/** 目录树节点（public/data/<book>/toc.json 为节点数组） */
export interface TocNode {
  id: string
  title: string
  /** 叶子节点指向章节文件名（不含 .json） */
  chapterId?: string
  children?: TocNode[]
  /** v2.1：分部名（如「魏書」「蜀書」）；顶层节点都带 group 时目录渲染为分部 tab */
  group?: string
}

/** v2.1：书籍更新日志条目（public/data/<book>/updates.json 为数组，新在前） */
export interface BookUpdate {
  /** ISO 日期，如 2026-07-19 */
  date: string
  note: string
}

export type EntityType = 'person' | 'place' | 'office' | (string & {})

/** 行内实体标注，span 为原文字符区间 [start, end)，不允许相互重叠 */
export interface Entity {
  type: EntityType
  span: [number, number]
  name: string
  /** 生年，公元前用负数（前155 → -155） */
  birth?: number
  /** 卒年，同上 */
  death?: number
  note?: string
  /** v2：指向人物库 persons.json 的 id，有则人名可点击弹人物卡片 */
  refId?: string
}

/**
 * v2：句级对齐。o = 原文字符区间，t = 白话字符区间（均 [start, end)），
 * 按阅读顺序排列；o 依次覆盖原文、t 依次覆盖译文（允许跳过空白/标点间隙）
 */
export interface SentencePair {
  o: [number, number]
  t: [number, number]
}

/** v2：人物库条目（public/data/<book>/persons.json 为数组） */
export interface Person {
  id: string
  name: string
  /** 表字，如「孔明」 */
  zi?: string
  birth?: number
  death?: number
  /** 籍贯，如「琅邪陽都（今山東沂南）」 */
  native?: string
  /** 生平简介，150–300 字简体 */
  bio: string
}

/** v2：人物出现位置（public/data/<book>/person-index.json，脚本生成） */
export interface PersonOccurrence {
  chapterId: string
  chapterTitle: string
  paragraphId: string
  /** 段落原文开头若干字，用于列表预览 */
  preview: string
}

export type PersonIndex = Record<string, PersonOccurrence[]>

/** 注释，锚定在原文字符位置 anchor（[start, end)，可为零宽点位） */
export interface Annotation {
  /** 对应 BookConfig.annotationLayers 中的层 id */
  layer: string
  anchor: [number, number]
  /** 注释原文（繁体） */
  text: string
  translation?: string
}

export interface Paragraph {
  /** 全书唯一，约定 <chapterId>-p<三位序号> */
  id: string
  /** 文言原文（繁体） */
  original: string
  /** 白话翻译（简体） */
  translation: string
  annotations?: Annotation[]
  entities?: Entity[]
  /** v2：句级对齐；缺省时 UI 回退到段级联动 */
  sentences?: SentencePair[]
  /** 预留：分类标签（军事/权争…），原型阶段可为空 */
  tags?: string[]
  /** 预留：主题 id 列表，原型阶段可为空 */
  topics?: string[]
}

/** 章节文件（public/data/<book>/chapters/<chapterId>.json） */
export interface Chapter {
  id: string
  /** 章节标题，如「魏書一·武帝紀」 */
  title: string
  paragraphs: Paragraph[]
}
