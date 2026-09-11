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
