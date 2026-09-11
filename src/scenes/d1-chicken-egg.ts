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
