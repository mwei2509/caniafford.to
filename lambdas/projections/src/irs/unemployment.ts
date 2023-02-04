import { sum } from "lodash";
import stateBenefits from "./data/stateUnemployment";

const statesWithEligibilityCalculator = ["NY"];

export function calculateUnemployment(fileDate, userType = "user") {
  if (!statesWithEligibilityCalculator.includes(this.stateProvince)) {
    return { eligible: false, weeklyBenefit: 0 };
  }

  const lastFiveQuarters = calculateLastFiveQuarters(fileDate);
  const { standard, alternative } = this.calculateBasePeriodWages(
    lastFiveQuarters,
    userType
  );

  let useAlternative = false;
  let eligible = this.determineEligibility(fileDate, standard);
  if (!eligible) {
    eligible = this.determineEligibility(fileDate, alternative);
    if (eligible) {
      useAlternative = true;
    }
  }

  let weeklyBenefit = 0;
  if (eligible) {
    weeklyBenefit = this.getWeeklyBenefit(
      fileDate,
      useAlternative ? alternative : standard
    );
  }

  return { eligible, weeklyBenefit };
}

export function getStateBenefitInfo(fileDate) {
  const year = fileDate.getUTCFullYear();
  const defaultYear = "2020";
  const info = {};
  for (const key in stateBenefits[this.stateProvince]) {
    const value =
      stateBenefits[this.stateProvince][key][year] ||
      stateBenefits[this.stateProvince][key][defaultYear];
    info[key] = value;
  }
  return info;
}

export function determineEligibility(fileDate, basePeriodWages = []) {
  const workedForTwoQuarters =
    basePeriodWages.filter((wages) => wages > 0).length >= 2;
  if (!workedForTwoQuarters) {
    return false;
  }
  const highQuarterWage = Math.max(...basePeriodWages);
  const totalWages = sum(basePeriodWages);
  const { minimumQuarterlyWageRequirements, highWageException } =
    this.getStateBenefitInfo(fileDate);

  if (highQuarterWage < minimumQuarterlyWageRequirements) {
    return false;
  }

  if (highQuarterWage < highWageException) {
    if (totalWages < highQuarterWage * 1.5) {
      return false;
    }
  } else {
    const sumOtherThreePeriodWages = totalWages - highQuarterWage;
    if (sumOtherThreePeriodWages < highWageException / 2) {
      return false;
    }
  }
  return true;
}

export function getWeeklyBenefit(fileDate, basePeriodWages = []) {
  const numQuartersWithWages = basePeriodWages.filter(
    (wages) => wages > 0
  ).length;
  const highQuarterWage = Math.max(...basePeriodWages);

  const { minimumBenefit, midBenefit, maximumBenefit } =
    this.getStateBenefitInfo(fileDate);

  let benefit;
  if (numQuartersWithWages === 4) {
    if (highQuarterWage > 3575) {
      benefit = highQuarterWage / 26;
      if (benefit < 143) {
        benefit = 143;
      }
    } else {
      benefit = highQuarterWage / 25;
      if (benefit < minimumBenefit) {
        benefit = minimumBenefit;
      }
    }
  } else {
    if (highQuarterWage > 4000) {
      const highestTwoQuarters = basePeriodWages.sort();
      const averageHighQuarters =
        (highestTwoQuarters[0] + highestTwoQuarters[1]) / 2;
      benefit = averageHighQuarters / 26;
      if (benefit < midBenefit) {
        benefit = midBenefit;
      }
    } else if (highQuarterWage > 3576) {
      benefit = highQuarterWage / 26;
      if (benefit < midBenefit) {
        benefit = midBenefit;
      }
    } else {
      benefit = highQuarterWage / 25;
      if (benefit < minimumBenefit) {
        benefit = minimumBenefit;
      }
    }
  }

  if (benefit > maximumBenefit) {
    benefit = maximumBenefit;
  }
  return benefit;
}

const YEARLY_QUARTERS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [9, 10, 11],
];

export function getLastQuarter(year, quarter) {
  if (quarter === 0) {
    return {
      year: year - 1,
      quarter: 3,
      months: YEARLY_QUARTERS[3],
    };
  }
  return {
    year,
    quarter: quarter - 1,
    months: YEARLY_QUARTERS[quarter - 1],
  };
}

export function getNumQuartersAgo(year, quarter, numQuarters) {
  const allQuarters = [];

  let lastYear = year;
  let lastQuarter = quarter;

  for (let i = 0; i < numQuarters; i++) {
    const last = getLastQuarter(lastYear, lastQuarter);
    allQuarters.push(last);

    lastYear = last.year;
    lastQuarter = last.quarter;
  }

  return allQuarters;
}

export function calculateLastFiveQuarters(fileDate) {
  const month = fileDate.getUTCMonth();
  const year = fileDate.getUTCFullYear();
  const currentQuarter = YEARLY_QUARTERS.findIndex((quarter) =>
    quarter.includes(month)
  );

  const lastFiveQuarters = getNumQuartersAgo(year, currentQuarter, 5);

  return lastFiveQuarters;
}

