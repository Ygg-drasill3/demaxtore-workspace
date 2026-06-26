import type { NavGroup, QuickAction } from "@/routes/navigation";

export function translateNavGroups(groups: NavGroup[], t: (key: string, fb?: string) => string): NavGroup[] {
  return groups.map((g) => ({
    ...g,
    label: t(`nav.group.${g.id}`, g.label),
    items: g.items.map((item) => ({
      ...item,
      label: t(`nav.item.${item.testId}`, item.label),
    })),
  }));
}

export function translateQuickActions(actions: QuickAction[], t: (key: string, fb?: string) => string): QuickAction[] {
  return actions.map((a) => ({
    ...a,
    label: t(`quick.${a.testId}`, a.label),
  }));
}
