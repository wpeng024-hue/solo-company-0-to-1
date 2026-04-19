#!/usr/bin/env python3
"""Replace the 6 placeholder PNG figures in index.html with crisp inline SVG diagrams.

Run from project root:  python3 _tools/inject_diagrams.py
This script is idempotent: running it twice produces the same result.
"""
from __future__ import annotations
import re
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"

# ---------------------------------------------------------------------------
# 6 SVG diagrams (theme-aware via CSS vars where supported)
# ---------------------------------------------------------------------------

# Color palette mirrors --band-1..6 in themes.css so the diagrams adapt
# to the surrounding paper / dark / sepia theme automatically.
SVG_FIG1 = '''<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="fig1-t fig1-d">
  <title id="fig1-t">现代软件系统五层结构图</title>
  <desc id="fig1-d">五个水平堆叠层，从下到上：基础设施层、资源抽象层、数据与中间件层、应用与服务层、交付与治理层。右侧标注"向上抽象"。</desc>
  <!-- 上方副标题 -->
  <text x="380" y="22" text-anchor="middle" font-size="13" class="dia-label-soft">五层之间的因果关系，比五层本身更重要</text>
  <!-- 第五层 交付与治理层 -->
  <g transform="translate(40,40)">
    <rect width="640" height="58" rx="10" style="fill:var(--band-3);fill-opacity:0.13;stroke:var(--band-3);stroke-width:1.4"/>
    <rect width="6" height="58" rx="3" style="fill:var(--band-3)"/>
    <text x="22" y="25" font-size="14" font-weight="700" class="dia-label-strong">第五层 · 交付与治理层</text>
    <text x="22" y="46" font-size="12" class="dia-label-soft">CI/CD · 可观测性 · 平台门户 · 服务目录 · 权限 · 工程度量</text>
  </g>
  <!-- 第四层 应用与服务层 -->
  <g transform="translate(40,108)">
    <rect width="640" height="58" rx="10" style="fill:var(--band-5);fill-opacity:0.13;stroke:var(--band-5);stroke-width:1.4"/>
    <rect width="6" height="58" rx="3" style="fill:var(--band-5)"/>
    <text x="22" y="25" font-size="14" font-weight="700" class="dia-label-strong">第四层 · 应用与服务层</text>
    <text x="22" y="46" font-size="12" class="dia-label-soft">API · 工作流 · BFF · 后台任务 · 业务能力</text>
  </g>
  <!-- 第三层 数据与中间件层 -->
  <g transform="translate(40,176)">
    <rect width="640" height="58" rx="10" style="fill:var(--band-6);fill-opacity:0.13;stroke:var(--band-6);stroke-width:1.4"/>
    <rect width="6" height="58" rx="3" style="fill:var(--band-6)"/>
    <text x="22" y="25" font-size="14" font-weight="700" class="dia-label-strong">第三层 · 数据与中间件层</text>
    <text x="22" y="46" font-size="12" class="dia-label-soft">事务数据库 · 缓存 · 消息队列 · 搜索 · 流处理 · 对象存储</text>
  </g>
  <!-- 第二层 资源抽象层 -->
  <g transform="translate(40,244)">
    <rect width="640" height="58" rx="10" style="fill:var(--band-1);fill-opacity:0.13;stroke:var(--band-1);stroke-width:1.4"/>
    <rect width="6" height="58" rx="3" style="fill:var(--band-1)"/>
    <text x="22" y="25" font-size="14" font-weight="700" class="dia-label-strong">第二层 · 资源抽象层</text>
    <text x="22" y="46" font-size="12" class="dia-label-soft">虚拟机 · 容器 · Kubernetes · Serverless · 编排与调度</text>
  </g>
  <!-- 第一层 基础设施层 -->
  <g transform="translate(40,312)">
    <rect width="640" height="58" rx="10" style="fill:var(--band-4);fill-opacity:0.13;stroke:var(--band-4);stroke-width:1.4"/>
    <rect width="6" height="58" rx="3" style="fill:var(--band-4)"/>
    <text x="22" y="25" font-size="14" font-weight="700" class="dia-label-strong">第一层 · 基础设施层</text>
    <text x="22" y="46" font-size="12" class="dia-label-soft">CPU · GPU · 内存 · 磁盘 · 网络 · 高速互联</text>
  </g>
  <!-- 右侧抽象方向轴 -->
  <g transform="translate(700,52)">
    <line x1="10" y1="0" x2="10" y2="306" class="dia-stroke" stroke-width="1.4" stroke-dasharray="4 4"/>
    <polygon points="10,-2 4,12 16,12" style="fill:var(--accent)"/>
    <text x="22" y="60" font-size="11" class="dia-label-soft" transform="rotate(90 22 60)">向上 · 抽象层级递增</text>
  </g>
</svg>'''

