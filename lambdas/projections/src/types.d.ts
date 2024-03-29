// inputs
export interface UserInput {
  accounts: AccountInput[];
}

export interface Flags {
  debtPayType: string | null;
  loanEarlyPayoff: boolean;
  manualDebtPay: boolean;
  manualDebtGoal: number;
  emergencyFund: number; // emergency fund to try and always keep on hand as surplus
  percentSurplusToInvest: number; // the rest will go to pay off loans then stay in the bank
  // TODO ^ later make it explicit per account
  years: number;
  filingStatus: string;
  effectiveTaxRate: number;
  taxInflationRate: number;
  makeHardshipDistributions: boolean;
  stateProvince: string;
  makeHardshipDistrubitions?: boolean;
}

export interface AccountInput {}

export interface HouseholdInput {
  user: UserInput;
  spouse?: UserInput;
  flags: Flags;
  startDate: Date;
}

export interface Projection {
  timestamp: number;
  alerts: any;
  years?: any;
  flags: Flags;
  streams: any;
  accounts: any;
  scenario: any;
}

export interface ScenarioInput {}
