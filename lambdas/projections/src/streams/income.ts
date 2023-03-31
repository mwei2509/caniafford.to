import StreamItem from "./streamItem";
import {
  newtonOptimization,
  currencyFormat,
  isDefined,
  yearlyToRate,
  rateToYearly,
  rateToMonthly,
} from "../utils";

const IncomeTypes = {
  salary: "salary",
  unemployment: "unemployment",
};

class Income extends StreamItem {
  public deductions: {
    warnings: string[];
    totalDeductions: number;
    _401k: {
      annualContribution: number;
      annualEmployerMatch: number;
      employerPlanAccountKey: string;
      monthlyContribution: number;
      monthlyEmployerMatch: number;
    };
  };
  public employerPlanAccountKey: string;
  public withholdings: {
    ficaTaxed: number;
    stateTaxed: number;
    localTaxed: number;
    fedTaxed: number;
  };
  public netIncome: { amount: number; rate: number };
  public incomeTaxRate: number;
  public ficaTaxRate: number;
  public ficaWithheld: any;
  public incomeTaxWithheld: any;
  public preTaxContributions: any;

  constructor(props) {
    /**
     * props:
     * type, isTakeHome = false, amount, rate,
     * _401kContributionAmount
     * _401kAccountKey = shadowKey of investment account
     * _401kEmployerMatchAmount
     */
    const { amount, incomeTaxRate, ficaTaxRate, netIncome, withholdings } =
      getGrossIncome(props);

    super({
      ...props,
      inputAmount: props.amount,
      amount,
      inflationRate: getIncomeInflationRate(props),
    });

    // for testing
    // this is actually stuff to lower taxable income, not real tax deductions
    this.deductions = getIncomeDeductions(props);
    this.startNotes.push(...this.deductions.warnings);
    this.employerPlanAccountKey = this.deductions._401k.employerPlanAccountKey;
    this.withholdings = withholdings;
    this.netIncome = netIncome;
    this.incomeTaxRate = incomeTaxRate;
    this.ficaTaxRate = ficaTaxRate;
    this.projectWithholdings();
  }

  projectWithholdings() {
    this.ficaWithheld = {};
    this.incomeTaxWithheld = {};
    this.preTaxContributions = {};
    const monthlyContributions = this.deductions._401k.monthlyContribution;

    for (const year in this.projection) {
      this.projection[year].forEach((grossIncomeForMonth, month) => {
        const taxableGross = grossIncomeForMonth - monthlyContributions; // figure this out later
        this.preTaxContributions[year] = this.preTaxContributions[year] || [];
        this.preTaxContributions[year][month] = monthlyContributions; // TODO figure out inflation
        this.incomeTaxWithheld[year] = this.incomeTaxWithheld[year] || [];
        this.incomeTaxWithheld[year][month] = this.incomeTaxRate * taxableGross;
        this.ficaWithheld[year] = this.ficaWithheld[year] || [];
        this.ficaWithheld[year][month] = this.ficaTaxRate * taxableGross;
      });
    }
  }
}

function getBrackets(irs) {
  const {
    SOCIAL_SECURITY_FICA,
    MEDICARE_FICA,
    MEDICARE_FICA_EXCESS,
    MEDICARE_FICA_EXCESS_RATE,
    SOCIAL_SECURITY_CAP,
  } = irs.ficaRates();
  const allBrackets = {
    fed: {},
    ssFica: {
      [SOCIAL_SECURITY_CAP]: SOCIAL_SECURITY_FICA,
      [Number.MAX_VALUE]: 0,
    },
    medFica: {
      [MEDICARE_FICA_EXCESS]: MEDICARE_FICA,
      [Number.MAX_VALUE]: MEDICARE_FICA_EXCESS_RATE,
    },
    state: {},
    local: {},
  };

  irs.incomeTaxRates().forEach((taxRate, taxBracketMax) => {
    allBrackets.fed[taxBracketMax] = taxRate;
  });

  irs.stateIncomeTaxRates().forEach((taxRate, taxBracketMax) => {
    allBrackets.state[taxBracketMax] = taxRate;
  });

  irs.localIncomeTaxRates().forEach((taxRate, taxBracketMax) => {
    allBrackets.local[taxBracketMax] = taxRate;
  });

  const brackets = Array.from(
    new Set([
      ...Object.keys(allBrackets.fed),
      ...Object.keys(allBrackets.state),
      ...Object.keys(allBrackets.ssFica),
      ...Object.keys(allBrackets.medFica),
      ...Object.keys(allBrackets.local),
    ])
  )
    .map((a) => Number(a))
    .sort((a, b) => (a < b ? -1 : 1));

  return { allBrackets, brackets };
}

