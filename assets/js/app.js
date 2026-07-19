/* =========================================================
   ARKKO — 前端渲染引擎（原生 JS，無框架、無建置）
   讀 data.js 的 window.ARKKO_DATA，依頁面上的 mount 節點渲染。
   ========================================================= */
(function () {
  "use strict";
  const { CATEGORIES, ARTICLES, CASES, INTERVIEWS } = window.ARKKO_DATA;
  const catMap = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );

  /* ---------- 日期 / 排程 ----------
     文章的 date 同時是「顯示日期」與「發布時間」。
     date 若為未來 → 尚未上線（各列表自動隱藏，時間到才出現）。 */
  const parseDate = (s) => {
    if (!s) return null;
    const d = new Date(String(s).trim().replace(/\./g, "-").replace(" ", "T"));
    return isNaN(d.getTime()) ? null : d;
  };
  const isLive = (a) => {
    const d = parseDate(a.date);
    return !d || d.getTime() <= Date.now();
  };
  const fmtDate = (s) => {
    const d = parseDate(s);
    if (!d) return s || "";
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  };

  /* ---------- shared: cover (image or gradient placeholder) ---------- */
  function cover(item, cKey) {
    if (item.cover) return `<img src="${esc(item.cover)}" alt="${esc(item.title || "")}" loading="lazy">`;
    const c = cKey || item.category || item.coverC || "feature";
    const label = (catMap[c] && catMap[c].label) || "ARKKO";
    return `<div class="ph" data-c="${esc(c)}">${esc(label)}</div>`;
  }

  /* ---------- shared header / footer ---------- */
  function mountChrome() {
    const page = document.body.dataset.page || "";
    const links = [
      { href: "index.html", label: "首頁", en: "Home", key: "home" },
      { href: "index.html#feature", label: "專題", en: "Features", key: "feature" },
      { href: "cases.html", label: "品牌合作", en: "Cases", key: "cases" },
      { href: "interviews.html", label: "訪談影片", en: "Interviews", key: "interviews" },
      { href: "about.html", label: "關於 ARKKO", en: "About", key: "about" },
    ];
    const navLinks = links
      .map(
        (l) =>
          `<a href="${l.href}"${l.key === page ? ' aria-current="page"' : ""}>${l.label}</a>`
      )
      .join("");

    const header = $("[data-site-header]");
    if (header) {
      header.className = "site-header";
      header.innerHTML = `
        <div class="wrap site-header__bar">
          <a class="brand" href="index.html"><img src="assets/img/logo-wordmark.png" alt="ARKKO" class="brand__img" /></a>
          <nav class="nav">
            ${navLinks}
            <a class="nav__cta" href="contact.html">合作提案</a>
          </nav>
          <button class="menu-toggle" aria-label="選單" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
        <div class="mobile-nav">
          ${links
            .map((l) => `<a href="${l.href}">${l.label}<span>${l.en}</span></a>`)
            .join("")}
          <a href="contact.html">合作提案<span>Pitch</span></a>
        </div>`;
      const btn = $(".menu-toggle", header);
      const mnav = $(".mobile-nav", header);
      btn.addEventListener("click", () => {
        const open = mnav.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(open));
      });
    }

    const footer = $("[data-site-footer]");
    if (footer) {
      footer.className = "site-footer";
      const catCols = CATEGORIES.map(
        (c) => `<a href="index.html#${c.key}">${c.label}</a>`
      ).join("");
      footer.innerHTML = `
        <div class="wrap site-footer__top">
          <div class="site-footer__brand">
            <span class="brand"><img src="assets/img/logo-wordmark.png" alt="ARKKO" class="brand__img brand__img--lg" /></span>
            <p>用財經與品牌策略的分析框架，報導時尚與消費文化。以 Instagram、Threads 為主的台灣獨立媒體。</p>
          </div>
          <div class="fcol">
            <h4>內容支柱</h4>
            ${catCols}
          </div>
          <div class="fcol">
            <h4>ARKKO</h4>
            <a href="about.html">關於我們</a>
            <a href="cases.html">品牌合作案例</a>
            <a href="interviews.html">訪談影片系列</a>
            <a href="contact.html">合作提案</a>
            <a href="https://instagram.com" target="_blank" rel="noopener">Instagram ↗</a>
            <a href="https://threads.net" target="_blank" rel="noopener">Threads ↗</a>
          </div>
        </div>
        <div class="wrap site-footer__bottom">
          <span>© ${new Date().getFullYear()} ARKKO. 專業、中性、報導式。</span>
          <span>Taipei — 時尚與消費文化媒體</span>
        </div>`;
    }
  }

  /* ---------- article card ---------- */
  function articleCard(a, opts = {}) {
    const c = catMap[a.category] || {};
    const feature = opts.feature ? " card--feature" : "";
    return `
      <a class="card${feature}" href="article.html?id=${encodeURIComponent(a.id)}">
        <div class="card__media">
          ${cover(a)}
          <span class="card__tag">${esc(c.label || "")}</span>
        </div>
        <div class="card__body">
          <h3 class="card__title">${esc(a.title)}</h3>
          <p class="card__sub">${esc(a.subtitle || a.excerpt || "")}</p>
          <div class="card__meta">
            <span class="byline">${esc(a.author)}</span>
            <span>${esc(fmtDate(a.date))}</span>
            <span>${esc(a.read || "")}</span>
          </div>
        </div>
      </a>`;
  }

  /* ---------- HOME ---------- */
  function renderHome() {
    const mount = $("[data-home-feed]");
    if (!mount) return;
    const filterBar = $("[data-filter]");
    let active = (location.hash || "").replace("#", "");
    if (active && !catMap[active] && active !== "feature") active = "";
    if (active === "feature") active = ""; // #feature just scrolls; treat as all

    // 只顯示「已到發布時間」的文章（排程在未來的先隱藏）
    const liveArticles = ARTICLES.filter(isLive);

    // build filter chips
    if (filterBar) {
      const counts = {};
      liveArticles.forEach((a) => (counts[a.category] = (counts[a.category] || 0) + 1));
      filterBar.innerHTML =
        `<button class="chip" data-cat="" aria-pressed="${!active}">全部<small>${liveArticles.length}</small></button>` +
        CATEGORIES.filter((c) => counts[c.key])
          .map(
            (c) =>
              `<button class="chip" data-cat="${c.key}" aria-pressed="${
                active === c.key
              }">${c.label}<small>${counts[c.key]}</small></button>`
          )
          .join("");
      filterBar.addEventListener("click", (e) => {
        const btn = e.target.closest(".chip");
        if (!btn) return;
        active = btn.dataset.cat;
        history.replaceState(null, "", active ? "#" + active : location.pathname);
        [...filterBar.querySelectorAll(".chip")].forEach((c) =>
          c.setAttribute("aria-pressed", String(c.dataset.cat === active))
        );
        paint();
      });
    }

    function paint() {
      const list = active
        ? liveArticles.filter((a) => a.category === active)
        : liveArticles;
      if (!list.length) {
        mount.innerHTML = `<div class="empty">此分類目前沒有文章。</div>`;
        return;
      }
      // featured first only when showing all
      let html = "";
      let rest = list;
      if (!active) {
        const feat = list.find((a) => a.featured) || list[0];
        html += articleCard(feat, { feature: true });
        html += `<hr class="rule rule--ink">`;
        rest = list.filter((a) => a.id !== feat.id);
      }
      html += `<div class="feed">${rest.map((a) => articleCard(a)).join("")}</div>`;
      mount.innerHTML = html;
      tagOrientations(mount);
    }
    paint();
  }

  // 讀取每張封面圖的長寬，標記直式/橫式/方形——
  // 讓圖牆版型（theme-c）能依照片方向自動排列組合。
  function tagOrientations(scope) {
    scope.querySelectorAll(".feed .card").forEach((card) => {
      const img = card.querySelector(".card__media img");
      if (!img) { card.dataset.orient = "landscape"; return; } // 無圖（漸層佔位）當橫式
      const set = () => {
        const r = img.naturalWidth / img.naturalHeight;
        card.dataset.orient = r > 1.15 ? "landscape" : r < 0.87 ? "portrait" : "square";
      };
      if (img.complete && img.naturalWidth) set();
      else img.addEventListener("load", set, { once: true });
    });
  }

  /* ---------- ARTICLE ---------- */
  function renderArticle() {
    const mount = $("[data-article]");
    if (!mount) return;
    const id = new URLSearchParams(location.search).get("id");
    const a = ARTICLES.find((x) => x.id === id) || ARTICLES[0];
    const c = catMap[a.category] || {};
    document.title = `${a.title}｜ARKKO`;

    // 排程中（發布時間還沒到）→ 不公開內文
    if (!isLive(a)) {
      mount.innerHTML = `
        <section class="section wrap center">
          <div class="kicker kicker--accent no-tick" style="justify-content:center">Scheduled</div>
          <h1 style="font-family:var(--serif);font-size:clamp(24px,4vw,34px);margin:14px 0 10px">這篇文章尚未發布</h1>
          <p style="color:var(--ink-soft)">預定於 ${esc(fmtDate(a.date))} 上線。</p>
          <a class="btn btn--ghost mt-m" href="index.html">回首頁</a>
        </section>`;
      return;
    }

    const blocks = a.body
      .map((b) => {
        if (b.t === "p")
          return `<p${b.dropcap ? ' class="dropcap"' : ""}>${esc(b.v)}</p>`;
        if (b.t === "h") return `<h3>${esc(b.v)}</h3>`;
        if (b.t === "quote") return `<blockquote>${esc(b.v)}</blockquote>`;
        if (b.t === "signoff") return `<p class="sign-off">${esc(b.v)}</p>`;
        if (b.t === "figure" || b.t === "img") {
          const inner = b.src
            ? `<img src="${esc(b.src)}" alt="${esc(b.cap || a.title)}" loading="lazy">`
            : cover(a);
          return `<figure><div class="card__media" style="aspect-ratio:3/2">${inner}</div>${
            b.cap ? `<figcaption>${esc(b.cap)}</figcaption>` : ""
          }</figure>`;
        }
        return "";
      })
      .join("");

    const caseLink = a.caseRef
      ? `<a class="btn btn--ghost" href="case.html?id=${encodeURIComponent(
          a.caseRef
        )}">看完整合作案例 →</a>`
      : "";

    // related (same category, 已發布)
    const related = ARTICLES.filter(
      (x) => x.category === a.category && x.id !== a.id && isLive(x)
    ).slice(0, 2);

    mount.innerHTML = `
      <header class="article-head">
        <div class="wrap article-head__inner">
          <a class="backlink" href="index.html#${a.category}">← ${esc(c.label || "回首頁")}</a>
          <div class="kicker kicker--accent mt-s no-tick">${esc(c.label || "")} · ${esc(a.author)}</div>
          <h1 class="article-title">${esc(a.title)}</h1>
          <p class="article-sub">${esc(a.subtitle || "")}</p>
          <div class="article-byline">
            <span class="byline">文｜${esc(a.author)}</span>
            <span>${esc(fmtDate(a.date))}</span>
            <span>${esc(a.read || "")}</span>
          </div>
        </div>
      </header>
      <div class="wrap">
        <div class="article-hero" style="margin-top:0">${cover(a)}</div>
        ${
          a.coverCredit
            ? `<p class="article-hero__cap">圖片來源／${esc(a.coverCredit)}</p>`
            : ""
        }
      </div>
      <div class="wrap">
        <article class="prose">
          ${blocks}
          ${caseLink ? `<div class="mt-m">${caseLink}</div>` : ""}
        </article>
      </div>
      ${
        related.length
          ? `<hr class="rule rule--ink">
        <section class="section wrap">
          <div class="sec-head"><h2>更多 ${esc(c.label)}</h2><a href="index.html#${a.category}">全部 →</a></div>
          <div class="feed">${related.map((r) => articleCard(r)).join("")}</div>
        </section>`
          : ""
      }`;
  }

  /* ---------- CASES (list) ---------- */
  function renderCases() {
    const mount = $("[data-cases]");
    if (!mount) return;
    mount.innerHTML = CASES.map(
      (cs) => `
      <a class="case-card" href="case.html?id=${encodeURIComponent(cs.id)}">
        <div class="case-card__media">${cover(cs, cs.coverC)}</div>
        <div class="case-card__body">
          <div class="case-card__client">${esc(cs.client)}</div>
          <h3 class="case-card__title">${esc(cs.title)}</h3>
          <p class="case-card__sub">${esc(cs.subtitle)}</p>
          <div class="case-card__tags">${cs.tags
            .map((t) => `<span class="tag">${esc(t)}</span>`)
            .join("")}</div>
        </div>
      </a>`
    ).join("");
  }

  /* ---------- CASE (detail) ---------- */
  function embedCard(e) {
    const frame =
      e.type === "iframe" && e.url
        ? `<iframe src="${esc(e.url)}" loading="lazy" allowfullscreen></iframe>`
        : `<div class="embed-card__placeholder">
             <div class="play"></div>
             嵌入位置<br>IG / Threads / 影片
           </div>`;
    return `
      <div class="embed-card">
        <div class="embed-card__frame">${frame}</div>
        <div class="embed-card__cap"><b>${esc(e.title)}</b><span>${esc(e.note || "")}</span></div>
      </div>`;
  }

  function renderCaseDetail() {
    const mount = $("[data-case]");
    if (!mount) return;
    const id = new URLSearchParams(location.search).get("id");
    const cs = CASES.find((x) => x.id === id) || CASES[0];
    document.title = `${cs.client} × ARKKO｜品牌合作案例`;

    mount.innerHTML = `
      <header class="case-hero">
        <div class="wrap">
          <a class="backlink" href="cases.html">← 品牌合作案例</a>
          <div class="kicker kicker--accent mt-s no-tick">${esc(cs.client)} · ${esc(cs.format)}</div>
          <h1 class="article-title" style="max-width:18ch">${esc(cs.title)}</h1>
          <p class="article-sub" style="max-width:52ch">${esc(cs.subtitle)}</p>
        </div>
      </header>
      <div class="wrap">
        <div class="article-hero" style="aspect-ratio:21/9">${cover(cs, cs.coverC)}</div>
      </div>
      <section class="section wrap">
        <div class="metrics">
          ${cs.metrics
            .map((m) => `<div class="metric"><b>${esc(m.n)}</b><span>${esc(m.l)}</span></div>`)
            .join("")}
        </div>
      </section>
      <section class="wrap" style="padding-bottom:8px">
        <div class="max-prose">
          <div class="kicker">企劃概述</div>
          <p class="prose" style="padding:14px 0 0"><span style="font-size:19px;line-height:1.9">${esc(cs.summary)}</span></p>
        </div>
      </section>
      <section class="section wrap">
        <div class="sec-head"><h2>執行內容</h2></div>
        <ul class="deliverables">
          ${cs.deliverables
            .map(
              (d, i) =>
                `<li><span class="no">${String(i + 1).padStart(2, "0")}</span><span>${esc(d)}</span></li>`
            )
            .join("")}
        </ul>
      </section>
      <hr class="rule rule--ink">
      <section class="section wrap">
        <div class="sec-head"><h2>影片與貼文</h2><span class="kicker no-tick">IG · Threads</span></div>
        <div class="embed-grid">${cs.embeds.map(embedCard).join("")}</div>
      </section>
      <hr class="rule rule--ink">
      <section class="section wrap center">
        <div class="kicker--accent kicker no-tick center" style="justify-content:center">下一步</div>
        <h2 style="font-family:var(--serif);font-size:clamp(24px,4vw,36px);margin:12px 0 20px">想做一檔類似的企劃？</h2>
        <a class="btn" href="contact.html">聊聊合作提案</a>
      </section>`;
  }

  /* ---------- INTERVIEWS ---------- */
  function renderInterviews() {
    const mount = $("[data-interviews]");
    if (!mount) return;
    mount.innerHTML = INTERVIEWS.map(
      (v) => `
      <div class="embed-card">
        <div class="embed-card__frame">
          ${
            v.type === "iframe" && v.url
              ? `<iframe src="${esc(v.url)}" loading="lazy" allowfullscreen></iframe>`
              : `<div class="embed-card__placeholder"><div class="play"></div>${esc(
                  v.note || "影片"
                )}</div>`
          }
        </div>
        <div class="embed-card__cap"><b>${esc(v.title)}</b><span>${esc(v.guest)} · ${esc(
        v.note || ""
      )}</span></div>
      </div>`
    ).join("");
  }

  /* ---------- ABOUT pillars ---------- */
  function renderPillars() {
    const mount = $("[data-pillars]");
    if (!mount) return;
    mount.innerHTML = CATEGORIES.map(
      (c) => `
      <div class="pillar">
        <div class="pillar__ed">${esc(c.editor)}</div>
        <h3>${esc(c.label)}</h3>
        <p>${esc(c.desc)}</p>
      </div>`
    ).join("");
  }

  /* ---------- CONTACT form (client-side, no backend) ---------- */
  function initContactForm() {
    const form = $("[data-contact-form]");
    if (!form) return;
    // populate topic select from categories
    const sel = $("select[name=topic]", form);
    if (sel) {
      sel.innerHTML =
        `<option value="">請選擇合作類型</option>` +
        `<option>品牌合作 / 業配企劃</option>` +
        `<option>訪談影片系列</option>` +
        `<option>開箱 Reels（先拆再說）</option>` +
        CATEGORIES.map((c) => `<option>${c.label}內容合作</option>`).join("") +
        `<option>其他</option>`;
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const subject = encodeURIComponent(`[ARKKO 合作提案] ${data.company || data.name || ""}`);
      const body = encodeURIComponent(
        `姓名：${data.name || ""}\n公司／品牌：${data.company || ""}\n` +
          `信箱：${data.email || ""}\n合作類型：${data.topic || ""}\n預算範圍：${
            data.budget || ""
          }\n\n需求說明：\n${data.message || ""}`
      );
      const ok = $("[data-form-ok]", form.parentElement) || null;
      if (ok) ok.hidden = false;
      // open user's mail client with a prefilled draft
      window.location.href = `mailto:arkkoshopp@gmail.com?subject=${subject}&body=${body}`;
    });
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    mountChrome();
    renderHome();
    renderArticle();
    renderCases();
    renderCaseDetail();
    renderInterviews();
    renderPillars();
    initContactForm();
    // smooth-scroll for in-page #feature link → focus filter section
    if (location.hash === "#feature") {
      const el = $("[data-filter]");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  });
})();
