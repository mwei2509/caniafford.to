/* eslint-disable no-case-declarations */
/* eslint-disable no-debugger */
import type { Simulation } from "./Simulation";
import { sum } from "lodash";
import { MONTHS_PER_YEAR, ALERT_LEVEL } from "../constants";
import { toCents, currencyFormat } from "../utils";

export function runMonthlySimulation(this: Simulation) {
  const beginningOfMonthSnapshots = this.lastMonth
    ? this.lastMonth.snapshots
    : this.household.getAccountSnapshots();

  // income sources, maybe rebalance??  start of year simulations
  if (this.isFirstMonth()) {
    this.household.yearlyAccountReset();
  }

  // run events
  this.household.runEvents();

  // get needed withdrawal
  const {
    grossIncome, // monthly ordinary income
    loanIncome, // additional income
    spendingInBudget, // monthly spending
    preTaxContributionsThisMonth,
    taxesOwedThisMonth, // monthly taxes (gotten from last year's annual tax divided by 12)
    incomeTaxThisMonth,
    ficaWithheldThisMonth,
    totalSpending, // spending in budget + taxes owed this month
    totalIncome,
    spendingAfterIncome, // spending that still needs to be covered after taken out of income sources
  } = this.getIncomeAndCalculateSpending();

  const actions = [];

  // deposit pretax contributions
  const {
    _401kEmployerContribution = 0,
    _401kContribution = 0,
    actions: _401kContributionActions,
    warnings: _401kContributionWarnings = [],
  } = this.household.depositToEmployerPlans();
  if (_401kContributionWarnings.length > 0) {
    _401kContributionWarnings.forEach((warning) =>
      this.addAlert(warning, ALERT_LEVEL.warning)
    );
  }
  // ^ are we taking contributions into account??

  actions.push(..._401kContributionActions);

  // if income covers all of spending, deposit surplus
  if (spendingAfterIncome < 0) {
    const incomeDepositAction = this.depositIntoBank(
      toCents(-spendingAfterIncome)
    );
    actions.push(incomeDepositAction);
  }

  let deficit = 0;
  // if income does not cover all of spending, do withdrawals
  if (spendingAfterIncome > 0) {
    deficit = spendingAfterIncome;

    // there is a spending deficit - try to meet by withdrawing from bank
    if (deficit > 0) {
      // will always be true
      // withdraw if there is a deficit
      const { deficit: remaining, actions: spendingActions } =
        this.withdrawFromBank(toCents(spendingAfterIncome));

      actions.push(...spendingActions);
      deficit = remaining;
    }

    // if there is still a deficit - try to meet by withdrawing from growth or borrowing money
    if (deficit > 0) {
      // TODO pay deficit with retirement accounts and/or borrow money
      const { deficit: remaining, actions: meetDeficitActions } =
        this.tryToMeetDeficit(deficit);
      actions.push(meetDeficitActions);
      deficit = remaining;
    }

    // if there is still a deficit - add an alert and stop projections
    if (deficit > 0) {
      const notes = [
        "Add additional assets if you are missing any",
        "You could try increasing your emergency fund",
      ];
      if (!this.flags.makeHardshipDistrubitions) {
        notes.push(
          "If you have retirement accounts, enable hardship distributions"
        );
      }
      this.addAlert(
        "You could not pay your spending",
        ALERT_LEVEL.severe,
        notes
      );
      this.stop = true;

      // (if not stopping - add remaining deficit to next months spending)
      this.household.addToNextMonthSpending(deficit);
    }
  }

  // debt payment
  let debtPaid = 0;
  let invested = 0;
  let surplusAvailable;
  let debtAmountNeededMinimum;
  let debtAmountNeededAvoidInterest;

  switch (this.flags.debtPayType) {
    case "project":
      // do minimum debt payments
      // pay minimum debts debtsconst amountNeededToPayMinimumDebt = this.household.getMinimumDebtPayment();
      // TODO FIGURE OUT MINIMUM DEBT PAYMENT GOES
      // IT SHOULD NOT ADD TO DEFICIT BC IT ISN'T NEGATIVE - there may just be a fee/penalty
      const {
        paid: minimumDebtPaidProject,
        paidInFull: paidInFullProject,
        amountNeeded: amountNeededProjectMinimum,
        actions: minimumDebtPaymentActionsProject,
      } = this.household.payMinimumDebt();
      debtAmountNeededMinimum = amountNeededProjectMinimum;

      actions.push(...minimumDebtPaymentActionsProject);
      debtPaid += minimumDebtPaidProject;
      if (!paidInFullProject) {
        this.addAlert(
          `You could not pay your minimum debt payments of ${currencyFormat(
            debtAmountNeededMinimum
          )}.`,
          ALERT_LEVEL.warning
        );

        // over here, see if you can pay with growth accounts and way cost/benefit
      }
      // everything else should only be done if there is a surplus available - e.g. funds in bank minus emergency funds minus predictions for next month's spending
      surplusAvailable = this.getSurplusAvailable();

      if (surplusAvailable > 0) {
        const {
          paid: debtPaidToAvoidFees,
          amountNeeded: amountNeededProjectAvoidInterest,
          actions: debtToAvoidFeesPaymentActions,
        } = this.household.payDebtToAvoidFees(surplusAvailable);
        debtAmountNeededAvoidInterest = amountNeededProjectAvoidInterest;
        debtPaid += debtPaidToAvoidFees;
        surplusAvailable -= debtPaidToAvoidFees;

        actions.push(...debtToAvoidFeesPaymentActions);
      }
      break;
    case "manualDebtGoal":
      const debtGoal = this.flags.manualDebtGoal;
      let amountToPay = debtGoal - debtPaid;

      // pay minimum debt
      const {
        paid: minimumDebtPaid,
        paidInFull: paidInFullDebtGoal,
        amountNeeded,
        actions: minimumDebtPaymentActions,
      } = this.household.payMinimumDebt(amountToPay);
      debtAmountNeededMinimum = amountNeeded;
      actions.push(...minimumDebtPaymentActions);
      debtPaid += minimumDebtPaid;

      if (!paidInFullDebtGoal) {
        this.addAlert(
          `You could not pay your minimum debt payments of ${currencyFormat(
            debtAmountNeededMinimum
          )}.`,
          ALERT_LEVEL.warning
        );

        // over here, see if you can pay with growth accounts and way cost/benefit
      }

      // everything else should only be done if there is a surplus available - e.g. funds in bank minus emergency funds minus predictions for next month's spending
      surplusAvailable = this.getSurplusAvailable();
      amountToPay = Math.min(debtGoal - debtPaid, surplusAvailable);
      if (amountToPay > 0) {
        const {
          paid: debtPaidToAvoidFees,
          amountNeeded: amountNeededAvoidInterest,
          actions: debtToAvoidFeesPaymentActions,
        } = this.household.payDebtToAvoidFees(amountToPay);
        debtAmountNeededAvoidInterest = amountNeededAvoidInterest;
        actions.push(...debtToAvoidFeesPaymentActions);
        debtPaid += debtPaidToAvoidFees;
        surplusAvailable -= debtPaidToAvoidFees;
      }

      amountToPay = Math.min(debtGoal - debtPaid, surplusAvailable);
      if (amountToPay > 0) {
        const { paid, actions: restOfDebtPaymentActions } =
          this.household.payAllDebt(amountToPay);
        actions.push(...restOfDebtPaymentActions);
        debtPaid += paid;
        surplusAvailable -= paid;
      }

      if (debtGoal > debtPaid) {
        this.addAlert(
          `You could not meet your debt payment goal of ${currencyFormat(
            debtGoal
          )}.`,
          ALERT_LEVEL.warning
        );
      }
      break;
    case "manualDebtPay":
      // for manual debt payment
      // manually do the debt deposits
      const {
        paid: manualDebtPaid,
        paidInFull,
        amountNeeded: manualDebtPaymentNeeded,
        actions: manualDebtPaymentActions,
      } = this.household.payManualDebt();

      actions.push(...manualDebtPaymentActions);
      debtPaid += manualDebtPaid;
      if (!paidInFull) {
        this.addAlert(
          `You could not pay your manual debt payment of ${currencyFormat(
            manualDebtPaymentNeeded
          )}.`,
          ALERT_LEVEL.warning
        );
      }
      break;
  }

  // TODO: figure out if it's better to do early payments or to pay off loans
  // early payments into growth account
  if (surplusAvailable > 0) {
    const {
      deposited,
      actions: iraDepositActions,
      warnings: iraDepositWarnings = [],
    } = this.household.depositIntoRetirementAccounts(surplusAvailable);
    actions.push(...iraDepositActions);
    if (iraDepositWarnings.length > 0) {
      iraDepositWarnings.forEach((warning) =>
        this.addAlert(warning.alert, ALERT_LEVEL.warning, warning.notes)
      );
    }

    surplusAvailable -= deposited;
    invested += deposited;
  }

  // early payoff loans
  if (
    this.flags.debtPayType === "project" &&
    surplusAvailable > 0 &&
    this.flags.loanEarlyPayoff
  ) {
    const { paid, actions: restOfDebtPaymentActions } =
      this.household.payAllDebt(surplusAvailable);
    actions.push(...restOfDebtPaymentActions);
    debtPaid += paid;
    surplusAvailable -= paid;
  }

  // get priority of this vs early payoff loans
  // payoff into investment accounts
  if (surplusAvailable > 0) {
    const surplusToDeposit =
      surplusAvailable * this.flags.percentSurplusToInvest;
    const { deposited, actions: brokerageDepositActions } =
      this.household.depositIntoBrokerageAccounts(surplusToDeposit);
    actions.push(...brokerageDepositActions);
    surplusAvailable -= deposited;
    invested += deposited;
  }

  // grow all accounts at the end of the month
  this.endOfMonthGrowAccounts();

  let penalty = 0;
  // in last month, do taxes + end of year cleanup (e.g. keep track of income sources for tax purposes?)
  if (this.isLastMonth()) {
    // taxes get added to next year's spending
    const taxes = this.endOfYearTaxes();
    this.record[this.time.year].taxes = taxes;
    this.record[this.time.year].income = this.household.taxableIncome;

    if (taxes.taxOwed) {
      this.addAlert(
        `You may owe taxes of about ${taxes.taxOwed}.`,
        ALERT_LEVEL.notice,
        [
          `To make sure you're covered and able to pay,
      we add this to next month's spending.`,
        ]
      );
      this.household.addToNextMonthSpending(taxes.taxOwed);
    }
    if (taxes.taxRefund) {
      this.addAlert(
        `You may get a tax refund of ${taxes.taxRefund}`,
        ALERT_LEVEL.notice,
        [
          `To not
      overproject income, we do not currently add this back to your assets`,
        ]
      );
      // this.household.addToNextMonthAdditionalIncome(taxes.taxRefund);
    }

    // calculate any penalties, those will get added to next month (+ year)'s spending
    penalty += this.household.getPenalties();
    if (penalty) {
      this.household.addToNextMonthSpending(penalty);
      this.addAlert(`You have a penalty of ${penalty}`);
    }
  }

  const endOfMonthAccountSnapshots = this.household.getAccountSnapshots();
  // const streamSnapshots = this.household.getStreamSnapshots();
  const endOfMonthAnalysis = this.endOfMonthAnalysis({
    beginningOfMonthSnapshots,
    endOfMonthAccountSnapshots,
    grossIncome,
    loanIncome,
    spendingInBudget,
    totalSpending,
    totalIncome,
    preTaxContributionsThisMonth,
    taxesOwedThisMonth, // fica + income tax
    incomeTaxThisMonth,
    ficaWithheldThisMonth,
    debtPaid,
    invested,
    deficit,
    debtAmountNeededMinimum,
    debtAmountNeededAvoidInterest,
    _401kEmployerContribution,
    _401kContribution,
  });

  const monthlyRecord = {
    actions,
    warnings: this.alerts.byYear[this.time.year]?.[this.time.month] ?? [],
    snapshots: endOfMonthAccountSnapshots,
    analysis: endOfMonthAnalysis,
  };

  this.lastMonth = monthlyRecord;
  this.record[this.time.year].months[this.time.month] = monthlyRecord;
}