SVG_FIG2 = '''<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="fig2-t fig2-d">
  <title id="fig2-t">复杂度压力跨层传播图</title>
  <desc id="fig2-d">左侧四类压力（业务流量、组织规模、AI 负载、合规要求）沿箭头进入中间的五层系统结构，右侧汇集成"症状"清单。</desc>
  <text x="380" y="22" text-anchor="middle" font-size="13" class="dia-label-soft">压力先在某一层产生，再沿层间关系传播</text>
  <!-- 左：4 个压力源 -->
  <g font-size="12" font-weight="600">
    <g transform="translate(20,55)">
      <rect width="160" height="46" rx="10" style="fill:var(--band-2);fill-opacity:0.16;stroke:var(--band-2);stroke-width:1.4"/>
      <text x="80" y="20" text-anchor="middle" class="dia-label-strong">业务流量</text>
      <text x="80" y="36" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">峰值 / 区域差异</text>
    </g>
    <g transform="translate(20,125)">
      <rect width="160" height="46" rx="10" style="fill:var(--band-5);fill-opacity:0.16;stroke:var(--band-5);stroke-width:1.4"/>
      <text x="80" y="20" text-anchor="middle" class="dia-label-strong">组织规模</text>
      <text x="80" y="36" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">多团队并行</text>
    </g>
    <g transform="translate(20,195)">
      <rect width="160" height="46" rx="10" style="fill:var(--band-6);fill-opacity:0.16;stroke:var(--band-6);stroke-width:1.4"/>
      <text x="80" y="20" text-anchor="middle" class="dia-label-strong">AI 负载</text>
      <text x="80" y="36" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">GPU / 推理 / 向量</text>
    </g>
    <g transform="translate(20,265)">
      <rect width="160" height="46" rx="10" style="fill:var(--band-4);fill-opacity:0.16;stroke:var(--band-4);stroke-width:1.4"/>
      <text x="80" y="20" text-anchor="middle" class="dia-label-strong">合规要求</text>
      <text x="80" y="36" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">审计 / 隔离</text>
    </g>
  </g>
  <!-- 中：5 层（紧凑） -->
  <g transform="translate(260,52)">
    <rect width="240" height="34" rx="8" style="fill:var(--band-3);fill-opacity:0.15;stroke:var(--band-3);stroke-width:1.2"/>
    <text x="120" y="22" text-anchor="middle" font-size="12" font-weight="600" class="dia-label-strong">交付与治理层</text>
  </g>
  <g transform="translate(260,98)">
    <rect width="240" height="34" rx="8" style="fill:var(--band-5);fill-opacity:0.15;stroke:var(--band-5);stroke-width:1.2"/>
    <text x="120" y="22" text-anchor="middle" font-size="12" font-weight="600" class="dia-label-strong">应用与服务层</text>
  </g>
  <g transform="translate(260,144)">
    <rect width="240" height="34" rx="8" style="fill:var(--band-6);fill-opacity:0.15;stroke:var(--band-6);stroke-width:1.2"/>
    <text x="120" y="22" text-anchor="middle" font-size="12" font-weight="600" class="dia-label-strong">数据与中间件层</text>
  </g>
  <g transform="translate(260,190)">
    <rect width="240" height="34" rx="8" style="fill:var(--band-1);fill-opacity:0.15;stroke:var(--band-1);stroke-width:1.2"/>
    <text x="120" y="22" text-anchor="middle" font-size="12" font-weight="600" class="dia-label-strong">资源抽象层</text>
  </g>
  <g transform="translate(260,236)">
    <rect width="240" height="34" rx="8" style="fill:var(--band-4);fill-opacity:0.15;stroke:var(--band-4);stroke-width:1.2"/>
    <text x="120" y="22" text-anchor="middle" font-size="12" font-weight="600" class="dia-label-strong">基础设施层</text>
  </g>
  <!-- 箭头：四个压力 → 五层 -->
  <defs>
    <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" style="fill:var(--accent)"/>
    </marker>
  </defs>
  <g class="dia-stroke-accent" stroke-width="1.5" fill="none" marker-end="url(#ar)" stroke-opacity="0.7">
    <path d="M 184 78 L 256 76"/>
    <path d="M 184 148 L 256 116"/>
    <path d="M 184 218 L 256 162"/>
    <path d="M 184 288 L 256 254"/>
    <path d="M 184 78 C 230 110 230 140 256 156"/>
    <path d="M 184 148 C 230 170 230 200 256 206"/>
    <path d="M 184 218 C 230 240 230 250 256 252"/>
  </g>
  <!-- 右：症状 -->
  <g transform="translate(540,52)">
    <rect width="200" height="240" rx="12" style="fill:var(--accent);fill-opacity:0.06;stroke:var(--accent);stroke-width:1.2"/>
    <text x="100" y="22" text-anchor="middle" font-size="12" font-weight="700" class="dia-label-strong">系统呈现的症状</text>
    <g font-size="11" class="dia-label-soft">
      <text x="14" y="50">· 弹性 / 限流策略变复杂</text>
      <text x="14" y="74">· 部署节奏被联调拖慢</text>
      <text x="14" y="98">· 服务边界与团队边界错位</text>
      <text x="14" y="122">· 平台层不得不被强行抽象</text>
      <text x="14" y="146">· 观测成本与算力成本失衡</text>
      <text x="14" y="170">· 合规约束反向改变数据布局</text>
      <text x="14" y="194">· GPU / 推理排队反传给前端</text>
      <text x="14" y="218">· 运维事故沿链路放大</text>
    </g>
  </g>
  <text x="380" y="362" text-anchor="middle" font-size="11" class="dia-label-soft">→ 平台工程的真正作用，是为这些"传播路径"提供吸收能力</text>
</svg>'''

