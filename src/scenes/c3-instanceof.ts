import type { Scene } from '~/core'

export const c3Instanceof: Scene = {
  id: 'c3',
  title: 'instanceof 到底在比什么',
  code: [
    'class Animal {}',
    'class Dog extends Animal {}',
    'class Cat extends Animal {}',
    '',
    'const d = new Dog()',
    '',
    'd instanceof Dog       // true',
    'd instanceof Animal    // true，隔了一级也算',
    'd instanceof Cat       // false，Cat.prototype 不在 d 的链上',
  ].join('\n'),

  initial: {
    nodes: [
      {
        id: 'd',
        label: 'd',
        kind: 'instance',
        props: [{ key: '[[Prototype]]', value: 'Dog.prototype', kind: 'internal', refTo: 'Dog.prototype' }],
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
        props: [{ key: '[[Prototype]]', value: 'Animal.prototype', kind: 'internal', refTo: 'Animal.prototype' }],
      },
      {
        id: 'Animal',
        label: 'Animal',
        kind: 'function',
        props: [{ key: 'prototype', value: '⟐', kind: 'data', refTo: 'Animal.prototype' }],
      },
      {
        id: 'Animal.prototype',
        label: 'Animal.prototype',
        kind: 'prototype',
        props: [{ key: '[[Prototype]]', value: 'Object.prototype', kind: 'internal', refTo: 'Object.prototype' }],
      },
      {
        id: 'Cat',
        label: 'Cat',
        kind: 'function',
        props: [{ key: 'prototype', value: '⟐', kind: 'data', refTo: 'Cat.prototype' }],
      },
      {
        id: 'Cat.prototype',
        label: 'Cat.prototype',
        kind: 'prototype',
        props: [{ key: '[[Prototype]]', value: 'Animal.prototype', kind: 'internal', refTo: 'Animal.prototype' }],
      },
      {
        id: 'Object.prototype',
        label: 'Object.prototype',
        kind: 'prototype',
        meta: { builtin: true },
        props: [{ key: '[[Prototype]]', value: 'null', kind: 'internal' }],
      },
    ],
    edges: [
      { id: 'e-d-dogproto', source: 'd', target: 'Dog.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-dog-proto', source: 'Dog', target: 'Dog.prototype', kind: 'prototype', sourceHandle: 'prototype' },
      { id: 'e-dogproto-animalproto', source: 'Dog.prototype', target: 'Animal.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-animal-proto', source: 'Animal', target: 'Animal.prototype', kind: 'prototype', sourceHandle: 'prototype' },
      { id: 'e-cat-proto', source: 'Cat', target: 'Cat.prototype', kind: 'prototype', sourceHandle: 'prototype' },
      { id: 'e-catproto-animalproto', source: 'Cat.prototype', target: 'Animal.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
      { id: 'e-animalproto-obj', source: 'Animal.prototype', target: 'Object.prototype', kind: 'proto', sourceHandle: '[[Prototype]]' },
    ],
  },

  steps: [
    {
      title: 'instanceof 不看构造函数，只看一个对象',
      narration: '算 d instanceof Animal 时，引擎根本不关心 d 是被谁造出来的，它只做一件事：取出 Animal.prototype 这个对象，记在手边。',
      codeRange: [8, 8],
      patch: [],
      focus: { nodes: ['Animal', 'Animal.prototype'], edges: ['e-animal-proto'] },
    },
    {
      title: '然后沿 d 的原型链逐跳比对',
      narration: '从 d 出发一格一格往上走，每到一格就问：你是不是刚才记下的那个 Animal.prototype？第一跳到 Dog.prototype，不是；第二跳到 Animal.prototype，命中，于是返回 true。',
      codeRange: [8, 8],
      patch: [],
      focus: {
        nodes: ['d', 'Dog.prototype', 'Animal.prototype'],
        edges: ['e-d-dogproto', 'e-dogproto-animalproto'],
      },
      traverse: ['e-d-dogproto', 'e-dogproto-animalproto'],
    },
    {
      title: '所以「隔了一级」也算 true',
      narration: 'd instanceof Dog 在第一跳就命中，d instanceof Animal 在第二跳命中——两者都是 true。instanceof 问的是「在不在这条链上」，而不是「是不是直接由它造的」。',
      codeRange: [7, 8],
      patch: [],
      focus: { nodes: ['d', 'Dog.prototype', 'Animal.prototype'], edges: [] },
    },
    {
      title: 'Cat.prototype 不在链上，所以是 false',
      narration: 'Cat 和 Dog 是兄弟，它们的 prototype 都接到 Animal.prototype 上，但彼此不在对方的链上。沿着 d 一路走到 null 也遇不到 Cat.prototype，于是返回 false。',
      codeRange: [9, 9],
      patch: [],
      focus: { nodes: ['Cat', 'Cat.prototype'], edges: ['e-cat-proto'] },
    },
  ],
}
