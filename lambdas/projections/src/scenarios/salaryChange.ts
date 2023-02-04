import { isAfter, addDays } from "date-fns";
import shortid from "shortid";

export default function simulateSalaryChange(scenario, inputs) {
  const {
    oldIncome = "",
    isTakeHome = false,
    newSalaryAmount = 0,
    rate = "monthly",
    salaryChangeDate: salaryChangeDateFmt = new Date(),
  } = scenario;

  const salaryChangeDate = new Date(salaryChangeDateFmt);

  // end old income
  let person = "";
  let incomeFound = false;
  for (const income of inputs.user.incomes || []) {
    if (oldIncome === income.shadowKey) {
      person = "user";
      incomeFound = income;
    }
  }

  if (!incomeFound) {
    for (const income of inputs.spouse.incomes || []) {
      if (oldIncome === income.shadowKey) {
        person = "spouse";
        incomeFound = income;
      }
    }
  }
  // give it an end date IF it has no end date (is current) OR the end date
  // is after projected job loss date
  if (!incomeFound.endDate || isAfter(incomeFound.endDate, salaryChangeDate)) {
    incomeFound.endDate = salaryChangeDate;
    incomeFound.endNotes = ["scenario generated end date"];
  }

  const newIncome = {
    ...incomeFound,
    startDate: addDays(salaryChangeDate, 1),
    endDate: null,
    amount: newSalaryAmount,
    rate,
    isTakeHome,
    shadowKey: shortid(),
    startNotes: ["scenario generated start date"],
    endNotes: [],
  };

  inputs[person].incomes.push(newIncome);
  return inputs;
}

// potentially weird states: "AK","CT","IL","IA" ,"ME", "MD", "MA","MI","NJ","NM","OH","PA","TN","RI"
