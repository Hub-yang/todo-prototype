# todo-prototype

JavaScript 原型链可视化。Vue 3 + Vite + UnoCSS + TypeScript + `@vue-flow/core`。

本文件只放**约束**：现役禁令、跨文件的隐式契约、踩过的坑及其理由。
叙述性内容（架构、决策、进度、走查）在 [`.docs/`](.docs/)，按下面的索引按需读。

## 常驻索引

- **每次开工必读**：本文件 → [`.docs/README.md`](.docs/README.md) 按表接上下文 →
  [`.docs/progress.md`](.docs/progress.md) 看「现在到哪了、还欠什么」。
- **每次提交必走** `/commit` skill，不要手写 `git add` + `git commit` 绕过去——
  该 skill 里有本仓库的提交规则（Conventional Commits、不加 `Co-Authored-By` trailer），
  手动操作会漏掉，产出不合规的 commit。

## 触发式索引

- **改画布几何之前**（`core/layout.ts` 的行高与列宽、`ProtoCanvas` 的边标签位置、`fitAll` 的浮层让位）
  **→ 读 [`.docs/reviews/2026-09-11-一期走查.md`](.docs/reviews/2026-09-11-一期走查.md) →**
  不读的后果是：把「标签压节点 0 / 标签互相压 3308」这个**已量化的取舍**当成 bug 改回去，
  退回到更伤阅读的那一版。那份文档里有 13 场景 × 四个版本的实测面积对照。
- **用浏览器验证任何画布效果之前 → 读同一份走查报告的「观测手段先自证可信」一节 →**
  不读的后果是：插件驱动的标签页默认 `visibilityState: 'hidden'`，rAF 被暂停、`fitView` 不生效，
  于是 `getBoundingClientRect` 全部失真，同一份代码连测两次能差出 3 倍。拿着假数据改代码，
  改完还以为修好了。
- **动 `src/core/` 的导出签名之前 → 读 [`.docs/architecture.md`](.docs/architecture.md) →**
  不读的后果是：`replay` / `layout` / `resolveLookup` 被 13 个场景数据和整个画布层共同依赖，
  改签名的波及面远大于看上去的一个文件。
- **想推翻某个既定做法（加第三个主题、改导出方式、做 GIF、动分期边界）之前 →
  读 [`.docs/decisions.md`](.docs/decisions.md) →** 不读的后果是：把当初权衡过的结论
  当成没人想过的疏漏「顺手改正」，重走一遍已经走过的弯路。

## 工程禁令

- **`src/core/**` 不得 import 任何 Vue、Vue Router、VueUse、Vue Flow 或浏览器 API。**
  由 [`eslint.config.js`](eslint.config.js) 针对该目录的 `no-restricted-imports` 强制。
  理由：图数据的三个难点（patch 重放、分层布局、查找路径求解）要能在 node 里直接单测。
- **`applyPatch` 必须是不可变实现**，禁止修改入参。
  理由：第 n 步的图靠 `initial` 上重放得出，改了入参会污染 `initial`，后退功能会**静默**出错。
- **每个场景都必须有内容正确性断言**；凡是演示属性查找的步骤，**`traverse` 必须等于
  `resolveLookup` 的求解结果**。
  理由：一个原型链教学站最致命的失败不是不好看，是讲错了；动画路径与引擎算出的路径不一致，
  等于当着读者的面自相矛盾。
- **边的三种语义颜色永不混用**：`prototype`（函数 → 原型）、`proto`（`[[Prototype]]`，主角）、
  `constructor`（原型 → 函数）。颜色在这里是教学信息的一部分，不是装饰。
- **场景源码字符串里含模板字符串时**，需加 `// eslint-disable-next-line no-template-curly-in-string`。
- 包管理器一律 `pnpm`。新增依赖取最新稳定版，已有依赖不主动升级。
- **不要在根目录重建 `docs/`。** superpowers 技能默认把 spec 与计划写到 `docs/superpowers/specs|plans/`，
  本项目一律改写到 `.docs/specs/` 与 `.docs/plans/`，走查报告写 `.docs/reviews/`。
  理由：两个协作目录并存时，新会话会读错地方。

