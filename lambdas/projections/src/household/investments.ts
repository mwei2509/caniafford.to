import { sum } from "lodash";
import { EARLY_WITHDRAWAL_PENALTY } from "../constants";
import { getPercent, currencyFormat } from "../utils";
import Household from "./Household";

// GETTERS
export function getGrowthAccounts(this: Household) {
  return [...this.user.investmentAccounts, ...this.spouse.investmentAccounts];
}

export function getOpenGrowthAccounts(this: Household) {
  return this.getGrowthAccounts().filter((account) => account.isOpen());
}

export function getTaxableAccounts(this: Household) {
  return this.getOpenGrowthAccounts().filter((account) => account.isTaxable());
}

export function getSelfDepositRetirementAccounts(this: Household) {
  return this.getOpenGrowthAccounts().filter(
    (account) => account.isRothIra() || account.isTraditionalIra()
  );
}

export function getWithdrawalAccounts(this: Household) {
  return this.getOpenGrowthAccounts().filter((account) =>
    account.canWithdraw()
  );
}

export function getEmployerPlanAccounts(this: Household) {
  return this.getOpenGrowthAccounts().filter((account) =>
    account.isEmployerPlan()
  );
}
/**
 * returns self depositable accounts in the order they should be deposited into
 */
export function getSelfDepositRetirementAccountsInOrder(this: Household) {
  return this.getSelfDepositRetirementAccounts().sort((a, b) => {
    // sort by type
    if (
      a.retirementAccountSelfDepositOrder() ===
      b.retirementAccountSelfDepositOrder()
    ) {
      // sort by greater interest rate (should do a weighted rate maybe)
      // TODO: switch to weighted stock and bond growth
      if (a.interestRateBond === b.interestRateBond) {
        // then greater growth rate
        return a.growthRateStock > b.growthRateStock ? -1 : 1;
      }
      return a.interestRateBond > b.interestRateBond ? -1 : 1;
    }
    return a.retirementAccountSelfDepositOrder() <
      b.retirementAccountSelfDepositOrder()
      ? -1
      : 1;
  });
}

export function getTaxableDepositAccountsInOrder(this: Household) {
  return this.getTaxableAccounts().sort((a, b) => {
    // sort by greater interest rate (should do a weighted rate maybe)
    // TODO: switch to weighted stock and bond growth
    if (a.interestRateBond === b.interestRateBond) {
      // then greater growth rate
      return a.growthRateStock > b.growthRateStock ? -1 : 1;
    }
    return a.interestRateBond > b.interestRateBond ? -1 : 1;
  });
}

/**
 * returns growth account in the order they should be withdrawn from
 */
export function getWithdrawOrderGrowthAccounts(this: Household) {
  return this.getWithdrawalAccounts().sort((a, b) => {
    // sort by type
    if (a.withdrawOrder() === b.withdrawOrder()) {
      // sort by greater interest rate (should do a weighted rate maybe)
      // TODO: switch to weighted stock and bond growth
      if (a.growthRateStock === b.growthRateStock) {
        return a.interestRateBond > b.interestRateBond ? 1 : -1;
      }
      return a.growthRateStock > b.growthRateStock ? 1 : -1;
    }
    return a.withdrawOrder() < b.withdrawOrder() ? -1 : 1;
  });
}

export function getContributionLimits(this: Household) {
  let roth = this.irs.getRothContributionLimits("user", this.taxableIncome);
  let ira = this.irs.getIraContributionLimits("user");
  const { _401k = 0, _401kCombined = 0 } =
    this.irs.get401kContributionLimits("user");

  if (this.user.married) {
    roth += this.irs.getRothContributionLimits("spouse", this.taxableIncome);
    ira += this.irs.getIraContributionLimits("spouse");
  }
  return {
    roth,
    ira,
    _401kPerPerson: _401k,
    _401kCombinedPerPerson: _401kCombined,
  };
}

// the amount someone can still deposit to roth
export function amountCanDepositToRothIRA(this: Household) {
  const { roth, ira } = this.contributionLimits;
  if (ira > this.deposited.traditional + this.deposited.roth) {
    if (roth > this.deposited.roth) {
      return roth - this.deposited.roth;
    }
  }
  return 0;
}

// includes both roth and traditional
export function amountCanDepositToTraditionalIRA(this: Household) {
  const { ira } = this.contributionLimits;
  if (ira > this.deposited.traditional + this.deposited.roth) {
    return ira - this.deposited.traditional + this.deposited.roth;
  }
  return 0;
}