/**
 * get monthly income and spending, take spending out of income and either deposit
 * surplus or return needed withdrawal
 */
export function getIncomeAndCalculateSpending() {
  const ficaWithheldThisMonth = this.household.getFICAForMonth();
  const taxesWithheldThisMonth = this.household.getIncomeTaxWithheldForMonth();
  const preTaxContributionsThisMonth =
    this.household.getPreTaxContributionsForMonth();

  const taxesOwedThisMonth = taxesWithheldThisMonth + ficaWithheldThisMonth;
  const grossIncome = this.household.getIncomeForMonth(); // may need to calculate SS incomes?
  const loanIncome = this.household.getLoanIncomeForMonth();
  const additionalIncome = this.household.getAdditionalIncomeForMonth();
  const spendingInBudget = this.household.getSpendingForMonth();
  const totalSpending =
    spendingInBudget + taxesOwedThisMonth + preTaxContributionsThisMonth;
  const totalIncome = grossIncome + loanIncome + additionalIncome;
  const spendingAfterIncome = totalSpending - totalIncome; // if positive, do a withdrawal, if negative, do a deposit

  return {
    grossIncome,
    loanIncome,
    additionalIncome,
    spendingInBudget,
    preTaxContributionsThisMonth,
    taxesOwedThisMonth, // = income tax + fica
    incomeTaxThisMonth: taxesWithheldThisMonth,
    ficaWithheldThisMonth: ficaWithheldThisMonth,
    totalSpending, // spending in budget + taxes owed this month
    totalIncome,
    spendingAfterIncome,
  };
}

