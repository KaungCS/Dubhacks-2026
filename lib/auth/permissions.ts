// Single source of truth for feature permission keys (#14).
// UI checklists, presets, and server gates all import from here.

export const PERMISSIONS = [
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
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ADMIN_PERMISSIONS: readonly Permission[] = PERMISSIONS

/** Permissions that the system Admin role must always keep. */
export const ADMIN_PERMISSION_FLOOR: readonly Permission[] = PERMISSIONS

export const PERMISSION_LABELS: Record<Permission, string> = {
  'tasks:view': 'Tasks — view',
  'tasks:create': 'Tasks — create',
  'tasks:assign': 'Tasks — assign',
  'tasks:update_assigned': 'Tasks — update assigned (status)',
  'calendar:view': 'Calendar & events — view',
  'calendar:create': 'Calendar & events — create',
  'calendar:edit': 'Calendar & events — edit',
  'templates:view': 'Templates — view',
  'templates:edit': 'Templates — edit',
  'polls:view': 'Polls — view',
  'polls:create': 'Polls — create',
  'polls:vote': 'Polls — vote',
  'metrics:view': 'Metrics / attendance — view',
  'settings:manage': 'Settings — invite & manage members',
}

/** Grouped for the settings checklist UI. */
export const PERMISSION_GROUPS: { title: string; permissions: Permission[] }[] = [
  {
    title: 'Tasks',
    permissions: ['tasks:view', 'tasks:create', 'tasks:assign', 'tasks:update_assigned'],
  },
  {
    title: 'Calendar & events',
    permissions: ['calendar:view', 'calendar:create', 'calendar:edit'],
  },
  {
    title: 'Templates',
    permissions: ['templates:view', 'templates:edit'],
  },
  {
    title: 'Polls',
    permissions: ['polls:view', 'polls:create', 'polls:vote'],
  },
  {
    title: 'Metrics',
    permissions: ['metrics:view'],
  },
  {
    title: 'Settings',
    permissions: ['settings:manage'],
  },
]

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value)
}

export function parsePermissions(raw: string[] | null | undefined): Permission[] {
  if (!raw?.length) return []
  return raw.filter(isPermission)
}

export function summarizePermissions(permissions: readonly Permission[], limit = 4): string {
  if (!permissions.length) return 'No features'
  if (permissions.length === PERMISSIONS.length) return 'All features'
  const labels = permissions.map((p) => PERMISSION_LABELS[p])
  if (labels.length <= limit) return labels.join(', ')
  return `${labels.slice(0, limit).join(', ')} +${labels.length - limit} more`
}

export function hasAllPermissions(
  granted: ReadonlySet<Permission> | readonly Permission[],
  needed: readonly Permission[],
): boolean {
  const set = granted instanceof Set ? granted : new Set(granted)
  return needed.every((p) => set.has(p))
}
