/**
 * AI 划词解释代理 (Cloudflare Worker · OpenAI Chat Completions 兼容协议)
 *
 * 接收前端发来的 { text, context? }, 加 system prompt, 转发到上游 OpenAI 兼容
 * 端点 (env.API_BASE), 用 SSE 把流式响应原样回传浏览器.
 *
 * 安全 4 层:
 *   ① Origin 白名单            (env.ALLOWED_ORIGINS)
 *   ② 每 IP 每天调用上限        (env.DAILY_BUDGET_PER_IP, KV 计数)
 *   ③ 全局每天调用上限闸刀      (env.DAILY_BUDGET_GLOBAL)
 *   ④ 输入字符数 + 输出 token 上限
 *
 * BYOK: 浏览器若在 X-User-Key header 里带了用户自己的 key, 绕过限额计数,
 *       直接用用户的 key 转发, 这样别人 fork 也能用, 不消耗你的预算.
 *
 * Secrets:
 *   - API_KEY  (wrangler secret put API_KEY)  必填, 上游平台的密钥
 *
 * Vars (wrangler.toml [vars]):
 *   - API_BASE              上游兼容 OpenAI 的 endpoint
 *   - MODEL                 默认模型名
 *   - ALLOWED_ORIGINS       允许的 Origin (逗号分隔)
 *   - DAILY_BUDGET_PER_IP   每 IP 每天上限
 *   - DAILY_BUDGET_GLOBAL   全站每天上限
 *   - MAX_INPUT_CHARS       单次 text 最长字符
 *   - MAX_OUTPUT_TOKENS     单次最大输出 token
 */

const SYSTEM_PROMPT = `你是这本教材的"划词解释助手"。读者会从教材里划选一段文字，请用 1–3 段中文做出清晰、有判断的解释。

要求：
- 优先讲"它在解决什么问题"和"和它最像的具体场景或反面例子"
- 不要重复用户选中的原文，不要写"以下是解释"这种废话
- 如果是术语，第一次出现时给出英文原词（括号）
- 如果是长句，先一句话总结作者真正想说什么，再展开
- ≤ 250 字，简洁、不堆砌名词
- 全程用 markdown 输出（可用 **加粗** 与 \`code\`，但不要用 H1/H2/H3 标题）`;

export default {
  async fetch(request, env, ctx) {
    // ----- CORS preflight -----
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    // ----- 健康检查 -----
    if (request.method === "GET") {
      return json(
        {
          ok: true,
          model: env.MODEL || "(unset)",
          api_base: env.API_BASE || "(unset)",
          time: new Date().toISOString(),
        },
        200,
        request,
        env
      );
    }

    if (request.method !== "POST") {
      return json({ error: "method not allowed" }, 405, request, env);
    }

    // ----- ① Origin 白名单 -----
    const origin = request.headers.get("Origin") || "";
    const allowed = parseList(env.ALLOWED_ORIGINS);
    if (!allowed.includes(origin)) {
      return json(
        { error: "forbidden origin", origin, allowed },
        403,
        request,
        env
      );
    }

    // ----- 解析 body -----
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid json body" }, 400, request, env);
    }
    const text = (body && body.text) || "";
    const context = (body && body.context) || "";

    if (typeof text !== "string" || text.trim().length < 1) {
      return json({ error: "field 'text' required" }, 400, request, env);
    }
    const maxInput = parseInt(env.MAX_INPUT_CHARS || "1500", 10);
    if (text.length > maxInput) {
      return json(
        { error: `text too long (>${maxInput} chars)`, len: text.length },
        413,
        request,
        env
      );
    }

    // ----- BYOK: 用户自带 key 走快速通道 -----
    const userKey = (request.headers.get("X-User-Key") || "").trim();
    const useUserKey = userKey && /^sk-[\w-]{20,}$/.test(userKey);
    const apiKey = useUserKey ? userKey : env.API_KEY;
    if (!apiKey) {
      return json(
        { error: "server misconfigured: API_KEY not set" },
        500,
        request,
        env
      );
    }

    // ----- ② / ③ 限额（仅在使用代理 key 时才计数）-----
    if (!useUserKey) {
      const ip =
        request.headers.get("CF-Connecting-IP") ||
        request.headers.get("X-Real-IP") ||
        "unknown";
      const today = new Date().toISOString().slice(0, 10);
      const ipKey = `ip:${ip}:${today}`;
      const globalKey = `global:${today}`;
      const perIp = parseInt(env.DAILY_BUDGET_PER_IP || "50", 10);
      const globalCap = parseInt(env.DAILY_BUDGET_GLOBAL || "5000", 10);

      if (env.RATE_LIMIT) {
        const [ipCount, globalCount] = await Promise.all([
          env.RATE_LIMIT.get(ipKey),
          env.RATE_LIMIT.get(globalKey),
        ]);
        const ipN = parseInt(ipCount || "0", 10);
        const gN = parseInt(globalCount || "0", 10);
        if (ipN >= perIp) {
          return json(
            {
              error: "daily quota reached for your IP",
              hint: "可在「设置 → BYOK」里贴上你自己的 key 继续使用，或明天再来",
              limit: perIp,
            },
            429,
            request,
            env
          );
        }
        if (gN >= globalCap) {
          return json(
            {
              error: "global daily budget reached",
              hint: "今天的总额度已用完，请用 BYOK 或明天再试",
              limit: globalCap,
            },
            503,
            request,
            env
          );
        }
        // 异步增加计数（fire-and-forget）
        ctx.waitUntil(
          Promise.all([
            env.RATE_LIMIT.put(ipKey, String(ipN + 1), { expirationTtl: 90000 }),
            env.RATE_LIMIT.put(globalKey, String(gN + 1), { expirationTtl: 90000 }),
          ])
        );
      }
    }

    // ----- ④ 调用上游 (OpenAI Chat Completions 兼容协议) -----
    const apiBase = (env.API_BASE || "").replace(/\/+$/, "");
    if (!apiBase) {
      return json(
        { error: "server misconfigured: API_BASE not set" },
        500,
        request,
        env
      );
    }
    const model = env.MODEL || "gpt-4o-mini";
    const maxOut = parseInt(env.MAX_OUTPUT_TOKENS || "800", 10);
    const userPrompt = context
      ? `【所在章节】${context.slice(0, 600)}\n\n【读者划选的文字】\n${text}`
      : `【读者划选的文字】\n${text}`;

    const upstream = await fetch(apiBase, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.4,
        top_p: 0.9,
        max_tokens: maxOut,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return json(
        {
          error: "upstream error",
          status: upstream.status,
          detail: errText.slice(0, 600),
        },
        502,
        request,
        env
      );
    }

    // 直接把 SSE 流原样转发给浏览器
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders(request, env),
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  },
};

// ---------- helpers ----------
function parseList(s) {
  return (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = parseList(env && env.ALLOWED_ORIGINS);
  const allow = allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Key, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(obj, status, request, env) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
