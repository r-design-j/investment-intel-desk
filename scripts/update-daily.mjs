import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dailyPath = resolve(root, "data", "daily.json");

const feedSources = [
  {
    name: "Federal Reserve Monetary Policy",
    url: "https://www.federalreserve.gov/feeds/press_monetary.xml",
    category: "Policy"
  },
  {
    name: "SEC Investor Alerts",
    url: "https://www.sec.gov/rss/investor/alertsandbulletins.xml",
    category: "Regulation"
  },
  {
    name: "SEC Press Releases",
    url: "https://www.sec.gov/news/pressreleases.rss",
    category: "Regulation"
  }
];

const fredSeries = [
  { id: "DGS3MO", label: "3M Treasury", shortLabel: "3M", unit: "%" },
  { id: "DGS2", label: "2Y Treasury", shortLabel: "2Y", unit: "%" },
  { id: "DGS10", label: "10Y Treasury", shortLabel: "10Y", unit: "%" },
  { id: "DGS30", label: "30Y Treasury", shortLabel: "30Y", unit: "%" }
];

const treasuryFields = [
  { field: "BC_3MONTH", label: "3M Treasury", shortLabel: "3M", unit: "%" },
  { field: "BC_2YEAR", label: "2Y Treasury", shortLabel: "2Y", unit: "%" },
  { field: "BC_10YEAR", label: "10Y Treasury", shortLabel: "10Y", unit: "%" },
  { field: "BC_30YEAR", label: "30Y Treasury", shortLabel: "30Y", unit: "%" }
];

const stooqSymbols = [
  { symbol: "spy.us", label: "SPY", shortLabel: "SPY" },
  { symbol: "qqq.us", label: "QQQ", shortLabel: "QQQ" },
  { symbol: "tlt.us", label: "TLT", shortLabel: "TLT" },
  { symbol: "gld.us", label: "GLD", shortLabel: "GLD" }
];

const chinaIndexSecids = [
  { secid: "1.000001", label: "上证指数", shortLabel: "上证" },
  { secid: "0.399001", label: "深证成指", shortLabel: "深成" },
  { secid: "0.399006", label: "创业板指", shortLabel: "创业板" },
  { secid: "1.000300", label: "沪深300", shortLabel: "沪深300" },
  { secid: "1.000905", label: "中证500", shortLabel: "中证500" },
  { secid: "1.000688", label: "科创50", shortLabel: "科创50" }
];

const beginnerLessonBank = [
  {
    title: "基金不是稳赚账户",
    plain: "基金是把很多人的钱交给一个产品去买股票、债券、现金工具或其它资产。它会涨也会跌，风险来自底层资产。",
    example: "股票基金像一篮子股票，债券基金像一篮子债券，货币基金更接近现金管理工具。",
    todayCheck: "买之前先问：这只基金主要买什么？最差可能跌多少？我多久不用这笔钱？"
  },
  {
    title: "新手先分清三笔钱",
    plain: "短期要用的钱不应该放进高波动资产；长期不用的钱才适合承受股票基金波动。",
    example: "房租、生活费和 3-12 个月应急金先放现金桶；5 年以上长期资金再考虑权益基金。",
    todayCheck: "先写下：我这笔钱什么时候要用？如果亏 20% 会不会影响生活？"
  },
  {
    title: "宽基基金适合做核心仓",
    plain: "宽基基金买的是一整个市场或一大批公司，不押单一公司，适合新手做长期学习对象。",
    example: "国内常见观察样例包括沪深300 ETF、中证A500 ETF、中证500 ETF；海外可以把 VOO/SPY 当外部学习样本。",
    todayCheck: "先比较费用率、跟踪指数、规模、成交活跃度和持仓分散度，不要只看最近涨幅。"
  },
  {
    title: "债券基金也会亏",
    plain: "债券基金不是存款。利率上升时，长久期债券基金价格可能下跌。",
    example: "短债通常波动较低，长债对利率更敏感；TLT 这类长债 ETF 波动可能很大。",
    todayCheck: "看到债券基金前，先看久期、信用质量和你是否能承受净值波动。"
  },
  {
    title: "定投解决不了所有问题",
    plain: "定投可以降低择时压力，但如果买错资产、仓位过大或期限太短，仍然可能亏钱。",
    example: "长期宽基定投和短线追热点基金不是一回事。",
    todayCheck: "定投前先设上限：每月多少钱、投多久、什么条件下停止复盘。"
  },
  {
    title: "费用率会慢慢吃掉收益",
    plain: "同样跟踪一个指数，费用越低，长期留下来的收益通常越多。",
    example: "指数基金常见费用率差异看起来只有零点几，但十年二十年会拉开差距。",
    todayCheck: "同类基金先比较费用率、规模、流动性、跟踪误差。"
  },
  {
    title: "不要跟着别人实盘无脑买",
    plain: "雪球、蛋卷、且慢等平台上的公开组合和实盘通常有延迟，而且对方的资金量、期限和风险承受力都与你不同。",
    example: "看到大佬买入某个行业基金，先问它在组合里承担什么角色，而不是照着买。",
    todayCheck: "看公开实盘只问：这个方向说明了什么？能不能用宽基、分批或低风险方式表达？"
  }
];

