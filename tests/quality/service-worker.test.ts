import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('service worker cache policy', () => {
  it('only preloads the offline shell and never caches agenda or customer data', async () => {
    const source = await readFile('public/sw.js', 'utf8')

    expect(source).toContain("const OFFLINE_URL = '/offline'")
    expect(source).toContain("request.mode !== 'navigate'")
    expect(source).toContain('fetch(request).catch')
    expect(source).not.toMatch(/cache\.(?:add|put|addAll)\(request/)
    expect(source).not.toMatch(/['"]\/(?:admin|mes-rendez-vous|reservation)/)
  })
})
