import {
  getCents,
  getMonthlyInterestFee,
  endOfMonth,
  getPercent,
} from "../utils";
import { isBefore } from "date-fns";
import Debt from "./Debt";
import { DEFAULT_MINIMUM_PERCENTAGE } from "../constants";

/**
 * This is a Credit Card Account
 */
class Credit extends Debt {
  public promoAPR: number;
  public APR: number;
  public APRStartDate: Date;
  public creditLimit: number;
  public minimumPaymentPercentage: number;
  public minimumPayment: number;

  constructor(props) {
    super(props);
    this.setAccountType(props);
  }

  setAccountType({
    promoAPR = 0,
    APR = 20,
    APRStartDate,
    creditLimit = 10000,
    minimumPaymentPercentage = DEFAULT_MINIMUM_PERCENTAGE,
  }) {
    this.accountType = "credit";
    this.promoAPR = promoAPR;
    this.APR = APR;
    this.APRStartDate = APRStartDate ? new Date(APRStartDate) : new Date();
    this.creditLimit = creditLimit;
    this.minimumPaymentPercentage = getPercent(minimumPaymentPercentage);

    this.getRate = (year = 0, month = 0) => {
      const asOfDate = year ? endOfMonth(year, month) : this.APRStartDate;
      if (isBefore(asOfDate, this.APRStartDate)) {
        return getMonthlyInterestFee(this.promoAPR);
      }
      return getMonthlyInterestFee(this.APR);
    };
  }

  getMinimumPayment(year: number, month: number) {
    const flat = this.balance < 35 ? this.balance : 35; // not all banks
    const financeCharge =
      this.getMonthlyInterest(year, month) +
      this.minimumPaymentPercentage * this.balance;
    this.minimumPayment = getCents(financeCharge > flat ? financeCharge : flat);
    return this.minimumPayment;
  }

  // can only borrow against credit??
  borrow(amount: number) {
    let borrowed = 0;
    const newBalance = this.balance + amount;
    if (newBalance <= this.creditLimit) {
      // if new balance would be less than credit limit, borrow it all
      this.balance = newBalance;
      borrowed = amount;
    } else {
      const canBorrow = this.creditLimit - this.balance;
      this.balance = this.creditLimit;
      borrowed = canBorrow;
    }

    return {
      type: "borrow",
      amount: borrowed,
      to: this.snapshot(),
    };
  }
}

export default Credit;
