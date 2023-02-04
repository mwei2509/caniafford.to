import type { Flags } from "./types";
import Time from "./Time";
import IRS from "./irs/Irs";
import Income from "./streams/income";
import Spending from "./streams/spending";
import LifeEvent from "./LifeEvent";
import Account from "./accounts/account";
import { ProjectionStreamType } from "./streams/streamItem";

import Investment from "./accounts/Investment";
import Loan from "./accounts/Loan";
import Credit from "./accounts/credit";
import { differenceInMonths, subYears } from "date-fns";
import { DEFAULT_AGE } from "./constants";
import {
  combineStreamProjections,
  createEmptyProjection,
  createProjection,
} from "./streams/projections";
import { SPENDING_TYPES } from "./streams/types";
import Bank from "./accounts/Bank";

class Person {
  public married: boolean;
  public flags: Flags;
  public time: Time;
  public dateOfBirth: Date;
  public spouse: Person;
  public irs: IRS;
  public incomes: Income[];
  public spendings: Spending[];
  public events: LifeEvent[];
  public accounts: (Investment | Bank | Credit | Loan)[];
  public investmentAccounts: Investment[];

  public type: string;
  public bankAccounts: Bank[];
  public credit: Credit[];
  public loans: Loan[];

  // streams
  public projectedIncomeTaxWithheld: ProjectionStreamType;
  public projectedSpending: ProjectionStreamType;
  public projectedOrdinaryIncome: ProjectionStreamType;
  public projectedSocialSecurityIncome: ProjectionStreamType;
  public projectedAdditionalIncome: ProjectionStreamType;
  public projectedLoanIncome: ProjectionStreamType;
  public projectedMedicalExpenses: ProjectionStreamType;
  public projectedFICA: ProjectionStreamType;
  public projectedPreTaxContribution: ProjectionStreamType;

  constructor(props) {
    const {
      incomes = [],
      spendings = [],
      investmentAccounts = [],
      bankAccounts = [],
      loans = [],
      credit = [],
      events = [], // future events
      dateOfBirth,
      type = "user", // will be 'spouse' if spouse
      flags = {},
      time = {},
      married = false,
    } = props;

    this.married = married;
    this.flags = flags;
    this.time = time;
    this.type = type;
    this.dateOfBirth = dateOfBirth
      ? new Date(dateOfBirth)
      : subYears(new Date(), DEFAULT_AGE);
    this.incomes = incomes;
    this.spendings = spendings;
    this.bankAccounts = bankAccounts;
    this.investmentAccounts = investmentAccounts;
    this.loans = loans;
    this.credit = credit;
    this.events = events;
    this.accounts = [];
    this.setUpEmployerPlans();
  }

  init({ spouse, irs }: { spouse: Person; irs: IRS }) {
    this.spouse = spouse;
    this.irs = irs;

    this.incomes = this.incomes.map(
      (income) => new Income({ ...income, user: this })
    );
    this.spendings = this.spendings.map(
      (spending) =>
        new Spending({
          ...spending,
          amount: Number(spending.amount),
          user: this,
        })
    );

    this.bankAccounts = this.bankAccounts.map(
      (account) => new Bank({ ...account, owner: this })
    );
    this.investmentAccounts = this.investmentAccounts.map(
      (account) => new Investment({ ...account, owner: this })
    );
    this.loans = this.loans.map((loan) => new Loan({ ...loan, owner: this }));
    this.credit = this.credit.map(
      (credit) => new Credit({ ...credit, owner: this })
    );
    this.events = this.events.map(
      (simulation) => new LifeEvent({ ...simulation, owner: this })
    );

    this.accounts = [
      ...this.bankAccounts,
      ...this.investmentAccounts,
      ...this.loans,
      ...this.credit,
    ];

    this.projectSpending();
    this.projectOrdinaryIncome();
    this.projectWithholdings();
    this.projectSocialSecurityIncome();
    this.projectAdditionalIncome();
    this.projectLoanIncomes();
    this.projectPreTaxContributions();
    this.projectMedicalExpenses();
  }

  setUpEmployerPlans() {
    // transfer props from investmentAccounts to Incomes
    /*
        _401kContributingMax = false,
    _401kEmployerContributingMax = false,
    _401kContributionAmount = 0,
    _401kEmployerMatchAmount = 0,
    _401kContributionRate = 'monthly',
    _401kIncomeKey = ''
    */
    this.investmentAccounts.forEach((account) => {
      if (account._401kIncomeKey) {
        // TODO: this needs to change to be moneyFlowId for logged in users
        const income = this.incomes.find((income) => {
          if (income.moneyFlowId) {
            return income.moneyFlowId === account._401kIncomeKey;
          }
          return income.shadowKey === account._401kIncomeKey;
        });
        if (income) {
          income._401kContributingMax = account._401kContributingMax;
          income._401kEmployerContributingMax =
            account._401kEmployerContributingMax;
          income._401kContributionAmount = account._401kContributionAmount;
          income._401kEmployerMatchAmount = account._401kEmployerMatchAmount;
          income._401kContributionRate = account._401kContributionRate;
          income._401kAccountKey = account.shadowKey;
        }
      }
    });
  }

  age() {
    return differenceInMonths(this.time.date, this.dateOfBirth) / 12;
  }

  projectSpending() {
    this.projectedSpending = combineStreamProjections([
      createEmptyProjection(),
      ...this.spendings.filter((spending) => spending.type !== "loan_pay"),
    ]);
  }

  projectOrdinaryIncome() {
    this.projectedOrdinaryIncome = combineStreamProjections([
      createEmptyProjection(),
      ...this.incomes,
    ]);
  }

  projectSocialSecurityIncome() {
    const socialSecurity =
      this.incomes.find(({ type }) => type === "socialSecurity") ||
      createEmptyProjection(); // TODO: defaults
    this.projectedSocialSecurityIncome = combineStreamProjections([
      createEmptyProjection(),
      socialSecurity,
    ]);
  }

  projectAdditionalIncome() {
    this.projectedAdditionalIncome = combineStreamProjections([
      createEmptyProjection(),
    ]);
  }

  projectLoanIncomes() {
    this.projectedLoanIncome = combineStreamProjections([
      createEmptyProjection(),
    ]);
  }

  projectWithholdings() {
    this.projectedIncomeTaxWithheld = combineStreamProjections([
      createEmptyProjection(),
      ...this.incomes.map(({ incomeTaxWithheld }) => {
        return { projection: incomeTaxWithheld };
      }),
    ]);

    this.projectedFICA = combineStreamProjections([
      createEmptyProjection(),
      ...this.incomes.map(({ ficaWithheld }) => {
        return { projection: ficaWithheld };
      }),
    ]);
  }

  projectPreTaxContributions() {
    this.projectedPreTaxContribution = combineStreamProjections([
      createEmptyProjection(),
      ...this.incomes.map(({ preTaxContributions }) => {
        return { projection: preTaxContributions };
      }),
    ]);
  }

  projectMedicalExpenses() {
    this.projectedMedicalExpenses = combineStreamProjections([
      createEmptyProjection(),
      ...this.spendings.filter(
        (spending) => spending.type === SPENDING_TYPES.medicalExpense
      ),
    ]);
  }

  isEmployed() {}

  amountExemptFromAdditionalTax() {}
}

export default Person;
