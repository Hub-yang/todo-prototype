# JS 原型链可视化站点 · 计划一：核心引擎与画布

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭出一个能跑、能分享、能导图的原型链可视化站点，并用 `a2`（`new` 四步）与 `b1`（属性查找逐跳）两个真实场景端到端验证引擎。

**Architecture:** 纯 TS 的 `core/` 层负责图数据（patch 重放、分层布局、查找路径求解），对 Vue 与 DOM 零依赖，因此可在 node 中直接单测；Vue 组件层用 Vue Flow 承载拖拽与视口，节点/边全部自绘；三种模式（场景播放、二期沙盒、三期练习）共用同一个 `GraphState` 出口。

**Tech Stack:** Vue 3 `<script setup>` + Vite + TypeScript + UnoCSS + VueUse + `@vue-flow/core` + Vitest + `@antfu/eslint-config` + pnpm

**Spec:** `docs/superpowers/specs/2026-09-10-prototype-chain-visualizer-design.md`

## Global Constraints

- 包管理器一律 `pnpm`；新增依赖取**最新稳定版**，已有依赖不主动升级。
- `src/core/**` **禁止 import 任何 Vue、DOM、浏览器 API**，只能是纯 TS。这条由 Task 2 的 lint 规则强制。
- 组件与样式中**禁止硬编码任何颜色值**，一律走 `src/styles/tokens.css` 的 CSS 变量。
- 辉光一律用 CSS `filter: drop-shadow(0 0 var(--glow-size) var(--glow-color))`，**禁止使用 SVG `<filter>`**。
- `backdrop-filter` **只允许出现在浮层组件**（`CodePanel`、`StepPanel`、工具栏），禁止用于节点。
- 边的三种语义颜色永不混用：`prototype` → `--edge-prototype`，`proto` → `--edge-proto`，`constructor` → `--edge-constructor`。
- `applyPatch` 必须是**不可变实现**，禁止修改入参。
- 代码注释、UI 文案一律**简体中文**。
- 提交遵循 Conventional Commits，**不添加 `Co-Authored-By` trailer**。
- 主题只有 `aurora`（默认）、`neon` 两个可切换；`paper` 仅供导出，不进切换器。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/core/types.ts` | `GraphState` / `ProtoNode` / `PropRow` / `ProtoEdge` / `GraphPatch` / `Step` / `Scene` 类型定义 |
| `src/core/patch.ts` | `applyPatch`（不可变）、`replay(scene, n)` |
| `src/core/layout.ts` | `layout(graph)` 分层布局，纯函数 |
| `src/core/traverse.ts` | `resolveLookup(graph, startId, key)` 求解属性查找路径 |
| `src/core/index.ts` | core 层统一出口 |
| `src/scenes/a2-new.ts` | 场景：`new` 到底做了什么 |
| `src/scenes/b1-lookup.ts` | 场景：属性查找逐跳 |
| `src/scenes/index.ts` | 场景注册表 |
| `src/styles/tokens.css` | 三套主题的 design token |
| `src/composables/useTheme.ts` | 主题切换 + 持久化 |
| `src/composables/usePlayer.ts` | 步进/播放/键盘控制 |
| `src/composables/useShareLink.ts` | 深链读写 |
| `src/components/canvas/ProtoCanvas.vue` | Vue Flow 封装：接布局、拖拽、重置、聚焦 |
| `src/components/canvas/ProtoNode.vue` | 自定义节点：标题行 + 属性行 Handle + 折叠 |
| `src/components/canvas/ProtoEdge.vue` | 自定义边：三色语义 + 流光 |
| `src/components/panels/CodePanel.vue` | 可折叠代码浮层 + 当前行高亮 |
| `src/components/panels/StepPanel.vue` | 可折叠步骤浮层 + 播放控制 |
| `src/components/ExportButton.vue` | 导出 PNG（`paper` 主题离屏重渲） |
| `src/pages/index.vue` | 场景列表 |
| `src/pages/s/[id].vue` | 场景播放页 |

**关于 spec §5.3 的 `sceneAdapter`：** 一期不单独建 `src/adapters/scene/` 目录。场景 DSL 到 `GraphState` 的转换就是 `core/patch.ts` 的 `replay()`，再包一层空壳适配器只会增加间接层而无任何收益（YAGNI）。二期新增 `src/adapters/runtime/`、三期新增 `src/adapters/exercise/` 时，两者的出口类型与 `replay()` 一致（都返回 `GraphState`），画布层无需改动——spec 要求的"三个适配器同一个出口"在类型层面依然成立。

---

## Task 1: 项目脚手架与工具链

**Files:**
- Create: `package.json`、`vite.config.ts`、`uno.config.ts`、`tsconfig.json`、`tsconfig.node.json`、`eslint.config.js`、`index.html`、`src/main.ts`、`src/App.vue`、`.vscode/settings.json`、`.vscode/extensions.json`
- Test: `src/core/__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: 无（首个任务）
- Produces: 可运行的 `pnpm dev` / `pnpm build` / `pnpm test` / `pnpm lint`；全局别名 `~/` 指向 `src/`

- [ ] **Step 1: 初始化 Vite + Vue + TS 工程**

在仓库根目录执行（当前目录已有 `.git`、`docs/`、`.gitignore`，用 `.` 就地创建）：

```bash
pnpm create vite . --template vue-ts
```

若提示目录非空，选择保留已有文件（`Ignore files and continue`）。

- [ ] **Step 2: 安装依赖**

```bash
pnpm add @vue-flow/core vue-router @vueuse/core
pnpm add -D unocss @unocss/reset vitest happy-dom @vue/test-utils \
  @antfu/eslint-config eslint unplugin-auto-import unplugin-vue-components \
  vite-plugin-pages @types/node
```

- [ ] **Step 3: 配置 Vite（含 Vitest、自动导入、自动路由、路径别名）**

写入 `vite.config.ts`：