const fundWatchlistTemplates = [
  {
    bucket: "现金/货币基金桶",
    examples: ["511880", "000198", "余额宝货币类"],
    role: "放短期要用的钱和等待机会的现金，不追求高收益。",
    suitableFor: "3-12 个月内可能要用的钱、应急金、暂时不想承受股票波动的资金。",
    buyGuidance: "新手先把现金桶补足，再考虑风险资产；货币基金和短债收益会随市场利率变化。",
    risk: "不是银行存款；仍有流动性、信用、净值波动和再投资风险。"
  },
  {
    bucket: "A股宽基核心",
    examples: ["510300", "159919", "510050"],
    role: "用沪深300、上证50等宽基观察 A 股核心资产，不押单一公司。",
    suitableFor: "主要收入和生活在中国、想学习人民币资产长期配置的新手。",
    buyGuidance: "先分批观察估值和回撤，不要因为一天上涨就追满仓。",
    risk: "A 股波动和政策预期影响较大，短期涨跌可能很剧烈。"
  },
  {
    bucket: "A股中小盘/成长",
    examples: ["510500", "512100", "159915"],
    role: "观察中证500、中证1000、创业板等成长和中小盘方向。",
    suitableFor: "已有核心宽基，只想用小比例资金学习成长风格的人。",
    buyGuidance: "新手不宜把这类基金当核心仓，先设仓位上限。",
    risk: "弹性大，回撤也大；估值、流动性和主题热度都会放大波动。"
  },
  {
    bucket: "A股红利/价值",
    examples: ["510880", "515180", "159581"],
    role: "观察分红、低估值和现金流稳定类资产，适合学习防守风格。",
    suitableFor: "想降低组合波动、关注股息和价值风格的人。",
    buyGuidance: "先看指数规则和行业集中度，不能只看分红率。",
    risk: "红利资产也会跌；高分红可能来自周期行业，收益不等于稳赚。"
  },
  {
    bucket: "A股主动基金公开季报",
    examples: ["005827", "161005", "003095"],
    role: "用公开季报学习基金经理风格和持仓，不当成实时跟单。",
    suitableFor: "想研究中国基金经理如何配置白酒、医药、科技、港股等方向的人。",
    buyGuidance: "先看基金经理任期、回撤、规模、持仓集中度和是否适合自己的期限。",
    risk: "季报滞后，基金经理可能已经调仓；主动基金还存在风格漂移和规模压力。"
  },
  {
    bucket: "美国宽基股票",
    examples: ["VOO", "VTI", "SPY"],
    role: "作为长期权益核心仓的学习样例，用一篮子公司分散单票风险。",
    suitableFor: "5 年以上不用、能承受大幅回撤的长期资金。",
    buyGuidance: "更适合分批或定投观察，不适合用短期生活费一次性冲进去。",
    risk: "熊市可能出现 20%-50% 级别回撤，短期不保证赚钱。"
  },
  {
    bucket: "全球股票分散",
    examples: ["VT", "VXUS", "ACWI"],
    role: "避免只押单一国家市场，把美国以外资产纳入观察。",
    suitableFor: "想降低单一市场依赖、接受汇率和地区差异的新手。",
    buyGuidance: "可作为宽基组合的分散工具，先看与已有持仓是否重复。",
    risk: "汇率、地区政策、估值周期都会影响表现。"
  },
  {
    bucket: "综合债券",
    examples: ["BND", "AGG", "IEF"],
    role: "降低组合波动，提供利息和再平衡来源。",
    suitableFor: "不想全仓股票、需要组合稳定性的投资者。",
    buyGuidance: "利率仍高时优先看久期；不理解久期前别重仓长债。",
    risk: "利率上升会压低债券基金净值，信用风险也会影响价格。"
  },
  {
    bucket: "黄金/抗通胀观察",
    examples: ["GLD", "IAU", "SGOL"],
    role: "用于观察避险、美元和实际利率变化，不产生现金流。",
    suitableFor: "想学习分散风险，但能接受黄金长期横盘的新手。",
    buyGuidance: "更适合作为小比例观察仓，不适合作为全部资产配置。",
    risk: "价格波动大，不保证抗跌，也没有股息或利息。"
  },
  {
    bucket: "高波动卫星",
    examples: ["QQQ", "ARKK", "BTC/ETH 相关产品"],
    role: "用于学习成长、科技和高波动资产的风险，不适合作为新手核心仓。",
    suitableFor: "已经有现金桶和核心宽基，只拿少量资金做学习的人。",
    buyGuidance: "先设仓位上限和止错条件，别因为社交平台热度追高。",
    risk: "回撤可能很深，主题基金和加密相关资产可能长期跑输宽基。"
  }
];

const guruManagers = [
  { name: "Berkshire Hathaway / Warren Buffett", cik: "0001067983", lesson: "集中在少数高质量公司，现金和安全边际很重要。" },
  { name: "Bridgewater Associates / Ray Dalio", cik: "0001350694", lesson: "从宏观环境和风险分散角度观察资产。" },
  { name: "Pershing Square / Bill Ackman", cik: "0001336528", lesson: "集中持仓，重视商业质量和催化因素。" },
  { name: "Duquesne Family Office / Stanley Druckenmiller", cik: "0001536411", lesson: "更偏宏观和机会型，仓位变化可能很快。" },
  { name: "Appaloosa / David Tepper", cik: "0001656456", lesson: "关注周期、赔率和风险资产再定价。" }
];

const chinaFundProfiles = [
  { code: "005827", style: "大盘消费/港股", lesson: "张坤代表性产品之一，适合学习高集中度消费和港股配置的波动。" },
  { code: "161005", style: "长期成长", lesson: "朱少醒长期管理产品，适合学习长期主动基金和风格稳定性。" },
  { code: "003095", style: "医药主题", lesson: "葛兰代表性医药基金，适合学习主题基金的高波动和行业周期。" },
  { code: "260108", style: "消费成长", lesson: "刘彦春代表性产品，适合观察消费成长风格的回撤和修复。" },
  { code: "163406", style: "均衡成长", lesson: "兴全合润适合观察均衡成长型主动基金的持仓变化。" }
];

