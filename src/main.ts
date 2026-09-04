/** Boot the PsyTrance engine and render the fresh light control + visualization UI. */
import { Engine, STYLES, STYLE_NAMES } from "./engine/Engine";
import { noteName, scaleLabel } from "./engine/utils";
import type { LayerName, PlanSnapshot, PlayheadView } from "./engine/types";
import { PsyShader } from "./viz/PsyShader";

// ----------------------------- Styles (fresh light minimalism) -----------------------------
const CSS = document.createElement("style");
CSS.textContent = `
:root{
  --bg:#F6F7F6; --panel:#FFFFFF;
  --line:#E5E7EB; --line2:#D6DAE0;
  --text:#1F2328; --dim:#6B7280; --faint:#9CA3AF;
  --acc:#14B8A6; --acc-deep:#0D9488; --acc-soft:rgba(20,184,166,.10);
  --cell:#F1F3F4;
  --smooth:cubic-bezier(.22,1,.36,1);
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{color:var(--text);background:var(--bg);overflow:hidden;
  font-family:"Segoe UI",system-ui,-apple-system,sans-serif;position:relative}
/* faint instrument dot-grid backdrop */
body::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:radial-gradient(rgba(31,35,40,.045) 1px,transparent 1px);
  background-size:24px 24px}

#app{position:relative;z-index:1;height:100vh;display:flex;flex-direction:column;padding:16px 18px;gap:12px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;
  box-shadow:0 1px 2px rgba(31,35,40,.04)}

/* ---------------- header: brand + transport cluster ---------------- */
header{display:flex;align-items:center;gap:12px;padding:10px 16px;font-variant-numeric:tabular-nums}
.logo{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;font-size:17px;
  background:var(--acc);color:#fff;font-weight:700;flex-shrink:0}
.brand{display:flex;flex-direction:column;gap:1px;margin-right:4px}
header h1{font-size:14.5px;letter-spacing:3px;font-weight:700;color:var(--text)}
header .tag{font-size:10px;color:var(--faint);letter-spacing:1px}
.spacer{flex:1}
.vdiv{width:1px;height:26px;background:var(--line);margin:0 4px;flex-shrink:0}

.btn{border:1px solid transparent;border-radius:9px;background:var(--acc);color:#fff;
  font-weight:700;padding:9px 18px;font-size:13px;cursor:pointer;letter-spacing:.5px;
  transition:background .15s var(--smooth),border-color .15s var(--smooth),color .15s var(--smooth),transform .1s}
.btn:hover{background:var(--acc-deep)}
.btn:active{transform:translateY(1px)}
.btn.stop{background:var(--panel);color:var(--text);border-color:var(--line2)}
.btn.stop:hover{border-color:var(--acc);color:var(--acc-deep);background:var(--panel)}
.btn.icon{padding:8px 11px;background:var(--panel);color:var(--dim);border-color:var(--line);font-size:14px}
.btn.icon:hover{color:var(--acc-deep);border-color:var(--acc);background:var(--panel)}
.seedwrap{display:flex;align-items:center;gap:6px}
.seed{width:116px;background:#F6F7F8;border:1px solid var(--line);color:var(--text);
  border-radius:9px;padding:8px 11px;font-size:12.5px;font-variant-numeric:tabular-nums;outline:none;
  transition:border-color .15s}
.seed:focus{border-color:var(--acc)}
.mini{display:flex;align-items:center;gap:8px}
.mini label{font-size:10px;color:var(--faint);letter-spacing:1.2px;text-transform:uppercase}
.mini b{font-size:11.5px;color:var(--text);width:26px;font-variant-numeric:tabular-nums}
.mini input[type=range]{width:100px}

input[type=range]{-webkit-appearance:none;appearance:none;height:3px;border-radius:99px;
  background:#E8EAEC;outline:none;cursor:pointer}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;
  background:var(--acc);border:2px solid #fff;box-shadow:0 0 0 1px rgba(31,35,40,.12);cursor:pointer}
input[type=range]::-moz-range-thumb{width:13px;height:13px;border-radius:50%;
  background:var(--acc);border:2px solid #fff;box-shadow:0 0 0 1px rgba(31,35,40,.12);cursor:pointer}

.stat{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--dim);letter-spacing:.8px;text-transform:uppercase}
.livedot{width:7px;height:7px;border-radius:50%}
.live-dot{background:#C7CCD2}
.rec-dot{background:var(--acc);animation:breathe 1s ease-in-out infinite}
@keyframes breathe{50%{transform:scale(1.4);opacity:.35}}
#timecode{font-size:12.5px;font-weight:700;color:var(--text);letter-spacing:1px;min-width:44px;text-align:right}

/* ---------------- main: stage + sidebar ---------------- */
main{flex:1;display:grid;grid-template-columns:1fr 300px;gap:12px;min-height:0}
#scene{position:relative;overflow:hidden;min-height:0}
#scene canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#psyCanvas{z-index:0}
#viz{z-index:1}
.scene-title{position:absolute;left:14px;top:12px;z-index:2}
.scene-title h2{font-size:9px;letter-spacing:2.2px;color:var(--faint);text-transform:uppercase;font-weight:600}
.scene-hint{position:absolute;inset:0;display:grid;place-items:center;z-index:2;pointer-events:none;
  font-size:12.5px;color:var(--faint);letter-spacing:1.5px;transition:opacity .5s var(--smooth)}
.scene-over{position:absolute;left:14px;bottom:12px;display:flex;align-items:center;gap:8px;z-index:2;
  font-size:10px;letter-spacing:2.2px;color:var(--faint);text-transform:uppercase}
.scene-over .dot{width:6px;height:6px;border-radius:50%;background:var(--acc)}
.scene-over b{color:var(--text);font-size:12px;letter-spacing:2.5px}
.playhead-read{position:absolute;right:14px;bottom:12px;z-index:2;font-size:10.5px;color:var(--faint);
  letter-spacing:1.2px;font-variant-numeric:tabular-nums}
.playhead-read b{color:var(--acc-deep);font-size:11px}

aside{display:flex;flex-direction:column;gap:12px;min-height:0;overflow-y:auto;
  scrollbar-width:thin;scrollbar-color:#D6DAE0 transparent}
aside::-webkit-scrollbar{width:6px}aside::-webkit-scrollbar-thumb{background:#D6DAE0;border-radius:99px}
.panel{padding:14px 15px;flex-shrink:0}
.panel h2{font-size:9px;letter-spacing:2.2px;color:var(--faint);margin-bottom:11px;text-transform:uppercase;
  font-weight:700;display:flex;align-items:center;gap:8px}
.panel h2::after{content:"";flex:1;height:1px;background:var(--line)}
.row{display:flex;gap:6px;flex-wrap:wrap}
.chip{padding:7px 11px;border-radius:8px;border:1px solid var(--line);color:var(--dim);
  font-size:12px;cursor:pointer;transition:all .15s var(--smooth);background:var(--panel)}
.chip:hover{color:var(--text);border-color:var(--line2)}
.chip.active{background:var(--acc-soft);color:var(--acc-deep);border-color:rgba(20,184,166,.45);font-weight:600}
.ctl{display:flex;align-items:center;gap:10px;margin:10px 0}
.ctl label{width:58px;font-size:11.5px;color:var(--dim);flex-shrink:0}
.ctl input[type=range]{flex:1}
.ctl .val{width:28px;text-align:right;font-size:11.5px;color:var(--text);font-variant-numeric:tabular-nums;font-weight:600}
.hint{font-size:10.5px;color:var(--faint);line-height:1.7;margin-top:8px}

/* ---------------- footer: generation detail strip ---------------- */
#planner{height:192px;display:grid;grid-template-columns:225px 1fr 255px;flex-shrink:0}
.pl-blk{display:flex;flex-direction:column;gap:8px;padding:12px 16px;min-width:0;
  border-right:1px solid var(--line);overflow:hidden}
.pl-blk:last-child{border-right:0}
.pl-h{font-size:9px;letter-spacing:2.2px;color:var(--faint);font-weight:700;text-transform:uppercase}
#sectionBadge{font-size:21px;font-weight:800;letter-spacing:3px;color:var(--text);line-height:1}
#sectionBadge.flash{animation:sflash .45s var(--smooth)}
@keyframes sflash{0%{color:var(--acc);transform:translateY(2px)}100%{color:var(--text);transform:none}}
.plline{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.pill{font-size:10px;font-weight:600;letter-spacing:.3px;padding:3px 8px;border-radius:6px;
  border:1px solid var(--line);color:var(--dim);background:var(--panel);white-space:nowrap;
  cursor:pointer;transition:all .15s var(--smooth)}
.pill:hover{border-color:var(--acc);color:var(--acc-deep)}
.pill.on{background:var(--acc-soft);color:var(--acc-deep);border-color:rgba(20,184,166,.45)}
.pill.dim{opacity:.3}

/* 16-step sequencer grid */
#grid{display:flex;flex-direction:column;gap:3px}
.grow{display:grid;grid-template-columns:13px 40px repeat(16,1fr);gap:3px;align-items:center}
.grow .gname{font-size:8.5px;letter-spacing:1.3px;color:var(--faint);text-transform:uppercase;
  cursor:pointer;user-select:none;transition:color .15s}
.grow .gname:hover{color:var(--acc-deep)}
.grow .gname.flash{animation:gflash .5s var(--smooth)}
@keyframes gflash{0%{color:var(--acc-deep)}100%{color:var(--faint)}}
.mute{width:12px;height:12px;border-radius:3.5px;border:1px solid var(--line2);background:var(--panel);
  cursor:pointer;padding:0;position:relative;transition:all .15s var(--smooth)}
.mute::after{content:"";position:absolute;inset:2.5px;border-radius:2px;background:var(--acc)}
.mute:hover{border-color:var(--acc)}
.mute.off{border-color:var(--line)}
.mute.off::after{opacity:.15}
.grow.muted .gname{color:#D1D5DB}
.grow.muted .cell{filter:grayscale(1);opacity:.35}
.cell{height:13px;border-radius:3.5px;background:var(--cell);transition:background .1s linear}
.cell.cur{outline:1.5px solid var(--acc-deep);outline-offset:-1.5px}
.cell[data-col="0"],.cell[data-col="8"]{margin-right:1px}

/* markov chain block */
.markov-head{display:flex;align-items:baseline;gap:8px}
#markovNote{font-size:20px;font-weight:800;line-height:1;color:var(--text)}
.markov-lbl{font-size:9px;color:var(--faint);letter-spacing:1.5px;text-transform:uppercase}
#markovBars{display:flex;flex-direction:column;gap:4px}
.mbar{display:grid;grid-template-columns:32px 1fr 34px;align-items:center;gap:8px;font-size:10.5px}
.mbar s{font-weight:600;color:var(--dim);text-decoration:none}
.mbar .track{height:5px;border-radius:99px;background:var(--cell);position:relative;overflow:hidden}
.mbar .fill{position:absolute;inset:0 auto 0 0;height:100%;border-radius:99px;background:#C9CFD6;
  transition:width .28s var(--smooth),background .28s var(--smooth)}
.mbar.pick .fill{background:var(--acc)}
.mbar.pick s{color:var(--acc-deep);font-weight:700}
.mbar em{font-style:normal;text-align:right;color:var(--faint);font-variant-numeric:tabular-nums}
`;
document.head.appendChild(CSS);

