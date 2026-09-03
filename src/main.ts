/** Boot the PsyTrance engine and render the monochrome minimal control + visualization UI. */
import { Engine, STYLES, STYLE_NAMES } from "./engine/Engine";
import { noteName, scaleLabel } from "./engine/utils";
import type { LayerName, PlanSnapshot, PlayheadView } from "./engine/types";

// ----------------------------- Styles (black / white / gray minimalism) -----------------------------
const CSS = document.createElement("style");
CSS.textContent = `
:root{
  --bg:#050505; --panel:#0b0b0b; --panel2:#121212;
  --line:rgba(255,255,255,.08); --line2:rgba(255,255,255,.18);
  --text:#f5f5f5; --dim:#8a8a8a; --dim2:#4f4f4f;
  --smooth: cubic-bezier(.22,1,.36,1);
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{color:var(--text);background:var(--bg);overflow:hidden;
  font-family:"Segoe UI",system-ui,-apple-system,sans-serif;position:relative}
/* dot-grid instrument backdrop */
body::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px);
  background-size:26px 26px}

#app{position:relative;z-index:1;height:100vh;display:flex;flex-direction:column;padding:14px 18px 16px;gap:12px}

/* ---------------- header ---------------- */
header{display:flex;align-items:center;gap:14px;font-variant-numeric:tabular-nums}
.logo{width:30px;height:30px;border-radius:5px;display:grid;place-items:center;font-size:16px;
  background:#fff;color:#000;font-weight:700}
header h1{font-size:16px;letter-spacing:3px;font-weight:600;color:var(--text)}
header .tag{font-size:10.5px;color:var(--dim2);letter-spacing:1.5px}
.spacer{flex:1}
.stat{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--dim);letter-spacing:1px;text-transform:uppercase}
.stat b{color:var(--text);font-size:12px;font-weight:600}
.livedot{width:7px;height:7px;border-radius:50%}
.live-dot{background:#3a3a3a}
.rec-dot{background:#fff;animation:breathe .9s ease-in-out infinite}
@keyframes breathe{50%{transform:scale(1.45);opacity:.4}}
#timecode{font-size:13px;font-weight:600;color:var(--text);letter-spacing:2px;min-width:64px;text-align:right}

/* ---------------- planner strip ---------------- */
#planner{display:flex;align-items:stretch;gap:0;
  background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:13px 0}
.pl-blk{display:flex;flex-direction:column;gap:8px;padding:0 20px;flex-shrink:0;
  border-right:1px solid var(--line)}
.pl-blk:last-child{border-right:0}
.pl-h{font-size:9px;letter-spacing:2.5px;color:var(--dim2);font-weight:600;text-transform:uppercase}
#sectionBadge{font-size:20px;font-weight:700;letter-spacing:4px;color:#fff;line-height:1;
  transition:opacity .4s var(--smooth)}
#sectionBadge.flash{animation:sflash .45s var(--smooth)}
@keyframes sflash{0%{opacity:0;transform:translateY(3px)}100%{opacity:1;transform:none}}
.plline{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dim);flex-wrap:wrap}
.pill{font-size:10px;font-weight:600;letter-spacing:.5px;padding:3px 9px;border-radius:3px;
  border:1px solid var(--line2);color:var(--dim);background:transparent;white-space:nowrap;
  cursor:pointer;transition:opacity .18s var(--smooth)}
.pill:hover{border-color:rgba(255,255,255,.45)}
.pill.on{color:#000;background:#fff;border-color:#fff}
.pill.dim{opacity:.22}

/* markov chain block */
#markovBlk{flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px}
.markov-head{display:flex;align-items:baseline;gap:10px}
#markovNote{font-size:24px;font-weight:700;line-height:1;color:#fff;letter-spacing:1px}
.markov-lbl{font-size:9px;color:var(--dim2);letter-spacing:2px;text-transform:uppercase}
#markovBars{display:flex;flex-direction:column;gap:5px}
.mbar{display:grid;grid-template-columns:36px 1fr 36px;align-items:center;gap:8px;font-size:10.5px}
.mbar s{font-weight:600;color:var(--dim);letter-spacing:.5px;text-decoration:none}
.mbar .track{height:5px;background:#1c1c1c;position:relative}
.mbar .fill{position:absolute;inset:0 auto 0 0;height:100%;background:#5c5c5c;
  transition:width .28s var(--smooth),background .28s var(--smooth)}
.mbar.pick .fill{background:#fff}
.mbar.pick s{color:#fff}
.mbar em{font-style:normal;text-align:right;color:var(--dim2);font-variant-numeric:tabular-nums}

/* 16-step planning grid */
#gridBlk{flex-shrink:0;width:322px}
#grid{display:flex;flex-direction:column;gap:3px}
.grow{display:grid;grid-template-columns:14px 42px repeat(16,1fr);gap:3px;align-items:center}
.grow .gname{font-size:8.5px;letter-spacing:1.5px;color:var(--dim2);text-transform:uppercase;
  cursor:pointer;user-select:none;transition:color .15s}
.grow .gname:hover{color:var(--text)}
.grow .gname.flash{animation:gflash .5s var(--smooth)}
@keyframes gflash{0%{color:#fff;text-shadow:0 0 8px rgba(255,255,255,.8)}100%{color:var(--dim2);text-shadow:none}}
.mute{width:13px;height:13px;border-radius:3px;border:1px solid var(--line2);background:transparent;
  cursor:pointer;padding:0;position:relative;transition:all .18s var(--smooth)}
.mute::after{content:"";position:absolute;inset:3px;border-radius:1px;background:#fff;transition:opacity .18s}
.mute:hover{border-color:rgba(255,255,255,.5)}
.mute.off{border-color:var(--line)}
.mute.off::after{opacity:.1}
.grow.muted .gname{color:#333}
.grow.muted .cell{filter:grayscale(1) brightness(.32)}
.cell{height:13px;border-radius:2px;background:#181818;transition:background .1s linear;opacity:.5}
.cell.cur{outline:1px solid rgba(255,255,255,.35);opacity:1}
.cell[data-col="0"],.cell[data-col="8"]{margin-right:1px}

/* ---------------- main stage ---------------- */
main{flex:1;display:grid;grid-template-columns:1fr 370px;gap:12px;min-height:0}
#scene{position:relative;border:1px solid var(--line);border-radius:6px;overflow:hidden;min-height:0;
  background:#000}
#scene canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.scene-over{position:absolute;left:16px;bottom:13px;display:flex;align-items:center;gap:10px;z-index:2;
  font-size:10px;letter-spacing:2.5px;color:var(--dim);text-transform:uppercase}
.scene-over .dot{width:6px;height:6px;border-radius:50%;background:#fff}
.scene-over b{color:#fff;font-size:12.5px;letter-spacing:3px}
.playhead-read{position:absolute;right:16px;bottom:13px;z-index:2;font-size:10.5px;color:var(--dim);
  letter-spacing:1.5px;font-variant-numeric:tabular-nums}
.playhead-read b{color:#fff;font-size:11.5px}
.scene-title{position:absolute;left:16px;top:13px;z-index:2}
.scene-title h2{font-size:9px;letter-spacing:2.5px;color:var(--dim2);text-transform:uppercase;font-weight:600}

/* ---------------- sidebar ---------------- */
aside{display:flex;flex-direction:column;gap:10px;min-height:0;overflow-y:auto;padding-right:3px;
  scrollbar-width:thin;scrollbar-color:#2a2a2a transparent}
aside::-webkit-scrollbar{width:6px}aside::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:99px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:14px 15px;flex-shrink:0}
.panel h2{font-size:9px;letter-spacing:2.5px;color:var(--dim2);margin-bottom:12px;text-transform:uppercase;
  font-weight:600;display:flex;align-items:center;gap:8px}
.panel h2::after{content:"";flex:1;height:1px;background:var(--line)}
.row{display:flex;gap:7px;flex-wrap:wrap}
.chip{padding:7px 12px;border-radius:4px;border:1px solid var(--line2);color:var(--dim);
  font-size:12px;cursor:pointer;transition:all .18s var(--smooth);background:transparent}
.chip:hover{color:var(--text);border-color:rgba(255,255,255,.4)}
.chip.active{background:#fff;color:#000;border-color:#fff;font-weight:600}
.btn{border:1px solid #fff;border-radius:4px;background:#fff;color:#000;
  font-weight:700;padding:11px 18px;font-size:13.5px;cursor:pointer;letter-spacing:1px;
  transition:all .18s var(--smooth)}
.btn.secondary{background:transparent;color:var(--text);border:1px solid var(--line2)}
.btn.secondary:hover{border-color:rgba(255,255,255,.45)}
.btn.stop{background:transparent;color:#fff;border:1px solid #fff}
.btn:hover{filter:brightness(.88)}
.btn:active{transform:translateY(1px)}
.ctl{display:flex;align-items:center;gap:10px;margin:9px 0}
.ctl label{width:64px;font-size:11px;color:var(--dim);flex-shrink:0;letter-spacing:.5px}
.ctl input[type=range]{flex:1;-webkit-appearance:none;appearance:none;height:2px;border-radius:99px;
  background:#2a2a2a;outline:none;cursor:pointer}
.ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;border-radius:2px;
  background:#fff;cursor:pointer;border:none}
.ctl input[type=range]::-moz-range-thumb{width:11px;height:11px;border-radius:2px;background:#fff;cursor:pointer;border:none}
.ctl .val{width:34px;text-align:right;font-size:11.5px;color:var(--text);font-variant-numeric:tabular-nums;font-weight:600}
.seedbar{display:flex;align-items:center;gap:8px;margin:4px 0 10px}
.seedbar .seed{flex:1;background:var(--panel2);border:1px solid var(--line);color:var(--text);
  border-radius:4px;padding:8px 10px;font-size:13px;font-variant-numeric:tabular-nums;outline:none;transition:border .2s}
.seedbar .seed:focus{border-color:rgba(255,255,255,.4)}
.hint{font-size:10.5px;color:var(--dim2);line-height:1.65}
`;
document.head.appendChild(CSS);

