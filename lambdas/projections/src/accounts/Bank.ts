import Account from "./account";
import { getMonthlyGrowthRate } from "../utils";

/**
 * This is for bank accounts - checking and savings - that have
 * no penalty for withdrawal
 */
class Bank extends Account {
  public balance: number;
  public contributions: number;
  public earnings: number;
  public interestRate: number;
  public accountType: string; // rethink this

  constructor(props) {
    super(props);
    this.setAccountType(props);
  }

  setAccountType({ type, interestRate = 0, balance = 0, contributions = 0 }) {
    this.accountType = type;
    this.category = "depository";
    this.isAsset = true;
    this.autoDeposit = true; // maybe change
    this.isBankAccount = true;
    this.balance = balance;
    this.contributions = contributions || this.balance; // if no contributions listed, assume all of balance is contributions
    this.earnings = this.balance - this.contributions; // interest/growth accrued earnings
    this.interestRate = getMonthlyGrowthRate(interestRate);
    this.canWithdrawAmount = () => this.balance;
  }

  canWithdraw() {
    return this.balance;
  }

  /**
   * This performs a withdrawal
   * @param {number} amount
   * @returns
   */
  doWithdrawal(amount: number): number {
    // withdraw either the amount requested or entire balance, whatever is less
    const amountWithdrawn = Math.min(this.balance, amount);

    // subtract amount withdrawn from balance
    this.balance -= amountWithdrawn;

    // keep track of contribution vs earnings (earnings are taxed)
    if (amountWithdrawn > this.contributions) {
      const withdrawFromEarnings = amountWithdrawn - this.contributions;
      this.contributions = 0;
      this.earnings -= withdrawFromEarnings;
    } else {
      this.contributions -= amountWithdrawn;
    }

    return amountWithdrawn; // amount withdrawn
  }

  deposit(amount: number) {
    const deposited = -this.doWithdrawal(-amount);
    this.depositedThisYear += deposited;

    return {
      type: this.isBankAccount ? "deposit" : "contribution",
      amount: deposited,
      to: this.snapshot(),
    };
  }

  withdraw(amount: number) {
    const withdrawn = this.doWithdrawal(amount);
    this.withdrawnThisYear += withdrawn;

    return {
      type: this.isBankAccount ? "withdrawal" : "distribution",
      amount: withdrawn,
      from: this.snapshot(),
    };
  }

  /**
   * monthly growth
   */
  grow() {
    const yearlyEarnings = this.balance * this.interestRate;

    this.income += yearlyEarnings;
    this.earnings += yearlyEarnings;
    this.balance += yearlyEarnings;
  }
}

export default Bank;
