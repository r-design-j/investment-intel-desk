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
    example: "常见代表包括跟踪美国大盘的 VOO/SPY、全市场的 VTI、全球股票的 VT。",
    todayCheck: "先比较费用率、跟踪指数、持仓分散度，不要只看最近涨幅。"
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
    plain: "大佬持仓通常披露滞后，而且他们的资金量、风险承受力、税务和期限都与你不同。",
    example: "13F 持仓常常晚几十天才公开，看到时对方可能已经调整。",
    todayCheck: "看大佬持仓只问：这个方向说明了什么？能不能用宽基或低风险方式表达？"
  }
];

const fundWatchlistTemplates = [
  {
    bucket: "现金/短债桶",
    examples: ["SGOV", "BIL", "SHV"],
    role: "放短期要用的钱和等待机会的现金，不追求高收益。",
    suitableFor: "3-12 个月内可能要用的钱、应急金、暂时不想承受股票波动的资金。",
    buyGuidance: "新手先把现金桶补足，再考虑风险资产；关注收益率会随利率下降而回落。",
    risk: "不是银行存款；仍有利率、流动性和再投资风险。"
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

function dayOfYear(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / 86400000);
}

function buildBeginnerLessons(date = new Date()) {
  const start = dayOfYear(date) % beginnerLessonBank.length;
  return [0, 1, 2].map((offset) => beginnerLessonBank[(start + offset) % beginnerLessonBank.length]);
}

function buildForecasts(markets, scenarios, calendar) {
  const tenYear = Number(markets.find((item) => item.shortLabel === "10Y")?.value);
  const cpi = Number(markets.find((item) => item.shortLabel === "CPI")?.value);
  const btcScore = Number(markets.find((item) => item.shortLabel === "BTC")?.score);
  const ratesElevated = Number.isFinite(tenYear) && tenYear >= 4.25;
  const inflationElevated = Number.isFinite(cpi) && cpi > 3;
  const cryptoWeak = Number.isFinite(btcScore) && btcScore < 40;
  const nextEvent = calendar[0];
  const mainScenario = scenarios[0];

  return {
    tomorrow: {
      title: "明日预测",
      direction: ratesElevated || inflationElevated ? "偏防守，先等关键数据确认" : "中性观察，风险资产有修复空间",
      confidence: "中等偏低",
      thesis: ratesElevated
        ? "长端利率仍偏高，市场更容易对通胀、就业和 Fed 口径敏感。明日不适合只看涨跌，重点看收益率是否继续上行。"
        : "利率压力若缓和，宽基资产可能获得情绪修复，但仍需要通胀和就业数据配合。",
      watch: [
        nextEvent ? `${nextEvent.date}：${nextEvent.event}` : "等待下一项宏观数据",
        Number.isFinite(tenYear) ? `10 年期美债是否继续高于 ${tenYear.toFixed(2)}% 附近` : "10 年期美债方向",
        cryptoWeak ? "BTC/ETH 偏弱，说明高波动风险偏好不足" : "高波动资产是否能企稳"
      ],
      noviceMove: "新手明日重点做观察和记录，不因为一天行情改变长期仓位。"
    },
    week: {
      title: "本周预测",
      direction: mainScenario?.name || "以利率、通胀和就业为主线",
      confidence: "中等",
      thesis: mainScenario?.path || "本周仍以宏观数据、政策预期和风险偏好变化为主线。",
      watch: [
        "就业、CPI、PCE 和 Fed 口径是否支持降息预期",
        "股票宽基与长债是否同向承压，判断市场是在交易利率还是盈利",
        "新闻热点是否能回到官方数据和披露文件验证"
      ],
      noviceMove: "本周适合复核自己的现金桶、核心宽基和债券比例；不要为了追热点临时重仓主题基金。"
    },
    bigPicture: {
      title: "大方向",
      direction: "现金流安全垫优先，核心仓看宽基，卫星仓小比例学习",
      thesis: "对小白来说，最重要的不是猜中明天涨跌，而是先搭好不会被波动打乱生活的组合结构。",
      watch: [
        "3-12 个月现金桶是否已经独立出来",
        "核心仓是否足够分散、费用是否低",
        "任何单一基金或主题是否超过自己能承受的仓位上限"
      ],
      noviceMove: "没有投资计划书之前，先不做大额一次性买入。"
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
      : "这不是买入指令，只是帮助新手理解不同基金在组合里的角色。"
  }));
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

function buildBrief(markets, scenarios) {
  const tenYear = markets.find((item) => item.shortLabel === "10Y")?.value;
  const headline = Number(tenYear)
    ? `10 年期美债最新约 ${Number(tenYear).toFixed(2)}%，`
    : "利率数据等待更新，";
  return {
    title: "每日公开数据已更新，先看利率、通胀和监管新闻",
    summary: `${headline}${scenarios[0].path} 本页面只输出研究框架和非个性化行动清单。`,
    confidence: "中等",
    tags: ["自动快照", "公开来源", "规则情景", "需人工复核"]
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
  const forecasts = buildForecasts(mergedMarkets, scenarios, existing.calendar || []);
  const fundWatchlist = buildFundWatchlist(mergedMarkets);
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
    brief: buildBrief(mergedMarkets, scenarios),
    markets: mergedMarkets,
    news: mergedNews,
    scenarios,
    beginnerLessons,
    forecasts,
    fundWatchlist,
    guruPortfolios,
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