// ----------------------------- App shell -----------------------------
const body = document.getElementById("app")!;
body.innerHTML = `
<header>
  <div class="logo">ψ</div>
  <h1>PSYTRANCE</h1>
  <span class="tag">无限迷幻生成引擎 · INFINITE · 永不重复</span>
  <span class="spacer"></span>
  <div class="stat"><span class="livedot rec-dot"></span><span id="streamStat">离线</span></div>
  <div class="stat">BPM&nbsp;<b id="hdrBpm">145</b></div>
  <span id="timecode">00:00</span>
</header>

<section id="planner">
  <div class="pl-blk">
    <div class="pl-h">Now Playing</div>
    <span id="sectionBadge">INTRO</span>
    <div class="plline">
      <span id="scalePill" class="pill">Phrygian</span>
      <span id="rootPill" class="pill">Root</span>
      <span id="seedPill" class="pill">SEED —</span>
      <span id="srcBadge" class="pill">声源:载入采样…</span>
    </div>
    <div id="layerChips" class="plline"></div>
  </div>

  <div id="markovBlk" class="pl-blk">
    <div class="markov-head">
      <span id="markovNote">—</span>
      <span class="markov-lbl">Markov 链候选 · 当前音</span>
    </div>
    <div id="markovBars"></div>
  </div>

  <div id="gridBlk" class="pl-blk">
    <div class="pl-h">Bar Grid / 16</div>
    <div id="grid"></div>
  </div>
</section>

<main>
  <section id="scene">
    <canvas id="viz"></canvas>
    <div class="scene-title"><h2>Scope · Spectrum</h2></div>
    <div class="scene-over"><span class="dot"></span><b id="section">INTRO</b></div>
    <div class="playhead-read">BAR&nbsp;<b id="barRead">0</b>&nbsp;/&nbsp;STEP&nbsp;<b id="stepRead">0</b></div>
  </section>
  <aside>
    <div class="panel">
      <h2>Transport 播放</h2>
      <div class="row">
        <button class="btn" id="playBtn">▶ 开始</button>
        <button class="btn secondary" id="seedBtn">⟳ 换一段</button>
      </div>
      <div class="seedbar"><input id="seedInput" class="seed" type="text" spellcheck="false" /></div>
      <div class="ctl"><label>BPM</label><input id="bpm" type="range" min="128" max="165" value="145" step="1" /><span class="val" id="bpmVal">145</span></div>
      <div class="ctl"><label>音量</label><input id="vol" type="range" min="0" max="100" value="90" step="1" /><span class="val" id="volVal">90</span></div>
    </div>
    <div class="panel">
      <h2>Style 子风格</h2>
      <div class="row" id="styleRow"></div>
      <p class="hint" style="margin-top:10px">切换后在同一风格内仍持续变奏；种子决定当前这段的调性与走向，马尔可夫链据此展开旋律。</p>
    </div>
    <div class="panel">
      <h2>Psy 参数</h2>
      <div class="ctl"><label>迷幻深度</label><input id="absurd" type="range" min="0" max="100" value="50" step="1" /><span class="val" id="absurdVal">50</span></div>
      <div class="ctl"><label>亮度</label><input id="bright" type="range" min="0" max="100" value="50" step="1" /><span class="val" id="brightVal">50</span></div>
      <div class="ctl"><label>失真</label><input id="grit" type="range" min="0" max="100" value="50" step="1" /><span class="val" id="gritVal">50</span></div>
      <div class="ctl"><label>空间</label><input id="space" type="range" min="0" max="100" value="50" step="1" /><span class="val" id="spaceVal">50</span></div>
      <p class="hint">50 = 跟随当前子风格默认；左移更克制、右移更极端。</p>
    </div>
  </aside>
</main>
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
const headerBpm = $("hdrBpm");
const streamStat = $("streamStat");
const styleRow = $("styleRow");
const canvas = $<HTMLCanvasElement>("viz");

const planMeta = {
  section: $("sectionBadge"),
  scale: $("scalePill"),
  root: $("rootPill"),
  seed: $("seedPill")
};

// Layer grayscale ramp (bright = prominent) for the bar grid.
const LAYER_GRAY: Record<string, number> = {
  kick: 1.0, bass: 0.9, acid: 0.8, lead: 0.7,
  hats: 0.55, clap: 0.5, perc: 0.42, pads: 0.34, fx: 0.26
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

function gray(g: number): string {
  const v = Math.round(255 * g);
  return `rgb(${v},${v},${v})`;
}

let lastPlan: PlanSnapshot | null = null;

function renderPlan(plan: PlanSnapshot): void {
  lastPlan = plan;
  planMeta.section.textContent = SECTION_LABEL[plan.section] ?? plan.section;
  planMeta.scale.textContent = scaleLabel(plan.scale);
  planMeta.root.textContent = noteName(plan.root);
  planMeta.seed.textContent = `SEED ${plan.seed}`;
  for (const p of ["scale", "root", "seed"] as const) planMeta[p].classList.add("on");

  // Active-layer chips (unified inverted pills; click = audition).
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

  // 16-step grid, grayscale by velocity.
  const seen = new Set<string>();
  (Object.keys(plan.grid) as Array<keyof typeof plan.grid>).forEach((layer) => {
    const key = layer as string;
    if (!gridRows[key]) return;
    seen.add(key);
    const arr = plan.grid[layer];
    if (!arr) return;
    const anyHit = arr.some((v) => v > 0);
    gridRows[key].row.style.display = anyHit ? "grid" : "none";
    const g = LAYER_GRAY[key] ?? 0.5;
    arr.forEach((v, i) => {
      const cell = gridRows[key].cells[i];
      cell.style.background = v > 0 ? gray(g * Math.max(0.45, v)) : "#181818";
      cell.style.opacity = v > 0 ? "1" : ".5";
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

// Knobs
function onRange(input: HTMLInputElement, valEl: HTMLElement, fn: (v: number) => void, pct: boolean): void {
  const apply = () => {
    const v = parseFloat(input.value);
    valEl.textContent = pct ? String(Math.round(v)) : String(v);
    fn(v);
  };
  input.addEventListener("input", apply);
  apply();
}
onRange(bpm, bpmVal, (v) => { engine.setBpm(v); headerBpm.textContent = String(Math.round(v)); }, false);
onRange(vol, volVal, (v) => engine.setVolume(v / 100), true);
onRange(absurd, absurdVal, (v) => engine.setAbsurdity(v / 100), true);
onRange(bright, brightVal, (v) => engine.setBrightness(v / 100), true);
onRange(grit, gritVal, (v) => engine.setGrit(v / 100), true);
onRange(space, spaceVal, (v) => engine.setSpace(v / 100), true);

// ----------------------------- Visualizer (monochrome scope) -----------------------------
const ctx2d = canvas.getContext("2d")!;
const analyser = engine.getAnalyser();
const fft = new Uint8Array(analyser.frequencyBinCount);
const wave = new Uint8Array(analyser.fftSize);

function fitCanvas(): void {
  const r = canvas.getBoundingClientRect();
  if (canvas.width !== r.width) canvas.width = r.width * devicePixelRatio;
  if (canvas.height !== r.height) canvas.height = r.height * devicePixelRatio;
  ctx2d.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener("resize", fitCanvas);
fitCanvas();

let kickLast = 0;
function loop(): void {
  requestAnimationFrame(loop);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  analyser.getByteFrequencyData(fft);
  analyser.getByteTimeDomainData(wave);

  // Phosphor fade.
  ctx2d.globalCompositeOperation = "source-over";
  ctx2d.globalAlpha = 0.18;
  ctx2d.fillStyle = "#000";
  ctx2d.fillRect(0, 0, w, h);
  ctx2d.globalAlpha = 1;

  const beat = kicked();
  const cx = w / 2, cy = h / 2;
  const bands = 96;

  // Mirrored monochrome spectrum columns.
  const bw = w / bands;
  for (let i = 0; i < bands; i++) {
    const idx = Math.floor((i / bands) * 120);
    const v = fft[idx] / 255;
    if (v < 0.03) continue;
    const bh = Math.max(2, v * (h * 0.46));
    const x = i * bw;
    ctx2d.globalAlpha = 0.25 + v * 0.75;
    ctx2d.fillStyle = "#ffffff";
    ctx2d.fillRect(x, cy - bh, bw - 1.2, bh);
    ctx2d.fillRect(x, cy + 2, bw - 1.2, bh);
  }
  ctx2d.globalAlpha = 1;

  // Center rail.
  ctx2d.strokeStyle = `rgba(255,255,255,${0.14 + beat * 0.3})`;
  ctx2d.lineWidth = 1;
  ctx2d.beginPath(); ctx2d.moveTo(0, cy); ctx2d.lineTo(w, cy); ctx2d.stroke();

  // Beat pulse ring.
  const ring = 34 + beat * 74;
  ctx2d.strokeStyle = `rgba(255,255,255,${0.1 + beat * 0.55})`;
  ctx2d.lineWidth = 1.5;
  ctx2d.beginPath(); ctx2d.arc(cx, cy, ring, 0, Math.PI * 2); ctx2d.stroke();

  // Thin waveform underlay.
  ctx2d.strokeStyle = "rgba(255,255,255,0.16)";
  ctx2d.lineWidth = 1;
  ctx2d.beginPath();
  for (let x = 0; x < w; x += 3) {
    const i = Math.floor((x / w) * (wave.length - 1));
    const s = (wave[i] - 128) / 128;
    const y = cy + s * h * 0.18;
    x === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
  }
  ctx2d.stroke();
}

function kicked(): number {
  const now = performance.now();
  const mag = fft[1] || 0;
  if (mag > 120 && now - kickLast > 220) kickLast = now;
  const dt = now - kickLast;
  return dt < 200 ? (200 - dt) / 200 : 0;
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