```ts
/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Vue from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    Vue(),
    UnoCSS(),
    Pages({ dirs: 'src/pages' }),
    AutoImport({
      imports: ['vue', 'vue-router', '@vueuse/core'],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({ dirs: ['src/components'], dts: 'src/components.d.ts' }),
  ],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: 配置 UnoCSS，把主题色接到 CSS 变量上**

写入 `uno.config.ts`：

```ts
import { defineConfig, presetIcons, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno(), presetIcons()],
  theme: {
    colors: {
      // 全部指向 token，组件里禁止出现色值字面量
      canvas: 'var(--canvas-bg)',
      surface: 'var(--node-surface)',
      edgeProto: 'var(--edge-proto)',
      edgePrototype: 'var(--edge-prototype)',
      edgeCtor: 'var(--edge-constructor)',
      ink: 'var(--text-primary)',
      muted: 'var(--text-muted)',
    },
  },
})
```

- [ ] **Step 5: 配置 ESLint 与 VS Code**

写入 `eslint.config.js`：

```js
import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  unocss: true,
  ignores: ['docs/**', '.superpowers/**'],
}, {
  // core 层必须保持纯净：不得引入 Vue 或浏览器 API
  files: ['src/core/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: ['vue', 'vue-router', '@vueuse/*', '@vue-flow/*'],
    }],
  },
})
```

`.vscode/settings.json` 与 `.vscode/extensions.json` **必须照抄 `@antfu/eslint-config` README 的 "VS Code support" 章节原文，不得按本项目实际语言裁剪**。执行时先打开 <https://github.com/antfu/eslint-config> 的 README 核对一次再落盘。核对基准（若 README 已更新，以 README 为准）：

```json
// .vscode/settings.json
{
  "prettier.enable": false,
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "eslint.rules.customizations": [
    { "rule": "style/*", "severity": "off", "fixable": true },
    { "rule": "format/*", "severity": "off", "fixable": true },
    { "rule": "*-indent", "severity": "off", "fixable": true },
    { "rule": "*-spacing", "severity": "off", "fixable": true },
    { "rule": "*-spaces", "severity": "off", "fixable": true },
    { "rule": "*-order", "severity": "off", "fixable": true },
    { "rule": "*-dangle", "severity": "off", "fixable": true },
    { "rule": "*-newline", "severity": "off", "fixable": true },
    { "rule": "*quotes", "severity": "off", "fixable": true },
    { "rule": "*semi", "severity": "off", "fixable": true }
  ],
  "eslint.validate": [
    "javascript", "javascriptreact", "typescript", "typescriptreact",
    "vue", "html", "markdown", "json", "json5", "jsonc", "yaml", "toml",
    "xml", "gql", "graphql", "astro", "svelte", "css", "less", "scss",
    "pcss", "postcss"
  ]
}
```

```json
// .vscode/extensions.json
{
  "recommendations": ["dbaeumer.vscode-eslint"]
}
```

- [ ] **Step 6: 接入 commitlint 与 husky**

```bash
pnpm add -D @huberyyang/todo-scripts
pnpm exec commitlint-init
```

检查生成的 `.husky/pre-commit` 里 lint-staged 命令**不带 `.`**（应为 `eslint --fix` 而非 `eslint . --fix`），否则会对整个仓库跑 lint。若带了就手动去掉。

- [ ] **Step 7: 写冒烟测试**

写入 `src/core/__tests__/smoke.test.ts`：

```ts
import { describe, expect, it } from 'vitest'

describe('工具链冒烟', () => {
  it('vitest 可运行', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 8: 验证四条命令全部通过**

```bash
pnpm test --run
pnpm lint
pnpm build
pnpm dev   # 手动打开确认页面能起，确认后 Ctrl+C
```
Expected: 测试 PASS、lint 无 error、build 成功产出 `dist/`。

- [ ] **Step 9: 提交**

```bash
git add -A
git commit -m "chore: 初始化 Vue3 + Vite + UnoCSS + Vitest 工程与规范工具链"
```

---

## Task 2: core 类型与 patch 引擎

**Files:**
- Create: `src/core/types.ts`、`src/core/patch.ts`、`src/core/index.ts`
- Test: `src/core/__tests__/patch.test.ts`

**Interfaces:**
- Consumes: Task 1 的工程配置
- Produces:
  - `applyPatch(graph: GraphState, patch: GraphPatch): GraphState`
  - `replay(scene: Scene, step: number): GraphState`
  - 全部类型：`GraphState`、`ProtoNode`、`PropRow`、`ProtoEdge`、`EdgeKind`、`GraphPatch`、`Step`、`Scene`

- [ ] **Step 1: 写类型定义**

写入 `src/core/types.ts`：

```ts
/** 节点内的一行属性 */
export interface PropRow {
  key: string
  value: string
  /** internal 表示 [[Prototype]] 这类内部槽 */
  kind: 'data' | 'accessor' | 'internal'
  /** 指向另一个节点的 id；有此字段的行即为一条边的锚点 */
  refTo?: string
}

/** 图中的一个节点，对应 JS 世界里的一个「值」 */
export interface ProtoNode {
  id: string
  label: string
  kind: 'function' | 'plain' | 'prototype' | 'instance' | 'null'
  props: PropRow[]
  meta?: {
    builtin?: boolean
    collapsed?: boolean
  }
  // 刻意不含 position：坐标是 layout() 的产出，不属于数据模型
}

/** 边的三种语义，颜色永不混用 */
export type EdgeKind = 'prototype' | 'proto' | 'constructor'

export interface ProtoEdge {
  id: string
  source: string
  target: string
  kind: EdgeKind
  /** 从哪一行属性出发，值为 PropRow.key */
  sourceHandle?: string
}

export interface GraphState {
  nodes: ProtoNode[]
  edges: ProtoEdge[]
}

export type GraphPatch =
  | { op: 'addNode', node: ProtoNode }
  | { op: 'removeNode', id: string }
  | { op: 'updateNode', id: string, patch: Partial<Pick<ProtoNode, 'label' | 'kind' | 'meta'>> }
  | { op: 'addEdge', edge: ProtoEdge }
  | { op: 'removeEdge', id: string }
  | { op: 'addProp', nodeId: string, prop: PropRow }
  | { op: 'updateProp', nodeId: string, key: string, patch: Partial<PropRow> }
  | { op: 'removeProp', nodeId: string, key: string }

export interface Step {
  title: string
  narration: string
  /** 需高亮的代码行区间，1 起算，闭区间 */
  codeRange?: [number, number]
  patch: GraphPatch[]
  focus?: { nodes: string[], edges: string[] }
  /** 沿这些边 id 逐跳流光 */
  traverse?: string[]
}

export interface Scene {
  id: string
  title: string
  code: string
  initial: GraphState
  steps: Step[]
}
```

- [ ] **Step 2: 写失败的测试**

写入 `src/core/__tests__/patch.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { applyPatch, replay } from '../patch'
import type { GraphState, Scene } from '../types'

function baseGraph(): GraphState {
  return {
    nodes: [{ id: 'p1', label: 'p1', kind: 'instance', props: [] }],
    edges: [],
  }
}

describe('applyPatch', () => {
  it('addNode 会新增节点', () => {
    const next = applyPatch(baseGraph(), {
      op: 'addNode',
      node: { id: 'Person', label: 'Person', kind: 'function', props: [] },
    })
    expect(next.nodes.map(n => n.id)).toEqual(['p1', 'Person'])
  })

  it('不可变：不得修改入参', () => {
    const g = baseGraph()
    const snapshot = JSON.stringify(g)
    applyPatch(g, { op: 'addProp', nodeId: 'p1', prop: { key: 'name', value: '\'Ada\'', kind: 'data' } })
    expect(JSON.stringify(g)).toBe(snapshot)
  })

  it('addProp 追加属性行', () => {
    const next = applyPatch(baseGraph(), {
      op: 'addProp',
      nodeId: 'p1',
      prop: { key: '[[Prototype]]', value: 'Person.prototype', kind: 'internal', refTo: 'Person.prototype' },
    })
    expect(next.nodes[0].props).toHaveLength(1)
    expect(next.nodes[0].props[0].refTo).toBe('Person.prototype')
  })

  it('removeNode 会连带删除相关的边', () => {
    const g: GraphState = {
      nodes: [
        { id: 'a', label: 'a', kind: 'plain', props: [] },
        { id: 'b', label: 'b', kind: 'plain', props: [] },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b', kind: 'proto' }],
    }
    const next = applyPatch(g, { op: 'removeNode', id: 'b' })
    expect(next.nodes.map(n => n.id)).toEqual(['a'])
    expect(next.edges).toHaveLength(0)
  })

  it('对不存在的节点做 addProp 会抛错', () => {
    expect(() => applyPatch(baseGraph(), {
      op: 'addProp',
      nodeId: '不存在',
      prop: { key: 'x', value: '1', kind: 'data' },
    })).toThrow(/不存在/)
  })
})

describe('replay', () => {
  const scene: Scene = {
    id: 'test',
    title: '测试场景',
    code: 'const p1 = {}',
    initial: baseGraph(),
    steps: [
      {
        title: '第一步',
        narration: '新增 Person',
        patch: [{ op: 'addNode', node: { id: 'Person', label: 'Person', kind: 'function', props: [] } }],
      },
      {
        title: '第二步',
        narration: '接链',
        patch: [{ op: 'addEdge', edge: { id: 'e1', source: 'p1', target: 'Person', kind: 'proto' } }],
      },
    ],
  }

  it('step=0 返回初始图', () => {
    expect(replay(scene, 0).nodes).toHaveLength(1)
  })

  it('step=1 应用第一步', () => {
    expect(replay(scene, 1).nodes).toHaveLength(2)
    expect(replay(scene, 1).edges).toHaveLength(0)
  })

  it('step=2 应用全部', () => {
    expect(replay(scene, 2).edges).toHaveLength(1)
  })

  it('重放不污染 initial（可反复调用）', () => {
    replay(scene, 2)
    expect(replay(scene, 0).nodes).toHaveLength(1)
  })

  it('越界的 step 会被夹到合法范围', () => {
    expect(replay(scene, 99).edges).toHaveLength(1)
    expect(replay(scene, -3).nodes).toHaveLength(1)
  })
})
```

- [ ] **Step 3: 运行测试，确认失败**

Run: `pnpm test --run src/core/__tests__/patch.test.ts`
Expected: FAIL，报错为找不到模块 `../patch`。

- [ ] **Step 4: 实现 patch 引擎**

写入 `src/core/patch.ts`：

```ts
import type { GraphPatch, GraphState, ProtoNode, Scene } from './types'

/** 找节点，找不到就抛错——场景数据写错要尽早暴露，而不是静默吞掉 */
function mustFind(graph: GraphState, id: string): ProtoNode {
  const node = graph.nodes.find(n => n.id === id)
  if (!node)
    throw new Error(`节点不存在：${id}`)
  return node
}

/** 对单个节点做不可变更新 */
function mapNode(graph: GraphState, id: string, fn: (n: ProtoNode) => ProtoNode): GraphState {
  mustFind(graph, id)
  return {
    ...graph,
    nodes: graph.nodes.map(n => (n.id === id ? fn(n) : n)),
  }
}

/** 施加一个 patch，返回新图，绝不修改入参 */
export function applyPatch(graph: GraphState, patch: GraphPatch): GraphState {
  switch (patch.op) {
    case 'addNode':
      return { ...graph, nodes: [...graph.nodes, patch.node] }

    case 'removeNode':
      return {
        nodes: graph.nodes.filter(n => n.id !== patch.id),
        // 节点删除时，挂在它上面的边一并删除，避免出现悬空边
        edges: graph.edges.filter(e => e.source !== patch.id && e.target !== patch.id),
      }

    case 'updateNode':
      return mapNode(graph, patch.id, n => ({ ...n, ...patch.patch }))

    case 'addEdge':
      return { ...graph, edges: [...graph.edges, patch.edge] }

    case 'removeEdge':
      return { ...graph, edges: graph.edges.filter(e => e.id !== patch.id) }

    case 'addProp':
      return mapNode(graph, patch.nodeId, n => ({ ...n, props: [...n.props, patch.prop] }))

    case 'updateProp':
      return mapNode(graph, patch.nodeId, n => ({
        ...n,
        props: n.props.map(p => (p.key === patch.key ? { ...p, ...patch.patch } : p)),
      }))

    case 'removeProp':
      return mapNode(graph, patch.nodeId, n => ({
        ...n,
        props: n.props.filter(p => p.key !== patch.key),
      }))
  }
}

/**
 * 第 n 步的图 = 初始图重放前 n 步的 patch。
 * 采用重放而非快照，后退无需实现逆操作。
 */
export function replay(scene: Scene, step: number): GraphState {
  const n = Math.max(0, Math.min(step, scene.steps.length))
  return scene.steps
    .slice(0, n)
    .flatMap(s => s.patch)
    .reduce(applyPatch, scene.initial)
}
```

写入 `src/core/index.ts`：

```ts
export * from './patch'
export * from './types'
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test --run src/core/__tests__/patch.test.ts`
Expected: PASS，11 个用例全绿。

- [ ] **Step 6: 提交**

```bash
git add src/core
git commit -m "feat(core): 实现不可变的图 patch 引擎与场景重放"
```

---

## Task 3: 分层布局算法

**Files:**
- Create: `src/core/layout.ts`
- Modify: `src/core/index.ts`（导出 layout）
- Test: `src/core/__tests__/layout.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `GraphState`、`ProtoNode`
- Produces: `layout(graph: GraphState, opts?: LayoutOptions): Map<string, { x: number, y: number }>`；`LayoutOptions = { colWidth?: number, rowHeight?: number }`，默认 `colWidth: 260`、`rowHeight: 170`

**布局规则**（原型链的图有严格语义，不能交给力导向随机摆）：

1. **深度只用 `proto` 边计算**：没有 `proto` 出边的节点深度为 0；`X --proto--> Y` 则 `depth(X) = depth(Y) + 1`。
2. **纵轴 = 深度**：深度越大越靠下（实例在下、`Object.prototype` 在上），`y = (maxDepth - depth) * rowHeight`。
3. **横轴 = 同层顺序**：同一深度内按 `graph.nodes` 的数组顺序，`x = index * colWidth`。顺序稳定，保证场景步进时节点不乱跳。
4. **函数节点贴着它的原型放**：若存在 `F --prototype--> P`，把 `F` 挪到 `P` 的同一行、左边一列（`x = x(P) - colWidth`，被占用则继续左移一列）。
5. **环保护**：`proto` 边在 JS 里不可能成环，但场景数据可能写错——递归带 visited 集合，遇到环时该节点深度取 0 并 `console.warn`，不允许栈溢出。

- [ ] **Step 1: 写失败的测试**

写入 `src/core/__tests__/layout.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import { layout } from '../layout'
import type { GraphState } from '../types'

/** p1 --proto--> Person.prototype --proto--> Object.prototype */
function chain(): GraphState {
  return {
    nodes: [
      { id: 'p1', label: 'p1', kind: 'instance', props: [] },
      { id: 'Person.prototype', label: 'Person.prototype', kind: 'prototype', props: [] },
      { id: 'Object.prototype', label: 'Object.prototype', kind: 'prototype', props: [] },
    ],
    edges: [
      { id: 'e1', source: 'p1', target: 'Person.prototype', kind: 'proto' },
      { id: 'e2', source: 'Person.prototype', target: 'Object.prototype', kind: 'proto' },
    ],
  }
}

describe('layout', () => {
  it('原型链越往上，y 越小', () => {
    const pos = layout(chain())
    expect(pos.get('Object.prototype')!.y).toBeLessThan(pos.get('Person.prototype')!.y)
    expect(pos.get('Person.prototype')!.y).toBeLessThan(pos.get('p1')!.y)
  })

  it('每个节点都有坐标', () => {
    const pos = layout(chain())
    expect(pos.size).toBe(3)
  })

  it('函数节点被放在它的 prototype 左边同一行', () => {
    const g = chain()
    g.nodes.push({ id: 'Person', label: 'Person', kind: 'function', props: [] })
    g.edges.push({ id: 'e3', source: 'Person', target: 'Person.prototype', kind: 'prototype' })
    const pos = layout(g)
    expect(pos.get('Person')!.y).toBe(pos.get('Person.prototype')!.y)
    expect(pos.get('Person')!.x).toBeLessThan(pos.get('Person.prototype')!.x)
  })

  it('同层多个节点横向排开，不重叠', () => {
    const g: GraphState = {
      nodes: [
        { id: 'a', label: 'a', kind: 'instance', props: [] },
        { id: 'b', label: 'b', kind: 'instance', props: [] },
        { id: 'root', label: 'root', kind: 'prototype', props: [] },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'root', kind: 'proto' },
        { id: 'e2', source: 'b', target: 'root', kind: 'proto' },
      ],
    }
    const pos = layout(g)
    expect(pos.get('a')!.y).toBe(pos.get('b')!.y)
    expect(pos.get('a')!.x).not.toBe(pos.get('b')!.x)
  })

  it('proto 边成环时不崩溃，并给出警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const g: GraphState = {
      nodes: [
        { id: 'a', label: 'a', kind: 'plain', props: [] },
        { id: 'b', label: 'b', kind: 'plain', props: [] },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', kind: 'proto' },
        { id: 'e2', source: 'b', target: 'a', kind: 'proto' },
      ],
    }
    expect(() => layout(g)).not.toThrow()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('constructor 边不参与深度计算', () => {
    const g = chain()
    g.edges.push({ id: 'e9', source: 'Person.prototype', target: 'p1', kind: 'constructor' })
    const pos = layout(g)
    expect(pos.get('Person.prototype')!.y).toBeLessThan(pos.get('p1')!.y)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/core/__tests__/layout.test.ts`
Expected: FAIL，找不到模块 `../layout`。

- [ ] **Step 3: 实现布局算法**

写入 `src/core/layout.ts`：

```ts
import type { GraphState } from './types'

export interface LayoutOptions {
  colWidth?: number
  rowHeight?: number
}

export interface Point { x: number, y: number }

/**
 * 分层布局：纵轴是原型链深度，横轴是同层分支。
 * 只用 proto 边计算深度——prototype / constructor 边不影响层级。
 */
export function layout(graph: GraphState, opts: LayoutOptions = {}): Map<string, Point> {
  const colWidth = opts.colWidth ?? 260
  const rowHeight = opts.rowHeight ?? 170

  const protoTarget = new Map<string, string>()
  for (const e of graph.edges) {
    if (e.kind === 'proto')
      protoTarget.set(e.source, e.target)
  }

  const depthCache = new Map<string, number>()

  function depthOf(id: string, visiting: Set<string>): number {
    const cached = depthCache.get(id)
    if (cached !== undefined)
      return cached

    if (visiting.has(id)) {
      // proto 边在 JS 中不可能成环，走到这里说明场景数据有误
      console.warn(`[layout] 检测到 proto 边成环，涉及节点：${id}`)
      depthCache.set(id, 0)
      return 0
    }

    const target = protoTarget.get(id)
    if (!target || !graph.nodes.some(n => n.id === target)) {
      depthCache.set(id, 0)
      return 0
    }

    visiting.add(id)
    const d = depthOf(target, visiting) + 1
    visiting.delete(id)
    depthCache.set(id, d)
    return d
  }

  for (const n of graph.nodes)
    depthOf(n.id, new Set())

  const maxDepth = Math.max(0, ...graph.nodes.map(n => depthCache.get(n.id) ?? 0))

  // 同层内按节点数组顺序横向排开，顺序稳定，步进时不会乱跳
  const seatByDepth = new Map<number, number>()
  const pos = new Map<string, Point>()

  for (const n of graph.nodes) {
    const d = depthCache.get(n.id) ?? 0
    const seat = seatByDepth.get(d) ?? 0
    seatByDepth.set(d, seat + 1)
    pos.set(n.id, { x: seat * colWidth, y: (maxDepth - d) * rowHeight })
  }

  // 函数节点贴着它的 prototype 节点放：同一行、左边一列
  for (const e of graph.edges) {
    if (e.kind !== 'prototype')
      continue
    const fn = pos.get(e.source)
    const proto = pos.get(e.target)
    if (!fn || !proto)
      continue

    let x = proto.x - colWidth
    const taken = (px: number) =>
      [...pos.entries()].some(([id, p]) => id !== e.source && p.x === px && p.y === proto.y)
    while (taken(x))
      x -= colWidth

    pos.set(e.source, { x, y: proto.y })
  }

  return pos
}
```

在 `src/core/index.ts` 追加：

```ts
export * from './layout'
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/core/__tests__/layout.test.ts`
Expected: PASS，6 个用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/core
git commit -m "feat(core): 实现按原型链深度分层的布局算法"
```

---

## Task 4: 属性查找路径求解

**Files:**
- Create: `src/core/traverse.ts`
- Modify: `src/core/index.ts`
- Test: `src/core/__tests__/traverse.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `GraphState`
- Produces:
  - `resolveLookup(graph, startId, key): LookupResult`
  - `protoChain(graph, startId): string[]`（从起点到链末端的节点 id 序列，含起点）
  - `LookupResult = { found: boolean, hitNodeId: string | null, edgePath: string[], nodePath: string[] }`

`protoChain` 会被 Task 13 的 hover 高亮复用，所以要单独导出。

- [ ] **Step 1: 写失败的测试**

写入 `src/core/__tests__/traverse.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { protoChain, resolveLookup } from '../traverse'
import type { GraphState } from '../types'

function graph(): GraphState {
  return {
    nodes: [
      { id: 'p1', label: 'p1', kind: 'instance', props: [{ key: 'name', value: '\'Ada\'', kind: 'data' }] },
      { id: 'Person.prototype', label: 'Person.prototype', kind: 'prototype', props: [{ key: 'say', value: 'ƒ', kind: 'data' }] },
      { id: 'Object.prototype', label: 'Object.prototype', kind: 'prototype', props: [{ key: 'toString', value: 'ƒ', kind: 'data' }] },
    ],
    edges: [
      { id: 'e1', source: 'p1', target: 'Person.prototype', kind: 'proto' },
      { id: 'e2', source: 'Person.prototype', target: 'Object.prototype', kind: 'proto' },
    ],
  }
}

describe('protoChain', () => {
  it('返回从起点到链末端的完整节点序列', () => {
    expect(protoChain(graph(), 'p1')).toEqual(['p1', 'Person.prototype', 'Object.prototype'])
  })

  it('起点不存在时返回空数组', () => {
    expect(protoChain(graph(), '不存在')).toEqual([])
  })
})

describe('resolveLookup', () => {
  it('自身命中时不产生跳转', () => {
    const r = resolveLookup(graph(), 'p1', 'name')
    expect(r.found).toBe(true)
    expect(r.hitNodeId).toBe('p1')
    expect(r.edgePath).toEqual([])
    expect(r.nodePath).toEqual(['p1'])
  })

  it('沿链找到时记录经过的边', () => {
    const r = resolveLookup(graph(), 'p1', 'say')
    expect(r.found).toBe(true)
    expect(r.hitNodeId).toBe('Person.prototype')
    expect(r.edgePath).toEqual(['e1'])
    expect(r.nodePath).toEqual(['p1', 'Person.prototype'])
  })

  it('走到链末端仍未找到时 found 为 false', () => {
    const r = resolveLookup(graph(), 'p1', '不存在的属性')
    expect(r.found).toBe(false)
    expect(r.hitNodeId).toBeNull()
    expect(r.edgePath).toEqual(['e1', 'e2'])
  })

  it('内部槽（internal）不参与属性查找', () => {
    const g = graph()
    g.nodes[1].props.push({ key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' })
    const r = resolveLookup(g, 'p1', '[[Prototype]]')
    expect(r.found).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/core/__tests__/traverse.test.ts`
Expected: FAIL，找不到模块 `../traverse`。

- [ ] **Step 3: 实现**

写入 `src/core/traverse.ts`：

```ts
import type { GraphState } from './types'

export interface LookupResult {
  found: boolean
  hitNodeId: string | null
  /** 依次经过的 proto 边 id，用于流光动画 */
  edgePath: string[]
  /** 依次经过的节点 id，用于逐跳高亮 */
  nodePath: string[]
}

function protoEdgeOf(graph: GraphState, id: string) {
  return graph.edges.find(e => e.kind === 'proto' && e.source === id)
}

/** 从起点出发，沿 proto 边走到链末端，返回经过的节点 id 序列 */
export function protoChain(graph: GraphState, startId: string): string[] {
  if (!graph.nodes.some(n => n.id === startId))
    return []

  const chain: string[] = [startId]
  const seen = new Set<string>([startId])
  let cur = startId

  while (true) {
    const edge = protoEdgeOf(graph, cur)
    if (!edge || seen.has(edge.target))
      break
    if (!graph.nodes.some(n => n.id === edge.target))
      break
    chain.push(edge.target)
    seen.add(edge.target)
    cur = edge.target
  }

  return chain
}

/**
 * 模拟属性读取：从 startId 起沿原型链逐跳查找 key，命中即停。
 * 内部槽（kind === 'internal'）不参与查找——[[Prototype]] 不是可读属性。
 */
export function resolveLookup(graph: GraphState, startId: string, key: string): LookupResult {
  const nodePath: string[] = []
  const edgePath: string[] = []
  let cur: string | undefined = startId

  while (cur) {
    const node = graph.nodes.find(n => n.id === cur)
    if (!node)
      break

    nodePath.push(node.id)
    const hit = node.props.find(p => p.key === key && p.kind !== 'internal')
    if (hit)
      return { found: true, hitNodeId: node.id, edgePath, nodePath }

    const edge = protoEdgeOf(graph, node.id)
    if (!edge || nodePath.includes(edge.target))
      break
    edgePath.push(edge.id)
    cur = edge.target
  }

  return { found: false, hitNodeId: null, edgePath, nodePath }
}
```

在 `src/core/index.ts` 追加：

```ts
export * from './traverse'
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/core/__tests__/traverse.test.ts`
Expected: PASS，6 个用例全绿。

- [ ] **Step 5: 全量测试 + lint**

Run: `pnpm test --run && pnpm lint`
Expected: 全绿。特别确认 `src/core/**` 没有触发 `no-restricted-imports`。

- [ ] **Step 6: 提交**

```bash
git add src/core
git commit -m "feat(core): 实现原型链遍历与属性查找路径求解"
```

---

## Task 5: 主题 token 与切换

**Files:**
- Create: `src/styles/tokens.css`、`src/composables/useTheme.ts`
- Modify: `src/main.ts`（引入样式）
- Test: `src/composables/__tests__/useTheme.test.ts`

**Interfaces:**
- Consumes: Task 1 的工程配置
- Produces: `useTheme(): { theme: Ref<ThemeName>, setTheme(t: ThemeName): void, toggle(): void }`；`type ThemeName = 'aurora' | 'neon' | 'paper'`

- [ ] **Step 1: 写 token**

写入 `src/styles/tokens.css`：

```css
/* 三套主题的 design token。组件中禁止出现任何颜色字面量。 */
:root,
[data-theme='aurora'] {
  --canvas-bg: #0a0f24;
  --canvas-grid: #1a2340;
  --canvas-glow-a: rgb(124 58 237 / 33%);
  --canvas-glow-b: rgb(6 182 212 / 33%);

  --node-surface: rgb(255 255 255 / 6%);
  --node-border: rgb(255 255 255 / 18%);
  --node-header: rgb(255 255 255 / 8%);

  --text-primary: #f3f6ff;
  --text-muted: #c3cbe6;

  --edge-prototype: #22d3ee;
  --edge-proto: #f472b6;
  --edge-constructor: #64748b;

  --glow-size: 6px;
  --glow-color: rgb(244 114 182 / 60%);
  --focus-dim: 0.22;

  --panel-bg: rgb(17 26 51 / 88%);
  --panel-blur: 10px;
}

[data-theme='neon'] {
  --canvas-bg: #05060f;
  --canvas-grid: #16224a;
  --canvas-glow-a: transparent;
  --canvas-glow-b: transparent;

  --node-surface: #0c1428;
  --node-border: #22d3ee;
  --node-header: rgb(34 211 238 / 12%);

  --text-primary: #eaf2ff;
  --text-muted: #8ea6cf;

  --edge-prototype: #22d3ee;
  --edge-proto: #f472b6;
  --edge-constructor: #475569;

  --glow-size: 10px;
  --glow-color: rgb(34 211 238 / 75%);
  --focus-dim: 0.15;

  --panel-bg: rgb(5 6 15 / 92%);
  --panel-blur: 8px;
}

/* paper 仅用于导出，不进主题切换器 */
[data-theme='paper'] {
  --canvas-bg: #f7f9fe;
  --canvas-grid: #e8eefa;
  --canvas-glow-a: transparent;
  --canvas-glow-b: transparent;

  --node-surface: #ffffff;
  --node-border: #c7d2fe;
  --node-header: #eef2ff;

  --text-primary: #1e293b;
  --text-muted: #64748b;

  --edge-prototype: #6366f1;
  --edge-proto: #db2777;
  --edge-constructor: #94a3b8;

  --glow-size: 0px;
  --glow-color: transparent;
  --focus-dim: 0.35;

  --panel-bg: #ffffff;
  --panel-blur: 0px;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
  background: var(--canvas-bg);
  color: var(--text-primary);
}
```

- [ ] **Step 2: 写失败的测试**

写入 `src/composables/__tests__/useTheme.test.ts`：

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useTheme } from '../useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('默认主题是 aurora', () => {
    const { theme } = useTheme()
    expect(theme.value).toBe('aurora')
  })

  it('setTheme 会写到 documentElement 上', async () => {
    const { setTheme } = useTheme()
    setTheme('neon')
    await new Promise(r => setTimeout(r, 0))
    expect(document.documentElement.dataset.theme).toBe('neon')
  })

  it('toggle 只在 aurora 与 neon 之间切换，不会切到 paper', async () => {
    const { theme, toggle, setTheme } = useTheme()
    setTheme('aurora')
    toggle()
    expect(theme.value).toBe('neon')
    toggle()
    expect(theme.value).toBe('aurora')
  })
})
```

- [ ] **Step 3: 运行测试，确认失败**

Run: `pnpm test --run src/composables/__tests__/useTheme.test.ts`
Expected: FAIL，找不到模块 `../useTheme`。

- [ ] **Step 4: 实现**

写入 `src/composables/useTheme.ts`：

```ts
import { useStorage } from '@vueuse/core'
import { watchEffect } from 'vue'