export function calculateBasePeriodWages(lastFiveQuarters, userType = "user") {
  const quarterlyWages = lastFiveQuarters.map(({ year, months = [] }) => {
    const person = this[userType];
    const wages = sum(
      months.map((month) => person.projectedOrdinaryIncome[year][month])
    );
    return wages;
  });

  return {
    standard: [
      quarterlyWages[1],
      quarterlyWages[2],
      quarterlyWages[3],
      quarterlyWages[4],
    ],
    alternative: [
      quarterlyWages[0],
      quarterlyWages[1],
      quarterlyWages[2],
      quarterlyWages[3],
    ],
  };
}

// export function calculateRate (a, b, c, d, fileDate, basealt) {
//   var hqMin = 0;
//   if (fileDate < new Date(Date.parse('1/07/2019'))) {
//     hqMin = 2200;
//   } else if (fileDate >= new Date(Date.parse('1/07/2019')) && fileDate < new Date(Date.parse('1/06/2020'))) {
//     hqMin = 2400;
//   } else { // fileDate >= 1/06/2020
//     hqMin = 2600;
//   }

//   var maxRate = 0;
//   var hqMax = 9900;
//   var totalLessHqMax = 4950;
//   if (fileDate < new Date(Date.parse('10/01/2018'))) {
//     maxRate = 435;
//   } else if (fileDate >= new Date(Date.parse('10/01/2018')) && fileDate < new Date(Date.parse('10/07/2019'))) {
//     maxRate = 450;
//   } else { // fileDate >= 10/07/2019
//     maxRate = 504;
//     hqMax = 11088;
//     totalLessHqMax = 5544;
//   }

//   var hq = Math.max(a, b, c, d);
//   var total = a + b + c + d;
//   var earnWeeks = 0;
//   if (a > 0)earnWeeks++;
//   if (b > 0)earnWeeks++;
//   if (c > 0)earnWeeks++;
//   if (d > 0)earnWeeks++;

//   var errMsg = '';

//   if (hq < hqMin) {// If your HQ is at least the miminum ($2,200 for 2018, $2,400 for 2019)
//     if (errMsg.length > 0) {
//       errMsg = errMsg + '<br/>';
//     }
//     errMsg = errMsg + 'You did not have earnings of at least ' + formatMoney(hqMin) + ' in any one calendar quarter';
//   }

//   if (earnWeeks < 2) {
//     if (errMsg.length > 0) {
//       errMsg = errMsg + '<br/>';
//     }
//     errMsg = errMsg + 'You did not work in two or more calendar quarters in the base period';
//   }

//   if (
//     total < (hq * 1.5) &&// If your total is less than your HQ * 1.5
// !(hq >= hqMax && (total - hq) >= totalLessHqMax)// Exception for HQ >= HQMax
//   ) {
//     if (errMsg.length > 0) {
//       errMsg = errMsg + '<br/>';
//     }
//     errMsg = errMsg + 'Your total base period earnings do not equal at least one and one half times your high quarter earnings';
//   }

//   if (errMsg.length > 0) {
//     if (basealt === 'base') {
//       $('#baseZeroReasonMsg').html(errMsg);
//     } else {
//       $('#altZeroReasonMsg').html(errMsg);
//     }
//     return 0;
//   }

//   if (a > 0 && b > 0 && c > 0 && d > 0) {// You were paid wages in all 4 quartesr
//     if (hq > 3575) {
//       var rate = hq / 26;
//       if (rate < 143) {
//         rate = 143;
//       }
//       if (rate > maxRate) {
//         rate = maxRate;
//       }
//       return rate;
//     } else {
//       var rate = hq / 25;
//       if (rate < 100) {
//         rate = 100;
//       }
//       if (rate > maxRate) {
//         rate = maxRate;
//       }
//       return rate;
//     }
//   } else {// You only earned income during 2 or 3 quarters
//     if (hq > 4000) {
//       var hq2 = 0;// Calculate second highest quarter
//       if (a === hq) {
//         hq2 = Math.max(b, c, d);
//       } else if (b === hq) {
//         hq2 = Math.max(a, c, d);
//       } else if (c === hq) {
//         hq2 = Math.max(a, b, d);
//       } else {
//         hq2 = Math.max(a, b, c);
//       }
//       var rate = ((hq + hq2) / 2) / 26;
//       if (rate < 143) {
//         rate = 143;
//       }
//       if (rate > maxRate) {
//         rate = maxRate;
//       }
//       return rate;
//     } else if (hq <= 4000 && hq > 3575) {
//       var rate = hq / 26;
//       if (rate < 143) {
//         rate = 143;
//       }
//       if (rate > maxRate) {
//         rate = maxRate;
//       }
//       return rate;
//     } else {
//       var rate = hq / 25;
//       if (rate < 100) {
//         rate = 100;
//       }
//       if (rate > maxRate) {
//         rate = maxRate;
//       }
//       return rate;
//     }
//   }
// }

module.exports = {
  getStateBenefitInfo,
  getWeeklyBenefit,
  determineEligibility,
  calculateUnemployment,
  calculateBasePeriodWages,
};
