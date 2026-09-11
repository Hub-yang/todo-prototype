# JS 原型链可视化站点 · 计划二：场景内容全量填充

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 spec §7 剩余的 11 个教学场景，解决全景图的规模问题，并完成双主题走查，使一期内容完整可上线。

**Architecture:** 场景是纯数据（`Scene` 对象），由 `replay()` 逐步重放成 `GraphState`，画布与播放器均已就绪，本计划几乎不碰引擎代码。唯一的例外是 D2 全景图：节点规模到 15+ 后需要折叠与搜索，并要安全地重新启用可见性裁剪。

**Tech Stack:** TypeScript（场景数据）+ Vitest（内容正确性断言）+ Vue 3 `<script setup>`（列表页与搜索）

**Spec:** `docs/superpowers/specs/2026-09-10-prototype-chain-visualizer-design.md`

**前置计划:** `docs/superpowers/plans/2026-09-10-prototype-chain-visualizer-core.md`（已完成，15 个任务）

## 排期

估算口径为单人专注开发的净工时，不含上下文切换。依据是计划一的实测：一个场景（数据 + 断言 + 浏览器确认）约 30–40 分钟，交互类任务约 1.5–2 小时。

| 任务 | 内容 | 估时 |
|---|---|---|
| Task 1 | 场景测试辅助 + a1 对象字面量 | 1.0h |
| Task 2 | a3 prototype vs `__proto__` | 0.7h |
| Task 3 | b2 链的终点 null | 0.5h |
| Task 4 | b3 屏蔽（shadowing） | 0.7h |
| Task 5 | b4 `Object.create` | 0.7h |
| Task 6 | c1 class 展开成 ES5 | 0.7h |
| Task 7 | c2 extends 的双链 | 1.0h |
| Task 8 | c3 instanceof 原理 | 0.7h |
| Task 9 | d1 鸡生蛋的环 | 1.0h |
| Task 10 | d2 内置对象全景图（数据） | 1.0h |
| Task 11 | d2 搜索与可见性裁剪的安全启用 | 2.0h |
| Task 12 | d3 原型污染传播 | 0.8h |
| Task 13 | 场景列表页分组改版 | 1.0h |
| Task 14 | 双主题走查与一期验收 | 1.2h |
| | **合计** | **约 13 小时** |

按每天有效投入 3 小时计，约 4–5 个工作日。其中 Task 11 是唯一的技术风险点（见 §风险），若受阻可将其降级为"仅折叠、不做搜索"，省下约 1.2 小时。

## Global Constraints

- 包管理器一律 `pnpm`；新增依赖取**最新稳定版**，已有依赖不主动升级。
- `src/core/**` **禁止 import 任何 Vue、DOM、浏览器 API**。
- 组件与样式中**禁止硬编码任何颜色值**，一律走 `src/styles/tokens.css` 的 CSS 变量。
- 辉光一律用 CSS `filter: drop-shadow(...)`，**禁止使用 SVG `<filter>`**。
- `backdrop-filter` **只允许出现在浮层组件**，禁止用于节点。
- 边的三种语义颜色永不混用：`prototype` / `proto` / `constructor`。
- 代码注释、UI 文案一律**简体中文**。
- 提交遵循 Conventional Commits，**不添加 `Co-Authored-By` trailer**。
- **每个场景都必须有内容正确性断言**：一个原型链教学站最致命的失败是讲错了。
- **每一步的 `traverse` 必须等于 `resolveLookup` 的求解结果**（凡是演示属性查找的步骤），保证动画路径与引擎算出的路径一致。
- 场景源码字符串中若含模板字符串，需加 `// eslint-disable-next-line no-template-curly-in-string`。

## 已固化的接口（来自计划一，本计划直接使用）

```ts
// src/core
interface PropRow { key: string, value: string, kind: 'data' | 'accessor' | 'internal', refTo?: string }
interface ProtoNode { id: string, label: string, kind: 'function' | 'plain' | 'prototype' | 'instance' | 'null', props: PropRow[], meta?: { builtin?: boolean, collapsed?: boolean } }
type EdgeKind = 'prototype' | 'proto' | 'constructor'
interface ProtoEdge { id: string, source: string, target: string, kind: EdgeKind, sourceHandle?: string }
interface GraphState { nodes: ProtoNode[], edges: ProtoEdge[] }
interface Step { title: string, narration: string, codeRange?: [number, number], patch: GraphPatch[], focus?: { nodes: string[], edges: string[] }, traverse?: string[] }
interface Scene { id: string, title: string, code: string, initial: GraphState, steps: Step[] }

function replay(scene: Scene, step: number): GraphState
function protoChain(graph: GraphState, startId: string): string[]
function resolveLookup(graph: GraphState, startId: string, key: string): LookupResult
```

`GraphPatch` 的八种操作：`addNode` / `removeNode` / `updateNode` / `addEdge` / `removeEdge` / `addProp` / `updateProp` / `removeProp`。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/scenes/__tests__/helpers.ts` | 场景测试共用辅助：查边、通用完整性断言 |
| `src/scenes/a1-literal.ts` | 场景：对象字面量的隐式原型 |
| `src/scenes/a3-prototype-vs-proto.ts` | 场景：`prototype` 与 `__proto__` 正面对决 |
| `src/scenes/b2-chain-end.ts` | 场景：链的终点 null |
| `src/scenes/b3-shadowing.ts` | 场景：屏蔽（写操作不上溯） |
| `src/scenes/b4-object-create.ts` | 场景：`Object.create` 与无原型对象 |
| `src/scenes/c1-class-desugar.ts` | 场景：class 展开成 ES5 |
| `src/scenes/c2-extends.ts` | 场景：extends 的双链 |
| `src/scenes/c3-instanceof.ts` | 场景：instanceof 原理 |
| `src/scenes/d1-chicken-egg.ts` | 场景：Object 与 Function 的环 |
| `src/scenes/d2-builtins.ts` | 场景：内置对象全景图 |
| `src/scenes/d3-pollution.ts` | 场景：原型污染传播 |
| `src/scenes/index.ts` | 场景注册表（追加分组信息） |
| `src/components/canvas/NodeSearch.vue` | 全景图的节点搜索浮层 |
| `src/components/canvas/ProtoCanvas.vue` | 追加：搜索命中高亮、可见性裁剪的安全启用 |
| `src/pages/index.vue` | 场景列表页按 A/B/C/D 分组 |

---

## Task 1: 场景测试辅助与 a1 对象字面量

**Files:**
- Create: `src/scenes/__tests__/helpers.ts`、`src/scenes/a1-literal.ts`、`src/scenes/__tests__/a1-literal.test.ts`
- Modify: `src/scenes/index.ts`

**Interfaces:**
- Consumes: `Scene`、`GraphState`、`EdgeKind`、`replay`
- Produces:
  - `hasEdge(g: GraphState, source: string, target: string, kind: EdgeKind): boolean`
  - `expectSceneIntegrity(scene: Scene): void` — 通用完整性断言，后续每个场景测试都调用它
  - `a1Literal: Scene`

- [x] **Step 1: 写测试辅助**

写入 `src/scenes/__tests__/helpers.ts`：

```ts
import type { EdgeKind, GraphState, Scene } from '~/core'
import { expect } from 'vitest'
import { replay } from '~/core'

export function hasEdge(g: GraphState, source: string, target: string, kind: EdgeKind): boolean {
  return g.edges.some(e => e.source === source && e.target === target && e.kind === kind)
}

/**
 * 每个场景都要通过的通用检查。
 * 这些错误肉眼极难发现：悬空边会让连线指向不存在的节点，
 * traverse 引用了不存在的边会让流光动画悄悄失效。
 */
export function expectSceneIntegrity(scene: Scene): void {
  const final = replay(scene, scene.steps.length)
  const nodeIds = new Set(final.nodes.map(n => n.id))
  const edgeIds = new Set(final.edges.map(e => e.id))

  expect(scene.steps.length).toBeGreaterThan(0)

  for (const step of scene.steps) {
    expect(step.narration.length).toBeGreaterThan(0)
    expect(step.codeRange).toBeDefined()

    for (const id of step.traverse ?? [])
      expect(edgeIds.has(id), `traverse 引用了不存在的边：${id}`).toBe(true)

    for (const id of step.focus?.nodes ?? [])
      expect(nodeIds.has(id), `focus 引用了不存在的节点：${id}`).toBe(true)
  }

  for (const e of final.edges) {
    expect(nodeIds.has(e.source), `边 ${e.id} 的起点不存在：${e.source}`).toBe(true)
    expect(nodeIds.has(e.target), `边 ${e.id} 的终点不存在：${e.target}`).toBe(true)
  }

  // 属性行声明的引用也必须落到真实节点上
  for (const n of final.nodes) {
    for (const p of n.props) {
      if (p.refTo)
        expect(nodeIds.has(p.refTo), `${n.id}.${p.key} 引用了不存在的节点：${p.refTo}`).toBe(true)
    }
  }
}
```

- [x] **Step 2: 写 a1 的失败测试**

写入 `src/scenes/__tests__/a1-literal.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { replay, resolveLookup } from '~/core'
import { a1Literal } from '../a1-literal'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 a1：对象字面量的隐式原型', () => {
  it('通过通用完整性检查', () => {
    expectSceneIntegrity(a1Literal)
  })

  it('初始只有一个空的字面量对象，尚未画出原型关系', () => {
    const g = replay(a1Literal, 0)
    expect(g.nodes.map(n => n.id)).toContain('o')
    expect(hasEdge(g, 'o', 'Object.prototype', 'proto')).toBe(false)
  })

  it('字面量对象自动接到 Object.prototype 上', () => {
    const g = replay(a1Literal, a1Literal.steps.length)
    expect(hasEdge(g, 'o', 'Object.prototype', 'proto')).toBe(true)
  })

  it('toString 不在对象自己身上，却能通过原型链找到', () => {
    const g = replay(a1Literal, a1Literal.steps.length)
    expect(g.nodes.find(n => n.id === 'o')!.props.some(p => p.key === 'toString')).toBe(false)

    const r = resolveLookup(g, 'o', 'toString')
    expect(r.found).toBe(true)
    expect(r.hitNodeId).toBe('Object.prototype')
  })

  it('演示查找 toString 的那一步，流光路径等于引擎求解的路径', () => {
    const g = replay(a1Literal, a1Literal.steps.length)
    const step = a1Literal.steps.find(s => s.title.includes('toString'))!
    expect(step.traverse).toEqual(resolveLookup(g, 'o', 'toString').edgePath)
  })

  it('链的终点是 null', () => {
    const g = replay(a1Literal, a1Literal.steps.length)
    const objProto = g.nodes.find(n => n.id === 'Object.prototype')!
    expect(objProto.props.some(p => p.kind === 'internal' && p.value === 'null')).toBe(true)
  })
})
```

- [x] **Step 3: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/a1-literal.test.ts`
Expected: FAIL，找不到模块 `../a1-literal`。

- [x] **Step 4: 写场景数据**

写入 `src/scenes/a1-literal.ts`：

```ts
import type { Scene } from '~/core'

export const a1Literal: Scene = {
  id: 'a1',
  title: '一个 {} 也有原型',
  code: [
    'const o = { name: \'Ada\' }',
    '',
    'o.toString()                              // 能用，但 o 自己并没有 toString',
    'Object.getPrototypeOf(o) === Object.prototype  // true',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'o',
        label: 'o',
        kind: 'plain',
        props: [{ key: 'name', value: '\'Ada\'', kind: 'data' }],
      },
      {
        id: 'Object.prototype',
        label: 'Object.prototype',
        kind: 'prototype',
        meta: { builtin: true },
        props: [
          { key: 'toString', value: 'ƒ', kind: 'data' },
          { key: 'hasOwnProperty', value: 'ƒ', kind: 'data' },
          { key: '[[Prototype]]', value: 'null', kind: 'internal' },
        ],
      },
    ],
    edges: [],
  },

  steps: [
    {
      title: '一个再普通不过的字面量对象',
      narration: '写 { name: \'Ada\' } 的时候，我们只声明了 name 一个属性。看起来这个对象身上就只有它。',
      codeRange: [1, 1],
      patch: [],
      focus: { nodes: ['o'], edges: [] },
    },
    {
      title: '但它出生时就被接上了一条线',
      narration: '所有对象字面量都会自动获得一个内部槽 [[Prototype]]，指向 Object.prototype。这一步不需要你写任何代码，是引擎替你连的。',
      codeRange: [1, 1],
      patch: [
        {
          op: 'addProp',
          nodeId: 'o',
          prop: { key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-o-obj', source: 'o', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['o', 'Object.prototype'], edges: ['e-o-obj'] },
      traverse: ['e-o-obj'],
    },
    {
      title: '所以 o.toString() 才能用',
      narration: 'o 自己没有 toString，引擎顺着那条线走到 Object.prototype，在这里找到了它。你从未定义过 toString，却一直能用，原因就在这条线上。',
      codeRange: [3, 3],
      patch: [],
      focus: { nodes: ['o', 'Object.prototype'], edges: ['e-o-obj'] },
      traverse: ['e-o-obj'],
    },
    {
      title: '再往上就是 null，链到此为止',
      narration: 'Object.prototype 的 [[Prototype]] 是 null——不是对象，而是明确的「没有了」。查找走到这里就会停下，返回 undefined。',
      codeRange: [4, 4],
      patch: [],
      focus: { nodes: ['Object.prototype'], edges: [] },
    },
  ],
}
```

