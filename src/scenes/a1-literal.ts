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
