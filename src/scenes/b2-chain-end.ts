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
