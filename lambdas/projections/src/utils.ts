import { MONTHS_PER_YEAR, WEEKS_PER_MONTH } from "./constants";

export function getCents(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function getPercent(percent: number) {
  // if entered like "10.5" for 10.5%
  // if (percent > 1) {
  //   return percent / 100;
  // }
  // return percent;
  return percent / 100;
}

/**
 * Converts annual growth rate to monthly growth rate
 * Assums the percentage growth is less than 100%
 * @param {number} percentagePerYear
 */
export function getMonthlyGrowthRate(percentagePerYear: number) {
  const annualGrowthRate = 1 + getPercent(percentagePerYear);
  return Math.pow(annualGrowthRate, 1 / MONTHS_PER_YEAR) - 1;
  // return getPercent(percentagePerYear)
  // return getPercent(percentagePerYear) / MONTHS_PER_YEAR;
}

/**
 * Converts interest rate fee to monthly, assumes less than 100%
 * @param {*} percentagePerYear
 */
export function getMonthlyInterestFee(percentagePerYear: number) {
  return getPercent(percentagePerYear) / MONTHS_PER_YEAR;
}

export function endOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0);
}

function beginningOfMonth(year, month) {
  return new Date(year, month, 1);
}

/**
 * newton's method
 * x(n + 1) = x(n) - f(x(n)) / f'(x(n))
 */
const TOLER = 1;
const MAX_ITER = 100;
const h = 1;
export function newtonOptimization(
  fn: (number) => number,
  x0: number,
  key: string
) {
  let xn = x0;
  let res = {};

  for (let i = 0; i < MAX_ITER; i++) {
    // f(x)
    res = fn(xn);
    const fx = key ? res[key] : res;

    if (Math.abs(fx) < TOLER) {
      return res;
    }

    // f(x + h)
    res = fn(xn + h);
    const fxh = key ? res[key] : res;
    const derivative = (fxh - fx) / h;
    if (derivative === 0) {
      throw new Error("Zero derivative");
    }

    // x(n + 1) = x(n) - (f(x(n)) / f'(x(n)))
    xn = xn - fx / derivative;
  }
  throw new Error("Max iterations exceeded");
}

export function isDefined(variable: any) {
  return typeof variable !== "undefined";
}

export function rateToYearly({ rate, amount }) {
  return toThousandDecimal(
    (() => {
      switch (rate) {
        case "monthly":
          return amount * MONTHS_PER_YEAR;
        case "weekly":
          return amount * WEEKS_PER_MONTH * MONTHS_PER_YEAR;
        case "annually":
          return amount;
        case "bi-monthly":
          return amount * 2 * MONTHS_PER_YEAR;
      }
    })()
  );
}

export function yearlyToRate({ rate, yearlyAmount }) {
  return toThousandDecimal(
    (() => {
      switch (rate) {
        case "monthly":
          return yearlyAmount / MONTHS_PER_YEAR;
        case "weekly":
          return yearlyAmount / MONTHS_PER_YEAR / WEEKS_PER_MONTH;
        case "annually":
          return yearlyAmount;
        case "bi-monthly":
          return yearlyAmount / MONTHS_PER_YEAR / 2;
      }
    })()
  );
}

export function rateToMonthly({ rate, amount }) {
  return toThousandDecimal(
    (() => {
      switch (rate) {
        case "monthly":
          return amount;
        case "weekly":
          return amount * WEEKS_PER_MONTH;
        case "annually":
          return amount / MONTHS_PER_YEAR;
        case "bi-monthly":
          return amount * 2; // 2 x a month
      }
    })()
  );
}

export function toThousandDecimal(num) {
  // return num;
  return Math.round(num * 1000) / 1000;
}

export function currencyFormat(
  val: number,
  round: boolean | string = true,
  minimumFractionDigits = 0
) {
  let value = val;
  if (isNaN(value)) {
    return;
  }

  if (round === "up") {
    value = Math.ceil(value);
  } else if (round) {
    value = Math.round(value);
  }

  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: minimumFractionDigits,
  }).format(value);
}

export function getIntValue(strNum: string | number) {
  const num = Number(strNum);
  if (isNaN(num)) {
    return 0;
  }

  return parseInt(strNum as string);
}

export function toDecimal(num) {
  if (isNaN(num)) {
    return 0;
  }

  return parseFloat(num.toFixed(2));
}

export function copyObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function isObjectEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

export function toCents(number) {
  return Math.round(number * 100) / 100;
}
