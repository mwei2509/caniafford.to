const { ALERT_LEVEL } = require('../constants');
const { currencyFormat } = require('../utils');

/**
 * withdraw spending - strategy (e.g. smartdraw stuff)
 * @param {number} neededWithdrawal
 */
function withdrawFromBank(neededWithdrawal) {
  const { withdrawn, actions } = this.household.withdrawFromBank(neededWithdrawal);

  return {
    deficit: neededWithdrawal - withdrawn,
    actions,
  };
}

function depositIntoBank(leftoverIncome) {
  const incomeDepositAction = this.household.deposit(leftoverIncome);
  return incomeDepositAction;
}

/**
 * withdraw deficit/where we fell short
 * @param {number} neededAmount
 */
function tryToMeetDeficit(deficit) {
  let remainingWithdrawal = deficit;
  const actions = [];

  if (remainingWithdrawal > 0) {
    // withdraw from retirement accounts (if possible)
    const { withdrawn, actions: withdrawalActions } = this.household.withdrawFromGrowthAccounts(remainingWithdrawal);
    actions.push(...withdrawalActions);
    remainingWithdrawal -= withdrawn;
    if (withdrawn > 0) {
      this.addAlert(
        `Withdrew ${currencyFormat(withdrawn)} from ${withdrawalActions.map(action =>
          action.from.accountType).join(',')}`,
        ALERT_LEVEL.warning
      );
    }
  }

  // make hardship distributions
  if (remainingWithdrawal > 0) {
    const {
      withdrawn,
      actions: hardshipWithdrawalActions,
    } = this.household.makeHardshipWithdrawal(remainingWithdrawal);
    actions.push(...hardshipWithdrawalActions);
    remainingWithdrawal -= withdrawn;
    if (withdrawn > 0) {
      this.addAlert(`Withdrew ${currencyFormat(withdrawn)} as hardship withdrawal`, ALERT_LEVEL.warning);
    }
  }

  // borrow money - let's *not* do this for now
  if (remainingWithdrawal > 0) {
    // TODO: choose strategy later, for now just borrow from credit;
    // if penalty for withdrawing from retirement accounts > interest that will accrue, then borrow money
    // if interest accrued > penalty for withdrawing from retirement accounts, then withdraw from retirement;
    // if gains earned from NOT withdrawing from retirement > interest for borriwing, borrow money
    // const { borrowed, actions: borrowedActions } = this.household.borrow(remainingWithdrawal);
    // actions.push(...borrowedActions);
    // remainingWithdrawal -= borrowed;
    // if (borrowed) {
    //   this.addAlert(`Borrowed ${currencyFormat(borrowed)} from credit accounts`, ALERT_LEVEL.warning);
    // }
  }

  return {
    deficit: remainingWithdrawal,
    actions,
  };
}

module.exports = {
  withdrawFromBank,
  depositIntoBank,
  tryToMeetDeficit,
};
