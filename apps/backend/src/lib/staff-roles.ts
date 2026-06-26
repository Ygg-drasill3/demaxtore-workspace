/** Staff roles with portfolio-wide read access (not full admin ops). */
export function hasPortfolioVisibility(role: string): boolean {
  return role === "ADMIN" || role === "SALES_CONTROL";
}
