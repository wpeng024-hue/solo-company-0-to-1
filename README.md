<div align="center">

# 一人公司 · 从 0 到 1

### 软件架构工程 × 敏捷项目管理 × AI 原生开发 × 一人商业化

**一本面向 2026 年现实环境、把"看懂系统 → 做对架构 → 用 AI 落地 → 经营成公司"完整串成一条线的开源教材。**

> 📣 **本项目为 ADHD 用户优化了易读性**：章首"必须记住的判断"卡片化、判断 → 案例 → 反模式 → 小结的固定节律、可见反馈点的章节结构，让注意力起伏较大时也能稳定推进。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)
[![Made with HTML](https://img.shields.io/badge/Made%20with-HTML%2FCSS%2FJS-orange?style=flat-square&logo=html5&logoColor=white)](./index.html)
[![Pages Ready](https://img.shields.io/badge/GitHub%20Pages-Ready-success?style=flat-square&logo=github)](https://pages.github.com/)
[![Reading Time](https://img.shields.io/badge/Reading%20Time-~6h-blue?style=flat-square&logo=readthedocs&logoColor=white)](#)
[![Chapters](https://img.shields.io/badge/Chapters-16-9cf?style=flat-square&logo=bookstack&logoColor=white)](#章节地图)
[![Lang](https://img.shields.io/badge/Language-中文-red?style=flat-square)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](./CONTRIBUTING.md)

<sub>一份可以直接读、可以直接部署、也可以直接 Fork 当模板的"出版级 + 工程级"学习项目。</sub>

[**📖 在线阅读**](#-在线阅读) · [**🚀 快速开始**](#-快速开始) · [**🗺 章节地图**](#-章节地图) · [**✨ 设计亮点**](#-设计亮点) · [**🤝 参与贡献**](./CONTRIBUTING.md)

</div>

---

## 🌟 为什么选这本书

> **本书最重要的学习结果，不是让你会背更多术语，而是让你逐步建立四种能力：看懂系统、做出架构判断、把 AI 放进受控开发流、把一人产品经营成可持续运转的公司级系统。**

市面上大量"软件工程"教材把架构、敏捷、AI、创业拆成互相分离的章节，读者最后只能得到一堆名词。这本书反过来：**用一个真实问题贯穿全部内容**——

> 一个原本不懂软件工程的人，如何在读完之后，理解现代软件工程的核心问题，再用敏捷思维与 AI 原生开发方法，做出有竞争力的一人产品，并把它经营成一人公司？

围绕这个主问题，本书完成三项升级：

| 升级 | 含义 |
| :--- | :--- |
| **解释性升级** | 重要概念被放回因果、场景与失败路径中解释，不再只给定义 |
| **图文化升级** | 配套系统分层、压力传播、AI 闭环、vibe coding 失败模式等多张概念图 |
| **执行性升级** | 每章不只讲"是什么"，还讲"如何判断"与"如何避免最贵的错误" |

---

## 📖 在线阅读

如果你只想立刻读：

- **本地一键打开**：克隆后双击 `index.html` 即可在浏览器中阅读，无需任何构建。
- **部署到 GitHub Pages**：本仓库已内置自动部署 workflow（见下方"🚀 一键部署"），推送后几十秒即可上线。

> 💡 推荐使用最新版的 Chrome、Edge、Safari 或 Firefox 阅读，以获得最佳的字体渲染与动画体验。

---

## 🚀 一键部署到 GitHub Pages

仓库已经预置 `.github/workflows/pages.yml`：每次推送到 `main` / `master` 分支，会**自动构建并部署整站到 GitHub Pages**。你只需做三件事：

```bash
# 1. 把项目推到你自己的 GitHub 仓库
git remote add origin https://github.com/<你的用户名>/<你的仓库名>.git
git branch -M main
git push -u origin main
```

```text
# 2. 打开仓库的 Settings → Pages
#    在 "Build and deployment" 下，将 Source 设置为：GitHub Actions
#    （只需点一次，之后每次推送都自动部署）

# 3. 等 30 秒，访问：
#    https://<你的用户名>.github.io/<你的仓库名>/
```

如果一切正常，仓库的 `Actions` 标签会出现一条绿色的 "Deploy to GitHub Pages" 记录，点进去能看到部署后的实际 URL。

> 🔒 **不会泄漏任何敏感信息**：本项目纯静态，不读环境变量，不调用任何 API。

---

## 🚀 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/wpeng024-hue/solo-company-0-to-1.git
cd solo-company-0-to-1

# 2. 任选一种方式启动本地预览
#    方式 A：直接双击 index.html
open index.html

#    方式 B：用 Python 起一个本地静态服务器
python3 -m http.server 8000
#    然后访问 http://localhost:8000

#    方式 C：用 Node.js (npx) 起一个静态服务器
npx serve .
```

**如果你想 Fork 当作个人知识库的模板**：删掉 `index.html` 中的全部 `<article>` 内容，保留导航栏、侧边目录、阅读进度、主题切换等组件，就能立刻获得一个开箱即用的"长文出版站"骨架。

---

## ✨ 设计亮点

这套阅读体验在视觉、互动与可访问性上做了大量打磨：

### 🎨 视觉与排版
- **三种主题**：温润纸感（默认）/ 深夜模式 / 经典护眼三套配色，所有色板与间距通过 CSS 变量统一管理。
- **可调字号 + 行距**：右上角设置面板支持随时切换 4 档字号，自动写入 `localStorage`。
- **语义化排版**：遵循出版级规范的字阶、行高、引文与表格设计，正文采用宋体 / Noto Serif，标题采用 Inter 与 PingFang 的组合。
- **章节色带**：6 个学习阶段（系统认知 / 架构 / 协调 / 平台 / AI / 一人公司）使用不同的左侧色带，长文也能一眼定位。

### 🧭 导航与互动
- **顶部阅读进度条**：实时显示阅读完成比例。
- **悬浮侧边目录**：自动从正文 `h2 / h3` 提取章节，滚动时高亮当前位置。
- **快捷键**：`/` 或 `Ctrl/⌘ + K` 打开搜索，`T` 切换主题，`G` 回到顶部。
- **章首速读卡片**：每个章节顶端的"必须记住的判断"被自动渲染成卡片，方便碎片化阅读。
- **回到顶部按钮**：滚动一定距离后淡入。
- **段落锚点复制**：鼠标停留在标题旁边可一键复制本节锚点链接。

### 🤖 AI 划词解释（OpenAI 兼容协议 · 可选 BYOK）
- **划词即解释**：选中正文任意 2–1500 字 → 屏幕浮出"AI 解释"小气泡 → 点击或按 `⌘ / Ctrl + J` → 右侧（手机底部）滑出面板，AI 流式生成解释
- **API key 完全不在前端**：本仓库只调一个无名的 Cloudflare Worker 代理，作者的 key 存在 Worker 的加密 secret 里，仓库源码与浏览器请求里都看不到
- **OpenAI 兼容协议**：上游 endpoint 配置即可换供应商（OpenAI / Azure / OpenRouter / 国内 t8star / 自部署 vLLM 都行），见 [`worker/README.md`](./worker/README.md)
- **4 层防护**：Origin 白名单 + 每 IP 每天 50 次 + 全站 5000 次 / 天闸刀 + 输入 1500 字上限
- **BYOK（Bring Your Own Key）**：fork 这个项目的人可以在站点设置里贴上自己的 `sk-` key（仅存浏览器 localStorage），仍走作者的 worker 中转但用你自己的 key 计费
- **结果缓存 + 复制 + 重问**：同一段文字第二次划选立即出结果，面板内一键复制 / 重新生成

### 🛠 工程与可维护性
- **零依赖**：纯 HTML + CSS + JS，没有任何打包工具、没有任何 npm 包，开箱即用。
- **模块化资源**：样式与逻辑分别在 `assets/css` 与 `assets/js`，便于二次开发。
- **可打印 / 可导 PDF**：`@media print` 已优化分页、隐藏交互组件，可直接 `Ctrl/⌘ + P` 输出出版级 PDF。
- **响应式布局**：桌面、平板、手机均做过断点适配，移动端折叠侧边目录，手感不打折。
- **可访问性**：`prefers-color-scheme`、`prefers-reduced-motion` 与键盘焦点环都有对应处理。

---

## 🗺 章节地图

全书共 **16 章**，按学习路径分为 **6 个阶段**：

```text
阶段一：建立系统全景         第 1 章 ─────┐
阶段二：理解架构本质         第 2 章       │  系统与架构基础
阶段三：选型与协调           第 3、4 章 ─┘
阶段四：平台与前沿           第 5、6 章   │  平台工程与新硬件
阶段五：实施机制与综合案例   第 7、8 章   │  敏捷与综合
阶段六：技术深描             第 9–12 章   │  技术栈深描
阶段七：AI 原生开发          第 13、14 章 │  Cursor 风格 + 一人开发流
阶段八：从产品到公司         第 15、16 章 │  一人商业化与一人公司
```

| # | 章节 | 主题定位 |
| :-: | :--- | :--- |
| 1 | 现代软件系统的对象 | 建立从基础设施到交付治理的系统全景 |
| 2 | 软件架构工程 | 理解架构的核心是高代价决策与质量属性 |
| 3 | 技术栈设计 | 学会从场景与约束出发进行技术选型 |
| 4 | 架构协调 | 接口、数据、发布与组织边界如何共同演化 |
| 5 | 平台工程与可观测性 | 内部开发平台如何降低认知负荷 |
| 6 | 前沿软硬件与新架构 | GPU、边缘、WASM、Agent 对系统设计的影响 |
| 7 | 敏捷项目管理的正确位置 | 敏捷如何承接复杂架构的实施与演进 |
| 8 | 综合案例 | 一个全球化 AI 协作平台的完整推演 |
| 9 | 编程语言、运行时与服务开发栈 | 语言选择如何反向影响架构 |
| 10 | 数据系统设计 | 事务、缓存、搜索、流与向量检索的组合 |
| 11 | 服务通信与集成 | REST、gRPC、消息、事件与工作流的边界 |
| 12 | 部署与基础设施 | VM、容器、K8s、Serverless、边缘的取舍 |
| 13 | AI 原生开发与 Cursor 风格工程流 | AI 编辑器、代理式编码、上下文工程 |
| 14 | 一人开发工作流 | 单人可执行的需求—架构—测试—部署流水线 |
| 15 | 一人产品化与一人商业化 | 认证、计费、回滚、数据闭环的最小商业底座 |
| 16 | 一人公司 | 用 AI、平台与自动化组合可持续经营系统 |

---

## 📁 项目结构

```text
一人公司-从0到1/
├── index.html                  # 阅读入口（GitHub Pages 默认页）
├── assets/
│   ├── css/
│   │   ├── main.css            # 排版、布局、组件、AI 面板样式
│   │   ├── mobile.css          # mobile-first 重排（≤768px 自动加载）
│   │   └── themes.css          # 三套主题配色变量
│   └── js/
│       └── app.js              # TOC、主题、搜索、AI 划词解释、移动 FAB 等
├── worker/                     # Cloudflare Worker (AI 划词解释代理)
│   ├── src/worker.js           # SSE 流式代理 + 4 层防护
│   ├── wrangler.toml           # CF 配置
│   ├── package.json
│   └── README.md               # 部署手册
├── .github/workflows/pages.yml # 自动部署到 GitHub Pages
├── README.md                   # 本文件
├── CONTRIBUTING.md             # 贡献指南
├── LICENSE                     # MIT
└── .gitignore
```

---

## 👤 关于作者 · 这本书为什么会出现

我是 **PENG**，一名**独立 Agent 开发者**，非技术背景出身。

2025 年末，AI 编辑器把"绕过编程门槛"这件事从口号变成了真实选项。我以为自己终于可以一个人做出真正属于自己的产品——然后我用了大半年时间，**在 vibe coding 能踩的每一个坑上，亲自踩了一遍**。

我曾在没有边界的 prompt 中迷失方向；曾被一段看似"能跑"的代码在生产环境里悄悄爆掉；曾在不理解架构的情况下，让 AI 一夜之间生成出三个互相冲突的版本；也曾在试图修复时，把一个已经接近成功的产品越改越脆。我不是技术出身，所以这些坑没有任何"老经验"替我兜底——每一个学费，都是用真实时间、真实金钱、真实焦虑一笔一笔交出去的。

> 这些教训共同浓缩成一句我希望你比我更早听到的话：  
> **AI 真正放大的不是代码，而是你做判断的能力。没有判断的开发越快，返工越快。**

这本书就是把那些"我独自踩过的贵坑"翻译成"集体可以绕开的便宜路径"的尝试。它不会教你更多名词，而是会教你在面对一个新机会时，能问出更好的问题：这个产品该不该做？哪部分自建、哪部分外购？哪些结构会在未来变贵？我现在到底处于探索、规划、实现还是验证？——这些问题，曾经救过我，也希望能省下你的下一笔学费。

---

## 🌱 加入学习小组 · 杜绝闭门造车

独立开发者最大的隐性成本，从来不是工时，而是**孤独中的重复试错**。一个人扛得住代码可以扛不住孤立，扛得住孤立扛不住盲区。所以这个仓库本质是一个**「方法论 + 案例库 + 同行小组」**项目，欢迎你以任意一种方式加入：

| 行动 | 怎么做 | 适合谁 |
| :--- | :--- | :--- |
| ⭐ **Star 仓库** | 点击仓库右上角 Star | 所有人 — 让算法把它推给更多 0→1 路上的人 |
| 🐛 **提 Issue** | [开一个新 Issue](https://github.com/wpeng024-hue/solo-company-0-to-1/issues/new/choose) | 提问 / 反馈错别字 / 报失败案例 / 提新章节建议 |
| 💬 **Discussion** | [加入讨论区](https://github.com/wpeng024-hue/solo-company-0-to-1/discussions) | **学习小组主阵地**：聊踩坑、聊突破、聊正在做的产品 |
| 🔀 **发起 PR** | [提交 Pull Request](https://github.com/wpeng024-hue/solo-company-0-to-1/pulls) | 修订内容 / 补真实案例 / 增加新章节 / 翻译成英文 |

> 我相信"独立"的反义词不是"团队"，而是 **"闭门造车"**。  
> 让我们一起，把那些昂贵的教训，变成廉价的共识。  
>   
> — PENG

更详细的贡献流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 📜 许可证

代码与样式部分采用 [MIT License](./LICENSE)。  
书籍正文、插图与示意图采用 **CC BY-NC-SA 4.0**：你可以自由分享与再创作，但**请保留署名、不可商用、必须以相同方式共享衍生作品**。

---

<div align="center">

**先理解，后判断；先判断，后设计；先设计，后实现；先闭环，后扩张；先做成产品，再做成公司。**

— 摘自结语

</div>
