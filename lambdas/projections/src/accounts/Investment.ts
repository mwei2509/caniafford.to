const Account = require("./account");
const {
  GROWTH_RATE_STOCK,
  INTEREST_RATE_BOND,
  PERCENT_STOCKS,
  AVG_COST_BASIS,
  LATEST_BOND_PRICE,
  LATEST_STOCK_PRICE,
} = require("../constants");
const { getMonthlyGrowthRate } = require("../utils");

const {
  TaxableAccountTypes,
  TAXABLE_INVESTMENT_ACCOUNTS,
  PersonalRetirementAccountTypes,
  ROTH_WITHDRAWAL_RULES,
  IRA_WITHDRAWAL_RULES,
  ROTH_TYPES,
  IRA_OR_401K_TYPES,
  EMPLOYER_RETIREMENT_PLANS,
  INDIVIDUAL_RETIREMENT_PLAN,
  HSA_ACCOUNT_TYPE,
} = require("./types");

class Investment extends Account {
  constructor(props) {
    super(props);
    this.setAccountType(props);
  }

  setAccountType({
    type,
    interestRateBond = INTEREST_RATE_BOND, // annual
    growthRateStock = GROWTH_RATE_STOCK, // annual
    percentStocks = PERCENT_STOCKS,
    latestStockPrice = LATEST_STOCK_PRICE,
    latestBondPrice = LATEST_BOND_PRICE,
    balance = 0,
    contributions = 0,
    avgCostBasis = 0,
    contributingMaxAllowed = false,
    contributingMaxAmount = 0, // annual
  }) {
    this.category = "growth";
    this.isAsset = true;
    this.isGrowthAccount = true;

    this.accountType = type;

    this.balance = balance;
    // contributions are not taxed upon withdrawal
    this.contributions = contributions || this.balance; // if no contributions listed, assume all of balance is contributions
    // earnings are taxed upon withdrawal
    this.earnings = this.balance - this.contributions; // interest/growth accrued earnings
    this.quantityStocks = balance * percentStocks;
    this.quantityBonds = balance - this.quantityStocks;
    this.percentStocks = percentStocks;
    this.percentBonds = 1 - this.percentStocks;
    this.growthRateStock = getMonthlyGrowthRate(growthRateStock);
    this.interestRateBond = getMonthlyGrowthRate(interestRateBond);
    this.latestStockPrice = latestStockPrice;
    this.latestBondPrice = latestBondPrice;
    this.avgCostBasisOfStock = avgCostBasis
      ? avgCostBasis / latestStockPrice
      : AVG_COST_BASIS;
    this.avgCostBasisOfBond = avgCostBasis
      ? avgCostBasis / latestBondPrice
      : AVG_COST_BASIS;

    // if user says they are currently contributing the max or a specific amount;
    this.contributingMaxAllowed = contributingMaxAllowed;
    this.contributingMaxAmount = contributingMaxAmount; // TODO: may need to issue a warning if this exceeds maximum allowed
  }

  canWithdraw() {
    return this.withdrawOrder() > -1;
  }

  withdrawOrder() {
    if (this.isRothType()) {
      return 0;
    }
    if (this.owner.age() < 59.5) {
      if (this.isBrokerage()) {
        return 1;
      }
      if (this.isIRAor401kType()) {
        return 2;
      }
    } else {
      if (this.isIRAor401kType()) {
        return 1;
      }
      if (this.isBrokerage()) {
        return 2;
      }
    }
    return -1;
  }

  /**
   * returns the amount able to withdraw
   */
  canWithdrawAmount() {
    if (ROTH_WITHDRAWAL_RULES.includes(this.accountType)) {
      return this.canWithdrawRothIRAAmount();
    }
    if (IRA_WITHDRAWAL_RULES.includes(this.accountType)) {
      return this.canWithdrawTraditionalIRAAmount();
    }
    return this.balance;
  }

  isPenaltyWithdrawal() {
    if (this.isIRAor401kType()) {
      if (this.owner.age() < 59.5) {
        return true;
      }
    }
    return false;
  }

