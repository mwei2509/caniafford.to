export const TaxableAccountTypes = {
  brokerage: "brokerage",
  ugma: "ugma",
  utma: "utma",
};

// Accounts an employer opens for you
export const EmployerRetirementAccountTypes = {
  _401k: "401k",
  _403b: "403b",
  _401a: "401a",
  roth401k: "Roth 401k",
};

// Accounts you open on your own
export const PersonalRetirementAccountTypes = {
  rothIra: "Roth IRA",
  traditional: "Traditional IRA",
};

export const UntaxedAccountTypes = {
  hsa: "Health Savings Account",
};

export const IRA_WITHDRAWAL_RULES = [
  EmployerRetirementAccountTypes._401k,
  EmployerRetirementAccountTypes._403b,
  EmployerRetirementAccountTypes._401a,
  PersonalRetirementAccountTypes.traditional,
];

export const ROTH_WITHDRAWAL_RULES = [
  EmployerRetirementAccountTypes.roth401k,
  PersonalRetirementAccountTypes.rothIra,
];

// TAXABLE investment accounts
export const TAXABLE_INVESTMENT_ACCOUNTS = [
  TaxableAccountTypes.brokerage,
  TaxableAccountTypes.ugma,
  TaxableAccountTypes.utma,
];

export const ROTH_TYPES = [
  PersonalRetirementAccountTypes.rothIra,
  EmployerRetirementAccountTypes.roth401k,
];

export const IRA_OR_401K_TYPES = [
  PersonalRetirementAccountTypes.traditional,
  EmployerRetirementAccountTypes._403b,
  EmployerRetirementAccountTypes._401k,
  EmployerRetirementAccountTypes._401a,
];

// const DISTRIBUTIONS_NOT_TAXED_ACCOUNT_TYPES = [
//   ...ROTH_TYPES
// ];

// // Accounts that tax when you take distributions
// const DISTRIBUTIONS_TAXED_ACCOUNT_TYPES = [
//   ...IRA_OR_401K_TYPES
// ];

// // contributions are auto-taken out of pre-tax paycheck
// const EMPLOYER_PRETAX_CONTRIBUTIONS = [
//   EmployerRetirementAccountTypes._401k,
//   EmployerRetirementAccountTypes._403b,
//   EmployerRetirementAccountTypes._401a
// ];

// // contributions are auto-taken out of post tax paycheck
// const EMPLOYER_POSTTAX_CONTRIBUTIONS = [
//   EmployerRetirementAccountTypes.roth401k
// ];

// contributions are made with post-tax dollars
export const SELF_POST_TAX_CONTRIBUTIONS = [
  PersonalRetirementAccountTypes.rothIra,
  PersonalRetirementAccountTypes.traditional,
];

// // contributions are tax deductible
// // https://www.irs.gov/retirement-plans/ira-deduction-limits
// export const TAX_DEDUCTIBLE_POST_TAX_CONTRIBUTIONS = [
//   PersonalRetirementAccountTypes.traditional // if no retirement plan at work
// ];

// export const NON_TAX_DEDUCTIBLE_POST_TAX_CONTRIBUTIONS = [
//   PersonalRetirementAccountTypes.rothIra
// ];

// has contribution limits
export const HAS_CONTRIBUTION_LIMITS = [
  PersonalRetirementAccountTypes.rothIra,
  PersonalRetirementAccountTypes.traditional,
  EmployerRetirementAccountTypes._403b,
  EmployerRetirementAccountTypes._401k,
  PersonalRetirementAccountTypes.traditional,
];

export const EMPLOYER_RETIREMENT_PLANS = Object.values(
  EmployerRetirementAccountTypes
);
export const INDIVIDUAL_RETIREMENT_PLAN = Object.values(
  PersonalRetirementAccountTypes
);