const domesticPlatforms = [
  {
    name: "雪球",
    type: "社区/组合",
    priority: "国内主线",
    url: "https://xueqiu.com",
    use: "看 A 股、港股、基金组合和大 V 讨论热度，适合发现主题和学习不同投资方法。",
    bestFor: "组合线索、热门讨论、公开实盘入口、基金投资者社区。",
    caution: "帖子和热度不是事实来源，观点必须回到公告、季报和指数规则核验。"
  },
  {
    name: "同花顺基金",
    type: "行情/基金",
    priority: "国内主线",
    url: "https://fund.10jqka.com.cn/?op=index",
    use: "看基金净值、盘中估算、基金筛选和 A 股行情联动。",
    bestFor: "自选基金、估算净值、基金数据筛选、短期行情观察。",
    caution: "盘中估算不等于最终净值，主动基金调仓后估算误差可能较大。"
  },
  {
    name: "天天基金/东方财富基金",
    type: "基金数据",
    priority: "国内主线",
    url: "https://fund.eastmoney.com",
    use: "看基金档案、基金经理、季报持仓、收益回撤和规模变化。",
    bestFor: "公开季报、基金经理任期、持仓变化、同类排名复核。",
    caution: "排名和短期收益容易诱导追涨，先看回撤、规模、费用和持仓集中度。"
  },
  {
    name: "支付宝/蚂蚁财富",
    type: "销售/投教",
    priority: "国内主线",
    url: "https://d.antfortune.com/",
    use: "普通用户常用的基金购买和投教入口，适合观察大众资金和投教内容。",
    bestFor: "基金销售入口、投教、理财习惯和普通投资者视角。",
    caution: "平台推荐不等于适合你，买前要看风险等级、持有期限和费率。"
  },
  {
    name: "且慢",
    type: "投顾/组合",
    priority: "国内主线",
    url: "https://qieman.com/help/about",
    use: "看四笔钱框架、基金投顾组合和长期资产配置思路。",
    bestFor: "长期配置、投顾组合、资金用途分层、投资者教育。",
    caution: "投顾组合仍会波动，先确认资金期限和风险承受力。"
  },
  {
    name: "蛋卷基金",
    type: "基金组合",
    priority: "国内主线",
    url: "https://danjuanfunds.com",
    use: "看雪球基金生态、指数基金组合和基金投顾相关内容。",
    bestFor: "指数基金组合、投顾策略、基金专题内容。",
    caution: "组合历史表现不能代表未来，跟投前要看底层基金和调仓规则。"
  },
  {
    name: "养基宝",
    type: "持仓工具",
    priority: "国内辅助",
    url: "https://www.yangjibao.com/about.html",
    use: "跨平台记录基金持仓、估算收益和统一看账户。",
    bestFor: "多平台持仓同步、收益记录、盘中估算辅助。",
    caution: "它是数据展示工具，不是基金交易平台；估算收益以官方净值为准。"
  },
  {
    name: "有知有行",
    type: "投教/配置",
    priority: "国内辅助",
    url: "https://youzhiyouxing.cn/about/",
    use: "看中国股债长期数据、资产配置教育和投资新手内容。",
    bestFor: "长期主义、资产配置、投资 ABC、真实回报呈现。",
    caution: "投教内容帮助理解，不替代个人资产规划。"
  }
];

const chinaLivePortfolios = {
  label: "中国公开实盘/组合观察",
  note: "以下链接来自公开主页、专栏或平台内容，只用于学习方法和风格；公开组合可能延迟、限权限或不完整，不能照抄买入。",
  accounts: [
    {
      name: "ETF拯救世界 / E大",
      platform: "雪球 / 且慢",
      url: "https://qieman.com/longwin/articles/LONG_WIN",
      focus: "指数基金、估值、长赢计划和长期分批纪律。",
      lesson: "适合学习怎样把大类资产、估值和分批买入规则结合起来。",
      caution: "每次发车都有风险提示，不代表适合所有人，也不等于短期必赚。"
    },
    {
      name: "ETF拯救世界专栏",
      platform: "雪球",
      url: "https://xueqiu.com/4776750571/column",
      focus: "公开文章和指数投资思路。",
      lesson: "适合回看方法论和历史观点，而不是只盯单次操作。",
      caution: "专栏内容可能不是实时实盘，阅读时要看发布日期和市场环境。"
    },
    {
      name: "银行螺丝钉",
      platform: "雪球 / 蛋卷",
      url: "https://xueqiu.com/3079173340",
      focus: "指数基金定投、低估值框架和基金投教。",
      lesson: "适合学习低估值指数基金、定投纪律和基金组合复盘。",
      caution: "定投不保证赚钱，低估也可能长期更低，跟投前先看组合规则。"
    },
    {
      name: "螺丝钉组合及持有人报告",
      platform: "蛋卷基金",
      url: "https://danjuanfunds.com/article/1254.html",
      focus: "基金组合和持有人报告。",
      lesson: "适合学习组合持有人结构、组合说明和平台披露方式。",
      caution: "报告不等于今日持仓，购买前仍要查看最新产品文件。"
    },
    {
      name: "孟岩",
      platform: "雪球 / 有知有行",
      url: "https://xueqiu.com/u/1388190326",
      focus: "长期资产配置、四笔钱、投资者教育和中国股债历史数据。",
      lesson: "适合学习把资金用途、期限和风险承受力拆开的框架。",
      caution: "理念适合学习，具体组合和仓位必须按自己的现金流重算。"
    }
  ]
};

const domesticPlaybooks = [
  {
    name: "雪球：线索发现，不做事实终点",
    pattern: "用雪球看大 V、组合和讨论热度，快速知道大家在争什么。",
    productMoves: [
      "每条热门观点标注来源：公告、季报、研报、新闻还是个人判断。",
      "实盘认证只说明有人公开记录，不代表适合跟买。",
      "把高热度主题放入观察清单，等官方披露或价格回撤后再复盘。"
    ]
  },
  {
    name: "同花顺/东方财富：数据复核",
    pattern: "用基金数据页复核净值、规模、持仓、回撤、基金经理任期和费用。",
    productMoves: [
      "短期排名只做入口，不能作为买入理由。",
      "主动基金看季报持仓和风格漂移，指数基金看跟踪误差和规模。",
      "盘中估值只能辅助判断，最终以基金净值公告为准。"
    ]
  },
  {
    name: "支付宝/蚂蚁财富：大众资金入口",
    pattern: "把支付宝看作普通投资者最常用入口之一，用来理解大众投教和销售路径。",
    productMoves: [
      "买前强制展示风险等级、持有期限、费率和最大回撤提示。",
      "热门推荐旁边放同类低费率宽基作为对照。",
      "把平台活动和真实投资计划分开，避免促销式购买。"
    ]
  },
  {
    name: "且慢/有知有行：资金用途分层",
    pattern: "用四笔钱、长期配置和真实回报视角，把资金用途先分清。",
    productMoves: [
      "短钱不买高波动基金，长期钱才讨论权益仓位。",
      "组合推荐前先问钱什么时候用、能承受多大回撤。",
      "跟投组合要看调仓规则和底层基金，不只看主理人名气。"
    ]
  },
  {
    name: "蛋卷基金：组合跟投要拆底层",
    pattern: "组合产品看起来简单，但底层仍是基金、指数和调仓规则。",
    productMoves: [
      "先看底层基金是不是自己理解的资产。",
      "看组合回撤、换手、费用叠加和再平衡规则。",
      "组合只能帮你执行规则，不能替你承担风险。"
    ]
  },
  {
    name: "养基宝：记录工具，不替代决策",
    pattern: "用工具统一看多个平台持仓，减少账户分散带来的盲区。",
    productMoves: [
      "收益估算只做盘中参考，晚间净值公告后再确认。",
      "用持仓视图检查单一行业或基金经理是否过度集中。",
      "记录自己的买入理由，方便以后复盘是否偏离计划。"
    ]
  }
];

