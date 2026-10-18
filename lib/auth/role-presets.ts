// Role presets for "Start from preset" (#15). Starting points only — not locked system roles.
import { type Permission } from './permissions'

export type RolePreset = {
  id: string
  name: string
  description: string
  permissions: readonly Permission[]
}

export const ROLE_PRESETS: readonly RolePreset[] = [
  {
    id: 'officer',
    name: 'Officer',
    description: 'Default all-around club member',
    permissions: [
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
  },
  {
    id: 'treasurer',
    name: 'Treasurer',
    description: 'Budget, reimbursements, dues tracking tasks',
    permissions: [
      'tasks:view',
      'tasks:create',
      'tasks:update_assigned',
      'calendar:view',
      'metrics:view',
    ],
  },
  {
    id: 'social-media',
    name: 'Social Media',
    description: 'Posts, outreach, event promotion',
    permissions: [
      'tasks:view',
      'tasks:create',
      'tasks:update_assigned',
      'calendar:view',
      'templates:view',
      'polls:view',
      'polls:vote',
    ],
  },
  {
    id: 'event-lead',
    name: 'Event Lead',
    description: 'Owns event planning end-to-end',
    permissions: [
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
  },
  {
    id: 'volunteer',
    name: 'Volunteer',
    description: 'Helpers who execute assigned work',
    permissions: [
      'tasks:view',
      'tasks:update_assigned',
      'calendar:view',
      'polls:vote',
    ],
  },
  {
    id: 'read-only',
    name: 'Read-only',
    description: 'Observers, alumni, advisors',
    permissions: ['tasks:view', 'calendar:view', 'polls:view', 'metrics:view'],
  },
]

export function getPreset(id: string): RolePreset | undefined {
  return ROLE_PRESETS.find((p) => p.id === id)
}
