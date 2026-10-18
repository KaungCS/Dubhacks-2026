'use client'

import { useMemo, useState } from 'react'
import { Button, Input } from '@/components/ui'
import { PERMISSION_GROUPS, PERMISSION_LABELS, type Permission } from '@/lib/auth/permissions'
import { ROLE_PRESETS } from '@/lib/auth/role-presets'
import { saveRole } from './actions'

type Props = {
  roleId?: string
  initialName?: string
  initialPermissions?: Permission[]
  isSystem?: boolean
  existingNames: string[]
}

export function RoleForm({
  roleId,
  initialName = '',
  initialPermissions = [],
  isSystem = false,
  existingNames,
}: Props) {
  const [name, setName] = useState(initialName)
  const [selected, setSelected] = useState<Set<Permission>>(() => new Set(initialPermissions))
  const [presetId, setPresetId] = useState('')
  const [nameHint, setNameHint] = useState('')

  const normalizedExisting = useMemo(
    () => new Set(existingNames.map((n) => n.trim().toLowerCase()).filter((n) => n !== initialName.trim().toLowerCase())),
    [existingNames, initialName],
  )

  function applyPreset(id: string) {
    setPresetId(id)
    const preset = ROLE_PRESETS.find((p) => p.id === id)
    if (!preset) return
    setName(preset.name)
    setSelected(new Set(preset.permissions))
    if (normalizedExisting.has(preset.name.toLowerCase())) {
      setNameHint(`A role named “${preset.name}” already exists — rename before saving, or edit the existing role.`)
    } else {
      setNameHint('')
    }
  }

  function toggle(permission: Permission) {
    if (isSystem) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(permission)) next.delete(permission)
      else next.add(permission)
      return next
    })
  }

  function onNameChange(value: string) {
    setName(value)
    if (normalizedExisting.has(value.trim().toLowerCase())) {
      setNameHint('A role with this name already exists in this club.')
    } else {
      setNameHint('')
    }
  }

  return (
    <form action={saveRole} className="space-y-4">
      {roleId && <input type="hidden" name="role_id" value={roleId} />}
      {[...selected].map((p) => (
        <input key={p} type="hidden" name="permission" value={p} />
      ))}

      {!roleId && (
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="preset">
            Start from preset
          </label>
          <select
            id="preset"
            value={presetId}
            onChange={(e) => {
              const v = e.target.value
              if (!v) {
                setPresetId('')
                return
              }
              applyPreset(v)
            }}
            className="w-full rounded-full border border-black bg-white px-4 py-1.5 text-sm"
          >
            <option value="">Blank custom role</option>
            {ROLE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.description}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor={`role-name-${roleId ?? 'new'}`}>
          Role name
        </label>
        <Input
          id={`role-name-${roleId ?? 'new'}`}
          name="name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Treasurer"
          required
          readOnly={isSystem}
          className="w-full"
        />
        {nameHint && <p className="text-sm text-red-600">{nameHint}</p>}
        {isSystem && <p className="text-sm text-neutral-500">Built-in Admin cannot be renamed or deleted.</p>}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Features</legend>
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-neutral-500">{group.title}</p>
            <div className="flex flex-col gap-1">
              {group.permissions.map((permission) => (
                <label key={permission} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(permission)}
                    onChange={() => toggle(permission)}
                    disabled={isSystem}
                  />
                  <span>{PERMISSION_LABELS[permission]}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {isSystem && (
          <p className="text-sm text-neutral-500">Admin keeps the full permission floor needed to run the club.</p>
        )}
      </fieldset>

      <Button type="submit" disabled={!!nameHint && !isSystem}>
        {roleId ? 'Save role' : 'Create role'}
      </Button>
    </form>
  )
}
