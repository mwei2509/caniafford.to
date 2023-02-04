const EVENT_TYPES = {
  openLoan: "open loan",
  openCreditLine: "open credit",
  openBankAccount: "open account",
  fundAccount: "fund account",
  unknown: "unknown",
};

// simulations happen at the beginning of the month
class LifeEvent {
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

  run({ household = {} }) {
    switch (this.type) {
      case EVENT_TYPES.openLoan:
        this.openLoan(household);
        break;
    }
    this.ran = true;
  }

  openLoan(household = {}) {
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
