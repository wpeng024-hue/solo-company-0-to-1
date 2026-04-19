# 🤖 AI 划词解释代理（Cloudflare Worker · OpenAI 兼容协议）

把这本教材的"划词 → AI 解释"特性背后的 API key 藏在 Cloudflare Worker 里，源代码可以公开，但 key 永远不会进入仓库或浏览器。

> 💡 这个 Worker 用的是 **OpenAI Chat Completions 兼容协议**（`/v1/chat/completions` + `Authorization: Bearer ...`），所以任何兼容 OpenAI 协议的供应商（OpenAI / Azure / 国内 t8star / OpenRouter / Together / 自部署 vLLM）都能直接用，只要换一下 `API_BASE` 和 `MODEL`。

## 🏗 架构

```text
浏览器 (公开源码)  ──POST {text, context}──►  这个 Worker (私有 secret)
                                              │
                                              │ Bearer ${API_KEY}
                                              ▼
                                            OpenAI 兼容 endpoint
                                            (env.API_BASE)

                          4 层防护：
                            ① Origin 白名单
                            ② 每 IP 每天限额
                            ③ 全局每天闸刀
                            ④ 输入字符 / 输出 token 上限
```

如果你不是 PENG 本人（即你 fork 了这本教材）：

| 用法 | 你需要做 | 适合谁 |
| :--- | :--- | :--- |
| **A. 启用 BYOK** | 在站点设置面板贴上自己的 `sk-...` key（仍然走原 worker，但用你的 key 计费） | 个人使用、纯尝鲜 |
| **B. 自己部署一个 Worker** | 按下面 4 步部署到自己的 CF 账号 | 想给你自己的读者群提供"代付费"体验 |

> ⚠️ **BYOK 也需要 worker 已部署**（OpenAI 兼容供应商通常不允许浏览器直接调用，会被 CORS 拦截，所以必须经过 Worker 中转）。

---

## 🚀 部署步骤（≤ 5 分钟）

### 0. 前置
- 一个免费的 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)
- 一把 OpenAI 兼容的 API key（OpenAI / Azure / t8star / OpenRouter 都可）
- 本地装好 Node.js 18+（`brew install node`）

### 1. 进入 worker 目录、装依赖、登录 CF

```bash
cd worker
npm install
npx wrangler login   # 弹浏览器让你授权
```

### 2. 创建 KV namespace（用于存放每日调用计数）

```bash
npx wrangler kv namespace create RATE_LIMIT
```

输出会包含一个 namespace id，类似：

```text
🌀 Creating namespace with title "gemini-explainer-RATE_LIMIT"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "abc1234567890fedcba"
```

**复制那个 `id`**，打开 [`wrangler.toml`](./wrangler.toml)，把 `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` 替换成你刚拿到的 id。

### 3. 把 API key 存为 secret（永远不会进入仓库）

```bash
npx wrangler secret put API_KEY
# 终端会弹一个隐藏输入框, 粘贴你的 sk-... 后回车
```

### 4. 部署！

```bash
npx wrangler deploy
```

成功后会输出类似：

```text
Published gemini-explainer (1.23 sec)
  https://gemini-explainer.<your-account>.workers.dev
```

**复制这个 URL**，打开仓库根目录 [`assets/js/app.js`](../assets/js/app.js)，把顶部的 `WORKER_URL` 常量改成它：

```js
const WORKER_URL = "https://gemini-explainer.<your-account>.workers.dev";
```

提交、推送，GitHub Pages 自动重新部署，30 秒后划词解释就能用了。

---

## 🛠 本地开发

```bash
cd worker
npm run dev    # 启动 wrangler dev, 默认 http://localhost:8787
```

`worker/.dev.vars` 文件用于本地存放 secret（**不要 commit**，已在 `.gitignore`）：

```text
API_KEY=sk-XXXXXXXXXXXXXXXXXXXXXXXXXX
```

调试时把 `app.js` 里 `WORKER_URL` 临时改成 `http://localhost:8787`。

---

## 🔧 调整参数

所有"非敏感"参数都在 [`wrangler.toml`](./wrangler.toml) 的 `[vars]` 里，改完 `npx wrangler deploy` 即生效：

| 变量 | 含义 | 默认值 |
| :--- | :--- | :--- |
| `API_BASE` | 上游 OpenAI 兼容 endpoint，必须能接 `/v1/chat/completions` 风格请求 | `https://ai.t8star.cn/v1/chat/completions` |
| `MODEL` | 默认调用的模型名 | `gemini-3.1-flash-lite-preview-thinking-minimal` |
| `ALLOWED_ORIGINS` | 允许的访问来源（防止别人薅你的 worker） | 你的 GitHub Pages + localhost |
| `DAILY_BUDGET_PER_IP` | 每个 IP 每天最多调用次数 | `50` |
| `DAILY_BUDGET_GLOBAL` | 全站当日总调用上限（**护栏**） | `5000` |
| `MAX_INPUT_CHARS` | 用户单次划选最长字符数 | `1500` |
| `MAX_OUTPUT_TOKENS` | 上游单次最大输出 token | `800` |

### 换供应商

只要新供应商兼容 OpenAI 协议，改两行就够：

```toml
# wrangler.toml
API_BASE = "https://api.openai.com/v1/chat/completions"   # 或者 OpenRouter / Azure / Together / vLLM ...
MODEL = "gpt-4o-mini"
```

然后 `npx wrangler secret put API_KEY` 重新设新 key，再 `npx wrangler deploy`。

---

## 💰 成本估算

| 资源 | 免费额度 | 你大概率不会超 |
| :--- | :--- | :--- |
| Cloudflare Workers 请求 | 100,000 / 天 | 一本教材的读者通常 < 1,000 / 天 |
| Cloudflare KV 读写 | 100,000 读 + 1,000 写 / 天 | 默认每次解释只产生 2 读 + 2 写 |
| 上游 LLM | 看你具体用谁 | 建议在上游平台后台**设月度上限**，防极端情况 |

预期每月**小于 $0**（除非被针对性攻击，但 4 层防护已经覆盖最常见的滥用模式）。

---

## ❓ 常见问题

**Q: 我的 API key 会不会被泄漏？**  
A: 不会。它只存在两个地方：① Cloudflare Worker 的加密 secret 里；② 上游平台的账号面板。**仓库里、浏览器里、任何 HTTP 请求里都看不到它**。

**Q: 别人 curl 我的 worker 怎么办？**  
A: 没有正确 `Origin` header 的请求会直接 403。即便伪造了 Origin，每 IP 每天 50 次的硬性上限也能挡住绝大多数滥用。如果遇到针对性攻击，去 Cloudflare 仪表盘开 Bot Fight Mode 即可。

**Q: KV 在不同地区会不会读到旧数据？**  
A: 会，CF KV 有 ~60s 的最终一致性窗口。但用作"今日计数"完全够用——最坏情况就是某个 IP 比限额多打了 ≤ 5% 的请求。

**Q: 我想给自己设月度上限怎么办？**  
A: Cloudflare 这边只用免费档基本不用担心钱。**LLM 上游平台的预算上限要在他们的后台设置**（OpenAI / Azure / t8star 都支持，去对应平台的 Usage Limits 页面）。

---

## 📜 许可

MIT，和主项目一致。