// ----------------------------- App shell -----------------------------
const body = document.getElementById("app")!;
body.innerHTML = `
<header class="card">
  <div class="logo">ψ</div>
  <div class="brand">
    <h1>PSYTRANCE</h1>
    <span class="tag">无限迷幻生成引擎 · INFINITE</span>
  </div>
  <span class="spacer"></span>
  <button class="btn" id="playBtn">▶ 开始</button>
  <div class="seedwrap">
    <input id="seedInput" class="seed" type="text" spellcheck="false" placeholder="SEED" />
    <button class="btn icon" id="seedBtn" title="换一个随机种子">⟳</button>
  </div>
  <div class="vdiv"></div>
  <div class="mini"><label>BPM</label><input id="bpm" type="range" min="128" max="165" value="145" step="1" /><b id="bpmVal">145</b></div>
  <div class="mini"><label>音量</label><input id="vol" type="range" min="0" max="100" value="90" step="1" /><b id="volVal">90</b></div>
  <div class="vdiv"></div>
  <div class="stat"><span class="livedot live-dot"></span><span id="streamStat">离线</span></div>
  <span id="timecode">00:00</span>
</header>

<main>
  <section id="scene" class="card">
    <canvas id="psyCanvas"></canvas>
    <canvas id="viz"></canvas>
    <div class="scene-title"><h2>Visualizer · Spectrum</h2></div>
    <div class="scene-hint" id="sceneHint">点击 ▶ 开始 · 引擎将持续生成永不重复的 Psytrance</div>
    <div class="scene-over"><span class="dot"></span><b id="section">INTRO</b></div>
    <div class="playhead-read">BAR&nbsp;<b id="barRead">0</b>&nbsp;·&nbsp;STEP&nbsp;<b id="stepRead">0</b></div>
  </section>
  <aside>
    <div class="panel card">
      <h2>Style 子风格</h2>
      <div class="row" id="styleRow"></div>
      <p class="hint">切换后同一风格内仍持续变奏；种子决定当前这段的调性与走向。</p>
    </div>
    <div class="panel card">
      <h2>Psy 参数</h2>
      <div class="ctl"><label>迷幻深度</label><input id="absurd" type="range" min="0" max="100" value="50" step="1" /><span class="val" id="absurdVal">50</span></div>
      <div class="ctl"><label>亮度</label><input id="bright" type="range" min="0" max="100" value="50" step="1" /><span class="val" id="brightVal">50</span></div>
      <div class="ctl"><label>失真</label><input id="grit" type="range" min="0" max="100" value="50" step="1" /><span class="val" id="gritVal">50</span></div>
      <div class="ctl"><label>空间</label><input id="space" type="range" min="0" max="100" value="50" step="1" /><span class="val" id="spaceVal">50</span></div>
      <p class="hint">50 = 跟随当前子风格默认；左移更克制、右移更极端。</p>
    </div>
    <div class="panel card">
      <h2>Engine 引擎</h2>
      <div class="plline" style="padding:1px 0 2px">
        <span id="srcBadge" class="pill">声源:载入采样…</span>
      </div>
      <p class="hint">旋律声部来自 Freesound CC0 真实采样。点击底部网格的声部名可试听音色，左侧小方块可静音通道。</p>
    </div>
  </aside>
</main>

<footer id="planner" class="card">
  <div class="pl-blk">
    <div class="pl-h">Now Playing</div>
    <span id="sectionBadge">INTRO</span>
    <div class="plline">
      <span id="scalePill" class="pill">Phrygian</span>
      <span id="rootPill" class="pill">Root</span>
      <span id="seedPill" class="pill">SEED —</span>
    </div>
    <div id="layerChips" class="plline"></div>
  </div>

  <div class="pl-blk" id="gridBlk">
    <div class="pl-h">Sequencer · 16 Steps</div>
    <div id="grid"></div>
  </div>

  <div class="pl-blk" id="markovBlk">
    <div class="pl-h">Markov 链</div>
    <div class="markov-head">
      <span id="markovNote">—</span>
      <span class="markov-lbl">当前音</span>
    </div>
    <div id="markovBars"></div>
  </div>
</footer>
`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const playBtn = $("playBtn");
const seedInput = $<HTMLInputElement>("seedInput");
const seedBtn = $("seedBtn");
const bpm = $<HTMLInputElement>("bpm");
const bpmVal = $("bpmVal");
const vol = $<HTMLInputElement>("vol");
const volVal = $("volVal");
const absurd = $<HTMLInputElement>("absurd");
const absurdVal = $("absurdVal");
const bright = $<HTMLInputElement>("bright");
const brightVal = $("brightVal");
const grit = $<HTMLInputElement>("grit");
const gritVal = $("gritVal");
const space = $<HTMLInputElement>("space");
const spaceVal = $("spaceVal");
const sectionEl = $("section");
const sectionBadge = $("sectionBadge");
const timecodeEl = $("timecode");
const streamStat = $("streamStat");
const styleRow = $("styleRow");
const sceneHint = $("sceneHint");
const canvas = $<HTMLCanvasElement>("viz");
const psyCanvas = $<HTMLCanvasElement>("psyCanvas");

