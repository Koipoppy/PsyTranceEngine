# PsyTranceEngine 项目调研文档

> 本文档汇总了 PsyTranceEngine 从立项到成型的**全部调研结论**：流派特征、真实声源、合成技术、旋律与调式、编曲结构、工程架构、界面设计，以及过程中的踩坑与经验。内容按"先懂流派，再定声音，后搭架构"的逻辑组织，可作为后续扩展与复用的依据。

***

## 目录

1. [执行摘要](#1-执行摘要)
2. [流派研究：什么是 Psytrance](#2-流派研究什么是-psytrance)
3. [子风格研究：5 套风格参数](#3-子风格研究5-套风格参数)
4. [调式与旋律研究](#4-调式与旋律研究)
5. [真实声源研究：Freesound CC0](#5-真实声源研究freesound-cc0)
6. [音色合成研究](#6-音色合成研究)
7. [编曲结构研究](#7-编曲结构研究)
8. [工程架构研究](#8-工程架构研究)
9. [无限不重复生成机制](#9-无限不重复生成机制)
10. [界面设计研究](#10-界面设计研究)
11. [踩坑记录与经验教训](#11-踩坑记录与经验教训)
12. [结论与可复用要点](#12-结论与可复用要点)
13. [参考来源](#13-参考来源)

***

## 1. 执行摘要

PsyTranceEngine 是一个**纯浏览器运行、基于种子、无限不重复生成 Psytrance 音乐**的引擎，零运行时依赖，仅使用原生 Web Audio API 与严格 TypeScript。

整个项目的核心调研结论可以浓缩为三句话：

- **流派上**：Psytrance 是 4/4 拍、140–150 BPM、以催眠式重复与迷幻音色为特征的电子音乐，其标志性"异域感"来自调式（Phrygian / Phrygian Dominant）与酸性贝斯（Acid，源自 Roland TB-303）。

- **声音上**：要做出"对的 Psytrance 质感"，仅靠程序合成不够——必须使用**真实录音采样**（CC0 授权），并配合 Keyzone 分区、谐振滤波包络与 Resample/Chop 切片。

- **架构上**：无限不重复由"规则底层（节拍/曲式）+ 变奏上层（种子 + 马尔可夫）"实现；精确调度依赖 Web Audio 的采样级时钟，而非 `setTimeout`。

这些结论分别对应文档第 2、5、6、8、9 章，其中包含了可复用的具体数值与工程约定。

***

## 2. 流派研究：什么是 Psytrance

### 2.1 起源与定位

Psytrance 起源于上世纪 90 年代初的印度果阿（Goa），是 Trance 家族中强调**迷幻体验**的分支。它区别于主流 Trance 的核心，在于对音色质感的追求、节奏密度与催眠式重复，而非世俗化的旋律结构。

### 2.2 节奏与结构

- **拍号与速度**：4/4 拍，四底鼓"four on the floor"；主流 **140–150 BPM**，Hard/Dark 风格更高（可达 150–160）。

- **循环划分**：以 8 或 16 小节为乐句循环，长程发展靠织体与音色的逐步变化，而非明显的主歌/副歌。

- **叙事方式**：单曲常 6–9 分钟，通过长程的张力累积与释放推进。

### 2.3 标志性音色

- **扭曲失真的合成器 lead**（supersaw / FM / 双共振峰）。

- **酸性贝斯（Acid Bass）**：基于 Roland TB-303，带谐振扫频（filter sweep），是 Goa / Psy 的基石声音之一。

- **音色爬行（build-up）**：通过 riser、滤波上扬与军鼓加速滚奏积累能量。

- **空间处理**：强烈的声像摆位、延迟回声（delay）与调制混响，制造"脑内叙事"般的立体声运动感。

### 2.4 精神体验取向

Psytrance 追求**冥想式的恍惚（trance）状态**，常用宗教、部落、科幻等主题；句子重复但以**音色与和声的被音色/和声长程演进**来避免单调——这一点直接影响了本引擎"规则 + 变奏"的设计。

参考在线来源（见文档末尾第 13 节）\[1]\[2]。

***

## 3. 子风格研究：5 套风格参数

Psytrance 并非单一声音，而是多个子风格的光谱。调研将其归并为引擎中的 **5 套预设**，每套独立配置 BPM 区间、音阶池、亮度、失真、空间与密度。

### 3.1 子风格速览

| 风格          | 引擎内部名         | BPM 区间  | 音阶池                                          | 亮度   | 失真   | 空间   | 密度   |
| ----------- | ------------- | ------- | -------------------------------------------- | ---- | ---- | ---- | ---- |
| Goa 果阿      | `goa`         | 137–145 | Phrygian, Phrygian Dominant, Hungarian Minor | 0.55 | 0.40 | 0.55 | 0.60 |
| Full-On     | `fullon`      | 142–147 | Phrygian Dominant, Harmonic Minor, Dorian    | 0.80 | 0.55 | 0.50 | 0.80 |
| Dark 深暗     | `dark`        | 148–156 | Harmonic Minor, Hungarian Minor, Phrygian    | 0.35 | 0.85 | 0.60 | 0.70 |
| Twilight 暮光 | `twilight`    | 146–152 | Phrygian, Harmonic Minor, Natural Minor      | 0.60 | 0.70 | 0.55 | 0.65 |
| Progressive | `progressive` | 130–140 | Dorian, Natural Minor, Phrygian              | 0.50 | 0.30 | 0.70 | 0.55 |

### 3.2 调研依据

- **Goa（果阿）**：135–145 BPM，classic / melodic / spiritual，重视旋律与酸声。

- **Full-On**：140–148 BPM，主流 psytrance 之声，明亮 lead 叠加 rolling bass，冲向 euphoric 峰值——是引擎默认风格。

- **Dark（深暗）**：145–155 BPM，aggressive / industrial，暗色贝斯与恐怖氛围。

- **Progressive**：130–138 BPM，更慢、更氛围化、渐进推进。

- **Psybient / Psychill**：90–110 BPM（作为降速延展，未纳入引擎主曲式）。

参考在线来源 \[2]\[3]。

***

## 4. 调式与旋律研究

### 4.1 为什么是"异域感"调式

Psytrance / Goa 的和声基础不是大调小调，而是**东方向八声音阶**。其定义性音程是 **降二度（b2）**——它制造出催眠式的张力的标志听感。常见音阶依使用频率：

1. **Phrygian（弗利几亚）** `1 b2 b3 4 5 b6 b7`
2. **Phrygian Dominant（弗利几亚大调，又称"吉普赛音阶"）** `1 b2 3 4 5 b6 b7`
3. **Harmonic Minor（和声小调）** `1 2 b3 4 5 b6 7`
4. **Hungarian Minor（匈牙利小调）** `1 2 b3 #4 5 b6 7`
5. **Dorian / Natural Minor**（用于更"顺耳"的分支）

Goa 常见旋律动机是 `[1, b2, b7]` 及其衍生，并穿插 `4、5、b6`。

### 4.2 引擎中的实现

- 每种风格内置一个**音阶池**，由种子从中选取本段调式。

- 以根音 + 音阶音程构建音符音阶（scale palette），供贝斯、酸线、lead 共同引用。

- **马尔可夫链旋律**：Acid 与 Lead 两个声部各用一阶马尔可夫链，按"音高亲和性"设计转移概率——强调\*\*级进（step）、停留（tonic/repose）、重复（repetition）\*\*的偏好，使旋律既催眠又连续，而非随机跳跃。

  - Lead 链：`{ step: 1.0, tonic: 1.4, repose: 0.9 }`

  - Acid 链：`{ step: 0.85, tonic: 0.7, repose: 0.4 }`（更活跃、更跳跃的 303 bassline 语言）

- 每次生成的候选音符与其转移概率会形成 `MarkovView`，实时推送 UI，让"音乐规划过程"可见。

参考在线来源 \[1]\[3]。

***

## 5. 真实声源研究：Freesound CC0

### 5.1 结论：为什么必须用真实采样

早期版本用脚本合成的假 WAV（"psylab"系列）与通用模拟合成器暖音垫底，最终听感被判定为"哔哔啵啵的电子音，不是 Psytrance 用的那种"。根源在三点：

1. **音源类型错配**：普通合成器音符与 psytrance 的专属音色无关。
2. **大范围移调劣化**：把录音拉到远离原位的音高，会明显失真。
3. **采样包络违和**：合成音缺乏真实乐器的瞬态与共振。

结论：**旋律声部必须使用真实 Psytrance 录音采样**。

### 5.2 授权方案：Freesound CC0

选用了 **Freesound** 上以 **Creative Commons 0（公有领域，可商用、无需署名）** 发布的真实音源，共 **23 个 CC0 采样 + 3 个 Tone.js 鼓机单音**。

CC0 意味着可以自由商用、无需署名——这是它被选中的关键；而 CC-BY 系列虽可商用但需署名，审查成本更高。

### 5.3 采样清单概览

| 声部          | 素材                                              | 来源性质                        |
| ----------- | ----------------------------------------------- | --------------------------- |
| Kick        | 3 只 psytrance 专用 kick                           | 专业 psy kick 包（ASBS 等），逐小节轮换 |
| Clap        | 特调 trance clap                                  | 单音 one-shot                 |
| Hats / Perc | 踩镲 + 2 桶鼓                                       | Tone.js Techno 鼓机采样，桶鼓轮换    |
| Bass        | D#1 / F#1 模拟贝斯 one-shot、C2 rolling loop、F2 stab | 模拟合成器实录，keyzone 分区          |
| Acid        | **Roland TB-03 真机采样**、303 线、方波滑音                | 硬件/合成器 acid，低位域             |
| Lead        | 5 段 psytrance lead loop                         | 铺在旋律音域，resample 切片          |
| Pads        | 深空氛围 FX 织体                                      | 不转调纹理层                      |
| FX          | Moog Sub 37 实录 sub-drop、专业过渡 FX                 | drop 入口 / build 上升          |

完整来源（声音 ID、上传者、许可、实测基音）见 `public/samples/ATTRIBUTION.md`。

### 5.4 采样基音测量

对每个 tonal 采样用**自相关法**测量基频（工具为 `public/pitch-probe.html`）。关键结论与坑：

- **共振源（303、明亮贝斯）自相关会上锁到谐波**（例如测出 2000Hz 的谐波而非真实基频）。解法：**先一阶低通（约 500–600Hz）**、限定搜索带、并**取最低显著峰值**。

- 阈值策略：取 `max(0.6, maxCorr * 0.92)` 作为判定线；置信度 ≥0.8 的采用实测值，低于阈值则以发布者标注音名为准。

- 实测结果需与发布者标注音名**交叉核对**，避免谐波误判。

参考在线来源 \[4]\[5]\[6]。

***

## 6. 音色合成研究：Keyzone / 滤波包络 / Resample

### 6.1 Keyzone 采样（关键）

为避免大范围移调带来的劣化，每个采样按实测基音映射到 MIDI 音域，形成**分区**。引擎为每个音符选择**最近的采样分区**，仅在相邻区内移调，且**移调上限控制在 ±6 半音内**以保障音质：

- Bass keyzones：D#1(27) / F#1(30) / C2(36) / F2(41)

- Lead keyzones：基于 62 / 68 / 73 / 78 / 83 均匀铺开

- Acid keyzones：C1(24) / A#1(34) / B2(47)，位于低八度（303 bassline 音域）

### 6.2 谐振滤波包络（流派发音）

真实采样被当作"带滤波的振荡器"来用——每个音符都套用低通谐振滤波包络，刻画出该声部的流派人声：

| 模式      | 用途   | 行为                             |
| ------- | ---- | ------------------------------ |
| `pluck` | Bass | 明亮点击后快速下潜的"womp"，强化 kick 后的收紧感 |
| `sweep` | Acid | 303 式谐振扫描，先共振上升再沉降             |
| `slow`  | Lead | 缓慢绽放再向下滚落，制造延展的迷幻 lead         |

### 6.3 Resample / Chop 切片

长录音（TB-03 音符、bass rolling loop、lead loop）使用**随机起点偏移**（`randOff`），使每一击都是源素材的不同片段——这正是 psytrance 制作中经典的 **resample/chop 工作流**，既保持了真实质感，又规避了同一片段的单调重复。

### 6.4 其余技术约定

- 鼓/one-shot 层按支配声音语义处理：环境采样自带起音，仅门限尾部。

- 采样缺失时**优雅回退到合成器**（不崩溃），并在 HUD 显示"真实采样 ×N"以作校验。

- 移调范围、切片偏移量、包络时长都在各层 kit 配置中集中管理，便于后续更换音源。

***

## 7. 编曲结构研究：Build 与标志性 Break

### 7.1 曲式段落

引擎采用教科书式的 Psytrance 曲式循环：**Intro → Build → Drop → Breakdown → Outro**（breakdown 后可回到 build）。

### 7.2 Build：分 4 段能量爬坡

Build 段 5–10 小节，能量按小节进度 `prog` 逐层递进（`buildGates`）：

1. **0–25%**：底鼓 + 踩镲 + 氛围 pads + 少量 perc
2. **≥25%**：叠入贝斯
3. **≥50%**：叠入 Acid + Clap
4. **≥75%**：叠入 Lead

末两小节进入**加速鼓滚奏**：倒数第二节为 8 分音符，最后小节为全 16 分音符，力度从 `0.28 → 0.9` 渐强（velocity crescendo），clap 层兼任滚奏。

### 7.3 标志性 Signature Break（关键优化点）

Build 最后小节的**第 12–15 步（末拍）瞬间切断所有打击层**，保留 pads 延续，制造"屏息"的一拍静默，随后 **Drop 以 Moog Sub 37 实录 sub-drop 落地**。这一留白正是 psytrance drop 前标志性的张力爆点。riser（fx 69）横跨最后两小节，正好在 drop 前达到峰顶。

### 7.4 Clap 反拍的修正（曾被评为"很乱"）

初次实现用 `(beat===1 || beat===3)`，导致每小节打 8 下 clap，听感混乱。修正后：

- **Clap 只打 2/4 拍**（第 4、12 步）的严格反拍 backbeat；

- 仅在 Build 滚奏时替代反拍；

- 极少数（10%）在第 14 步出现 ghost fill 点缀。

网格校验以 DOM 单元格 `rgb(24,24,24)` 为空、其他为命中，验证了 clap 模式 `....#.......#...` 与滚奏模式 `############....`。

参考在线来源 \[1]\[7]。

***

## 8. 工程架构研究

### 8.1 技术选型

| 层  | 选型                                                            | 理由                    |
| -- | ------------------------------------------------------------- | --------------------- |
| 语言 | 严格 TypeScript（`strict`，`noUnusedLocals`/`noUnusedParameters`） | 工程可维护性、类型安全           |
| 构建 | Vite                                                          | 模块化工程结构、快速 HMR、零运行时依赖 |
| 音频 | **原生 Web Audio API**                                          | 对调度与音色实现最大化控制，无框架开销   |

### 8.2 引擎数据流

```
Transport (16分音符 tick)
   → SongEngine (check# begin-bar → 编曲切换 + 逐小节 pattern 合成 + 参数漂移)
        → VoiceManager (静音层丢弃 + 事件路由)
             → SampleKit (真实采样) 或 *Synth (合成器 fallback)
                  → 谐振滤波包络 + 声像 → 各层总线
                       → FX (混响/延迟 send)
                            → AudioContextManager (主音量 + Analyser)
                                 → 可视化读取
```

- `SongEngine` 每生成一小节，通过 `PlanSnapshot` 推送：段落、活跃声部、16 步触发网格、马尔可夫候选音符。

- UI 端通过 `Engine.onPlan / onPlayhead` 实时刷新"规划条",让生成过程本身可观测。

### 8.3 采样级精确调度

关键结论：**不要在 JS 主进程用** **`setTimeout/setInterval`** **做节拍时钟**——它们会被节流、事件循环拥塞或后台标签页降权而漂移数百毫秒。正确做法是：

- 用 `AudioContext.currentTime` 作为时钟基准，把事件调度到**音频线程的采样级时刻**（如 `osc.start(t)`、`bufferSource.start(t, offset)`）。

- 用 **look-ahead 调度器**：提前若干毫秒把即将到来的音符批量排入音频图，UI 更新与音频调度解耦。

参考在线来源 \[8]\[9]。

***

## 9. 无限不重复生成机制

### 9.1 总体策略：规则底层 + 变奏上层

- **底层规则**保证永远是"像 Psytrance"的东西：固定的曲式、节拍、分层门控、风格参数集。

- **上层变奏**负责永不重复：种子 + 小节哈希驱动的确定性 PRNG，以及马尔可夫旋律。

### 9.2 种子与可复现

- 全局种子 + 每小节 `hash2(seed, bar)` 派生该小节的随机数流 → **同一种子可完整复现**一段音乐。

- 根音从 `[33,36,38,40,43]`（C1–G1）随机选取，调式从风格音阶池随机选取。

- 曲式切换、build 长度、drop/breakdown 走向都由 `hash2(seed, bar*97+sectionCode)` 确定性决定。

### 9.3 马尔可夫链旋律

一阶马尔可夫链在"上一音阶内"做基于转移概率的游走，候选音符及其概率实时暴露给 UI。这样旋律在"催眠式重复"与"永不字面重复"之间取得平衡。

### 9.4 稳定性验证

生产构建在 `vite preview` 端口跨多个小节运行 **14 分钟以上零控制台报错**，验证了无限生成与真实采样的稳定性。

***

## 10. 界面设计研究

### 10.1 设计演进

界面经历两次关键调研与重设计：

1. **第一版**被认为不够精致。
2. **深色暗霓虹 + Glassmorphism"Liquid Glass"仪表盘**：磨砂玻璃面板、动态网格混合渐变光斑、噪点纹理、渐变标题、发光滑块与状态灯——追求 GitHub 上高分前端设计风格。
3. **最终版：黑白灰极简**：纯黑底 + 点阵网格背景 + 反白激活态 + 单色示波器。用户最终偏好**克制、高对比、去装饰**的极简美学。

### 10.2 核心界面元素

- **Header**：标题、播放状态点、BPM、时间码。

- **规划条（Planner）**：

  - Now Playing：当前段落徽标、调式、根音、种子胶囊、活跃声部 chips。

  - **马尔可夫候选块**：当前音高 + 各候选音符的转移概率条（选中项反白）。

  - **16 步 Bar Grid**：每个声部一行的逐拍触发网格（按力度灰度）。

- **主舞台**：单色示波器（镜像频谱列 + 节拍脉冲环 + 波形底衬）+ 段落/小节/步数读数。

- **侧栏**：Transport 控制、子风格切换、Psy 参数（迷幻深度、亮度、失真、空间）滑块。

- **交互**：点击声部名即**试听该声部音色**（异步预览）；每行独立**静音开关**（关后该行变暗、顶部 chip 变灰）；预览不受静音影响。

***

## 11. 踩坑记录与经验教训

| 问题                     | 根因                  | 解法                                    | <br />               | <br />                     |
| ---------------------- | ------------------- | ------------------------------------- | :------------------- | :------------------------- |
| 听感"哔哔啵啵不像 Psytrance"   | 脚本合成假 WAV + 通用合成器音垫 | 换成 23 个真实 CC0 psytrance 采样            | <br />               | <br />                     |
| 基频测量锁谐波（如 2000Hz）      | 自相关在共振源上锁到 2 次谐波    | 先低通(500–600Hz)、限定搜索带、取最低显著峰值，并与标注音名核对 | <br />               | <br />                     |
| 大范围移调失真                | 单一采样硬拉到远音高          | Keyzone 分区，移调 ≤±6 半音                  | <br />               | <br />                     |
| clap 很乱                | \`(beat===1         | <br />                                | beat===3)\` 每小节打 8 下 | 严格 2/4 拍反拍 + 罕见 ghost fill |
| build 不像 build、无 break | 结构扁平                | 4 段能量爬坡 + 加速军鼓滚奏 + 末拍静默签名 break       | <br />               | <br />                     |
| 调时漂移                   | setTimeout 做主时钟     | 改用 AudioContext 采样级调度 + look-ahead    | <br />               | <br />                     |
| 浏览器点击 ref 失效           | 页面在验证中被更新，旧引用过期     | 每次操作前重新快照、取新 ref                      | <br />               | <br />                     |
| 多行 e2e 脚本返回 undefined  | 多行 const 声明不被求值     | 改用单表达式 / 逗号组合 / 赋值表达式                 | <br />               | <br />                     |

***

## 12. 结论与可复用要点

PsyTranceEngine 的核心洞察可提炼为几条可复用的"配方"：

1. **流派先于代码**：先弄清目标流派的节奏、调式、音色与曲式，再动手。
2. **真实采样 > 合成**：听感上的"对不对"，很大程度取决于音源是否真实；授权优先选 CC0。
3. **Keyzone + 滤波包络 + 切片** 三者组合，是把普通采样变成"流派化声音"的三板斧。
4. **无限不重复 = 规则 × 变奏**：物理级规则保证稳定性，种子 + 马尔可夫保证新颖性。
5. **精确调度是音频应用的生命线**：永远锚定 `AudioContext.currentTime`，避开主进程时钟。
6. **让生成可观测**：把规划快照推给 UI（段落/活跃声部/触发网格/马尔可夫候选），既便于调试，也构成特色交互。
7. **争议处"求简"**：Clap、Break 这类争议点，回归教科书式克制设计，往往比复杂更正确。

后续可扩展方向：Psybient/Psychill 降速分支、更长程的和声演进（整段调性规划）、真实采样与合成器的混编、以及更多 Freesound 素材库接入。

***

## 13. 参考来源

> 本项目的流派、音色、授权与工程结论，参考了以下在线资料。项目内部依据见 `README.md`、`public/samples/ATTRIBUTION.md` 与 `src/` 源码注释。

- **\[1] Psythrereich / Psytrance Guide — 子风格 BPM 概览**
  <https://psytranceguide.com/>

- **\[2] Psytrance Production: Driving Basslines, Psychedelic Leads, and Buildups — 子风格参数**
  <https://plugg-supply.net/articles/psytrance-production>

- **\[3] William Ivy — Goa Trance from Scratch（调式与音阶）**
  <https://www.williamivy.com/posts/goa-trance-from-scratch/>

- **\[4] Roland — The 303 Story（TB-303 与 Acid 的历史）**
  <https://www.roland.com/nz/promos/303day/>

- **\[5] Freesound FAQ — 站点许可说明（CC0）**
  <https://freesound.org/help/faq/>

- **\[6] Freesound 论坛 — CC0 / Public Domain 使用说明**
  <https://freesound.org/forum/legal-help-and-attribution-questions/39864/>

- **\[7] Psytrance 结构/Build-up 相关制作参考（Tone.js 与 look-ahead 调度对比）**
  <https://sethbrasile.github.io/ez-web-audio/examples/timing.html>

- **\[8] Tone.js — Web Audio 采样级调度能力**
  <https://github.com/Tonejs/Tone.js>

- **\[9] eZ Web Audio — Why Timing Drifts（主进程时钟不可靠）**
  <https://sethbrasile.github.io/ez-web-audio/examples/timing.html>

> 说明：部分在线来源（如 Psytrance Guide、plugg-supply、williamivy）为社区/制作类资料，其数值经与多个来源交叉比对后纳入本文；官方一手来源（Roland、Freesound）已在上方标出。引擎内部的最终数值（风格参数、keyzone 基音、编曲门控等）以源代码为准。

