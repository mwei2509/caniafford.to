import { getAllAccounts } from "./accounts";
import type { UserInput, HouseholdInput } from "../types";

export class Household {
  public getAllAccounts = getAllAccounts;

  public user: UserInput;
  public spouse?: UserInput;

  // projection streams
  public projectedLoanIncome;

  /**
   * Constructor
   * @param householdInput
   */
  constructor(householdInput: HouseholdInput) {
    this.user = householdInput.user;
    this.spouse = householdInput.spouse;
  }
}

export default Household;