- [x] **Step 5: 注册场景**

修改 `src/scenes/index.ts`：

```ts
import type { Scene } from '~/core'
import { a1Literal } from './a1-literal'
import { a2New } from './a2-new'
import { b1Lookup } from './b1-lookup'

export const scenes: Scene[] = [a1Literal, a2New, b1Lookup]

export function getScene(id: string): Scene | undefined {
  return scenes.find(s => s.id === id)
}
```

- [x] **Step 6: 运行测试，确认通过**

Run: `pnpm test --run src/scenes`
Expected: PASS，a1 的 6 条断言全绿，a2 与 b1 不受影响。

- [x] **Step 7: 提交**

```bash
git add src/scenes
git commit -m "feat(scenes): 新增对象字面量隐式原型场景与场景测试辅助"
```

---

## Task 2: a3 prototype 与 `__proto__` 正面对决

**Files:**
- Create: `src/scenes/a3-prototype-vs-proto.ts`、`src/scenes/__tests__/a3-prototype-vs-proto.test.ts`
- Modify: `src/scenes/index.ts`

**Interfaces:**
- Consumes: Task 1 的 `hasEdge`、`expectSceneIntegrity`
- Produces: `a3PrototypeVsProto: Scene`

这是全站最容易被讲糊的一处：两个名字长得像，含义完全不同，而且函数自己也有 `__proto__`，与它的 `prototype` 毫无关系。

- [x] **Step 1: 写失败的测试**

写入 `src/scenes/__tests__/a3-prototype-vs-proto.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { protoChain, replay } from '~/core'
import { a3PrototypeVsProto } from '../a3-prototype-vs-proto'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 a3：prototype 与 __proto__ 的区别', () => {
  const final = replay(a3PrototypeVsProto, a3PrototypeVsProto.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(a3PrototypeVsProto)
  })

  it('prototype 是函数身上的普通属性，画成 prototype 边', () => {
    expect(hasEdge(final, 'Person', 'Person.prototype', 'prototype')).toBe(true)
  })

  it('实例的 [[Prototype]] 是内部槽，画成 proto 边', () => {
    expect(hasEdge(final, 'p', 'Person.prototype', 'proto')).toBe(true)
  })

  it('两者指向同一个对象——这正是本场景要讲清的事', () => {
    const fromFunction = final.edges.find(e => e.source === 'Person' && e.kind === 'prototype')!
    const fromInstance = final.edges.find(e => e.source === 'p' && e.kind === 'proto')!
    expect(fromFunction.target).toBe(fromInstance.target)
  })

  it('函数自己也有 [[Prototype]]，指向 Function.prototype，与它的 prototype 属性无关', () => {
    expect(hasEdge(final, 'Person', 'Function.prototype', 'proto')).toBe(true)
    // 函数的原型链与它的 prototype 属性是两条完全不同的线
    expect(protoChain(final, 'Person')).not.toContain('Person.prototype')
  })

  it('实例的原型链上没有 Function.prototype', () => {
    expect(protoChain(final, 'p')).toEqual(['p', 'Person.prototype', 'Object.prototype'])
  })
})
```

- [x] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/a3-prototype-vs-proto.test.ts`
Expected: FAIL，找不到模块。

- [x] **Step 3: 写场景数据**

写入 `src/scenes/a3-prototype-vs-proto.ts`：

```ts
import type { Scene } from '~/core'

