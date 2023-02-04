import Credit from "../accounts/Credit";

const _ = require("lodash");
const { SPENDING_TYPES } = require("../../constants");

/* GETTER FUNCTIONS */
export function getCreditAccountsWithBalances() {
  return [...this.user.credit, ...this.spouse.credit].filter(
    (account) => account.balance > 0 && account.isOpen()
  );
}

export function getLoanAccountsWithBalances() {
  return [...this.user.loans, ...this.spouse.loans].filter(
    (account) => account.balance > 0 && account.isOpen()
  );
}

export function getOpenCreditAccounts() {
  return [...this.user.credit, ...this.spouse.credit].filter((account) =>
    account.isOpen()
  );
}

export function getOpenDebtAccounts() {
  // credit accounts are open even if they have 0 balance
  return [
    ...this.getOpenCreditAccounts(),
    ...this.getLoanAccountsWithBalances(),
  ];
}

export function getOpenDebtAccountsWithBalances() {
  return [
    ...this.getCreditAccountsWithBalances(),
    ...this.getLoanAccountsWithBalances(),
  ];
}

/**
 * returns array of all credit accounts to borrow from in the order to withdraw
 */
export function getCreditAccountsToBorrowFrom() {
  return [...this.user.credit, ...this.spouse.credit].reduce(
    (accounts, account) => {
      const { creditLimit, balance } = account;
      if (creditLimit > balance) {
        accounts.push(account);
        accounts.sort((a, b) => {
          // promotional rate TODO: may change later to sort by how much interest you end up paying over all???
          // do getRate without time for APR without promotional
          const rateA = a.getRate(this.time.year, this.time.month);
          const rateB = b.getRate(this.time.year, this.time.month);
          // sort by lowest rate
          if (rateA === rateB) {
            // then by lowest amount
            return a.balance > b.balance ? 1 : -1;
          }
          return rateA > rateB ? 1 : -1;
        });
      }
      return accounts;
    },
    []
  );
}

/**
 * returns an array of all debt accounts with amount owed in the order they should be paid
 * - note there may be early payment fees
 */
export function getAllDebtOwed() {
  return this.getOpenDebtAccountsWithBalances().reduce((accounts, account) => {
    // sort higest to lowest rate
    accounts.push({ amount: account.balance, account });
    accounts.sort((a, b) => {
      // use APR, not promotional for this rate TODO: may change later to sort by how much interest you end up paying over all???
      const rateA = a.account.getRate(this.time.year, this.time.month);
      const rateB = b.account.getRate(this.time.year, this.time.month);
      // sort by highest rate
      if (rateA === rateB) {
        // then by highest amount
        return a.amount > b.amount ? -1 : 1;
      }
      return rateA > rateB ? -1 : 1;
    });
    return accounts;
  }, []);
}

export function paymentsToAvoidFees() {
  const minimumCreditCardPayments = this.getCreditAccountsWithBalances().map(
    (account: Credit) => {
      return {
        amount: account.getMinimumPayment(this.time.year, this.time.month),
        account,
        paymentType: "minimum credit payment",
      };
    }
  );

  const fixedRateLoanPayments = this.getLoanAccountsWithBalances().map(
    (account) => {
      return {
        amount: account.monthlyPayment,
        account,
        paymentType: "fixed rate loan payment",
      };
    }
  );

  const creditCollectingInterest = this.getCreditAccountsWithBalances().reduce(
    (collectingInterest, account) => {
      const rate = account.getRate(this.time.year, this.time.month);
      if (rate) {
        collectingInterest.push({
          amount:
            account.balance -
            account.getMinimumPayment(this.time.year, this.time.month),
          account,
          paymentType: "credit collecting interest",
        });
        collectingInterest.sort((a, b) => {
          const rateA = a.account.getRate(this.time.year, this.time.month);
          const rateB = b.account.getRate(this.time.year, this.time.month);
          // sort by highest rate
          if (rateA === rateB) {
            // then by highest amount
            return a.amount > b.amount ? -1 : 1;
          }
          return rateA > rateB ? -1 : 1;
        });
      }
      return collectingInterest;
    },
    []
  );

  return {
    minimumCreditCardPayments,
    fixedRateLoanPayments,
    creditCollectingInterest,
  };
}

