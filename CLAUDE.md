# todo-prototype

JavaScript 原型链可视化。Vue 3 + Vite + UnoCSS + TypeScript + @vue-flow/core。

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

### 颜色

- 组件里**禁止出现任何颜色字面量**，一律走 `src/styles/tokens.css` 里的 design token
  （`var(--node-border)`、`var(--text-muted)` 等），UnoCSS 的 theme.colors 也全部指向 token。
- 原因：项目有 `aurora` / `neon` / `paper` 三套主题，`paper` 专供图片导出。任何写死的
  色值都会在切主题或导出时露馅。

### 浮层

- `backdrop-filter` 只允许出现在浮层（面板、工具条、搜索框）上。画布节点不用，
  否则导出图片时会出现大面积模糊与性能问题。
