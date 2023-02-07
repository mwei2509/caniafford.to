import { sum } from "lodash";
import { subYears } from "date-fns";

/**
 * sets estimated taxes and taxable income for year before simulations start
 */
export function setPreviousYear(date) {
  const previousYear = subYears(date, 1);
  this.setDate(previousYear);

  const previousYearTaxableIncome = {
    ordinary: this.household.getAnnualIncomeForIncomeTax(),
    socialSecurity: this.household.getSocialSecurityIncomeForYear(),
  };

  this.record[previousYear.getUTCFullYear()] = {
    income: previousYearTaxableIncome,
  };
}

export function endOfYearTaxes() {
  const income = sum(
    this.household.getAllOpenAccounts().map(({ income = 0 }) => income)
  );
  const longTermCapitalGains = sum(
    this.household
      .getAllOpenAccounts()
      .map(({ longTermCapitalGains = 0 }) => longTermCapitalGains)
  );

  this.household.taxableIncome.ordinary += income;
  this.household.taxableIncome.longTermCapitalGains += longTermCapitalGains;

  const taxes = this.household.irs.incomeTax(this.household.taxableIncome);
  const incomeTaxWithheld = this.household.getIncomeTaxWithheldForYear();

  return {
    taxOwed:
      taxes.total > incomeTaxWithheld ? taxes.total - incomeTaxWithheld : 0,
    taxRefund:
      taxes.total < incomeTaxWithheld ? incomeTaxWithheld - taxes.total : 0,
    taxes,
  };
}
