import type { ProtoNode, Scene } from '~/core'

/** 内置构造函数与它挂在原型上的代表方法 */
const BUILTINS: Array<{ name: string, methods: string[] }> = [
  { name: 'Array', methods: ['map', 'filter', 'push'] },
  { name: 'String', methods: ['slice', 'toUpperCase'] },
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
      narration: 'Array、String、Date、RegExp、Error、Map、Set……每一个都是构造函数，每一个都带着自己的 prototype 对象，方法就挂在那上面。节点默认是折叠的，点标题行可以展开看属性。',
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
