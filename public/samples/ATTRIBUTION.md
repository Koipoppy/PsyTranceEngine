# 采样来源与许可 Attribution

## Freesound（CC0 / 公有领域）

所有旋律声部与 FX 均取自 **Freesound**（`https://freesound.org`）上以
**Creative Commons 0**（公有领域，可商用、无需署名）发布的真实音源，
经 CDN 预览转码（128 kbps MP3）下载。文件名前缀 `fs<声音ID>` 即
Freesound 声音编号，页面链接为 `https://freesound.org/s/<ID>/`。

| 文件 | 声音 ID | 上传者 | 内容 | keyzone 基音 (MIDI) |
|------|---------|--------|------|------|
| `fs128625-psy-kick-asbs.mp3`         | 128625 | ASBS    | Pure Psytrance Kick（专业 psytrance kick 包） | — |
| `fs818654-psy-kick-02.mp3`           | 818654 | 3905081 | Psytrance Kick 02 | — |
| `fs171828-psy-kick-original.mp3`     | 171828 | 537676  | Psy Kick Original（含 65Hz 低频） | — |
| `fs724046-trance-clap.mp3`           | 724046 | 3963805 | 特调 trance clap | — |
| `fs859188-psy-bass-oneshot-eb.mp3`   | 859188 | 17675683 | Psytrance Bass One-shot（PhasePlant） | 27 (D#1，实测) |
| `fs706090-psy-bass-fs-punchy.mp3`    | 706090 | 12724901 | Psy-Trance Bass（冲击感起音） | 30 (F#1，实测) |
| `fs554834-psy-bass-roll-c140.mp3`    | 554834 | 3546920 | Arturia Minibrute 2S 录制 rolling bass（C，140bpm） | 36 (C2，名义) |
| `fs616687-psy-bass-f2.mp3`           | 616687 | 3963805 | Sylenth1 Psy Bass（F2） | 41 (F2，名义) |
| `fs467920-acid-tb03-c.mp3`           | 467920 | SGAK    | **Roland TB-03 真机采样**（C 持续音，带失真） | 24 (C1，实测) |
| `fs627753-acid-303-b2.mp3`           | 627753 | 13140709 | 303 合成器 acid line | 34 (A#1，实测) |
| `fs612195-acid-square-slide.mp3`     | 612195 | 13576318 | 虚拟模拟方波贝斯（带滑音+副振荡器） | 47 (B2，实测) |
| `fs162349-goa-lead-glide.mp3`        | 162349 | 2448533 | Goa 锯齿滑音 lead（Pro-53） | 62 (切片区) |
| `fs668775-psy-lead-145.mp3`          | 668775 | 952419  | Harmless VST psytrance lead（145bpm，8 小节） | 68 (切片区) |
| `fs819438-psy-oneshot-03.mp3`        | 819438 | 3905081 | Psytrance One Shot | 73 (切片区) |
| `fs829204-psy-lead-fm147.mp3`        | 829204 | STTTL   | FM synth line（147bpm，E 大调，sharp transient） | 78 (切片区) |
| `fs700382-psy-lead-robot.mp3`        | 700382 | 952419  | Robot Psy Lead（Serum 双共振峰+失真） | 83 (切片区) |
| `fs829203-psy-atmo-fxloop.mp3`       | 829203 | STTTL   | 深空氛围 FX 织体（147bpm，rising swells） | — |
| `fs475005-sub-drop-moog.mp3`         | 475005 | 2617886 | **Moog Sub 37 实录** sub bass drop | — |
| `fs829228-psy-fx-shot8.mp3`          | 829228 | STTTL   | Psytrance 过渡 FX（8s，riser） | — |
| `fs829223-psy-fx-shot3.mp3`          | 829223 | STTTL   | Psytrance 过渡 FX（6.4s） | — |

基频由自相关法在解码后的音频上实测（`public/pitch-probe.html`，
置信度 ≥0.8 者采用；低于阈值的以发布者标注音名为准）。
Lead 层素材为旋律 loop，按 62–83 MIDI 均匀铺开作为 resample 切片区。

## Tone.js 音色库（鼓组单音）

踩镲与桶鼓单音取自 **Tone.js 官方示例音色库**
（`https://github.com/Tonejs/audio`，开放访问）的鼓机采样：

| 文件 | 原路径（`https://tonejs.github.io/audio/` 下） | 用途 |
|------|------|------|
| `techno-hihat.mp3` | `drum-samples/Techno/hihat.mp3` | Hats 踩镲 |
| `techno-tom1.mp3`  | `drum-samples/Techno/tom1.mp3`  | Perc 桶鼓（轮换） |
| `techno-tom2.mp3`  | `drum-samples/Techno/tom2.mp3`  | Perc 桶鼓（轮换） |

## 设计说明

- **Kick**：三只 psytrance 专用 kick 逐小节轮换。
- **Bass**：模拟合成器实录 one-shot 按 D#1/F#1/C2/F2 分区（keyzone），
  每个音符仅在 ±6 半音内移调；rolling bass loop 以随机偏移切片，
  每一击都是源素材的不同片段。
- **Acid**：以 Roland TB-03 真机采样为主体，运行在低八度
  （303 bassline 音域），叠加 303 式谐振扫频滤波包络。
- **Lead**：五段 psytrance lead loop 均匀铺在旋律音域，
  就近选择、随机偏移切片——即 psytrance 制作中的 resample/chop 手法。
- **FX**：drop 入口落 Moog Sub 37 实录 sub-drop，build 末小节
  使用专业过渡 FX。