export type ThemeName = 'aurora' | 'neon' | 'paper'

/** 可供用户切换的主题；paper 只用于导出，故不在此列 */
const SWITCHABLE: ThemeName[] = ['aurora', 'neon']

const theme = useStorage<ThemeName>('proto-theme', 'aurora')

watchEffect(() => {
  document.documentElement.dataset.theme = theme.value
})

export function useTheme() {
  function setTheme(next: ThemeName) {
    theme.value = next
  }

  function toggle() {
    const i = SWITCHABLE.indexOf(theme.value)
    theme.value = SWITCHABLE[(i + 1) % SWITCHABLE.length] ?? 'aurora'
  }

  return { theme, setTheme, toggle, switchable: SWITCHABLE }
}
```

在 `src/main.ts` 顶部引入（顺序：reset → uno → tokens）：

```ts
import '@unocss/reset/tailwind.css'
import 'uno.css'
import '~/styles/tokens.css'
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test --run src/composables/__tests__/useTheme.test.ts`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/styles src/composables src/main.ts
git commit -m "feat(theme): 建立三套主题 token 与切换能力"
```

---

## Task 6: 自定义节点组件

**Files:**
- Create: `src/components/canvas/ProtoNode.vue`
- Test: `src/components/canvas/__tests__/ProtoNode.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `ProtoNode` 类型
- Produces: Vue Flow 节点组件，注册名为 `proto`；节点 `data` 形状为 `{ node: ProtoNode, dimmed: boolean, highlighted: boolean }`；每行属性渲染一个 `id` 等于该行 `key` 的 source Handle

- [ ] **Step 1: 写失败的测试**

写入 `src/components/canvas/__tests__/ProtoNode.test.ts`：

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProtoNode from '../ProtoNode.vue'
import type { ProtoNode as ProtoNodeData } from '~/core'

const node: ProtoNodeData = {
  id: 'Person.prototype',
  label: 'Person.prototype',
  kind: 'prototype',
  props: [
    { key: 'constructor', value: 'ƒ Person', kind: 'data', refTo: 'Person' },
    { key: 'say', value: 'ƒ', kind: 'data' },
    { key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' },
  ],
}

function mountNode(data: Partial<{ node: ProtoNodeData, dimmed: boolean, highlighted: boolean }> = {}) {
  return mount(ProtoNode, {
    props: { id: node.id, data: { node, dimmed: false, highlighted: false, ...data } },
    global: { stubs: { Handle: true } },
  })
}

describe('ProtoNode', () => {
  it('渲染标题与全部属性行', () => {
    const w = mountNode()
    expect(w.text()).toContain('Person.prototype')
    expect(w.findAll('[data-prop-row]')).toHaveLength(3)
  })

  it('折叠后不渲染属性行', async () => {
    const w = mountNode()
    await w.find('[data-node-header]').trigger('click')
    expect(w.findAll('[data-prop-row]')).toHaveLength(0)
  })

  it('dimmed 时带上淡化标记', () => {
    expect(mountNode({ dimmed: true }).find('[data-node]').attributes('data-dimmed')).toBe('true')
  })

  it('highlighted 时带上高亮标记', () => {
    expect(mountNode({ highlighted: true }).find('[data-node]').attributes('data-highlighted')).toBe('true')
  })

  it('点击引用型属性行会派发 focus-ref 事件', async () => {
    const w = mountNode()
    await w.findAll('[data-prop-row]')[0].trigger('click')
    expect(w.emitted('focus-ref')?.[0]).toEqual(['Person'])
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/components/canvas/__tests__/ProtoNode.test.ts`
Expected: FAIL，找不到组件。

