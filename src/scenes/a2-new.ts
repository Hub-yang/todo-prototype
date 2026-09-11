import type { Scene } from '~/core'

export const a2New: Scene = {
  id: 'a2',
  title: 'new 到底做了什么',
  code: [
    'function Person(name) {',
    '  this.name = name',
    '}',
    'Person.prototype.say = function () {',
    // 这是要展示给读者的 JS 源码文本，模板字符串是内容本身，不是此处的语法误用
    // eslint-disable-next-line no-template-curly-in-string
    '  return `我是 ${this.name}`',
    '}',
    '',
    'const p1 = new Person(\'Ada\')',
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
      { id: 'e-fn-proto', source: 'Person', target: 'Person.prototype', kind: 'prototype', sourceHandle: 'prototype' },
      { id: 'e-proto-obj', source: 'Person.prototype', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-ctor', source: 'Person.prototype', target: 'Person', kind: 'constructor', sourceHandle: 'constructor' },
    ],
  },

  steps: [
    {
      title: '造一个空对象',
      narration: 'new 的第一步：凭空造出一个空对象。此刻它什么都没有，也还没和 Person 发生任何关系。',
      codeRange: [8, 8],
      patch: [{
        op: 'addNode',
        node: { id: 'p1', label: 'p1', kind: 'instance', props: [] },
      }],
      focus: { nodes: ['p1'], edges: [] },
    },
    {
      title: '把它的 [[Prototype]] 接到 Person.prototype',
      narration: '关键的一步：新对象的内部槽 [[Prototype]] 指向 Person.prototype——注意接的是函数 prototype 属性所指向的那个对象，不是函数本身。',
      codeRange: [8, 8],
      patch: [
        {
          op: 'addProp',
          nodeId: 'p1',
          prop: { key: '[[Prototype]]', value: 'Person.prototype', kind: 'internal', refTo: 'Person.prototype' },
        },
        {
          op: 'addEdge',
          edge: { id: 'e-p1-proto', source: 'p1', target: 'Person.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
        },
      ],
      focus: { nodes: ['p1', 'Person.prototype'], edges: ['e-p1-proto'] },
      traverse: ['e-p1-proto'],
    },
    {
      title: '以新对象为 this 执行构造函数',
      narration: '构造函数体里的 this 就是这个新对象，所以 this.name = name 把 name 写在了实例自己身上，而不是原型上。',
      codeRange: [1, 3],
      patch: [{
        op: 'addProp',
        nodeId: 'p1',
        prop: { key: 'name', value: '\'Ada\'', kind: 'data' },
      }],
      focus: { nodes: ['p1'], edges: [] },
    },
    {
      title: '返回这个对象',
      narration: '构造函数没有显式返回对象，于是 new 把这个新对象返回出来，赋给 p1。至此 p1 的原型链是：p1 → Person.prototype → Object.prototype → null。',
      codeRange: [8, 8],
      patch: [],
      focus: {
        nodes: ['p1', 'Person.prototype', 'Object.prototype'],
        edges: ['e-p1-proto', 'e-proto-obj'],
      },
      traverse: ['e-p1-proto', 'e-proto-obj'],
    },
  ],
}
