import type { Scene } from '~/core'

export const d3Pollution: Scene = {
  id: 'd3',
  title: '改一个地方，全世界都变了',
  code: [
    'const userConfig = { theme: \'dark\' }',
    'const emptyObj = {}',
    'const arr = []',
    '',
    'userConfig.isAdmin    // undefined',
    '',
    'Object.prototype.isAdmin = true   // 只写了这一行',
    '',
    'userConfig.isAdmin    // true',
    'emptyObj.isAdmin      // true',
    'arr.isAdmin           // true',
    '',
    'const safeDict = Object.create(null)',
    'safeDict.isAdmin      // undefined，它没有原型链',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'userConfig',
        label: 'userConfig',
        kind: 'plain',
        props: [
          { key: 'theme', value: '\'dark\'', kind: 'data' },
          { key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' },
        ],
      },
      {
        id: 'emptyObj',
        label: 'emptyObj',
        kind: 'plain',
        props: [{ key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' }],
      },
      {
        id: 'arr',
        label: '[]',
        kind: 'instance',
        props: [{ key: '[[Prototype]]', value: 'Array.prototype', kind: 'internal', refTo: 'Array.prototype' }],
      },
      {
        id: 'Array.prototype',
        label: 'Array.prototype',
        kind: 'prototype',
        meta: { builtin: true },
        props: [
          { key: 'map', value: 'ƒ', kind: 'data' },
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
      { id: 'e-user-obj', source: 'userConfig', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-empty-obj', source: 'emptyObj', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-arr-arrproto', source: 'arr', target: 'Array.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-arrproto-obj', source: 'Array.prototype', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
    ],
  },

  steps: [
    {
      title: '三个毫不相干的对象',
      narration: '一个配置对象、一个空对象、一个数组。它们彼此没有任何关系，但请注意：三条链最后都通向同一格 Object.prototype。',
      codeRange: [1, 5],
      patch: [],
      focus: {
        nodes: ['userConfig', 'emptyObj', 'arr', 'Object.prototype'],
        edges: ['e-user-obj', 'e-empty-obj', 'e-arr-arrproto', 'e-arrproto-obj'],
      },
    },
    {
      title: '往共同的祖先上写一个属性，就是污染',
      narration: '只执行了一行 Object.prototype.isAdmin = true。图上也只有一格发生了变化——但接下来你会看到这一格的影响有多大。',
      codeRange: [7, 7],
      patch: [{
        op: 'addProp',
        nodeId: 'Object.prototype',
        prop: { key: 'isAdmin', value: 'true', kind: 'data' },
      }],
      focus: { nodes: ['Object.prototype'], edges: [] },
    },
    {
      title: '三个对象同时「感染」',
      narration: '没有人改过这三个对象，但它们现在都能读到 isAdmin——因为查找会沿链上溯，而链的尽头正是被写入的那一格。如果某段权限判断写的是 if (config.isAdmin)，这里就是一个真实的漏洞。',
      codeRange: [9, 11],
      patch: [],
      focus: {
        nodes: ['userConfig', 'emptyObj', 'arr', 'Array.prototype', 'Object.prototype'],
        edges: ['e-user-obj', 'e-empty-obj', 'e-arr-arrproto', 'e-arrproto-obj'],
      },
      traverse: ['e-user-obj', 'e-empty-obj', 'e-arr-arrproto', 'e-arrproto-obj'],
    },
    {
      title: '没有链的对象免疫',
      narration: 'Object.create(null) 造出的对象压根没有 [[Prototype]]，查找无处可去，自然读不到被注入的属性。这就是把它当作安全字典的理由。',
      codeRange: [13, 14],
      patch: [{
        op: 'addNode',
        node: {
          id: 'safeDict',
          label: 'safeDict',
          kind: 'plain',
          props: [{ key: '[[Prototype]]', value: 'null', kind: 'internal' }],
        },
      }],
      focus: { nodes: ['safeDict'], edges: [] },
    },
  ],
}
