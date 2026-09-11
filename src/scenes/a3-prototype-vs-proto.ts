import type { Scene } from '~/core'

export const a3PrototypeVsProto: Scene = {
  id: 'a3',
  title: 'prototype 与 __proto__ 到底差在哪',
  code: [
    'function Person() {}',
    'const p = new Person()',
    '',
    'Person.prototype                      // 函数身上的一个普通属性',
    'Object.getPrototypeOf(p)              // 实例的内部槽',
    'Person.prototype === Object.getPrototypeOf(p)   // true，同一个对象',
    '',
    'Object.getPrototypeOf(Person)         // 函数自己的原型：Function.prototype',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'Person',
        label: 'Person',
        kind: 'function',
        props: [{ key: 'prototype', value: '⟐', kind: 'data', refTo: 'Person.prototype' }],
      },
      {
        id: 'Person.prototype',
        label: 'Person.prototype',
        kind: 'prototype',
        props: [
          { key: 'constructor', value: 'ƒ Person', kind: 'data', refTo: 'Person' },
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
      { id: 'e-fn-proto', source: 'Person', target: 'Person.prototype', kind: 'prototype', sourceHandle: 'prototype' },
      { id: 'e-proto-obj', source: 'Person.prototype', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
    ],
  },

  steps: [
    {
      title: 'prototype：函数身上的一个普通属性',
      narration: '只要声明一个函数，它就自动带上一个名为 prototype 的普通属性，指向一个对象。你可以打印它、改它，它跟函数的其它属性没什么不同。',
      codeRange: [1, 1],
      patch: [],
      focus: { nodes: ['Person', 'Person.prototype'], edges: ['e-fn-proto'] },
    },
    {
      title: '__proto__：实例身上的内部槽',
      narration: 'new 出来的实例带的是 [[Prototype]] 内部槽，它不是普通属性，而是引擎查找属性时真正会走的那条线。',
      codeRange: [2, 2],
      patch: [
        {
          op: 'addNode',
          node: {
            id: 'p',
            label: 'p',
            kind: 'instance',
            props: [{ key: '[[Prototype]]', value: 'Person.prototype', kind: 'internal', refTo: 'Person.prototype' }],
          },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-p-proto', source: 'p', target: 'Person.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['p', 'Person.prototype'], edges: ['e-p-proto'] },
      traverse: ['e-p-proto'],
    },
    {
      title: '两条线，指向同一个对象',
      narration: '同时看这两条线：一条从函数的 prototype 属性出发，一条从实例的内部槽出发，终点是同一个 Person.prototype。这就是二者的全部关系——名字像，角色完全不同，但指着同一处。',
      codeRange: [4, 6],
      patch: [],
      focus: { nodes: ['Person', 'p', 'Person.prototype'], edges: ['e-fn-proto', 'e-p-proto'] },
    },
    {
      title: '陷阱：函数自己也有原型',
      narration: 'Person 本身也是对象，所以它也有自己的 [[Prototype]]，指向 Function.prototype。注意这条线跟 Person.prototype 毫无关系——一个是「我的原型是谁」，一个是「我造出来的实例的原型是谁」。',
      codeRange: [8, 8],
      patch: [
        {
          op: 'addNode',
          node: {
            id: 'Function.prototype',
            label: 'Function.prototype',
            kind: 'prototype',
            meta: { builtin: true },
            props: [
              { key: 'call', value: 'ƒ', kind: 'data' },
              { key: 'apply', value: 'ƒ', kind: 'data' },
              { key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' },
            ],
          },
        },
        {
          op: 'addProp',
          nodeId: 'Person',
          prop: { key: '[[Prototype]]', value: 'Function.prototype', kind: 'internal', refTo: 'Function.prototype' },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-fn-funcproto', source: 'Person', target: 'Function.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-funcproto-obj', source: 'Function.prototype', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['Person', 'Function.prototype'], edges: ['e-fn-funcproto'] },
      traverse: ['e-fn-funcproto'],
    },
  ],
}
