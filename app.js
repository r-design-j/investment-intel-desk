const state = {
  data: null,
  newsFilter: "All",
  navTimer: null,
  resizeTimer: null,
  hashSyncTimers: []
};

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const formatNumber = (value, suffix = "") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "N/A";
  const number = Number(value);
  const formatted = Math.abs(number) >= 1000
    ? number.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : number.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${formatted}${suffix}`;
};

const formatCny = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "N/A";
  if (Math.abs(number) >= 1000000000000) return `${(number / 1000000000000).toFixed(2)}万亿`;
  if (Math.abs(number) >= 100000000) return `${(number / 100000000).toFixed(0)}亿`;
  return `${number.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}元`;
};

const toneClass = (tone) => {
  if (tone === "elevated") return "badge--warning";
  if (tone === "stress") return "badge--danger";
  return "badge--neutral";
};

const el = (selector) => document.querySelector(selector);
const ensureArray = (value) => Array.isArray(value) ? value : [];
const cssColor = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const navLinks = [...document.querySelectorAll(".nav-link")];
const navTargets = navLinks.map((link) => ({
  hash: link.getAttribute("href"),
  link,
  target: document.querySelector(link.getAttribute("href"))
})).filter((item) => item.hash && item.target);

function createFallbackData(message = "daily.json 暂不可用") {
  return {
    asOf: { display: "等待更新" },
    brief: {
      title: "每日快照暂不可用",
      summary: "当前无法读取每日数据快照。页面已进入降级模式，请稍后刷新或检查 data/daily.json。",
      confidence: "待确认",
      tags: ["降级模式", "需复核", "非个性化研究"]
    },
    risk: {
      level: "elevated",
      levelLabel: "数据源待恢复",
      guardrails: ["在数据源恢复前，不根据本页作出任何投资动作。", "所有新闻和市场数据以官方来源重新核验。"]
    },
    actions: ["先确认数据源状态，再阅读市场判断。", "保留现金流和仓位纪律，不因缺失数据做临时决策。"],
    markets: [],
    scenarios: [],
    news: [],
    calendar: [],
    knowledge: [],
    beginnerLessons: [],
    forecasts: {},
    fundWatchlist: [],
    chinaMarkets: [],
    chinaForecasts: {},
    chinaFunds: { funds: [] },
    guruPortfolios: { managers: [] },
    playbooks: [],
    publishingLoop: [],
    sources: [],
    updateDiagnostics: [{ source: "Daily data", status: `failed (${message})` }]
  };
}

function normalizeDailyData(data) {
  const fallback = createFallbackData();
  return {
    ...fallback,
    ...data,
    asOf: { ...fallback.asOf, ...(data?.asOf || {}) },
    brief: { ...fallback.brief, ...(data?.brief || {}) },
    risk: { ...fallback.risk, ...(data?.risk || {}) },
    actions: ensureArray(data?.actions),
    markets: ensureArray(data?.markets),
    scenarios: ensureArray(data?.scenarios),
    news: ensureArray(data?.news),
    calendar: ensureArray(data?.calendar),
    knowledge: ensureArray(data?.knowledge),
    beginnerLessons: ensureArray(data?.beginnerLessons),
    forecasts: data?.forecasts || fallback.forecasts,
    fundWatchlist: ensureArray(data?.fundWatchlist),
    chinaMarkets: ensureArray(data?.chinaMarkets),
    chinaForecasts: data?.chinaForecasts || fallback.chinaForecasts,
    chinaFunds: {
      ...fallback.chinaFunds,
      ...(data?.chinaFunds || {}),
      funds: ensureArray(data?.chinaFunds?.funds)
    },
    guruPortfolios: {
      ...fallback.guruPortfolios,
      ...(data?.guruPortfolios || {}),
      managers: ensureArray(data?.guruPortfolios?.managers)
    },
    playbooks: ensureArray(data?.playbooks),
    publishingLoop: ensureArray(data?.publishingLoop),
    sources: ensureArray(data?.sources),
    updateDiagnostics: ensureArray(data?.updateDiagnostics)
  };
}

function showLoadError(message) {
  const existing = el(".load-alert");
  if (existing) {
    existing.textContent = `数据加载失败：${message}`;
    return;
  }
  document.body.insertAdjacentHTML("afterbegin", `<div class="load-alert" role="alert">数据加载失败：${escapeHtml(message)}</div>`);
}

async function loadDaily() {
  const button = el("#refreshButton");
  button?.classList.add("is-loading");
  if (button) button.disabled = true;
  try {
    const response = await fetch(`data/daily.json?ts=${Date.now()}`);
    if (!response.ok) throw new Error(`daily.json load failed: ${response.status}`);
    state.data = normalizeDailyData(await response.json());
    render();
  } catch (error) {
    state.data = createFallbackData(error.message);
    showLoadError(error.message);
    render();
  } finally {
    button?.classList.remove("is-loading");
    if (button) button.disabled = false;
  }
}

function render() {
  const data = state.data;
  el("#asOf").textContent = `As of ${data.asOf.display}`;
  el("#riskBadge").textContent = data.risk.levelLabel;
  el("#riskBadge").className = `signal-badge ${toneClass(data.risk.level)}`;
  el("#confidenceBadge").textContent = `置信度 ${data.brief.confidence}`;
  renderStripStatus(data);
  el("#briefTitle").textContent = buildPreviewTitle(data);
  el("#briefText").textContent = data.brief.summary;
  renderTags("#briefTags", data.brief.tags);
  renderHeroSignals(data.markets);
  renderHeroStatus(data.updateDiagnostics);
  renderHeroNextEvent(data.calendar);
  renderList("#actionList", data.actions);
  renderList("#guardrails", data.risk.guardrails);
  renderMarkets(data.markets);
  renderScenarios(data.scenarios);
  renderForecasts(data.forecasts);
  renderChinaMarkets(data.chinaMarkets);
  renderChinaForecasts(data.chinaForecasts);
  renderChinaFunds(data.chinaFunds);
  renderFundWatchlist(data.fundWatchlist);
  renderNewsFilters(data.news);
  renderNews(data.news);
  renderCalendar(data.calendar);
  renderBeginnerLessons(data.beginnerLessons);
  renderKnowledge(data.knowledge);
  renderGuruPortfolios(data.guruPortfolios);
  renderPlaybooks(data.playbooks);
  renderPublishingLoop(data.publishingLoop);
  renderSources(data.sources);
  renderDiagnostics(data.updateDiagnostics || []);
  drawPulseChart(data.markets);
  scheduleHashSync();
  updateActiveNav();
}

function renderTags(selector, tags) {
  el(selector).innerHTML = tags.length
    ? tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")
    : `<span class="tag">等待更新</span>`;
}

function renderList(selector, items) {
  el(selector).innerHTML = items.length
    ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : `<li>等待下一次数据快照。</li>`;
}

function renderStripStatus(data) {
  const diagnostics = ensureArray(data.updateDiagnostics);
  const okCount = diagnostics.filter((item) => item.status === "ok").length;
  const total = diagnostics.length || data.sources.length || 0;
  const next = ensureArray(data.calendar)[0];
  el("#sourcesOnline").textContent = total ? `${okCount}/${total} 在线` : "待核验";
  el("#nextEvent").textContent = next ? next.event : "等待日历";
}

function buildPreviewTitle(data) {
  if (!data.markets.length && !data.news.length) return data.brief.title || "每日情报摘要";
  const hasInflation = data.markets.some((item) => ["CPI", "PCE", "Core"].includes(item.shortLabel));
  const hasPolicy = data.news.some((item) => item.category === "Policy" || item.category === "Regulation");
  if (hasInflation && hasPolicy) return "利率、通胀和监管新闻";
  if (hasInflation) return "利率与通胀信号";
  return "今日情报摘要";
}

function renderHeroSignals(markets) {
  const preferred = ["10Y", "CPI", "PCE", "Fed"];
  const preferredItems = preferred
    .map((shortLabel) => markets.find((item) => item.shortLabel === shortLabel))
    .filter(Boolean)
    .slice(0, 3);
  const items = preferredItems.length ? preferredItems : markets.slice(0, 3);
  el("#heroSignalStack").innerHTML = items.length ? items.map((item) => {
    const score = Math.max(4, Math.min(100, Number(item.score ?? item.value) || 0));
    return `
    <article class="hero-signal" style="--signal: ${score}%">
      <div class="hero-signal__top">
        <p>${escapeHtml(item.shortLabel || item.label)}</p>
        <strong>${formatNumber(item.value, item.unit || "")}</strong>
      </div>
      <div class="hero-signal__track" aria-hidden="true"><i></i></div>
      <span>${escapeHtml(item.note)}</span>
    </article>
  `;
  }).join("") : `<div class="empty-state">等待市场数据</div>`;
}

function renderHeroStatus(items) {
  const diagnostics = ensureArray(items).slice(0, 3);
  const shortName = (source) => {
    if (source.includes("Federal Reserve")) return "Fed Policy";
    if (source.includes("Investor Alerts")) return "SEC Alerts";
    if (source.includes("Press Releases")) return "SEC Releases";
    if (source.includes("Treasury")) return "Treasury Rates";
    if (source.includes("Stooq")) return "ETF Quotes";
    if (source.includes("CoinGecko")) return "Crypto Quotes";
    return source;
  };
  el("#heroSourceStatus").innerHTML = diagnostics.length ? diagnostics.map((item) => {
    const ok = item.status === "ok";
    return `
      <article class="source-status ${ok ? "" : "is-warning"}">
        <i aria-hidden="true"></i>
        <strong>${escapeHtml(shortName(item.source))}</strong>
        <span>${ok ? "正常" : "降级"}</span>
      </article>
    `;
  }).join("") : `<div class="empty-state">等待来源诊断</div>`;
}

function renderHeroNextEvent(calendar) {
  const next = ensureArray(calendar)[0];
  el("#heroNextEvent").textContent = next ? `${next.date} · ${next.event}` : "等待日历";
}

function renderMarkets(markets) {
  el("#marketTiles").innerHTML = markets.length ? markets.map((item) => `
    <article class="metric">
      <p class="metric__label">${escapeHtml(item.label)}</p>
      <p class="metric__value">${formatNumber(item.value, item.unit || "")}</p>
      <p class="metric__delta">${escapeHtml(item.note)}</p>
    </article>
  `).join("") : `<div class="empty-state">等待市场数据</div>`;
}

function renderScenarios(scenarios) {
  el("#scenarioList").innerHTML = scenarios.length ? scenarios.map((item) => `
    <article class="scenario">
      <div class="scenario__top">
        <h3>${escapeHtml(item.name)}</h3>
        <span class="badge ${toneClass(item.tone)}">${escapeHtml(item.probability)}</span>
      </div>
      <p>${escapeHtml(item.path)}</p>
    </article>
  `).join("") : `<div class="empty-state">等待情景模型</div>`;
}

function renderForecasts(forecasts) {
  const items = [forecasts?.tomorrow, forecasts?.week, forecasts?.bigPicture].filter(Boolean);
  const label = (item) => item.title || "预测";
  el("#forecastGrid").innerHTML = items.length ? items.map((item) => `
    <article class="forecast-card">
      <div class="project-meta">
        <span>${escapeHtml(label(item))}</span>
        <span>${escapeHtml(item.confidence || "非个性化")}</span>
      </div>
      <h3>${escapeHtml(item.direction)}</h3>
      <p>${escapeHtml(item.thesis)}</p>
      <ul>${ensureArray(item.watch).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
      <div class="novice-note">${escapeHtml(item.noviceMove || "先观察，再决策。")}</div>
    </article>
  `).join("") : `<div class="empty-state">等待预测模型</div>`;
}

function renderChinaMarkets(markets) {
  el("#chinaMarketGrid").innerHTML = markets.length ? markets.map((item) => {
    const change = Number(item.changePct);
    const up = Number.isFinite(change) && change >= 0;
    return `
      <article class="china-market-card ${up ? "is-up" : "is-down"}">
        <div class="china-market-card__top">
          <h3>${escapeHtml(item.label)}</h3>
          <span>${escapeHtml(item.shortLabel)}</span>
        </div>
        <strong>${formatNumber(item.value)}</strong>
        <p>${Number.isFinite(change) ? `${up ? "+" : ""}${change.toFixed(2)}%` : "N/A"} · 成交 ${formatCny(item.turnoverCny)}</p>
      </article>
    `;
  }).join("") : `<div class="empty-state">等待 A 股指数数据</div>`;
}

function renderChinaForecasts(forecasts) {
  const items = [forecasts?.tomorrow, forecasts?.week].filter(Boolean);
  el("#chinaForecastList").innerHTML = items.length ? items.map((item) => `
    <article class="china-forecast-card">
      <div class="project-meta">
        <span>${escapeHtml(item.title || "大A观察")}</span>
        <span>${escapeHtml(item.confidence || "非个性化")}</span>
      </div>
      <h3>${escapeHtml(item.direction)}</h3>
      <p>${escapeHtml(item.thesis)}</p>
      <ul>${ensureArray(item.watch).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
      <div class="novice-note">${escapeHtml(item.noviceMove || "先观察，再决策。")}</div>
    </article>
  `).join("") : `<div class="empty-state">等待大 A 预测</div>`;
}

function renderChinaFunds(chinaFunds) {
  const funds = ensureArray(chinaFunds?.funds);
  el("#chinaFundNote").textContent = chinaFunds?.note || "中国基金公开季报只用于学习，不能照抄买入。";
  el("#chinaFundGrid").innerHTML = funds.length ? funds.map((fund) => `
    <article class="china-fund-card">
      <div class="china-fund-card__head">
        <div>
          <span class="lesson-index">${escapeHtml(fund.code)}</span>
          <h3><a href="${escapeHtml(fund.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fund.name)}</a></h3>
        </div>
        <span class="badge">${escapeHtml(fund.style)}</span>
      </div>
      <p>${escapeHtml(fund.lesson)}</p>
      <dl>
        <div><dt>基金经理</dt><dd>${escapeHtml(ensureArray(fund.managerNames).join(" / ") || "待更新")}</dd></div>
        <div><dt>股票仓位</dt><dd>${fund.stockPosition === null || fund.stockPosition === undefined ? "待更新" : `${Number(fund.stockPosition).toFixed(2)}%`}</dd></div>
        <div><dt>近 1 月 / 1 年</dt><dd>${escapeHtml(fund.returns?.oneMonth || "N/A")} / ${escapeHtml(fund.returns?.oneYear || "N/A")}</dd></div>
      </dl>
      <ol>
        ${ensureArray(fund.holdings).slice(0, 5).map((holding) => `
          <li>
            <span>${escapeHtml(holding.name)} <em>${escapeHtml(holding.code)}</em></span>
            <strong>${Number.isFinite(Number(holding.changePct)) ? `${Number(holding.changePct) >= 0 ? "+" : ""}${Number(holding.changePct).toFixed(2)}%` : "N/A"}</strong>
          </li>
        `).join("")}
      </ol>
    </article>
  `).join("") : `<div class="empty-state">等待中国基金公开持仓</div>`;
}

function renderFundWatchlist(items) {
  el("#fundWatchlist").innerHTML = items.length ? items.map((item) => `
    <article class="fund-card">
      <div class="fund-card__top">
        <h3>${escapeHtml(item.bucket)}</h3>
        <span class="badge">${ensureArray(item.examples).map(escapeHtml).join(" / ")}</span>
      </div>
      <p>${escapeHtml(item.role)}</p>
      <dl>
        <div><dt>适合情况</dt><dd>${escapeHtml(item.suitableFor)}</dd></div>
        <div><dt>购买前建议</dt><dd>${escapeHtml(item.buyGuidance)}</dd></div>
        <div><dt>今天怎么看</dt><dd>${escapeHtml(item.currentRead)}</dd></div>
        <div><dt>主要风险</dt><dd>${escapeHtml(item.risk)}</dd></div>
      </dl>
    </article>
  `).join("") : `<div class="empty-state">等待基金观察池</div>`;
}

function renderNewsFilters(news) {
  const categories = ["All", ...new Set(news.map((item) => item.category).filter(Boolean))];
  if (!categories.includes(state.newsFilter)) state.newsFilter = "All";
  el("#newsFilters").innerHTML = categories.map((category) => `
    <button class="filter-button ${state.newsFilter === category ? "is-active" : ""}" type="button" aria-pressed="${state.newsFilter === category}" data-news-filter="${escapeHtml(category)}">
      ${category === "All" ? "全部" : escapeHtml(category)}
    </button>
  `).join("");
}

function renderNews(news) {
  const visibleNews = state.newsFilter === "All"
    ? news
    : news.filter((item) => item.category === state.newsFilter);
  el("#newsList").innerHTML = visibleNews.length ? visibleNews.map((item) => `
    <article class="news-item">
      <div class="news-item__top">
        <h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
        <span class="badge">${escapeHtml(item.category)}</span>
      </div>
      <p>${escapeHtml(item.impact)}</p>
    </article>
  `).join("") : `<div class="empty-state">当前分类暂无新闻</div>`;
}

function renderCalendar(calendar) {
  el("#calendarList").innerHTML = calendar.length ? calendar.map((item) => `
    <article class="timeline-item">
      <div class="timeline-item__top">
        <h3>${escapeHtml(item.date)} · ${escapeHtml(item.event)}</h3>
        <span class="badge">${escapeHtml(item.source)}</span>
      </div>
      <p>${escapeHtml(item.whyItMatters)}</p>
    </article>
  `).join("") : `<div class="empty-state">等待宏观日历</div>`;
}

function renderBeginnerLessons(lessons) {
  el("#beginnerLessons").innerHTML = lessons.length ? lessons.map((item, index) => `
    <article class="lesson-card">
      <span class="lesson-index">第 ${index + 1} 课</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.plain)}</p>
      <div><strong>举个例子</strong><span>${escapeHtml(item.example)}</span></div>
      <div><strong>今天检查</strong><span>${escapeHtml(item.todayCheck)}</span></div>
    </article>
  `).join("") : `<div class="empty-state">等待小白知识卡</div>`;
}

function renderKnowledge(knowledge) {
  el("#knowledgeMap").innerHTML = knowledge.length ? knowledge.map((item) => `
    <article class="knowledge-card">
      <h3>${escapeHtml(item.area)}</h3>
      <p>${escapeHtml(item.principle)}</p>
      <ul>${ensureArray(item.checkpoints).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
    </article>
  `).join("") : `<div class="empty-state">等待知识模块</div>`;
}

function renderGuruPortfolios(portfolios) {
  const managers = ensureArray(portfolios?.managers);
  el("#guruPortfolioNote").textContent = portfolios?.note || "公开持仓只用于学习，不代表实时买卖。";
  el("#guruPortfolioGrid").innerHTML = managers.length ? managers.map((manager) => `
    <article class="guru-card">
      <div class="guru-card__head">
        <h3><a href="${escapeHtml(manager.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(manager.name)}</a></h3>
        <span class="badge">${escapeHtml(manager.reportDate || "report")}</span>
      </div>
      <p>${escapeHtml(manager.lesson || "只作为公开披露观察。")}</p>
      <p class="guru-meta">披露日 ${escapeHtml(manager.filingDate || "未知")} · 报告期 ${escapeHtml(manager.reportDate || "未知")}</p>
      <ol>
        ${ensureArray(manager.topHoldings).map((holding) => `
          <li>
            <span>${escapeHtml(holding.issuer)}</span>
            <strong>约 $${formatNumber(holding.valueMillions, "M")}</strong>
          </li>
        `).join("")}
      </ol>
    </article>
  `).join("") : `<div class="empty-state">等待公开持仓数据</div>`;
}

function renderPlaybooks(playbooks) {
  el("#playbookGrid").innerHTML = playbooks.length ? playbooks.map((item) => `
    <article class="playbook">
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.pattern)}</p>
      <ul>${ensureArray(item.productMoves).map((move) => `<li>${escapeHtml(move)}</li>`).join("")}</ul>
    </article>
  `).join("") : `<div class="empty-state">等待社区方案</div>`;
}

function renderPublishingLoop(items) {
  el("#publishingLoop").innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderSources(sources) {
  el("#sourceList").innerHTML = sources.length ? sources.map((item) => `
    <article class="source-item">
      <h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)}</a></h3>
      <p>${escapeHtml(item.use)}</p>
    </article>
  `).join("") : `<div class="empty-state">等待来源账本</div>`;
}

function renderDiagnostics(items) {
  if (!items.length) return;
  const okCount = items.filter((item) => item.status === "ok").length;
  const labelFor = (item) => {
    if (item.status === "ok") return "正常";
    if (item.source.includes("Stooq")) return "行情源暂不可用，已跳过";
    if (item.source.includes("CoinGecko")) return "加密行情源暂不可用，已跳过";
    return "暂不可用，保留最近快照";
  };
  el("#sourceList").insertAdjacentHTML("beforeend", `
    <article class="source-item">
      <h3>最近更新诊断</h3>
      <p>公开源更新 ${okCount}/${items.length} 正常；失败源已降级，不会写入错误行情或改变合规边界。</p>
      <p>${items.map((item) => `${escapeHtml(item.source)}：${escapeHtml(labelFor(item))}`).join(" · ")}</p>
    </article>
  `);
}

function drawPulseChart(markets) {
  const canvas = el("#pulseChart");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(320, rect.width || 980);
  const cssHeight = Math.max(220, cssWidth * (320 / 980));
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = cssWidth;
  const height = cssHeight;
  const padding = 48;
  const values = markets.map((item) => Number(item.score ?? item.value)).filter((value) => Number.isFinite(value));
  const labels = markets.map((item) => item.shortLabel || item.label);
  const chartBg = cssColor("--surface-warm") || "white";
  const muted = cssColor("--muted") || "gray";
  const line = cssColor("--line") || "lightgray";
  const ink = cssColor("--ink") || "black";
  const accentColors = [cssColor("--accent"), cssColor("--blue"), cssColor("--amber")].filter(Boolean);
  if (!values.length) {
    ctx.fillStyle = chartBg;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = muted;
    ctx.font = "16px Inter, Noto Sans SC, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("等待市场数据", width / 2, height / 2);
    return;
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = chartBg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = padding + (i * (height - padding * 2)) / 4;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  const step = (width - padding * 2) / Math.max(values.length - 1, 1);
  const points = values.map((value, index) => ({
    x: padding + index * step,
    y: height - padding - ((value - min) / span) * (height - padding * 2)
  }));

  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  points.forEach((point, index) => {
    ctx.fillStyle = accentColors[index % accentColors.length] || ink;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = muted;
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(labels[index], point.x, height - 18);
  });
}

function updateActiveNav() {
  if (!navTargets.length) return;
  const hashTarget = navTargets.find((item) => item.hash === window.location.hash);
  const headerOffset = getAnchorOffset() + 72;
  const current = hashTarget || [...navTargets].reverse().find((item) => {
    const rect = item.target.getBoundingClientRect();
    return rect.top <= headerOffset;
  }) || navTargets[0];
  navLinks.forEach((link) => {
    const active = link === current.link;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}

function getAnchorOffset() {
  const raw = cssColor("--anchor-offset");
  const parsed = Number.parseFloat(raw);
  if (Number.isFinite(parsed)) return parsed;
  const header = el(".site-header");
  return Math.round(header?.getBoundingClientRect().height || 50) + 14;
}

function syncHashTargetPosition() {
  const hash = window.location.hash;
  if (!hash || hash === "#top") return;
  const target = document.querySelector(hash);
  if (!target) return;
  window.requestAnimationFrame(() => {
    const topGap = getAnchorOffset();
    const targetTop = target.getBoundingClientRect().top;
    if (Math.abs(targetTop - topGap) < 32) {
      updateActiveNav();
      return;
    }
    window.scrollTo({
      top: window.scrollY + targetTop - topGap,
      behavior: "auto"
    });
    window.requestAnimationFrame(updateActiveNav);
  });
}

function scheduleHashSync() {
  state.hashSyncTimers.forEach((timer) => window.clearTimeout(timer));
  state.hashSyncTimers = [0, 250, 900, 1600].map((delay) => window.setTimeout(() => {
    syncHashTargetPosition();
    updateActiveNav();
  }, delay));
}

el("#refreshButton")?.addEventListener("click", loadDaily);
window.addEventListener("resize", () => {
  if (!state.data) return;
  window.clearTimeout(state.resizeTimer);
  state.resizeTimer = window.setTimeout(() => {
    drawPulseChart(state.data.markets);
    updateActiveNav();
  }, 120);
});
window.addEventListener("scroll", () => {
  window.clearTimeout(state.navTimer);
  state.navTimer = window.setTimeout(updateActiveNav, 40);
}, { passive: true });
window.addEventListener("hashchange", scheduleHashSync);
window.addEventListener("load", scheduleHashSync);
document.fonts?.ready.then(() => {
  scheduleHashSync();
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-news-filter]");
  if (!button || !state.data) return;
  state.newsFilter = button.dataset.newsFilter;
  renderNewsFilters(state.data.news);
  renderNews(state.data.news);
  const activeButton = document.querySelector(`[data-news-filter="${CSS.escape(state.newsFilter)}"]`);
  activeButton?.focus({ preventScroll: true });
});

loadDaily();
