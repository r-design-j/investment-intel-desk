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
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
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