SVG_FIG3 = '''<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="fig3-t fig3-d">
  <title id="fig3-t">架构决策闭环图</title>
  <desc id="fig3-d">四个节点环形相连：决策、记录(ADR)、验证、复盘；中心写有"架构工程闭环"。</desc>
  <text x="380" y="22" text-anchor="middle" font-size="13" class="dia-label-soft">没有决策记录会失忆，没有验证会自信地犯错，没有复盘会重复偿还代价</text>
  <defs>
    <marker id="ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" style="fill:var(--accent)"/>
    </marker>
  </defs>
  <!-- 中心 -->
  <g transform="translate(380,200)">
    <circle r="62" style="fill:var(--accent);fill-opacity:0.08;stroke:var(--accent);stroke-width:1.4"/>
    <text y="-6" text-anchor="middle" font-size="13" font-weight="700" class="dia-label-strong">架构工程</text>
    <text y="14" text-anchor="middle" font-size="13" font-weight="700" class="dia-label-strong">闭环</text>
    <text y="34" text-anchor="middle" font-size="10" class="dia-label-soft">缺一即退化</text>
  </g>
  <!-- 4 个节点 (顶/右/底/左) -->
  <g font-size="13" font-weight="700">
    <g transform="translate(380,68)">
      <rect x="-90" y="-30" width="180" height="60" rx="12" style="fill:var(--band-2);fill-opacity:0.14;stroke:var(--band-2);stroke-width:1.5"/>
      <text y="-4" text-anchor="middle" class="dia-label-strong">① 决策 Decide</text>
      <text y="16" text-anchor="middle" font-size="11" font-weight="400" class="dia-label-soft">识别高代价、难逆转的决策</text>
    </g>
    <g transform="translate(620,200)">
      <rect x="-90" y="-30" width="180" height="60" rx="12" style="fill:var(--band-3);fill-opacity:0.14;stroke:var(--band-3);stroke-width:1.5"/>
      <text y="-4" text-anchor="middle" class="dia-label-strong">② 记录 ADR</text>
      <text y="16" text-anchor="middle" font-size="11" font-weight="400" class="dia-label-soft">写下背景、选项、取舍与后果</text>
    </g>
    <g transform="translate(380,332)">
      <rect x="-90" y="-30" width="180" height="60" rx="12" style="fill:var(--band-4);fill-opacity:0.14;stroke:var(--band-4);stroke-width:1.5"/>
      <text y="-4" text-anchor="middle" class="dia-label-strong">③ 验证 Validate</text>
      <text y="16" text-anchor="middle" font-size="11" font-weight="400" class="dia-label-soft">PoC · Spike · 压力实验</text>
    </g>
    <g transform="translate(140,200)">
      <rect x="-90" y="-30" width="180" height="60" rx="12" style="fill:var(--band-6);fill-opacity:0.14;stroke:var(--band-6);stroke-width:1.5"/>
      <text y="-4" text-anchor="middle" class="dia-label-strong">④ 复盘 Review</text>
      <text y="16" text-anchor="middle" font-size="11" font-weight="400" class="dia-label-soft">回看决策是否被现实证伪</text>
    </g>
  </g>
  <!-- 4 个箭头围成闭环 -->
  <g class="dia-stroke-accent" stroke-width="1.6" fill="none" marker-end="url(#ar3)">
    <path d="M 470 100 A 160 160 0 0 1 558 168"/>
    <path d="M 558 232 A 160 160 0 0 1 470 300"/>
    <path d="M 290 300 A 160 160 0 0 1 202 232"/>
    <path d="M 202 168 A 160 160 0 0 1 290 100"/>
  </g>
</svg>'''