// If excess 401k deposit (e.g. due to job change)
// deposit back into taxable income and count as income tax
// DO RESEARCH TO VERIFY THIS
export function addExcess401kDepositToIncome(this: Household, excess: number) {
  this.deposit(excess);
  this.taxableIncome.ordinary += excess;
}

export function pretaxContribution(this: Household, income) {
  const { monthlyContribution = 0 } = income.deductions._401k;
  const actions = [];
  const warnings = [];

  const {
    _401kPerPerson: contributionLimit,
    _401kCombinedPerPerson: combinedContributionLimit,
  } = this.contributionLimits;

  const contributed = this.deposited[income.user.type]._401k;
  const employerMatched = this.deposited[income.user.type]._401kEmployerMatch;

  const passedCombinedLimit =
    contributed + employerMatched >= combinedContributionLimit;
  const passedContributionLimit = contributed >= contributionLimit;
  if (passedCombinedLimit || passedContributionLimit) {
    if (monthlyContribution > 0) {
      warnings.push({
        alert:
          "401k Contribution exceeds yearly maximum allowed, excess deposited to your account and added as taxable income",
        notes: [],
      });
      this.addExcess401kDepositToIncome(monthlyContribution);
    }
    return {
      deposited: 0,
      actions,
      warnings,
    };
  }

  const account = this.getOpenGrowthAccounts().find(
    (account) =>
      account.shadowKey === income.deductions._401k.employerPlanAccountKey
  );
  const amountToContribute = Math.min(
    contributionLimit - contributed,
    monthlyContribution
  );

  // do deposit
  const action = account.deposit(amountToContribute);
  actions.push(action);

  this.deposited[income.user.type]._401k += amountToContribute;
  if (monthlyContribution > amountToContribute) {
    warnings.push({
      alerts: `401k contribution exceeds yearly maximum allowed`,
      notes: [
        `You reported ${currencyFormat(monthlyContribution)}.`,
        `Match decreased to ${currencyFormat(
          amountToContribute
        )} and excess deposited to your account and added as taxable income`,
      ],
    });
    this.addExcess401kDepositToIncome(monthlyContribution - amountToContribute);
  }
  return {
    deposited: amountToContribute,
    actions,
    warnings,
  };
}

export function employerMatchContribution(this: Household, income) {
  const { monthlyEmployerMatch = 0 } = income.deductions._401k;
  const actions = [];
  const warnings = [];

  const { _401kCombinedPerPerson: combinedContributionLimit } =
    this.contributionLimits;

  const contributed = this.deposited[income.user.type]._401k;
  const employerMatched = this.deposited[income.user.type]._401kEmployerMatch;

  const passedCombinedLimit =
    contributed + employerMatched >= combinedContributionLimit;
  if (passedCombinedLimit) {
    if (monthlyEmployerMatch > 0) {
      warnings.push({
        alert: "Employer match exceeds maximum combined contribution",
        notes: [
          `Your reported employer match of ${monthlyEmployerMatch} was deposited.`,
        ],
      });
    }
    return {
      deposited: 0,
      actions,
      warnings,
    };
  }

  const account = this.getOpenGrowthAccounts().find(
    (account) =>
      account.shadowKey === income.deductions._401k.employerPlanAccountKey
  );
  const amountToContribute = Math.min(
    combinedContributionLimit - (employerMatched + contributed),
    monthlyEmployerMatch
  );

  // do deposit
  const action = account.doEmployerDeposit(amountToContribute);
  actions.push(action);

  this.deposited[income.user.type]._401kEmployerMatch += amountToContribute;

  if (monthlyEmployerMatch > amountToContribute) {
    warnings.push({
      alert: `Employer match exceeds maximum combined contribution`,
      notes: [
        `Your reported employer match of ${monthlyEmployerMatch} was decreased to ${amountToContribute}.`,
      ],
    });
  }
  return {
    deposited: amountToContribute,
    actions,
    warnings,
  };
}

/**
 * Deposit to active 401k plans
 */
