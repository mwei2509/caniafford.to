// time
export const WEEKS_PER_MONTH = 4.34524;
export const MONTHS_PER_YEAR = 12;

// inflation rates
export const GENERAL_INFLATION_RATE = 2;
// GROWTH_RATE_STOCK = 0.056;
export const GROWTH_RATE_STOCK = 10;
// INTEREST_RATE_BOND = 0.031
export const INTEREST_RATE_BOND = 2.9;

export const PERCENT_STOCKS = 0.6; // TODO = make this variable
export const AVG_COST_BASIS = 1;
export const LATEST_STOCK_PRICE = 1;
export const LATEST_BOND_PRICE = 1;
export const DEFAULT_MINIMUM_PERCENTAGE = 1;
export const EARLY_WITHDRAWAL_PENALTY = 10;

// percentage of zero growth accounts to transfer into growth accounts
export const PERCENTAGE_TO_TRANSFER_TO_GROWTH = 75;
export const SURPLUS_MINIMUM_BUFFER = 100;

export const DEFAULT_SIMULATION_YEARS = 10;

// limits
export const ROTH_OVER_50_LIMIT = 6500;
export const ROTH_UNDER_50_LIMIT = 5500;

export const DEFAULT_AGE = 25; // default start age

export const ALERT_LEVEL = {
  notice: "notice",
  warning: "warning",
  severe: "severe",
};

export const ACCOUNT_TYPES = {
  debt: "debt",
  savings: "savings",
  investment: "investment",
};

export const BANK_ACCOUNT_TYPES = {
  checkings: "checkings",
  savings: "savings",
  cd: "cd",
  moneyMarket: "money market",
};

export const DEBT_TYPES = {
  credit: "credit",
  loan: "loan",
  "personal loan": "loan",
};

export const INVESTMENT_ACCOUNT_TYPES = {
  ira: "Traditional IRA",
  roth401k: "Roth 401k",
  rothIra: "Roth IRA",
  _401a: "401a",
  _401k: "401k",
  brokerage: "brokerage",
  ugma: "ugma",
  utma: "utma",
};

export const LOAN_TYPES = {
  personal: "personal loan",
};

export const CREDIT_CARD_TYPES = {
  credit: "credit",
};

export const INCOME_TYPES = {
  salary: "salary",
  unemployment: "unemployment",
  // additional: 'additional',
  // socialSecurity: 'ss'
};

export const SCENARIO_EVENT_TYPES = {
  jobLoss: "job-loss",
  salaryChange: "salary-change",
  oneTimeExpense: "one-time-expense",
  openLoan: "open-loan",
  adjustContributions: "adjust-contributions",
  spendingChange: "Spending Change",
};

export const SPENDING_TYPES = {
  bill: "bill",
  medicalExpense: "medical",
  homePurchase: "home_purchase",
  loanPay: "loan_pay",
};

export const FREQUENCY = {
  annually: "annually",
  monthly: "monthly",
  weekly: "weekly",
  biMonthly: "bi-monthly",
};

export const MONEY_FLOW_TYPES = {
  spending: "spending",
  income: "income",
  loanPay: "loan_pay",
};

export const allStateProvinces = [
  "AL",
  "AZ",
  "AK",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

export const TASK_TYPES = {
  updateAccountBalance: "updateAccountBalance",
};
