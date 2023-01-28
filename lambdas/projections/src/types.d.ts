// inputs
export interface UserInput {
  accounts: AccountInput[];
}

export interface AccountInput {}

export interface HouseholdInput {
  user: UserInput;
  spouse?: UserInput;
}

export interface Projection {
  years?: number[];
}

export interface ScenarioInput {}
