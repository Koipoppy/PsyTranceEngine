# PsyTranceEngine

纯浏览器运行、基于种子的 **Psytrance（迷幻出神）无限生成引擎**。

整个工程只依赖浏览器原生的 Web Audio API，无后端、无运行时依赖，打开网页点击开始即可让引擎持续生成永不复位的 Psytrance 编曲。所有旋律声部均来自 **Freesound（CC0 公有领域）的真实 Psytrance 采样**，并通过 Keyzone 采样、谐振滤波包络与 Resample/Chop 切片等手法还原该流派标志性的声音质感。

## 特性

- **无限生成，永不重复**：以种子驱动的生成引擎在相同种子下可复现，在不同种子下持续演进编曲；同一风格内仍不断变奏。
- **真实 Psytrance 声源**：Kick / Bass / Acid / Lead / Pads / FX 全部取自 Freesound 上的 CC0 真实采样，包含 Roland TB-03 真机 acid、Moog Sub 37 实录 sub-drop、模拟合成器 bass one-shot 等。
- **流派化声音合成**：每个音符都会套用谐振低通滤波包络——Bass 的快速下潜 `pluck`、Acid 的 303 式扫频 `sweep`、Lead 的缓慢绽放 `slow`。
- **Keyzone 采样**：采样按实测基音映射到 MIDI 音域，仅在相邻分区小范围内移调，避免大幅变速带来的伪影。
- **Resample / Chop**：长录音（TB-03 音符、bass rolling loop、lead loop）使用随机起点切片，每一击都是源素材的不同片段，复刻 psytrance 制作中的切片工作流。
- **完整编曲段落**：Intro → Build → Drop → Breakdown → Outro，含能量分阶段爬坡、末小节加速鼓滚奏，以及 drop 前标志性的一拍静默 break。
- **5 种子风格**：Goa 果阿、Full-On、Dark 深暗、Twilight 暮光、Progressive，各有独立的音阶池、速度区间、亮度、失真与空间参数。
- **马尔可夫旋律**：Acid 与 Lead 声部使用马尔可夫链生成音符候选与转移概率，可在界面实时查看当前音与候选音。
- **通道控制**：每一轨均可独立静音（Mute），点击通道名即可单独试听该声部的代表音色。
- **实时可视化**：单色示波器（镜像频谱 + 节拍脉冲环 + 波形底衬），以及 16 步逐层规划网格。

## 技术栈

- **TypeScript**（`strict` 严格模式，`noUnusedLocals` / `noUnusedParameters` 开启）
- **Vite**（开发服务器与生产构建）
- **Web Audio API**（原生音频图，无外部音频框架）

零运行时依赖。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查 + 生产构建
npm run build

# 本地预览构建产物
npm run preview
```

启动开发服务器后，打开终端输出的本地地址，点击「▶ 开始」即可让引擎开始生成音乐。

## 项目结构

```
PsyTranceEngine
├── public/
│   ├── samples/                 # CC0 真实采样（mp3）+ 音源说明
│   │   ├── ATTRIBUTION.md       # 每个采样的来源、上传者、许可与实测基音
│   │   └── *.mp3
│   └── pitch-probe.html         # 自相关法基频测量工具（用于 keyzone 映射）
├── src/
│   ├── main.ts                  # UI 引导与渲染（控制面板 + 可视化）
│   ├── engine/
│   │   ├── Engine.ts            # 顶层门面：音频图 + Transport + 生成脑
│   │   ├── AudioContextManager.ts  # AudioContext、主音量、Analyser
│   │   ├── FX.ts                # 混响与延迟发送
│   │   ├── VoiceManager.ts      # NoteEvent 路由 + 通道静音 + 试听
│   │   ├── Transport.ts         # 16 分音符节拍时钟
│   │   ├── styles.ts            # 5 种风格预设
│   │   ├── types.ts             # 共享类型定义
│   │   ├── utils.ts
│   │   └── generation/
│   │       ├── SongEngine.ts    # 编曲/逐小节 pattern/参数漂移
│   │       ├── MarkovMelody.ts  # 马尔可夫链旋律声部
│   │       └── SeedManaged.ts   # 种子与音阶管理
│   └── instruments/
│       ├── SampleKit.ts         # 真实采样播放：keyzone + 滤波包络 + 切片
│       ├── voice.ts             # 采样器单例管理
│       └── *Synth.ts            # 采样缺失时的合成器 fallback
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 架构