async function fetchText(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "investment-intel-desk/0.1 research dashboard"
      }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

function stripTags(value) {
  return value
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function xmlValue(block, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tagPattern = tag.includes(":") ? escaped : `(?:[\\w-]+:)?${escaped}`;
  const match = block.match(new RegExp(`<${tagPattern}[^>]*>([\\s\\S]*?)<\\/${tagPattern}>`, "i"));
  return match ? stripTags(match[1]) : "";
}

function parseRss(xml, source) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, 5).map((match) => {
    const block = match[0];
    return {
      title: xmlValue(block, "title"),
      category: source.category,
      impact: summarizeImpact(xmlValue(block, "title"), xmlValue(block, "description")),
      url: xmlValue(block, "link")
    };
  }).filter((item) => item.title && item.url);
}

function summarizeImpact(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("rate") || text.includes("fomc") || text.includes("monetary")) {
    return "政策利率和声明措辞会影响股债估值、美元和现金收益率。";
  }
  if (text.includes("crypto") || text.includes("digital asset")) {
    return "数字资产监管变化会影响交易合规、托管风险和主题资产情绪。";
  }
  if (text.includes("fraud") || text.includes("alert")) {
    return "投资者保护信息提示需要先验证平台、人员资质和资金流向。";
  }
  return "纳入每日新闻队列，作为事实输入而非直接交易信号。";
}

function parseFredCsv(csv) {
  const rows = csv.trim().split(/\r?\n/).slice(1).map((line) => line.split(","));
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const [date, rawValue] = rows[i];
    const value = Number(rawValue);
    if (date && Number.isFinite(value)) return { date, value };
  }
  return null;
}

function monthKeys(date = new Date()) {
  const keys = [];
  for (let offset = 0; offset < 2; offset += 1) {
    const probe = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - offset, 1));
    keys.push(`${probe.getUTCFullYear()}${String(probe.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function parseTreasuryXml(xml) {
  const entries = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    const date = xmlValue(entry, "d:NEW_DATE").slice(0, 10);
    const values = treasuryFields.map((item) => {
      const raw = xmlValue(entry, `d:${item.field}`);
      const value = Number(raw);
      if (!Number.isFinite(value)) return null;
      return {
        label: item.label,
        shortLabel: item.shortLabel,
        value,
        unit: item.unit,
        score: Math.min(100, Math.max(0, value * 16)),
        note: `U.S. Treasury latest ${date}.`
      };
    }).filter(Boolean);
    if (values.length) return values;
  }
  return [];
}

async function fetchTreasuryCurve() {
  for (const key of monthKeys()) {
    const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${key}`;
    const xml = await fetchText(url);
    const values = parseTreasuryXml(xml);
    if (values.length) return values;
  }
  throw new Error("No Treasury XML yield values found");
}

async function fetchFred(series) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series.id}`;
  const csv = await fetchText(url);
  const latest = parseFredCsv(csv);
  if (!latest) throw new Error(`No latest FRED value for ${series.id}`);
  return {
    label: series.label,
    shortLabel: series.shortLabel,
    value: latest.value,
    unit: series.unit,
    score: Math.min(100, Math.max(0, latest.value * 16)),
    note: `FRED ${series.id} latest ${latest.date}.`
  };
}

function parseStooqCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const first = lines[0].split(",");
  const hasHeader = first.some((item) => item.toLowerCase() === "symbol");
  const headers = hasHeader ? first : ["Symbol", "Date", "Time", "Open", "High", "Low", "Close", "Volume"];
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map((line) => {
    const values = line.split(",");
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    return row;
  });
}

async function fetchStooq() {
  const symbolList = stooqSymbols.map((item) => item.symbol).join(",");
  const url = `https://stooq.com/q/l/?s=${symbolList}&f=sd2t2ohlcv&e=csv`;
  const csv = await fetchText(url);
  const rows = parseStooqCsv(csv).map((row) => {
    const symbol = row.Symbol?.toLowerCase();
    const meta = stooqSymbols.find((item) => item.symbol === symbol);
    const close = Number(row.Close);
    const open = Number(row.Open);
    const change = Number.isFinite(close) && Number.isFinite(open) && open !== 0
      ? ((close - open) / open) * 100
      : null;
    return {
      label: meta?.label || row.Symbol,
      shortLabel: meta?.shortLabel || row.Symbol,
      value: close,
      unit: "",
      score: change === null ? 50 : Math.min(100, Math.max(0, 50 + change * 8)),
      note: `${row.Date || "latest"} close${change === null ? "" : `, intraday ${change.toFixed(2)}%`}.`
    };
  }).filter((item) => item.label && Number.isFinite(item.value));
  if (!rows.length) throw new Error("No valid Stooq rows");
  return rows;
}

async function fetchCrypto() {
  const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true";
  const data = JSON.parse(await fetchText(url));
  return Object.entries(data).map(([id, quote]) => ({
    label: id === "bitcoin" ? "Bitcoin" : "Ethereum",
    shortLabel: id === "bitcoin" ? "BTC" : "ETH",
    value: quote.usd,
    unit: "",
    score: Math.min(100, Math.max(0, 50 + (quote.usd_24h_change || 0) * 4)),
    note: `CoinGecko 24h ${Number(quote.usd_24h_change || 0).toFixed(2)}%.`
  }));
}