const getTaxRate = (brackets, max) => {
  // sort in DESCENDING order
  const taxRateBrackets = Object.keys(brackets)
    .map((a) => Number(a))
    .sort((a, b) => (a > b ? -1 : 1));
  let taxRate = 0;
  for (const bracket of taxRateBrackets) {
    if (max <= bracket) {
      taxRate = brackets[bracket];
    }
  }
  return taxRate;
};

function getIncomeInflationRate({ type, inflationRate }) {
  if (type === IncomeTypes.salary || type === IncomeTypes.unemployment) {
    // should we get inflation rate for unemployment??
    // default to 0 inflation rate for salary
    return isDefined(inflationRate) ? inflationRate : 0;
  }
  return inflationRate;
}

function netToGross(props) {
  // we'll get to net to gross by using newton's method
  // until gross's result matches our net
  const compareGrossToNet = (testAmount) => {
    const grossResults = grossToNet({
      ...props,
      amount: testAmount,
    });
    const difference = props.amount - grossResults.net;
    return {
      ...grossResults,
      gross: testAmount,
      testResult: difference,
    };
  };

  try {
    const { gross, deductions, ficaTaxRate, incomeTaxRate, withholdings } =
      newtonOptimization(
        compareGrossToNet, // test function to pass tests to
        props.amount, // initial test amount
        "testResult" // return key of test function that holds test results (0 +/- 1 = passing)
      );

    return {
      gross,
      deductions,
      incomeTaxRate,
      ficaTaxRate,
      withholdings,
    };
  } catch (e) {
    throw new Error(e);
  }
}

function getIncomeDeductions(props) {
  const {
    _401kContributingMax = false,
    _401kEmployerContributingMax = false,
    _401kContributionAmount = 0,
    _401kEmployerMatchAmount = 0,
    _401kContributionRate = "monthly",
    _401kAccountKey = "",
    user = {},
  } = props;
  // TODO - enforce maximum here??
  const { irs = {} } = user;

  const warnings = [];
  const limits = irs.get401kContributionLimits();
  let annualContribution = 0;
  let annualEmployerMatch = 0;
  if (_401kContributingMax) {
    annualContribution = limits._401k;
  } else {
    annualContribution = rateToYearly({
      amount: _401kContributionAmount,
      rate: _401kContributionRate,
    });
  }
  if (_401kEmployerContributingMax) {
    annualEmployerMatch = limits._401kCombined - annualContribution;
  } else {
    annualEmployerMatch = rateToYearly({
      amount: _401kEmployerMatchAmount,
      rate: _401kContributionRate,
    });
  }

  if (annualContribution > limits._401k) {
    warnings.push(`Warning: annual contribution of ${currencyFormat(
      annualContribution
    )} exceeds
    maximum of ${currencyFormat(
      limits._401k
    )}. If you exceed the excess for the year, you may need
    to pay a penalty.  In our projections, we move the excess to taxable income and you may need
    to contact your employer for an excess contribution correctio`);
    // annualContribution = limits._401k;
  }
  if (annualContribution + annualEmployerMatch > limits._401kCombined) {
    warnings.push(`Warning: combined contribution of ${currencyFormat(
      annualContribution + annualEmployerMatch
    )}
    exceeds maximum of ${currencyFormat(
      limits._401kCombined - annualContribution
    )}.  We stop employer
    matches if we detect an excess for the year.  You may need to contact your employer for an excess contribution correction.`);
    // annualEmployerMatch = limits._401kCombined - annualContribution;
  }

  return {
    warnings,
    totalDeductions: annualContribution + 0, // add other deductions to this
    _401k: {
      annualContribution,
      annualEmployerMatch,
      employerPlanAccountKey: _401kAccountKey,
      monthlyContribution: rateToMonthly({
        amount: annualContribution,
        rate: "annually",
      }),
      monthlyEmployerMatch: rateToMonthly({
        amount: annualEmployerMatch,
        rate: "annually",
      }),
    },
  };
}

