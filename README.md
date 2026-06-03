# Investment Intel Desk

一个公开信息驱动的投资理财情报网页。它把官方宏观数据、监管新闻、市场数据、社区产品形态和长期投资框架整合成每日更新的研究工作台。

## 本地运行

```bash
npm run serve
```

打开 `http://localhost:4173`。

## 每日更新

```bash
npm run update
```

脚本会尝试抓取：

- Federal Reserve RSS：货币政策新闻
- SEC RSS：投资者提醒和新闻
- U.S. Treasury XML：3M/2Y/10Y/30Y 美债收益率
- FRED CSV：Treasury 失败时的备用收益率源
- Stooq CSV：SPY、QQQ、TLT、GLD
- CoinGecko keyless API：BTC、ETH

若外部源失败，脚本保留 `data/daily.json` 中已有的人工校验快照。

## 内容边界

页面只提供公开信息整理、教育研究、风险提示和非个性化行动清单，不提供个人化投资、法律或税务建议。所有预测都以情景和概率表达，不给单点目标价或无条件买卖指令。

## 发布

`.github/workflows/daily-publish.yml` 提供 GitHub Pages 的每日更新骨架。启用 Pages 后，workflow 会每日运行更新脚本、提交 `data/daily.json`，然后发布静态页面。