const planMeta = {
  section: $("sectionBadge"),
  scale: $("scalePill"),
  root: $("rootPill"),
  seed: $("seedPill")
};

// Soft pastel ramp — one muted hue per voice (fresh, no glow).
const LAYER_COLOR: Record<string, string> = {
  kick: "#F87171", bass: "#FB923C", acid: "#A3E635", lead: "#38BDF8",
  hats: "#FDE047", clap: "#F472B6", perc: "#A78BFA", pads: "#34D399", fx: "#2DD4BF"
};
const LAYER_NAMES: Record<string, string> = {
  kick: "KICK", bass: "BASS", acid: "ACID", lead: "LEAD",
  hats: "HATS", clap: "CLAP", perc: "PERC", pads: "PADS", fx: "FX"
};

// ----------------------------- Planner rendering -----------------------------
const layerChipsEl = $("layerChips");
const markovBarsEl = $("markovBars");
const gridEl = $("grid");
const markovNoteEl = $("markovNote");

const layerOrder = ["kick", "bass", "acid", "lead", "hats", "clap", "perc", "pads", "fx"];
const gridRows: Record<string, { row: HTMLDivElement; name: HTMLSpanElement; mute: HTMLButtonElement; cells: HTMLDivElement[] }> = {};
/** Channel mute state (UI mirror of the engine's VoiceManager mutes). */
const mutedLayers = new Set<string>();