async function fetchEastmoneyQuotes(secids) {
  const fields = "f12,f13,f14,f2,f3,f4,f5,f6,f17,f18";
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=${fields}&secids=${encodeURIComponent(secids.join(","))}`;
  const payload = JSON.parse(await fetchText(url, 12000));
  if (payload.rc !== 0 || !payload.data?.diff?.length) throw new Error("No Eastmoney quote rows");
  return payload.data.diff;
}

async function fetchChinaMarket() {
  const rows = await fetchEastmoneyQuotes(chinaIndexSecids.map((item) => item.secid));
  return rows.map((row) => {
    const meta = chinaIndexSecids.find((item) => item.secid === `${row.f13}.${row.f12}`);
    const changePct = Number(row.f3);
    return {
      label: meta?.label || row.f14,
      shortLabel: meta?.shortLabel || row.f14,
      value: Number(row.f2),
      unit: "",
      changePct: Number.isFinite(changePct) ? changePct : null,
      change: Number(row.f4),
      turnoverCny: Number(row.f6),
      score: Number.isFinite(changePct) ? Math.min(100, Math.max(0, 50 + changePct * 12)) : 50,
      note: `东方财富快照，涨跌幅 ${Number.isFinite(changePct) ? changePct.toFixed(2) : "N/A"}%。`,
      sourceUrl: "https://quote.eastmoney.com/center/gridlist.html#index_sh"
    };
  }).filter((item) => Number.isFinite(item.value));
}

function dayOfYear(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / 86400000);
}

function buildBeginnerLessons(date = new Date()) {
  const start = dayOfYear(date) % beginnerLessonBank.length;
  return [0, 1, 2].map((offset) => beginnerLessonBank[(start + offset) % beginnerLessonBank.length]);
}

function buildForecasts(markets, scenarios, calendar, chinaMarkets = [], chinaForecasts = {}) {
  const tenYear = Number(markets.find((item) => item.shortLabel === "10Y")?.value);
  const cpi = Number(markets.find((item) => item.shortLabel === "CPI")?.value);
  const btcScore = Number(markets.find((item) => item.shortLabel === "BTC")?.score);
  const sh = chinaMarkets.find((item) => item.shortLabel === "上证");
  const hs300 = chinaMarkets.find((item) => item.shortLabel === "沪深300");
  const positiveCount = chinaMarkets.filter((item) => Number(item.changePct) > 0).length;
  const ratesElevated = Number.isFinite(tenYear) && tenYear >= 4.25;
  const inflationElevated = Number.isFinite(cpi) && cpi > 3;
  const cryptoWeak = Number.isFinite(btcScore) && btcScore < 40;
  const nextEvent = calendar[0];
  const mainScenario = scenarios[0];
  const chinaTomorrow = chinaForecasts?.tomorrow;
  const chinaWeek = chinaForecasts?.week;

  return {
    tomorrow: {
      title: "明日预测（大A优先）",
      direction: chinaTomorrow?.direction || (positiveCount >= 4 ? "A股情绪偏暖，但先看成交延续" : "A股偏震荡，先观察不追高"),
      confidence: "中等偏低",
      thesis: chinaTomorrow?.thesis || "明日先看 A 股宽基是否能延续、成交额是否放大，再把美债和汇率当外部扰动变量。",
      watch: [
        ...(chinaTomorrow?.watch || []),
        sh ? `上证指数 ${Number(sh.value).toFixed(2)}，明日看是否能守住关键整数位` : "上证指数方向和成交额",
        hs300 ? `沪深300今日涨跌 ${Number(hs300.changePct).toFixed(2)}%，看核心资产是否同步` : "沪深300是否同步",
        Number.isFinite(tenYear) ? `外部变量：10 年期美债约 ${tenYear.toFixed(2)}%` : "外部变量：美债和美元方向"
      ],
      noviceMove: "新手明日只适合观察或小额分批，不因单日红绿改变长期仓位。"
    },
    week: {
      title: "本周预测（中国市场）",
      direction: chinaWeek?.direction || "政策预期、成交量和人民币资产信心是主线",
      confidence: "中等",
      thesis: chinaWeek?.thesis || "本周仍以 A 股成交量、风格轮动、政策新闻和外部利率变化为主线。",
      watch: [
        ...(chinaWeek?.watch || []),
        "沪深300、中证500、创业板和红利方向谁在领涨",
        "雪球/同花顺热度能否被公告、季报或指数规则验证",
        nextEvent ? `外部宏观：${nextEvent.date} ${nextEvent.event}` : "外部宏观数据是否扰动风险偏好"
      ],
      noviceMove: "本周适合复核现金桶、A 股宽基核心和主题卫星仓比例；不要为了追热点临时重仓行业基金。"
    },
    bigPicture: {
      title: "基金选择建议（非个性化）",
      direction: "先现金/货币基金，再 A 股宽基，主题和海外 QDII 只做小比例观察",
      thesis: ratesElevated || inflationElevated
        ? "外部利率和通胀仍会压制高估值资产，所以国内投资者更应该先保证现金流和仓位纪律。"
        : mainScenario?.path || "对小白来说，最重要的不是猜中明天涨跌，而是先搭好不会被波动打乱生活的组合结构。",
      watch: [
        "现金桶：货币基金、短债或现金管理工具先覆盖 3-12 个月必要支出",
        "核心仓：沪深300、中证A500、中证500、红利等宽基/风格基金分批观察",
        cryptoWeak ? "高波动资产偏弱，主题基金和加密相关资产不宜做核心仓" : "卫星仓：科技、医药、港股、纳指 QDII 等先设仓位上限"
      ],
      noviceMove: "没有投资计划书之前，先不做大额一次性买入；任何基金例子都要先看风险等级、费率、回撤和持有期限。"
    }
  };
}

function buildFundWatchlist(markets) {
  const tenYear = Number(markets.find((item) => item.shortLabel === "10Y")?.value);
  const rateNote = Number.isFinite(tenYear)
    ? `当前 10 年期美债约 ${tenYear.toFixed(2)}%，债券和成长资产都要看利率变化。`
    : "利率数据待更新，先按长期资产配置原则观察。";

  return fundWatchlistTemplates.map((item) => ({
    ...item,
    currentRead: item.bucket.includes("债券") || item.bucket.includes("现金")
      ? rateNote
      : item.bucket.includes("A股")
        ? "这不是买入指令，只是把 A 股基金放进同一套风险框架里观察。"
      : "这不是买入指令，只是帮助新手理解不同基金在组合里的角色。"
  }));
}

function buildChinaForecasts(chinaMarkets, globalMarkets, calendar) {
  const sh = chinaMarkets.find((item) => item.shortLabel === "上证");
  const cyb = chinaMarkets.find((item) => item.shortLabel === "创业板");
  const hs300 = chinaMarkets.find((item) => item.shortLabel === "沪深300");
  const tenYear = Number(globalMarkets.find((item) => item.shortLabel === "10Y")?.value);
  const strongGrowth = Number(cyb?.changePct) > Number(sh?.changePct || 0) + 0.8;
  const broadPositive = chinaMarkets.filter((item) => Number(item.changePct) > 0).length >= 4;
  const nextEvent = calendar.find((item) => /CPI|PCE|Employment|FOMC|PMI/i.test(item.event)) || calendar[0];

  return {
    tomorrow: {
      title: "大A明日观察",
      direction: broadPositive ? "情绪偏暖，但先看量能和北向/成交持续性" : "偏震荡，别用一天涨跌判断趋势",
      confidence: "中等偏低",
      thesis: strongGrowth
        ? "创业板和科创相关指数弹性更强，说明资金在试探成长方向，但高波动资产容易隔日分化。"
        : "如果大盘指数上涨但成交和行业扩散不足，短线更像情绪修复，不等于趋势确认。",
      watch: [
        sh ? `上证指数是否站稳 ${Math.round(sh.value)} 附近` : "上证指数关键位置",
        hs300 ? `沪深300涨跌幅 ${Number(hs300.changePct).toFixed(2)}%，观察核心资产是否跟上` : "沪深300是否同步",
        nextEvent ? `外部变量：${nextEvent.date} ${nextEvent.event}` : "外部利率和汇率变化"
      ],
      noviceMove: "新手明日不要追单日强势行业，先确认自己是做长期配置还是短线交易。"
    },
    week: {
      title: "大A本周观察",
      direction: "政策预期、成交量、人民币资产信心是主线",
      confidence: "中等",
      thesis: Number.isFinite(tenYear) && tenYear >= 4.25
        ? "海外长端利率仍偏高，A 股成长和外资风险偏好会受到扰动；更适合用宽基和分批观察。"
        : "如果外部利率压力缓和，A 股宽基和成长方向更容易获得风险偏好修复。",
      watch: [
        "成交额是否放大并能维持，不只看指数红绿",
        "红利/价值和成长/科技谁在领涨，判断市场风格",
        "政策新闻要回到官方公告，避免被社交平台情绪带节奏"
      ],
      noviceMove: "本周适合建立 A 股观察清单：沪深300、中证500、创业板、红利，不急着全买。"
    }
  };
}

function jsVar(text, name) {
  const match = text.match(new RegExp(`var\\s+${name}\\s*=\\s*([\\s\\S]*?);(?=\\/\\*|var\\s|$)`));
  if (!match) return null;
  return match[1].trim();
}

function jsStringVar(text, name) {
  const raw = jsVar(text, name);
  if (!raw) return "";
  try {
    return JSON.parse(raw);
  } catch {
    return raw.replace(/^"|"$/g, "");
  }
}

function jsJsonVar(text, name) {
  const raw = jsVar(text, name);
  if (!raw) return null;
  return JSON.parse(raw);
}

async function fetchChinaFundProfile(profile) {
  const url = `https://fund.eastmoney.com/pingzhongdata/${profile.code}.js`;
  const text = await fetchText(url, 15000);
  const fundName = jsStringVar(text, "fS_name") || profile.code;
  const managers = jsJsonVar(text, "Data_currentFundManager") || [];
  const stockCodesNew = jsJsonVar(text, "stockCodesNew") || [];
  const stockPosition = jsJsonVar(text, "Data_fundSharesPositions") || [];
  const latestStockPosition = stockPosition.length ? Number(stockPosition[stockPosition.length - 1][1]) : null;
  const quoteRows = stockCodesNew.length ? await fetchEastmoneyQuotes(stockCodesNew.slice(0, 10)) : [];
  const holdings = quoteRows.slice(0, 6).map((row) => ({
    code: row.f12,
    name: row.f14,
    changePct: Number(row.f3),
    price: Number(row.f2)
  }));

  return {
    code: profile.code,
    name: fundName,
    style: profile.style,
    managerNames: managers.map((item) => item.name).filter(Boolean).slice(0, 3),
    managerSummary: managers[0]?.workTime ? `${managers[0].name} · ${managers[0].workTime}` : "",
    fundSize: managers[0]?.fundSize || "",
    returns: {
      oneMonth: jsStringVar(text, "syl_1y"),
      threeMonth: jsStringVar(text, "syl_3y"),
      sixMonth: jsStringVar(text, "syl_6y"),
      oneYear: jsStringVar(text, "syl_1n")
    },
    stockPosition: Number.isFinite(latestStockPosition) ? latestStockPosition : null,
    holdings,
    lesson: profile.lesson,
    sourceUrl: `https://fund.eastmoney.com/${profile.code}.html`
  };
}

