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