SVG_FIG4 = '''<svg viewBox="0 0 760 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="fig4-t fig4-d">
  <title id="fig4-t">一人 AI 开发闭环图</title>
  <desc id="fig4-d">水平四阶段：探索 → 规划 → 实现 → 验证；底部反馈箭头从验证回到探索；上下用"上下文工程"和"验证闭环"两条带子贯穿。</desc>
  <text x="380" y="22" text-anchor="middle" font-size="13" class="dia-label-soft">阶段清晰，AI 才会成为工程放大器，而不是返工加速器</text>
  <defs>
    <marker id="ar4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" style="fill:var(--accent)"/>
    </marker>
  </defs>
  <!-- 上方贯穿带：上下文工程 -->
  <g transform="translate(40,52)">
    <rect width="680" height="26" rx="13" style="fill:var(--band-5);fill-opacity:0.10;stroke:var(--band-5);stroke-width:1.2;stroke-dasharray:4 3"/>
    <text x="340" y="17" text-anchor="middle" font-size="11" font-weight="700" class="dia-label-strong">上下文工程 · 代码库 / 约束 / 风险 / 历史决策 持续注入</text>
  </g>
  <!-- 4 个阶段 -->
  <g font-size="13" font-weight="700">
    <g transform="translate(40,108)">
      <rect width="150" height="80" rx="12" style="fill:var(--band-1);fill-opacity:0.14;stroke:var(--band-1);stroke-width:1.5"/>
      <text x="75" y="28" text-anchor="middle" class="dia-label-strong">① 探索</text>
      <text x="75" y="50" text-anchor="middle" font-size="11" font-weight="400" class="dia-label-soft">读代码 · 摸边界</text>
      <text x="75" y="66" text-anchor="middle" font-size="11" font-weight="400" class="dia-label-soft">还原约束</text>
    </g>
    <g transform="translate(218,108)">
      <rect width="150" height="80" rx="12" style="fill:var(--band-3);fill-opacity:0.14;stroke:var(--band-3);stroke-width:1.5"/>
      <text x="75" y="28" text-anchor="middle" class="dia-label-strong">② 规划</text>
      <text x="75" y="50" text-anchor="middle" font-size="11" font-weight="400" class="dia-label-soft">任务切分</text>
      <text x="75" y="66" text-anchor="middle" font-size="11" font-weight="400" class="dia-label-soft">定义验收标准</text>
    </g>
    <g transform="translate(396,108)">
      <rect width="150" height="80" rx="12" style="fill:var(--band-2);fill-opacity:0.14;stroke:var(--band-2);stroke-width:1.5"/>
      <text x="75" y="28" text-anchor="middle" class="dia-label-strong">③ 实现</text>
      <text x="75" y="50" text-anchor="middle" font-size="11" font-weight="400" class="dia-label-soft">边界内代理执行</text>
      <text x="75" y="66" text-anchor="middle" font-size="11" font-weight="400" class="dia-label-soft">小步 diff</text>
    </g>
    <g transform="translate(574,108)">
      <rect width="150" height="80" rx="12" style="fill:var(--band-4);fill-opacity:0.14;stroke:var(--band-4);stroke-width:1.5"/>
      <text x="75" y="28" text-anchor="middle" class="dia-label-strong">④ 验证</text>
      <text x="75" y="50" text-anchor="middle" font-size="11" font-weight="400" class="dia-label-soft">测试 · 预览</text>
      <text x="75" y="66" text-anchor="middle" font-size="11" font-weight="400" class="dia-label-soft">日志 · 可回滚</text>
    </g>
  </g>
  <!-- 阶段间向右箭头 -->
  <g class="dia-stroke-accent" stroke-width="1.6" fill="none" marker-end="url(#ar4)">
    <line x1="190" y1="148" x2="216" y2="148"/>
    <line x1="368" y1="148" x2="394" y2="148"/>
    <line x1="546" y1="148" x2="572" y2="148"/>
  </g>
  <!-- 下方贯穿带：验证闭环 + 反馈回路 -->
  <g transform="translate(40,212)">
    <rect width="680" height="26" rx="13" style="fill:var(--band-4);fill-opacity:0.10;stroke:var(--band-4);stroke-width:1.2;stroke-dasharray:4 3"/>
    <text x="340" y="17" text-anchor="middle" font-size="11" font-weight="700" class="dia-label-strong">验证闭环 · 自动测试 / Diff 审查 / 预览环境 / 一键回滚</text>
  </g>
  <!-- 反馈回路：从验证回到探索 -->
  <g class="dia-stroke-accent" stroke-width="1.6" fill="none" marker-end="url(#ar4)" stroke-dasharray="6 4">
    <path d="M 649 192 C 649 270 649 280 380 280 C 115 280 115 270 115 192"/>
  </g>
  <text x="380" y="298" text-anchor="middle" font-size="11" class="dia-label-soft">反馈回路 · 把"被证伪的假设"重新输入下一轮</text>
</svg>'''

