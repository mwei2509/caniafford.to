import type { Household } from "./Household";

import { sum } from "lodash";
import Bank from "../accounts/Bank";

export function getOpenBankAccounts(this: Household) {
  return [...this.user.bankAccounts, ...this.spouse.bankAccounts].filter(
    (account) => account.isOpen()
  );
}

export function setMainDepositAccount(this: Household) {
  // get deposit account based on
  // autoDeposit true/false
  // and interest rate if any
  // if all else equal, pick account with greater balance
  // belonging to user

  if (this.mainDepositAccount) {
    return this.mainDepositAccount;
  }

  if (this.getOpenBankAccounts().length === 0) {
    // create autoDepositAccount
    this.mainDepositAccount = new Bank({
      type: "checkings",
      balance: 0,
      owner: this.user,
    });
    this.user.bankAccounts.push(this.mainDepositAccount);
    return this.mainDepositAccount;
  }

  this.mainDepositAccount = this.getOpenBankAccounts().sort(
    (accountA, accountB) => {
      // sort by interest rate
      if (accountA.interestRate === accountB.interestRate) {
        // then account with greater balance
        return accountA.balance > accountB.balance ? -1 : 1;
      }
      return accountA.interestRate > accountB.interestRate ? -1 : 1;
    }
  )[0];

  return this.mainDepositAccount;
}

export function deposit(this: Household, amount) {
  return this.mainDepositAccount.deposit(amount);
}

/**
 * Withdraws from withdrawable accounts in the order they should be withdrawn from
 * @param {number} amountToWithdraw
 */
export function withdrawFromBank(this: Household, amountToWithdraw) {
  let withdrawn = 0;
  const actions = [];
  for (const account of this.getWithdrawalBankAccounts()) {
    const action = account.withdraw(amountToWithdraw);
    actions.push(action);
    withdrawn += action.amount;

    if (amountToWithdraw <= withdrawn) {
      break;
    }
  }

  return { withdrawn, actions };
}

/**
 * returns bank accounts in the order they should be withdrawn from
 */
export function getWithdrawalBankAccounts(this: Household) {
  return this.getOpenBankAccounts().reduce((withdrawalAccounts, account) => {
    if (account.balance > 0) {
      withdrawalAccounts.push(account);
      withdrawalAccounts.sort((a, b) => {
        // sort by interest rate (withdraw from lower interest rate first)
        if (a.interestRate === b.interestRate) {
          // then account with lower balance
          return a.balance > b.balance ? 1 : -1;
        }
        return a.interestRate > b.interestRate ? 1 : -1;
      });
    }
    return withdrawalAccounts;
  }, []);
}

export function getBankFunds(this: Household) {
  return sum(
    this.getWithdrawalBankAccounts().map((accounts) => accounts.balance)
  );
}

export function getBankSnapshots(this: Household) {
  const allAccounts = this.getOpenBankAccounts();
  return allAccounts.map((account) => account.snapshot());
}

export function growBank(this: Household) {
  this.getOpenBankAccounts().forEach((account) => account.grow());
  return this.getBankSnapshots();
}
