import type { HouseholdInput, ScenarioInput, Projection } from "./types";
import createHousehold from "./household";
import runScenario from "./scenarios";
import Simulation from "./simulations/Simulation";

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
  const {
    user = {},
    spouse = {},
    flags = {},
    scenario = {},
  } = runScenario({
    ...inputHousehold,
    scenario: inputScenarios[activeScenarioId],
  });

  /**
   * Create the Household with the household input (after scenarios have been
   * run).  Household includes projection streams
   */
  const household = createHousehold({ user, spouse, flags, startDate });

  /**
   * Simulate monthly actions from start date until projected end date
   */
  const simulation = new Simulation({ household, startDate });
  simulation.run();

  return {
    timestamp: new Date().getTime(),
    alerts: simulation.alerts,
    years: simulation.record,
    flags: simulation.flags,
    streams: simulation.streams,
    accounts: simulation.accounts,
    scenario,
  };
}
