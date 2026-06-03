# Investment Intel Desk 调研方案

更新时间：2026-06-03 Asia/Shanghai

## 定位

本项目是“证据型投研工作台 + 每日出版物”。它整理公开投资理财知识、官方数据、监管和政策新闻、社区/KOL/竞品模式，并输出非个性化行动清单和概率情景。它不是荐股系统，不提供个性化投资、法律或税务建议。

## 来源分层

- Tier 0 官方事实源：BLS、BEA、Federal Reserve、U.S. Treasury、SEC、FINRA、IRS、FRED。
- Tier 1 新闻核验源：Reuters、AP、CNBC、MarketWatch、Bloomberg、FT、WSJ 等，使用公开标题、链接和事实摘要，不抓取受版权或订阅限制的正文。
- Tier 2 机构观点源：Vanguard、Morningstar、Schwab、BlackRock、J.P. Morgan 等，用于观点对照和知识框架。
- Tier 3 社区和创作者源：Bogleheads、Reddit、Stocktwits、X/cashtags、Seeking Alpha、Substack、YouTube、播客。只作为情绪、争议和主题发现，正文事实必须回链到 Tier 0/1。

## 已落地网页模块

- 今日摘要：利率、通胀、政策、监管新闻驱动的每日 brief。
- 非个性化建议：现金流、再平衡、久期、仓位和事实核验清单。
- 风控底线：避免社交喊单、杠杆和高波动资产失控。
- 跨资产信号：Treasury 曲线、CPI、PCE、Fed Funds、就业和工资数据。
- 趋势预测：基准、上行、下行情景，以概率表达。
- 实时新闻队列：Fed RSS、SEC RSS、BLS/BEA 核心宏观事实。
- 宏观日历：ISM、就业、CPI、FOMC、PCE。
- 知识地图：资产配置、股票/ETF、债券/现金、房地产/REITs、加密资产、宏观指标、风险管理、税务监管。
- 社区与产品方案：Vanguard/Bogleheads、Buffett/Berkshire、Dalio/All Weather、Howard Marks/Oaktree、TradingView/Stocktwits、Seeking Alpha/Substack/YouTube。
- 来源账本和更新诊断：展示源用途和最近更新状态。

## 每日更新机制

1. `scripts/update-daily.mjs` 抓取公开源：Federal Reserve RSS、SEC RSS、U.S. Treasury XML、Stooq CSV、CoinGecko API。
2. Treasury 是利率主源；FRED 是备用源，只有 Treasury 失败时启用。
3. RSS 新闻与人工校验的宏观事实合并去重，避免自动更新覆盖核心背景。
4. 情景预测由规则生成：10Y Treasury、政策新闻、风险资产信号共同决定基准/上行/下行情景。
5. `.github/workflows/daily-publish.yml` 提供每日 GitHub Pages 更新骨架。
6. 需要人工或模型复核高影响新闻，特别是政策、监管、就业、通胀和地缘事件。

## 版权和合规边界

- 不复制付费研报、新闻正文或 KOL 付费内容。
- 不输出单一证券买卖指令、目标价或个性化组合建议。
- 所有趋势预测必须包含不确定性、反方情景和风险提示。
- 社区热度只标为情绪信号，不作为事实来源。
- 若未来做个性化建议、组合推荐或收费投顾服务，需要先做证券/投顾合规评估。

## 关键来源

- BLS CPI: https://www.bls.gov/news.release/cpi.htm
- BEA Personal Income and Outlays: https://www.bea.gov/news/2026/personal-income-and-outlays-april-2026
- Federal Reserve FOMC: https://www.federalreserve.gov/newsevents/pressreleases/monetary20260429a.htm
- U.S. Treasury Daily Rates: https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve
- SEC Press Releases: https://www.sec.gov/newsroom/press-releases
- SEC Investor.gov: https://www.investor.gov
- FINRA Asset Allocation and Diversification: https://www.finra.org/investors/investing/investing-basics/asset-allocation-diversification
- IRS Topic 409: https://www.irs.gov/taxtopics/tc409
- Vanguard Principles: https://corporate.vanguard.com/content/corporatesite/us/en/corp/how-we-invest/principles-for-investing-success.html
- TradingView Social Network: https://www.tradingview.com/social-network/
- Stocktwits: https://stocktwits.com/about/
- Seeking Alpha: https://about.seekingalpha.com/