layerOrder.forEach((layer) => {
  const row = document.createElement("div");
  row.className = "grow";

  const mute = document.createElement("button");
  mute.className = "mute";
  mute.type = "button";
  mute.title = "通道开关（开/关这个声部）";
  mute.setAttribute("aria-label", `${LAYER_NAMES[layer]} 通道开关`);
  mute.onclick = () => toggleMute(layer);

  const name = document.createElement("span");
  name.className = "gname";
  name.textContent = LAYER_NAMES[layer];
  name.title = "点击试听该声部音色";
  name.onclick = () => {
    void engine.previewLayer(layer as LayerName);
    name.classList.remove("flash");
    void name.offsetWidth; // restart the css animation
    name.classList.add("flash");
  };

  row.append(mute, name);
  const cells: HTMLDivElement[] = [];
  for (let i = 0; i < 16; i++) {
    const c = document.createElement("div");
    c.className = "cell";
    c.dataset["col"] = String(i);
    row.appendChild(c);
    cells.push(c);
  }
  row.style.display = "none";
  gridEl.appendChild(row);
  gridRows[layer] = { row, name, mute, cells };
});

function toggleMute(layer: string): void {
  const m = !mutedLayers.has(layer);
  if (m) mutedLayers.add(layer);
  else mutedLayers.delete(layer);
  engine.setLayerMuted(layer as LayerName, m);
  const g = gridRows[layer];
  if (g) {
    g.row.classList.toggle("muted", m);
    g.mute.classList.toggle("off", m);
    g.mute.title = m ? "通道已关闭 · 点击开启" : "通道开关（开/关这个声部）";
  }
  if (lastPlan) renderPlan(lastPlan); // refresh chip dim state
}