SVG_FIG5 = '''<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="fig5-t fig5-d">
  <title id="fig5-t">vibe coding 失败模式图</title>
  <desc id="fig5-d">三层结构：上层"流畅的开始"，中层四个缺失（无边界/无验证/无上下文/无回滚），下层四种结果（错误堆积/难诊断/难维护/系统脆化），底部回到"流畅"形成恶性循环。</desc>
  <text x="380" y="22" text-anchor="middle" font-size="13" class="dia-label-soft">越是想靠"感觉"冲刺，越需要用结构化检查反向校准</text>
  <defs>
    <marker id="ar5" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" style="fill:var(--band-6)"/>
    </marker>
  </defs>
  <!-- 顶部：流畅的开始 -->
  <g transform="translate(280,46)">
    <rect width="200" height="46" rx="12" style="fill:var(--band-3);fill-opacity:0.16;stroke:var(--band-3);stroke-width:1.5"/>
    <text x="100" y="20" text-anchor="middle" font-size="13" font-weight="700" class="dia-label-strong">流畅的开始</text>
    <text x="100" y="36" text-anchor="middle" font-size="11" class="dia-label-soft">直觉式 prompt · 大量代码瞬间生成</text>
  </g>
  <!-- 中层：4 个缺失（红/灰带边） -->
  <g font-size="11" font-weight="600">
    <g transform="translate(40,128)">
      <rect width="160" height="56" rx="10" style="fill:var(--band-6);fill-opacity:0.12;stroke:var(--band-6);stroke-width:1.4"/>
      <text x="80" y="22" text-anchor="middle" class="dia-label-strong">无边界</text>
      <text x="80" y="40" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">改动范围不收敛</text>
    </g>
    <g transform="translate(220,128)">
      <rect width="160" height="56" rx="10" style="fill:var(--band-6);fill-opacity:0.12;stroke:var(--band-6);stroke-width:1.4"/>
      <text x="80" y="22" text-anchor="middle" class="dia-label-strong">无验证</text>
      <text x="80" y="40" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">没测试 / 没 diff 审查</text>
    </g>
    <g transform="translate(400,128)">
      <rect width="160" height="56" rx="10" style="fill:var(--band-6);fill-opacity:0.12;stroke:var(--band-6);stroke-width:1.4"/>
      <text x="80" y="22" text-anchor="middle" class="dia-label-strong">无上下文</text>
      <text x="80" y="40" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">不读历史 / 不认约束</text>
    </g>
    <g transform="translate(580,128)">
      <rect width="160" height="56" rx="10" style="fill:var(--band-6);fill-opacity:0.12;stroke:var(--band-6);stroke-width:1.4"/>
      <text x="80" y="22" text-anchor="middle" class="dia-label-strong">无回滚</text>
      <text x="80" y="40" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">坏改动无法快速撤回</text>
    </g>
  </g>
  <!-- 顶部到中层箭头 -->
  <g class="dia-stroke" stroke-width="1.4" fill="none" stroke-opacity="0.5" marker-end="url(#ar5)">
    <path d="M 360 96 L 120 124"/>
    <path d="M 380 96 L 300 124"/>
    <path d="M 400 96 L 480 124"/>
    <path d="M 420 96 L 660 124"/>
  </g>
  <!-- 底层：4 种结果 -->
  <g font-size="11" font-weight="600">
    <g transform="translate(40,228)">
      <rect width="160" height="56" rx="10" style="fill:var(--band-2);fill-opacity:0.12;stroke:var(--band-2);stroke-width:1.4"/>
      <text x="80" y="22" text-anchor="middle" class="dia-label-strong">错误堆积</text>
      <text x="80" y="40" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">小 bug 沉积成大 bug</text>
    </g>
    <g transform="translate(220,228)">
      <rect width="160" height="56" rx="10" style="fill:var(--band-2);fill-opacity:0.12;stroke:var(--band-2);stroke-width:1.4"/>
      <text x="80" y="22" text-anchor="middle" class="dia-label-strong">难以诊断</text>
      <text x="80" y="40" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">不知道哪一改出的事</text>
    </g>
    <g transform="translate(400,228)">
      <rect width="160" height="56" rx="10" style="fill:var(--band-2);fill-opacity:0.12;stroke:var(--band-2);stroke-width:1.4"/>
      <text x="80" y="22" text-anchor="middle" class="dia-label-strong">难以维护</text>
      <text x="80" y="40" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">没人(包括 AI)读得懂</text>
    </g>
    <g transform="translate(580,228)">
      <rect width="160" height="56" rx="10" style="fill:var(--band-2);fill-opacity:0.12;stroke:var(--band-2);stroke-width:1.4"/>
      <text x="80" y="22" text-anchor="middle" class="dia-label-strong">系统脆化</text>
      <text x="80" y="40" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">小改动引发连锁故障</text>
    </g>
  </g>
  <!-- 中→下箭头 -->
  <g class="dia-stroke" stroke-width="1.4" fill="none" stroke-opacity="0.5" marker-end="url(#ar5)">
    <line x1="120" y1="186" x2="120" y2="226"/>
    <line x1="300" y1="186" x2="300" y2="226"/>
    <line x1="480" y1="186" x2="480" y2="226"/>
    <line x1="660" y1="186" x2="660" y2="226"/>
  </g>
  <!-- 底部恶性回路：右下绕回顶部 -->
  <g class="dia-stroke" stroke-width="1.4" fill="none" stroke-opacity="0.6" stroke-dasharray="5 4" marker-end="url(#ar5)">
    <path d="M 660 290 C 740 340 740 70 480 70"/>
  </g>
  <text x="500" y="356" text-anchor="middle" font-size="11" class="dia-label-soft">→ 进入恶性循环：表面进展越快，底层越脆，调试越贵</text>
</svg>'''

