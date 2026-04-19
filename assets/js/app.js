/* ============================================================
   一人公司·从 0 到 1 — 交互脚本
   零依赖。所有功能开箱即用。
   ============================================================ */

(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const STORAGE_KEYS = {
    theme: "yrgs.theme",
    fontSize: "yrgs.fontSize",
  };

  /* ----------------------------------------------------------
     1. 主题与字号（恢复 + 切换）
     ---------------------------------------------------------- */
  const root = document.documentElement;

  function applyTheme(theme) {
    if (theme === "auto") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    $$('[data-theme-pill]').forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        String(btn.dataset.themePill === theme)
      );
    });
  }
  function applyFontSize(size) {
    root.setAttribute("data-fontsize", size);
    $$('[data-font-pill]').forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        String(btn.dataset.fontPill === size)
      );
    });
  }

  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "auto";
  const savedFont = localStorage.getItem(STORAGE_KEYS.fontSize) || "m";
  applyTheme(savedTheme);
  applyFontSize(savedFont);

  function bindSettings() {
    $$('[data-theme-pill]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.dataset.themePill;
        applyTheme(t);
        localStorage.setItem(STORAGE_KEYS.theme, t);
        toast("主题已切换");
      });
    });
    $$('[data-font-pill]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = btn.dataset.fontPill;
        applyFontSize(s);
        localStorage.setItem(STORAGE_KEYS.fontSize, s);
      });
    });
  }

  /* ----------------------------------------------------------
     2. 设置弹层
     ---------------------------------------------------------- */
  function bindMenu() {
    const trigger = $("#settingsTrigger");
    const menu = $("#settingsMenu");
    if (!trigger || !menu) return;
    function setOpen(open) {
      menu.dataset.open = open ? "true" : "false";
      trigger.setAttribute("aria-expanded", String(open));
    }
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(menu.dataset.open !== "true");
    });
    document.addEventListener("click", (e) => {
      if (
        menu.dataset.open === "true" &&
        !menu.contains(e.target) &&
        e.target !== trigger
      ) {
        setOpen(false);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.dataset.open === "true") setOpen(false);
    });
  }

  /* ----------------------------------------------------------
     3. 阅读进度条
     ---------------------------------------------------------- */
  function bindProgress() {
    const bar = $("#progressBar");
    if (!bar) return;
    let raf = null;
    function update() {
      const doc = document.documentElement;
      const scrollTop = window.scrollY;
      const max = doc.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0;
      bar.style.width = (ratio * 100).toFixed(2) + "%";
    }
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        update();
        raf = null;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ----------------------------------------------------------
     4. 自动构建侧边目录 + ScrollSpy
     ---------------------------------------------------------- */
  function buildSidebarTOC() {
    const list = $("#sidebarList");
    const main = $(".main");
    if (!list || !main) return [];

    // 仅采集 main 内、且不是 hero 区里的标题
    const headings = $$('h2[id], h3[id]', main).filter(
      (h) => !h.closest(".hero") && !h.closest(".chapter-map")
    );

    const items = [];
    list.innerHTML = "";

    headings.forEach((h) => {
      const id = h.id;
      const text = h.textContent.replace(/¶/g, "").trim();
      if (!id || !text) return;
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#" + id;
      a.textContent = text;
      a.className = h.tagName === "H3" ? "lvl-3" : "lvl-2";
      a.dataset.target = id;
      li.appendChild(a);
      list.appendChild(li);
      items.push({ id, link: a, el: h });
    });

    // ScrollSpy
    const linksByID = new Map(items.map((i) => [i.id, i.link]));
    let activeID = null;
    function setActive(id) {
      if (id === activeID) return;
      if (activeID) linksByID.get(activeID)?.classList.remove("is-active");
      const link = linksByID.get(id);
      if (link) {
        link.classList.add("is-active");
        // 把激活项滚到可视区
        const parent = link.closest(".sidebar__list");
        if (parent) {
          const linkRect = link.getBoundingClientRect();
          const parentRect = parent.getBoundingClientRect();
          if (
            linkRect.top < parentRect.top + 30 ||
            linkRect.bottom > parentRect.bottom - 30
          ) {
            link.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        }
      }
      activeID = id;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // 取最靠上但仍可见的元素作为 active
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        } else {
          // 全部不在视口时，找最近的一个
          let nearest = null;
          let dist = Infinity;
          items.forEach((item) => {
            const top = item.el.getBoundingClientRect().top;
            if (top < 100) {
              const d = 100 - top;
              if (d < dist) {
                dist = d;
                nearest = item.id;
              }
            }
          });
          if (nearest) setActive(nearest);
        }
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 }
    );
    items.forEach((i) => observer.observe(i.el));

    // 点击关闭移动端目录
    items.forEach(({ link }) => {
      link.addEventListener("click", () => {
        if (window.matchMedia("(max-width: 1024px)").matches) {
          closeSidebar();
        }
      });
    });

    return items;
  }

  /* ----------------------------------------------------------
     5. 移动端侧边目录开关
     ---------------------------------------------------------- */
  let scrim = null;
  function ensureScrim() {
    if (scrim) return scrim;
    scrim = document.createElement("div");
    scrim.className = "scrim";
    scrim.addEventListener("click", closeSidebar);
    document.body.appendChild(scrim);
    return scrim;
  }
  function openSidebar() {
    const sb = $("#sidebar");
    if (!sb) return;
    sb.dataset.open = "true";
    ensureScrim().dataset.open = "true";
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    const sb = $("#sidebar");
    if (!sb) return;
    sb.dataset.open = "false";
    if (scrim) scrim.dataset.open = "false";
    document.body.style.overflow = "";
  }
  function bindSidebarToggle() {
    const btn = $("#tocToggle");
    if (btn) btn.addEventListener("click", openSidebar);
  }

  /* ----------------------------------------------------------
     6. 标题锚点复制按钮
     ---------------------------------------------------------- */
  function injectAnchorButtons() {
    const main = $(".main");
    if (!main) return;
    $$("h2[id], h3[id], h4[id]", main).forEach((h) => {
      if (h.closest(".hero")) return;
      const btn = document.createElement("button");
      btn.className = "heading-anchor";
      btn.type = "button";
      btn.title = "复制本节链接";
      btn.setAttribute("aria-label", "复制本节链接");
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3.54-3.54a5 5 0 0 0-7.07-7.07l-1.41 1.41"/><path d="M14 11a5 5 0 0 0-7.07 0L3.39 14.54a5 5 0 0 0 7.07 7.07l1.41-1.41"/></svg>';
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const url = location.origin + location.pathname + "#" + h.id;
        try {
          await navigator.clipboard.writeText(url);
          btn.classList.add("copied");
          toast("已复制本节链接");
          setTimeout(() => btn.classList.remove("copied"), 1200);
        } catch {
          toast("复制失败，请手动复制");
        }
      });
      h.appendChild(btn);
    });
  }

  /* ----------------------------------------------------------
     7. 包裹 table -> .table-wrap，便于横向滚动
     ---------------------------------------------------------- */
  function wrapTables() {
    $$(".main table").forEach((tb) => {
      if (tb.parentElement && tb.parentElement.classList.contains("table-wrap")) return;
      const wrap = document.createElement("div");
      wrap.className = "table-wrap";
      tb.parentNode.insertBefore(wrap, tb);
      wrap.appendChild(tb);
    });
  }

  /* ----------------------------------------------------------
     8. pre 代码块复制按钮
     ---------------------------------------------------------- */
  function injectCodeCopy() {
    $$(".main pre").forEach((pre) => {
      if (pre.querySelector(".code-copy")) return;
      const btn = document.createElement("button");
      btn.className = "code-copy";
      btn.type = "button";
      btn.textContent = "复制";
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pre.innerText);
          btn.classList.add("copied");
          btn.textContent = "已复制";
          setTimeout(() => {
            btn.classList.remove("copied");
            btn.textContent = "复制";
          }, 1400);
        } catch {
          toast("复制失败");
        }
      });
      pre.appendChild(btn);
    });
  }

  /* ----------------------------------------------------------
     9. 回到顶部
     ---------------------------------------------------------- */
  function bindBackToTop() {
    const btn = $("#backToTop");
    if (!btn) return;
    function onScroll() {
      btn.classList.toggle("is-visible", window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    onScroll();
  }

  /* ----------------------------------------------------------
     10. 搜索 (Ctrl/Cmd+K, /, T 主题, G 顶部)
     ---------------------------------------------------------- */
  let searchIndex = [];
  function buildSearchIndex(items) {
    // items: 由 buildSidebarTOC 返回，已包含 id/标题/元素
    searchIndex = items.map(({ id, link, el }) => {
      // 取该标题之后到下一个同级标题之前的文本作为内容片段
      const tag = el.tagName;
      let node = el.nextElementSibling;
      let buffer = [];
      while (node && !/^H[123]$/.test(node.tagName)) {
        if (node.textContent) buffer.push(node.textContent);
        if (buffer.join(" ").length > 280) break;
        node = node.nextElementSibling;
      }
      return {
        id,
        title: link.textContent.trim(),
        path: tag === "H3" ? "节" : "章",
        snippet: buffer.join(" ").replace(/\s+/g, " ").trim().slice(0, 200),
      };
    });
  }

  function escHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }
  function highlight(text, q) {
    if (!q) return escHtml(text);
    const lower = text.toLowerCase();
    const ql = q.toLowerCase();
    const idx = lower.indexOf(ql);
    if (idx < 0) return escHtml(text);
    return (
      escHtml(text.slice(0, idx)) +
      "<mark>" +
      escHtml(text.slice(idx, idx + q.length)) +
      "</mark>" +
      escHtml(text.slice(idx + q.length))
    );
  }

  function bindSearch() {
    const modal = $("#searchModal");
    const input = $("#searchInput");
    const list = $("#searchResults");
    const trigger = $("#searchTrigger");
    if (!modal || !input || !list) return;

    function open() {
      modal.dataset.open = "true";
      setTimeout(() => input.focus(), 30);
      input.value = "";
      render("");
    }
    function close() {
      modal.dataset.open = "false";
      input.blur();
    }
    function render(q) {
      const query = q.trim();
      let results = searchIndex;
      if (query) {
        const lower = query.toLowerCase();
        results = searchIndex
          .map((it) => {
            const titleHit = it.title.toLowerCase().includes(lower);
            const snippetHit = it.snippet.toLowerCase().includes(lower);
            const score = (titleHit ? 2 : 0) + (snippetHit ? 1 : 0);
            return { ...it, score };
          })
          .filter((it) => it.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 30);
      } else {
        results = searchIndex.slice(0, 30);
      }
      if (results.length === 0) {
        list.innerHTML =
          '<li class="search-results__empty">没有找到匹配的章节，换个关键词试试？</li>';
        return;
      }
      list.innerHTML = results
        .map(
          (r) => `
          <li>
            <button class="search-result" data-id="${r.id}">
              <span>${highlight(r.title, query)}</span>
              <span class="search-result__path">${r.path} · ${highlight(
            r.snippet || "（无摘要）",
            query
          )}</span>
            </button>
          </li>`
        )
        .join("");
    }

    let activeIdx = 0;
    function moveActive(delta) {
      const items = $$(".search-result", list);
      if (items.length === 0) return;
      activeIdx = (activeIdx + delta + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle("is-active", i === activeIdx));
      items[activeIdx].scrollIntoView({ block: "nearest" });
    }
    function commit() {
      const items = $$(".search-result", list);
      const target = items[activeIdx] || items[0];
      if (!target) return;
      const id = target.dataset.id;
      close();
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#" + id);
      }
    }

    input.addEventListener("input", () => {
      activeIdx = 0;
      render(input.value);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveActive(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveActive(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    });
    list.addEventListener("click", (e) => {
      const btn = e.target.closest(".search-result");
      if (!btn) return;
      const id = btn.dataset.id;
      close();
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#" + id);
      }
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    if (trigger) trigger.addEventListener("click", open);

    // 全局快捷键
    document.addEventListener("keydown", (e) => {
      const tag = (e.target && e.target.tagName) || "";
      const inField = ["INPUT", "TEXTAREA"].includes(tag);
      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (modal.dataset.open === "true") close();
        else open();
        return;
      }
      if (!inField) {
        if (e.key === "/") {
          e.preventDefault();
          open();
        } else if (e.key.toLowerCase() === "t") {
          const cur = root.getAttribute("data-theme") || "auto";
          const order = ["auto", "paper", "dark", "sepia"];
          const next = order[(order.indexOf(cur) + 1) % order.length];
          applyTheme(next);
          localStorage.setItem(STORAGE_KEYS.theme, next);
          toast("主题: " + nextLabel(next));
        } else if (e.key.toLowerCase() === "g") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    });
  }
  function nextLabel(t) {
    return { auto: "跟随系统", paper: "纸感", dark: "深夜", sepia: "护眼" }[t] || t;
  }

  /* ----------------------------------------------------------
     11. 入场动画（章节卡片）
     ---------------------------------------------------------- */
  function bindFadeIn() {
    const els = $$(".fade-in");
    if (els.length === 0 || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-shown");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ----------------------------------------------------------
     12. Toast
     ---------------------------------------------------------- */
  let toastTimer = null;
  function toast(msg) {
    let el = $("#toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 1600);
  }

  /* ----------------------------------------------------------
     13. 计算阅读统计 (字数 + 估算时间)
     ---------------------------------------------------------- */
  function computeStats() {
    const main = $(".main");
    if (!main) return { words: 0, minutes: 0 };
    // 中文按字符算，英文按词算的简化实现：直接统计字符数 / 350 字/分钟
    const text = main.innerText.replace(/\s+/g, "");
    const words = text.length;
    const minutes = Math.max(1, Math.round(words / 350));
    return { words, minutes };
  }
  function fillStats() {
    const stats = computeStats();
    const w = $("#statWords");
    const t = $("#statMinutes");
    if (w) w.textContent = stats.words.toLocaleString();
    if (t) t.textContent = stats.minutes;
  }

  /* ----------------------------------------------------------
     14. 章节骨架增强 (色带 + section 包裹 + TL;DR 卡片 + 上下章导航)
     ---------------------------------------------------------- */
  const CHAPTER_TITLES = [
    "现代软件系统的对象",
    "软件架构工程",
    "技术栈设计",
    "架构协调",
    "平台工程、可观测性与内部开发平台",
    "前沿软硬件与新架构",
    "敏捷项目管理的正确位置",
    "综合案例",
    "编程语言、运行时与服务开发栈",
    "数据系统设计",
    "服务通信与集成",
    "部署与基础设施",
    "AI 原生开发与 Cursor 风格工程流",
    "一人开发工作流",
    "一人产品化与一人商业化",
    "一人公司",
  ];

  function bandForChapter(num) {
    if (num === 1) return 1;
    if (num === 2 || num === 7) return 2;
    if (num >= 3 && num <= 5) return 3;
    if (num === 6 || (num >= 8 && num <= 12)) return 4;
    if (num === 13 || num === 14) return 5;
    if (num >= 15) return 6;
    return 0;
  }

  const CHINESE_NUM = "零一二三四五六七八九十";
  function chineseNumber(n) {
    if (n <= 10) return CHINESE_NUM[n];
    if (n < 20) return "十" + (n === 10 ? "" : CHINESE_NUM[n - 10]);
    return String(n);
  }

  function shortChapterTitle(num) {
    return CHAPTER_TITLES[num - 1] || "";
  }

  function findChapterH2s() {
    const main = $(".main");
    if (!main) return [];
    return $$('h2[id]', main).filter(
      (h) =>
        !h.closest(".hero") &&
        !h.closest(".chapter-map") &&
        /^第[一二三四五六七八九十]+章/.test(h.textContent.trim())
    );
  }

  function buildTLDRCard(judgments, num) {
    const card = document.createElement("aside");
    card.className = "tldr-card";
    card.dataset.band = String(bandForChapter(num));
    card.setAttribute("aria-label", "本章 TL;DR");
    const items = judgments
      .map(
        (j) =>
          `<li><span class="tldr-card__bullet" aria-hidden="true"></span><span>${escHtml(
            j
          )}</span></li>`
      )
      .join("");
    card.innerHTML = `
      <div class="tldr-card__head">
        <span class="tldr-card__icon" aria-hidden="true">★</span>
        <div>
          <div class="tldr-card__eyebrow">TL;DR · 本章必须记住的判断</div>
          <div class="tldr-card__title">第${chineseNumber(num)}章 · ${escHtml(
      shortChapterTitle(num)
    )}</div>
        </div>
      </div>
      <ol class="tldr-card__list">${items}</ol>
      <div class="tldr-card__foot">读完本章你应当能 <em>判断</em>、<em>解释</em>、<em>预测</em>，而不只是<em>记住名词</em>。</div>
    `;
    return card;
  }

  function injectTLDRForChapter(h2, chapterEnd, num) {
    let node = h2.nextElementSibling;
    while (node && node !== chapterEnd) {
      const table =
        node.tagName === "TABLE"
          ? node
          : node.classList && node.classList.contains("table-wrap")
          ? node.querySelector("table")
          : null;
      if (table) {
        const firstTh = table.querySelector("thead th");
        if (firstTh && /先记住的判断/.test(firstTh.textContent)) {
          const rows = $$("tbody tr", table);
          if (rows.length >= 1) {
            const judgments = rows
              .slice(0, 3)
              .map((row) => {
                const td = row.querySelector("td");
                return td ? td.textContent.trim() : "";
              })
              .filter(Boolean);
            if (judgments.length >= 2) {
              const card = buildTLDRCard(judgments, num);
              const insertBefore =
                node.classList && node.classList.contains("table-wrap")
                  ? node
                  : table;
              insertBefore.parentNode.insertBefore(card, insertBefore);
              return;
            }
          }
        }
      }
      node = node.nextElementSibling;
    }
  }

  function buildChapterNav(num, chapters) {
    const nav = document.createElement("nav");
    nav.className = "chapter-nav";
    nav.setAttribute("aria-label", `第${chineseNumber(num)}章导航`);
    const prev = num > 1 ? chapters[num - 2] : null;
    const next = num < chapters.length ? chapters[num] : null;

    const prevHTML = prev
      ? `<a class="chapter-nav__btn chapter-nav__btn--prev" href="#${prev.id}">
          <span class="chapter-nav__dir">← 上一章</span>
          <span class="chapter-nav__title">第${chineseNumber(num - 1)}章 · ${escHtml(
          shortChapterTitle(num - 1)
        )}</span>
        </a>`
      : `<span class="chapter-nav__btn chapter-nav__btn--prev is-disabled" aria-disabled="true">
          <span class="chapter-nav__dir">— 已是第一章 —</span>
        </span>`;

    const mapHTML = `<a class="chapter-nav__btn chapter-nav__btn--map" href="#chapter-map-title" aria-label="返回学习地图">
        <span class="chapter-nav__dir">↑ 学习地图</span>
        <span class="chapter-nav__title">查看全部 16 章</span>
      </a>`;

    const nextHTML = next
      ? `<a class="chapter-nav__btn chapter-nav__btn--next" href="#${next.id}">
          <span class="chapter-nav__dir">下一章 →</span>
          <span class="chapter-nav__title">第${chineseNumber(num + 1)}章 · ${escHtml(
          shortChapterTitle(num + 1)
        )}</span>
        </a>`
      : `<span class="chapter-nav__btn chapter-nav__btn--next is-disabled" aria-disabled="true">
          <span class="chapter-nav__dir">— 已是最后一章 —</span>
        </span>`;

    nav.innerHTML = prevHTML + mapHTML + nextHTML;
    return nav;
  }

  function wrapChapterSections(chapters) {
    chapters.forEach((h2, idx) => {
      const num = idx + 1;
      const band = bandForChapter(num);
      const next = chapters[idx + 1] || null;

      const section = document.createElement("section");
      section.className = "chapter-section";
      section.id = "chapter-" + num;
      section.dataset.chapter = String(num);
      section.dataset.band = String(band);
      section.setAttribute("aria-labelledby", h2.id);

      // 收集从 h2 到下一章 h2 之前所有兄弟节点
      const parent = h2.parentNode;
      h2.parentNode.insertBefore(section, h2);
      let node = h2;
      const toMove = [];
      while (node && node !== next) {
        toMove.push(node);
        node = node.nextElementSibling;
      }
      toMove.forEach((n) => section.appendChild(n));

      // 给 h2 自己也打上色带数据
      h2.classList.add("chapter-h2");
      h2.dataset.band = String(band);
      h2.dataset.chapter = String(num);

      // 章末导航
      const nav = buildChapterNav(num, chapters);
      section.appendChild(nav);
    });
  }

  function enhanceChapters() {
    const chapters = findChapterH2s();
    if (chapters.length === 0) return;

    // 先注入 TL;DR (要在 wrap 之前，因为 wrap 会改变兄弟关系，
    // 不过我们扫描终止条件用了 chapterEnd === next，所以放后面也行)
    chapters.forEach((h2, idx) => {
      const next = chapters[idx + 1] || null;
      injectTLDRForChapter(h2, next, idx + 1);
    });

    // 然后包裹成 section 并附加上下章导航
    wrapChapterSections(chapters);
  }

  /* ----------------------------------------------------------
     启动
     ---------------------------------------------------------- */
  function init() {
    bindSettings();
    bindMenu();
    bindProgress();
    wrapTables();
    enhanceChapters();
    injectAnchorButtons();
    injectCodeCopy();
    const items = buildSidebarTOC();
    buildSearchIndex(items);
    bindSidebarToggle();
    bindBackToTop();
    bindSearch();
    bindFadeIn();
    fillStats();
    // 兜底：anchor 跳转后首屏调整
    if (location.hash) {
      requestAnimationFrame(() => {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) target.scrollIntoView({ block: "start" });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