export function grossToNet(props) {
  const { amount, rate, user = {} } = props;
  const { irs } = user;

  const annualGrossIncome = rateToYearly({ amount, rate });
  const deductions = getIncomeDeductions(props)._401k.annualContribution; // add deductions later

  if (annualGrossIncome < deductions) {
    return {
      net: yearlyToRate({ rate, yearlyAmount: annualGrossIncome }),
      deductions: yearlyToRate({ rate, yearlyAmount: deductions }),
      incomeTaxRate: 0,
      ficaTaxRate: 0,
    };
  }
  const { allBrackets, brackets } = getBrackets(irs);

  let previousTaxBracketMax = 0;
  let fedTaxed = 0;
  let stateTaxed = 0;
  let localTaxed = 0;
  let ssTaxed = 0;
  let medTaxed = 0;
  let netMarginalIncome = 0;

  brackets.forEach((taxBracketMax) => {
    const fedRate = getTaxRate(allBrackets.fed, taxBracketMax);
    const stateRate = getTaxRate(allBrackets.state, taxBracketMax);
    const localRate = getTaxRate(allBrackets.local, taxBracketMax);
    const medRate = getTaxRate(allBrackets.medFica, taxBracketMax);
    const ssRate = getTaxRate(allBrackets.ssFica, taxBracketMax);
    const taxRate = fedRate + stateRate + localRate + medRate + ssRate;

    const taxableMarginalIncome = Math.max(
      annualGrossIncome - deductions - previousTaxBracketMax,
      0
    );
    const grossMarginalIncome = Math.min(
      taxableMarginalIncome,
      taxBracketMax - previousTaxBracketMax
    );

    previousTaxBracketMax = taxBracketMax;
    netMarginalIncome += grossMarginalIncome * (1 - taxRate);
    fedTaxed += grossMarginalIncome * fedRate;
    stateTaxed += grossMarginalIncome * stateRate;
    localTaxed += grossMarginalIncome * localRate;
    ssTaxed += grossMarginalIncome * ssRate;
    medTaxed += grossMarginalIncome * medRate;
  });

  const ficaTaxed = medTaxed + ssTaxed;
  const ficaRate = ficaTaxed / (annualGrossIncome - deductions);
  const stateTaxRate = stateTaxed / (annualGrossIncome - deductions);
  const localTaxRate = localTaxed / (annualGrossIncome - deductions);
  const fedTaxRate = fedTaxed / (annualGrossIncome - deductions);
  const annualNet = netMarginalIncome;

  return {
    net: yearlyToRate({ rate, yearlyAmount: annualNet }),
    deductions: yearlyToRate({ rate, yearlyAmount: deductions }),
    incomeTaxRate: fedTaxRate + stateTaxRate + localTaxRate,
    ficaTaxRate: ficaRate,
    withholdings: {
      ficaTaxed,
      stateTaxed,
      localTaxed,
      fedTaxed,
    },
  };
}

function getGrossIncome(props) {
  const { type, isTakeHome = false, amount, rate } = props;

  if (type !== IncomeTypes.salary) {
    // NOTE: currently not withholding taxes on unemployment, but it will be added to ordinary income for taxes at the end of the year
    // if we do simulate withholding, we should have fica (ss + med) rate at 0
    return {
      amount,
      deductions: 0,
      incomeTaxRate: 0,
      ficaTaxRate: 0,
      withholdings: {
        ficaTaxed: 0,
        stateTaxed: 0,
        fedTaxed: 0,
      },
      netIncome: {
        amount,
        rate,
      },
    };
  }

  if (isTakeHome) {
    const { gross, deductions, incomeTaxRate, ficaTaxRate, withholdings } =
      netToGross(props);
    return {
      amount: gross,
      deductions,
      incomeTaxRate,
      ficaTaxRate,
      withholdings,
      netIncome: {
        // just for tracking
        amount,
        rate,
      },
    };
  }
  const { net, deductions, incomeTaxRate, ficaTaxRate, withholdings } =
    grossToNet(props);
  return {
    amount,
    deductions,
    incomeTaxRate,
    ficaTaxRate,
    withholdings,
    netIncome: {
      amount: net,
      rate,
    },
  };
}

export default Income;