/**
 * return prediction for spending next month
 */
export function getNextMonthSpendingPrediction() {
  const taxesOwedNextMonth =
    this.household.getIncomeTaxWithheldForNextMonth() +
    this.household.getFICAForNextMonth();
  const nextMonthIncome = this.household.getIncomeForNextMonth();
  const preTaxContributionsNextMonth =
    this.household.getPreTaxContributionsForNextMonth();

  // ^ note - don't use additional income to predict next month spending
  // because additional is supplemental, usually
  const nextMonthSpending = this.household.getSpendingForNextMonth();
  const minimumDebtPayment = this.household.getMinimumDebtPayment();
  const spending =
    nextMonthSpending +
    minimumDebtPayment +
    taxesOwedNextMonth +
    preTaxContributionsNextMonth;
  return nextMonthIncome > spending ? 0 : spending - nextMonthIncome;
}
/**
 * returns surplus as next month's spending prediction taken out of the bank
 */
export function getSurplusAvailable() {
  const { emergencyFund } = this.flags;
  const nextMonthSpendingPrediction = this.getNextMonthSpendingPrediction();
  let taxAndPenaltyEstimate = 0;
  if (this.isLastMonth()) {
    // estimate if there will be a tax owed next year
    taxAndPenaltyEstimate += this.household.getPenalties();
    const taxes = this.endOfYearTaxes();
    if (taxes.taxOwed) {
      taxAndPenaltyEstimate += taxes.taxOwed;
    }
  }
  const bankFunds = this.household.getBankFunds();
  const loanIncome = this.household.getLoanIncomeForMonth();
  return (
    bankFunds -
    loanIncome -
    nextMonthSpendingPrediction -
    emergencyFund -
    taxAndPenaltyEstimate
  );
}