- [ ] **Step 3: 实现组件**

写入 `src/components/canvas/ProtoNode.vue`：

```vue
<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed, ref } from 'vue'
import type { ProtoNode } from '~/core'

const props = defineProps<{
  id: string
  data: { node: ProtoNode, dimmed: boolean, highlighted: boolean }
}>()

const emit = defineEmits<{ 'focus-ref': [nodeId: string] }>()

const collapsed = ref(props.data.node.meta?.collapsed ?? false)
const node = computed(() => props.data.node)

/** 不同 kind 用不同的标题前缀，一眼区分函数与对象 */
const sigil = computed(() => {
  switch (node.value.kind) {
    case 'function': return 'ƒ'
    case 'prototype': return '⟐'
    case 'instance': return '▪'
    case 'null': return '∅'
    default: return '·'
  }
})

function onRowClick(refTo?: string) {
  if (refTo)
    emit('focus-ref', refTo)
}
</script>

<template>
  <div
    data-node
    :data-dimmed="data.dimmed"
    :data-highlighted="data.highlighted"
    :data-kind="node.kind"
    class="proto-node"
  >
    <!-- 目标锚点统一在顶部，来源锚点按属性行分布在右侧 -->
    <Handle type="target" :position="Position.Top" />

    <div data-node-header class="header" @click="collapsed = !collapsed">
      <span class="sigil">{{ sigil }}</span>
      <span class="label">{{ node.label }}</span>
      <span class="chevron">{{ collapsed ? '▸' : '▾' }}</span>
    </div>

    <div v-if="!collapsed" class="rows">
      <div
        v-for="row in node.props"
        :key="row.key"
        data-prop-row
        class="row"
        :data-internal="row.kind === 'internal'"
        @click="onRowClick(row.refTo)"
      >
        <span class="key">{{ row.key }}</span>
        <span class="value">{{ row.value }}</span>
        <Handle v-if="row.refTo" :id="row.key" type="source" :position="Position.Right" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 颜色一律走 token，禁止字面量；节点不使用 backdrop-filter */
.proto-node {
  min-width: 190px;
  border: 1px solid var(--node-border);
  border-radius: 14px;
  background: var(--node-surface);
  color: var(--text-primary);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  overflow: hidden;
  transition: opacity 0.25s, filter 0.25s;
}

.proto-node[data-dimmed='true'] {
  opacity: var(--focus-dim);
}

.proto-node[data-highlighted='true'] {
  filter: drop-shadow(0 0 var(--glow-size) var(--glow-color));
}

.header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  background: var(--node-header);
  cursor: pointer;
  user-select: none;
}

.label { font-weight: 600; }
.chevron { margin-left: auto; color: var(--text-muted); }
.rows { padding: 4px 0; }

.row {
  display: flex;
  gap: 8px;
  padding: 3px 10px;
  position: relative;
  cursor: pointer;
}

.row[data-internal='true'] .key { color: var(--edge-proto); }
.key { color: var(--text-primary); }
.value { color: var(--text-muted); margin-left: auto; }
</style>
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/components/canvas/__tests__/ProtoNode.test.ts`
Expected: PASS，5 个用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/components/canvas
git commit -m "feat(canvas): 实现带属性行锚点与折叠能力的节点组件"
```

---

## Task 7: 自定义边组件

**Files:**
- Create: `src/components/canvas/ProtoEdge.vue`
- Test: `src/components/canvas/__tests__/ProtoEdge.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `EdgeKind`
- Produces: Vue Flow 边组件，注册名为 `proto`；边 `data` 形状为 `{ kind: EdgeKind, flowing: boolean, dimmed: boolean, label?: string }`

- [ ] **Step 1: 写失败的测试**

写入 `src/components/canvas/__tests__/ProtoEdge.test.ts`：

```ts
import { Position } from '@vue-flow/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProtoEdge from '../ProtoEdge.vue'
import type { EdgeKind } from '~/core'

function mountEdge(data: { kind: EdgeKind, flowing?: boolean, dimmed?: boolean, label?: string }) {
  return mount(ProtoEdge, {
    props: {
      id: 'e1',
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: Position.Right,
      targetPosition: Position.Top,
      data: { flowing: false, dimmed: false, ...data },
    },
  })
}

describe('ProtoEdge', () => {
  it('三种语义各自带上 kind 标记，供 CSS 取不同颜色', () => {
    for (const kind of ['proto', 'prototype', 'constructor'] as EdgeKind[])
      expect(mountEdge({ kind }).find('[data-edge]').attributes('data-kind')).toBe(kind)
  })

  it('静止时不带流光标记', () => {
    expect(mountEdge({ kind: 'proto' }).find('[data-edge]').attributes('data-flowing')).toBe('false')
  })

  it('flowing 时带上流光标记', () => {
    expect(mountEdge({ kind: 'proto', flowing: true }).find('[data-edge]').attributes('data-flowing')).toBe('true')
  })

  it('有 label 时渲染文字', () => {
    expect(mountEdge({ kind: 'proto', label: '[[Prototype]]' }).text()).toContain('[[Prototype]]')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/components/canvas/__tests__/ProtoEdge.test.ts`
Expected: FAIL，找不到组件。

- [ ] **Step 3: 实现组件**

写入 `src/components/canvas/ProtoEdge.vue`：

```vue
<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, Position } from '@vue-flow/core'
import { computed } from 'vue'
import type { EdgeKind } from '~/core'

const props = defineProps<{
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  data: { kind: EdgeKind, flowing: boolean, dimmed: boolean, label?: string }
}>()

const path = computed(() => getSmoothStepPath({
  sourceX: props.sourceX,
  sourceY: props.sourceY,
  targetX: props.targetX,
  targetY: props.targetY,
  sourcePosition: props.sourcePosition,
  targetPosition: props.targetPosition,
  borderRadius: 12,
}))
</script>

<template>
  <g
    data-edge
    :data-kind="data.kind"
    :data-flowing="String(!!data.flowing)"
    :data-dimmed="String(!!data.dimmed)"
    class="proto-edge"
  >
    <BaseEdge :id="id" :path="path[0]" />
    <EdgeLabelRenderer v-if="data.label">
      <div
        class="edge-label"
        :style="{ transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)` }"
      >
        {{ data.label }}
      </div>
    </EdgeLabelRenderer>
  </g>
</template>

<style scoped>
/* 三种语义永不混色 */
.proto-edge[data-kind='proto'] :deep(.vue-flow__edge-path) { stroke: var(--edge-proto); }
.proto-edge[data-kind='prototype'] :deep(.vue-flow__edge-path) { stroke: var(--edge-prototype); }
.proto-edge[data-kind='constructor'] :deep(.vue-flow__edge-path) { stroke: var(--edge-constructor); }

.proto-edge :deep(.vue-flow__edge-path) {
  stroke-width: 1.8;
  transition: opacity 0.25s;
}

.proto-edge[data-dimmed='true'] { opacity: var(--focus-dim); }

/* 流光只在播放 traverse 时开启，静止时是实线，避免全屏一直爬行 */
.proto-edge[data-flowing='true'] :deep(.vue-flow__edge-path) {
  stroke-dasharray: 6 6;
  filter: drop-shadow(0 0 var(--glow-size) var(--glow-color));
  animation: edge-flow 0.9s linear infinite;
}

@keyframes edge-flow {
  to { stroke-dashoffset: -12; }
}

.edge-label {
  position: absolute;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--panel-bg);
  color: var(--text-muted);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10px;
  pointer-events: none;
}
</style>
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/components/canvas/__tests__/ProtoEdge.test.ts`
Expected: PASS，4 个用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/components/canvas
git commit -m "feat(canvas): 实现三色语义边与流光动画"
```

---

## Task 8: 画布容器

**Files:**
- Create: `src/components/canvas/ProtoCanvas.vue`
- Test: `src/components/canvas/__tests__/ProtoCanvas.test.ts`

**Interfaces:**
- Consumes: Task 3 的 `layout`、Task 6 的 `ProtoNode.vue`、Task 7 的 `ProtoEdge.vue`
- Produces:
  - 组件 props `{ graph: GraphState, dimmedNodes?: string[], highlightedNodes?: string[], flowingEdges?: string[] }`
  - 事件 `node-hover(nodeId: string | null)`、`focus-ref(nodeId: string)`
  - 暴露 `nodes`、`edges`、`targetNodes`、`resetLayout()`、`focusNode(nodeId: string)`、`fitView()`（Task 13 会消费 `focusNode` 与 `resetLayout`）

- [ ] **Step 1: 写失败的测试**

写入 `src/components/canvas/__tests__/ProtoCanvas.test.ts`：

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProtoCanvas from '../ProtoCanvas.vue'
import type { GraphState } from '~/core'

const graph: GraphState = {
  nodes: [
    { id: 'p1', label: 'p1', kind: 'instance', props: [] },
    { id: 'Person.prototype', label: 'Person.prototype', kind: 'prototype', props: [] },
  ],
  edges: [{ id: 'e1', source: 'p1', target: 'Person.prototype', kind: 'proto' }],
}

