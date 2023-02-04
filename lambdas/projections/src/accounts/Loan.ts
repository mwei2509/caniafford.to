import { getCents, getMonthlyInterestFee } from "../utils";
import Debt from "./debt";
import LifeEvent from "../LifeEvent";

class Loan extends Debt {
  public interestRate: number;
  public principle: number;
  public termInMonths: number;
  public monthlyPayment: number;

  constructor(props) {
    super(props);
    this.setAccountType(props);
    this.setUpFutureOpenDate();
    this.getRate = () => getMonthlyInterestFee(this.interestRate);
  }

  setAccountType({
    principle = 0,
    interestRate = 10,
    termInMonths = 36, // 3 years
  }) {
    this.accountType = "loan";
    this.principle = principle;
    this.interestRate = interestRate;
    this.termInMonths = termInMonths;
    this.monthlyPayment = this.getLoanMonthlyPayment();
  }

  setUpFutureOpenDate() {
    this.owner.events.push(
      new LifeEvent({
        type: "open loan",
        dateToRun: this.openDate,
        owner: this.owner,
        accountToOpen: this,
      })
    );
  }

  // for loans
  getLoanMonthlyPayment() {
    // personal loans without rate i guess?
    if (this.interestRate === 0) {
      return 0;
    }
    const rate = this.getRate();
    let factor = 1;
    for (let i = 0; i < this.termInMonths; i++) {
      factor *= rate + 1;
    }
    return getCents((this.principle * factor * rate) / (factor - 1));
  }
}
export default Loan;