export const a3PrototypeVsProto: Scene = {
  id: 'a3',
  title: 'prototype 与 __proto__ 到底差在哪',
  code: [
    'function Person() {}',
    'const p = new Person()',
    '',
    'Person.prototype                      // 函数身上的一个普通属性',
    'Object.getPrototypeOf(p)              // 实例的内部槽',
    'Person.prototype === Object.getPrototypeOf(p)   // true，同一个对象',
    '',
    'Object.getPrototypeOf(Person)         // 函数自己的原型：Function.prototype',
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
    ],
  },

  steps: [
    {
      title: 'prototype：函数身上的一个普通属性',
      narration: '只要声明一个函数，它就自动带上一个名为 prototype 的普通属性，指向一个对象。你可以打印它、改它，它跟函数的其它属性没什么不同。',
      codeRange: [1, 1],
      patch: [],
      focus: { nodes: ['Person', 'Person.prototype'], edges: ['e-fn-proto'] },
    },
    {
      title: '__proto__：实例身上的内部槽',
      narration: 'new 出来的实例带的是 [[Prototype]] 内部槽，它不是普通属性，而是引擎查找属性时真正会走的那条线。',
      codeRange: [2, 2],
      patch: [
        {
          op: 'addNode',
          node: {
            id: 'p',
            label: 'p',
            kind: 'instance',
            props: [{ key: '[[Prototype]]', value: 'Person.prototype', kind: 'internal', refTo: 'Person.prototype' }],
          },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-p-proto', source: 'p', target: 'Person.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['p', 'Person.prototype'], edges: ['e-p-proto'] },
      traverse: ['e-p-proto'],
    },
    {
      title: '两条线，指向同一个对象',
      narration: '同时看这两条线：一条从函数的 prototype 属性出发，一条从实例的内部槽出发，终点是同一个 Person.prototype。这就是二者的全部关系——名字像，角色完全不同，但指着同一处。',
      codeRange: [4, 6],
      patch: [],
      focus: { nodes: ['Person', 'p', 'Person.prototype'], edges: ['e-fn-proto', 'e-p-proto'] },
    },
    {
      title: '陷阱：函数自己也有原型',
      narration: 'Person 本身也是对象，所以它也有自己的 [[Prototype]]，指向 Function.prototype。注意这条线跟 Person.prototype 毫无关系——一个是「我的原型是谁」，一个是「我造出来的实例的原型是谁」。',
      codeRange: [8, 8],
      patch: [
        {
          op: 'addNode',
          node: {
            id: 'Function.prototype',
            label: 'Function.prototype',
            kind: 'prototype',
            meta: { builtin: true },
            props: [
              { key: 'call', value: 'ƒ', kind: 'data' },
              { key: 'apply', value: 'ƒ', kind: 'data' },
              { key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' },
            ],
          },
        },
        {
          op: 'addProp',
          nodeId: 'Person',
          prop: { key: '[[Prototype]]', value: 'Function.prototype', kind: 'internal', refTo: 'Function.prototype' },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-fn-funcproto', source: 'Person', target: 'Function.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-funcproto-obj', source: 'Function.prototype', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['Person', 'Function.prototype'], edges: ['e-fn-funcproto'] },
      traverse: ['e-fn-funcproto'],
    },
  ],
}
```

- [x] **Step 4: 注册并运行测试**

在 `src/scenes/index.ts` 中 import `a3PrototypeVsProto` 并加入 `scenes` 数组（保持 id 字典序）。

Run: `pnpm test --run src/scenes`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/scenes
git commit -m "feat(scenes): 新增 prototype 与 __proto__ 对比场景"
```

---

## Task 3: b2 链的终点 null

**Files:**
- Create: `src/scenes/b2-chain-end.ts`、`src/scenes/__tests__/b2-chain-end.test.ts`
- Modify: `src/scenes/index.ts`

**Interfaces:**
- Consumes: Task 1 的辅助
- Produces: `b2ChainEnd: Scene`

本场景用一个 `kind: 'null'` 的节点把链的终点画出来，让「终点」从一句话变成图上看得见的一格。

- [x] **Step 1: 写失败的测试**

写入 `src/scenes/__tests__/b2-chain-end.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { protoChain, replay, resolveLookup } from '~/core'
import { b2ChainEnd } from '../b2-chain-end'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 b2：链的终点是 null', () => {
  const final = replay(b2ChainEnd, b2ChainEnd.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(b2ChainEnd)
  })

  it('终点被画成一个独立节点，而不只是一行文字', () => {
    const nullNode = final.nodes.find(n => n.kind === 'null')
    expect(nullNode).toBeDefined()
    expect(nullNode!.props).toHaveLength(0)
  })

  it('Object.prototype 指向 null 节点', () => {
    expect(hasEdge(final, 'Object.prototype', 'null', 'proto')).toBe(true)
  })

  it('查找不存在的属性会走完整条链并失败', () => {
    const r = resolveLookup(final, 'o', 'fly')
    expect(r.found).toBe(false)
    expect(r.nodePath).toEqual(['o', 'Object.prototype', 'null'])
  })

  it('演示查找失败的那一步，流光路径等于引擎求解的路径', () => {
    const step = b2ChainEnd.steps.find(s => s.title.includes('undefined'))!
    expect(step.traverse).toEqual(resolveLookup(final, 'o', 'fly').edgePath)
  })

  it('null 之后没有任何出边，链真的到头了', () => {
    expect(protoChain(final, 'null')).toEqual(['null'])
  })
})
```

- [x] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/b2-chain-end.test.ts`
Expected: FAIL，找不到模块。

- [x] **Step 3: 写场景数据**

写入 `src/scenes/b2-chain-end.ts`：

```ts
import type { Scene } from '~/core'

export const b2ChainEnd: Scene = {
  id: 'b2',
  title: '链走到头会发生什么',
  code: [
    'const o = { name: \'Ada\' }',
    '',
    'o.fly            // undefined，而不是报错',
    '',
    'Object.getPrototypeOf(Object.prototype)   // null',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'o',
        label: 'o',
        kind: 'plain',
        props: [
          { key: 'name', value: '\'Ada\'', kind: 'data' },
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
          { key: '[[Prototype]]', value: 'null', kind: 'internal', refTo: 'null' },
        ],
      },
      {
        id: 'null',
        label: 'null',
        kind: 'null',
        props: [],
      },
    ],
    edges: [
      { id: 'e-o-obj', source: 'o', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-obj-null', source: 'Object.prototype', target: 'null', kind: 'proto', sourceHandle: '[[Prototype]]' },
    ],
  },

  steps: [
    {
      title: '先看清整条链的形状',
      narration: 'o 的原型链只有三格：它自己、Object.prototype，然后是 null。注意 null 不是一个对象，它是链的尽头。',
      codeRange: [1, 1],
      patch: [],
      focus: { nodes: ['o', 'Object.prototype', 'null'], edges: ['e-o-obj', 'e-obj-null'] },
    },
    {
      title: '读 o.fly：一路找到头也没有，结果是 undefined',
      narration: '引擎先看 o 自己，没有；走到 Object.prototype，还是没有；再往上是 null，没有地方可找了。于是返回 undefined——注意是返回值，不是抛错。',
      codeRange: [3, 3],
      patch: [],
      focus: { nodes: ['o', 'Object.prototype', 'null'], edges: ['e-o-obj', 'e-obj-null'] },
      traverse: ['e-o-obj', 'e-obj-null'],
    },
    {
      title: '为什么终点必须是 null',
      narration: '如果链没有尽头，查找一个不存在的属性就会永远走下去。null 的作用就是明确地说「到此为止」，让引擎知道该停了。',
      codeRange: [5, 5],
      patch: [],
      focus: { nodes: ['null'], edges: [] },
    },
  ],
}
```

- [x] **Step 4: 注册并运行测试**

在 `src/scenes/index.ts` 中 import `b2ChainEnd` 并加入 `scenes`。

Run: `pnpm test --run src/scenes`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/scenes
git commit -m "feat(scenes): 新增原型链终点场景，把 null 画成看得见的一格"
```

---

## Task 4: b3 屏蔽（写操作不上溯）

**Files:**
- Create: `src/scenes/b3-shadowing.ts`、`src/scenes/__tests__/b3-shadowing.test.ts`
- Modify: `src/scenes/index.ts`

**Interfaces:**
- Consumes: Task 1 的辅助
- Produces: `b3Shadowing: Scene`

这是最高频的误解：很多人以为 `p1.name = x` 会改到原型上。本场景用 `addProp` / `removeProp` 把「写操作只在实例自己身上新建属性」演出来。

- [x] **Step 1: 写失败的测试**

写入 `src/scenes/__tests__/b3-shadowing.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { replay, resolveLookup } from '~/core'
import { b3Shadowing } from '../b3-shadowing'
import { expectSceneIntegrity } from './helpers'

function propsOf(scene: typeof b3Shadowing, step: number, nodeId: string) {
  return replay(scene, step).nodes.find(n => n.id === nodeId)!.props.map(p => p.key)
}

describe('场景 b3：屏蔽（shadowing）', () => {
  it('通过通用完整性检查', () => {
    expectSceneIntegrity(b3Shadowing)
  })

  it('起初 name 只在原型上，实例自己没有', () => {
    expect(propsOf(b3Shadowing, 0, 'p1')).not.toContain('name')
    expect(propsOf(b3Shadowing, 0, 'Person.prototype')).toContain('name')
  })

  it('起初读 name 会命中原型', () => {
    const r = resolveLookup(replay(b3Shadowing, 0), 'p1', 'name')
    expect(r.hitNodeId).toBe('Person.prototype')
  })

  it('赋值之后，实例自己多出一个 name，而原型上的原封不动', () => {
    const step = b3Shadowing.steps.findIndex(s => s.title.includes('赋值')) + 1
    expect(propsOf(b3Shadowing, step, 'p1')).toContain('name')
    expect(propsOf(b3Shadowing, step, 'Person.prototype')).toContain('name')
  })

  it('赋值之后读 name 命中实例自己，不再上溯', () => {
    const step = b3Shadowing.steps.findIndex(s => s.title.includes('赋值')) + 1
    const r = resolveLookup(replay(b3Shadowing, step), 'p1', 'name')
    expect(r.hitNodeId).toBe('p1')
    expect(r.edgePath).toHaveLength(0)
  })

  it('delete 掉实例的属性后，原型上的重新可见', () => {
    const final = replay(b3Shadowing, b3Shadowing.steps.length)
    expect(final.nodes.find(n => n.id === 'p1')!.props.map(p => p.key)).not.toContain('name')
    expect(resolveLookup(final, 'p1', 'name').hitNodeId).toBe('Person.prototype')
  })

  it('全程原型上的 name 值从未被改动过', () => {
    const valueAt = (step: number) =>
      replay(b3Shadowing, step).nodes
        .find(n => n.id === 'Person.prototype')!
        .props.find(p => p.key === 'name')!.value

    const values = b3Shadowing.steps.map((_, i) => valueAt(i + 1))
    expect(new Set(values).size).toBe(1)
  })
})
```

- [x] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/b3-shadowing.test.ts`
Expected: FAIL，找不到模块。

- [x] **Step 3: 写场景数据**

写入 `src/scenes/b3-shadowing.ts`：

```ts
import type { Scene } from '~/core'

export const b3Shadowing: Scene = {
  id: 'b3',
  title: '给实例赋值，会改到原型上吗',
  code: [
    'function Person() {}',
    'Person.prototype.name = \'原型上的名字\'',
    '',
    'const p1 = new Person()',
    'p1.name                    // \'原型上的名字\'，来自原型',
    '',
    'p1.name = \'我自己的名字\'    // 写操作',
    'p1.name                    // \'我自己的名字\'',
    'Person.prototype.name      // \'原型上的名字\'，没被改动',
    '',
    'delete p1.name',
    'p1.name                    // 又变回 \'原型上的名字\'',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'p1',
        label: 'p1',
        kind: 'instance',
        props: [{ key: '[[Prototype]]', value: 'Person.prototype', kind: 'internal', refTo: 'Person.prototype' }],
      },
      {
        id: 'Person.prototype',
        label: 'Person.prototype',
        kind: 'prototype',
        props: [
          { key: 'name', value: '\'原型上的名字\'', kind: 'data' },
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
      title: '读取时会上溯：p1.name 来自原型',
      narration: 'p1 自己没有 name，于是沿着链走到 Person.prototype，读到了「原型上的名字」。此刻 p1 身上确实一个 name 都没有。',
      codeRange: [5, 5],
      patch: [],
      focus: { nodes: ['p1', 'Person.prototype'], edges: ['e-p1-proto'] },
      traverse: ['e-p1-proto'],
    },
    {
      title: '赋值不会上溯：它在 p1 自己身上新建了一个属性',
      narration: '这是最容易搞错的一步。p1.name = ... 并不会顺着链去改原型，而是直接在 p1 自己身上创建一个同名属性。注意看：原型那一行纹丝不动。',
      codeRange: [7, 7],
      patch: [{
        op: 'addProp',
        nodeId: 'p1',
        prop: { key: 'name', value: '\'我自己的名字\'', kind: 'data' },
      }],
      focus: { nodes: ['p1'], edges: [] },
    },
    {
      title: '于是原型上的那个被「屏蔽」了',
      narration: '再读 p1.name，第一步就在 p1 自己身上命中，根本不会走到原型。原型上的 name 还在，只是被挡住了——这就是屏蔽（shadowing）。',
      codeRange: [8, 9],
      patch: [],
      focus: { nodes: ['p1'], edges: [] },
    },
    {
      title: 'delete 掉遮挡物，原型上的重新露出来',
      narration: '删掉 p1 自己的 name 之后，查找又会走到原型上。这也反过来证明了：刚才那次赋值从头到尾没有碰过原型。',
      codeRange: [11, 12],
      patch: [{ op: 'removeProp', nodeId: 'p1', key: 'name' }],
      focus: { nodes: ['p1', 'Person.prototype'], edges: ['e-p1-proto'] },
      traverse: ['e-p1-proto'],
    },
  ],
}
```

- [x] **Step 4: 注册并运行测试**

在 `src/scenes/index.ts` 中 import `b3Shadowing` 并加入 `scenes`。

Run: `pnpm test --run src/scenes`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/scenes
git commit -m "feat(scenes): 新增屏蔽场景，演示写操作不会上溯到原型"
```

---

## Task 5: b4 Object.create 与无原型对象

**Files:**
- Create: `src/scenes/b4-object-create.ts`、`src/scenes/__tests__/b4-object-create.test.ts`
- Modify: `src/scenes/index.ts`

**Interfaces:**
- Consumes: Task 1 的辅助
- Produces: `b4ObjectCreate: Scene`

- [x] **Step 1: 写失败的测试**

写入 `src/scenes/__tests__/b4-object-create.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { protoChain, replay, resolveLookup } from '~/core'
import { b4ObjectCreate } from '../b4-object-create'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 b4：Object.create', () => {
  const final = replay(b4ObjectCreate, b4ObjectCreate.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(b4ObjectCreate)
  })

  it('Object.create(proto) 把新对象直接接到指定原型上', () => {
    expect(hasEdge(final, 'a', 'proto', 'proto')).toBe(true)
  })

  it('a 的完整链是 a → proto → Object.prototype', () => {
    expect(protoChain(final, 'a')).toEqual(['a', 'proto', 'Object.prototype'])
  })

  it('a 能用原型上的方法', () => {
    expect(resolveLookup(final, 'a', 'greet').hitNodeId).toBe('proto')
  })

  it('Object.create(null) 造出的对象没有任何原型出边', () => {
    expect(final.edges.some(e => e.source === 'bare')).toBe(false)
    expect(protoChain(final, 'bare')).toEqual(['bare'])
  })

  it('无原型对象连 toString 都没有', () => {
    expect(resolveLookup(final, 'bare', 'toString').found).toBe(false)
  })
})
```

- [x] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/b4-object-create.test.ts`
Expected: FAIL，找不到模块。

- [x] **Step 3: 写场景数据**

写入 `src/scenes/b4-object-create.ts`：

```ts
import type { Scene } from '~/core'

export const b4ObjectCreate: Scene = {
  id: 'b4',
  title: '不用 new，直接指定原型',
  code: [
    'const proto = {',
    '  greet() { return \'hi\' },',
    '}',
    '',
    'const a = Object.create(proto)',
    'a.greet()            // \'hi\'，来自 proto',
    '',
    'const bare = Object.create(null)',
    'bare.toString        // undefined，它连 Object.prototype 都没有',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'proto',
        label: 'proto',
        kind: 'plain',
        props: [
          { key: 'greet', value: 'ƒ', kind: 'data' },
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
      { id: 'e-proto-obj', source: 'proto', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
    ],
  },

  steps: [
    {
      title: '先准备一个普通对象当原型',
      narration: 'proto 就是一个普通对象，身上有个 greet 方法。它自己的原型仍然是 Object.prototype。',
      codeRange: [1, 3],
      patch: [],
      focus: { nodes: ['proto'], edges: [] },
    },
    {
      title: 'Object.create 直接把新对象接上去',
      narration: '不需要构造函数，也不需要 new：Object.create(proto) 造出一个空对象，并把它的 [[Prototype]] 直接指向 proto。这是最直白的一种接链方式。',
      codeRange: [5, 5],
      patch: [
        {
          op: 'addNode',
          node: {
            id: 'a',
            label: 'a',
            kind: 'instance',
            props: [{ key: '[[Prototype]]', value: 'proto', kind: 'internal', refTo: 'proto' }],
          },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-a-proto', source: 'a', target: 'proto', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['a', 'proto'], edges: ['e-a-proto'] },
      traverse: ['e-a-proto'],
    },
    {
      title: '于是 a 能用 proto 上的方法',
      narration: 'a 自己是空的，但沿着刚接上的那条线走一跳就找到了 greet。查找规则始终是同一条，不管这条线是 new 连的还是 Object.create 连的。',
      codeRange: [6, 6],
      patch: [],
      focus: { nodes: ['a', 'proto'], edges: ['e-a-proto'] },
      traverse: ['e-a-proto'],
    },
    {
      title: 'Object.create(null)：一个连原型都没有的对象',
      narration: '传 null 会造出一个真正孤零零的对象——没有 [[Prototype]]，图上看不到任何出边。它连 toString、hasOwnProperty 都没有，因此常被用作干净的字典，天然免疫原型污染。',
      codeRange: [8, 9],
      patch: [{
        op: 'addNode',
        node: {
          id: 'bare',
          label: 'bare',
          kind: 'plain',
          props: [{ key: '[[Prototype]]', value: 'null', kind: 'internal' }],
        },
      }],
      focus: { nodes: ['bare'], edges: [] },
    },
  ],
}
```

- [x] **Step 4: 注册并运行测试**

在 `src/scenes/index.ts` 中 import `b4ObjectCreate` 并加入 `scenes`。

Run: `pnpm test --run src/scenes`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/scenes
git commit -m "feat(scenes): 新增 Object.create 场景，含无原型对象"
```

---

## Task 6: c1 class 展开成 ES5

**Files:**
- Create: `src/scenes/c1-class-desugar.ts`、`src/scenes/__tests__/c1-class-desugar.test.ts`
- Modify: `src/scenes/index.ts`

**Interfaces:**
- Consumes: Task 1 的辅助
- Produces: `c1ClassDesugar: Scene`

- [x] **Step 1: 写失败的测试**

写入 `src/scenes/__tests__/c1-class-desugar.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { replay, resolveLookup } from '~/core'
import { c1ClassDesugar } from '../c1-class-desugar'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 c1：class 展开成 ES5', () => {
  const final = replay(c1ClassDesugar, c1ClassDesugar.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(c1ClassDesugar)
  })

  it('class 声明出来的 Person 仍然是函数', () => {
    expect(final.nodes.find(n => n.id === 'Person')!.kind).toBe('function')
  })

  it('实例方法挂在 Person.prototype 上，不在实例上', () => {
    expect(final.nodes.find(n => n.id === 'Person.prototype')!.props.some(p => p.key === 'say')).toBe(true)
    expect(final.nodes.find(n => n.id === 'p')!.props.some(p => p.key === 'say')).toBe(false)
  })

  it('静态方法挂在 Person 自己身上，不在原型上', () => {
    expect(final.nodes.find(n => n.id === 'Person')!.props.some(p => p.key === 'create')).toBe(true)
    expect(final.nodes.find(n => n.id === 'Person.prototype')!.props.some(p => p.key === 'create')).toBe(false)
  })

  it('实例能找到 say，但找不到静态方法 create', () => {
    expect(resolveLookup(final, 'p', 'say').hitNodeId).toBe('Person.prototype')
    expect(resolveLookup(final, 'p', 'create').found).toBe(false)
  })

  it('实例与原型之间是 proto 边，函数与原型之间是 prototype 边', () => {
    expect(hasEdge(final, 'p', 'Person.prototype', 'proto')).toBe(true)
    expect(hasEdge(final, 'Person', 'Person.prototype', 'prototype')).toBe(true)
  })
})
```

- [x] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/c1-class-desugar.test.ts`
Expected: FAIL，找不到模块。

- [x] **Step 3: 写场景数据**

写入 `src/scenes/c1-class-desugar.ts`：

```ts
import type { Scene } from '~/core'

export const c1ClassDesugar: Scene = {
  id: 'c1',
  title: 'class 其实还是那套老东西',
  code: [
    'class Person {',
    '  constructor(name) { this.name = name }',
    '  say() {}                  // 实例方法',
    '  static create() {}        // 静态方法',
    '}',
    '',
    '// 完全等价于：',
    '// function Person(name) { this.name = name }',
    '// Person.prototype.say = function () {}',
    '// Person.create = function () {}',
    '',
    'const p = new Person(\'Ada\')',
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
    ],
  },

  steps: [
    {
      title: 'class 声明出来的，还是一个函数',
      narration: 'class 是语法糖，不是新的对象模型。Person 的类型仍然是 function，它照样带着那个 prototype 属性。图的骨架和用 function 声明时一模一样。',
      codeRange: [1, 5],
      patch: [],
      focus: { nodes: ['Person', 'Person.prototype'], edges: ['e-fn-proto'] },
    },
    {
      title: '实例方法挂在 prototype 上',
      narration: 'say 写在 class 体里，但它并不在每个实例身上各存一份，而是挂在 Person.prototype 上。所有实例共享同一个 say，这正是原型的意义。',
      codeRange: [3, 3],
      patch: [{
        op: 'addProp',
        nodeId: 'Person.prototype',
        prop: { key: 'say', value: 'ƒ', kind: 'data' },
      }],
      focus: { nodes: ['Person.prototype'], edges: [] },
    },
    {
      title: '静态方法挂在函数自己身上',
      narration: 'static create 去了 Person 本身，而不是 Person.prototype。所以实例访问不到它——实例的链上根本不经过 Person。',
      codeRange: [4, 4],
      patch: [{
        op: 'addProp',
        nodeId: 'Person',
        prop: { key: 'create', value: 'ƒ', kind: 'data' },
      }],
      focus: { nodes: ['Person'], edges: [] },
    },
    {
      title: 'new 出实例，链和以前一样',
      narration: '实例接到 Person.prototype 上，于是能用 say，但永远拿不到 create。换成 class 语法，这条规则一个字都没变。',
      codeRange: [12, 12],
      patch: [
        {
          op: 'addNode',
          node: {
            id: 'p',
            label: 'p',
            kind: 'instance',
            props: [
              { key: 'name', value: '\'Ada\'', kind: 'data' },
              { key: '[[Prototype]]', value: 'Person.prototype', kind: 'internal', refTo: 'Person.prototype' },
            ],
          },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-p-proto', source: 'p', target: 'Person.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['p', 'Person.prototype'], edges: ['e-p-proto'] },
      traverse: ['e-p-proto'],
    },
  ],
}
```

- [x] **Step 4: 注册并运行测试**

在 `src/scenes/index.ts` 中 import `c1ClassDesugar` 并加入 `scenes`。

Run: `pnpm test --run src/scenes`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/scenes
git commit -m "feat(scenes): 新增 class 展开场景，区分实例方法与静态方法的归属"
```

---

## Task 7: c2 extends 的双链

**Files:**
- Create: `src/scenes/c2-extends.ts`、`src/scenes/__tests__/c2-extends.test.ts`
- Modify: `src/scenes/index.ts`

**Interfaces:**
- Consumes: Task 1 的辅助
- Produces: `c2Extends: Scene`

spec 点名这是"全网讲解最薄弱的点"：`extends` 同时连了两条链，多数教程只讲实例链，漏掉静态链，导致"子类为什么能调用父类静态方法"无法解释。

- [x] **Step 1: 写失败的测试**

写入 `src/scenes/__tests__/c2-extends.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { protoChain, replay, resolveLookup } from '~/core'
import { c2Extends } from '../c2-extends'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 c2：extends 的双链', () => {
  const final = replay(c2Extends, c2Extends.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(c2Extends)
  })

  it('实例链：Dog.prototype 接到 Animal.prototype 上', () => {
    expect(hasEdge(final, 'Dog.prototype', 'Animal.prototype', 'proto')).toBe(true)
  })

  it('静态链：Dog 自己接到 Animal 上', () => {
    // 这一条是本场景的核心，多数教程会漏掉
    expect(hasEdge(final, 'Dog', 'Animal', 'proto')).toBe(true)
  })

  it('实例的完整链穿过两级原型', () => {
    expect(protoChain(final, 'd')).toEqual(['d', 'Dog.prototype', 'Animal.prototype', 'Object.prototype'])
  })

  it('实例方法沿实例链继承', () => {
    expect(resolveLookup(final, 'd', 'breathe').hitNodeId).toBe('Animal.prototype')
  })

  it('静态方法沿静态链继承——这正是静态链存在的意义', () => {
    expect(resolveLookup(final, 'Dog', 'register').hitNodeId).toBe('Animal')
  })

  it('实例拿不到静态方法，因为它的链不经过构造函数', () => {
    expect(resolveLookup(final, 'd', 'register').found).toBe(false)
  })

  it('两条链是分开的：Dog 的链上没有 Dog.prototype', () => {
    expect(protoChain(final, 'Dog')).not.toContain('Dog.prototype')
  })
})
```

- [x] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/c2-extends.test.ts`
Expected: FAIL，找不到模块。

- [x] **Step 3: 写场景数据**

写入 `src/scenes/c2-extends.ts`：

```ts
import type { Scene } from '~/core'

export const c2Extends: Scene = {
  id: 'c2',
  title: 'extends 其实连了两条链',
  code: [
    'class Animal {',
    '  breathe() {}',
    '  static register() {}',
    '}',
    '',
    'class Dog extends Animal {',
    '  bark() {}',
    '}',
    '',
    'const d = new Dog()',
    'd.breathe()        // 沿实例链找到 Animal.prototype',
    'Dog.register()     // 沿静态链找到 Animal',
    'd.register         // undefined，实例够不到静态方法',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'Animal',
        label: 'Animal',
        kind: 'function',
        props: [
          { key: 'register', value: 'ƒ', kind: 'data' },
          { key: 'prototype', value: '⟐', kind: 'data', refTo: 'Animal.prototype' },
        ],
      },
      {
        id: 'Animal.prototype',
        label: 'Animal.prototype',
        kind: 'prototype',
        props: [
          { key: 'breathe', value: 'ƒ', kind: 'data' },
          { key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' },
        ],
      },
      {
        id: 'Dog',
        label: 'Dog',
        kind: 'function',
        props: [{ key: 'prototype', value: '⟐', kind: 'data', refTo: 'Dog.prototype' }],
      },
      {
        id: 'Dog.prototype',
        label: 'Dog.prototype',
        kind: 'prototype',
        props: [{ key: 'bark', value: 'ƒ', kind: 'data' }],
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
      { id: 'e-animal-proto', source: 'Animal', target: 'Animal.prototype', kind: 'prototype', sourceHandle: 'prototype' },
      { id: 'e-dog-proto', source: 'Dog', target: 'Dog.prototype', kind: 'prototype', sourceHandle: 'prototype' },
      { id: 'e-animalproto-obj', source: 'Animal.prototype', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
    ],
  },

  steps: [
    {
      title: '两个类，此刻还毫无关系',
      narration: '先看清楚起点：Animal 和 Dog 各自带着自己的 prototype 对象，四个格子彼此独立。extends 要做的，是在它们之间连线。',
      codeRange: [1, 8],
      patch: [],
      focus: { nodes: ['Animal', 'Dog', 'Animal.prototype', 'Dog.prototype'], edges: [] },
    },
    {
      title: '第一条线：实例链',
      narration: 'extends 把 Dog.prototype 的 [[Prototype]] 指向 Animal.prototype。这条线决定了「Dog 的实例能不能用 Animal 的实例方法」。这也是大多数教程唯一会讲的一条。',
      codeRange: [6, 6],
      patch: [
        {
          op: 'addProp',
          nodeId: 'Dog.prototype',
          prop: { key: '[[Prototype]]', value: 'Animal.prototype', kind: 'internal', refTo: 'Animal.prototype' },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-dogproto-animalproto', source: 'Dog.prototype', target: 'Animal.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['Dog.prototype', 'Animal.prototype'], edges: ['e-dogproto-animalproto'] },
      traverse: ['e-dogproto-animalproto'],
    },
    {
      title: '第二条线：静态链',
      narration: 'extends 同时还把 Dog 自己的 [[Prototype]] 指向了 Animal。很多教程漏掉这条线，于是无法解释「为什么 Dog.register() 能调用父类的静态方法」。',
      codeRange: [6, 6],
      patch: [
        {
          op: 'addProp',
          nodeId: 'Dog',
          prop: { key: '[[Prototype]]', value: 'Animal', kind: 'internal', refTo: 'Animal' },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-dog-animal', source: 'Dog', target: 'Animal', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['Dog', 'Animal'], edges: ['e-dog-animal'] },
      traverse: ['e-dog-animal'],
    },
    {
      title: '实例沿实例链找方法',
      narration: 'd.breathe() 从 d 出发，经 Dog.prototype 走到 Animal.prototype 命中。全程不经过 Dog 或 Animal 这两个函数本身。',
      codeRange: [10, 11],
      patch: [
        {
          op: 'addNode',
          node: {
            id: 'd',
            label: 'd',
            kind: 'instance',
            props: [{ key: '[[Prototype]]', value: 'Dog.prototype', kind: 'internal', refTo: 'Dog.prototype' }],
          },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-d-dogproto', source: 'd', target: 'Dog.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: {
        nodes: ['d', 'Dog.prototype', 'Animal.prototype'],
        edges: ['e-d-dogproto', 'e-dogproto-animalproto'],
      },
      traverse: ['e-d-dogproto', 'e-dogproto-animalproto'],
    },
    {
      title: '构造函数沿静态链找方法',
      narration: 'Dog.register() 走的是另一条线：从 Dog 直接跳到 Animal。两条链各走各的，互不相交——所以 d.register 是 undefined，实例的链根本不经过构造函数。',
      codeRange: [12, 13],
      patch: [],
      focus: { nodes: ['Dog', 'Animal'], edges: ['e-dog-animal'] },
      traverse: ['e-dog-animal'],
    },
  ],
}
```

- [x] **Step 4: 注册并运行测试**

在 `src/scenes/index.ts` 中 import `c2Extends` 并加入 `scenes`。

Run: `pnpm test --run src/scenes`
Expected: PASS，8 条断言全绿。

- [x] **Step 5: 提交**

```bash
git add src/scenes
git commit -m "feat(scenes): 新增 extends 双链场景，补上常被漏讲的静态链"
```

---

## Task 8: c3 instanceof 原理

**Files:**
- Create: `src/scenes/c3-instanceof.ts`、`src/scenes/__tests__/c3-instanceof.test.ts`
- Modify: `src/scenes/index.ts`

**Interfaces:**
- Consumes: Task 1 的辅助
- Produces: `c3Instanceof: Scene`

- [x] **Step 1: 写失败的测试**

写入 `src/scenes/__tests__/c3-instanceof.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { protoChain, replay } from '~/core'
import { c3Instanceof } from '../c3-instanceof'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 c3：instanceof 原理', () => {
  const final = replay(c3Instanceof, c3Instanceof.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(c3Instanceof)
  })

  it('d 的原型链上确实出现了 Animal.prototype，所以 d instanceof Animal 为真', () => {
    expect(protoChain(final, 'd')).toContain('Animal.prototype')
  })

  it('Animal.prototype 由 Animal 的 prototype 属性指出', () => {
    expect(hasEdge(final, 'Animal', 'Animal.prototype', 'prototype')).toBe(true)
  })

  it('逐跳比对的演示路径覆盖了从 d 到 Animal.prototype 的每一跳', () => {
    const step = c3Instanceof.steps.find(s => s.title.includes('逐跳'))!
    expect(step.traverse).toEqual(['e-d-dogproto', 'e-dogproto-animalproto'])
  })

  it('无关的类不在链上，所以 instanceof 为假', () => {
    expect(protoChain(final, 'd')).not.toContain('Cat.prototype')
  })
})
```

- [x] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/c3-instanceof.test.ts`
Expected: FAIL，找不到模块。

- [x] **Step 3: 写场景数据**

写入 `src/scenes/c3-instanceof.ts`：

```ts
import type { Scene } from '~/core'

export const c3Instanceof: Scene = {
  id: 'c3',
  title: 'instanceof 到底在比什么',
  code: [
    'class Animal {}',
    'class Dog extends Animal {}',
    'class Cat extends Animal {}',
    '',
    'const d = new Dog()',
    '',
    'd instanceof Dog       // true',
    'd instanceof Animal    // true，隔了一级也算',
    'd instanceof Cat       // false，Cat.prototype 不在 d 的链上',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'd',
        label: 'd',
        kind: 'instance',
        props: [{ key: '[[Prototype]]', value: 'Dog.prototype', kind: 'internal', refTo: 'Dog.prototype' }],
      },
      {
        id: 'Dog',
        label: 'Dog',
        kind: 'function',
        props: [{ key: 'prototype', value: '⟐', kind: 'data', refTo: 'Dog.prototype' }],
      },
      {
        id: 'Dog.prototype',
        label: 'Dog.prototype',
        kind: 'prototype',
        props: [{ key: '[[Prototype]]', value: 'Animal.prototype', kind: 'internal', refTo: 'Animal.prototype' }],
      },
      {
        id: 'Animal',
        label: 'Animal',
        kind: 'function',
        props: [{ key: 'prototype', value: '⟐', kind: 'data', refTo: 'Animal.prototype' }],
      },
      {
        id: 'Animal.prototype',
        label: 'Animal.prototype',
        kind: 'prototype',
        props: [{ key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' }],
      },
      {
        id: 'Cat',
        label: 'Cat',
        kind: 'function',
        props: [{ key: 'prototype', value: '⟐', kind: 'data', refTo: 'Cat.prototype' }],
      },
      {
        id: 'Cat.prototype',
        label: 'Cat.prototype',
        kind: 'prototype',
        props: [{ key: '[[Prototype]]', value: 'Animal.prototype', kind: 'internal', refTo: 'Animal.prototype' }],
      },
      {
        id: 'Object.prototype',
        label: 'Object.prototype',
        kind: 'prototype',
        meta: { builtin: true },
        props: [{ key: '[[Prototype]]', value: 'null', kind: 'internal' }],
      },
    ],
    edges: [
      { id: 'e-d-dogproto', source: 'd', target: 'Dog.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-dog-proto', source: 'Dog', target: 'Dog.prototype', kind: 'prototype', sourceHandle: 'prototype' },
      { id: 'e-dogproto-animalproto', source: 'Dog.prototype', target: 'Animal.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-animal-proto', source: 'Animal', target: 'Animal.prototype', kind: 'prototype', sourceHandle: 'prototype' },
      { id: 'e-cat-proto', source: 'Cat', target: 'Cat.prototype', kind: 'prototype', sourceHandle: 'prototype' },
      { id: 'e-catproto-animalproto', source: 'Cat.prototype', target: 'Animal.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-animalproto-obj', source: 'Animal.prototype', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
    ],
  },

  steps: [
    {
      title: 'instanceof 不看构造函数，只看一个对象',
      narration: '算 d instanceof Animal 时，引擎根本不关心 d 是被谁造出来的，它只做一件事：取出 Animal.prototype 这个对象，记在手边。',
      codeRange: [8, 8],
      patch: [],
      focus: { nodes: ['Animal', 'Animal.prototype'], edges: ['e-animal-proto'] },
    },
    {
      title: '然后沿 d 的原型链逐跳比对',
      narration: '从 d 出发一格一格往上走，每到一格就问：你是不是刚才记下的那个 Animal.prototype？第一跳到 Dog.prototype，不是；第二跳到 Animal.prototype，命中，于是返回 true。',
      codeRange: [8, 8],
      patch: [],
      focus: {
        nodes: ['d', 'Dog.prototype', 'Animal.prototype'],
        edges: ['e-d-dogproto', 'e-dogproto-animalproto'],
      },
      traverse: ['e-d-dogproto', 'e-dogproto-animalproto'],
    },
    {
      title: '所以「隔了一级」也算 true',
      narration: 'd instanceof Dog 在第一跳就命中，d instanceof Animal 在第二跳命中——两者都是 true。instanceof 问的是「在不在这条链上」，而不是「是不是直接由它造的」。',
      codeRange: [7, 8],
      patch: [],
      focus: { nodes: ['d', 'Dog.prototype', 'Animal.prototype'], edges: [] },
    },
    {
      title: 'Cat.prototype 不在链上，所以是 false',
      narration: 'Cat 和 Dog 是兄弟，它们的 prototype 都接到 Animal.prototype 上，但彼此不在对方的链上。沿着 d 一路走到 null 也遇不到 Cat.prototype，于是返回 false。',
      codeRange: [9, 9],
      patch: [],
      focus: { nodes: ['Cat', 'Cat.prototype'], edges: ['e-cat-proto'] },
    },
  ],
}
```

- [x] **Step 4: 注册并运行测试**

在 `src/scenes/index.ts` 中 import `c3Instanceof` 并加入 `scenes`。

Run: `pnpm test --run src/scenes`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/scenes
git commit -m "feat(scenes): 新增 instanceof 场景，演示沿链逐跳比对"
```

---

## Task 9: d1 鸡生蛋的环

**Files:**
- Create: `src/scenes/d1-chicken-egg.ts`、`src/scenes/__tests__/d1-chicken-egg.test.ts`
- Modify: `src/scenes/index.ts`

**Interfaces:**
- Consumes: Task 1 的辅助
- Produces: `d1ChickenEgg: Scene`

spec 称它是"全站最具视觉冲击的一帧"。注意 `Function` 的 `[[Prototype]]` 指向 `Function.prototype`——这是一条指向自身 `prototype` 属性所指对象的边，布局算法必须能安然处理。

- [x] **Step 1: 写失败的测试**

写入 `src/scenes/__tests__/d1-chicken-egg.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { layout, protoChain, replay } from '~/core'
import { d1ChickenEgg } from '../d1-chicken-egg'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 d1：Object 与 Function 的环', () => {
  const final = replay(d1ChickenEgg, d1ChickenEgg.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(d1ChickenEgg)
  })

  it('Object 是函数，原型是 Function.prototype', () => {
    expect(hasEdge(final, 'Object', 'Function.prototype', 'proto')).toBe(true)
  })

  it('Function 自己的原型也是 Function.prototype——这就是那个环', () => {
    expect(hasEdge(final, 'Function', 'Function.prototype', 'proto')).toBe(true)
  })

  it('Function.prototype 本身是个对象，原型是 Object.prototype', () => {
    expect(hasEdge(final, 'Function.prototype', 'Object.prototype', 'proto')).toBe(true)
  })

  it('Function 的 prototype 属性与它的 [[Prototype]] 指向同一个对象', () => {
    const asProperty = final.edges.find(e => e.source === 'Function' && e.kind === 'prototype')!
    const asProto = final.edges.find(e => e.source === 'Function' && e.kind === 'proto')!
    expect(asProperty.target).toBe(asProto.target)
  })

  it('尽管图上有环形观感，proto 链本身仍是有限的', () => {
    expect(protoChain(final, 'Function')).toEqual(['Function', 'Function.prototype', 'Object.prototype'])
  })

  it('布局算法能处理这张图，每个节点都拿到坐标', () => {
    const pos = layout(final)
    expect(pos.size).toBe(final.nodes.length)
  })
})
```

- [x] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/d1-chicken-egg.test.ts`
Expected: FAIL，找不到模块。

- [x] **Step 3: 写场景数据**

写入 `src/scenes/d1-chicken-egg.ts`：

```ts
import type { Scene } from '~/core'

export const d1ChickenEgg: Scene = {
  id: 'd1',
  title: '先有 Object 还是先有 Function',
  code: [
    'typeof Object            // \'function\'',
    'typeof Function          // \'function\'',
    '',
    'Object.__proto__ === Function.prototype            // true',
    'Function.__proto__ === Function.prototype          // true，指向了自己的 prototype',
    'Function.prototype.__proto__ === Object.prototype  // true',
    'Object.prototype.__proto__ === null                // true，终点',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'Object',
        label: 'Object',
        kind: 'function',
        meta: { builtin: true },
        props: [
          { key: 'keys', value: 'ƒ', kind: 'data' },
          { key: 'prototype', value: '⟐', kind: 'data', refTo: 'Object.prototype' },
        ],
      },
      {
        id: 'Function',
        label: 'Function',
        kind: 'function',
        meta: { builtin: true },
        props: [{ key: 'prototype', value: '⟐', kind: 'data', refTo: 'Function.prototype' }],
      },
      {
        id: 'Function.prototype',
        label: 'Function.prototype',
        kind: 'prototype',
        meta: { builtin: true },
        props: [
          { key: 'call', value: 'ƒ', kind: 'data' },
          { key: 'apply', value: 'ƒ', kind: 'data' },
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
      { id: 'e-object-prototype', source: 'Object', target: 'Object.prototype', kind: 'prototype', sourceHandle: 'prototype' },
      { id: 'e-function-prototype', source: 'Function', target: 'Function.prototype', kind: 'prototype', sourceHandle: 'prototype' },
    ],
  },

  steps: [
    {
      title: 'Object 和 Function 都是函数',
      narration: '先接受一个事实：我们天天用的 Object 和 Function，本身都是函数。既然是函数，它们就都该有自己的原型。',
      codeRange: [1, 2],
      patch: [],
      focus: { nodes: ['Object', 'Function'], edges: [] },
    },
    {
      title: '所有函数的原型，都是 Function.prototype',
      narration: 'Object 作为一个函数，它的 [[Prototype]] 指向 Function.prototype。这就是为什么 Object.call、Object.apply 能用——它们来自这里。',
      codeRange: [4, 4],
      patch: [
        {
          op: 'addProp',
          nodeId: 'Object',
          prop: { key: '[[Prototype]]', value: 'Function.prototype', kind: 'internal', refTo: 'Function.prototype' },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-object-funcproto', source: 'Object', target: 'Function.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['Object', 'Function.prototype'], edges: ['e-object-funcproto'] },
      traverse: ['e-object-funcproto'],
    },
    {
      title: '包括 Function 自己',
      narration: '这一步是全图最奇妙的地方：Function 也是函数，所以它的 [[Prototype]] 同样指向 Function.prototype——而那正是它自己 prototype 属性所指的那个对象。两条线汇到同一格。',
      codeRange: [5, 5],
      patch: [
        {
          op: 'addProp',
          nodeId: 'Function',
          prop: { key: '[[Prototype]]', value: 'Function.prototype', kind: 'internal', refTo: 'Function.prototype' },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-function-funcproto', source: 'Function', target: 'Function.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: {
        nodes: ['Function', 'Function.prototype'],
        edges: ['e-function-prototype', 'e-function-funcproto'],
      },
      traverse: ['e-function-funcproto'],
    },
    {
      title: 'Function.prototype 也只是个对象',
      narration: '它虽然叫 Function.prototype，本质仍是一个普通对象，所以它的原型是 Object.prototype。绕了一圈，最后还是回到对象那一侧。',
      codeRange: [6, 6],
      patch: [
        {
          op: 'addProp',
          nodeId: 'Function.prototype',
          prop: { key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-funcproto-objproto', source: 'Function.prototype', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['Function.prototype', 'Object.prototype'], edges: ['e-funcproto-objproto'] },
      traverse: ['e-funcproto-objproto'],
    },
    {
      title: '所以没有谁先谁后',
      narration: '这几个内置对象是引擎启动时一次性铺好的，彼此指来指去，不存在「先造出谁」的顺序。图上看着像环，但沿 [[Prototype]] 实际走一遍，每条路都会在 null 终止。',
      codeRange: [7, 7],
      patch: [],
      focus: {
        nodes: ['Object', 'Function', 'Function.prototype', 'Object.prototype'],
        edges: ['e-object-funcproto', 'e-function-funcproto', 'e-funcproto-objproto'],
      },
      traverse: ['e-function-funcproto', 'e-funcproto-objproto'],
    },
  ],
}
```

- [x] **Step 4: 注册并运行测试**

在 `src/scenes/index.ts` 中 import `d1ChickenEgg` 并加入 `scenes`。

Run: `pnpm test --run src/scenes`
Expected: PASS。

- [x] **Step 5: 浏览器确认这一帧的观感**

```bash
pnpm dev
```
打开 `#/s/d1`，走到最后一步，确认：四个节点与多条交叉线没有互相压住、`Function` 那两条汇向同一格的线清晰可辨。若线条打结，调整 `initial.nodes` 的数组顺序（同层节点按数组顺序横向排开）。

- [x] **Step 6: 提交**

```bash
git add src/scenes
git commit -m "feat(scenes): 新增 Object 与 Function 互为原型的环形场景"
```

---

## Task 10: d2 内置对象全景图（数据）

**Files:**
- Create: `src/scenes/d2-builtins.ts`、`src/scenes/__tests__/d2-builtins.test.ts`
- Modify: `src/scenes/index.ts`

**Interfaces:**
- Consumes: Task 1 的辅助
- Produces: `d2Builtins: Scene`

本任务只产出数据；节点规模带来的折叠与搜索问题在 Task 11 解决。所有内置构造函数节点默认 `meta.collapsed = true`，否则一屏放不下。

- [x] **Step 1: 写失败的测试**

写入 `src/scenes/__tests__/d2-builtins.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { layout, protoChain, replay } from '~/core'
import { d2Builtins } from '../d2-builtins'
import { expectSceneIntegrity, hasEdge } from './helpers'

describe('场景 d2：内置对象全景图', () => {
  const final = replay(d2Builtins, d2Builtins.steps.length)

  it('通过通用完整性检查', () => {
    expectSceneIntegrity(d2Builtins)
  })

  it('覆盖常用内置构造函数', () => {
    const ids = new Set(final.nodes.map(n => n.id))
    for (const name of ['Array', 'Date', 'RegExp', 'Error', 'Map', 'Set'])
      expect(ids.has(name), `缺少内置对象：${name}`).toBe(true)
  })

  it('每个内置构造函数都有自己的 prototype 对象', () => {
    for (const name of ['Array', 'Date', 'RegExp', 'Error', 'Map', 'Set'])
      expect(hasEdge(final, name, `${name}.prototype`, 'prototype')).toBe(true)
  })

  it('所有内置原型最终都汇到 Object.prototype', () => {
    for (const name of ['Array', 'Date', 'RegExp', 'Error', 'Map', 'Set'])
      expect(protoChain(final, `${name}.prototype`)).toContain('Object.prototype')
  })

  it('实例示例挂在对应的原型上', () => {
    expect(hasEdge(final, 'arr', 'Array.prototype', 'proto')).toBe(true)
  })

  it('节点规模足够大，确实需要折叠与搜索', () => {
    expect(final.nodes.length).toBeGreaterThanOrEqual(15)
  })

  it('内置构造函数默认折叠，否则一屏放不下', () => {
    const builtinCtors = final.nodes.filter(n => n.kind === 'function' && n.meta?.builtin)
    expect(builtinCtors.length).toBeGreaterThan(0)
    expect(builtinCtors.every(n => n.meta?.collapsed === true)).toBe(true)
  })

  it('布局算法能给这张大图的每个节点排出坐标', () => {
    expect(layout(final).size).toBe(final.nodes.length)
  })
})
```

- [x] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/d2-builtins.test.ts`
Expected: FAIL，找不到模块。

- [x] **Step 3: 写场景数据**

写入 `src/scenes/d2-builtins.ts`：

```ts
import type { ProtoNode, Scene } from '~/core'

/** 内置构造函数与它挂在原型上的代表方法 */
const BUILTINS: Array<{ name: string, methods: string[] }> = [
  { name: 'Array', methods: ['map', 'filter', 'push'] },
  { name: 'Date', methods: ['getTime', 'toISOString'] },
  { name: 'RegExp', methods: ['test', 'exec'] },
  { name: 'Error', methods: ['toString'] },
  { name: 'Map', methods: ['get', 'set'] },
  { name: 'Set', methods: ['add', 'has'] },
]

function ctorNode(name: string): ProtoNode {
  return {
    id: name,
    label: name,
    kind: 'function',
    // 默认折叠：这张图节点很多，全部展开会一屏放不下
    meta: { builtin: true, collapsed: true },
    props: [{ key: 'prototype', value: '⟐', kind: 'data', refTo: `${name}.prototype` }],
  }
}

function protoNode(name: string, methods: string[]): ProtoNode {
  return {
    id: `${name}.prototype`,
    label: `${name}.prototype`,
    kind: 'prototype',
    meta: { builtin: true },
    props: [
      ...methods.map(m => ({ key: m, value: 'ƒ', kind: 'data' as const })),
      { key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal' as const, refTo: 'Object.prototype' },
    ],
  }
}

export const d2Builtins: Scene = {
  id: 'd2',
  title: '内置对象的全景地图',
  code: [
    '[].map           // 来自 Array.prototype',
    'new Date().getTime()   // 来自 Date.prototype',
    '/x/.test(\'x\')    // 来自 RegExp.prototype',
    '',
    '// 它们最终都汇到同一个地方：',
    'Object.getPrototypeOf(Array.prototype) === Object.prototype   // true',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'Object.prototype',
        label: 'Object.prototype',
        kind: 'prototype',
        meta: { builtin: true },
        props: [
          { key: 'toString', value: 'ƒ', kind: 'data' },
          { key: 'hasOwnProperty', value: 'ƒ', kind: 'data' },
          { key: '[[Prototype]]', value: 'null', kind: 'internal' },
        ],
      },
      ...BUILTINS.flatMap(b => [ctorNode(b.name), protoNode(b.name, b.methods)]),
    ],
    edges: [
      ...BUILTINS.map(b => ({
        id: `e-${b.name}-prototype`,
        source: b.name,
        target: `${b.name}.prototype`,
        kind: 'prototype' as const,
        sourceHandle: 'prototype',
      })),
      ...BUILTINS.map(b => ({
        id: `e-${b.name}proto-obj`,
        source: `${b.name}.prototype`,
        target: 'Object.prototype',
        kind: 'proto' as const,
        sourceHandle: '[[Prototype]]',
      })),
    ],
  },

  steps: [
    {
      title: '每个内置类型都有自己的一格原型',
      narration: 'Array、Date、RegExp、Error、Map、Set……每一个都是构造函数，每一个都带着自己的 prototype 对象，方法就挂在那上面。节点默认是折叠的，点标题行可以展开看属性。',
      codeRange: [1, 3],
      patch: [],
      focus: { nodes: BUILTINS.map(b => `${b.name}.prototype`), edges: [] },
    },
    {
      title: '你每天调用的方法，都住在这些格子里',
      narration: '写 [].map 时，数组自己身上并没有 map，它沿着链走到 Array.prototype 才找到。这和前面所有场景的查找规则完全一致，只是这次一次性铺开给你看。',
      codeRange: [1, 1],
      patch: [
        {
          op: 'addNode',
          node: {
            id: 'arr',
            label: '[1, 2, 3]',
            kind: 'instance',
            props: [
              { key: 'length', value: '3', kind: 'data' },
              { key: '[[Prototype]]', value: 'Array.prototype', kind: 'internal', refTo: 'Array.prototype' },
            ],
          },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-arr-arrayproto', source: 'arr', target: 'Array.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['arr', 'Array.prototype'], edges: ['e-arr-arrayproto'] },
      traverse: ['e-arr-arrayproto'],
    },
    {
      title: '所有的路最后都通向 Object.prototype',
      narration: '把视线抬高：这些原型各自服务不同的类型，但它们的 [[Prototype]] 全都指向 Object.prototype。这就是为什么任何东西都能调用 toString——整个语言的对象体系最终收束到同一格。',
      codeRange: [5, 6],
      patch: [],
      focus: {
        nodes: ['Object.prototype', ...BUILTINS.map(b => `${b.name}.prototype`)],
        edges: BUILTINS.map(b => `e-${b.name}proto-obj`),
      },
      traverse: ['e-arr-arrayproto', 'e-Arrayproto-obj'],
    },
  ],
}
```

- [x] **Step 4: 注册并运行测试**

在 `src/scenes/index.ts` 中 import `d2Builtins` 并加入 `scenes`。

Run: `pnpm test --run src/scenes`
Expected: PASS，8 条断言全绿。注意最后一步 `traverse` 里的 `e-Arrayproto-obj` 必须与上面 `edges` 生成的 id 完全一致（`e-${b.name}proto-obj` 中 `b.name` 为 `Array`），通用完整性检查会校验这一点。

- [x] **Step 5: 提交**

```bash
git add src/scenes
git commit -m "feat(scenes): 新增内置对象全景场景，默认折叠以容纳大规模节点"
```

---

## Task 11: 全景图的搜索与可见性裁剪的安全启用

**Files:**
- Create: `src/components/canvas/NodeSearch.vue`、`src/components/canvas/__tests__/NodeSearch.test.ts`
- Modify: `src/components/canvas/ProtoCanvas.vue`、`src/components/canvas/__tests__/ProtoCanvas.test.ts`、`src/pages/s/[id].vue`

**Interfaces:**
- Consumes: `graphBounds`、`NODE_CELL`、`layout`、Task 10 的 `d2Builtins`
- Produces:
  - `NodeSearch.vue`：props `{ nodes: Array<{ id: string, label: string }> }`，事件 `pick(nodeId: string)`
  - `ProtoCanvas` 新增 prop `enableVisibilityCulling?: boolean`（默认 `false`）

**背景（必读）：** 计划一发现 `only-render-visible-elements` 会与节点测量形成死结——它要靠节点尺寸判断可见性，而尺寸未测出时节点停在 0×0，导致视口操作全部静默失效。因此当前它被硬编码为 `false`。本任务把它改成"节点初始化完成后才开启"，让全景图既能享受裁剪带来的性能，又不会回到那个死结。

**风险提示：** 若实测发现开启后节点仍测不出尺寸，**不要硬扛**——把 `enableVisibilityCulling` 保持 `false` 并在 Task 14 的走查中记录实际帧率；30+ 节点在现代浏览器上通常仍然流畅，这项优化可以推迟。

- [x] **Step 1: 写搜索组件的失败测试**

写入 `src/components/canvas/__tests__/NodeSearch.test.ts`：

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NodeSearch from '../NodeSearch.vue'

const nodes = [
  { id: 'Array', label: 'Array' },
  { id: 'Array.prototype', label: 'Array.prototype' },
  { id: 'Date', label: 'Date' },
  { id: 'Object.prototype', label: 'Object.prototype' },
]

describe('nodeSearch', () => {
  it('不输入时不列出任何候选，避免遮挡画布', () => {
    const w = mount(NodeSearch, { props: { nodes } })
    expect(w.findAll('[data-hit]')).toHaveLength(0)
  })

  it('按输入过滤，忽略大小写', async () => {
    const w = mount(NodeSearch, { props: { nodes } })
    await w.find('input').setValue('arr')
    expect(w.findAll('[data-hit]')).toHaveLength(2)
  })

  it('点击候选项派发 pick 事件', async () => {
    const w = mount(NodeSearch, { props: { nodes } })
    await w.find('input').setValue('date')
    await w.find('[data-hit]').trigger('click')
    expect(w.emitted('pick')?.[0]).toEqual(['Date'])
  })

  it('无匹配时给出提示而不是空白', async () => {
    const w = mount(NodeSearch, { props: { nodes } })
    await w.find('input').setValue('不存在的东西')
    expect(w.findAll('[data-hit]')).toHaveLength(0)
    expect(w.text()).toContain('没有匹配')
  })

  it('选中后清空输入，方便连续搜索', async () => {
    const w = mount(NodeSearch, { props: { nodes } })
    await w.find('input').setValue('date')
    await w.find('[data-hit]').trigger('click')
    expect((w.find('input').element as HTMLInputElement).value).toBe('')
  })
})
```

- [x] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/components/canvas/__tests__/NodeSearch.test.ts`
Expected: FAIL，找不到组件。

- [x] **Step 3: 实现搜索组件**

写入 `src/components/canvas/NodeSearch.vue`：

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  nodes: Array<{ id: string, label: string }>
}>()

const emit = defineEmits<{ pick: [nodeId: string] }>()

const keyword = ref('')

const hits = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k)
    return []
  return props.nodes.filter(n => n.label.toLowerCase().includes(k)).slice(0, 8)
})

function pick(id: string) {
  emit('pick', id)
  // 清空以便连续搜索下一个节点
  keyword.value = ''
}
</script>

<template>
  <div class="search">
    <input v-model="keyword" type="search" placeholder="搜索节点，例如 Array">

    <ul v-if="keyword.trim()" class="hits">
      <li
        v-for="hit in hits"
        :key="hit.id"
        data-hit
        @click="pick(hit.id)"
      >
        {{ hit.label }}
      </li>
      <li v-if="hits.length === 0" class="empty">
        没有匹配的节点
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 浮层允许 backdrop-filter */
.search {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 5;
  width: 220px;
}

input {
  width: 100%;
  padding: 6px 12px;
  border: 1px solid var(--node-border);
  border-radius: 999px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  color: var(--text-primary);
  font-size: 12px;
}

.hits {
  margin: 6px 0 0;
  padding: 4px;
  border: 1px solid var(--node-border);
  border-radius: 10px;
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  list-style: none;
}

.hits li {
  padding: 5px 8px;
  border-radius: 6px;
  color: var(--text-primary);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  cursor: pointer;
}

.hits li:hover {
  background: var(--node-header);
}

.empty {
  color: var(--text-muted);
  cursor: default;
}
</style>
```

- [x] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/components/canvas/__tests__/NodeSearch.test.ts`
Expected: PASS，5 条全绿。

- [x] **Step 5: 写可见性裁剪的失败测试**

在 `src/components/canvas/__tests__/ProtoCanvas.test.ts` 的 `describe` 内追加：

```ts
  it('默认不开启可见性裁剪', () => {
    const w = mountCanvas()
    expect(w.findComponent({ name: 'VueFlow' }).props('onlyRenderVisibleElements')).toBe(false)
  })

  it('即使允许裁剪，也要等节点初始化完成后才真正开启', async () => {
    // 提前开启会与节点测量形成死结：尺寸测不出来，视口操作全部静默失效
    const w = mountCanvas({ enableVisibilityCulling: true })
    expect(w.findComponent({ name: 'VueFlow' }).props('onlyRenderVisibleElements')).toBe(false)

    w.vm.onNodesReady()
    await w.vm.$nextTick()
    expect(w.findComponent({ name: 'VueFlow' }).props('onlyRenderVisibleElements')).toBe(true)
  })
```

同时把 `mountCanvas` 注入的假实例补上 `onNodesInitialized`（Vue Flow 的真实 store 带有此回调注册函数）：

```ts
const fitBounds = vi.fn()
const onNodesInitialized = vi.fn()
// mountCanvas 内：
wrapper.vm.onPaneReady({ fitBounds, onNodesInitialized } as never)
```

- [x] **Step 6: 运行测试，确认失败**

Run: `pnpm test --run src/components/canvas/__tests__/ProtoCanvas.test.ts`
Expected: FAIL，`enableVisibilityCulling` 与 `onNodesReady` 尚不存在。

- [x] **Step 7: 实现延迟开启**

在 `src/components/canvas/ProtoCanvas.vue` 中：

props 追加（保持既有默认值不变）：

```ts
const props = withDefaults(defineProps<{
  graph: GraphState
  dimmedNodes?: string[]
  highlightedNodes?: string[]
  highlightedEdges?: string[]
  flowingEdges?: string[]
  enableVisibilityCulling?: boolean
}>(), {
  dimmedNodes: () => [],
  highlightedNodes: () => [],
  highlightedEdges: () => [],
  flowingEdges: () => [],
  enableVisibilityCulling: false,
})
```

在 `flow` 定义之后追加：

```ts
/*
 * 可见性裁剪只能在节点测量完成之后开启。
 * 提前开启会形成死结：它要靠节点尺寸判断可见性，而尺寸尚未测出，
 * 节点会一直停在 0×0 未初始化，导致自动适配、聚焦、重置布局全部静默失效。
 */
const nodesReady = ref(false)
const cullingActive = computed(() => props.enableVisibilityCulling && nodesReady.value)

function onNodesReady() {
  nodesReady.value = true
}
```

修改 `onPaneReady`，注册节点初始化回调：

```ts
function onPaneReady(instance: VueFlowStore) {
  flow.value = instance
  instance.onNodesInitialized?.(() => onNodesReady())
  nextTick(() => fitAll())
}
```

模板中把写死的 `false` 换成计算值，并删掉原先那段"必须保持关闭"的注释（约束已由上面的代码与测试表达）：

```vue
      :only-render-visible-elements="cullingActive"
```

`defineExpose` 追加 `onNodesReady`：

```ts
defineExpose({ nodes, edges, targetNodes, resetLayout, focusNode, markDragged, fitAll, onPaneReady, onNodesReady })
```

- [x] **Step 8: 运行测试，确认通过**

Run: `pnpm test --run src/components/canvas`
Expected: PASS。

- [x] **Step 9: 接进播放页**

在 `src/pages/s/[id].vue` 中引入搜索组件，并只对节点多的场景开启裁剪与搜索：

```ts
import NodeSearch from '~/components/canvas/NodeSearch.vue'

/** 节点多到需要检索时才出现搜索框，小场景不必被它占位 */
const isLargeScene = computed(() => player.graph.value.nodes.length >= 12)
const searchableNodes = computed(() =>
  player.graph.value.nodes.map(n => ({ id: n.id, label: n.label })))
```

模板中在画布区域内追加：

```vue
      <NodeSearch
        v-if="isLargeScene"
        :nodes="searchableNodes"
        @pick="onFocusRef"
      />
```

并给 `ProtoCanvas` 传入：

```vue
        :enable-visibility-culling="isLargeScene"
```

- [x] **Step 10: 浏览器实测（关键）**

```bash
pnpm build && pnpm preview
```

打开 `#/s/d2`，在控制台执行下面这段，确认裁剪开启后节点尺寸**仍然测得出来**：

```js
const st = document.querySelector('.canvas-wrap').__vueParentComponent?.setupState
// 生产构建下读不到内部状态时，改用 pnpm dev 复测
const flow = st?.flow?.value
console.log('节点尺寸：', flow?.findNode('Array')?.dimensions)
console.log('视口：', getComputedStyle(document.querySelector('.vue-flow__transformationpane')).transform)
```

Expected：尺寸为非零值，视口 transform 不是 `matrix(1, 0, 0, 1, 0, 0)`。
若尺寸仍是 0×0，**立即把 `isLargeScene` 传给 `enable-visibility-culling` 的那一行改回 `false`**，在提交信息中记录实测结论，并把性能观察留到 Task 14。

- [x] **Step 11: 提交**

```bash
git add src/components src/pages
git commit -m "feat(canvas): 全景图支持节点搜索，并在节点测量完成后才开启可见性裁剪"
```

---

## Task 12: d3 原型污染传播

**Files:**
- Create: `src/scenes/d3-pollution.ts`、`src/scenes/__tests__/d3-pollution.test.ts`
- Modify: `src/scenes/index.ts`

**Interfaces:**
- Consumes: Task 1 的辅助
- Produces: `d3Pollution: Scene`

- [x] **Step 1: 写失败的测试**

写入 `src/scenes/__tests__/d3-pollution.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { replay, resolveLookup } from '~/core'
import { d3Pollution } from '../d3-pollution'
import { expectSceneIntegrity } from './helpers'

describe('场景 d3：原型污染', () => {
  it('通过通用完整性检查', () => {
    expectSceneIntegrity(d3Pollution)
  })

  it('污染前，几个对象都查不到那个属性', () => {
    const g = replay(d3Pollution, 0)
    for (const id of ['userConfig', 'emptyObj', 'arr'])
      expect(resolveLookup(g, id, 'isAdmin').found).toBe(false)
  })

  it('污染只写了一个地方：Object.prototype', () => {
    const step = d3Pollution.steps.findIndex(s => s.title.includes('污染')) + 1
    const g = replay(d3Pollution, step)
    expect(g.nodes.find(n => n.id === 'Object.prototype')!.props.some(p => p.key === 'isAdmin')).toBe(true)
    // 三个对象自身都没有被直接修改过
    for (const id of ['userConfig', 'emptyObj', 'arr'])
      expect(g.nodes.find(n => n.id === id)!.props.some(p => p.key === 'isAdmin')).toBe(false)
  })

  it('但三个对象同时都「感染」了，因为链都通向那里', () => {
    const step = d3Pollution.steps.findIndex(s => s.title.includes('污染')) + 1
    const g = replay(d3Pollution, step)
    for (const id of ['userConfig', 'emptyObj', 'arr']) {
      const r = resolveLookup(g, id, 'isAdmin')
      expect(r.found, `${id} 应当被污染波及`).toBe(true)
      expect(r.hitNodeId).toBe('Object.prototype')
    }
  })

  it('用 Object.create(null) 造的对象免疫，因为它根本没有链', () => {
    const final = replay(d3Pollution, d3Pollution.steps.length)
    expect(resolveLookup(final, 'safeDict', 'isAdmin').found).toBe(false)
  })
})
```

- [x] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/d3-pollution.test.ts`
Expected: FAIL，找不到模块。

- [x] **Step 3: 写场景数据**

写入 `src/scenes/d3-pollution.ts`：

```ts
import type { Scene } from '~/core'

export const d3Pollution: Scene = {
  id: 'd3',
  title: '改一个地方，全世界都变了',
  code: [
    'const userConfig = { theme: \'dark\' }',
    'const emptyObj = {}',
    'const arr = []',
    '',
    'userConfig.isAdmin    // undefined',
    '',
    'Object.prototype.isAdmin = true   // 只写了这一行',
    '',
    'userConfig.isAdmin    // true',
    'emptyObj.isAdmin      // true',
    'arr.isAdmin           // true',
    '',
    'const safeDict = Object.create(null)',
    'safeDict.isAdmin      // undefined，它没有原型链',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'userConfig',
        label: 'userConfig',
        kind: 'plain',
        props: [
          { key: 'theme', value: '\'dark\'', kind: 'data' },
          { key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' },
        ],
      },
      {
        id: 'emptyObj',
        label: 'emptyObj',
        kind: 'plain',
        props: [{ key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' }],
      },
      {
        id: 'arr',
        label: '[]',
        kind: 'instance',
        props: [{ key: '[[Prototype]]', value: 'Array.prototype', kind: 'internal', refTo: 'Array.prototype' }],
      },
      {
        id: 'Array.prototype',
        label: 'Array.prototype',
        kind: 'prototype',
        meta: { builtin: true },
        props: [
          { key: 'map', value: 'ƒ', kind: 'data' },
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
      { id: 'e-user-obj', source: 'userConfig', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-empty-obj', source: 'emptyObj', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-arr-arrproto', source: 'arr', target: 'Array.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-arrproto-obj', source: 'Array.prototype', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
    ],
  },

  steps: [
    {
      title: '三个毫不相干的对象',
      narration: '一个配置对象、一个空对象、一个数组。它们彼此没有任何关系，但请注意：三条链最后都通向同一格 Object.prototype。',
      codeRange: [1, 5],
      patch: [],
      focus: {
        nodes: ['userConfig', 'emptyObj', 'arr', 'Object.prototype'],
        edges: ['e-user-obj', 'e-empty-obj', 'e-arr-arrproto', 'e-arrproto-obj'],
      },
    },
    {
      title: '往共同的祖先上写一个属性，就是污染',
      narration: '只执行了一行 Object.prototype.isAdmin = true。图上也只有一格发生了变化——但接下来你会看到这一格的影响有多大。',
      codeRange: [7, 7],
      patch: [{
        op: 'addProp',
        nodeId: 'Object.prototype',
        prop: { key: 'isAdmin', value: 'true', kind: 'data' },
      }],
      focus: { nodes: ['Object.prototype'], edges: [] },
    },
    {
      title: '三个对象同时「感染」',
      narration: '没有人改过这三个对象，但它们现在都能读到 isAdmin——因为查找会沿链上溯，而链的尽头正是被写入的那一格。如果某段权限判断写的是 if (config.isAdmin)，这里就是一个真实的漏洞。',
      codeRange: [9, 11],
      patch: [],
      focus: {
        nodes: ['userConfig', 'emptyObj', 'arr', 'Array.prototype', 'Object.prototype'],
        edges: ['e-user-obj', 'e-empty-obj', 'e-arr-arrproto', 'e-arrproto-obj'],
      },
      traverse: ['e-user-obj', 'e-empty-obj', 'e-arr-arrproto', 'e-arrproto-obj'],
    },
    {
      title: '没有链的对象免疫',
      narration: 'Object.create(null) 造出的对象压根没有 [[Prototype]]，查找无处可去，自然读不到被注入的属性。这就是把它当作安全字典的理由。',
      codeRange: [13, 14],
      patch: [{
        op: 'addNode',
        node: {
          id: 'safeDict',
          label: 'safeDict',
          kind: 'plain',
          props: [{ key: '[[Prototype]]', value: 'null', kind: 'internal' }],
        },
      }],
      focus: { nodes: ['safeDict'], edges: [] },
    },
  ],
}
```

- [x] **Step 4: 注册并运行测试**

在 `src/scenes/index.ts` 中 import `d3Pollution` 并加入 `scenes`。

Run: `pnpm test --run src/scenes`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/scenes
git commit -m "feat(scenes): 新增原型污染场景，演示一次写入波及全部对象"
```

---

## Task 13: 场景列表页按组展示

**Files:**
- Modify: `src/scenes/index.ts`、`src/pages/index.vue`
- Test: `src/scenes/__tests__/registry.test.ts`（新建）

**Interfaces:**
- Consumes: 全部 13 个场景
- Produces:
  - `SceneGroup = { id: 'A' | 'B' | 'C' | 'D', title: string, subtitle: string, scenes: Scene[] }`
  - `sceneGroups: SceneGroup[]`

- [x] **Step 1: 写失败的测试**

写入 `src/scenes/__tests__/registry.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { getScene, sceneGroups, scenes } from '../index'

describe('场景注册表', () => {
  it('一期共 13 个场景', () => {
    expect(scenes).toHaveLength(13)
  })

  it('场景 id 唯一', () => {
    expect(new Set(scenes.map(s => s.id)).size).toBe(scenes.length)
  })

  it('覆盖 spec 约定的全部场景 id', () => {
    const expected = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'd1', 'd2', 'd3']
    expect(scenes.map(s => s.id).sort()).toEqual(expected)
  })

  it('分成 A/B/C/D 四组', () => {
    expect(sceneGroups.map(g => g.id)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('每个场景都恰好属于一个分组', () => {
    const grouped = sceneGroups.flatMap(g => g.scenes)
    expect(grouped).toHaveLength(scenes.length)
    expect(new Set(grouped.map(s => s.id)).size).toBe(scenes.length)
  })

  it('分组按 id 前缀归类', () => {
    for (const group of sceneGroups) {
      for (const scene of group.scenes)
        expect(scene.id.startsWith(group.id.toLowerCase())).toBe(true)
    }
  })

  it('每组都有标题与一句话说明', () => {
    for (const g of sceneGroups) {
      expect(g.title.length).toBeGreaterThan(0)
      expect(g.subtitle.length).toBeGreaterThan(0)
    }
  })

  it('getScene 能按 id 取到场景，取不到时返回 undefined', () => {
    expect(getScene('c2')?.id).toBe('c2')
    expect(getScene('不存在')).toBeUndefined()
  })
})
```

- [x] **Step 2: 运行测试，确认失败**

Run: `pnpm test --run src/scenes/__tests__/registry.test.ts`
Expected: FAIL，`sceneGroups` 尚未导出。

- [x] **Step 3: 实现注册表分组**

改写 `src/scenes/index.ts`：

```ts
import type { Scene } from '~/core'
import { a1Literal } from './a1-literal'
import { a2New } from './a2-new'
import { a3PrototypeVsProto } from './a3-prototype-vs-proto'
import { b1Lookup } from './b1-lookup'
import { b2ChainEnd } from './b2-chain-end'
import { b3Shadowing } from './b3-shadowing'
import { b4ObjectCreate } from './b4-object-create'
import { c1ClassDesugar } from './c1-class-desugar'
import { c2Extends } from './c2-extends'
import { c3Instanceof } from './c3-instanceof'
import { d1ChickenEgg } from './d1-chicken-egg'
import { d2Builtins } from './d2-builtins'
import { d3Pollution } from './d3-pollution'

export const scenes: Scene[] = [
  a1Literal,
  a2New,
  a3PrototypeVsProto,
  b1Lookup,
  b2ChainEnd,
  b3Shadowing,
  b4ObjectCreate,
  c1ClassDesugar,
  c2Extends,
  c3Instanceof,
  d1ChickenEgg,
  d2Builtins,
  d3Pollution,
]

export interface SceneGroup {
  id: 'A' | 'B' | 'C' | 'D'
  title: string
  subtitle: string
  scenes: Scene[]
}

const GROUP_META: Array<Pick<SceneGroup, 'id' | 'title' | 'subtitle'>> = [
  { id: 'A', title: '基石', subtitle: '对象从哪来，那条线是谁连的' },
  { id: 'B', title: '查找与继承', subtitle: '读一个属性时，引擎到底走了哪几步' },
  { id: 'C', title: '语法糖', subtitle: 'class 与 extends 背后还是同一套链' },
  { id: 'D', title: '全景与陷阱', subtitle: '把整张地图铺开，以及它带来的风险' },
]

export const sceneGroups: SceneGroup[] = GROUP_META.map(meta => ({
  ...meta,
  scenes: scenes.filter(s => s.id.startsWith(meta.id.toLowerCase())),
}))

export function getScene(id: string): Scene | undefined {
  return scenes.find(s => s.id === id)
}
```

- [x] **Step 4: 运行测试，确认通过**

Run: `pnpm test --run src/scenes/__tests__/registry.test.ts`
Expected: PASS，8 条全绿。

- [x] **Step 5: 改写列表页**

写入 `src/pages/index.vue`：

```vue
<script setup lang="ts">
import { sceneGroups } from '~/scenes'
</script>

<template>
  <div class="home">
    <header>
      <h1>JavaScript 原型链可视化</h1>
      <p class="sub">
        每个场景都是一段可以逐步播放的图：左边是代码，右边是那一刻真实的对象关系。
      </p>
    </header>

    <section v-for="group in sceneGroups" :key="group.id" class="group">
      <h2>
        <span class="badge">{{ group.id }}</span>
        {{ group.title }}
        <small>{{ group.subtitle }}</small>
      </h2>
      <ul>
        <li v-for="s in group.scenes" :key="s.id">
          <RouterLink :to="`/s/${s.id}`">
            <span class="sid">{{ s.id }}</span>
            {{ s.title }}
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.home {
  max-width: 760px;
  height: 100%;
  padding: 56px 24px 80px;
  margin: 0 auto;
  overflow-y: auto;
  color: var(--text-primary);
}

h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.sub {
  margin: 0 0 40px;
  color: var(--text-muted);
  line-height: 1.7;
}

.group {
  margin-bottom: 34px;
}

h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
  font-size: 16px;
}

h2 small {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
}

.badge {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--node-border);
  border-radius: 7px;
  background: var(--node-header);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
}

ul {
  padding: 0;
  margin: 0;
  list-style: none;
}

li {
  margin: 4px 0;
}

a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--text-primary);
  text-decoration: none;
}

a:hover {
  border-color: var(--node-border);
  background: var(--node-surface);
}

.sid {
  color: var(--edge-prototype);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
}
</style>
```

- [x] **Step 6: 全量验证并提交**

```bash
pnpm test --run
pnpm lint
pnpm build
git add src/scenes src/pages
git commit -m "feat(scenes): 场景列表按 A/B/C/D 分组展示"
```

---

## Task 14: 双主题走查与一期验收

**Files:**
- Create: `docs/superpowers/checklists/2026-09-11-一期走查.md`
- Modify: 走查中发现问题的相应文件

**Interfaces:**
- Consumes: 全部 13 个场景与既有组件
- Produces: 一份填好结论的走查记录

- [x] **Step 1: 建立走查清单**

写入 `docs/superpowers/checklists/2026-09-11-一期走查.md`：

```markdown
# 一期走查记录

环境：`pnpm build && pnpm preview`，Chrome 最新版，1440×900。
每个场景在 aurora 与 neon 两个主题下各走一遍，逐步播放到最后一步。

## 逐场景检查项

| 场景 | 构图不重叠 | 连线不穿节点 | 文案无错别字 | 讲解与图一致 | aurora | neon | 备注 |
|---|---|---|---|---|---|---|---|
| a1 一个 {} 也有原型 | | | | | | | |
| a2 new 到底做了什么 | | | | | | | |
| a3 prototype vs __proto__ | | | | | | | |
| b1 属性查找逐跳 | | | | | | | |
| b2 链走到头 | | | | | | | |
| b3 屏蔽 | | | | | | | |
| b4 Object.create | | | | | | | |
| c1 class 展开 | | | | | | | |
| c2 extends 双链 | | | | | | | |
| c3 instanceof | | | | | | | |
| d1 鸡生蛋的环 | | | | | | | |
| d2 内置对象全景 | | | | | | | |
| d3 原型污染 | | | | | | | |

## 全局检查项

- [x] 列表页四组齐全，13 个链接全部可达
- [x] 深链 `?step=&theme=` 在每组各抽一个场景验证
- [ ] 导出 PNG 在 d2（最大的图）上仍能完成，且导出后主题正确还原
- [x] d2 的搜索能定位到 `Array.prototype` 并聚焦
- [x] d2 播放时帧率主观流畅（若卡顿，记录是否已开启可见性裁剪）
- [x] 切换主题后无任何元素颜色不跟随
- [x] 窄窗口（1024 宽）下浮层不遮挡图的主体

## 结论

（走查完成后填写：发现的问题、已修复项、遗留项）
```

- [x] **Step 2: 静态检查硬编码色值**

```bash
grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(' src/components src/pages src/App.vue --include='*.vue'
```
Expected: 无输出。若有输出，说明新增组件里混入了硬编码颜色，必须改为 token。

- [x] **Step 3: 逐场景走查并填表**

```bash
pnpm build && pnpm preview
```
按清单逐项走查，把结论填进表格。**发现问题就地修复并单独提交**，不要攒到最后。

- [x] **Step 4: 全量验证**

```bash
pnpm test --run
pnpm lint
pnpm build
```
Expected: 三条命令退出码均为 0。

- [x] **Step 5: 提交走查记录**

```bash
git add docs/superpowers/checklists
git commit -m "docs: 记录一期双主题走查结论"
```

---

## 完成标准（计划二验收清单）

- [x] `pnpm test --run` 全绿，13 个场景各自有内容正确性断言
- [x] `pnpm lint` 与 `pnpm build` 退出码均为 0
- [x] 列表页四组齐全，13 个场景全部可达
- [x] 每个场景在两个主题下都已走查并记录结论
- [x] d2 全景图可搜索、可折叠，播放流畅
- [x] 组件与页面中零硬编码色值
- [x] 走查记录已填写并提交

## 风险

| 风险 | 影响 | 对策 |
|---|---|---|
| 可见性裁剪仍与节点测量冲突（Task 11） | 全景图性能优化落空 | 保持关闭即可，30+ 节点通常仍流畅；在走查中记录实际观感，不要为此阻塞交付 |
| d1、d2 的连线在实际布局下打结 | 最具冲击力的两帧反而看不清 | 同层节点按数组顺序横向排开，调整 `initial.nodes` 顺序即可改变构图，无需改算法 |
| 场景文案里的 JS 语义写错 | 教学站最致命的失败 | 每个场景都有内容正确性断言；`traverse` 必须等于 `resolveLookup` 的求解结果 |
| 13 个场景的讲解风格漂移 | 读感割裂 | 统一句式：先说现象、再说机制、最后点出易错处；走查时逐场景对照 |

## 下一步

计划二完成后，一期即告完整。二期（代码沙盒）与三期（动手搭建练习）各自独立立项，届时再按 brainstorming → writing-plans 的流程走一遍。
