#!/usr/bin/env node
/* ============================================================
   audit-ui.mjs — UI 组件 contract 自动审查
   ============================================================
   这是一个零依赖的轻量审查脚本, 专门捕捉那些 "CSS/HTML lint
   抓不到, 但渲染后视觉一定丑" 的设计 contract 违规.

   起因: <span class="metric metric--ok">$0–25/月</span>
        — CSS 合法、HTML 合法、lint 全过, 但 .metric 是给短数据
        徽章设计的 (≤12 字符), 长文本被 pill 形状 wrap 后变椭圆.
        这种 "组件被用错地方" 类型的 bug, 只有看渲染才知道,
        或者把它写成自动审查规则.

   用法:
     node _tools/audit-ui.mjs              # 审查 index.html
     node _tools/audit-ui.mjs --quiet      # 只在有问题时输出

   退出码:
     0 = 通过, 没有违规
     1 = 有违规, 适合作 git pre-commit / CI gate
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const FILE = path.join(ROOT, "index.html");
const QUIET = process.argv.includes("--quiet");

if (!fs.existsSync(FILE)) {
  console.error(`✗ index.html not found at ${FILE}`);
  process.exit(2);
}

const html = fs.readFileSync(FILE, "utf8");
const lines = html.split("\n");
const issues = [];

const lineOf = (offset) => html.substring(0, offset).split("\n").length;

/* ============================================================
   规则 1: .metric pill 内容长度审查
   .metric 是 999px / 10px 圆角徽章, 适合 ≤12 字符的极短数据.
   超过 12 字符: pill 形状下 wrap 会变椭圆畸形.
   ============================================================ */
const metricRe = /<span\s+class="metric(?:\s+metric--\w+)?"\s*>([^<]+)<\/span>/g;
for (const m of html.matchAll(metricRe)) {
  const content = m[1].trim();
  if (content.length > 12) {
    issues.push({
      file: "index.html",
      line: lineOf(m.index),
      rule: "metric-too-long",
      severity: "warn",
      msg: `.metric 内容 ${content.length} 字符 ("${content}"), pill 形状会变形. 建议: 用 <strong style="color:var(--accent)"> 替代, 或新建 .cost-chip 组件支持长文本.`,
    });
  }
}

/* ============================================================
   规则 2: 其他 pill 类组件文本长度
   .hero__badge / .topbar__chip / .key-point / .term-card__hint
   都是 999px pill, 长文本会 wrap 变形.
   ============================================================ */
const pillClasses = [
  { cls: "hero__badge", max: 18 },
  { cls: "topbar__chip", max: 24 },
  { cls: "key-point", max: 30 },
  { cls: "term-card__hint", max: 18 },
];
for (const { cls, max } of pillClasses) {
  const re = new RegExp(`<(?:span|button|a)\\s+[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([^<]+)</`, "g");
  for (const m of html.matchAll(re)) {
    const content = m[1].trim();
    if (content.length > max) {
      issues.push({
        file: "index.html",
        line: lineOf(m.index),
        rule: `${cls}-too-long`,
        severity: "warn",
        msg: `.${cls} 内容 ${content.length} 字符 (上限 ${max}): "${content.substring(0, 30)}${content.length > 30 ? "…" : ""}"`,
      });
    }
  }
}

/* ============================================================
   规则 3: <details> 必须有 <summary>
   没有 summary 浏览器渲染会显示原生 ▶ 三角, 视觉错乱.
   ============================================================ */
const detailsRe = /<details[^>]*>([\s\S]*?)<\/details>/g;
for (const m of html.matchAll(detailsRe)) {
  if (!/<summary[\s>]/.test(m[1])) {
    issues.push({
      file: "index.html",
      line: lineOf(m.index),
      rule: "details-no-summary",
      severity: "error",
      msg: `<details> 缺少 <summary> 子元素, 用户无法点开折叠卡`,
    });
  }
}

/* ============================================================
   规则 4: <img> 必须有 alt 属性 (无障碍)
   ============================================================ */
const imgRe = /<img\b(?![^>]*\balt=)[^>]*>/g;
for (const m of html.matchAll(imgRe)) {
  issues.push({
    file: "index.html",
    line: lineOf(m.index),
    rule: "img-no-alt",
    severity: "warn",
    msg: `<img> 缺 alt 属性 (无障碍): ${m[0].substring(0, 60).replace(/\n/g, " ")}…`,
  });
}

/* ============================================================
   规则 5: id 不能重复 (锚点会跳错)
   只检查显式 id="..." 属性
   ============================================================ */
const idMap = new Map();
const idRe = /\sid="([^"]+)"/g;
for (const m of html.matchAll(idRe)) {
  const id = m[1];
  const ln = lineOf(m.index);
  if (idMap.has(id)) {
    issues.push({
      file: "index.html",
      line: ln,
      rule: "duplicate-id",
      severity: "error",
      msg: `id="${id}" 与第 ${idMap.get(id)} 行重复, 锚点会跳错`,
    });
  } else {
    idMap.set(id, ln);
  }
}

/* ============================================================
   规则 6: section-summary 必须包含 eyebrow + title + list 三件套
   缺一个都视觉残缺
   ============================================================ */
const ssRe = /<aside\s+class="section-summary"[^>]*>([\s\S]*?)<\/aside>/g;
for (const m of html.matchAll(ssRe)) {
  const body = m[1];
  const ln = lineOf(m.index);
  if (!/section-summary__eyebrow/.test(body)) {
    issues.push({ file: "index.html", line: ln, rule: "section-summary-missing", severity: "warn", msg: ".section-summary 缺 .section-summary__eyebrow" });
  }
  if (!/section-summary__title/.test(body)) {
    issues.push({ file: "index.html", line: ln, rule: "section-summary-missing", severity: "warn", msg: ".section-summary 缺 .section-summary__title" });
  }
  if (!/section-summary__list/.test(body)) {
    issues.push({ file: "index.html", line: ln, rule: "section-summary-missing", severity: "warn", msg: ".section-summary 缺 .section-summary__list" });
  }
}

/* ============================================================
   规则 7: term-card 必须基于 <details> + <summary>
   不能用 div 模拟 (没有原生展开折叠能力)
   ============================================================ */
const termCardRe = /<(\w+)\s+class="term-card"/g;
for (const m of html.matchAll(termCardRe)) {
  if (m[1] !== "details") {
    issues.push({
      file: "index.html",
      line: lineOf(m.index),
      rule: "term-card-wrong-tag",
      severity: "error",
      msg: `.term-card 必须用 <details> 标签 (你用的是 <${m[1]}>), 否则点不开`,
    });
  }
}

/* ============================================================
   输出
   ============================================================ */
const errors = issues.filter((i) => i.severity === "error").length;
const warns = issues.filter((i) => i.severity === "warn").length;

if (issues.length === 0) {
  if (!QUIET) console.log("✓ UI audit passed: 0 contract violations.");
  process.exit(0);
}

console.log(`\n✗ UI audit found ${errors} error(s) + ${warns} warning(s):\n`);

for (const issue of issues) {
  const tag = issue.severity === "error" ? "ERROR" : "WARN ";
  console.log(`  [${tag}] ${issue.file}:${issue.line}  (${issue.rule})`);
  console.log(`         ${issue.msg}\n`);
}

console.log(`Summary: ${errors} error, ${warns} warning across ${issues.length} location(s).`);

// 只在有 error 时退出码非零, warning 不阻塞 (适合渐进引入)
process.exit(errors > 0 ? 1 : 0);
