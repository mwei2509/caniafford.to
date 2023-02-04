export const iraContributionLimits = {
  2018: [
    [50, 5500],
    [Number.MAX_SAFE_INTEGER, 6500],
  ],
  2019: [
    // max age, contribution
    [50, 6000],
    [Number.MAX_SAFE_INTEGER, 7000],
  ],
  2020: [
    [50, 6000],
    [Number.MAX_SAFE_INTEGER, 7000],
  ],
  2021: [
    [50, 6000],
    [Number.MAX_SAFE_INTEGER, 7000],
  ],
  2022: [
    [50, 6000],
    [Number.MAX_SAFE_INTEGER, 7000],
  ],
  // not updated
  2023: [
    [50, 6500],
    [Number.MAX_SAFE_INTEGER, 7000],
  ],
  2024: [
    [50, 6000],
    [Number.MAX_SAFE_INTEGER, 7000],
  ],
};

export const _401kContributionLimits = {
  2019: {
    employee: 19000,
    catchup: 6000,
    combined: 56000,
  },
  2020: {
    employee: 19500,
    catchup: 6500,
    combined: 57000,
  },
  2021: {
    employee: 19500,
    catchup: 6500,
    combined: 58000,
  },
  2022: {
    employee: 20500,
    catchup: 6500,
    combined: 61000,
  },
  2023: {
    employee: 22500,
    catchup: 7500,
    combined: 61000,
  },
  // not updated
  2024: {
    employee: 20500,
    catchup: 6500,
    combined: 61000,
  },
};

export const HSAContributionLimits = {
  2020: {
    single: 3550,
    marriedFilingJointly: 7100,
    marriedFilingSeparately: 3550,
    headOfHousehold: 7100,
  },
  2021: {
    single: 3600,
    marriedFilingJointly: 7200,
    marriedFilingSeparately: 3600,
    headOfHousehold: 7200,
  },
  2022: {
    single: 3650,
    marriedFilingJointly: 7300,
    marriedFilingSeparately: 3650,
    headOfHousehold: 7300,
  },
  // not updated
  2023: {
    single: 3650,
    marriedFilingJointly: 7300,
    marriedFilingSeparately: 3650,
    headOfHousehold: 7300,
  },
  2024: {
    single: 3650,
    marriedFilingJointly: 7300,
    marriedFilingSeparately: 3650,
    headOfHousehold: 7300,
  },
  2025: {
    single: 3650,
    marriedFilingJointly: 7300,
    marriedFilingSeparately: 3650,
    headOfHousehold: 7300,
  },
  2026: {
    single: 3650,
    marriedFilingJointly: 7300,
    marriedFilingSeparately: 3650,
    headOfHousehold: 7300,
  },
};

/**
 * If the amount you can contribute must be reduced, figure your reduced contribution limit as follows.

Start with your modified AGI.
Subtract from the amount in (1):
$196,000 if filing a joint return or qualifying widow(er),
$-0- if married filing a separate return, and you lived with your spouse at any time during the year, or
$124,000 for all other individuals.
Divide the result in (2) by $15,000 ($10,000 if filing a joint return, qualifying widow(er), or married filing a separate return and you lived with your spouse at any time during the year).
Multiply the maximum contribution limit (before reduction by this adjustment and before reduction for any contributions to traditional IRAs) by the result in (3).
Subtract the result in (4) from the maximum contribution limit before this reduction. The result is your reduced contribution limit.

 */

export function getIraContributionLimitsWithDeductions(
  userType = "user",
  magi
) {
  let subtractions = 124000;
  let divideBy = 15000;
  if (this.filingStatus === "marriedFilingJointly") {
    subtractions = 196000;
    divideBy = 10000;
  } else if (this.filingStatus === "marriedFilingSeparately") {
    subtractions = 0;
    divideBy = 10000;
  }

  const reducedAgi = magi - subtractions;
  const reductionRate = reducedAgi / divideBy;
  const contributionLimit = this.getIraContributionLimits(userType);
  const reduction = contributionLimit * reductionRate;
  const reducedContributionLimit = contributionLimit - reduction;
  return reducedContributionLimit;
}

export function getRothContributionLimits(userType = "user", taxableIncome) {
  const magi = this.getMAGI(taxableIncome);

  const rothContributionLimits = {
    2020: {
      marriedFilingJointly: [
        [196000, () => this.getIraContributionLimits(userType)],
        [
          206000,
          () => this.getIraContributionLimitsWithDeductions(userType, magi),
        ], // with deductions
        [Number.MAX_SAFE_INTEGER, () => 0],
      ],
      single: [
        [124999, () => this.getIraContributionLimits(userType)],
        [
          139000,
          () => this.getIraContributionLimitsWithDeductions(userType, magi),
        ],
        [Number.MAX_SAFE_INTEGER, () => 0],
      ],
      marriedFilingSeparately: [
        [
          10000,
          () => this.getIraContributionLimitsWithDeductions(userType, magi),
        ],
        [Number.MAX_SAFE_INTEGER, () => 0],
      ],
    },
  };

  const rothLimits = rothContributionLimits[2020][this.filingStatus];

  for (const [maxMAGI, limit] of rothLimits) {
    if (magi < maxMAGI) {
      // TODO - think of inflation for max and limits
      return limit(userType, magi);
    }
  }
}

/**
 * get total ira contribution limit for user or spouse
 * @param {string} userType user | spouse
 */
export function getIraContributionLimits(userType = "user") {
  const age = this[userType].age();
  const limits = iraContributionLimits[2020]; // TODO: solve for changing years
  for (const [maxAge, limit] of limits) {
    if (age < maxAge) {
      return limit;
    }
  }
}

export function get401kContributionLimits(userType = "user") {
  return {
    _401k: _401kContributionLimits[2020].employee, // TODO: solve for changing years
    _401kCombined: _401kContributionLimits[2020].combined, // TODO: solve for changing years
  };
}

export function getHSAContributionLimits() {
  return HSAContributionLimits[2020][this.filingStatus]; // TODO: solve for changing years
}
