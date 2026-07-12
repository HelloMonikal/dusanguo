/**
 * 书籍数据包 schema v1
 * 规范文档：docs/schema.md（schema 变更必须同步该文档并升版本号）
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
  schemaVersion: 1
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
}

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
