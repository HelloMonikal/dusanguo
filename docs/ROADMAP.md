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

## M2 知识层（候选）

| 任务 | 状态 | 分支 | 说明 |
|---|---|---|---|
| 段落分类标签（tags 渲染+筛选） | todo | - | schema 已预留 |
| 主题聚合页（topics + 主题库） | todo | - | 类似"井陉之战"专题弹层 |
| 全文搜索 | todo | - | 可先客户端索引 |
| 收藏页（已星标段落列表） | todo | - | 纯前端可做 |
| 注释白话补全 | todo | - | 现有 60 条裴注多数无 translation |

## M3 内容扩展（候选）

| 任务 | 状态 | 分支 | 说明 |
|---|---|---|---|
| 三国志整卷批量导入管线 | todo | - | 接 Claude API 批量翻译/标注（参考 claude-api skill） |
| 第二本书（史记等） | todo | - | 验证零代码接入 |
| 实体词典库化 | todo | - | 跨书共享人物库 |

## 远期

用户账号与云同步、个人批注、纪事本末式事件重组视图、沙盘地图、AI 阅读助手。
