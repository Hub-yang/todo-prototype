import type { Scene } from '~/core'

export const c1ClassDesugar: Scene = {
  id: 'c1',
  title: 'class 其实还是那套老东西',
  code: [
    'class Person {',
    '  constructor(name) { this.name = name }',
    '  say() {}                  // 实例方法',
    '  static create() {}        // 静态方法',
    '}',
    '',
    '// 完全等价于：',
    '// function Person(name) { this.name = name }',
    '// Person.prototype.say = function () {}',
    '// Person.create = function () {}',
    '',
    'const p = new Person(\'Ada\')',
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
      title: 'class 声明出来的，还是一个函数',
      narration: 'class 是语法糖，不是新的对象模型。Person 的类型仍然是 function，它照样带着那个 prototype 属性。图的骨架和用 function 声明时一模一样。',
      codeRange: [1, 5],
      patch: [],
      focus: { nodes: ['Person', 'Person.prototype'], edges: ['e-fn-proto'] },
    },
    {
      title: '实例方法挂在 prototype 上',
      narration: 'say 写在 class 体里，但它并不在每个实例身上各存一份，而是挂在 Person.prototype 上。所有实例共享同一个 say，这正是原型的意义。',
      codeRange: [3, 3],
      patch: [{
        op: 'addProp',
        nodeId: 'Person.prototype',
        prop: { key: 'say', value: 'ƒ', kind: 'data' },
      }],
      focus: { nodes: ['Person.prototype'], edges: [] },
    },
    {
      title: '静态方法挂在函数自己身上',
      narration: 'static create 去了 Person 本身，而不是 Person.prototype。所以实例访问不到它——实例的链上根本不经过 Person。',
      codeRange: [4, 4],
      patch: [{
        op: 'addProp',
        nodeId: 'Person',
        prop: { key: 'create', value: 'ƒ', kind: 'data' },
      }],
      focus: { nodes: ['Person'], edges: [] },
    },
    {
      title: 'new 出实例，链和以前一样',
      narration: '实例接到 Person.prototype 上，于是能用 say，但永远拿不到 create。换成 class 语法，这条规则一个字都没变。',
      codeRange: [12, 12],
      patch: [
        {
          op: 'addNode',
          node: {
            id: 'p',
            label: 'p',
            kind: 'instance',
            props: [
              { key: 'name', value: '\'Ada\'', kind: 'data' },
              { key: '[[Prototype]]', value: 'Person.prototype', kind: 'internal', refTo: 'Person.prototype' },
            ],
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
  ],
}
