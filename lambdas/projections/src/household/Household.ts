import { getAllAccounts } from "./accounts";
import type { UserInput, HouseholdInput, Flags } from "../types";
import Person from "../Person";
import {
  getIncomesContributingToEmployerPlans,
  getActiveIncomes,
  getSpendingSnapshots,
  getIncomeSnapshots,
} from "./streams";
import {
  deposit,
  setMainDepositAccount,
  getBankSnapshots,
  getOpenBankAccounts,
  getWithdrawalBankAccounts,
  getBankFunds,
  withdrawFromBank,
} from "./bank";
import {
  getDebtSnapshots,
  getAllDebtOwed,
  getCreditAccountsToBorrowFrom,
  getCreditAccountsWithBalances,
  getFundsToPayDebt,
  getLoanAccountsWithBalances,
  getMinimumDebtPayment,
  getOpenCreditAccounts,
  getOpenDebtAccounts,
  getOpenDebtAccountsWithBalances,
  growDebt,
  makeBorrowRequest,
  makePayment,
  payAllDebt,
  payDebt,
  payDebtToAvoidFees,
  payManualDebt,
  payMinimumDebt,
  paymentsToAvoidFees,
} from "./debt";
import {
  makeDeposit,
  addExcess401kDepositToIncome,
  getGrowthAccounts,
  getOpenGrowthAccounts,
  getContributionLimits,
  getEmployerPlanAccounts,
  getInvestmentSnapshots,
  getMaxBrokerageDeposit,
  getPenalties,
  getMaxIRADeposit,
  getSelfDepositRetirementAccounts,
  getSelfDepositRetirementAccountsInOrder,
  getTaxableAccounts,
  getTaxableDepositAccountsInOrder,
  getWithdrawOrderGrowthAccounts,
  getWithdrawalAccounts,
  growInvestments,
  amountCanDepositToTraditionalIRA,
  amountCanDepositToRothIRA,
  employerMatchContribution,
  pretaxContribution,
  makeWithdrawal,
} from "./investments";
import IRS from "../irs/Irs";
import type { taxableIncome } from "../irs/types.d";
import Time from "../time";
import { combineProjections } from "../streams/projections";
import _ from "lodash";
import StreamItem, { ProjectionStreamType } from "../streams/streamItem";
import Bank from "../accounts/Bank";

export class Household {
  // streams
  public getIncomesContributingToEmployerPlans =
    getIncomesContributingToEmployerPlans;
  public getActiveIncomes = getActiveIncomes;
  public getSpendingSnapshots = getSpendingSnapshots;
  public getIncomeSnapshots = getIncomeSnapshots;

  // bank
  public deposit = deposit;
  public getAllAccounts = getAllAccounts;
  public setMainDepositAccount = setMainDepositAccount;
  public getBankSnapshots = getBankSnapshots;
  public getOpenBankAccounts = getOpenBankAccounts;
  public getWithdrawalBankAccounts = getWithdrawalBankAccounts;
  public withdrawFromBank = withdrawFromBank;
  public getBankFunds = getBankFunds;

  // debt
  public getDebtSnapshots = getDebtSnapshots;
  public getAllDebtOwed = getAllDebtOwed;
  public getCreditAccountsToBorrowFrom = getCreditAccountsToBorrowFrom;
  public getCreditAccountsWithBalances = getCreditAccountsWithBalances;
  public getFundsToPayDebt = getFundsToPayDebt;
  public getLoanAccountsWithBalances = getLoanAccountsWithBalances;
  public getMinimumDebtPayment = getMinimumDebtPayment;
  public getOpenCreditAccounts = getOpenCreditAccounts;
  public getOpenDebtAccounts = getOpenDebtAccounts;
  public getOpenDebtAccountsWithBalances = getOpenDebtAccountsWithBalances;
  public growDebt = growDebt;
  public makeBorrowRequest = makeBorrowRequest;
  public makePayment = makePayment;
  public payAllDebt = payAllDebt;
  public payDebt = payDebt;
  public payDebtToAvoidFees = payDebtToAvoidFees;
  public payManualDebt = payManualDebt;
  public payMinimumDebt = payMinimumDebt;
  public paymentsToAvoidFees = paymentsToAvoidFees;