describe('ProtoCanvas', () => {
  it('把 GraphState 转成带坐标的 Vue Flow 节点', () => {
    const w = mount(ProtoCanvas, { props: { graph } })
    const nodes = w.vm.nodes as Array<{ id: string, position: { x: number, y: number } }>
    expect(nodes).toHaveLength(2)
    expect(nodes.every(n => typeof n.position.x === 'number')).toBe(true)
  })

  it('边被标成自定义类型 proto，并带上语义 kind', () => {
    const w = mount(ProtoCanvas, { props: { graph } })
    const edges = w.vm.edges as Array<{ type: string, data: { kind: string } }>
    expect(edges[0].type).toBe('proto')
    expect(edges[0].data.kind).toBe('proto')
  })

  it('dimmedNodes 会传进节点 data', async () => {
    const w = mount(ProtoCanvas, { props: { graph, dimmedNodes: ['p1'] } })
    await w.vm.$nextTick()
    const nodes = w.vm.nodes as Array<{ id: string, data: { dimmed: boolean } }>
    expect(nodes.find(n => n.id === 'p1')!.data.dimmed).toBe(true)
    expect(nodes.find(n => n.id === 'Person.prototype')!.data.dimmed).toBe(false)
  })

  it('flowingEdges 会传进边 data', () => {
    const w = mount(ProtoCanvas, { props: { graph, flowingEdges: ['e1'] } })
    const edges = w.vm.edges as Array<{ data: { flowing: boolean } }>
    expect(edges[0].data.flowing).toBe(true)
  })

  it('图变化时，已存在节点保留用户拖动后的位置', async () => {
    const w = mount(ProtoCanvas, { props: { graph } })
    const nodes = w.vm.nodes as Array<{ id: string, position: { x: number, y: number } }>
    // 模拟用户把 p1 拖到别处
    nodes.find(n => n.id === 'p1')!.position = { x: 999, y: 888 }

    await w.setProps({ graph: { ...graph, nodes: [...graph.nodes, { id: 'x', label: 'x', kind: 'plain', props: [] }] } })
    const after = w.vm.nodes as Array<{ id: string, position: { x: number, y: number } }>
    expect(after.find(n => n.id === 'p1')!.position).toEqual({ x: 999, y: 888 })
    expect(after.find(n => n.id === 'x')).toBeDefined()
  })

  it('resetLayout 把位置恢复成布局算法的结果', async () => {
    const w = mount(ProtoCanvas, { props: { graph } })
    const nodes = w.vm.nodes as Array<{ id: string, position: { x: number, y: number } }>
    nodes.find(n => n.id === 'p1')!.position = { x: 999, y: 888 }

    w.vm.resetLayout()
    await w.vm.$nextTick()
    const after = w.vm.nodes as Array<{ id: string, position: { x: number, y: number } }>
    expect(after.find(n => n.id === 'p1')!.position).not.toEqual({ x: 999, y: 888 })
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/components/canvas/__tests__/ProtoCanvas.test.ts`
Expected: FAIL，找不到组件。

- [ ] **Step 3: 实现组件**

写入 `src/components/canvas/ProtoCanvas.vue`：

```vue
<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { Edge, Node } from '@vue-flow/core'
import { computed, ref, watch } from 'vue'
import ProtoEdgeComp from './ProtoEdge.vue'
import ProtoNodeComp from './ProtoNode.vue'
import { layout } from '~/core'
import type { GraphState } from '~/core'
import '@vue-flow/core/dist/style.css'

const props = withDefaults(defineProps<{
  graph: GraphState
  dimmedNodes?: string[]
  highlightedNodes?: string[]
  flowingEdges?: string[]
}>(), {
  dimmedNodes: () => [],
  highlightedNodes: () => [],
  flowingEdges: () => [],
})

const emit = defineEmits<{
  'node-hover': [nodeId: string | null]
  'focus-ref': [nodeId: string]
}>()

const { fitView } = useVueFlow()

/** 坐标由 core 的 layout 算出，不使用 Vue Flow 的自动布局 */
const positions = computed(() => layout(props.graph))

/** 由 GraphState 推导出的「应有」节点列表，位置来自布局算法 */
const targetNodes = computed<Node[]>(() => props.graph.nodes.map(node => ({
  id: node.id,
  type: 'proto',
  position: positions.value.get(node.id) ?? { x: 0, y: 0 },
  data: {
    node,
    dimmed: props.dimmedNodes.includes(node.id),
    highlighted: props.highlightedNodes.includes(node.id),
  },
})))

/**
 * 实际渲染的节点必须是可写的 ref 并用 v-model 绑定，
 * 否则用户拖动产生的位置变化没有地方落地，会被下一次重算覆盖。
 */
const nodes = ref<Node[]>([])

watch(targetNodes, (next) => {
  const kept = new Map(nodes.value.map(n => [n.id, n.position]))
  // 已存在的节点保留用户拖动后的位置，只更新 data；新节点用布局位置
  nodes.value = next.map(n => ({ ...n, position: kept.get(n.id) ?? n.position }))
}, { immediate: true, deep: true })

const edges = computed<Edge[]>(() => props.graph.edges.map(edge => ({
  id: edge.id,
  type: 'proto',
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle,
  data: {
    kind: edge.kind,
    flowing: props.flowingEdges.includes(edge.id),
    dimmed: props.dimmedNodes.includes(edge.source) || props.dimmedNodes.includes(edge.target),
    label: edge.kind === 'proto' ? '[[Prototype]]' : edge.kind === 'prototype' ? 'prototype' : undefined,
  },
})))

/** 用户拖乱之后，一键回到布局算法给出的构图 */
function resetLayout() {
  nodes.value = targetNodes.value.map(n => ({ ...n }))
  fitView({ padding: 0.2 })
}

/** 把视口聚焦到某个节点，供「点击引用型属性行」使用 */
function focusNode(nodeId: string) {
  fitView({ nodes: [nodeId], padding: 0.6, duration: 400 })
}

defineExpose({ nodes, edges, targetNodes, resetLayout, focusNode, fitView })
</script>

<template>
  <div class="canvas-wrap">
    <VueFlow
      v-model:nodes="nodes"
      :edges="edges"
      :only-render-visible-elements="true"
      :min-zoom="0.2"
      :max-zoom="2"
      fit-view-on-init
      @node-mouse-enter="e => emit('node-hover', e.node.id)"
      @node-mouse-leave="() => emit('node-hover', null)"
    >
      <template #node-proto="nodeProps">
        <ProtoNodeComp v-bind="nodeProps" @focus-ref="id => emit('focus-ref', id)" />
      </template>
      <template #edge-proto="edgeProps">
        <ProtoEdgeComp v-bind="edgeProps" />
      </template>
    </VueFlow>
  </div>
</template>

<style scoped>
.canvas-wrap {
  width: 100%;
  height: 100%;
  background:
    radial-gradient(420px 220px at 18% 18%, var(--canvas-glow-a), transparent 70%),
    radial-gradient(380px 200px at 78% 78%, var(--canvas-glow-b), transparent 70%),
    radial-gradient(circle at 1px 1px, var(--canvas-grid) 1px, transparent 0) 0 0 / 22px 22px,
    var(--canvas-bg);
}
</style>
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/components/canvas/__tests__/ProtoCanvas.test.ts`
Expected: PASS，4 个用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/components/canvas
git commit -m "feat(canvas): 实现接入分层布局的画布容器"
```

---

## Task 9: 播放器与步骤面板

**Files:**
- Create: `src/composables/usePlayer.ts`、`src/components/panels/StepPanel.vue`
- Test: `src/composables/__tests__/usePlayer.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `replay`、`Scene`
- Produces: `usePlayer(scene: Ref<Scene>): { step, graph, current, total, next, prev, goto, playing, togglePlay, stop }`
  - `step: Ref<number>` 0 表示初始态，n 表示已应用前 n 步
  - `graph: ComputedRef<GraphState>`
  - `current: ComputedRef<Step | null>` 当前步（`step === 0` 时为 `null`）

- [ ] **Step 1: 写失败的测试**

写入 `src/composables/__tests__/usePlayer.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { usePlayer } from '../usePlayer'
import type { Scene } from '~/core'

const scene: Scene = {
  id: 'demo',
  title: '演示',
  code: 'const a = {}',
  initial: { nodes: [{ id: 'a', label: 'a', kind: 'plain', props: [] }], edges: [] },
  steps: [
    { title: '一', narration: '加 b', patch: [{ op: 'addNode', node: { id: 'b', label: 'b', kind: 'plain', props: [] } }] },
    { title: '二', narration: '连线', patch: [{ op: 'addEdge', edge: { id: 'e1', source: 'a', target: 'b', kind: 'proto' } }] },
  ],
}

describe('usePlayer', () => {
  it('初始停在第 0 步', () => {
    const p = usePlayer(ref(scene))
    expect(p.step.value).toBe(0)
    expect(p.graph.value.nodes).toHaveLength(1)
    expect(p.current.value).toBeNull()
  })

  it('next 前进一步并同步图', () => {
    const p = usePlayer(ref(scene))
    p.next()
    expect(p.step.value).toBe(1)
    expect(p.graph.value.nodes).toHaveLength(2)
    expect(p.current.value?.title).toBe('一')
  })

  it('prev 后退一步', () => {
    const p = usePlayer(ref(scene))
    p.next()
    p.next()
    p.prev()
    expect(p.step.value).toBe(1)
    expect(p.graph.value.edges).toHaveLength(0)
  })

  it('到头之后 next 不越界', () => {
    const p = usePlayer(ref(scene))
    p.goto(99)
    expect(p.step.value).toBe(2)
    p.next()
    expect(p.step.value).toBe(2)
  })

  it('到底之后 prev 不越界', () => {
    const p = usePlayer(ref(scene))
    p.prev()
    expect(p.step.value).toBe(0)
  })

  it('播放会自动推进，到末尾自动停止', async () => {
    vi.useFakeTimers()
    const p = usePlayer(ref(scene), { interval: 100 })
    p.togglePlay()
    expect(p.playing.value).toBe(true)
    await vi.advanceTimersByTimeAsync(350)
    expect(p.step.value).toBe(2)
    expect(p.playing.value).toBe(false)
    vi.useRealTimers()
  })

  it('切换场景时步数归零', async () => {
    const s = ref(scene)
    const p = usePlayer(s)
    p.next()
    s.value = { ...scene, id: 'other' }
    await Promise.resolve()
    expect(p.step.value).toBe(0)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/composables/__tests__/usePlayer.test.ts`
Expected: FAIL，找不到模块 `../usePlayer`。

- [ ] **Step 3: 实现**

写入 `src/composables/usePlayer.ts`：

```ts
import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { replay } from '~/core'
import type { Scene, Step } from '~/core'

export interface PlayerOptions {
  /** 自动播放时每步停留的毫秒数 */
  interval?: number
}

export function usePlayer(scene: Ref<Scene>, options: PlayerOptions = {}) {
  const interval = options.interval ?? 2200
  const step = ref(0)
  const playing = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  const total = computed(() => scene.value.steps.length)
  const graph = computed(() => replay(scene.value, step.value))
  const current = computed<Step | null>(() =>
    step.value === 0 ? null : scene.value.steps[step.value - 1] ?? null)

  function stop() {
    playing.value = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function goto(n: number) {
    step.value = Math.max(0, Math.min(n, total.value))
  }

  function next() {
    if (step.value >= total.value) {
      stop()
      return
    }
    step.value += 1
  }

  function prev() {
    goto(step.value - 1)
  }

  function togglePlay() {
    if (playing.value) {
      stop()
      return
    }
    // 已经播到末尾时，从头开始播
    if (step.value >= total.value)
      step.value = 0
    playing.value = true
    timer = setInterval(() => {
      if (step.value >= total.value)
        stop()
      else
        step.value += 1
    }, interval)
  }

  // 换场景时回到初始态，避免沿用上一个场景的进度
  watch(() => scene.value.id, () => {
    stop()
    step.value = 0
  })

  return { step, playing, total, graph, current, next, prev, goto, togglePlay, stop }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/composables/__tests__/usePlayer.test.ts`
Expected: PASS，7 个用例全绿。

- [ ] **Step 5: 写步骤面板组件**

写入 `src/components/panels/StepPanel.vue`：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { Step } from '~/core'

defineProps<{
  step: number
  total: number
  current: Step | null
  playing: boolean
}>()

const emit = defineEmits<{
  next: []
  prev: []
  'toggle-play': []
}>()

const collapsed = ref(false)
</script>

<template>
  <div class="panel" :data-collapsed="collapsed">
    <button class="collapse" @click="collapsed = !collapsed">
      {{ collapsed ? '讲解 ▴' : '▾' }}
    </button>

    <template v-if="!collapsed">
      <div class="meta">
        步骤 {{ step }} / {{ total }}
        <span v-if="current" class="title">· {{ current.title }}</span>
      </div>
      <p v-if="current" class="narration">
        {{ current.narration }}
      </p>
      <p v-else class="narration muted">
        点「播放」开始，或用 ← → 逐步查看
      </p>

      <div class="ctl">
        <button :disabled="step === 0" @click="emit('prev')">
          ◀
        </button>
        <button class="primary" @click="emit('toggle-play')">
          {{ playing ? '⏸ 暂停' : '▶ 播放' }}
        </button>
        <button :disabled="step === total" @click="emit('next')">
          ▶
        </button>
        <div class="bar">
          <i :style="{ width: `${total ? (step / total) * 100 : 0}%` }" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 浮层是唯一允许使用 backdrop-filter 的地方 */
.panel {
  position: absolute;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  width: min(560px, calc(100% - 40px));
  padding: 12px 16px;
  border: 1px solid var(--node-border);
  border-radius: 14px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
}

.panel[data-collapsed='true'] {
  width: auto;
  padding: 6px 12px;
}

.collapse {
  float: right;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.meta { font-size: 12px; color: var(--text-muted); }
.title { color: var(--text-primary); }
.narration { margin: 8px 0 10px; font-size: 14px; line-height: 1.7; }
.muted { color: var(--text-muted); }

.ctl { display: flex; align-items: center; gap: 8px; }

.ctl button {
  padding: 3px 12px;
  border: 1px solid var(--node-border);
  border-radius: 8px;
  background: var(--node-surface);
  color: var(--text-primary);
  cursor: pointer;
}

.ctl button:disabled { opacity: 0.4; cursor: not-allowed; }
.ctl .primary { border-color: var(--edge-prototype); }

.bar {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: var(--node-surface);
}

.bar i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--edge-prototype);
  transition: width 0.3s;
}
</style>
```

- [ ] **Step 6: 提交**

```bash
git add src/composables src/components/panels
git commit -m "feat(player): 实现步进播放控制与步骤浮层"
```

---

## Task 10: 代码浮层

**Files:**
- Create: `src/components/panels/CodePanel.vue`
- Test: `src/components/panels/__tests__/CodePanel.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `Step['codeRange']`
- Produces: 组件 props `{ code: string, highlight?: [number, number] }`，可折叠

- [ ] **Step 1: 写失败的测试**

写入 `src/components/panels/__tests__/CodePanel.test.ts`：

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CodePanel from '../CodePanel.vue'

const code = 'function Person(name) {\n  this.name = name\n}\nconst p1 = new Person(\'Ada\')'

describe('CodePanel', () => {
  it('按行渲染代码', () => {
    const w = mount(CodePanel, { props: { code } })
    expect(w.findAll('[data-line]')).toHaveLength(4)
  })

  it('高亮区间内的行被标记', () => {
    const w = mount(CodePanel, { props: { code, highlight: [1, 3] } })
    const lines = w.findAll('[data-line]')
    expect(lines[0].attributes('data-active')).toBe('true')
    expect(lines[2].attributes('data-active')).toBe('true')
    expect(lines[3].attributes('data-active')).toBe('false')
  })

  it('不传 highlight 时没有任何行被高亮', () => {
    const w = mount(CodePanel, { props: { code } })
    expect(w.findAll('[data-active="true"]')).toHaveLength(0)
  })

  it('可折叠', async () => {
    const w = mount(CodePanel, { props: { code } })
    await w.find('[data-collapse]').trigger('click')
    expect(w.findAll('[data-line]')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/components/panels/__tests__/CodePanel.test.ts`
Expected: FAIL，找不到组件。

- [ ] **Step 3: 实现**

写入 `src/components/panels/CodePanel.vue`：

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  code: string
  /** 需高亮的行区间，1 起算，闭区间 */
  highlight?: [number, number]
}>()

const collapsed = ref(false)
const lines = computed(() => props.code.split('\n'))

function isActive(lineNo: number) {
  if (!props.highlight)
    return false
  const [from, to] = props.highlight
  return lineNo >= from && lineNo <= to
}
</script>

<template>
  <div class="panel">
    <div class="bar">
      <span class="name">code.js</span>
      <button data-collapse @click="collapsed = !collapsed">
        {{ collapsed ? '▸' : '▾' }}
      </button>
    </div>

    <pre v-if="!collapsed" class="code"><code
      v-for="(line, i) in lines"
      :key="i"
      data-line
      :data-active="String(isActive(i + 1))"
      class="line"
    >{{ line || ' ' }}</code></pre>
  </div>
</template>

<style scoped>
/* 浮层允许 backdrop-filter */
.panel {
  position: absolute;
  left: 20px;
  top: 20px;
  width: min(360px, calc(100% - 40px));
  border: 1px solid var(--node-border);
  border-radius: 12px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  overflow: hidden;
}

.bar {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  border-bottom: 1px solid var(--node-border);
}

.name { font-size: 11px; color: var(--text-muted); }

.bar button {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.code {
  margin: 0;
  padding: 8px 0;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  line-height: 1.8;
}

.line {
  display: block;
  padding: 0 12px;
  color: var(--text-muted);
  white-space: pre;
}

.line[data-active='true'] {
  border-left: 2px solid var(--edge-prototype);
  padding-left: 10px;
  background: var(--node-header);
  color: var(--text-primary);
}
</style>
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/components/panels/__tests__/CodePanel.test.ts`
Expected: PASS，4 个用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/components/panels
git commit -m "feat(panels): 实现可折叠代码浮层与当前行高亮"
```

---

## Task 11: 场景 a2 与端到端串联

**Files:**
- Create: `src/scenes/a2-new.ts`、`src/scenes/index.ts`、`src/pages/s/[id].vue`、`src/pages/index.vue`
- Modify: `src/App.vue`、`src/main.ts`（接入路由）
- Test: `src/scenes/__tests__/a2-new.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `Scene`、Task 8 的 `ProtoCanvas.vue`、Task 9 的 `usePlayer` 与 `StepPanel.vue`、Task 10 的 `CodePanel.vue`
- Produces: `scenes: Scene[]`、`getScene(id: string): Scene | undefined`

- [ ] **Step 1: 先写场景断言测试（内容正确性必须自动化）**

写入 `src/scenes/__tests__/a2-new.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { a2New } from '../a2-new'
import { replay } from '~/core'
import type { EdgeKind, GraphState } from '~/core'

function hasEdge(g: GraphState, source: string, target: string, kind: EdgeKind) {
  return g.edges.some(e => e.source === source && e.target === target && e.kind === kind)
}

describe('场景 a2：new 到底做了什么', () => {
  it('初始状态只有构造函数与它的原型，还没有实例', () => {
    const g = replay(a2New, 0)
    expect(g.nodes.map(n => n.id)).toContain('Person')
    expect(g.nodes.map(n => n.id)).toContain('Person.prototype')
    expect(g.nodes.map(n => n.id)).not.toContain('p1')
  })

  it('函数与它的 prototype 之间从一开始就有 prototype 边', () => {
    expect(hasEdge(replay(a2New, 0), 'Person', 'Person.prototype', 'prototype')).toBe(true)
  })

  it('第 1 步创建出空对象', () => {
    expect(replay(a2New, 1).nodes.map(n => n.id)).toContain('p1')
  })

  it('第 2 步把实例接到 Person.prototype 上', () => {
    expect(hasEdge(replay(a2New, 2), 'p1', 'Person.prototype', 'proto')).toBe(true)
  })

  it('第 3 步在实例上写入 name 属性', () => {
    const p1 = replay(a2New, 3).nodes.find(n => n.id === 'p1')!
    expect(p1.props.some(p => p.key === 'name')).toBe(true)
  })

  it('全部走完后，实例的原型链能通到 Object.prototype', () => {
    const g = replay(a2New, a2New.steps.length)
    expect(hasEdge(g, 'p1', 'Person.prototype', 'proto')).toBe(true)
    expect(hasEdge(g, 'Person.prototype', 'Object.prototype', 'proto')).toBe(true)
  })

  it('每一步都有讲解文案与代码行区间', () => {
    for (const s of a2New.steps) {
      expect(s.narration.length).toBeGreaterThan(0)
      expect(s.codeRange).toBeDefined()
    }
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/a2-new.test.ts`
Expected: FAIL，找不到模块 `../a2-new`。

- [ ] **Step 3: 写场景数据**

写入 `src/scenes/a2-new.ts`：

```ts
import type { Scene } from '~/core'

export const a2New: Scene = {
  id: 'a2',
  title: 'new 到底做了什么',
  code: [
    'function Person(name) {',
    '  this.name = name',
    '}',
    'Person.prototype.say = function () {',
    '  return `我是 ${this.name}`',
    '}',
    '',
    'const p1 = new Person(\'Ada\')',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'Person',
        label: 'Person',
        kind: 'function',
        props: [{ key: 'prototype', value: '⟐', kind: 'data', refTo: 'Person.prototype' }],
      },
      {
        id: 'Person.prototype',
        label: 'Person.prototype',
        kind: 'prototype',
        props: [
          { key: 'constructor', value: 'ƒ Person', kind: 'data', refTo: 'Person' },
          { key: 'say', value: 'ƒ', kind: 'data' },
          { key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' },
        ],
      },
      {
        id: 'Object.prototype',
        label: 'Object.prototype',
        kind: 'prototype',
        meta: { builtin: true },
        props: [
          { key: 'toString', value: 'ƒ', kind: 'data' },
          { key: '[[Prototype]]', value: 'null', kind: 'internal' },
        ],
      },
    ],
    edges: [
      { id: 'e-fn-proto', source: 'Person', target: 'Person.prototype', kind: 'prototype', sourceHandle: 'prototype' },
      { id: 'e-proto-obj', source: 'Person.prototype', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-ctor', source: 'Person.prototype', target: 'Person', kind: 'constructor', sourceHandle: 'constructor' },
    ],
  },

  steps: [
    {
      title: '造一个空对象',
      narration: 'new 的第一步：凭空造出一个空对象。此刻它什么都没有，也还没和 Person 发生任何关系。',
      codeRange: [8, 8],
      patch: [{
        op: 'addNode',
        node: { id: 'p1', label: 'p1', kind: 'instance', props: [] },
      }],
      focus: { nodes: ['p1'], edges: [] },
    },
    {
      title: '把它的 [[Prototype]] 接到 Person.prototype',
      narration: '关键的一步：新对象的内部槽 [[Prototype]] 指向 Person.prototype——注意接的是函数的 prototype 属性所指向的那个对象，不是函数本身。',
      codeRange: [8, 8],
      patch: [
        {
          op: 'addProp',
          nodeId: 'p1',
          prop: { key: '[[Prototype]]', value: 'Person.prototype', kind: 'internal', refTo: 'Person.prototype' },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-p1-proto', source: 'p1', target: 'Person.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['p1', 'Person.prototype'], edges: ['e-p1-proto'] },
      traverse: ['e-p1-proto'],
    },
    {
      title: '以新对象为 this 执行构造函数',
      narration: '构造函数体里的 this 就是这个新对象，所以 this.name = name 把 name 写在了实例自己身上，而不是原型上。',
      codeRange: [1, 3],
      patch: [{
        op: 'addProp',
        nodeId: 'p1',
        prop: { key: 'name', value: '\'Ada\'', kind: 'data' },
      }],
      focus: { nodes: ['p1'], edges: [] },
    },
    {
      title: '返回这个对象',
      narration: '构造函数没有显式返回对象，于是 new 把这个新对象返回出来，赋给 p1。至此 p1 的原型链是：p1 → Person.prototype → Object.prototype → null。',
      codeRange: [8, 8],
      patch: [],
      focus: { nodes: ['p1', 'Person.prototype', 'Object.prototype'], edges: ['e-p1-proto', 'e-proto-obj'] },
      traverse: ['e-p1-proto', 'e-proto-obj'],
    },
  ],
}
```

写入 `src/scenes/index.ts`：

```ts
import { a2New } from './a2-new'
import type { Scene } from '~/core'

export const scenes: Scene[] = [a2New]

export function getScene(id: string): Scene | undefined {
  return scenes.find(s => s.id === id)
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/scenes/__tests__/a2-new.test.ts`
Expected: PASS，7 个用例全绿。

- [ ] **Step 5: 接入路由与页面**

写入 `src/App.vue`：

```vue
<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

const { theme, toggle } = useTheme()
</script>

<template>
  <div class="app">
    <RouterView />
    <button class="theme-toggle" @click="toggle">
      {{ theme === 'aurora' ? '极光' : '霓虹' }}
    </button>
  </div>
</template>

<style scoped>
.app { width: 100vw; height: 100vh; overflow: hidden; }

.theme-toggle {
  position: fixed;
  right: 20px;
  top: 20px;
  padding: 5px 14px;
  border: 1px solid var(--node-border);
  border-radius: 999px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
  cursor: pointer;
  z-index: 10;
}
</style>
```

写入 `src/main.ts`：

```ts
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from '~pages'
import App from './App.vue'
import '@unocss/reset/tailwind.css'
import 'uno.css'
import '~/styles/tokens.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

createApp(App).use(router).mount('#app')
```

写入 `src/pages/index.vue`：

```vue
<script setup lang="ts">
import { scenes } from '~/scenes'
</script>

<template>
  <div class="home">
    <h1>JavaScript 原型链可视化</h1>
    <ul>
      <li v-for="s in scenes" :key="s.id">
        <RouterLink :to="`/s/${s.id}`">
          {{ s.title }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.home { padding: 60px; color: var(--text-primary); }
h1 { font-size: 28px; margin-bottom: 24px; }
li { margin: 10px 0; }
a { color: var(--edge-prototype); text-decoration: none; }
</style>
```

写入 `src/pages/s/[id].vue`：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { onKeyStroke } from '@vueuse/core'
import ProtoCanvas from '~/components/canvas/ProtoCanvas.vue'
import CodePanel from '~/components/panels/CodePanel.vue'
import StepPanel from '~/components/panels/StepPanel.vue'
import { usePlayer } from '~/composables/usePlayer'
import { getScene, scenes } from '~/scenes'

const route = useRoute()
const scene = computed(() => getScene(String(route.params.id)) ?? scenes[0])
const player = usePlayer(scene)

const flowingEdges = computed(() => player.current.value?.traverse ?? [])

onKeyStroke('ArrowRight', () => player.next())
onKeyStroke('ArrowLeft', () => player.prev())
onKeyStroke(' ', (e) => {
  e.preventDefault()
  player.togglePlay()
})
</script>

<template>
  <div class="stage">
    <ProtoCanvas :graph="player.graph.value" :flowing-edges="flowingEdges" />
    <CodePanel :code="scene.code" :highlight="player.current.value?.codeRange" />
    <StepPanel
      :step="player.step.value"
      :total="player.total.value"
      :current="player.current.value"
      :playing="player.playing.value"
      @next="player.next"
      @prev="player.prev"
      @toggle-play="player.togglePlay"
    />
  </div>
</template>

<style scoped>
.stage { position: relative; width: 100%; height: 100%; }
</style>
```

- [ ] **Step 6: 端到端手工验证**

```bash
pnpm dev
```
打开 `http://localhost:5173/#/s/a2`，逐项确认并记录：
1. 四个步骤能前进后退，图随之变化；
2. 第 2 步 `p1 → Person.prototype` 的粉线出现且流光在动；
3. 代码面板第 8 行高亮，第 3 步切到 1–3 行；
4. 两个浮层都能折叠；
5. 右上角切主题，节点与连线颜色随之变化，**没有任何元素颜色不跟着变**（发现不跟随的即为硬编码色值，必须改成 token）；
6. 拖动节点后连线跟随。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat(scenes): 接入首个场景 a2 并打通播放全链路"
```

---

## Task 12: 场景 b1 与查找流光

**Files:**
- Create: `src/scenes/b1-lookup.ts`
- Modify: `src/scenes/index.ts`
- Test: `src/scenes/__tests__/b1-lookup.test.ts`

**Interfaces:**
- Consumes: Task 4 的 `resolveLookup`、Task 11 的场景注册表
- Produces: `b1Lookup: Scene`（注册进 `scenes`）

本任务同时用真实场景验证 `resolveLookup` 与场景数据是否自洽——这是把"讲错了"变成红灯的关键一环。

- [ ] **Step 1: 写失败的测试**

写入 `src/scenes/__tests__/b1-lookup.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { b1Lookup } from '../b1-lookup'
import { replay, resolveLookup } from '~/core'

describe('场景 b1：属性查找逐跳', () => {
  const final = replay(b1Lookup, b1Lookup.steps.length)

  it('say 定义在 Person.prototype 上，而不是实例上', () => {
    const p1 = final.nodes.find(n => n.id === 'p1')!
    const proto = final.nodes.find(n => n.id === 'Person.prototype')!
    expect(p1.props.some(p => p.key === 'say')).toBe(false)
    expect(proto.props.some(p => p.key === 'say')).toBe(true)
  })

  it('查找 say 会在 Person.prototype 命中，恰好跳一次', () => {
    const r = resolveLookup(final, 'p1', 'say')
    expect(r.found).toBe(true)
    expect(r.hitNodeId).toBe('Person.prototype')
    expect(r.edgePath).toHaveLength(1)
  })

  it('查找 name 在实例自身命中，不跳转', () => {
    const r = resolveLookup(final, 'p1', 'name')
    expect(r.hitNodeId).toBe('p1')
    expect(r.edgePath).toHaveLength(0)
  })

  it('查找不存在的属性会走到链末端且 found 为 false', () => {
    const r = resolveLookup(final, 'p1', 'fly')
    expect(r.found).toBe(false)
    expect(r.nodePath).toEqual(['p1', 'Person.prototype', 'Object.prototype'])
  })

  it('场景中声明的 traverse 边序列，与 resolveLookup 的结果一致', () => {
    // 这条断言保证「动画演示的路径」就是「引擎算出来的路径」，两者不会各说各话
    const declared = b1Lookup.steps.flatMap(s => s.traverse ?? [])
    const solved = resolveLookup(final, 'p1', 'say').edgePath
    expect(declared).toEqual(expect.arrayContaining(solved))
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/b1-lookup.test.ts`
Expected: FAIL，找不到模块 `../b1-lookup`。

- [ ] **Step 3: 写场景数据**

写入 `src/scenes/b1-lookup.ts`：

```ts
import type { Scene } from '~/core'

export const b1Lookup: Scene = {
  id: 'b1',
  title: '属性查找是怎么逐跳完成的',
  code: [
    'const p1 = new Person(\'Ada\')',
    '',
    'p1.name   // 自己身上就有',
    'p1.say()  // 自己没有，往上找',
    'p1.fly    // 一路找到头也没有',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'p1',
        label: 'p1',
        kind: 'instance',
        props: [
          { key: 'name', value: '\'Ada\'', kind: 'data' },
          { key: '[[Prototype]]', value: 'Person.prototype', kind: 'internal', refTo: 'Person.prototype' },
        ],
      },
      {
        id: 'Person.prototype',
        label: 'Person.prototype',
        kind: 'prototype',
        props: [
          { key: 'say', value: 'ƒ', kind: 'data' },
          { key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' },
        ],
      },
      {
        id: 'Object.prototype',
        label: 'Object.prototype',
        kind: 'prototype',
        meta: { builtin: true },
        props: [
          { key: 'toString', value: 'ƒ', kind: 'data' },
          { key: '[[Prototype]]', value: 'null', kind: 'internal' },
        ],
      },
    ],
    edges: [
      { id: 'e-p1-proto', source: 'p1', target: 'Person.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-proto-obj', source: 'Person.prototype', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
    ],
  },

  steps: [
    {
      title: '自己身上就有：p1.name',
      narration: '读 p1.name 时，引擎先看实例自身。name 就写在 p1 上，一步命中，根本不需要走原型链。',
      codeRange: [3, 3],
      patch: [],
      focus: { nodes: ['p1'], edges: [] },
    },
    {
      title: '自己没有：p1.say 往上找一跳',
      narration: 'p1 身上没有 say，于是顺着 [[Prototype]] 走到 Person.prototype——在这里找到了，立刻停下，不会继续往上。',
      codeRange: [4, 4],
      patch: [],
      focus: { nodes: ['p1', 'Person.prototype'], edges: ['e-p1-proto'] },
      traverse: ['e-p1-proto'],
    },
    {
      title: '一路到头也没有：p1.fly',
      narration: 'fly 在整条链上都不存在，一直走到 Object.prototype 仍未命中，再往上是 null，查找结束，返回 undefined。',
      codeRange: [5, 5],
      patch: [],
      focus: { nodes: ['p1', 'Person.prototype', 'Object.prototype'], edges: ['e-p1-proto', 'e-proto-obj'] },
      traverse: ['e-p1-proto', 'e-proto-obj'],
    },
  ],
}
```

修改 `src/scenes/index.ts`：

```ts
import { a2New } from './a2-new'
import { b1Lookup } from './b1-lookup'
import type { Scene } from '~/core'

export const scenes: Scene[] = [a2New, b1Lookup]

export function getScene(id: string): Scene | undefined {
  return scenes.find(s => s.id === id)
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/scenes`
Expected: PASS，a2 与 b1 共 12 个用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/scenes
git commit -m "feat(scenes): 新增属性查找场景并校验演示路径与求解结果一致"
```

---

## Task 13: 探索式高亮

**Files:**
- Create: `src/composables/useExplore.ts`
- Modify: `src/pages/s/[id].vue`
- Test: `src/composables/__tests__/useExplore.test.ts`

**Interfaces:**
- Consumes: Task 4 的 `protoChain`
- Produces: `useExplore(graph: Ref<GraphState>): { hoverId, setHover, dimmedNodes, highlightedNodes }`
  - hover 某节点时，该节点到链末端的整条链进入 `highlightedNodes`，其余节点进入 `dimmedNodes`
  - 未 hover 时两者均为空数组

- [ ] **Step 1: 写失败的测试**

写入 `src/composables/__tests__/useExplore.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useExplore } from '../useExplore'
import type { GraphState } from '~/core'

const graph: GraphState = {
  nodes: [
    { id: 'p1', label: 'p1', kind: 'instance', props: [] },
    { id: 'Person.prototype', label: 'Person.prototype', kind: 'prototype', props: [] },
    { id: 'Object.prototype', label: 'Object.prototype', kind: 'prototype', props: [] },
    { id: 'other', label: 'other', kind: 'plain', props: [] },
  ],
  edges: [
    { id: 'e1', source: 'p1', target: 'Person.prototype', kind: 'proto' },
    { id: 'e2', source: 'Person.prototype', target: 'Object.prototype', kind: 'proto' },
  ],
}

describe('useExplore', () => {
  it('未 hover 时不高亮也不淡化', () => {
    const e = useExplore(ref(graph))
    expect(e.highlightedNodes.value).toEqual([])
    expect(e.dimmedNodes.value).toEqual([])
  })

  it('hover 节点时点亮它到链末端的整条链', () => {
    const e = useExplore(ref(graph))
    e.setHover('p1')
    expect(e.highlightedNodes.value).toEqual(['p1', 'Person.prototype', 'Object.prototype'])
  })

  it('链外节点被淡化', () => {
    const e = useExplore(ref(graph))
    e.setHover('p1')
    expect(e.dimmedNodes.value).toEqual(['other'])
  })

  it('hover 链中段时只点亮它往上的部分', () => {
    const e = useExplore(ref(graph))
    e.setHover('Person.prototype')
    expect(e.highlightedNodes.value).toEqual(['Person.prototype', 'Object.prototype'])
    expect(e.dimmedNodes.value).toEqual(expect.arrayContaining(['p1', 'other']))
  })

  it('取消 hover 后恢复', () => {
    const e = useExplore(ref(graph))
    e.setHover('p1')
    e.setHover(null)
    expect(e.dimmedNodes.value).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/composables/__tests__/useExplore.test.ts`
Expected: FAIL，找不到模块 `../useExplore`。

- [ ] **Step 3: 实现**

写入 `src/composables/useExplore.ts`：

```ts
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { protoChain } from '~/core'
import type { GraphState } from '~/core'

/**
 * 探索式高亮：hover 任意节点，点亮它到链末端的整条原型链，其余淡化。
 * 这是「自己摸索出原型链」的核心交互。
 */
export function useExplore(graph: Ref<GraphState>) {
  const hoverId = ref<string | null>(null)

  const highlightedNodes = computed(() =>
    hoverId.value ? protoChain(graph.value, hoverId.value) : [])

  const dimmedNodes = computed(() => {
    if (!hoverId.value)
      return []
    const lit = new Set(highlightedNodes.value)
    return graph.value.nodes.filter(n => !lit.has(n.id)).map(n => n.id)
  })

  function setHover(id: string | null) {
    hoverId.value = id
  }

  return { hoverId, setHover, highlightedNodes, dimmedNodes }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/composables/__tests__/useExplore.test.ts`
Expected: PASS，5 个用例全绿。

- [ ] **Step 5: 接进播放页**

修改 `src/pages/s/[id].vue` 的 `<script setup>`，在 `usePlayer` 之后加入：

```ts
import { useExplore } from '~/composables/useExplore'

const explore = useExplore(player.graph)
```

并把模板中的 `ProtoCanvas` 换成：

```vue
<ProtoCanvas
  :graph="player.graph.value"
  :flowing-edges="flowingEdges"
  :dimmed-nodes="explore.dimmedNodes.value"
  :highlighted-nodes="explore.highlightedNodes.value"
  @node-hover="explore.setHover"
/>
```

- [ ] **Step 6: 接上「点击引用行聚焦」与「重置布局」**

spec §6.5 的四个交互中，hover 高亮由本任务的 Step 5 完成，键盘步进在 Task 11 完成，剩下这两个必须在此接线，否则 `ProtoNode` 的 `focus-ref` 事件与 `ProtoCanvas.focusNode` / `resetLayout` 就是死代码。

在 `src/pages/s/[id].vue` 的 `<script setup>` 中加入画布引用：

```ts
import type ProtoCanvasType from '~/components/canvas/ProtoCanvas.vue'

const canvasRef = ref<InstanceType<typeof ProtoCanvasType> | null>(null)

/** 点击节点内的引用型属性行 → 视口聚焦到被引用的节点 */
function onFocusRef(nodeId: string) {
  canvasRef.value?.focusNode(nodeId)
}
```

模板中给画布加 `ref` 并接上事件，同时加一个重置按钮：

```vue
<ProtoCanvas
  ref="canvasRef"
  :graph="player.graph.value"
  :flowing-edges="flowingEdges"
  :dimmed-nodes="explore.dimmedNodes.value"
  :highlighted-nodes="explore.highlightedNodes.value"
  @node-hover="explore.setHover"
  @focus-ref="onFocusRef"
/>

<button class="reset" @click="canvasRef?.resetLayout()">
  ⟲ 重置布局
</button>
```

配套样式：

```css
.reset {
  position: absolute;
  left: 20px;
  bottom: 20px;
  padding: 5px 14px;
  border: 1px solid var(--node-border);
  border-radius: 999px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
  cursor: pointer;
}
```

- [ ] **Step 7: 手工验证**

`pnpm dev` 打开 `#/s/b1`，依次确认：
1. 鼠标移到 `p1` 上，整条链点亮并发光、链外节点淡化，移开后恢复（两个主题各确认一次）；
2. 点击 `p1` 的 `[[Prototype]]` 属性行，视口平滑聚焦到 `Person.prototype`；
3. 随便拖乱几个节点后点「重置布局」，构图回到初始排布。

- [ ] **Step 8: 提交**

```bash
git add src/composables src/pages
git commit -m "feat(explore): 实现原型链 hover 高亮、引用聚焦与布局重置"
```

---

## Task 14: 路由深链与分享

**Files:**
- Create: `src/composables/useShareLink.ts`
- Modify: `src/pages/s/[id].vue`
- Test: `src/composables/__tests__/useShareLink.test.ts`

**Interfaces:**
- Consumes: Task 5 的 `ThemeName`
- Produces: `buildShareUrl(origin, sceneId, step, theme): string`、`parseShareQuery(query): { step: number, theme: ThemeName | null }`

链接形如 `<origin>/#/s/c2?step=4&theme=neon`。

- [ ] **Step 1: 写失败的测试**

写入 `src/composables/__tests__/useShareLink.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { buildShareUrl, parseShareQuery } from '../useShareLink'

describe('buildShareUrl', () => {
  it('拼出带场景、步骤与主题的深链', () => {
    expect(buildShareUrl('https://x.dev', 'a2', 3, 'neon'))
      .toBe('https://x.dev/#/s/a2?step=3&theme=neon')
  })

  it('去掉 origin 末尾多余的斜杠', () => {
    expect(buildShareUrl('https://x.dev/', 'a2', 0, 'aurora'))
      .toBe('https://x.dev/#/s/a2?step=0&theme=aurora')
  })
})

describe('parseShareQuery', () => {
  it('解析合法参数', () => {
    expect(parseShareQuery({ step: '4', theme: 'neon' })).toEqual({ step: 4, theme: 'neon' })
  })

  it('缺省时 step 为 0、theme 为 null', () => {
    expect(parseShareQuery({})).toEqual({ step: 0, theme: null })
  })

  it('非法 step 归零', () => {
    expect(parseShareQuery({ step: 'abc' }).step).toBe(0)
    expect(parseShareQuery({ step: '-5' }).step).toBe(0)
  })

  it('非法或不可切换的主题被忽略', () => {
    expect(parseShareQuery({ theme: 'rainbow' }).theme).toBeNull()
    // paper 只用于导出，不接受从链接切入
    expect(parseShareQuery({ theme: 'paper' }).theme).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/composables/__tests__/useShareLink.test.ts`
Expected: FAIL，找不到模块 `../useShareLink`。

- [ ] **Step 3: 实现**

写入 `src/composables/useShareLink.ts`：

```ts
import type { ThemeName } from './useTheme'

const SHAREABLE_THEMES: ThemeName[] = ['aurora', 'neon']

export function buildShareUrl(origin: string, sceneId: string, step: number, theme: ThemeName): string {
  const base = origin.replace(/\/+$/, '')
  return `${base}/#/s/${sceneId}?step=${step}&theme=${theme}`
}

export function parseShareQuery(query: Record<string, unknown>): { step: number, theme: ThemeName | null } {
  const rawStep = Number(query.step)
  const step = Number.isInteger(rawStep) && rawStep >= 0 ? rawStep : 0

  const rawTheme = String(query.theme ?? '')
  // paper 仅供导出，不允许通过链接切入
  const theme = SHAREABLE_THEMES.includes(rawTheme as ThemeName) ? rawTheme as ThemeName : null

  return { step, theme }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/composables/__tests__/useShareLink.test.ts`
Expected: PASS，6 个用例全绿。

- [ ] **Step 5: 接进播放页**

在 `src/pages/s/[id].vue` 的 `<script setup>` 中加入：

```ts
import { useRouter } from 'vue-router'
import { buildShareUrl, parseShareQuery } from '~/composables/useShareLink'
import { useTheme } from '~/composables/useTheme'

const router = useRouter()
const { theme, setTheme } = useTheme()

// 进入页面时按链接参数还原进度与主题
onMounted(() => {
  const { step, theme: t } = parseShareQuery(route.query)
  if (t)
    setTheme(t)
  player.goto(step)
})

// 步进时把进度同步进地址栏，便于随时复制当前画面的链接
watch(player.step, (s) => {
  router.replace({ query: { ...route.query, step: String(s) } })
})

const shareUrl = computed(() =>
  buildShareUrl(window.location.origin, scene.value.id, player.step.value, theme.value))

async function copyShare() {
  await navigator.clipboard.writeText(shareUrl.value)
}
```

在模板中加一个复制按钮：

```vue
<button class="share" @click="copyShare">
  复制分享链接
</button>
```

配套样式：

```css
.share {
  position: absolute;
  right: 20px;
  bottom: 20px;
  padding: 5px 14px;
  border: 1px solid var(--node-border);
  border-radius: 999px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
  cursor: pointer;
}
```

- [ ] **Step 6: 手工验证**

`pnpm dev`，打开 `#/s/b1?step=2&theme=neon`：进入时应直接停在第 2 步且是霓虹主题；点几下前进，地址栏 step 跟着变；点复制后粘贴到新标签页，能还原同一画面。

- [ ] **Step 7: 提交**

```bash
git add src/composables src/pages
git commit -m "feat(share): 支持带场景、步骤与主题的深链分享"
```

---

## Task 15: 导出 PNG

**Files:**
- Create: `src/components/ExportButton.vue`、`src/utils/exportImage.ts`
- Modify: `src/pages/s/[id].vue`
- Test: `src/utils/__tests__/exportImage.test.ts`

**Interfaces:**
- Consumes: Task 5 的主题机制、Task 8 的画布 DOM
- Produces: `exportPng(el: HTMLElement, filename: string): Promise<void>`（导出期间临时把根元素切到 `paper` 主题，结束后无论成败都还原）

- [ ] **Step 1: 安装依赖**

```bash
pnpm add html-to-image
```

- [ ] **Step 2: 写失败的测试**

写入 `src/utils/__tests__/exportImage.test.ts`：

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const toPng = vi.fn(async () => 'data:image/png;base64,AAAA')
vi.mock('html-to-image', () => ({ toPng: (...args: unknown[]) => toPng(...args) }))

const { exportPng } = await import('../exportImage')

describe('exportPng', () => {
  beforeEach(() => {
    toPng.mockClear()
    document.documentElement.dataset.theme = 'aurora'
  })

  it('导出时会临时切到 paper 主题，结束后还原', async () => {
    let themeDuringExport = ''
    toPng.mockImplementationOnce(async () => {
      themeDuringExport = document.documentElement.dataset.theme ?? ''
      return 'data:image/png;base64,AAAA'
    })
    await exportPng(document.createElement('div'), 'test.png')
    expect(themeDuringExport).toBe('paper')
    expect(document.documentElement.dataset.theme).toBe('aurora')
  })

  it('导出失败时也必须还原主题', async () => {
    toPng.mockRejectedValueOnce(new Error('boom'))
    await expect(exportPng(document.createElement('div'), 'test.png')).rejects.toThrow('boom')
    expect(document.documentElement.dataset.theme).toBe('aurora')
  })

  it('按 2 倍像素比导出', async () => {
    await exportPng(document.createElement('div'), 'test.png')
    expect(toPng.mock.calls[0][1]).toMatchObject({ pixelRatio: 2 })
  })
})
```

- [ ] **Step 3: 运行测试，确认失败**

Run: `pnpm test --run src/utils/__tests__/exportImage.test.ts`
Expected: FAIL，找不到模块 `../exportImage`。

- [ ] **Step 4: 实现**

写入 `src/utils/exportImage.ts`：

```ts
import { toPng } from 'html-to-image'

/**
 * 导出画布为 PNG。
 * 刻意先切到 paper 主题再截图：html-to-image 对 backdrop-filter 与 drop-shadow
 * 的还原本就不可靠，与其和它搏斗，不如导出一张本来就为白底博客设计的图。
 */
export async function exportPng(el: HTMLElement, filename: string): Promise<void> {
  const root = document.documentElement
  const previous = root.dataset.theme ?? 'aurora'
  root.dataset.theme = 'paper'

  try {
    // 等一帧，确保主题切换后的样式已经应用
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))

    const dataUrl = await toPng(el, {
      pixelRatio: 2,
      cacheBust: true,
    })

    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  }
  finally {
    // 无论成功失败都要还原，否则用户会莫名其妙停在白色主题里
    root.dataset.theme = previous
  }
}
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test --run src/utils/__tests__/exportImage.test.ts`
Expected: PASS，3 个用例全绿。

- [ ] **Step 6: 写按钮组件并接进页面**

写入 `src/components/ExportButton.vue`：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { exportPng } from '~/utils/exportImage'

const props = defineProps<{ target: HTMLElement | null, filename: string }>()

const busy = ref(false)

async function onExport() {
  if (!props.target || busy.value)
    return
  busy.value = true
  try {
    await exportPng(props.target, props.filename)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <button class="export" :disabled="busy" @click="onExport">
    {{ busy ? '导出中…' : '⤓ 导出图片' }}
  </button>
</template>

<style scoped>
.export {
  position: absolute;
  right: 20px;
  bottom: 60px;
  padding: 5px 14px;
  border: 1px solid var(--node-border);
  border-radius: 999px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
  cursor: pointer;
}

.export:disabled { opacity: 0.6; cursor: wait; }
</style>
```

在 `src/pages/s/[id].vue` 中给画布容器加 ref 并挂上按钮：

```ts
const stageRef = ref<HTMLElement | null>(null)
```

```vue
<div ref="stageRef" class="stage">
  <!-- 画布与浮层… -->
</div>
<ExportButton :target="stageRef" :filename="`${scene.id}-step${player.step.value}.png`" />
```

- [ ] **Step 7: 手工验证**

`pnpm dev`，在 `#/s/a2` 第 4 步点「导出图片」：应下载一张白底 PNG，节点为白卡片、连线为实色、无发光；页面在导出后回到原主题。

- [ ] **Step 8: 全量验证并提交**

```bash
pnpm test --run
pnpm lint
pnpm build
git add -A
git commit -m "feat(export): 支持以亮色主题离屏导出 PNG 配图"
```

---

## 完成标准（计划一验收清单）

- [ ] `pnpm test --run` 全绿，`src/core/**` 覆盖 patch / layout / traverse 三个模块
- [ ] `pnpm lint` 无 error，且 `src/core/**` 不含任何 Vue/DOM 引用
- [ ] `pnpm build` 成功
- [ ] `#/s/a2` 与 `#/s/b1` 两个场景可完整播放、可前后步进、可键盘控制
- [ ] hover 任意节点能点亮整条原型链
- [ ] 两个主题切换后，画面上**没有任何元素颜色不跟随**（发现即为硬编码色值，必须改回 token）
- [ ] 深链 `?step=&theme=` 可还原画面，复制分享链接可用
- [ ] 导出 PNG 为白底 `paper` 风格，导出后主题正确还原
- [ ] 全程无 `backdrop-filter` 出现在节点上（只在浮层与按钮上）

---

## 下一步

计划一完成后再写**计划二：场景内容全量填充**，覆盖 spec §7 剩余的 11 个场景（a1、a3、b2、b3、b4、c1、c2、c3、d1、d2、d3）、D2 全景图的折叠与搜索、以及双主题人工走查清单。届时 DSL 已由本计划固化，场景数据可以按真实 API 写出。
