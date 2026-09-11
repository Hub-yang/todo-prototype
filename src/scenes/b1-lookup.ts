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
      focus: {
        nodes: ['p1', 'Person.prototype', 'Object.prototype'],
        edges: ['e-p1-proto', 'e-proto-obj'],
      },
      traverse: ['e-p1-proto', 'e-proto-obj'],
    },
  ],
}
