/** Desktop sidebar widths — keep in sync with layout offset animations. */
export const SIDEBAR_WIDTH_EXPANDED  = 224;
export const SIDEBAR_WIDTH_COLLAPSED = 68;

export function sidebarWidth(collapsed: boolean): number {
  return collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
}