  hardshipWithdrawalAmount() {
    if (this.isIRAor401kType() || this.isRothType()) {
      return this.balance;
    }
    return 0;
  }

  canWithdrawTraditionalIRAAmount() {
    if (this.owner.age() < 59.5) {
      return 0;
    }
    return this.balance;
  }

  canWithdrawRothIRAAmount() {
    if (this.owner.age() < 59.5) {
      return this.contributions;
    }
    return this.balance;
  }

  doEmployerDeposit(amount) {
    const deposited = -this.doWithdrawal(-amount, true);
    this.employerDepositedThisYear += deposited;

    return {
      type: "employer-contribution",
      amount: deposited,
      to: this.snapshot(),
    };
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

  doWithdrawal(amount, isEmployerDeposit = false) {
    const priceStock = this.latestStockPrice;
    const priceBond = this.latestBondPrice;

    const totalAvailable =
      this.quantityBonds * priceBond + this.quantityStocks * priceStock;
    const amountWithdrawn = Math.min(totalAvailable, amount);
    const quantityStocksToSell = Math.min(
      (amountWithdrawn * this.percentStocks) / priceStock,
      this.quantityStocks
    );
    const quantityBondsToSell = Math.min(
      (amountWithdrawn * this.percentBonds) / priceBond,
      this.quantityBonds
    );

    this.longTermCapitalGains += this.isBrokerage()
      ? (priceStock - this.avgCostBasisOfStock) * quantityStocksToSell +
        (priceBond - this.avgCostBasisOfBond) * quantityBondsToSell
      : 0;

    this.quantityStocks = this.quantityStocks - quantityStocksToSell;
    this.quantityBonds = this.quantityBonds - quantityBondsToSell;
    this.balance = this.balanceAccount();

    // keep track of contribution vs earnings
    let withdrawFromEarnings = 0;
    if (amountWithdrawn > this.contributions) {
      withdrawFromEarnings = amountWithdrawn - this.contributions;
      this.contributions = 0;
      this.earnings -= withdrawFromEarnings;
    } else {
      // for Roth 401ks, employer deposits are taxed upon withdrawals, so treat them like earnings
      if (isEmployerDeposit) {
        this.earnings -= amountWithdrawn;
      } else {
        this.contributions -= amountWithdrawn;
      }
    }

    // traditional IRA taxes the total amount withdrawn
    // roth taxes the earnings withdrawn
    this.income += this.taxedWithdrawals({
      totalWithdrawn: amountWithdrawn,
      earningsWithdrawn: withdrawFromEarnings,
    });
    this.penaltyAmount += this.isPenaltyWithdrawal() ? amountWithdrawn : 0;

    return amountWithdrawn; // amount withdrawn
  }

  balanceAccount() {
    const newBalance =
      this.quantityBonds * this.latestBondPrice +
      this.quantityStocks * this.latestStockPrice;

    return newBalance < 1 ? 0 : newBalance;
  }

  // end of month accrue interest
  /**
   * monthly growth
   */
  grow() {
    // grow
    const stockPrice = this.latestStockPrice * (1 + this.growthRateStock);
    const bondPrice = this.latestBondPrice * (1 + this.interestRateBond);

    this.income += this.isBrokerage()
      ? this.quantityBonds * this.latestBondPrice * this.interestRateBond
      : 0;

    this.latestStockPrice = stockPrice;
    this.latestBondPrice = bondPrice;
    this.avgCostBasisOfBond = bondPrice; // increase cost basis of bond - re-investing dividents???

    // rebalance
    const oldQuantityStock = this.quantityStocks;
    const oldQuantityBond = this.quantityBonds;
    const currentStockValue = oldQuantityStock * this.latestStockPrice;
    const currentBondValue = oldQuantityBond * this.latestBondPrice;
    const newTotalAccountValue = currentBondValue + currentStockValue;

    const targetStockValue = newTotalAccountValue * this.percentStocks;
    const targetBondValue = newTotalAccountValue * this.percentBonds;

    const additionalStockQuantityNeeded =
      (targetStockValue - currentStockValue) / this.latestStockPrice;
    const additionalBondQuantityNeeded =
      (targetBondValue - currentBondValue) / this.latestBondPrice;

    const oldAvgCostBasisOfBond = this.avgCostBasisOfBond;
    const oldAvgCostBasisOfStock = this.avgCostBasisOfStock;

    this.quantityStocks = oldQuantityStock + additionalStockQuantityNeeded;
    this.quantityBonds = oldQuantityBond + additionalBondQuantityNeeded;

    // snapshot only
    let longTermCapitalGains = 0;
    if (additionalStockQuantityNeeded > 0) {
      this.avgCostBasisOfStock = this.avgCostBasis(
        oldQuantityStock,
        oldAvgCostBasisOfStock,
        additionalStockQuantityNeeded,
        this.latestStockPrice
      );
    } else if (additionalStockQuantityNeeded < 0) {
      longTermCapitalGains += this.isBrokerage()
        ? (this.latestStockPrice - this.avgCostBasisOfStock) *
          Math.abs(additionalStockQuantityNeeded)
        : 0;
    }

    if (additionalBondQuantityNeeded > 0) {
      this.avgCostBasisOfBond = this.avgCostBasis(
        oldQuantityBond,
        oldAvgCostBasisOfBond,
        additionalBondQuantityNeeded,
        this.latestBondPrice
      );
    } else if (additionalBondQuantityNeeded < 0) {
      longTermCapitalGains += this.isBrokerage()
        ? (this.latestBondPrice - this.avgCostBasisOfBond) *
          Math.abs(additionalBondQuantityNeeded)
        : 0;
    }
    this.longTermCapitalGains += longTermCapitalGains;

    const newBalance = this.balanceAccount();
    const earnings = newBalance - this.balance;
    this.earnings += earnings;
    this.balance = newBalance;
  }

  isEmployerPlan() {
    return EMPLOYER_RETIREMENT_PLANS.includes(this.accountType);
  }

  isIndividualPlan() {
    return INDIVIDUAL_RETIREMENT_PLAN.includes(this.accountType);
  }

  isHSA() {
    // may need to check this account type if we ever want to see if a withdrawal is a "qualified" withdrawal
    return HSA_ACCOUNT_TYPE === this.accountType;
  }

  retirementAccountSelfDepositOrder() {
    const DEPOSIT_ORDER = [
      PersonalRetirementAccountTypes.rothIra,
      PersonalRetirementAccountTypes.traditional,
      // TaxableAccountTypes.brokerage
    ];
    return DEPOSIT_ORDER.indexOf(this.accountType);
  }

  taxedWithdrawals({ totalWithdrawn = 0, earningsWithdrawn = 0 }) {
    if (this.isIRAor401kType()) {
      return Math.max(totalWithdrawn, 0);
    }
    if (this.isEarlyRothWithdrawal()) {
      return Math.max(earningsWithdrawn, 0);
    }
    return 0;
  }

  isEarlyRothWithdrawal() {
    if (this.isRothType() && (this.owner.age() < 59.5 || this.age() < 5)) {
      return true;
    }
    return false;
  }

  isBrokerage() {
    return this.accountType === TaxableAccountTypes.brokerage;
  }

  isTaxable() {
    return TAXABLE_INVESTMENT_ACCOUNTS.includes(this.accountType);
  }

  isIRAor401kType() {
    return IRA_OR_401K_TYPES.includes(this.accountType);
  }

  isRothType() {
    return ROTH_TYPES.includes(this.accountType);
  }

  isRothIra() {
    return this.accountType === PersonalRetirementAccountTypes.rothIra;
  }

  isTraditionalIra() {
    return this.accountType === PersonalRetirementAccountTypes.traditional;
  }

  avgCostBasis(oldQuantity, oldAvgCostBasis, additionalQuantity, latestPrice) {
    const dollarsInvested =
      oldQuantity * oldAvgCostBasis + additionalQuantity * latestPrice;
    return dollarsInvested / (oldQuantity + additionalQuantity);
  }
}

export default Investment;
