# 读三国 · 古籍对照阅读器

对标「读通鉴」(dutongjian.com) 的通用古籍深度阅读 Web 应用。当前内容为《三国志》（陈寿撰，裴松之注）。

**在线阅读**：https://dusanguo.xyz

## 特性

- 文言原文 / 白话译文左右对照，**句级悬停联动**（悬停任一侧句子，对应句双侧高亮）
- 行内实体标注：人名带生卒年下标、地名加框；〔裴注〕点击展开
- **人物卡片**：点击人名查看生平（姓名/表字/生卒/籍贯/简介）与本书出现位置，可跳转定位
- 阅读设置：简/繁切换（opencc 实时转换）、白话显隐、宋/楷/黑字体、字号、生卒开关
- 段落星标收藏、阅读进度记忆（localStorage）
- **通用模板架构**：阅读器代码与书籍内容彻底分离，任何符合数据包规范的古籍零代码接入

## 内容进度

| 卷 | 状态 |
|---|---|
| 魏書·武帝紀（节选） | ✅ 全对齐 |
| 蜀書·先主傳（卷三十二） | ✅ 全对齐 |
| 蜀書·諸葛亮傳（卷三十五） | ✅ 全对齐 |
| 蜀书其余 13 卷 | 🚧 分批进行中（见 docs/ROADMAP.md） |

原文取自[维基文库](https://zh.wikisource.org/)（公有领域）；白话译文、句级对齐、人物生平为本项目自制。

## 开发

```bash
npm install
npm run dev        # 开发服务器
npm test           # 数据校验 + 测试
npm run build      # 生产构建
node scripts/ingest/fetch_wikisource.mjs   # 抓取原文
node scripts/ingest/parse_wikisource.mjs   # 生成数据包
```

架构与协作约定见 [CLAUDE.md](CLAUDE.md)，数据包规范见 [docs/schema.md](docs/schema.md)，任务看板见 [docs/ROADMAP.md](docs/ROADMAP.md)。

## 部署

推送到 `main` 分支自动触发 GitHub Actions 构建并部署到 GitHub Pages（`.github/workflows/deploy.yml`）。
