import type { Scene } from '~/core'
import { a1Literal } from './a1-literal'
import { a2New } from './a2-new'
import { a3PrototypeVsProto } from './a3-prototype-vs-proto'
import { b1Lookup } from './b1-lookup'
import { b2ChainEnd } from './b2-chain-end'
import { b3Shadowing } from './b3-shadowing'
import { b4ObjectCreate } from './b4-object-create'

export const scenes: Scene[] = [
  a1Literal,
  a2New,
  a3PrototypeVsProto,
  b1Lookup,
  b2ChainEnd,
  b3Shadowing,
  b4ObjectCreate,
]

export function getScene(id: string): Scene | undefined {
  return scenes.find(s => s.id === id)
}
