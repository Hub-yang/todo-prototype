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
