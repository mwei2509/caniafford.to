import simulateJobLoss from "./jobLoss";
import simulateSalaryChange from "./salaryChange";
import simulateAdjustContributions from "./adjustContributions";
import simulateOneTimeExpense from "./oneTimeExpense";

const EVENT_TYPES = {
  jobLoss: "job-loss",
  salaryChange: "salary-change",
  adjustContributions: "adjust-contributions",
  oneTimeExpense: "one-time-expense",
};

function runScenario(context: any = {}) {
  if (!context.scenario || !context.scenario.id) {
    return { ...context, scenario: {} };
  }

  const flags = context.flags; // TODO - may want to copy rather than just reference since we will be mutating these
  const user = context.user;
  const spouse = context.spouse;
  const scenario = context.scenario;

  try {
    runScenarioEvents(scenario, { user, spouse, flags });
    scenario.successful = true;
  } catch (e) {
    scenario.successful = false;
    scenario.errorMsg = JSON.stringify(e);
    console.error(e);
  }

  return {
    user,
    spouse,
    flags,
    scenario,
  };
}

function runScenarioEvents(scenario, { user = {}, spouse = {}, flags = {} }) {
  for (const id in scenario.events) {
    const event = scenario.events[id];
    switch (event.type) {
      case EVENT_TYPES.jobLoss:
        simulateJobLoss(event, { user, spouse, flags });
        break;
      case EVENT_TYPES.salaryChange:
        simulateSalaryChange(event, { user, spouse, flags });
        break;
      case EVENT_TYPES.adjustContributions:
        simulateAdjustContributions(event, { user, spouse, flags });
        break;
      case EVENT_TYPES.oneTimeExpense:
        simulateOneTimeExpense(event, { user, spouse, flags });
        break;
      default:
        throw new Error("Unrecognized event");
    }
  }
}

export default runScenario;
