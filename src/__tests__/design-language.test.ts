import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

/**
 * 设计语言守卫：CLAUDE.md 规定图标一律用 UnoCSS 的 i-ph-* 类名，
 * 禁止拿 Unicode 字符或 emoji 充当图标。
 *
 * 这条规则最容易被「顺手打个 ▶ 先跑起来」破坏，而且它不会让任何功能测试变红，
 * 所以专门用一条守卫测试把它钉死。
 */

// vitest 跑在 happy-dom 环境下，import.meta.url 不是 file: 协议，只能从 cwd 推路径
const SRC = resolve(process.cwd(), 'src')

/** 常被当成图标使用的字符。注意不含 ƒ —— 它在 scenes 数据里是属性值文本，不是图标 */
// \u2600-\u27BF 已覆盖 ✓✗★⚙ 等，无需再单列
const ICON_LIKE = /[▸▾▴▿◂▪▫◀▶⏸⏯⏵⟲⟳⤓⤒×∅⟐●◆←→↑↓\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

/** 注释里出现 0×0、A → B 这类符号是正常行文，扫描前先剥掉注释 */
function stripComments(source: string) {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('设计语言：图标', () => {
  const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter(name => name.endsWith('.vue'))
    .map(name => join(SRC, name))

  it('扫描到了组件文件，守卫不是空跑', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it.each(files.map(f => relative(SRC, f)))('%s 不用 Unicode 字符或 emoji 充当图标', (file) => {
    const offenders = stripComments(readFileSync(join(SRC, file), 'utf8'))
      .split('\n')
      .map((line, i) => [i + 1, line] as const)
      .filter(([, line]) => ICON_LIKE.test(line))
      .map(([no, line]) => `${no}: ${line.trim()}`)

    expect(offenders).toEqual([])
  })

  it.each(files.map(f => relative(SRC, f)))('%s 不内联 <svg>，图标只能用 i-ph-* 类名', (file) => {
    expect(readFileSync(join(SRC, file), 'utf8')).not.toMatch(/<svg[\s>]/)
  })

  it.each(files.map(f => relative(SRC, f)))('%s 只使用 ph 一个图标库', (file) => {
    const others = [...readFileSync(join(SRC, file), 'utf8').matchAll(/\bi-([a-z0-9]+)-[a-z0-9-]+/g)]
      .map(m => m[1])
      .filter(prefix => prefix !== 'ph')

    expect(others).toEqual([])
  })

  it.each(files.map(f => relative(SRC, f)))('%s 的图标类名是字面量，没有拼接（拼接的类名 UnoCSS 扫不到）', (file) => {
    expect(readFileSync(join(SRC, file), 'utf8')).not.toMatch(/i-ph-[a-z0-9-]*\$\{/)
  })
})
