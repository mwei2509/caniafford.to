import type { Household } from "./class";

export function getAllAccounts(this: Household) {
  return [...this.user.accounts, ...this.spouse.accounts];
}
