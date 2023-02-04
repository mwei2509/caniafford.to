import type { Household } from "./Household";

export function getAllAccounts(this: Household) {
  return [...this.user.accounts, ...this.spouse.accounts];
}

export function getAllOpenAccounts(this: Household) {
  return this.getAllAccounts().filter((account) => account.isOpen());
}

/**
 * goes through all accounts and does a yearly reset
 */
export function yearlyAccountReset(this: Household) {
  this.taxableIncome = {
    ordinary: this.getAnnualIncomeForIncomeTax(),
    socialSecurity: this.getSocialSecurityIncomeForYear(),
    longTermCapitalGains: 0,
  };

  this.contributionLimits = this.getContributionLimits();

  this.deposited = {
    roth: 0, // covers just roth
    traditional: 0, // covers both roth and traditional
    user: {
      _401k: 0,
      _401kEmployerMatch: 0,
    },
    spouse: {
      _401k: 0,
      _401kEmployerMatch: 0,
    },
  };

  this.getAllAccounts().forEach((account) => account.yearlyReset());
}

/**
 * this returns info about the account *that does not change*
 * aka the "facts/attributes" of the account
 */
export function getAccountInfo(this: Household) {
  return this.getAllAccounts().map((account) => account.snapshot());
}