SVG_FIG6 = '''<svg viewBox="0 0 760 460" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="fig6-t fig6-d">
  <title id="fig6-t">一人公司经营回路图</title>
  <desc id="fig6-d">六个环节围成回路：选题 → 产品 → 分发 → 转化 → 交付 → 复购，中心是"AI · 平台 · 自动化"承托整个回路。</desc>
  <text x="380" y="24" text-anchor="middle" font-size="13" class="dia-label-soft">一人公司不是"一个人扛", 而是把回路交给系统托住</text>
  <defs>
    <marker id="ar6" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" style="fill:var(--accent)"/>
    </marker>
  </defs>
  <!-- 中心 -->
  <g transform="translate(380,240)">
    <circle r="78" style="fill:var(--accent);fill-opacity:0.10;stroke:var(--accent);stroke-width:1.4"/>
    <text y="-12" text-anchor="middle" font-size="13" font-weight="700" class="dia-label-strong">AI · 平台 · 自动化</text>
    <text y="8" text-anchor="middle" font-size="11" class="dia-label-soft">承托整条回路</text>
    <text y="28" text-anchor="middle" font-size="11" class="dia-label-soft">让低人工干预成为可能</text>
  </g>
  <!-- 6 个节点：上、右上、右下、下、左下、左上 -->
  <g font-size="13" font-weight="700">
    <g transform="translate(380,84)">
      <rect x="-72" y="-26" width="144" height="52" rx="12" style="fill:var(--band-1);fill-opacity:0.16;stroke:var(--band-1);stroke-width:1.5"/>
      <text y="-2" text-anchor="middle" class="dia-label-strong">① 选题</text>
      <text y="16" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">人群 + 痛点 + 价差</text>
    </g>
    <g transform="translate(610,180)">
      <rect x="-72" y="-26" width="144" height="52" rx="12" style="fill:var(--band-3);fill-opacity:0.16;stroke:var(--band-3);stroke-width:1.5"/>
      <text y="-2" text-anchor="middle" class="dia-label-strong">② 产品</text>
      <text y="16" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">最小可验证闭环</text>
    </g>
    <g transform="translate(610,300)">
      <rect x="-72" y="-26" width="144" height="52" rx="12" style="fill:var(--band-5);fill-opacity:0.16;stroke:var(--band-5);stroke-width:1.5"/>
      <text y="-2" text-anchor="middle" class="dia-label-strong">③ 分发</text>
      <text y="16" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">内容 / SEO / 联名</text>
    </g>
    <g transform="translate(380,396)">
      <rect x="-72" y="-26" width="144" height="52" rx="12" style="fill:var(--band-6);fill-opacity:0.16;stroke:var(--band-6);stroke-width:1.5"/>
      <text y="-2" text-anchor="middle" class="dia-label-strong">④ 转化</text>
      <text y="16" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">注册 → 激活 → 付费</text>
    </g>
    <g transform="translate(150,300)">
      <rect x="-72" y="-26" width="144" height="52" rx="12" style="fill:var(--band-4);fill-opacity:0.16;stroke:var(--band-4);stroke-width:1.5"/>
      <text y="-2" text-anchor="middle" class="dia-label-strong">⑤ 交付</text>
      <text y="16" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">稳定 · 自助 · 可观测</text>
    </g>
    <g transform="translate(150,180)">
      <rect x="-72" y="-26" width="144" height="52" rx="12" style="fill:var(--band-2);fill-opacity:0.16;stroke:var(--band-2);stroke-width:1.5"/>
      <text y="-2" text-anchor="middle" class="dia-label-strong">⑥ 复购 / 留存</text>
      <text y="16" text-anchor="middle" font-size="10" font-weight="400" class="dia-label-soft">价值持续 · 续费回流</text>
    </g>
  </g>
  <!-- 6 段顺时针箭头 -->
  <g class="dia-stroke-accent" stroke-width="1.7" fill="none" marker-end="url(#ar6)">
    <path d="M 460 108 A 200 200 0 0 1 588 138"/>
    <path d="M 626 218 A 200 200 0 0 1 626 262"/>
    <path d="M 588 342 A 200 200 0 0 1 460 372"/>
    <path d="M 300 372 A 200 200 0 0 1 172 342"/>
    <path d="M 134 262 A 200 200 0 0 1 134 218"/>
    <path d="M 172 138 A 200 200 0 0 1 300 108"/>
  </g>
</svg>'''


