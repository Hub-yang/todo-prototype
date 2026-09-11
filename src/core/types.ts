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
    /** 是否内置对象，用于「隐藏标准对象」开关 */
    builtin?: boolean
    /** 属性行是否折叠 */
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

export type GraphPatch
  = | { op: 'addNode', node: ProtoNode }
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
