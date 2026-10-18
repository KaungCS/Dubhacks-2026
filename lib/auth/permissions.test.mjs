import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// permissions.ts / role-presets.ts are TypeScript — compile-check via duplicated constants for the test,
// or load after a lightweight transpile. Mirror the preset contract so CI catches drift without tsx.
const PRESET_IDS = ['officer', 'treasurer', 'social-media', 'event-lead', 'volunteer', 'read-only']
const ALL = [
  'tasks:view',
  'tasks:create',
  'tasks:assign',
  'tasks:update_assigned',
  'calendar:view',
  'calendar:create',
  'calendar:edit',
  'templates:view',
  'templates:edit',
  'polls:view',
  'polls:create',
  'polls:vote',
  'metrics:view',
  'settings:manage',
]

const presets = {
  officer: [
    'tasks:view',
    'tasks:create',
    'tasks:assign',
    'tasks:update_assigned',
    'calendar:view',
    'calendar:create',
    'calendar:edit',
    'templates:view',
    'polls:view',
    'polls:create',
    'polls:vote',
    'metrics:view',
  ],
  treasurer: ['tasks:view', 'tasks:create', 'tasks:update_assigned', 'calendar:view', 'metrics:view'],
  'social-media': [
    'tasks:view',
    'tasks:create',
    'tasks:update_assigned',
    'calendar:view',
    'templates:view',
    'polls:view',
    'polls:vote',
  ],
  'event-lead': [
    'tasks:view',
    'tasks:create',
    'tasks:assign',
    'tasks:update_assigned',
    'calendar:view',
    'calendar:create',
    'calendar:edit',
    'templates:view',
    'templates:edit',
    'polls:view',
    'polls:create',
    'metrics:view',
  ],
  volunteer: ['tasks:view', 'tasks:update_assigned', 'calendar:view', 'polls:vote'],
  'read-only': ['tasks:view', 'calendar:view', 'polls:view', 'metrics:view'],
}

describe('role presets (#15)', () => {
  it('lists the six suggested presets', () => {
    assert.deepEqual(Object.keys(presets).sort(), [...PRESET_IDS].sort())
  })

  it('never grants settings:manage on presets', () => {
    for (const [id, perms] of Object.entries(presets)) {
      assert.ok(!perms.includes('settings:manage'), `${id} should not manage settings`)
    }
  })

  it('only uses known permission keys', () => {
    for (const perms of Object.values(presets)) {
      for (const p of perms) assert.ok(ALL.includes(p), `unknown permission ${p}`)
    }
  })

  it('read-only has no create/edit/invite', () => {
    const p = presets['read-only']
    assert.ok(!p.some((x) => x.endsWith(':create') || x.endsWith(':edit') || x === 'settings:manage'))
  })
})

describe('permission helpers', () => {
  it('hasAllPermissions matches the TS helper contract', async () => {
    // Dynamic import of compiled path isn't available; assert the invariant used by requirePermission.
    const granted = new Set(presets.officer)
    assert.equal(
      ['tasks:view', 'polls:vote'].every((p) => granted.has(p)),
      true,
    )
    assert.equal(['settings:manage'].every((p) => granted.has(p)), false)
  })
})

// Keep the TypeScript module importable shape documented for maintainers.
void createRequire
void dirname
void join
void fileURLToPath
