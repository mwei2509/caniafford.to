import createHousehold from "../household";
import { copyObject } from "../utils";
import { addWeeks, isAfter } from "date-fns";
import shortid from "shortid";

export default function simulateJobLoss(scenario, inputs) {
  const {
    estimateUnemployment = true,
    knownUnemployment = false,
    incomeLost = "",
    jobLossDate: jobLossDateFmt = new Date(),
  } = scenario;

  const jobLossDate = new Date(jobLossDateFmt);

  let person = "";
  let incomeFound = false;
  for (const income of inputs.user.incomes || []) {
    if (incomeLost === income.shadowKey) {
      incomeFound = true;
      person = "user";

      // give it an end date IF it has no end date (is current) OR the end date
      // is after projected job loss date
      if (!income.endDate || isAfter(income.endDate, jobLossDate)) {
        income.endDate = jobLossDate;
      }
    }
  }

  if (!incomeFound) {
    for (const income of inputs.spouse.incomes || []) {
      if (incomeLost === income.shadowKey) {
        incomeFound = true;
        person = "spouse";

        // give it an end date IF it has no end date (is current) OR the end date
        // is after projected job loss date
        if (!income.endDate || isAfter(income.endDate, jobLossDate)) {
          income.endDate = jobLossDate;
        }
      }
    }
  }

  // estimate unemployment benefits
  let unemploymentIncome = knownUnemployment;
  if (estimateUnemployment) {
    unemploymentIncome = estimateUnemploymentBenefits(
      jobLossDate,
      person,
      inputs
    );
  }

  if (unemploymentIncome) {
    // add unemployment benefits to income
    inputs[person].incomes.push(unemploymentIncome);
  }

  return inputs;
}

function estimateUnemploymentBenefits(jobLossDate, person, inputs) {
  // create a household to do projections
  const household = createHousehold(copyObject(inputs));
  const { eligible, weeklyBenefit } = household.irs.calculateUnemployment(
    jobLossDate,
    person
  );

  if (!eligible) {
    return false;
  }

  const startDate = jobLossDate;
  const endDate = addWeeks(jobLossDate, 26);

  const unemploymentIncome = {
    shadowKey: shortid(),
    type: "unemployment",
    description: "unemployment benefits",
    startDate,
    endDate,
    amount: weeklyBenefit,
    rate: "weekly",
    isTakeHome: false,
  };

  return unemploymentIncome;
}

// potentially weird states: "AK","CT","IL","IA" ,"ME", "MD", "MA","MI","NJ","NM","OH","PA","TN","RI"