async function fetchChinaFunds(existingFunds = []) {
  const funds = [];
  for (const profile of chinaFundProfiles) {
    try {
      funds.push(await fetchChinaFundProfile(profile));
      await wait(160);
    } catch {
      const fallback = existingFunds.find((item) => item.code === profile.code);
      if (fallback) funds.push(fallback);
    }
  }
  return {
    label: "中国基金公开季报观察",
    note: "基金持仓来自公开页面和定期披露，存在滞后；只能用来学习基金经理风格，不能照抄买入。",
    funds
  };
}

function parseInfoTable(xml) {
  const holdings = [...xml.matchAll(/<(?:[\w-]+:)?infoTable\b[\s\S]*?<\/(?:[\w-]+:)?infoTable>/gi)].map((match) => {
    const block = match[0];
    const issuer = xmlValue(block, "nameOfIssuer");
    const value = Number(xmlValue(block, "value"));
    const shares = Number(xmlValue(block, "sshPrnamt"));
    const impliedPrice = Number.isFinite(value) && Number.isFinite(shares) && shares > 0 ? value / shares : null;
    const valueUsd = impliedPrice !== null && impliedPrice > 0 && impliedPrice < 1 ? value * 1000 : value;
    return {
      issuer,
      value: Number.isFinite(valueUsd) ? valueUsd : 0,
      shares: Number.isFinite(shares) ? shares : 0
    };
  }).filter((item) => item.issuer && item.value > 0);

  const grouped = new Map();
  holdings.forEach((item) => {
    const key = item.issuer.replace(/\s+/g, " ").trim().toUpperCase();
    const current = grouped.get(key) || { issuer: item.issuer, value: 0, shares: 0 };
    current.value += item.value;
    current.shares += item.shares;
    grouped.set(key, current);
  });

  return [...grouped.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item) => ({
      issuer: item.issuer,
      valueMillions: Math.round(item.value / 10000) / 100,
      shares: item.shares
    }));
}

