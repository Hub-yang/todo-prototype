import type { Scene } from '~/core'
import { a1Literal } from './a1-literal'
import { a2New } from './a2-new'
import { b1Lookup } from './b1-lookup'

export const scenes: Scene[] = [a1Literal, a2New, b1Lookup]

export function getScene(id: string): Scene | undefined {
  return scenes.find(s => s.id === id)
}
