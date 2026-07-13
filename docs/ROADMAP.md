# ROADMAP · 任务看板

> 多线开发约定：开工前在此认领（填状态+分支），完工后更新状态并在 CHANGELOG [Unreleased] 记一笔。
> 状态：todo / doing / done

## M1 阅读器原型（v0.1）

| 任务 | 状态 | 分支 | 说明 |
|---|---|---|---|
| 脚手架/环境/测试基建 | done | main | Vite+React+TS, Vitest, 三环境 |
| schema v1 + 核心 lib | done | main | segment/chinese/settings/data |
| 阅读器 UI | done | main | 书架/目录树/对照/注释/设置 |
| 三国志样例数据包 | done | main | 武帝纪节选+诸葛亮传 |
| 校验器与测试 | done | main | validate.mjs + 27 tests |
| 文档体系 | done | main | CLAUDE.md + docs/* |

## M2 句级对照联动 + 人物卡片（v0.2，已完成）

| 任务 | 状态 | 分支 | 说明 |
|---|---|---|---|
| Schema v2（sentences/refId/persons） | done | main | shu-05 改名 shu-35 |
| 管线：对齐换算/persons/person-index/validate v2 | done | main | 字符串句对源格式（D-008） |
| 句级对照联动 UI | done | main | 双侧悬停同步高亮，v1 数据回退段级 |
| 人物卡片 + 出现位置跳转 | done | main | hash 定位 + 闪烁提示 |
| 52 段句级对齐 + 47 人生平 | done | main | 全部通过精确匹配校验 |

## M3 蜀书 15 卷内容生产（进行中）

| 任务 | 状态 | 分支 | 说明 |
|---|---|---|---|
| 管线数据驱动配置 + fetch 脚本 | done | main | chapters.config.json（enabled 控制上线）、toc 自动生成、{{quote}}/-{}- 修复 |
| 卷32 先主传（正文对齐翻译） | done | main | 38 段 321 句对，实体+23 人生平 |
| 裴注白话专项（卷01 节选/32/35 共 108 条） | todo | - | sources/annotations/<ch>.json，管线已支持 |
| 卷33 后主传 | todo | - | 每批：对齐翻译+实体+人物 bio |
| 卷36 关张马黄赵传 | todo | - | |
| 卷31/34/37–45 其余各卷 | todo | - | 重要传记优先 |

## M4 知识层（候选）

| 任务 | 状态 | 分支 | 说明 |
|---|---|---|---|
| 段落分类标签（tags 渲染+筛选） | todo | - | schema 已预留 |
| 主题聚合页（topics + 主题库） | todo | - | 类似"井陉之战"专题弹层 |
| 全文搜索 | todo | - | 可先客户端索引 |
| 收藏页（已星标段落列表） | todo | - | 纯前端可做 |
| opencc 字典懒加载（bundle 1.4MB→拆分） | todo | - | 见 M1 遗留问题 |
| 窄屏目录侧栏默认收起 | todo | - | 见 M1 遗留问题 |
| 单字称谓实体匹配（亮/瞻/喬…） | todo | - | 见 M2 遗留问题，需消歧策略 |

## M3 内容扩展（候选）

| 任务 | 状态 | 分支 | 说明 |
|---|---|---|---|
| 三国志整卷批量导入管线 | todo | - | 接 Claude API 批量翻译/标注（参考 claude-api skill） |
| 第二本书（史记等） | todo | - | 验证零代码接入 |
| 实体词典库化 | todo | - | 跨书共享人物库 |

## 远期

用户账号与云同步、个人批注、纪事本末式事件重组视图、沙盘地图、AI 阅读助手。
