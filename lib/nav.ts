// Every route in the sidebar, in groups. Build your pages under these; ask Kaung to change this list.
// Metrics sits behind the dashboard's Engagement tab, so it isn't listed; the route still works.
export const nav: { label: string | null; items: { href: string; label: string }[] }[] = [
  { label: null, items: [{ href: '/', label: 'Dashboard' }] },
  {
    label: 'Plan',
    items: [
      { href: '/events', label: 'Events' },
      { href: '/calendar', label: 'Calendar' },
      { href: '/tasks', label: 'Tasks' },
      { href: '/templates', label: 'Templates' },
    ],
  },
  { label: 'Decide', items: [{ href: '/polls', label: 'Polls' }] },
  { label: 'Club', items: [{ href: '/settings', label: 'Settings' }] },
]
