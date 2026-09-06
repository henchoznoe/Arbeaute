import { describe, expect, it } from 'vitest'
import { countAdminAttentionItems } from '@/lib/admin/attention'

describe('choses à traiter', () => {
  it('additionne les demandes et les groupes de superpositions', () => {
    expect(
      countAdminAttentionItems({
        pendingRequestCount: 3,
        conflictGroupCount: 2,
      }),
    ).toBe(5)
  })

  it('reste à zéro quand tout est en ordre', () => {
    expect(
      countAdminAttentionItems({
        pendingRequestCount: 0,
        conflictGroupCount: 0,
      }),
    ).toBe(0)
  })
})
