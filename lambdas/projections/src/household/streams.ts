import type { Household } from "./Household";
import { rateToMonthly, rateToYearly } from "../utils";

export function getActiveIncomes(this: Household) {
  return [...this.user.incomes, ...this.spouse.incomes].filter((income) =>
    income.isActive()
  );
}

export function getIncomesContributingToEmployerPlans(this: Household) {
  return this.getActiveIncomes().filter(
    (income) => !!income.employerPlanAccountKey
  );
}

export function getSpendingSnapshots(this: Household) {
  return [...this.user.spendings, ...this.spouse.spendings].map(
    ({ type, description, projection }) => {
      return {
        type,
        description,
        amount: projection[this.time.year]?.[this.time.month] ?? 0,
      };
    }
  );
}

export function getIncomeSnapshots(this: Household) {
  return [...this.user.incomes, ...this.spouse.incomes].map(
    ({ type, description, projection }) => {
      return {
        type,
        description,
        amount: projection[this.time.year]?.[this.time.month] ?? 0,
      };
    }
  );
}

export function getStreamInfo(this: Household) {
  const clean = ({
    originalInputs,
    shadowKey,
    type,
    description,
    amount,
    startDate,
    endDate,
    inflationRate,
    startNotes,
    endNotes,
  }) => {
    return {
      originalInputs,
      shadowKey,
      type,
      description,
      amount,
      startDate,
      endDate,
      inflationRate,
      startNotes,
      endNotes,
    };
  };

  return {
    income: [...this.user.incomes, ...this.spouse.incomes].map((income) => {
      const { amount, incomeTaxRate, ficaTaxRate, netIncome } = income;
      return {
        ...clean(income),
        incomeTaxRate,
        ficaTaxRate,
        netIncomeMonthly: rateToMonthly(netIncome),
        grossIncomeMonthly: amount,
        netIncomeYearly: rateToYearly(netIncome),
        grossIncomeYearly: rateToYearly({ amount, rate: "monthly" }),
      };
    }),
    spending: [...this.user.spendings, ...this.spouse.spendings].map(clean),
  };
}