export function makePayment(avail = 0, orderedPayments = []) {
  let available = avail;
  const actions = [];
  for (const { amount, account, paymentType } of orderedPayments) {
    if (!available) {
      break;
    }
    const toPay = available > amount ? amount : available;
    const action = account.makePayment(toPay);
    if (paymentType) {
      action.paymentType = paymentType;
    }
    actions.push(action);
    available -= toPay;
  }

  return { actions };
}

export function payAllDebt(amountToPay) {
  const getAllDebtOwed = this.getAllDebtOwed(this.time.year, this.time.month);

  return this.payDebt(getAllDebtOwed, amountToPay);
}

export function getMinimumDebtPayment() {
  const { minimumCreditCardPayments, fixedRateLoanPayments } =
    this.paymentsToAvoidFees();
  return _.sum(
    [...minimumCreditCardPayments, ...fixedRateLoanPayments].map(
      (payment) => payment.amount
    )
  );
}

export function payMinimumDebt(amountToPay) {
  const { minimumCreditCardPayments, fixedRateLoanPayments } =
    this.paymentsToAvoidFees();

  return this.payDebt(
    [...minimumCreditCardPayments, ...fixedRateLoanPayments],
    amountToPay
  );
}

export function payDebtToAvoidFees(amountToPay) {
  const { creditCollectingInterest } = this.paymentsToAvoidFees();

  return this.payDebt([...creditCollectingInterest], amountToPay);
}

export function getFundsToPayDebt() {
  if (this.debtGoal && this.debtPaid) {
    return this.debtGoal - this.debtPaid;
  }
  return this.getBankFunds();
}

export function payManualDebt() {
  const loanPays = this.user.spendings.filter(
    (s) => s.type === SPENDING_TYPES.loanPay && !!s.accountId
  );
  const openDebt = this.getOpenDebtAccountsWithBalances();
  return this.payDebt(
    loanPays.reduce((payments, payment) => {
      const paymentAccount = openDebt.find(
        (d) => d.accountId === payment.accountId
      );
      if (paymentAccount) {
        payments.push({
          amount: payment.amount,
          account: paymentAccount,
        });
      }
      return payments;
    }, [])
  );
}

export function payDebt(orderedPayments = [], amount = 0) {
  const bankFunds = this.getFundsToPayDebt();
  const amountToPay = amount > 0 ? Math.min(bankFunds, amount) : bankFunds;

  const amountNeeded = _.sum(orderedPayments.map((payment) => payment.amount));
  const toWithdraw = Math.min(amountToPay, amountNeeded);

  if (!toWithdraw) {
    return {
      paid: 0,
      paidInFull: true,
      amountNeeded: 0,
      actions: [],
    };
  }

  const { withdrawn, actions: withdrawActions } =
    this.withdrawFromBank(toWithdraw);
  const { actions: paymentActions } = this.makePayment(
    withdrawn,
    orderedPayments
  );

  return {
    paid: withdrawn,
    paidInFull: amountNeeded <= withdrawn,
    amountNeeded,
    actions: [...withdrawActions, ...paymentActions],
  };
}

// whats a better word than "borrow request"
export function makeBorrowRequest(borrowRequest = 0, orderedAccounts = []) {
  let remainingInBorrowRequest = borrowRequest;
  const actions = [];
  for (const account of orderedAccounts) {
    if (!remainingInBorrowRequest) {
      break;
    }
    const action = account.borrow(remainingInBorrowRequest);
    actions.push(action);
    const { amount: amountBorrowed } = action;
    remainingInBorrowRequest -= amountBorrowed;
  }

  return {
    borrowed: borrowRequest - remainingInBorrowRequest,
    actions,
  };
}

export function borrow(amountNeeded) {
  const accountsToBorrowFrom = this.getCreditAccountsToBorrowFrom();
  const { borrowed, actions } = this.makeBorrowRequest(
    amountNeeded,
    accountsToBorrowFrom
  );

  return {
    borrowed,
    actions,
  };
}

export function getDebtSnapshots() {
  return this.getOpenDebtAccounts().map((account) => account.snapshot());
}

export function growDebt() {
  this.getOpenDebtAccountsWithBalances().forEach((account) =>
    account.grow(this.time.year, this.time.month)
  );
  return this.getDebtSnapshots();
}
