# 1940Netdisk 图标生成提示词（方案 A：复古硬盘徽章）

> 适用于 GPT-2o / DALL·E / Midjourney / Stable Diffusion

---

## 提示词（中文版）

```
为 "1940Netdisk" 设计一个品牌图标/标志。1940Netdisk 是一个基于 Cloudflare 的图床服务，设计风格为军事工业风 + 玻璃态。

风格：工业纹章徽章，类似二战时期军用设备铭牌与现代极简科技风格的结合。

构图：
- 圆形或盾形金属徽章，外圈有铆钉装饰
- 中心是一个风格化的双磁盘片叠层（复古硬盘盘片，带有同心圆轨道纹理，类似黑胶唱片）
- 磁盘后方有淡淡的齿轮轮廓
- 底部有一条铆钉金属带，上面刻有粗体 "1940" 字样
- 整体造型紧凑，像徽章一样，适合用作 16x16 的 favicon 和应用图标

配色：
- 主色：钢灰 (#2a3344)、铁青蓝灰 (#1a2332)
- 点缀色：磨砂琥珀橙 (#d4a54a)，少量使用于 1940 文字或磁盘中心
- 高光：银/铬色边缘，微妙的锈色或铜色底色
- 背景：深色，像武器/设备的发蓝处理表面

氛围：坚固、可靠、复古工业、"像坦克一样坚固"，但执行风格现代流畅。不可爱，不花哨 — 严肃而结实。

规格：
- 方形比例 (1:1)
- 干净的矢量几何，锐利的线条
- 适合缩小到 16px 时仍可识别
- 除了 "1940" 数字外没有其他文字
- 深色背景，金属铬/银色前景元素
- 金属表面有微妙的照明/反光
```

---

## English Prompt (for GPT-2o / DALL·E)

```
Create a brand icon/logo for "1940Netdisk", a Cloudflare-based image hosting service with a military-industrial + glassmorphism design aesthetic.

STYLE: Industrial heraldic badge, like a WWII-era military equipment nameplate mixed with modern tech minimalism.

COMPOSITION:
- A circular or shield-shaped metal badge with rivets on the outer ring
- Center features a stylized dual-platter hard disk (vintage HDD platters with concentric ring textures, like vinyl records)
- Behind the disk, subtle gear/cogwheel silhouettes
- Bottom has a bold riveted metal band with the number "1940" engraved
- Overall shape is compact, badge-like, suitable for a 16x16 favicon and app icon

COLOR PALETTE:
- Primary: Steel gray (#2a3344), Iron blue-gray (#1a2332)
- Accent: Burnished amber/orange (#d4a54a, used sparingly on the 1940 text or disk center)
- Highlights: Silver/chrome edges, subtle rust or copper undertones
- Background: Dark, like a weapon/equipment blueing finish

MOOD: Rugged, reliable, vintage-industrial, "built like a tank", but with a sleek modern execution. Not cute, not playful — serious and sturdy.

SPECS:
- Square aspect ratio (1:1)
- Clean vector geometry, sharp lines
- Suitable for favicon scaling (recognizable at 16px)
- No text other than the "1940" number
- Dark background with metallic chrome/silver foreground elements
- Subtle lighting/shine on metal surfaces
```

---

## 使用说明

1. 将英文版提示词复制到 **ChatGPT (GPT-2o)** / **DALL·E** / **Midjourney** 中生成
2. 生成后将图片保存为 `favicon.png` 或 `favicon.svg`（建议 PNG 格式，256x256 以上）
3. 替换项目根目录下的 `favicon.ico` / `favicon.svg`
4. 所有 HTML 页面已引用 `favicon.svg`，替换后全局生效