## 设计语言

### 图标

- **来源统一**：需要图标时，一律去 <https://icones.js.org/> 查找，不要凭印象猜名字，也不要从别处复制 SVG。
- **图标库统一**：全项目只用 **Phosphor**（集合 ID `ph`，包 `@iconify-json/ph`）。
  换库是全局决策，单个组件不得自行引入第二个图标集——混用会让描边粗细、圆角、
  视觉重心不一致，这正是这条规则要防的事。
- **写法统一**：一律用 UnoCSS 图标预设的类名语法 `i-ph-<icon-name>`，直接写在元素的
  `class` 上。禁止：内联 `<svg>`、`<img>` 引图标文件、用 Unicode 字符或 emoji 充当图标
  （`▸ ▾ ◀ ▶ ⏸ ⟲ ✓ ✗ 🔗 ⤓` 这类）。

  ```html
  <!-- 正确 -->
  <span class="i-ph-play-fill" />
  <!-- 错误：Unicode 字符当图标 -->
  <span>▶</span>
  ```

- **类名必须是字面量**：UnoCSS 靠扫描源文件的**原始文本**提取类名，拼接出来的类名
  （`` `i-ph-${name}` ``）扫不到，构建后图标会消失。需要按状态切换图标时，把完整类名
  写成字面量再选择：

  ```ts
  // 正确：两个完整类名都以字面量形式出现在源文件里
  const icon = computed(() => playing.value ? 'i-ph-pause-fill' : 'i-ph-play-fill')
  // 错误：构建后扫不到
  const icon = computed(() => `i-ph-${playing.value ? 'pause' : 'play'}-fill`)
  ```

- **纯图标按钮必须有无障碍名**：图标元素本身没有文本，给按钮加 `aria-label`（`title`
  同时提供 hover 提示）。否则读屏用户听到的是一个空按钮。
- **例外——不算图标的符号**：`src/scenes/*.ts` 里的 `value: 'ƒ'` / `value: '⟐'` 是
  **属性值文本**，是 Chrome DevTools 风格的代码排版符号（DevTools 展示函数属性时
  就写 `ƒ`），属于内容而非界面图标，不受本规则约束，不要顺手把它们改成图标。

以上四条由 [`src/__tests__/design-language.test.ts`](src/__tests__/design-language.test.ts) 守卫——
它们不会让任何功能测试变红，所以专门有一条守卫测试把它钉死。

### 颜色

- 组件里**禁止出现任何颜色字面量**，一律走 [`src/styles/tokens.css`](src/styles/tokens.css) 里的
  design token（`var(--node-border)`、`var(--text-muted)` 等），UnoCSS 的 `theme.colors` 也全部指向 token。
- 原因：项目有 `aurora` / `neon` / `paper` 三套主题，`paper` 专供图片导出。任何写死的
  色值都会在切主题或导出时露馅。
- **`paper` 不进主题切换器**，它只在导出时被 `exportImage` 临时切入、导出后还原。

### 浮层与动效

- `backdrop-filter` 只允许出现在浮层（面板、工具条、搜索框）上。画布节点不用，
  否则导出图片时会出现大面积模糊与性能问题。
- **辉光一律用 CSS `filter: drop-shadow(0 0 var(--glow-size) var(--glow-color))`，禁止使用
  SVG `<filter>`。** 原因：SVG filter 的 `stdDeviation` 不是 CSS 属性、无法被变量驱动，
  换个主题就得换掉整棵 filter 节点。
- **流光只在 `traverse` 播放时开启，静止时是实线。** 全屏持续爬行的虚线看久了眩晕，
  也会稀释关键时刻的注意力。
