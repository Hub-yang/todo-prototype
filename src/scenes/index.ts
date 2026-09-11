import type { Scene } from '~/core'
import { a2New } from './a2-new'

export const scenes: Scene[] = [a2New]

export function getScene(id: string): Scene | undefined {
  return scenes.find(s => s.id === id)
}