async function fetchLatest13F(manager) {
  const submissionsUrl = `https://data.sec.gov/submissions/CIK${manager.cik}.json`;
  const submissions = JSON.parse(await fetchText(submissionsUrl, 15000));
  const filings = submissions.filings?.recent || {};
  const index = ensureIndex(filings.form || [], (form) => String(form).includes("13F-HR"));
  if (index === -1) throw new Error("No recent 13F-HR filing");

  const accession = filings.accessionNumber[index];
  const accessionNoDash = accession.replace(/-/g, "");
  const cikNoZero = String(Number(manager.cik));
  const archiveBase = `https://www.sec.gov/Archives/edgar/data/${cikNoZero}/${accessionNoDash}`;
  const filingIndex = JSON.parse(await fetchText(`${archiveBase}/index.json`, 15000));
  const items = filingIndex.directory?.item || [];
  const xmlCandidates = [
    ...items.filter((item) => item.name?.endsWith(".xml") && !item.name.includes("primary_doc")),
    ...items.filter((item) => item.name?.endsWith(".xml") && item.name.includes("primary_doc"))
  ];

  let topHoldings = [];
  for (const item of xmlCandidates) {
    const xml = await fetchText(`${archiveBase}/${item.name}`, 15000);
    if (!/infoTable/i.test(xml)) continue;
    topHoldings = parseInfoTable(xml);
    if (topHoldings.length) break;
  }

  if (!topHoldings.length) throw new Error("No information table parsed");
  return {
    name: manager.name,
    lesson: manager.lesson,
    filingDate: filings.filingDate[index],
    reportDate: filings.reportDate[index],
    sourceUrl: `https://www.sec.gov/Archives/edgar/data/${cikNoZero}/${accessionNoDash}`,
    topHoldings
  };
}

function ensureIndex(list, predicate) {
  for (let index = 0; index < list.length; index += 1) {
    if (predicate(list[index], index)) return index;
  }
  return -1;
}

async function fetchGuruPortfolios(existingManagers = []) {
  const managers = [];
  for (const manager of guruManagers) {
    try {
      managers.push(await fetchLatest13F(manager));
      await wait(180);
    } catch (error) {
      const fallback = existingManagers.find((item) => item.name === manager.name);
      if (fallback) managers.push(fallback);
    }
  }
  return {
    label: "SEC 13F 公开持仓观察",
    note: "以下不是实时实盘，通常有季度报告期和披露滞后；只能用于学习大资金方向，不能照抄买入。",
    managers
  };
}

function buildScenarios(markets, news) {
  const tenYear = markets.find((item) => item.shortLabel === "10Y")?.value;
  const crypto = markets.find((item) => item.shortLabel === "BTC")?.score;
  const policyNews = news.some((item) => item.category === "Policy");
  const ratesElevated = Number(tenYear) >= 4.25 || policyNews;
  const riskTone = ratesElevated ? "elevated" : "normal";
  const cryptoStress = Number(crypto) >= 70 ? "风险偏好较强" : "高波动资产仍需仓位上限";

  return [
    {
      name: ratesElevated ? "基准情景：利率敏感资产继续受估值约束" : "基准情景：增长和通胀等待确认",
      probability: ratesElevated ? "45%" : "40%",
      tone: riskTone,
      path: ratesElevated
        ? "收益率维持高位时，长久期债券和高估值成长股更依赖通胀回落确认。"
        : "若收益率回落且就业稳定，风险资产有修复空间，但仍需等待通胀数据确认。"
    },
    {
      name: "上行情景：盈利和流动性预期改善",
      probability: "30%",
      tone: "normal",
      path: `宽基资产受益于盈利韧性和资金风险偏好，${cryptoStress}。`
    },
    {
      name: "下行情景：通胀或信用压力再定价",
      probability: ratesElevated ? "25%" : "30%",
      tone: "stress",
      path: "能源、信用利差或就业意外走弱会放大波动，现金缓冲和再平衡纪律优先。"
    }
  ];
}