  // investments
  public addExcess401kDepositToIncome = addExcess401kDepositToIncome;
  public getGrowthAccounts = getGrowthAccounts;
  public getOpenGrowthAccounts = getOpenGrowthAccounts;
  public getContributionLimits = getContributionLimits;
  public getEmployerPlanAccounts = getEmployerPlanAccounts;
  public getInvestmentSnapshots = getInvestmentSnapshots;
  public getMaxBrokerageDeposit = getMaxBrokerageDeposit;
  public getPenalties = getPenalties;
  public getMaxIRADeposit = getMaxIRADeposit;
  public getSelfDepositRetirementAccounts = getSelfDepositRetirementAccounts;
  public getSelfDepositRetirementAccountsInOrder =
    getSelfDepositRetirementAccountsInOrder;
  public getTaxableAccounts = getTaxableAccounts;
  public getTaxableDepositAccountsInOrder = getTaxableDepositAccountsInOrder;
  public getWithdrawOrderGrowthAccounts = getWithdrawOrderGrowthAccounts;
  public getWithdrawalAccounts = getWithdrawalAccounts;
  public growInvestments = growInvestments;
  public makeDeposit = makeDeposit;
  public amountCanDepositToTraditionalIRA = amountCanDepositToTraditionalIRA;
  public amountCanDepositToRothIRA = amountCanDepositToRothIRA;
  public employerMatchContribution = employerMatchContribution;
  public pretaxContribution = pretaxContribution;
  public makeWithdrawal = makeWithdrawal;

  public user: Person;
  public spouse?: Person;
  public time: Time;
  public flags: Flags;
  public irs: IRS;
  public mainDepositAccount: Bank;

  // projection streams
  public projectedLoanIncome: ProjectionStreamType;
  public projectedSpending: ProjectionStreamType;
  public projectedAdditionalIncome: ProjectionStreamType;
  public projectedOrdinaryIncome: ProjectionStreamType;
  public projectedPreTaxContributions: ProjectionStreamType;
  public projectedSocialSecurityIncome: ProjectionStreamType;
  public projectedMedicalExpenses: ProjectionStreamType;
  public projectedFICA: ProjectionStreamType;
  public projectedIncomeTaxWithheld: ProjectionStreamType;

  public taxableIncome: taxableIncome;
  public contributionLimits: {
    roth: number;
    ira: number;
    _401kPerPerson: number;
    _401kCombinedPerPerson: number;
  };
  public deposited: {
    roth: number; // covers just roth
    traditional: number; // covers both roth and traditional
    user: {
      _401k: number;
      _401kEmployerMatch: number;
    };
    spouse: {
      _401k: number;
      _401kEmployerMatch: number;
    };
  };

  constructor(householdInput: HouseholdInput) {
    const { user = {}, spouse = {}, flags, startDate } = householdInput;

    this.flags = flags;
    this.time = new Time(startDate);

    const married = Object.keys(spouse).length > 0;
    this.user = new Person({
      ...user,
      flags,
      type: "user",
      time: this.time,
      married,
    });

    // spouse is just a prop for easier combined accounts, check this.married for filing status
    this.spouse = new Person({
      ...spouse,
      flags,
      type: "spouse",
      time: this.time,
      married,
    });

    this.irs = new IRS({
      user: this.user,
      spouse: this.spouse,
    });

    this.user.init({
      spouse: this.spouse,
      irs: this.irs,
    });
    this.spouse.init({
      spouse: this.user,
      irs: this.irs,
    });

    this.projectSpending();
    this.projectOrdinaryIncome();
    this.projectWithholdings();
    this.projectPreTaxContributions();
    this.projectSocialSecurityIncome();
    this.projectAdditionalIncome();
    this.projectLoanIncomes();
    this.projectMedicalExpenses();
    this.setMainDepositAccount();
  }

  getAccountSnapshots() {
    return [
      ...this.getBankSnapshots(),
      ...this.getInvestmentSnapshots(),
      ...this.getDebtSnapshots(),
    ];
  }

  getStreamSnapshots() {
    return {
      spending: this.getSpendingSnapshots(),
      income: this.getIncomeSnapshots(),
    };
  }

  getAccounts() {
    return [
      ...this.getOpenDebtAccounts(),
      ...this.getOpenBankAccounts(),
      ...this.getOpenGrowthAccounts(),
    ];
  }

  getNextMonthYear() {
    let year, nextMonth;
    if (this.time.month < 11) {
      year = this.time.year;
      nextMonth = this.time.month + 1;
    } else {
      year = this.time.year + 1;
      nextMonth = 0;
    }
    return { year, nextMonth };
  }

  addToNextMonthSpending(amount) {
    const { year, nextMonth } = this.getNextMonthYear();
    this.projectedSpending[year][nextMonth] += amount;
  }

  addToNextMonthAdditionalIncome(amount) {
    const { year, nextMonth } = this.getNextMonthYear();
    this.projectedAdditionalIncome[year][nextMonth] += amount;
  }