export function depositToEmployerPlans(this: Household) {
  // get active incomes where currently are making 401k contributions
  const incomes = this.getIncomesContributingToEmployerPlans();

  const actions = [];
  const warnings = [];
  let _401kContribution = 0;
  let _401kEmployerContribution = 0;

  for (const income of incomes) {
    const account = this.getOpenGrowthAccounts().find(
      (account) =>
        account.shadowKey === income.deductions._401k.employerPlanAccountKey
    );
    if (!account) {
      continue;
    }
    const {
      deposited = 0,
      actions: preTaxContributionActions = [],
      warnings: preTaxContributionWarnings = [],
    } = this.pretaxContribution(income);
    _401kContribution += deposited;
    actions.push(...preTaxContributionActions);
    warnings.push(...preTaxContributionWarnings);

    const {
      deposited: employerMatch = 0,
      actions: employerMatchActions = [],
      warnings: employerMatchWarnings = [],
    } = this.employerMatchContribution(income);
    _401kEmployerContribution += employerMatch;
    actions.push(...employerMatchActions);
    warnings.push(...employerMatchWarnings);
  }

  return {
    actions,
    warnings,
    _401kEmployerContribution,
    _401kContribution,
  };
}

export function getMaxBrokerageDeposit(this: Household, orderedAccounts = []) {
  let maxBrokerageDeposit = 0;
  for (const account of orderedAccounts) {
    if (account.contributingMaxAllowed) {
      return -1; // unlimited
    }
    if (account.contributingMaxAmount > 0) {
      const remainingThisYear = Math.max(
        account.contributingMaxAmount - account.depositedThisYear,
        0
      );
      maxBrokerageDeposit += remainingThisYear;
    }
  }

  return maxBrokerageDeposit;
}

// fakes a deposit to get the max
export function getMaxIRADeposit(this: Household, orderedAccounts = []) {
  let maxIRADeposit = 0;
  const originalRoth = this.deposited.roth;
  const originalTraditional = this.deposited.traditional;
  for (const account of orderedAccounts) {
    let amount = 0;
    const max = account.isRothIra()
      ? this.amountCanDepositToRothIRA()
      : this.amountCanDepositToTraditionalIRA();
    if (account.contributingMaxAllowed) {
      amount = max;
    } else if (account.contributingMaxAmount > 0) {
      const remainingThisYear = Math.max(
        account.contributingMaxAmount - account.depositedThisYear,
        0
      );
      amount = Math.min(max, remainingThisYear);
    } else {
      amount = 0;
    }

    if (account.isRothIra()) {
      this.deposited.roth += amount;
    } else if (account.isTraditionalIra()) {
      this.deposited.traditional += amount;
    }
    maxIRADeposit += amount;
  }

  // reset
  this.deposited.roth = originalRoth;
  this.deposited.traditional = originalTraditional;

  return maxIRADeposit;
}
/**
 * make a deposit into growth accounts in the order they appear
 * will make as large as a deposit as possible (within limits) for each account
 * @param {number} depositAmount
 * @param {array} orderedAccounts
 */
export function makeDeposit(
  this: Household,
  depositAmount = 0,
  orderedAccounts = []
) {
  let remainingToDeposit = depositAmount;

  const actions = [];
  const warnings = [];
  for (const account of orderedAccounts) {
    if (!remainingToDeposit) {
      break;
    }
    let limit = -1;
    if (account.isRothIra() || account.isTraditionalIra()) {
      const max = account.isRothIra()
        ? this.amountCanDepositToRothIRA()
        : this.amountCanDepositToTraditionalIRA();
      if (account.contributingMaxAllowed) {
        limit = max;
      } else if (account.contributingMaxAmount > 0) {
        limit = Math.min(max, account.contributingMaxAmount);
        if (account.contributingMaxAmount > limit) {
          warnings.push({
            alert: `Reported contributions exceeds maximum.  You may need to adjust your contributions`,
            notes: [
              `You reported contributing ${currencyFormat(
                account.contributingMaxAmount
              )} which exceeds the limit of ${currencyFormat(
                limit
              )}. Your contribution was lowered to meet the maximum.`,
            ],
          });
        }
      } else {
        limit = 0;
      }
    }

    const toDeposit =
      limit === -1 || limit > remainingToDeposit ? remainingToDeposit : limit;
    const action = account.deposit(toDeposit);
    actions.push(action);

    if (account.isRothIra()) {
      this.deposited.roth += toDeposit;
    } else if (account.isTraditionalIra()) {
      this.deposited.traditional += toDeposit;
    }

    remainingToDeposit -= toDeposit;
  }

  return {
    deposited: depositAmount - remainingToDeposit,
    warnings,
    actions,
  };
}

