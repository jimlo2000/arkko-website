// =========================================================
// ARKKO 內容建置腳本（在 Netlify 的伺服器上執行，本機不用跑）
// 把 content/articles/*.md（發文後台存的原稿）轉成
// assets/js/cms-articles.js，讓網站把它們排進文章列表。
// 零依賴：只用 node 內建功能。
// =========================================================
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "content", "articles");
const OUT = join(ROOT, "assets", "js", "cms-articles.js");

// 分類 → 編輯名（與 data.js 的 CATEGORIES 對齊）
const EDITORS = {
  fashion: "Amber", sport: "Jack", music: "Joyce", kpop: "Stella",
  art: "Mandy", feature: "Arthur", lifestyle: "Diana", brand: "Joanna", anime: "Willie",
};

// ---------- 簡易 frontmatter 解析（Decap 輸出的單層 key: value） ----------
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1).replace(/\\"/g, '"');
    }
    meta[kv[1]] = v;
  }
  return { meta, body: m[2] };
}

// ---------- 簡易 Markdown → 網站的段落格式 ----------
function stripInline(s) {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")          // 圖片（另外處理）
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")       // 連結 → 只留文字
    .replace(/\*\*([^*]+)\*\*/g, "$1")             // 粗體
    .replace(/\*([^*]+)\*/g, "$1")                 // 斜體
    .replace(/`([^`]+)`/g, "$1")                   // 行內代碼
    .trim();
}

function mdToBlocks(md) {
  const blocks = [];
  const chunks = md.split(/\r?\n\s*\r?\n/); // 以空行分段
  for (const chunk of chunks) {
    const text = chunk.trim();
    if (!text) continue;
    const img = text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) { blocks.push({ t: "img", src: img[2], cap: img[1] || "" }); continue; }
    if (/^#{1,6}\s/.test(text)) { blocks.push({ t: "h", v: stripInline(text.replace(/^#{1,6}\s*/, "")) }); continue; }
    if (/^>/.test(text)) {
      blocks.push({ t: "quote", v: stripInline(text.split(/\r?\n/).map((l) => l.replace(/^>\s?/, "")).join(" ")) });
      continue;
    }
    // 段落內夾雜的圖片行也抓出來
    const lines = text.split(/\r?\n/);
    let buf = [];
    const flush = () => {
      const v = stripInline(buf.join(" "));
      if (v) blocks.push({ t: "p", v });
      buf = [];
    };
    for (const line of lines) {
      const im = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (im) { flush(); blocks.push({ t: "img", src: im[2], cap: im[1] || "" }); }
      else buf.push(line);
    }
    flush();
  }
  if (blocks.length && blocks[0].t === "p") blocks[0].dropcap = true;
  return blocks;
}

// ---------- 主流程 ----------
const articles = [];
if (existsSync(SRC)) {
  for (const f of readdirSync(SRC).sort().reverse()) {
    if (!f.endsWith(".md")) continue;
    try {
      const { meta, body } = parseFrontmatter(readFileSync(join(SRC, f), "utf8"));
      if (!meta.title) continue;
      const blocks = mdToBlocks(body);
      const plain = blocks.filter((b) => b.t === "p" || b.t === "quote").map((b) => b.v).join("");
      const minutes = Math.max(1, Math.round(plain.length / 550));
      const firstP = blocks.find((b) => b.t === "p");
      articles.push({
        id: "cms-" + basename(f, ".md"),
        category: meta.category || "feature",
        title: meta.title,
        subtitle: meta.subtitle || "",
        author: EDITORS[meta.category] || "ARKKO",
        date: meta.date || "",
        read: `${minutes} 分鐘`,
        cover: meta.cover || "",
        coverCredit: meta.coverCredit || "",
        excerpt: firstP ? firstP.v.slice(0, 120) : "",
        body: blocks,
      });
    } catch (e) {
      console.error(`[build-content] 跳過 ${f}：${e.message}`);
    }
  }
}

const out = `// 此檔由 tools/build-content.mjs 自動產生——請勿手動編輯。
// 後台發的文章會在每次部署時寫進來，並排進 ARTICLES 列表。
(function () {
  var D = window.ARKKO_DATA;
  if (!D || !D.ARTICLES) return;
  var cms = ${JSON.stringify(articles, null, 2)};
  for (var i = 0; i < cms.length; i++) D.ARTICLES.push(cms[i]);
  // 依日期新→舊排序（讓後台發的文自然排進時間軸）
  var t = function (s) {
    var d = new Date(String(s || "").trim().replace(/\\./g, "-").replace(" ", "T"));
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };
  D.ARTICLES.sort(function (a, b) { return t(b.date) - t(a.date); });
})();
`;
mkdirSync(join(ROOT, "assets", "js"), { recursive: true });
writeFileSync(OUT, out);
console.log(`[build-content] 完成：${articles.length} 篇後台文章 → assets/js/cms-articles.js`);
