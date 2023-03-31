import { MONTHS_PER_YEAR } from "../constants";
import { subYears, getDaysInMonth } from "date-fns";

export function combineProjections(projections = []) {
  return projections.reduce((combinedProjection, projection) => {
    for (const year in projection) {
      combinedProjection[year] = combinedProjection[year] || [];
      projection[year].forEach((amount, monthIndex) => {
        const currentAmount = combinedProjection[year][monthIndex] || 0;
        combinedProjection[year][monthIndex] = currentAmount + amount;
      });
    }
    return combinedProjection;
  }, {});
}

/**
 * Combines streams to a single projection
 * @param {StreamItems[]} stream
 */
export function combineStreamProjections(stream = []) {
  return stream.reduce((combinedProjection, { projection }) => {
    for (const year in projection) {
      combinedProjection[year] = combinedProjection[year] || [];
      projection[year].forEach((amount, monthIndex) => {
        const currentAmount = combinedProjection[year][monthIndex] || 0;
        combinedProjection[year][monthIndex] = currentAmount + amount;
      });
    }
    return combinedProjection;
  }, {});
}

export function createEmptyProjection(
  startDate = subYears(new Date(), 1),
  numYears = 100
) {
  return { projection: createStaticProjections(0, startDate, numYears) };
}

function createStaticProjections(monthlyAmount, startDate, numYears) {
  const startYear = startDate.getUTCFullYear();
  const yearlyAmount = monthlyAmount * MONTHS_PER_YEAR;

  const projectedStream = {
    [startYear]: getMonthlyDivisions(yearlyAmount, startDate),
  };

  for (let i = 1; i < numYears; i++) {
    projectedStream[startYear + i] = getMonthlyDivisions(yearlyAmount);
  }
  return projectedStream;
}

/**
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {float} monthlyAmount
 * @param {float} inflationRate
 * @param {boolean} isPresentValue
 */
export function createProjection(
  startDate,
  endDate,
  monthlyAmount,
  inflationRate,
  isPresentValue
) {
  const inflation = 1 + inflationRate;
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();

  let initialYearlyAmount = monthlyAmount * MONTHS_PER_YEAR;
  if (isPresentValue) {
    const currentYear = new Date().getUTCFullYear();
    initialYearlyAmount *= inflation ** (startYear - currentYear);
  }

  const projectedStream = {
    [startYear]: getMonthlyDivisions(
      initialYearlyAmount,
      startDate,
      startYear === endYear ? endDate : null
    ),
  };

  for (let i = startYear + 1; i <= endYear; i++) {
    const year = i;
    const multiplier = inflation ** (year - startYear);
    if (i < endYear) {
      projectedStream[year] = getMonthlyDivisions(
        initialYearlyAmount * multiplier
      );
    } else {
      projectedStream[year] = getMonthlyDivisions(
        initialYearlyAmount * multiplier,
        null,
        endDate
      );
    }
  }
  return projectedStream;
}

function getMonthlyDivisions(yearlyAmount, startDate = null, endDate = null) {
  const months = [];
  const monthly = yearlyAmount / MONTHS_PER_YEAR;

  const startMonth = startDate ? startDate.getUTCMonth() : 0;
  const endMonth = endDate ? endDate.getUTCMonth() : 11;

  for (let i = 0; i < MONTHS_PER_YEAR; i++) {
    if (i < startMonth || i > endMonth) {
      months.push(0);
    } else if (i === startMonth) {
      if (startDate) {
        const daysInMonth = getDaysInMonth(startDate.getUTCDate());
        const percentOfMonthCovered =
          (daysInMonth - startDate.getUTCDate() + 1) / daysInMonth;
        months.push(monthly * percentOfMonthCovered);
      } else {
        months.push(monthly);
      }
    } else if (i === endMonth) {
      if (endDate) {
        const daysInMonth = getDaysInMonth(endDate.getUTCDate());
        const percentOfMonthCovered = endDate.getUTCDate() / daysInMonth;
        months.push(monthly * percentOfMonthCovered);
      } else {
        months.push(monthly);
      }
    } else {
      months.push(monthly);
    }
  }
  return months;
}