  addToNextMonthOrdinaryIncome(amount) {
    const { year, nextMonth } = this.getNextMonthYear();
    this.projectedOrdinaryIncome[year][nextMonth] += amount;
  }

  projectSpending() {
    this.projectedSpending = combineProjections([
      this.user.projectedSpending,
      this.spouse.projectedSpending,
    ]);
  }

  projectOrdinaryIncome() {
    this.projectedOrdinaryIncome = combineProjections([
      this.user.projectedOrdinaryIncome,
      this.spouse.projectedOrdinaryIncome,
    ]);
  }

  projectSocialSecurityIncome() {
    this.projectedSocialSecurityIncome = combineProjections([
      this.user.projectedSocialSecurityIncome,
      this.spouse.projectedSocialSecurityIncome,
    ]);
  }

  projectAdditionalIncome() {
    this.projectedAdditionalIncome = combineProjections([
      this.user.projectedAdditionalIncome,
      this.spouse.projectedAdditionalIncome,
    ]);
  }

  projectLoanIncomes() {
    this.projectedLoanIncome = combineProjections([
      this.user.projectedLoanIncome,
      this.spouse.projectedLoanIncome,
    ]);
  }

  projectMedicalExpenses() {
    this.projectedMedicalExpenses = combineProjections([
      this.user.projectedMedicalExpenses,
      this.spouse.projectedMedicalExpenses,
    ]);
  }

  projectWithholdings() {
    this.projectedIncomeTaxWithheld = combineProjections([
      this.user.projectedIncomeTaxWithheld,
      this.spouse.projectedIncomeTaxWithheld,
    ]);

    this.projectedFICA = combineProjections([
      this.user.projectedFICA,
      this.spouse.projectedFICA,
    ]);
  }

  projectPreTaxContributions() {
    this.projectedPreTaxContributions = combineProjections([
      this.user.projectedPreTaxContribution,
      this.spouse.projectedPreTaxContribution,
    ]);
  }

  getIncomeForMonth() {
    return this.projectedOrdinaryIncome[this.time.year][this.time.month];
  }

  getIncomeTaxWithheldForMonth() {
    return this.projectedIncomeTaxWithheld[this.time.year][this.time.month];
  }

  getPreTaxContributionsForMonth() {
    return this.projectedPreTaxContributions[this.time.year][this.time.month];
  }

  getAdditionalIncomeForMonth() {
    return _.get(
      this,
      `projectedAdditionalIncome[${this.time.year}][${this.time.month}]`,
      0
    );
  }

  getLoanIncomeForMonth() {
    return _.get(
      this,
      `projectedLoanIncome[${this.time.year}][${this.time.month}]`,
      0
    );
  }

  getFICAForMonth() {
    return this.projectedFICA[this.time.year][this.time.month];
  }

  getIncomeTaxWithheldForNextMonth() {
    const { year, nextMonth } = this.getNextMonthYear();
    return this.projectedIncomeTaxWithheld[year][nextMonth];
  }

  getPreTaxContributionsForNextMonth() {
    const { year, nextMonth } = this.getNextMonthYear();
    return this.projectedPreTaxContributions[year][nextMonth];
  }

  getIncomeForNextMonth() {
    const { year, nextMonth } = this.getNextMonthYear();
    return this.projectedOrdinaryIncome[year][nextMonth];
  }

  getSpendingForNextMonth() {
    const { year, nextMonth } = this.getNextMonthYear();
    return this.projectedSpending[year][nextMonth];
  }

  getFICAForNextMonth() {
    const { year, nextMonth } = this.getNextMonthYear();
    return this.projectedFICA[year][nextMonth];
  }

  getIncomeForYear() {
    return _.sum(this.projectedOrdinaryIncome[this.time.year]);
  }

  getFICAForYear() {
    return _.sum(this.projectedFICA[this.time.year]);
  }

  getIncomeTaxWithheldForYear() {
    return _.sum(this.projectedIncomeTaxWithheld[this.time.year]);
  }

  getSocialSecurityIncomeForYear() {
    return _.sum(this.projectedSocialSecurityIncome[this.time.year]);
  }

  // no ss income
  getAnnualIncomeForIncomeTax() {
    return this.getIncomeForYear() - this.getSocialSecurityIncomeForYear();
  }

  getSpendingForMonth() {
    return this.projectedSpending[this.time.year][this.time.month];
  }

  runEvents() {
    [...this.user.events, ...this.spouse.events].forEach((event) => {
      if (event.shouldRun()) {
        event.run({ household: this });
      }
    });
  }
}

export default Household;
