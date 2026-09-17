# 架构综述

一句话：**所有模式都只做一件事——生产或消费同一个 `GraphState`。画布层只认 `GraphState`，
不认场景、不认代码、不认练习。**

原始设计文档见 [`archive/2026-09-10-prototype-chain-visualizer-design.md`](archive/2026-09-10-prototype-chain-visualizer-design.md)，
本文是它的现状版：只写「现在的代码长什么样、为什么这么分层」，不含当时的排期与待办。

## 分层

```
scenes/（纯数据）→ core/（纯 TS 函数）→ components/（Vue + Vue Flow）→ pages/（路由）
                         ↑
                  composables/（播放、主题、深链、导出）
```

- **`src/core/`——纯 TS，零 Vue/DOM 依赖。** 这是第一原则，由 `eslint.config.js` 里针对
  `src/core/**` 的 `no-restricted-imports` 强制。目的不是洁癖：图数据的三个难点（patch 重放、
  分层布局、查找路径求解）都能在 node 里直接单测，不必启动浏览器环境。
- **`src/scenes/`——13 个教学场景，一个场景一个文件，内容是纯数据。** 每个场景都有对应的
  `__tests__/*.test.ts` 断言内容正确性（见下文「测试分层」）。
- **`src/components/canvas/`——Vue Flow 的全部用量集中在此。** 之所以圈在一个目录里，是为了把
  Vue Flow 1.x → 2.0（迁移到 `@xyflow/system`）的升级面限制在这里；`core/` 与它零耦合。

## 数据模型

```ts
interface PropRow { key: string, value: string, kind: 'data' | 'accessor' | 'internal', refTo?: string }
interface ProtoNode { id: string, label: string, kind: 'function' | 'plain' | 'prototype' | 'instance' | 'null', props: PropRow[], meta?: { builtin?: boolean, collapsed?: boolean } }
type EdgeKind = 'prototype' | 'proto' | 'constructor'
interface ProtoEdge { id: string, source: string, target: string, kind: EdgeKind, sourceHandle?: string }
interface GraphState { nodes: ProtoNode[], edges: ProtoEdge[] }
interface Step { title: string, narration: string, codeRange?: [number, number], patch: GraphPatch[], focus?: { nodes: string[], edges: string[] }, traverse?: string[] }
interface Scene { id: string, title: string, code: string, initial: GraphState, steps: Step[] }
```

两个刻意的设计：

- **`ProtoNode` 没有 `position`。** 坐标是 `layout()` 的产出，不属于数据模型。数据里一旦混进坐标，
  场景作者就会开始手调像素，布局算法随即失去唯一真相的地位。
- **`PropRow.refTo` 就是边的锚点。** 连线从「`prototype ●` 这一行」精确长出，而不是从节点中心飘出。
  这是「看得懂」与「看着像」的分界线，`sourceHandle` 与之一一对应。

### 场景 = 初始图 + 一串 patch

第 n 步的图 = `steps.slice(0, n).reduce(applyPatch, initial)`。

选「纯函数重放」而不是「逐步快照」，换来三件事：后退不必实现逆操作（重放到 n-1 即可）；
分享链接只需携带 `scene` + `step`；`replay()` 是纯函数，于是**场景内容本身可以被 Vitest 断言**。

`GraphPatch` 的八种操作刻意保持最小，只覆盖场景演进真正需要的动作：
`addNode` / `removeNode` / `updateNode` / `addEdge` / `removeEdge` / `addProp` / `updateProp` / `removeProp`。

## 已固化的 core 接口

改这几个签名会波及全部 13 个场景与画布层，动之前先看清楚：

```ts
function applyPatch(graph: GraphState, patch: GraphPatch): GraphState  // 不可变
function replay(scene: Scene, step: number): GraphState
function layout(graph: GraphState): Map<string, { x: number, y: number }>  // 列 = 原型链深度，行 = 同层分支
function protoChain(graph: GraphState, startId: string): string[]
function resolveLookup(graph: GraphState, startId: string, key: string): LookupResult
```

`layout()` 不用 Vue Flow 的自动布局，也不用力导向：原型链的图有严格语义，节点的相对位置本身
就是教学信息，不能交给物理引擎随机决定。

## 目录职责

| 目录 | 职责 |
|---|---|
| [`src/core/`](../src/core/) | `types` / `patch` / `layout` / `traverse`，纯函数，可在 node 中直接测 |
| [`src/scenes/`](../src/scenes/) | 13 个场景数据 + `index.ts` 注册表（含 A/B/C/D 分组） |
| [`src/components/canvas/`](../src/components/canvas/) | `ProtoCanvas` / `ProtoNode` / `ProtoEdge` / `NodeSearch`，Vue Flow 全部用量在此 |
| [`src/components/panels/`](../src/components/panels/) | `CodePanel`（代码浮层）/ `StepPanel`（讲解浮层），均可折叠为胶囊 |
| [`src/composables/`](../src/composables/) | `usePlayer` / `useTheme` / `useDeepLink` / `useShareLink` / `useExplore` |
| [`src/styles/tokens.css`](../src/styles/tokens.css) | 三套主题的 design token，UnoCSS 的 `theme.colors` 全部指向它 |
| [`src/utils/exportImage.ts`](../src/utils/exportImage.ts) | 切到 `paper` 主题离屏重渲后导出 PNG |
| [`src/pages/`](../src/pages/) | `vite-plugin-pages` 自动路由：列表页 + `s/[id]` 场景页 |

**与原设计文档的一处出入**：设计文档 §10 规划了 `src/adapters/{scene,runtime,exercise}/` 三个适配器目录，
一期并未落地——场景数据直接就是 `Scene` 对象，多一层 `sceneAdapter` 纯属空壳。二期做代码沙盒时
再按需引入 `runtimeAdapter`，那时它才有真实职责（`getPrototypeOf` 遍历 + 环检测 + 内置对象裁剪）。

## 测试分层

| 层 | 测什么 | 怎么测 |
|---|---|---|
| `core/` | patch / layout / traverse 的纯函数行为 | Vitest 单测，TDD 先写测试 |
| `scenes/` | **内容正确性**——每个场景至少一条关键帧断言 | `replay(scene, n)` 后断言边的存在性 |
| 组件层 | 只测交互绑定 | `@vue/test-utils`，链路计算不重复测 |
| 设计语言 | 图标只用 `i-ph-*`、不内联 SVG、类名是字面量 | [`src/__tests__/design-language.test.ts`](../src/__tests__/design-language.test.ts) 守卫 |
| 视觉 | 双主题人工走查 | 一期不上视觉回归 E2E，见 [`reviews/`](reviews/) |

场景层的断言是本项目最有价值的一条测试策略：一个原型链教学站最致命的失败不是不好看，**是讲错了**。
