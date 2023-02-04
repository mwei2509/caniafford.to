import Person from "../Person";
import { Flags } from "../types";
import Time from "../Time";

const { v4: uuid } = require("uuid");
const { differenceInMonths, subYears } = require("date-fns");
const { copyObject } = require("../utils");

export interface AccountProps {
  shadowKey: string;
  accountId: string;
  owner: Person;
  name: string;
  type: string;
  openDate: Date;
  balance: number;
}

/**
 * Generates an Account from input information
 * This is the base class that bank/credit/debt/etc extend from
 */
class Account {
  public canWithdrawAmount: Function | undefined;

  originalInputs: AccountProps;

  reportedBalance: number;
  time: Time;
  flags: Flags;

  shadowKey: string;
  accountId: string;
  owner: Person;
  name: string;
  type: string;
  openDate: Date;

  id: string;
  income: number;
  longTermCapitalGains: number;
  withdrawnThisYear: number;
  depositedThisYear: number;
  penaltyAmount: number;
  employerDepositedThisYear: number;

  isBankAccount: boolean;
  autoDeposit: boolean;
  category: string;
  isAsset: boolean;
  isDebt: boolean;

  constructor(props: AccountProps) {
    const { shadowKey, accountId, owner, name, type, openDate, balance } =
      props;

    this.originalInputs = {
      ...props,
      owner: undefined,
    };
    this.reportedBalance = balance; // this does not change
    this.owner = owner;
    this.time = this.owner.time;
    this.flags = this.owner.flags;
    this.shadowKey = shadowKey;
    this.accountId = accountId;
    this.id = uuid();
    this.name = name;
    this.type = type; // usually same as accountType
    this.openDate = openDate ? new Date(openDate) : subYears(new Date(), 1); // if open date is after current date, will need to transfer based on type of account
    this.income = 0;
    this.longTermCapitalGains = 0;
    this.withdrawnThisYear = 0;
    this.depositedThisYear = 0;
  }

  /**
   * Returns a copy of the account
   */
  snapshot() {
    const snapshot: any = {
      originalInputs: this.originalInputs,
    };
    for (const key in this) {
      if (["string", "number", "boolean"].includes(typeof this[key])) {
        snapshot[key] = this[key];
      }
    }

    // mostly for investment accounts
    snapshot.canWithdrawAmount =
      typeof this.canWithdrawAmount === "function"
        ? this.canWithdrawAmount()
        : 0;
    return copyObject(snapshot);
  }

  isOpen() {
    if (this.time.year > this.openDate.getUTCFullYear()) {
      return true;
    }
    if (
      this.time.year === this.openDate.getUTCFullYear() &&
      this.time.month > this.openDate.getUTCMonth()
    ) {
      return true;
    }
    return false;
  }

  /**
   * returns how old the account is
   */
  age() {
    return differenceInMonths(this.time.date, this.openDate) / 12;
  }

  // reset at the beginning of the year
  // as at the end of the year, these are added to income to be taxed
  yearlyReset() {
    this.income = 0;
    this.longTermCapitalGains = 0;
    this.withdrawnThisYear = 0;
    this.depositedThisYear = 0;
    this.penaltyAmount = 0;
    this.employerDepositedThisYear = 0;
  }
}

export default Account;
