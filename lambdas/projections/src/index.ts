import type { HouseholdInput, ScenarioInput, Projection } from "./types";
import Household from "./household/class";

type RunProjectionsInput = {
  household: HouseholdInput;
  scenarios: ScenarioInput;
  activeScenarioId: number;
  startDate: Date;
};

/**
 * Entrypoint of projections algorithm
 * @param {RunProjectionsInput}
 * @returns {Projections}
 */
export default function runProjections({
  household: householdInput = { user: { accounts: [] } },
  scenarios = {},
  activeScenarioId,
  startDate = new Date(),
}: RunProjectionsInput): Projection {
  /**
   * Run Scenarios.  Scenarios alters the household input information
   */

  /**
   * Create Household class.  This includes projection streams
   */
  const household = new Household(householdInput);

  /**
   * Simulate monthly actions from start date until projected end date
   */
  return { years: [1] };
}