const SECTION_LABEL: Record<string, string> = {
  intro: "INTRO", build: "BUILD", drop: "DROP", breakdown: "BREAKDOWN", outro: "OUTRO"
};

let lastPlan: PlanSnapshot | null = null;

function renderPlan(plan: PlanSnapshot): void {
  lastPlan = plan;
  planMeta.section.textContent = SECTION_LABEL[plan.section] ?? plan.section;
  planMeta.scale.textContent = scaleLabel(plan.scale);
  planMeta.root.textContent = noteName(plan.root);
  planMeta.seed.textContent = `SEED ${plan.seed}`;
  for (const p of ["scale", "root", "seed"] as const) planMeta[p].classList.add("on");

  // Active-layer chips (click = audition).
  layerChipsEl.innerHTML = "";
  const active = new Set<string>(plan.layersActive);
  layerOrder.forEach((layer) => {
    if (!active.has(layer)) return;
    const chip = document.createElement("span");
    chip.className = "pill on" + (mutedLayers.has(layer) ? " dim" : "");
    chip.textContent = LAYER_NAMES[layer];
    chip.title = "点击试听该声部音色";
    chip.onclick = () => void engine.previewLayer(layer as LayerName);
    layerChipsEl.appendChild(chip);
  });

  // 16-step grid, pastel per layer, opacity by velocity.
  const seen = new Set<string>();
  (Object.keys(plan.grid) as Array<keyof typeof plan.grid>).forEach((layer) => {
    const key = layer as string;
    if (!gridRows[key]) return;
    seen.add(key);
    const arr = plan.grid[layer];
    if (!arr) return;
    const anyHit = arr.some((v) => v > 0);
    gridRows[key].row.style.display = anyHit ? "grid" : "none";
    const col = LAYER_COLOR[key] ?? "#CBD5E1";
    arr.forEach((v, i) => {
      const cell = gridRows[key].cells[i];
      if (v > 0) {
        cell.style.background = col;
        cell.style.opacity = String(Math.max(0.5, 0.35 + v * 0.65));
      } else {
        cell.style.background = "";
        cell.style.opacity = "";
      }
    });
  });
  layerOrder.forEach((layer) => {
    if (!seen.has(layer)) gridRows[layer].row.style.display = "none";
  });

  // Markov candidates.
  markovNoteEl.textContent = noteName(plan.markov.current);
  markovBarsEl.innerHTML = "";
  const picks = plan.markov.candidates ?? [];
  const maxP = Math.max(1e-4, ...picks.map((c) => c.p));
  picks.slice(0, 5).forEach((c) => {
    const isPick = c.note === plan.markov.current;
    const bar = document.createElement("div");
    bar.className = "mbar" + (isPick ? " pick" : "");
    const s = document.createElement("s");
    s.textContent = noteName(c.note);
    const track = document.createElement("span");
    track.className = "track";
    const fill = document.createElement("span");
    fill.className = "fill";
    fill.style.width = `${(c.p / maxP) * 100}%`;
    track.appendChild(fill);
    const em = document.createElement("em");
    em.textContent = `${(c.p * 100).toFixed(0)}%`;
    bar.append(s, track, em);
    markovBarsEl.appendChild(bar);
  });
}

