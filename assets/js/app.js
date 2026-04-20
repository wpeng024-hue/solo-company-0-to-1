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
    readMode: "yrgs.readMode",
    focusDone: "yrgs.focusDone",
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
  function applyReadMode(mode) {
    const val = mode === "focus" ? "focus" : "book";
    root.setAttribute("data-readmode", val);
    $$('[data-readmode-pill]').forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        String(btn.dataset.readmodePill === val)
      );
    });
    document.body.classList.toggle("is-focus-mode", val === "focus");
  }

  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "auto";
  const savedFont = localStorage.getItem(STORAGE_KEYS.fontSize) || "m";
  const savedReadMode = localStorage.getItem(STORAGE_KEYS.readMode) || "book";
  applyTheme(savedTheme);
  applyFontSize(savedFont);
  applyReadMode(savedReadMode);

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
    $$('[data-readmode-pill]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const m = btn.dataset.readmodePill;
        applyReadMode(m);
        localStorage.setItem(STORAGE_KEYS.readMode, m);
        renderLearningDeck();
        toast(m === "focus" ? "已切到 ADHD 学习模式" : "已切到教材模式");
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
  // 抽屉式 sidebar 仅在 ≤1024px 生效 (与 main.css 的断点保持一致)
  const SIDEBAR_DRAWER_MQ = window.matchMedia("(max-width: 1024px)");
  function openSidebar() {
    if (!SIDEBAR_DRAWER_MQ.matches) return; // 桌面端 sidebar 永远显示, 不需要"打开"
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
    if (!btn) return;
    btn.addEventListener("click", openSidebar);
    // 桌面端隐藏整个按钮 (避免误点 + 视觉冗余, 桌面 sidebar 已永远在左侧显示)
    function syncBtnVisibility() {
      btn.style.display = SIDEBAR_DRAWER_MQ.matches ? "" : "none";
    }
    syncBtnVisibility();
    if (SIDEBAR_DRAWER_MQ.addEventListener) {
      SIDEBAR_DRAWER_MQ.addEventListener("change", syncBtnVisibility);
    } else if (SIDEBAR_DRAWER_MQ.addListener) {
      SIDEBAR_DRAWER_MQ.addListener(syncBtnVisibility);
    }
    // 切回桌面时, 自动关掉可能残留的抽屉状态
    if (SIDEBAR_DRAWER_MQ.addEventListener) {
      SIDEBAR_DRAWER_MQ.addEventListener("change", (e) => {
        if (!e.matches) closeSidebar();
      });
    }
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
          const order = ["auto", "studio", "threads", "paper", "dark"];
          const next = order[(order.indexOf(cur) + 1) % order.length];
          applyTheme(next);
          localStorage.setItem(STORAGE_KEYS.theme, next);
          toast("主题: " + nextLabel(next));
        } else if (e.key.toLowerCase() === "f") {
          const curMode = root.getAttribute("data-readmode") || "book";
          const nextMode = curMode === "focus" ? "book" : "focus";
          applyReadMode(nextMode);
          localStorage.setItem(STORAGE_KEYS.readMode, nextMode);
          renderLearningDeck();
          toast(nextMode === "focus" ? "学习模式: ADHD" : "学习模式: 教材");
        } else if (e.key.toLowerCase() === "g") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    });
  }
  function nextLabel(t) {
    return { auto: "跟随系统", studio: "Studio", threads: "Threads", meta: "Threads", paper: "纸感", dark: "深夜", sepia: "护眼" }[t] || t;
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
     14. ADHD 学习模式 (卡片导航 + 长段落折叠 + 勾选进度)
     ---------------------------------------------------------- */
  const learningState = {
    filter: "all",
    items: [],
    doneMap: loadFocusDoneMap(),
  };

  function loadFocusDoneMap() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.focusDone) || "{}");
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  }
  function saveFocusDoneMap() {
    try {
      localStorage.setItem(STORAGE_KEYS.focusDone, JSON.stringify(learningState.doneMap));
    } catch {}
  }
  function normalizeText(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }
  function truncateText(s, max = 92) {
    const txt = normalizeText(s);
    if (!txt) return "这一章建议先看 TL;DR 与图表，再进入正文。";
    return txt.length > max ? txt.slice(0, max) + "…" : txt;
  }
  function getChapterLabel(text, fallbackNum) {
    const m = text.match(/^第([一二三四五六七八九十\d]+)章/);
    if (m) return `第${m[1]}章`;
    return `第 ${fallbackNum} 章`;
  }
  function firstReadableParagraph(section) {
    // 只取正文段落，跳过摘要卡/术语卡/callout/表格图表说明
    const ps = $$("p", section).filter((p) => {
      if (p.closest(".section-summary")) return false;
      if (p.closest(".term-card__body")) return false;
      if (p.closest(".callout")) return false;
      if (p.closest(".tldr-card")) return false;
      if (p.closest("figure.diagram")) return false;
      if (p.closest(".table-wrap")) return false;
      const txt = normalizeText(p.textContent);
      return txt.length >= 24;
    });
    return ps[0] || null;
  }
  function collectLearningItems() {
    const sections = $$(".chapter-section");
    return sections.map((sec, idx) => {
      const h2 = sec.querySelector("h2[id]");
      const title = normalizeText(h2?.textContent || `第 ${idx + 1} 章`);
      const p = firstReadableParagraph(sec);
      const summary = truncateText(p?.textContent || "", 92);
      const hasFigure = !!sec.querySelector("figure.diagram");
      const hasTable = !!sec.querySelector(".table-wrap, table");
      const hasCallout = !!sec.querySelector(".callout, .section-summary, .tldr-card");
      return {
        id: h2?.id || `chapter-${idx + 1}`,
        chapterLabel: getChapterLabel(title, idx + 1),
        title,
        summary,
        hasFigure,
        hasTable,
        hasCallout,
      };
    });
  }
  function renderLearningDeck() {
    const deck = $("#learningDeck");
    const grid = $("#learningDeckGrid");
    const progress = $("#learningDeckProgress");
    if (!deck || !grid) return;

    learningState.items = collectLearningItems();
    const total = learningState.items.length;

    let shown = learningState.items;
    if (learningState.filter === "figure") {
      shown = shown.filter((i) => i.hasFigure);
    } else if (learningState.filter === "table") {
      shown = shown.filter((i) => i.hasTable);
    } else if (learningState.filter === "callout") {
      shown = shown.filter((i) => i.hasCallout);
    }

    const doneCount = learningState.items.filter((i) => learningState.doneMap[i.id]).length;
    if (progress) {
      progress.textContent =
        `完成进度 ${doneCount}/${total}` +
        (shown.length !== total ? ` · 当前筛选 ${shown.length} 章` : "");
    }

    if (shown.length === 0) {
      grid.innerHTML =
        '<div class="learning-empty">当前筛选下没有章节，换一个筛选试试。</div>';
      return;
    }

    grid.innerHTML = shown
      .map((item) => {
        const badges = [
          item.hasFigure ? '<span class="learning-badge">图解</span>' : "",
          item.hasTable ? '<span class="learning-badge">表格</span>' : "",
          item.hasCallout ? '<span class="learning-badge">要点卡</span>' : "",
        ]
          .filter(Boolean)
          .join("");
        const checked = learningState.doneMap[item.id] ? "checked" : "";
        const doneClass = learningState.doneMap[item.id] ? " is-done" : "";
        return `
          <article class="learning-card${doneClass}" data-id="${item.id}">
            <div class="learning-card__top">
              <span class="learning-card__chapter">${escHtml(item.chapterLabel)}</span>
              <label class="learning-card__done">
                <input type="checkbox" data-learning-done="${item.id}" ${checked} />
                <span>已读</span>
              </label>
            </div>
            <h3 class="learning-card__title">${escHtml(item.title)}</h3>
            <p class="learning-card__summary">${escHtml(item.summary)}</p>
            <div class="learning-card__meta">${badges}</div>
            <a class="learning-card__go" href="#${item.id}" data-learning-go="${item.id}">开始学习</a>
          </article>`;
      })
      .join("");
  }
  function bindLearningDeck() {
    const deck = $("#learningDeck");
    if (!deck) return;

    deck.addEventListener("click", (e) => {
      const filterBtn = e.target.closest("[data-learning-filter]");
      if (filterBtn) {
        const next = filterBtn.dataset.learningFilter || "all";
        learningState.filter = next;
        $$("[data-learning-filter]", deck).forEach((btn) => {
          btn.setAttribute("aria-pressed", String(btn.dataset.learningFilter === next));
        });
        renderLearningDeck();
        return;
      }
      const go = e.target.closest("[data-learning-go]");
      if (go) {
        // focus 模式下点击卡片后轻提示, 让用户知道支持 F 快捷回切
        const mode = root.getAttribute("data-readmode") || "book";
        if (mode === "focus") {
          toast("已跳转到章节 · 按 F 可切回教材模式");
        }
      }
    });

    deck.addEventListener("change", (e) => {
      const input = e.target.closest("input[data-learning-done]");
      if (!input) return;
      const id = input.dataset.learningDone;
      learningState.doneMap[id] = input.checked;
      saveFocusDoneMap();
      renderLearningDeck();
    });

    renderLearningDeck();
  }
  function decorateLongParagraphs() {
    const article = $("#book-content");
    if (!article) return;

    $$("p", article).forEach((p, idx) => {
      if (p.dataset.focusDecorated === "1") return;
      if (p.closest(".section-summary")) return;
      if (p.closest(".term-card__body")) return;
      if (p.closest(".callout")) return;
      if (p.closest(".tldr-card")) return;
      if (p.closest("blockquote")) return;
      if (p.closest("figure.diagram")) return;
      if (p.closest(".table-wrap")) return;
      if (p.closest(".learning-deck")) return;
      const txt = normalizeText(p.textContent);
      if (txt.length < 130) return;

      p.dataset.focusDecorated = "1";
      p.classList.add("focus-text");
      const btn = document.createElement("button");
      btn.className = "focus-text__toggle";
      btn.type = "button";
      btn.dataset.focusTarget = String(idx);
      btn.setAttribute("aria-expanded", "false");
      btn.textContent = "展开全文";
      btn.addEventListener("click", () => {
        const expanded = p.classList.toggle("is-expanded");
        btn.setAttribute("aria-expanded", String(expanded));
        btn.textContent = expanded ? "收起" : "展开全文";
      });
      p.insertAdjacentElement("afterend", btn);
    });
  }

  /* ----------------------------------------------------------
     15. 章节骨架增强 (色带 + section 包裹 + TL;DR 卡片 + 上下章导航)
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
     15. 移动端：把 <td> 自动注入 data-label（用于卡片化表格）
     ---------------------------------------------------------- */
  function injectTableDataLabels() {
    $$(".main table").forEach((table) => {
      const headers = $$("thead th", table).map((th) =>
        th.textContent.trim()
      );
      if (headers.length === 0) return;
      $$("tbody tr", table).forEach((row) => {
        $$("td", row).forEach((td, i) => {
          if (!td.hasAttribute("data-label") && headers[i]) {
            td.setAttribute("data-label", headers[i]);
          }
        });
      });
    });
  }

  /* ----------------------------------------------------------
     16. 移动端底部固定工具栏（滚动方向控制 + 4 按钮）
     仅在 viewport ≤ 768px 时注入并工作
     ---------------------------------------------------------- */
  const MOBILE_MQ = window.matchMedia("(max-width: 768px)");
  let mobileFab = null;
  let lastScrollY = 0;
  let scrollDirRaf = null;

  function buildMobileFab() {
    if (mobileFab) return mobileFab;
    const el = document.createElement("nav");
    el.className = "mobile-fab";
    el.setAttribute("aria-label", "移动端工具栏");
    el.innerHTML = `
      <button class="mobile-fab__btn" type="button" data-action="toc" aria-label="目录">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
        <span class="mobile-fab__label">目录</span>
      </button>
      <button class="mobile-fab__btn" type="button" data-action="search" aria-label="搜索">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span class="mobile-fab__label">搜索</span>
      </button>
      <button class="mobile-fab__btn" type="button" data-action="theme" aria-label="主题">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        <span class="mobile-fab__label">主题</span>
      </button>
      <button class="mobile-fab__btn" type="button" data-action="top" aria-label="回到顶部">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
        <span class="mobile-fab__label">顶部</span>
      </button>
    `;
    document.body.appendChild(el);

    el.addEventListener("click", (e) => {
      const btn = e.target.closest(".mobile-fab__btn");
      if (!btn) return;
      const action = btn.dataset.action;
      switch (action) {
        case "toc":
          openSidebar();
          break;
        case "search":
          $("#searchTrigger")?.click();
          break;
        case "theme": {
          // 轮换 5 个主题
          const cur = root.getAttribute("data-theme") || "auto";
          const order = ["auto", "studio", "threads", "paper", "dark"];
          const next = order[(order.indexOf(cur) + 1) % order.length];
          applyTheme(next);
          localStorage.setItem(STORAGE_KEYS.theme, next);
          toast(
            "主题：" +
              ({ auto: "跟随系统", studio: "Studio", threads: "Threads", paper: "纸感", dark: "深夜", sepia: "护眼" }[
                next
              ] || next)
          );
          break;
        }
        case "top":
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
      }
    });

    mobileFab = el;
    return el;
  }

  function destroyMobileFab() {
    if (mobileFab) {
      mobileFab.remove();
      mobileFab = null;
    }
  }

  function onScrollDirection() {
    if (scrollDirRaf || !mobileFab) return;
    scrollDirRaf = requestAnimationFrame(() => {
      const y = window.scrollY;
      const delta = y - lastScrollY;
      // 在顶部、底部附近永远显示
      const nearTop = y < 80;
      const nearBottom =
        y + window.innerHeight >= document.documentElement.scrollHeight - 100;
      if (nearTop || nearBottom) {
        mobileFab.classList.remove("is-hidden");
      } else if (Math.abs(delta) > 8) {
        // 向下滚动（delta>0）→ 隐藏；向上滚动（delta<0）→ 显示
        if (delta > 0) {
          mobileFab.classList.add("is-hidden");
        } else {
          mobileFab.classList.remove("is-hidden");
        }
      }
      lastScrollY = y;
      scrollDirRaf = null;
    });
  }

  function applyMobileMode(isMobile) {
    if (isMobile) {
      buildMobileFab();
      window.addEventListener("scroll", onScrollDirection, { passive: true });
      lastScrollY = window.scrollY;
    } else {
      window.removeEventListener("scroll", onScrollDirection);
      destroyMobileFab();
    }
  }

  function bindMobileMode() {
    applyMobileMode(MOBILE_MQ.matches);
    // 旋屏 / 调窗口大小时切换
    if (MOBILE_MQ.addEventListener) {
      MOBILE_MQ.addEventListener("change", (e) => applyMobileMode(e.matches));
    } else if (MOBILE_MQ.addListener) {
      MOBILE_MQ.addListener((e) => applyMobileMode(e.matches));
    }
  }

  /* ----------------------------------------------------------
     17. AI 划词解释 + 知识柜 (Cloudflare Worker 代理, 支持 BYOK)
     ----------------------------------------------------------
     工作流:
       划词 → 气泡按钮 → 点击 → 右侧面板打开 → SSE 流式输出
       支持: ⌘/Ctrl+J 触发 | localStorage 缓存最近 50 条 | 一键复制
     知识柜 (Stash):
       右边缘小尖头 → 点击展开 → 卡片列表
       每张卡片 = 原文 + AI 答案 + 用户想法 (textarea, 自动保存)
     缓存条目 schema:
       { q: 原文, a: AI 答案, c: 章节标题, n: 用户笔记, u: 笔记更新时间, t: 最后查询时间 }
       (老条目只有 {a, t}, 渲染时按缺省字段降级)
     ---------------------------------------------------------- */

  // 当前部署 URL (PENG 的 Cloudflare 账号)
  // 如果你 fork 了这个项目, 部署完自己的 Worker 后请改成你的 URL
  // 部署指引: worker/README.md
  const WORKER_URL = "https://gemini-explainer.wpeng024.workers.dev";

  STORAGE_KEYS.byokKey = "yrgs.byokKey";
  STORAGE_KEYS.explainCache = "yrgs.explainCache";

  const explainState = {
    bubble: null,
    panel: null,
    stash: null,
    stashHandle: null,
    stashOpen: false,
    selectionText: "",
    selectionRect: null,
    abortCtrl: null,
    cache: loadExplainCache(),
  };

  function loadExplainCache() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.explainCache) || "{}");
    } catch {
      return {};
    }
  }
  function saveExplainCache() {
    try {
      // 保留最近 50 条
      const entries = Object.entries(explainState.cache);
      if (entries.length > 50) {
        entries.sort((a, b) => b[1].t - a[1].t);
        const trimmed = Object.fromEntries(entries.slice(0, 50));
        explainState.cache = trimmed;
      }
      localStorage.setItem(
        STORAGE_KEYS.explainCache,
        JSON.stringify(explainState.cache)
      );
    } catch {}
  }
  function cacheKey(text) {
    // 简单 hash, 同一段文字 → 同一个 key
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h << 5) - h + text.charCodeAt(i) | 0;
    return "k" + (h >>> 0).toString(36);
  }

  function getCurrentChapterTitle() {
    const sec = document.querySelector(".chapter-section:has(.chapter-h2)");
    if (!sec) return "";
    // 找视口里最靠上的 chapter-section
    const all = $$(".chapter-section");
    let curr = all[0];
    for (const s of all) {
      const r = s.getBoundingClientRect();
      if (r.top < 100) curr = s;
    }
    return curr ? curr.querySelector("h2")?.textContent.trim() || "" : "";
  }

  /* ===== 气泡 ===== */
  function ensureBubble() {
    if (explainState.bubble) return explainState.bubble;
    const el = document.createElement("button");
    el.className = "ai-bubble";
    el.type = "button";
    el.setAttribute("aria-label", "AI 解释这段");
    el.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" aria-hidden="true">
        <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z"/>
        <path d="M19 16 L19.6 18.4 L22 19 L19.6 19.6 L19 22 L18.4 19.6 L16 19 L18.4 18.4 Z"/>
      </svg>
      <span>AI 解释</span>
      <kbd class="ai-bubble__kbd">⌘J</kbd>
    `;
    el.addEventListener("mousedown", (e) => e.preventDefault()); // 防止丢失 selection
    el.addEventListener("click", openPanelWithCurrentSelection);
    document.body.appendChild(el);
    explainState.bubble = el;
    return el;
  }
  function showBubble(rect) {
    const b = ensureBubble();
    b.style.opacity = "1";
    b.style.pointerEvents = "auto";
    // 优先放选区上方; 顶部不够时放下方
    const margin = 10;
    const bw = 130, bh = 38;
    let top = rect.top + window.scrollY - bh - margin;
    let left = rect.left + window.scrollX + rect.width / 2 - bw / 2;
    if (top < window.scrollY + 60) {
      top = rect.bottom + window.scrollY + margin;
    }
    left = Math.max(8, Math.min(left, document.documentElement.clientWidth - bw - 8));
    b.style.top = top + "px";
    b.style.left = left + "px";
  }
  function hideBubble() {
    if (explainState.bubble) {
      explainState.bubble.style.opacity = "0";
      explainState.bubble.style.pointerEvents = "none";
    }
  }

  /* ===== 右侧面板 ===== */
  function ensurePanel() {
    if (explainState.panel) return explainState.panel;
    const el = document.createElement("aside");
    el.className = "ai-panel";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "false");
    el.setAttribute("aria-labelledby", "ai-panel-title");
    el.innerHTML = `
      <header class="ai-panel__head">
        <div class="ai-panel__title-wrap">
          <span class="ai-panel__eyebrow">AI 解释</span>
          <h3 id="ai-panel-title" class="ai-panel__title">划词解释</h3>
        </div>
        <button class="ai-panel__close icon-btn" type="button" aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </header>
      <div class="ai-panel__quote" id="ai-panel-quote"></div>
      <div class="ai-panel__body" id="ai-panel-body" aria-live="polite"></div>
      <footer class="ai-panel__foot">
        <button class="ai-panel__action" data-act="copy" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" width="14" height="14" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          复制答案
        </button>
        <button class="ai-panel__action" data-act="retry" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" width="14" height="14" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          再问一次
        </button>
        <span class="ai-panel__byok-hint" id="ai-panel-byok-hint"></span>
      </footer>
    `;
    document.body.appendChild(el);

    el.querySelector(".ai-panel__close").addEventListener("click", closePanel);
    el.querySelector('[data-act="copy"]').addEventListener("click", () => {
      const body = $("#ai-panel-body");
      if (!body) return;
      navigator.clipboard
        .writeText(body.innerText.trim())
        .then(() => toast("答案已复制"))
        .catch(() => toast("复制失败"));
    });
    el.querySelector('[data-act="retry"]').addEventListener("click", () => {
      if (explainState.selectionText) {
        // force=true 会跳过 cache 读取; 写回时保留旧的 n/u (笔记)
        runExplain(explainState.selectionText, true);
      }
    });
    explainState.panel = el;
    return el;
  }
  function openPanelWithCurrentSelection() {
    if (!explainState.selectionText) return;
    runExplain(explainState.selectionText, false);
    hideBubble();
  }
  function openPanel() {
    closeStash(); // 与笔记柜互斥, 避免两个抽屉叠在一起
    const p = ensurePanel();
    p.classList.add("is-open");
    document.body.style.overflowX = "hidden";
    // 更新 BYOK 提示
    const hint = $("#ai-panel-byok-hint");
    if (hint) {
      const k = (localStorage.getItem(STORAGE_KEYS.byokKey) || "").trim();
      hint.textContent = k ? "✓ 使用你自己的 key (BYOK)" : "由项目代付";
      hint.dataset.byok = k ? "true" : "false";
    }
  }
  function closePanel() {
    if (explainState.panel) explainState.panel.classList.remove("is-open");
    if (explainState.abortCtrl) {
      explainState.abortCtrl.abort();
      explainState.abortCtrl = null;
    }
    document.body.style.overflowX = "";
  }

  /* ===== 极简 markdown 渲染 (避免引第三方库) ===== */
  function renderMarkdown(md) {
    let s = escHtml(md);
    // code blocks
    s = s.replace(/```([\s\S]*?)```/g, (_m, c) => `<pre><code>${c}</code></pre>`);
    // inline code
    s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    // bold
    s = s.replace(/\*\*([^\*\n]+)\*\*/g, "<strong>$1</strong>");
    // italic
    s = s.replace(/(^|[^*])\*([^\*\n]+)\*([^*]|$)/g, "$1<em>$2</em>$3");
    // links
    s = s.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
    // 段落 (空行分段)
    s = s
      .split(/\n{2,}/)
      .map((p) => (p.trim() ? `<p>${p.replace(/\n/g, "<br/>")}</p>` : ""))
      .join("");
    return s;
  }

  /* ===== SSE 流式解析 (OpenAI Chat Completions 格式) =====
     无论是否 BYOK 都走 worker, worker 端会决定用哪把 key 调上游.
     这样既保证 CORS, 又用统一的协议格式 (OpenAI). */
  async function streamExplanation(text, contextStr, onChunk) {
    const userKey = (localStorage.getItem(STORAGE_KEYS.byokKey) || "").trim();
    const useByok = userKey && /^sk-[\w-]{20,}$/.test(userKey);

    const ctrl = new AbortController();
    explainState.abortCtrl = ctrl;

    const headers = { "Content-Type": "application/json" };
    if (useByok) headers["X-User-Key"] = userKey;

    const resp = await fetch(WORKER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, context: contextStr }),
      signal: ctrl.signal,
    });

    if (!resp.ok) {
      let detail = "";
      try {
        const j = await resp.json();
        detail = j.error?.message || j.error || j.detail || JSON.stringify(j);
      } catch {
        detail = await resp.text().catch(() => "");
      }
      const err = new Error(detail || `HTTP ${resp.status}`);
      err.status = resp.status;
      throw err;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let full = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      // SSE: 事件以 "\n\n" 分隔, 每行以 "data: " 开头
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          if (payload === "[DONE]") return full;
          try {
            const obj = JSON.parse(payload);
            // OpenAI 兼容格式: choices[0].delta.content
            const part =
              obj.choices?.[0]?.delta?.content ||
              obj.choices?.[0]?.message?.content ||
              "";
            if (part) {
              full += part;
              onChunk(full);
            }
          } catch {
            /* ignore non-json fragment */
          }
        }
      }
    }
    return full;
  }

  /* ===== 主流程 ===== */
  async function runExplain(text, force) {
    openPanel();
    const quote = $("#ai-panel-quote");
    const body = $("#ai-panel-body");
    if (quote) quote.textContent = text;
    if (body)
      body.innerHTML =
        '<p class="ai-panel__loading">✨ AI 想想咋跟你说<span class="dots"></span></p>';

    const k = cacheKey(text);
    if (!force && explainState.cache[k]) {
      const cached = explainState.cache[k].a;
      if (body) body.innerHTML = renderMarkdown(cached);
      return;
    }

    const ctxTitle = getCurrentChapterTitle();

    try {
      const answer = await streamExplanation(text, ctxTitle, (incr) => {
        if (body) body.innerHTML = renderMarkdown(incr);
      });
      if (answer) {
        const prev = explainState.cache[k] || {};
        explainState.cache[k] = {
          q: text,
          a: answer,
          c: ctxTitle || prev.c || "",
          n: prev.n || "",
          u: prev.u || 0,
          t: Date.now(),
        };
        saveExplainCache();
        renderStashList();
        updateStashHandleBadge();
      }
    } catch (e) {
      if (e.name === "AbortError") return;
      if (body) {
        const isQuota = /quota|429|503|budget/i.test(e.message || "");
        body.innerHTML = `
          <div class="ai-panel__error">
            <p><strong>调用失败：</strong>${escHtml(e.message || "未知错误")}</p>
            ${
              isQuota
                ? '<p style="font-size:.88rem;opacity:.85">额度已用尽。可在<a href="#" id="ai-panel-go-byok">设置里贴上你自己的 key</a>继续使用。</p>'
                : ""
            }
          </div>`;
        const goByok = $("#ai-panel-go-byok");
        if (goByok) {
          goByok.addEventListener("click", (ev) => {
            ev.preventDefault();
            closePanel();
            $("#settingsTrigger")?.click();
            setTimeout(() => $("#byokInput")?.focus(), 200);
          });
        }
      }
    }
  }

  /* ===== 选区监听 ===== */
  function isSelectionInsideMain() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    const main = $(".main");
    if (!main || !main.contains(range.commonAncestorContainer)) return null;
    const text = sel.toString().trim();
    if (text.length < 2 || text.length > 1500) return null;
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return { text, rect };
  }
  function bindSelectionTrigger() {
    let raf = null;
    function check() {
      const sel = isSelectionInsideMain();
      if (!sel) {
        explainState.selectionText = "";
        explainState.selectionRect = null;
        hideBubble();
        return;
      }
      explainState.selectionText = sel.text;
      explainState.selectionRect = sel.rect;
      showBubble(sel.rect);
    }
    function debounced() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        check();
        raf = null;
      });
    }
    document.addEventListener("mouseup", debounced);
    document.addEventListener("touchend", debounced);
    document.addEventListener("selectionchange", debounced);

    // 全局快捷键 ⌘/Ctrl + J
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        const sel = isSelectionInsideMain();
        if (sel) {
          e.preventDefault();
          explainState.selectionText = sel.text;
          openPanelWithCurrentSelection();
        }
      } else if (e.key === "Escape" && explainState.panel?.classList.contains("is-open")) {
        closePanel();
      } else if (e.key === "Escape" && explainState.stashOpen) {
        closeStash();
      }
    });

    // 点击别处时关闭气泡（但不影响面板）
    document.addEventListener("mousedown", (e) => {
      if (!explainState.bubble) return;
      if (e.target.closest(".ai-bubble") || e.target.closest(".ai-panel")) return;
    });
  }

  /* ===== BYOK 表单注入设置弹层 ===== */
  function injectByokForm() {
    const menu = $("#settingsMenu");
    if (!menu || menu.querySelector("#byokInput")) return;
    const div = document.createElement("div");
    div.className = "menu__byok";
    div.innerHTML = `
      <div class="menu__title">AI 解释 · BYOK <span class="menu__opt">可选</span></div>
      <p class="menu__hint">贴你自己的 OpenAI 兼容 key (以 <code>sk-</code> 开头) 后, 划词解释将不再消耗站点额度。Key 只存在你浏览器 localStorage 里, 通过站点的代理转发到上游。</p>
      <div class="menu__byok-row">
        <input id="byokInput" class="menu__byok-input" type="password" placeholder="sk-..." autocomplete="off" spellcheck="false" />
        <button class="menu__pill menu__byok-btn" type="button" id="byokSave">保存</button>
        <button class="menu__pill menu__byok-btn menu__byok-btn--clear" type="button" id="byokClear" aria-label="清除">×</button>
      </div>
      <div class="menu__byok-status" id="byokStatus"></div>
    `;
    menu.appendChild(div);

    const input = $("#byokInput", div);
    const status = $("#byokStatus", div);
    function renderStatus() {
      const k = (localStorage.getItem(STORAGE_KEYS.byokKey) || "").trim();
      if (k && /^sk-[\w-]{20,}$/.test(k)) {
        status.innerHTML = `✅ 已启用 BYOK · <code>${k.slice(0, 6)}…${k.slice(-4)}</code>`;
        status.dataset.ok = "true";
      } else if (k) {
        status.innerHTML = "⚠️ 格式不对 (应该 sk- 开头)";
        status.dataset.ok = "false";
      } else {
        status.innerHTML = "未启用 (使用站点默认代理)";
        status.dataset.ok = "false";
      }
    }
    renderStatus();

    $("#byokSave", div).addEventListener("click", () => {
      const v = input.value.trim();
      if (!v) {
        toast("请先粘贴 key");
        return;
      }
      localStorage.setItem(STORAGE_KEYS.byokKey, v);
      input.value = "";
      renderStatus();
      toast("BYOK 已保存");
    });
    $("#byokClear", div).addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEYS.byokKey);
      input.value = "";
      renderStatus();
      toast("BYOK 已清除");
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        $("#byokSave", div).click();
      }
    });
  }

  /* ===== 知识柜 (Stash): 划过的词 + 自己的想法 ===== */

  function ensureStashHandle() {
    if (explainState.stashHandle) return explainState.stashHandle;
    const btn = document.createElement("button");
    btn.className = "ai-stash-handle";
    btn.type = "button";
    btn.dataset.empty = "true";
    btn.dataset.open = "false";
    btn.setAttribute("aria-label", "打开划词笔记柜");
    btn.title = "划词笔记柜 (按 N 切换)";
    btn.innerHTML = `
      <svg class="ai-stash-handle__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" aria-hidden="true">
        <polyline points="15 6 9 12 15 18"/>
      </svg>
      <span class="ai-stash-handle__count" id="ai-stash-count" hidden>0</span>
      <span class="ai-stash-handle__label">笔记</span>
    `;
    btn.addEventListener("click", () => {
      explainState.stashOpen ? closeStash() : openStash();
    });
    document.body.appendChild(btn);
    explainState.stashHandle = btn;
    return btn;
  }

  function updateStashHandleBadge() {
    ensureStashHandle();
    const count = Object.keys(explainState.cache).length;
    const el = $("#ai-stash-count");
    if (el) {
      if (count > 0) {
        el.hidden = false;
        el.textContent = count > 99 ? "99+" : String(count);
      } else {
        el.hidden = true;
      }
    }
    explainState.stashHandle.dataset.empty = count === 0 ? "true" : "false";
  }

  function ensureStash() {
    if (explainState.stash) return explainState.stash;
    const el = document.createElement("aside");
    el.className = "ai-stash";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "false");
    el.setAttribute("aria-labelledby", "ai-stash-title");
    el.innerHTML = `
      <header class="ai-stash__head">
        <div class="ai-stash__title-wrap">
          <span class="ai-stash__eyebrow">划词记录</span>
          <h3 id="ai-stash-title" class="ai-stash__title">我的笔记柜</h3>
        </div>
        <button class="ai-stash__close icon-btn" type="button" aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </header>
      <div class="ai-stash__toolbar">
        <input class="ai-stash__search" id="ai-stash-search" type="search" placeholder="搜原文 / 答案 / 我的笔记..." aria-label="搜索"/>
        <button class="ai-stash__clear" id="ai-stash-clear" type="button" title="清空所有卡片">清空</button>
      </div>
      <div class="ai-stash__list" id="ai-stash-list" tabindex="0"></div>
      <footer class="ai-stash__foot">
        留在你的浏览器（localStorage，最多 50 张）。换设备不会同步。
      </footer>
    `;
    document.body.appendChild(el);

    el.querySelector(".ai-stash__close").addEventListener("click", closeStash);
    el.querySelector("#ai-stash-clear").addEventListener("click", () => {
      const n = Object.keys(explainState.cache).length;
      if (!n) return;
      if (!confirm(`清空全部 ${n} 张卡片？包含你写的笔记，无法撤销。`)) return;
      explainState.cache = {};
      saveExplainCache();
      renderStashList();
      updateStashHandleBadge();
    });
    el.querySelector("#ai-stash-search").addEventListener("input", (e) => {
      renderStashList(e.target.value.trim());
    });

    explainState.stash = el;
    return el;
  }

  function openStash() {
    ensureStash();
    closePanel(); // 与解释面板互斥
    explainState.stash.classList.add("is-open");
    explainState.stashOpen = true;
    if (explainState.stashHandle) explainState.stashHandle.dataset.open = "true";
    renderStashList();
  }

  function closeStash() {
    // 关闭前 flush 所有 pending 的笔记保存定时器
    for (const t of Object.values(stashSaveTimers)) clearTimeout(t);
    stashSaveTimers = {};
    saveExplainCache();
    if (explainState.stash) explainState.stash.classList.remove("is-open");
    explainState.stashOpen = false;
    if (explainState.stashHandle) explainState.stashHandle.dataset.open = "false";
  }

  function relativeTime(ts) {
    if (!ts) return "未知时间";
    const diff = Date.now() - ts;
    const m = 60 * 1000, h = 60 * m, d = 24 * h;
    if (diff < m) return "刚刚";
    if (diff < h) return Math.floor(diff / m) + " 分钟前";
    if (diff < d) return Math.floor(diff / h) + " 小时前";
    if (diff < 30 * d) return Math.floor(diff / d) + " 天前";
    const date = new Date(ts);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  // 笔记的"in-memory 立即更新, localStorage 延迟写"机制
  let stashSaveTimers = {};
  function scheduleSaveCardNote(key, value) {
    if (!explainState.cache[key]) return;
    explainState.cache[key].n = value;
    explainState.cache[key].u = Date.now();
    clearTimeout(stashSaveTimers[key]);
    stashSaveTimers[key] = setTimeout(() => {
      saveExplainCache();
      delete stashSaveTimers[key];
    }, 600);
  }

  function renderStashList(filter = "") {
    if (!explainState.stash) return; // 还没构建过抽屉
    const list = $("#ai-stash-list");
    if (!list) return;

    const f = filter.toLowerCase();
    const entries = Object.entries(explainState.cache)
      .filter(([, v]) => {
        if (!f) return true;
        return (
          (v.q || "").toLowerCase().includes(f) ||
          (v.a || "").toLowerCase().includes(f) ||
          (v.n || "").toLowerCase().includes(f) ||
          (v.c || "").toLowerCase().includes(f)
        );
      })
      .sort((a, b) => (b[1].t || 0) - (a[1].t || 0));

    if (!entries.length) {
      list.innerHTML = `
        <div class="ai-stash__empty">
          ${
            filter
              ? `<p>没有匹配 "<strong>${escHtml(filter)}</strong>" 的卡片。</p>`
              : `<p><strong>笔记柜还是空的。</strong></p>
                 <p>选中正文里任意一段（≥2 个字），点出来的紫色 <em>AI 解释</em> 气泡，回答会自动收进这里。每张卡片下方都能写下你自己的判断、追问、案例。</p>`
          }
        </div>
      `;
      return;
    }

    list.innerHTML = entries
      .map(([k, v]) => {
        const quote = v.q || "（早期会话，原文未记录）";
        const answer = v.a || "";
        const note = v.n || "";
        const ctx = v.c || "";
        const time = relativeTime(v.t);
        const fullTime = v.t ? new Date(v.t).toLocaleString() : "";
        const hasAnswer = !!answer;
        return `
          <article class="ai-stash-card" data-key="${k}">
            <header class="ai-stash-card__head">
              <span class="ai-stash-card__time" title="${escHtml(fullTime)}">${escHtml(time)}</span>
              ${ctx ? `<span class="ai-stash-card__ctx" title="${escHtml(ctx)}">${escHtml(ctx)}</span>` : '<span class="ai-stash-card__ctx ai-stash-card__ctx--empty"></span>'}
              <button class="ai-stash-card__del icon-btn" type="button" data-act="del" aria-label="删除这张卡片" title="删除">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="14" height="14">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
            </header>
            <blockquote class="ai-stash-card__quote">${escHtml(quote)}</blockquote>
            ${
              hasAnswer
                ? `<details class="ai-stash-card__answer-wrap">
                     <summary>AI 答案</summary>
                     <div class="ai-stash-card__answer">${renderMarkdown(answer)}</div>
                   </details>`
                : ""
            }
            <label class="ai-stash-card__note-label" for="note-${k}">我的想法</label>
            <textarea
              id="note-${k}"
              class="ai-stash-card__note"
              rows="2"
              placeholder="写下你看到这段话时的判断、追问、自己的例子……"
              data-act="note"
            >${escHtml(note)}</textarea>
            <div class="ai-stash-card__foot">
              <button class="ai-stash-card__btn" type="button" data-act="copy">复制全部</button>
              ${v.q ? `<button class="ai-stash-card__btn" type="button" data-act="reask">重新问</button>` : ""}
            </div>
          </article>
        `;
      })
      .join("");

    // 绑定卡片内的所有交互
    list.querySelectorAll(".ai-stash-card").forEach((card) => {
      const key = card.dataset.key;
      const entry = explainState.cache[key];
      if (!entry) return;

      card.querySelector('[data-act="note"]')?.addEventListener("input", (e) => {
        scheduleSaveCardNote(key, e.target.value);
      });

      card.querySelector('[data-act="copy"]')?.addEventListener("click", () => {
        const parts = [`【原文】${entry.q || "(未记录)"}`];
        if (entry.a) parts.push(`【AI 答案】${entry.a}`);
        if (entry.n) parts.push(`【我的想法】${entry.n}`);
        if (entry.c) parts.push(`【出处】${entry.c}`);
        navigator.clipboard
          .writeText(parts.join("\n\n"))
          .then(() => toast("已复制原文 + 答案 + 想法"))
          .catch(() => toast("复制失败"));
      });

      card.querySelector('[data-act="reask"]')?.addEventListener("click", () => {
        if (!entry.q) {
          toast("这张卡片没记录原文，没法重新问");
          return;
        }
        runExplain(entry.q, true); // openPanel 内部会关掉笔记柜
      });

      card.querySelector('[data-act="del"]')?.addEventListener("click", () => {
        delete explainState.cache[key];
        saveExplainCache();
        renderStashList(filter);
        updateStashHandleBadge();
      });
    });
  }

  function bindAiExplain() {
    bindSelectionTrigger();
    injectByokForm();
    ensureStashHandle();
    updateStashHandleBadge();

    // N 键快捷打开笔记柜 (在没有输入框聚焦时)
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        explainState.stashOpen ? closeStash() : openStash();
      }
    });
  }

  /* ----------------------------------------------------------
     启动
     ---------------------------------------------------------- */
  function init() {
    bindSettings();
    bindMenu();
    bindProgress();
    wrapTables();
    injectTableDataLabels();
    enhanceChapters();
    decorateLongParagraphs();
    bindLearningDeck();
    injectAnchorButtons();
    injectCodeCopy();
    const items = buildSidebarTOC();
    buildSearchIndex(items);
    bindSidebarToggle();
    bindBackToTop();
    bindSearch();
    bindFadeIn();
    fillStats();
    bindMobileMode();
    bindAiExplain();
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
