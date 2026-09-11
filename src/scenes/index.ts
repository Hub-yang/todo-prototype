import type { Scene } from '~/core'
import { a1Literal } from './a1-literal'
import { a2New } from './a2-new'
import { a3PrototypeVsProto } from './a3-prototype-vs-proto'
import { b1Lookup } from './b1-lookup'
import { b2ChainEnd } from './b2-chain-end'
import { b3Shadowing } from './b3-shadowing'
import { b4ObjectCreate } from './b4-object-create'
import { c1ClassDesugar } from './c1-class-desugar'
import { c2Extends } from './c2-extends'
import { c3Instanceof } from './c3-instanceof'
import { d1ChickenEgg } from './d1-chicken-egg'
import { d2Builtins } from './d2-builtins'
import { d3Pollution } from './d3-pollution'

export const scenes: Scene[] = [
  a1Literal,
  a2New,
  a3PrototypeVsProto,
  b1Lookup,
  b2ChainEnd,
  b3Shadowing,
  b4ObjectCreate,
  c1ClassDesugar,
  c2Extends,
  c3Instanceof,
  d1ChickenEgg,
  d2Builtins,
  d3Pollution,
]

export interface SceneGroup {
  id: 'A' | 'B' | 'C' | 'D'
  title: string
  subtitle: string
  scenes: Scene[]
}

const GROUP_META: Array<Pick<SceneGroup, 'id' | 'title' | 'subtitle'>> = [
  { id: 'A', title: '基石', subtitle: '对象从哪来，那条线是谁连的' },
  { id: 'B', title: '查找与继承', subtitle: '读一个属性时，引擎到底走了哪几步' },
  { id: 'C', title: '语法糖', subtitle: 'class 与 extends 背后还是同一套链' },
  { id: 'D', title: '全景与陷阱', subtitle: '把整张地图铺开，以及它带来的风险' },
]

export const sceneGroups: SceneGroup[] = GROUP_META.map(meta => ({
  ...meta,
  scenes: scenes.filter(s => s.id.startsWith(meta.id.toLowerCase())),
}))

export function getScene(id: string): Scene | undefined {
  return scenes.find(s => s.id === id)
}
