# JS 原型链可视化站点 · 设计文档

- 日期：2026-09-10
- 项目名：`todo-prototype`（沿用目录名；将来公开时可改 `package.json` 的 name 与仓库名，不阻塞开发）
- 状态：设计已确认，待实现计划（writing-plans）

---

## 1. 核心价值主张

让使用者在学习 JavaScript 原型链时，**既觉得惊艳，又感叹"这么抽象的知识竟然可以这么简单地学会"**。

这句话是本项目所有取舍的最终裁判：

- 当"炫酷"与"看得懂"冲突时，**看得懂优先**——但不是放弃炫酷，而是把炫酷压缩到关键瞬间（见 §6 动效原则）。
- 当"功能多"与"逻辑清晰"冲突时，**清晰优先**，功能顺延到后续期次。

## 2. 竞品调研结论

| 站点 | 形态 | 缺口 |
|---|---|---|
| [Object Playground](http://www.objectplayground.com/) | 输入代码 → 真实运行 → 自动画对象图，节点可拖拽 | 2013 年的视觉与技术栈，无动画、无移动端、无分享导出 |
| [VisualizeJS](https://visualizejs.com/javascript) | 17 个 JS 概念的预设分步动画 | 不支持自定义代码；原型链只是其中一小节，深度不足 |
| [ProtoTree](https://weizmangal.com/ProtoTree/) | 真实运行时原型链渲染成可折叠树 | 只有树没有图，面向安全研究者而非教学 |
| [jsinheritance](https://github.com/rus0000/jsinheritance) | 静态 PNG 图解 + 文档 | 无交互 |
| [Molly's JS Object Hierarchy](http://www.mollypages.org/tutorials/js.mp) | 内置对象层次全景 | 年代久远，交互与视觉都很弱 |

**结论：全网不存在"高颜值 + 可交互 + 支持自定义代码"三者兼备的原型链站点，中文领域更是完全空白（现有中文资源全是静态图文）。** 这是本项目的立项依据。

交互范式参考：[JS Visualizer 9000](https://www.jsv9000.app/)（代码 ↔ 图联动）、[Python Tutor](https://pythontutor.com/javascript.html)（步进执行）、[Loupe](http://latentflip.com/loupe/)（流向动画气质）。视觉语言参考：[Lydia Hallie 的 JavaScript Visualized 系列](https://dev.to/lydiahallie/javascript-visualized-prototypal-inheritance-47co)。

## 3. 目标用户与使用场景

**第一优先用户：站点作者本人**，用于博文输出。典型动线：写一篇讲 `extends` 双链的文章 → 外链到本站对应场景的对应步骤 → 读者点进来自己拖着看 → 作者顺手导出一张亮色主题的图当配图。

由此确定：

- **纯中文**，不做 i18n。
- **分享链接与导图能力是一等公民**，不是附属功能。
- 场景**宁精勿多**：13 个打磨到位的场景，胜过 40 个草草了事的。

## 4. 产品形态

### 4.1 布局：全屏画布 + 可折叠浮层

图占满整个视口，代码面板与步骤讲解面板以玻璃拟态浮层叠加其上，**均可折叠为一枚小胶囊**。理由：图示是本站的主体，D 组全景场景需要最大舞台；且全屏画布的截图效果最好。

代价与对策：代码与图的对应关系不如左右分屏直白 → 用"当前行高亮 + 图上对应元素同步点亮"补偿。

### 4.2 主题

| 主题 | 用途 | 说明 |
|---|---|---|
| `aurora`（极光玻璃） | **默认** | 深色底 + 弥散极光光斑 + 半透明磨砂节点 + 渐变流光连线。耐看，节点密集时依然清晰 |
| `neon`（深空霓虹） | 可切换 | 黑底点阵 + 荧光描边 + 辉光连线。冲击力最强 |
| `paper`（蓝图亮色） | **仅用于导出，不进切换器** | 浅色网格 + 白卡片 + 实线，无任何滤镜。为白底博客配图而设计 |

三条硬约束（决定后期是否返工）：

1. **第一天起全部颜色走 design token**（CSS 变量 + `data-theme`），UnoCSS theme 由同一份 token 生成，组件内**禁止硬编码任何色值**。
2. **辉光用 CSS `filter: drop-shadow(0 0 var(--glow-size) var(--glow-color))`，不用 SVG `<filter>`**。原因：SVG filter 的 `stdDeviation` 不是 CSS 属性、无法被变量驱动，换主题就得换整棵 filter 节点。
3. **`backdrop-filter` 只用于浮层，绝不用于节点**。D2 全景场景节点数 30+，逐节点背景模糊在中端设备上必然掉帧；节点的玻璃质感用"半透明填充 + 1px 亮边"实现，零模糊开销。

主题数量锁定为 2 个（+1 个导出主题）。每增加一个主题，都要在全部 13 个场景的所有步骤上重新目测可读性，验证成本是乘法关系。

## 5. 核心数据模型

**架构总纲：所有模式（场景播放 / 代码沙盒 / 练习）都只做一件事——生产或消费同一个 `GraphState`。画布层只认 `GraphState`，不认场景、不认代码、不认练习。**

```ts
/** 图中的一个节点，对应 JS 世界里的一个「值」 */
interface ProtoNode {
  id: string // 稳定 id，如 'Person' | 'Person.prototype' | 'p1'
  label: string // 显示名
  kind: 'function' | 'plain' | 'prototype' | 'instance' | 'null'
  props: PropRow[] // 节点内显示的属性行
  meta?: {
    builtin?: boolean // 是否内置对象（用于「隐藏标准对象」开关）
    collapsed?: boolean // 属性行是否折叠
  }
  // 注意：此处刻意没有 position —— 坐标是布局算法的产出，不属于数据模型
}

/** 节点内的一行属性 */
interface PropRow {
  key: string
  value: string // 用于显示的值文本
  kind: 'data' | 'accessor' | 'internal' // internal 表示 [[Prototype]] 这类内部槽
  refTo?: string // 指向另一个节点的 id；有此字段的行即为一条边的锚点
}

/** 边的三种语义，颜色永不混用 */
type EdgeKind = 'prototype' | 'proto' | 'constructor'

interface ProtoEdge {
  id: string
  source: string
  target: string
  kind: EdgeKind
  sourceHandle?: string // 从哪一行属性出发（连线精确到行，而非节点中心）
}

interface GraphState {
  nodes: ProtoNode[]
  edges: ProtoEdge[]
}
```

### 5.1 场景 = 初始图 + 一串 patch

```ts
interface Step {
  title: string
  narration: string // 讲解正文
  codeRange?: [number, number] // 需高亮的代码行区间
  patch: GraphPatch[] // 本步对图施加的增量修改
  focus?: { nodes: string[], edges: string[] } // 点亮谁、淡化谁
  traverse?: string[] // 沿这些边逐跳流光（属性查找演示）
}

interface Scene {
  id: string
  title: string
  code: string
  initial: GraphState
  steps: Step[]
}
```

patch 的操作集合（刻意保持最小，只覆盖场景演进真正需要的动作）：

```ts
type GraphPatch =
  | { op: 'addNode', node: ProtoNode }
  | { op: 'removeNode', id: string }
  | { op: 'updateNode', id: string, patch: Partial<Pick<ProtoNode, 'label' | 'kind' | 'meta'>> }
  | { op: 'addEdge', edge: ProtoEdge }
  | { op: 'removeEdge', id: string }
  | { op: 'addProp', nodeId: string, prop: PropRow }
  | { op: 'updateProp', nodeId: string, key: string, patch: Partial<PropRow> }
  | { op: 'removeProp', nodeId: string, key: string }
```

`applyPatch(graph, patch)` 必须是**不可变实现**（返回新对象，不修改入参），否则重放会污染 `initial`，后退功能会静默出错。这一条要有专门的单元测试守住。

**第 n 步的图 = `steps.slice(0, n).reduce(applyPatch, initial)`。** 采用"纯函数重放"而非"逐步快照"，带来三个决定性好处：

1. 后退无需实现逆操作，重放到 n-1 即可；
2. 分享链接只需携带 `scene` + `step`；
3. `replay()` 是纯函数，**场景内容本身可被 Vitest 断言覆盖**（见 §9）。

### 5.2 布局是独立纯函数

`layout(graph): Map<nodeId, {x, y}>`，规则为「列 = 原型链深度，行 = 同层分支」。

**不使用 Vue Flow 的自动布局，也不使用力导向。** 原型链的图具有严格语义，节点的相对位置本身就是教学信息的一部分，不能交给物理引擎随机决定。布局作为纯函数同样可单测。

### 5.3 三个适配器，同一个出口

| 期次 | 适配器 | 职责 |
|---|---|---|
| 一期 | `sceneAdapter` | 场景 DSL → `GraphState` |
| 二期 | `runtimeAdapter` | 真实运行时对象 → `GraphState`（`getPrototypeOf` 遍历 + 环检测 + 内置对象裁剪） |
| 三期 | `exerciseAdapter` | 用户编辑的图 ↔ 目标图 diff 校验 |

画布层对这三者一无所知。这就是"架构一次到位、功能分三期"的具体含义。

## 6. 画布与交互

### 6.1 Vue Flow 的用法边界

| 使用 | 不使用 |
|---|---|
| 拖拽、缩放平移、选中、视口控制 | 自动布局（改用自研 `layout()`） |
| 自定义 Node / Edge 组件 | 默认节点与边样式（全部自绘） |
| Handle + `onConnect`（三期练习模式的连线校验） | 内置 MiniMap（一期不上） |
| `onlyRenderVisibleElements`（D2 全景场景必开） | 内置 Controls 组件（自绘以统一主题） |

### 6.2 节点组件

标题行（`ƒ Person` / `Person.prototype` / `p1`）+ 属性行列表。

**每一行属性都是一个 Vue Flow Handle** —— `prototype ●` 那一行右侧长出的连线，从这一行精确出发，而不是从节点中心飘出。这是"看得懂"与"看着像"的分界线。标题行可点击折叠属性列表（D2 全景场景必需）。

### 6.3 边

三种语义永不混色：`prototype`（函数 → 原型）、`proto`（`[[Prototype]]`，主角）、`constructor`（原型 → 函数，默认淡化，可开关）。

### 6.4 动效原则

**流光只在 `traverse` 播放时开启，静止时为实线。** 全屏持续爬行的虚线会让人看久了眩晕，也会稀释关键时刻的注意力。辉光同理：平时节点柔和，只有被点亮的那条查找路径才亮起霓虹辉光——这是"既惊艳又清晰"这对矛盾的具体解法。

### 6.5 四个交互

1. hover 任意节点 → **它到 `null` 的整条原型链点亮**，其余元素淡化至 `--focus-dim`（"自己摸索出来"的核心交互）
2. 点击引用型属性行 → 聚焦到目标节点
3. 自由拖拽 + 工具栏「重置布局」回到 `layout()` 结果
4. 键盘：`←` / `→` 步进，`空格` 播放/暂停

## 7. 一期场景清单（13 个）

### A 基石

| id | 标题 | 教学目标 |
|---|---|---|
| `a1` | 对象字面量的隐式原型 | `const o = {}` 也有原型；`o.__proto__ === Object.prototype`，再往上是 `null` |
| `a2` | `new` 到底做了什么 | 四步：创建空对象 → 接链到构造函数的 `prototype` → 绑定 `this` 执行 → 返回值规则 |
| `a3` | `prototype` vs `__proto__` 正面对决 | 同一张图上同时点亮两者，讲清"一个是函数身上的普通属性，一个是实例的内部槽，但指向同一个对象" |

### B 查找与继承

| id | 标题 | 教学目标 |
|---|---|---|
| `b1` | 属性查找逐跳 | `p1.say()` 沿链流光，命中即停 |
| `b2` | 找不到会怎样 | 返回 `undefined`；链终点 `Object.prototype.__proto__ === null` |
| `b3` | 屏蔽（shadowing） | **写操作不上溯**：实例上赋同名属性只会遮住原型上的，不会修改原型（最高频误解） |
| `b4` | `Object.create` | 手动接链；含 `Object.create(null)` 的无原型对象 |

### C 语法糖

| id | 标题 | 教学目标 |
|---|---|---|
| `c1` | `class` 展开成 ES5 | class 只是构造函数 + `prototype` 上的方法 |
| `c2` | `extends` 的双链 | 实例链 + **静态链**（`Child.__proto__ === Parent`），全网讲解最薄弱的点 |
| `c3` | `instanceof` 原理 | 取右操作数的 `prototype`，在左操作数的链上逐跳比对 |

### D 全景与陷阱

| id | 标题 | 教学目标 |
|---|---|---|
| `d1` | 鸡生蛋的环 | `Function.__proto__ === Function.prototype`、`Object.__proto__ === Function.prototype`、`Function.prototype.__proto__ === Object.prototype` —— 全站最具视觉冲击的一帧 |
| `d2` | 内置对象全景图 | `Array` / `Date` / `RegExp` / `Error` 等的链，可折叠、可搜索 |
| `d3` | 原型污染 | 往 `Object.prototype` 写一个属性，全图对象同时"感染"的传播动画 |

## 8. 分享与导出

### 8.1 分享

URL 深链：`/#/s/:sceneId?step=:n&theme=:theme`，例如 `/#/s/c2?step=4&theme=neon`。

**无后端，纯静态。** 二期沙盒的用户代码采用 LZ 压缩写入 hash（TS Playground 的做法），依然不需要服务端。

### 8.2 导出

导出时**用 `paper` 亮色主题离屏重新渲染一次再截图**，而不是截取当前的玻璃/辉光画面。原因：`html-to-image` 对 `backdrop-filter` 与 `drop-shadow` 的还原本就不可靠，与其与之搏斗，不如导出一张本来就为白底博客设计的图。

- 格式：PNG，2x DPR
- 范围：当前步 / 整个场景的关键帧序列
- 可选极简水印（站点域名），可关闭

**一期不做 GIF。** 理由：GIF 编码（gif.js / ffmpeg.wasm）产物体积达数 MB、编码耗时数秒，且色深会毁掉渐变，投入产出比很差；博文实际需要的是一两张定格图。确需动图时，二期评估录屏方案，优于自研编码。

## 9. 测试策略

采用 TDD：`core/` 的全部纯函数先写测试后写实现。

**最关键的一条：场景数据本身必须有断言覆盖。**

```ts
it('c2: extends 之后，静态链必须存在', () => {
  const g = replay(sceneC2, 4)
  // Child.__proto__ === Parent
  expect(edge(g, 'Child', 'Parent', 'proto')).toBeDefined()
  // Child.prototype.__proto__ === Parent.prototype
  expect(edge(g, 'Child.prototype', 'Parent.prototype', 'proto')).toBeDefined()
})
```

理由：一个原型链教学站点最致命的失败不是不好看，而是**讲错了**。把内容正确性变成自动化断言，是本项目最有价值的一条测试策略。

分层：

- `core/`（`patch` / `layout` / `traverse`）：Vitest 单元测试，覆盖率目标 100%
- `scenes/`：每个场景至少一条关键帧断言
- 组件层：`@vue/test-utils` 只测交互绑定（链路计算逻辑已在 `core/`，组件不重复测）
- 视觉：一期不上视觉回归 E2E（成本高），改为两个主题下的人工走查 checklist

## 10. 工程结构

```
src/
  core/          # 纯 TS，不 import 任何 Vue/DOM 代码，可在 node 中直接测试
    types.ts     # GraphState / Step / Scene
    patch.ts     # applyPatch / replay(scene, n)
    layout.ts    # 分层布局
    traverse.ts  # 查找路径求解，输出给流光动画
  adapters/
    scene/       # 一期
    runtime/     # 二期
    exercise/    # 三期
  scenes/        # 13 个场景 DSL，一个场景一个文件
  components/
    canvas/      # Vue Flow 封装、ProtoNode.vue、ProtoEdge.vue
    panels/      # CodePanel.vue（可折叠）、StepPanel.vue（可折叠）
    theme/
  composables/   # usePlayer / useTheme / useShareLink
  pages/         # vite-plugin-pages 自动路由
```

`core/` 与 UI 完全解耦是本结构的第一原则。

## 11. 技术栈与工具链

- Vue 3（`<script setup>`）+ Vite + TypeScript + UnoCSS + VueUse + 自动导入（对齐 [Vitesse](https://github.com/antfu/vitesse)）
- 画布：[`@vue-flow/core`](https://vueflow.dev/)（当前稳定版 1.48.2）
- 测试：Vitest + `@vue/test-utils`
- 包管理：pnpm
- 规范：`@antfu/eslint-config`，并同步配置 `.vscode/settings.json` 与 `.vscode/extensions.json`（照抄其 README 的 VS Code support 章节原文）
- 提交规范：`@huberyyang/todo-scripts` 的 `commitlint-init`，接入 commitlint（Conventional Commits）+ husky（`commit-msg` 跑 commitlint，`pre-commit` 跑 lint-staged；lint-staged 命令不带 `.`）
- 部署：静态托管（GitHub Pages 或 Vercel）

依赖版本策略：新增依赖取最新稳定版；已有依赖不主动升级。

## 12. 分期边界

| 期次 | 内容 |
|---|---|
| **一期** | 13 个场景 + 探索式高亮 + 双主题 + 分享深链 + PNG 导出 |
| **二期** | 代码沙盒：用户输入任意 JS → `runtimeAdapter` → 同一套 `GraphState` |
| **三期** | 动手搭建练习模式：用户自己拖节点、连 `[[Prototype]]` 线，系统 diff 校验 |

**一期明确不做**（YAGNI）：用户账号、任何后端、i18n、GIF 导出、E2E/视觉回归、移动端深度交互（手机降级为"可读、可缩放、只播放"；全屏拖拽画布在小屏上体验有限，硬做不划算）。

## 13. 风险与对策

| 风险 | 对策 |
|---|---|
| 主题后补导致大规模返工 | 第一天 token 化，组件禁止硬编码色值（§4.2 约束 1、2） |
| 节点多时掉帧 | `backdrop-filter` 仅用于浮层；开启 `onlyRenderVisibleElements`（§4.2 约束 3、§6.1） |
| `html-to-image` 还原滤镜失真 | 导出走 `paper` 无滤镜主题离屏重渲（§8.2） |
| **场景内容讲错**（最致命） | 场景数据纳入自动化断言（§9） |
| D1/D2 含环形与高密度结构，布局算法可能打结 | `layout()` 为独立纯函数，先用这两个最难场景写测试，再反推算法 |
| Vue Flow 1.x → 2.0（迁移到 `@xyflow/system`）的升级成本 | 画布交互集中封装在 `components/canvas/`，`core/` 与之零耦合，升级面被限制在一个目录内 |

## 14. 决策记录（本次头脑风暴的结论）

1. 定位：场景引擎为主 + 沙盒为辅，架构一次到位、交付分三期
2. 受众：优先服务作者本人的博文输出，纯中文，分享/导图为一等公民
3. 场景范围：A/B/C/D 四组全要，共 13 个
4. 布局：全屏画布 + 可折叠代码浮层
5. 视觉：`aurora` 默认 + `neon` 可切换 + `paper` 仅导出；辉光只用于查找路径的聚焦瞬间
6. 交互深度：播放 + 拖拽 + 探索式高亮，并为三期练习模式预留数据模型
7. 渲染层：Vue Flow（自研布局 + 自定义节点/边）
