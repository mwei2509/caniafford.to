import Household from "./household/Household";
import Person from "./Person";
import Time from "./Time";

const EVENT_TYPES = {
  openLoan: "open loan",
  openCreditLine: "open credit",
  openBankAccount: "open account",
  fundAccount: "fund account",
  unknown: "unknown",
};

// simulations happen at the beginning of the month
class LifeEvent {
  public owner: Person;
  public time: Time;
  public type: string;
  public dateToRun: Date;
  public ran: boolean;
  public accountToOpen: any;

  constructor(props) {
    const { type, dateToRun, owner, accountToOpen } = props;

    this.owner = owner;
    this.time = owner.time;
    this.type = type;
    this.dateToRun = new Date(dateToRun);
    this.ran = false;
    this.accountToOpen = accountToOpen;
  }

  shouldRun() {
    if (this.ran) {
      return false;
    }
    if (
      this.time.year === this.dateToRun.getUTCFullYear() &&
      this.time.month === this.dateToRun.getUTCMonth()
    ) {
      return true;
    }
    return false;
  }

  run({ household }: { household: Household }) {
    switch (this.type) {
      case EVENT_TYPES.openLoan:
        this.openLoan(household);
        break;
    }
    this.ran = true;
  }

  openLoan(household: Household) {
    if (!this.accountToOpen) {
      console.error("no account to open");
      return;
    }
    const loanAmount = this.accountToOpen.principle;
    this.accountToOpen.balance += loanAmount;
    household.projectedLoanIncome[this.time.year][this.time.month] +=
      loanAmount;
  }
}

export default LifeEvent;