function renderPlayhead(v: PlayheadView): void {
  $("barRead").textContent = String(v.bar);
  $("stepRead").textContent = String(v.sixteenth);
  layerOrder.forEach((layer) => {
    const row = gridRows[layer];
    if (row.row.style.display === "none") return;
    row.cells.forEach((cell, i) => cell.classList.toggle("cur", i === v.sixteenth));
  });
}

// ----------------------------- Style chips -----------------------------
STYLE_NAMES.forEach((name) => {
  const chip = document.createElement("button");
  chip.className = "chip" + (name === "fullon" ? " active" : "");
  chip.textContent = STYLES[name].label;
  chip.onclick = () => {
    engine.setStyle(name);
    styleRow.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
  };
  styleRow.appendChild(chip);
});

// ----------------------------- Engine wiring -----------------------------
const engine = new Engine({
  onSectionChange: (s) => {
    const label = SECTION_LABEL[s] ?? s;
    sectionEl.textContent = label;
    sectionBadge.textContent = label;
    sectionBadge.classList.remove("flash");
    void sectionBadge.offsetWidth; // restart the css animation
    sectionBadge.classList.add("flash");
  },
  onPlan: (plan) => renderPlan(plan),
  onPlayhead: (v) => renderPlayhead(v)
});
engine.setVolume(0.9);
engine.setSeed(20240901);
seedInput.value = String(engine.getSeed());