function mergeNews(freshNews, existingNews) {
  const seen = new Set();
  return [...freshNews, ...existingNews].filter((item) => {
    const key = item.url || item.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function buildBrief(markets, scenarios, chinaMarkets = [], chinaForecasts = {}) {
  const sh = chinaMarkets.find((item) => item.shortLabel === "上证");
  const hs300 = chinaMarkets.find((item) => item.shortLabel === "沪深300");
  const tenYear = markets.find((item) => item.shortLabel === "10Y")?.value;
  const chinaHeadline = sh
    ? `A 股快照：上证 ${Number(sh.value).toFixed(2)}（${Number(sh.changePct) >= 0 ? "+" : ""}${Number(sh.changePct).toFixed(2)}%）`
    : "A 股快照等待更新";
  const coreHeadline = hs300
    ? `，沪深300 ${Number(hs300.changePct) >= 0 ? "+" : ""}${Number(hs300.changePct).toFixed(2)}%`
    : "";
  const external = Number(tenYear)
    ? `海外外部变量：10 年期美债约 ${Number(tenYear).toFixed(2)}%。`
    : "海外利率数据等待更新。";
  const chinaDirection = chinaForecasts?.tomorrow?.direction || "先看成交、政策预期和宽基扩散度。";
  return {
    title: "每日公开数据已更新，先看大A、人民币基金和国内平台",
    summary: `${chinaHeadline}${coreHeadline}；${chinaDirection} ${external} 本页面只输出公开信息整理、学习框架和非个性化行动清单。`,
    confidence: "中等",
    tags: ["大A优先", "国内平台", "公开季报", "非个性化"]
  };
}

async function collectUpdates(existing) {
  const diagnostics = [];
  const settledFeeds = await Promise.allSettled(feedSources.map(async (source) => parseRss(await fetchText(source.url), source)));
  settledFeeds.forEach((result, index) => {
    diagnostics.push({
      source: feedSources[index].name,
      status: result.status === "fulfilled" ? "ok" : `failed (${result.reason?.message || "unknown"})`
    });
  });
  const news = settledFeeds
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value.slice(0, 2))
    .slice(0, 8);

  const markets = [];
  try {
    const treasury = await fetchTreasuryCurve();
    diagnostics.push({ source: "U.S. Treasury XML", status: "ok" });
    markets.push(...treasury);
  } catch (error) {
    diagnostics.push({ source: "U.S. Treasury XML", status: `failed (${error.message || "unknown"})` });
    const fredResults = await Promise.allSettled(fredSeries.map(fetchFred));
    fredResults.forEach((result, index) => {
      diagnostics.push({
        source: `FRED ${fredSeries[index].id}`,
        status: result.status === "fulfilled" ? "ok" : `failed (${result.reason?.message || "unknown"})`
      });
    });
    markets.push(...fredResults.flatMap((result) => {
      if (result.status !== "fulfilled") return [];
      return Array.isArray(result.value) ? result.value : [result.value];
    }));
  }

  const sideMarketJobs = [
    { name: "Stooq ETF CSV", run: fetchStooq },
    { name: "CoinGecko crypto", run: fetchCrypto }
  ];
  const sideMarketResults = await Promise.allSettled(sideMarketJobs.map((job) => job.run()));
  sideMarketResults.forEach((result, index) => {
    diagnostics.push({
      source: sideMarketJobs[index].name,
      status: result.status === "fulfilled" ? "ok" : `failed (${result.reason?.message || "unknown"})`
    });
  });
  markets.push(...sideMarketResults.flatMap((result) => {
    if (result.status !== "fulfilled") return [];
    return Array.isArray(result.value) ? result.value : [result.value];
  }));

  const freshShortLabels = new Set(markets.map((item) => item.shortLabel));
  const stalePlaceholders = new Set(["UST"]);
  if (markets.some((item) => item.shortLabel === "BTC")) freshShortLabels.add("BTC");
  const preservedMarkets = existing.markets.filter((item) => {
    if (freshShortLabels.has(item.shortLabel)) return false;
    if (stalePlaceholders.has(item.shortLabel)) return false;
    if (item.shortLabel === "BTC" && item.label === "Crypto Risk") return false;
    if (item.value === null || item.value === undefined || !Number.isFinite(Number(item.value))) return false;
    return true;
  });
  const mergedMarkets = markets.length ? [...markets, ...preservedMarkets] : existing.markets;
  const mergedNews = news.length ? mergeNews(news, existing.news) : existing.news;
  const scenarios = buildScenarios(mergedMarkets, mergedNews);
  const beginnerLessons = buildBeginnerLessons();
  const fundWatchlist = buildFundWatchlist(mergedMarkets);

  let chinaMarkets = existing.chinaMarkets || [];
  try {
    chinaMarkets = await fetchChinaMarket();
    diagnostics.push({ source: "Eastmoney A-share indices", status: "ok" });
  } catch (error) {
    diagnostics.push({ source: "Eastmoney A-share indices", status: `failed (${error.message || "unknown"})` });
  }

  const chinaForecasts = buildChinaForecasts(chinaMarkets, mergedMarkets, existing.calendar || []);
  const forecasts = buildForecasts(mergedMarkets, scenarios, existing.calendar || [], chinaMarkets, chinaForecasts);
  const chinaFunds = await fetchChinaFunds(existing.chinaFunds?.funds || []);
  diagnostics.push({
    source: "Eastmoney China fund public holdings",
    status: chinaFunds.funds.length ? "ok" : "failed (No China fund rows)"
  });

  const guruPortfolios = await fetchGuruPortfolios(existing.guruPortfolios?.managers || []);
  diagnostics.push({
    source: "SEC 13F public holdings",
    status: guruPortfolios.managers.length ? "ok" : "failed (No public holdings parsed)"
  });

  return {
    ...existing,
    asOf: {
      display: new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date()),
      iso: new Date().toISOString()
    },
    brief: buildBrief(mergedMarkets, scenarios, chinaMarkets, chinaForecasts),
    markets: mergedMarkets,
    news: mergedNews,
    scenarios,
    beginnerLessons,
    forecasts,
    fundWatchlist,
    chinaMarkets,
    chinaForecasts,
    chinaFunds,
    domesticPlatforms,
    chinaLivePortfolios,
    guruPortfolios,
    playbooks: domesticPlaybooks,
    updateDiagnostics: diagnostics
  };
}

async function main() {
  const existing = JSON.parse(await readFile(dailyPath, "utf8"));
  const updated = await collectUpdates(existing);
  await mkdir(dirname(dailyPath), { recursive: true });
  await writeFile(dailyPath, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(`Updated ${dailyPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
