import Account from "./Account";
import { getCents } from "../utils";

/**
 * These are debt accounts, from which Credit and Loans are extended
 */
class Debt extends Account {
  public getRate: Function;
  public balance: number;
  public interest: number;
  public totalPaid: number;
  public totalInterestPaid: number;
  public accountType: string;

  constructor(props) {
    super(props);
    this.setupAccount(props);
  }

  setupAccount({
    balance = 0,
    interest = 0, // current interest
  }) {
    this.balance = this.isOpen() ? balance : 0;
    this.isDebt = true;
    this.category = "debt";
    this.interest = interest;
    this.totalPaid = 0; // running total paid
    this.totalInterestPaid = 0; // running total of interest paid
  }

  // order of repayment is to pay interest first > then principle
  getMonthlyInterest(year: number, month: number) {
    return getCents(this.getRate(year, month) * this.balance);
  }

  // end of month - balance accrues interest
  grow(year: number, month: number) {
    this.interest += this.getMonthlyInterest(year, month); // this is just to keep track of what is interest, to see principle paid, subtract from balance
    this.balance = this.balance + this.interest;
  }

  /**
   * Makes a payment to debt account
   * @param {number} payment
   * @returns
   */
  makePayment(payment: number) {
    let paid = 0;
    if (payment > this.balance) {
      // paid in full
      paid = this.balance;
      this.totalInterestPaid += this.interest;
      this.balance = 0;
      this.interest = 0;
    } else {
      // adjust balance & interest from payment
      paid = payment;
      this.balance = this.balance - payment;
      if (paid > this.interest) {
        this.totalInterestPaid += this.interest;
        this.interest = 0;
      } else {
        this.interest -= paid;
        this.totalInterestPaid += paid;
      }
    }

    this.totalPaid += paid;
    return {
      type: "debt-pay",
      amount: payment,
      to: this.snapshot(),
    };
  }
}

export default Debt;