// Load real recorded samples; patch the HUD badge when done.
const srcBadge = $("srcBadge");
engine.loadSamples().then((n) => {
  srcBadge.textContent = n > 0 ? `声源:真实采样 ×${n}` : "声源:合成器";
  srcBadge.classList.toggle("on", n > 0);
});

let playing = false;

function refreshPlay(): void {
  playBtn.textContent = playing ? "■ 停止" : "▶ 开始";
  playBtn.className = "btn" + (playing ? " stop" : "");
  streamStat.textContent = playing ? "LIVE · 生成中" : "离线";
  streamStat.closest(".stat")!.querySelector(".livedot")!.className =
    "livedot " + (playing ? "rec-dot" : "live-dot");
  sceneHint.style.opacity = playing ? "0" : "1";
}
async function togglePlay(): Promise<void> {
  playing = !playing;
  refreshPlay();
  if (playing) {
    await engine.start();
  } else {
    engine.stop();
  }
}
playBtn.onclick = () => void togglePlay();

// Seed
function applySeed(raw: string): void {
  let s = parseInt(raw, 10);
  if (!Number.isFinite(s) || s < 0) s = ((Math.random() * 0xffffffff) >>> 0) % 100000000;
  engine.setSeed(s);
  seedInput.value = String(s);
}
seedInput.onchange = () => applySeed(seedInput.value);
seedBtn.onclick = () => applySeed(String(((Math.random() * 0xffffffff) >>> 0) % 100000000));

seedInput.addEventListener("input", () => {
  const s = parseInt(seedInput.value, 10);
  if (Number.isFinite(s) && s >= 0) engine.setSeed(s);
});

// Knobs — sliders show their filled portion up to the current value.
function paintTrack(input: HTMLInputElement): void {
  const min = parseFloat(input.min);
  const max = parseFloat(input.max);
  const p = ((parseFloat(input.value) - min) / (max - min)) * 100;
  input.style.background = `linear-gradient(to right, var(--acc) ${p}%, #E8EAEC ${p}%)`;
}
function onRange(input: HTMLInputElement, valEl: HTMLElement, fn: (v: number) => void, pct: boolean): void {
  const apply = () => {
    const v = parseFloat(input.value);
    valEl.textContent = pct ? String(Math.round(v)) : String(v);
    paintTrack(input);
    fn(v);
  };
  input.addEventListener("input", apply);
  apply();
}
onRange(bpm, bpmVal, (v) => engine.setBpm(v), false);
onRange(vol, volVal, (v) => engine.setVolume(v / 100), true);
onRange(absurd, absurdVal, (v) => engine.setAbsurdity(v / 100), true);
onRange(bright, brightVal, (v) => engine.setBrightness(v / 100), true);
onRange(grit, gritVal, (v) => engine.setGrit(v / 100), true);
onRange(space, spaceVal, (v) => engine.setSpace(v / 100), true);