export function endOfMonthGrowAccounts() {
  this.household.growDebt();
  this.household.growBank();
  this.household.growInvestments();
}

export function getLastMonth() {
  let year = this.time.year;
  let month = this.time.month;

  if (this.time.month === 0) {
    month = MONTHS_PER_YEAR - 1;
    year -= 1;
  } else {
    month -= 1;
  }

  return this.record[year].months[month];
}

export function endOfMonthAnalysis({
  beginningOfMonthSnapshots,
  endOfMonthAccountSnapshots,
  grossIncome,
  loanIncome,
  spendingInBudget,
  totalSpending,
  totalIncome,
  preTaxContributionsThisMonth,
  taxesOwedThisMonth,
  incomeTaxThisMonth,
  ficaWithheldThisMonth,
  debtPaid,
  invested,
  deficit,
  debtAmountNeededMinimum,
  debtAmountNeededAvoidInterest,
  _401kEmployerContribution,
  _401kContribution,
}) {
  // let totalDebtPaid = 0; // interest + principle paid in debt
  // let totalDebtAccrued = 0; // interest + principle gained in debt
  // let netDifferenceDebt = 0; // paid - accrued.  will be negative if we gained MORE debt

  // let totalDebtInterestPaid = 0; // if we paid any interest debt
  // let totalDebtInterestAccrued = 0; // if we accrue interest in debt
  // let netDifferenceDebtInterest = 0; // paid - accrued,  negative if we gained more debt

  // let totalDebtPrinciplePaid = 0; // paid off principle
  // let totalDebtPrincipleAccrued = 0; // if we accrue more debt (e.g. borrow money against credit)
  // let netDifferenceDebtPrinciple = 0; // paid - accrued, negative if we gained more debt

  // let totalContributionsAdded = 0; // if we deposited money
  // let totalContributionsWithdrew = 0; // if we withdrew money from contribution
  // let netDifferenceContribution = 0; // added - withdrew, negative if we lost assets

  // let totalEarningsAdded = 0; // if we earned interest
  // let totalEarningsWithdrew = 0; // if we withdrew from interest
  // let netDifferenceEarnings = 0; // added - withdrew, negative if we lost interest

  // let totalAssetsGained = 0; // contributions + earnings
  // let totalAssetsLost = 0; // all withdrawals from contributions + earnings;
  // let netDifferenceAssets = 0; // added - withdrew of contributions and earnings, negative if we lost assets

  // let netWealth = 0; // netDifferenceAssets + netDifferenceDebt
  // let totalAssets = 0;
  // let totalDebt = 0;
  // let totalContributions = 0;
  // let totalEarnings = 0;
  // let totalDebtPrinciples = 0;
  // const totalDebtInterest = 0;

  // beginningOfMonthSnapshots.forEach(snapshot => {
  //   const beginning = snapshot;
  //   const end = endOfMonthAccountSnapshots.find(({ id }) => id === snapshot.id);

  //   if (snapshot.isAsset) {
  //     if (end) {
  //       const contributionDiff = end.contributions - beginning.contributions;
  //       const earningsDiff = end.earnings - beginning.earnings;
  //       const assetsDiff = (end.contributions + end.earnings) - (beginning.contributions + beginning.earnings);

  //       totalAssets += (end.contributions + end.earnings);
  //       totalContributions += end.contributions;
  //       totalEarnings += end.earnings;

  //       if (contributionDiff < 0) {
  //         // if negative, we lost contributions
  //         totalContributionsWithdrew += Math.abs(contributionDiff);
  //       } else {
  //         // if positive, we gained contributions
  //         totalContributionsAdded += Math.abs(contributionDiff);
  //       }

  //       if (earningsDiff < 0) {
  //         // if negative, we lost earnings
  //         totalEarningsWithdrew += Math.abs(earningsDiff);
  //       } else {
  //         // if positive, we gained earnings
  //         totalEarningsAdded += Math.abs(earningsDiff);
  //       }
  //       if (assetsDiff < 0) {
  //         // if negative, we lost earnings
  //         totalAssetsLost += Math.abs(assetsDiff);
  //       } else {
  //         // if positive, we gained earnings
  //         totalAssetsGained += Math.abs(assetsDiff);
  //       }
  //     } else {
  //       throw new Error('what happened');
  //     }
  //   } else if (snapshot.isDebt) {
  //     if (end) {
  //       const balanceDiff = end.balance - beginning.balance;
  //       const interestDiff = end.interest - beginning.interest;
  //       const principleDiff = (end.balance - end.interest) - (beginning.balance - beginning.interest);

  //       // totalDebt += end.balance;
  //       totalDebtPrinciples = end.balance - end.interest;
  //       totalDebtInterestPaid = end.interest;

  //       if (balanceDiff < 0) {
  //         // if negative, we paid off debt
  //         totalDebtPaid += Math.abs(balanceDiff);
  //       } else {
  //         // if positive, we gained debt
  //         totalDebtAccrued += Math.abs(balanceDiff);
  //       }

  //       if (interestDiff < 0) {
  //         // if negative, we paid off debt
  //         totalDebtInterestPaid += Math.abs(interestDiff);
  //       } else {
  //         // if positive, we gained debt
  //         totalDebtInterestAccrued += Math.abs(interestDiff);
  //       }

  //       if (principleDiff < 0) {
  //         // if negative, we paid off debt
  //         totalDebtPrinciplePaid += Math.abs(principleDiff);
  //       } else {
  //         // if positive, we gained debt
  //         totalDebtPrincipleAccrued += Math.abs(principleDiff);
  //       }
  //     } else {
  //       // if we closed the account, we paid off debt
  //       totalDebtPaid += beginning.balance;
  //       totalDebtPrinciplePaid += (beginning.balance - beginning.interest);
  //       totalDebtInterestPaid += (beginning.interest);
  //     }
  //   }
  // });

  // netDifferenceDebt = totalDebtPaid - totalDebtAccrued;
  // netDifferenceDebtInterest = totalDebtInterestPaid - totalDebtInterestAccrued;
  // netDifferenceDebtPrinciple = totalDebtPrinciplePaid - totalDebtPrincipleAccrued;

  // netDifferenceContribution = totalContributionsAdded - totalContributionsWithdrew;
  // netDifferenceEarnings = totalEarningsAdded - totalEarningsWithdrew;
  // netDifferenceAssets = totalAssetsGained - totalAssetsLost;

  // netWealth = netDifferenceAssets + netDifferenceDebt;

  const totalDebt = sum(
    endOfMonthAccountSnapshots
      .filter(({ isDebt }) => isDebt)
      .map(({ balance }) => balance)
  );
  const totalDebtStartOfMonth = sum(
    beginningOfMonthSnapshots
      .filter(({ isDebt }) => isDebt)
      .map(({ balance }) => balance)
  );
  const dollarsInBankStartOfMonth = sum(
    beginningOfMonthSnapshots
      .filter(({ isBankAccount }) => isBankAccount)
      .map(({ balance }) => balance)
  );
  const dollarsInBank = sum(
    endOfMonthAccountSnapshots
      .filter(({ isBankAccount }) => isBankAccount)
      .map(({ balance }) => balance)
  );
  const dollarsInGrowthAccountsStartOfMonth = sum(
    beginningOfMonthSnapshots
      .filter(({ isGrowthAccount }) => isGrowthAccount)
      .map(({ balance }) => balance)
  );
  const dollarsInGrowthAccounts = sum(
    endOfMonthAccountSnapshots
      .filter(({ isGrowthAccount }) => isGrowthAccount)
      .map(({ balance }) => balance)
  );

  const amountCanWithdrawFromGrowth = sum(
    endOfMonthAccountSnapshots
      .filter(({ isGrowthAccount }) => isGrowthAccount)
      .map(({ canWithdrawAmount }) => canWithdrawAmount)
  );
  const amountCanWithdrawFromGrowthStartOfMonth = sum(
    beginningOfMonthSnapshots
      .filter(({ isGrowthAccount }) => isGrowthAccount)
      .map(({ canWithdrawAmount }) => canWithdrawAmount)
  );
  const amountCanNotWithdrawFromGrowth =
    dollarsInGrowthAccounts - amountCanWithdrawFromGrowth;
  const amountCanNotWithdrawFromGrowthStartOfMonth =
    dollarsInGrowthAccountsStartOfMonth -
    amountCanWithdrawFromGrowthStartOfMonth;

  return {
    totalDebt,
    totalDebtStartOfMonth,
    // amount in the bank
    dollarsInBankStartOfMonth,
    dollarsInBank,

    // amount in investment accounts
    dollarsInGrowthAccountsStartOfMonth,
    dollarsInGrowthAccounts,

    amountCanWithdrawFromGrowth,
    amountCanWithdrawFromGrowthStartOfMonth,
    amountCanNotWithdrawFromGrowth,
    amountCanNotWithdrawFromGrowthStartOfMonth,

    yearlyContributionLimits: this.household.contributionLimits,
    yearlyContributionsSoFar: this.household.deposited,
    grossIncome,
    loanIncome,
    spendingInBudget,
    totalSpending,
    totalIncome,
    preTaxContributionsThisMonth,
    taxesOwedThisMonth,
    incomeTaxThisMonth,
    ficaWithheldThisMonth,
    debtPaid,
    invested,
    deficit,
    debtAmountNeededMinimum,
    debtAmountNeededAvoidInterest,
    _401kEmployerContribution,
    _401kContribution,

    // amount in investment accounts that cannot be withdrawn
    // amount in investment accounts that *can* be withdrawn
    /*
    // calculations from beginning vs end of month snapshots
    totalDebtPaid,
    totalDebtAccrued,
    netDifferenceDebt,
    //
    totalDebtInterestPaid,
    totalDebtInterestAccrued,
    netDifferenceDebtInterest,
    //
    totalDebtPrinciplePaid,
    totalDebtPrincipleAccrued,
    netDifferenceDebtPrinciple,
    //
    totalContributionsAdded,
    totalContributionsWithdrew,
    netDifferenceContribution,
    //
    netDifferenceEarnings,
    totalEarningsAdded,
    totalEarningsWithdrew,
    //
    netDifferenceAssets,
    totalAssetsGained,
    totalAssetsLost,
    //
    netWealth,
    totalAssets,
    totalContributions,
    totalEarnings,
    // totalDebt,
    totalDebtPrinciples,
    totalDebtInterest
  */
  };
}