/**
 * make a withdrawal from growth accounts in the order they appear
 * will make as large as a deposit as possible (within limits) for each account
 * @param {number} withdrawalAmount
 * @param {array} orderedAccounts
 */
export function makeWithdrawal(
  this: Household,
  withdrawalAmount,
  orderedAccounts = []
) {
  let remainingToWithdraw = withdrawalAmount;

  const actions = [];
  for (const account of orderedAccounts) {
    if (!remainingToWithdraw) {
      break;
    }

    const amountCanWithdraw = account.canWithdrawAmount();
    const toWithdraw =
      remainingToWithdraw > amountCanWithdraw
        ? amountCanWithdraw
        : remainingToWithdraw;
    const action = account.withdraw(toWithdraw);
    actions.push(action);

    remainingToWithdraw -= toWithdraw;
  }

  return {
    withdrawn: withdrawalAmount - remainingToWithdraw,
    actions,
  };
}

export function depositIntoBrokerageAccounts(this: Household, amount: number) {
  const bankFunds = this.getBankFunds();
  // make sure we are not taking out more than what we have
  const amountToDeposit = Math.min(bankFunds, amount);
  // how much of bankFunds should we deposit?

  const depositAccounts = this.getTaxableDepositAccountsInOrder();
  const maxDeposit = this.getMaxBrokerageDeposit(depositAccounts);

  const toWithdraw =
    maxDeposit === -1 || maxDeposit > amountToDeposit
      ? amountToDeposit
      : maxDeposit;

  if (!toWithdraw) {
    return {
      deposited: 0,
      actions: [],
    };
  }

  const { withdrawn, actions: withdrawalActions } =
    this.withdrawFromBank(toWithdraw);
  const {
    deposited,
    actions: depositActions,
    warnings = [],
  } = this.makeDeposit(withdrawn, depositAccounts);

  return {
    deposited,
    actions: [...withdrawalActions, ...depositActions],
    warnings,
  };
}

// TODO: figure out tax deductions for deposits into IRA accounts
export function depositIntoRetirementAccounts(this: Household, amount: number) {
  const bankFunds = this.getBankFunds();
  // make sure we are not taking out more than what we have
  const amountToDeposit = Math.min(bankFunds, amount);
  // how much of bankFunds should we deposit?

  const depositAccounts = this.getSelfDepositRetirementAccountsInOrder();
  const maxDeposit = this.getMaxIRADeposit(depositAccounts);

  const toWithdraw =
    maxDeposit > amountToDeposit ? amountToDeposit : maxDeposit;

  if (!toWithdraw) {
    return {
      deposited: 0,
      actions: [],
    };
  }

  const { withdrawn, actions: withdrawalActions } =
    this.withdrawFromBank(toWithdraw);
  const {
    deposited,
    actions: depositActions,
    warnings = [],
  } = this.makeDeposit(withdrawn, depositAccounts);

  return {
    deposited,
    actions: [...withdrawalActions, ...depositActions],
    warnings,
  };
}

export function withdrawFromGrowthAccounts(this: Household, amount: number) {
  const withdrawAccounts = this.getWithdrawOrderGrowthAccounts();

  const { withdrawn, actions } = this.makeWithdrawal(amount, withdrawAccounts);

  return {
    withdrawn,
    actions,
  };
}

export function makeHardshipWithdrawal(this: Household) {
  return {
    withdrawn: 0,
    actions: [],
  };
}

export function getInvestmentSnapshots(this: Household) {
  return this.getOpenGrowthAccounts().map((account) => account.snapshot());
}

export function growInvestments(this: Household) {
  return this.getOpenGrowthAccounts().map((account) => {
    account.grow();
    return account.snapshot();
  });
  // this.getOpenGrowthAccounts().forEach(account => account.grow());
  // return this.getInvestmentSnapshots();
}

export function getPenalties(this: Household) {
  const excusedAmounts = {
    user: 0,
    spouse: 0,
  };
  return sum(
    this.getOpenGrowthAccounts()
      .filter((account) => account.penaltyAmount > 0)
      .map((account) => {
        const { penaltyAmount } = account;
        // TODO deduct from penalty for certain exceptions
        const penalized =
          penaltyAmount - excusedAmounts.user + excusedAmounts.spouse; // TODO: come back to this
        return penalized * getPercent(EARLY_WITHDRAWAL_PENALTY);
      })
  );
}