// ----------------------------- Visualizer -----------------------------
// Layer 0: WebGL pastel fractal inside the stage (audio-reactive).
// Layer 1: 2D canvas — clean teal spectrum + waveform overlay.
const psy = (() => {
  try {
    return new PsyShader(psyCanvas);
  } catch {
    psyCanvas.style.display = "none";
    return null;
  }
})();

const ctx2d = canvas.getContext("2d")!;
const analyser = engine.getAnalyser();
const fft = new Uint8Array(analyser.frequencyBinCount);
const wave = new Uint8Array(analyser.fftSize);

function fitCanvases(): void {
  const dpr = Math.min(2, devicePixelRatio);
  const r = canvas.getBoundingClientRect();
  canvas.width = r.width * dpr;
  canvas.height = r.height * dpr;
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (psy) {
    psyCanvas.width = r.width * dpr;
    psyCanvas.height = r.height * dpr;
    psy.resize(psyCanvas.width, psyCanvas.height);
  }
}
window.addEventListener("resize", fitCanvases);
fitCanvases();

let kickLast = 0;
function kicked(): number {
  const now = performance.now();
  const mag = fft[1] || 0;
  if (mag > 120 && now - kickLast > 220) kickLast = now;
  const dt = now - kickLast;
  return dt < 200 ? (200 - dt) / 200 : 0;
}

function band(from: number, to: number): number {
  let s = 0;
  for (let i = from; i < to; i++) s += fft[i];
  return s / ((to - from) * 255);
}

function loop(): void {
  requestAnimationFrame(loop);
  analyser.getByteFrequencyData(fft);
  analyser.getByteTimeDomainData(wave);
  const beat = kicked();

  // Pastel fractal backdrop (confined to the stage).
  if (psy) {
    psy.render({
      bass: band(1, 6),
      mid: band(10, 40),
      high: band(60, 160),
      beat,
      brightness: engine.brightnessNow(),
      absurdity: engine.absurdityNow(),
      energy: playing ? Math.min(1, 0.35 + band(1, 12)) : 0.2
    });
  }

  // Clean spectrum + waveform overlay.
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx2d.clearRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;
  const bands = 96;
  const bw = w / bands;
  for (let i = 0; i < bands; i++) {
    const idx = Math.floor((i / bands) * 120);
    const v = fft[idx] / 255;
    if (v < 0.04) continue;
    const bh = Math.max(2, v * (h * 0.4));
    const x = i * bw;
    ctx2d.fillStyle = `rgba(13,148,136,${0.16 + v * 0.4})`;
    ctx2d.fillRect(x, cy - bh, bw - 1.2, bh);
    ctx2d.fillRect(x, cy + 1, bw - 1.2, bh);
  }

  // Center hairline + soft beat ring.
  ctx2d.strokeStyle = "rgba(31,35,40,.10)";
  ctx2d.lineWidth = 1;
  ctx2d.beginPath(); ctx2d.moveTo(0, cy); ctx2d.lineTo(w, cy); ctx2d.stroke();
  ctx2d.strokeStyle = `rgba(13,148,136,${0.05 + beat * 0.16})`;
  ctx2d.lineWidth = 1.5;
  ctx2d.beginPath(); ctx2d.arc(cx, cy, 40 + beat * 70, 0, Math.PI * 2); ctx2d.stroke();

  // Waveform.
  ctx2d.strokeStyle = "rgba(13,148,136,.5)";
  ctx2d.lineWidth = 1.2;
  ctx2d.beginPath();
  for (let x = 0; x < w; x += 3) {
    const i = Math.floor((x / w) * (wave.length - 1));
    const s = (wave[i] - 128) / 128;
    const y = cy + s * h * 0.16;
    x === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
  }
  ctx2d.stroke();
}

requestAnimationFrame(loop);

// Timecode updater
setInterval(() => {
  if (playing) {
    const s = Math.floor(engine.elapsedNow());
    const m = Math.floor(s / 60);
    timecodeEl.textContent = `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }
}, 500);

// Expose for debugging
(window as any).engine = engine;
(window as any).__psy = psy;
