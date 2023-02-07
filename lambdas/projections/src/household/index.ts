import { Flags } from "../types";

const Household = require("./index");
const {
  SURPLUS_MINIMUM_BUFFER,
  DEFAULT_SIMULATION_YEARS,
  GENERAL_INFLATION_RATE,
} = require("../constants");
const { getPercent } = require("../utils");

function createHousehold({
  user = {},
  spouse = {},
  flags,
  startDate = new Date(),
}: {
  user: any;
  spouse: any;
  flags: Flags;
  startDate: Date;
}) {
  const {
    debtPayType = null,
    loanEarlyPayoff = false,
    manualDebtPay = false,
    manualDebtGoal = 0,
    emergencyFund = SURPLUS_MINIMUM_BUFFER, // emergency fund to try and always keep on hand as surplus
    percentSurplusToInvest = 0, // the rest will go to pay off loans then stay in the bank
    // TODO ^ later make it explicit per account
    years = DEFAULT_SIMULATION_YEARS,
    filingStatus,
    effectiveTaxRate,
    taxInflationRate = GENERAL_INFLATION_RATE,
    makeHardshipDistributions = false,
    stateProvince = "NY",
  } = flags;

  let updatedPayDebtType = debtPayType;
  let updatedLoanEarlyPayoff = loanEarlyPayoff;
  if (debtPayType) {
    switch (debtPayType) {
      case "manualDebtGoal":
        break;
      case "manualDebtPay":
        break;
      case "project":
        break;
      case "projectWithEarlyLoanPayoff":
        updatedPayDebtType = "project";
        updatedLoanEarlyPayoff = true;
        break;
    }
  } else {
    updatedPayDebtType = manualDebtGoal
      ? "manualDebtGoal"
      : manualDebtPay
      ? "manualDebtPay"
      : "project";
  }

  return new Household({
    user,
    spouse,
    startDate,
    flags: {
      years,
      percentSurplusToInvest: getPercent(percentSurplusToInvest),
      emergencyFund,
      loanEarlyPayoff: updatedLoanEarlyPayoff,
      // project = no payment set, project it
      // manualDebtPay = user is manually setting debt payment, use this amount
      // manualDebtGoal = user has set an amount for paying debt, suggest best allocation
      debtPayType: updatedPayDebtType,
      manualDebtPay,
      manualDebtGoal,
      filingStatus,
      effectiveTaxRate,
      taxInflationRate,
      makeHardshipDistributions,
      stateProvince,
    },
  });
}

export default createHousehold;