引擎按事件驱动的方式组织，所有声音调度都基于 Web Audio 的采样时钟：

1. **Transport** 以 `60 / BPM / 4` 秒为步长发出 16 分音符 tick。
2. **SongEngine** 在每个 tick 的节拍边界生成 `NoteEvent`——它负责编曲段落切换、逐小节的 pattern 合成，以及随段落变化的参数漂移（亮度、失真、迷幻深度）。
3. **VoiceManager** 接收 `NoteEvent`，在静音层丢弃音符，并将事件分发到对应的乐器。
4. **SampleKit**（真实采样）或各 **Synth**（合成器 fallback）将音符渲染为音频，经谐振滤波包络与声像送入各自的总线。
5. **FX** 为总线叠加混响与延迟。
6. **AudioContextManager** 汇聚所有总线到主音量与 Analyser，供可视化读取。

生成过程本身也是可观测的：`SongEngine` 每生成一个小节就通过 `PlanSnapshot` 推送当前段落、活跃声部、16 步触发网格与马尔可夫候选音符，UI 据此实时刷新规划视图。

### 子风格 (Style Presets)

| 风格 | 内部名 | BPM | 音阶池 | 亮度 | 失真 | 空间 |
|------|--------|-----|--------|------|------|------|
| Goa 果阿 | `goa` | 137–145 | Phrygian, Phrygian Dominant, Hungarian Minor | 0.55 | 0.4 | 0.55 |
| Full-On | `fullon` | 142–147 | Phrygian Dominant, Harmonic Minor, Dorian | 0.8 | 0.55 | 0.5 |
| Dark 深暗 | `dark` | 148–156 | Harmonic Minor, Hungarian Minor, Phrygian | 0.35 | 0.85 | 0.6 |
| Twilight 暮光 | `twilight` | 146–152 | Phrygian, Harmonic Minor, Natural Minor | 0.6 | 0.7 | 0.55 |
| Progressive | `progressive` | 130–140 | Dorian, Natural Minor, Phrygian | 0.5 | 0.3 | 0.7 |

切换子风格后，引擎在同一风格内仍基于当前种子持续变奏；「迷幻深度 / 亮度 / 失真 / 空间」四个参数可在风格默认值两侧偏移，向左更克制、向右更极端。

### 编曲与 Break

- **Intro** 引入打击感稀薄的前奏，以 pads / hats 为主。
- **Build** 分 4 段能量爬坡（5–10 小节）：先 底鼓 + 踩镲 + 氛围，再叠 贝斯，接着叠 酸线 + clap，最后叠 lead；末两小节进入加速鼓滚奏（8 分 → 16 分，音量渐强）。
- **Signature Break**：build 最后一个小节的末拍（第 12–15 步）切断所有打击层，保留 pads 延音，形成一拍「屏息」的留白，随即 drop 落地。
- **Drop** 完整铺开所有声部（8–16 小节），入口落一次 Moog Sub 37 sub-drop。
- **Breakdown** 去掉鼓组，回到 pads + lead 的旋律空间；之后再次进入 build。
- **Outro** 逐渐撤出声部，回到 intro 循环。

## 编写规范

- 开发环境统一使用 `npm run dev` 进行热更新。
- 提交前确保 `npm run build` 通过类型检查（`tsc --noEmit`）。
- 新增采样时在 `public/samples/ATTRIBUTION.md` 记录来源、上传者、许可与实测基音，并保证为 **CC0 / 公有领域**。

## 采样来源与许可

所有旋律声部与 FX 均来自 **Freesound**（`https://freesound.org`）上以 **Creative Commons 0（公有领域，可商用、无需署名）** 发布的真实音源；Kick / Bass / Acid / Lead / Pads / FX 采样详见 [`public/samples/ATTRIBUTION.md`](public/samples/ATTRIBUTION.md)。踩镲与桶鼓单音取自 **Tone.js** 官方示例音色库的鼓机采样。

## License

本项目代码以 **MIT License** 发布。内置音频采样各自遵循其源站许可（均为 CC0 / 公有领域），详见 `ATTRIBUTION.md`。