FIGURES = [
    ("图1 现代软件系统五层结构图", "图 1", "现代软件系统五层结构图", SVG_FIG1),
    ("图2 复杂度压力跨层传播图", "图 2", "复杂度压力跨层传播图", SVG_FIG2),
    ("图3 架构决策闭环图", "图 3", "架构决策闭环图", SVG_FIG3),
    ("图4 一人 AI 开发闭环图", "图 4", "一人 AI 开发闭环图", SVG_FIG4),
    ("图5 vibe coding 失败模式图", "图 5", "vibe coding 失败模式图", SVG_FIG5),
    ("图6 一人公司经营回路图", "图 6", "一人公司经营回路图", SVG_FIG6),
]


def replace_figure(html: str, alt_text: str, num_label: str, title: str, svg: str) -> tuple[str, bool]:
    """Replace
        <p><strong>{num_label} {title}</strong></p>
        <p><img alt="{alt_text}" src="data:image/png;base64,...."></p>
    with a <figure class="diagram"> containing the SVG and a figcaption.

    Idempotent: if the <figure> already exists for this title, do nothing.
    """
    figure_html = (
        f'<figure class="diagram">\n'
        f'  {svg}\n'
        f'  <figcaption><b>{num_label}</b> {title}</figcaption>\n'
        f'</figure>'
    )

    # Already replaced? Look for existing figcaption with same title.
    if f'<figcaption><b>{num_label}</b> {title}</figcaption>' in html:
        return html, False

    # Pattern: <p><strong>{num_label} {title}</strong></p> then optional whitespace
    # then <p><img alt="{alt_text}" ...></p>
    pat = re.compile(
        r'<p><strong>'
        + re.escape(num_label) + r'\s+' + re.escape(title)
        + r'</strong></p>\s*<p><img alt="'
        + re.escape(alt_text)
        + r'" src="data:image/png;base64,[^"]+"\s*/?></p>',
        re.DOTALL,
    )
    new_html, n = pat.subn(figure_html, html, count=1)
    return new_html, n > 0


def main() -> int:
    if not INDEX.exists():
        print(f"ERROR: {INDEX} not found", file=sys.stderr)
        return 1

    html = INDEX.read_text(encoding="utf-8")
    original_size = len(html)

    changed_any = False
    for alt_text, num_label, title, svg in FIGURES:
        new_html, did = replace_figure(html, alt_text, num_label, title, svg)
        status = "✓ replaced" if did else "· already done / no match"
        print(f"  {num_label} {title:<30} → {status}")
        html = new_html
        changed_any = changed_any or did

    if changed_any:
        INDEX.write_text(html, encoding="utf-8")
        new_size = len(html)
        delta = original_size - new_size
        print(
            f"\nDone. {original_size:,} → {new_size:,} bytes "
            f"({delta:+,} bytes, {delta / 1024:+.1f} KB)"
        )
    else:
        print("\nNo changes were necessary.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
