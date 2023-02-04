import { federalTaxBrackets } from "./federalTaxBrackets";
import stateTaxRates from "./data/stateTaxRates.json";
import ficaTaxRates from "./data/ficaRates.json";
import localTaxRates from "./data/localTaxRates.json";

export function ficaRates() {
  const year = ficaTaxRates[this.time.year] ? this.time.year : 2020;
  return ficaTaxRates[year];
}

// Table 1: https://taxfoundation.org/2019-tax-brackets/
export function incomeTaxRates() {
  const brackets =
    federalTaxBrackets[new Date().getUTCFullYear()][this.filingStatus];
  const bracketMap = Object.values(brackets).map((bracket: any) => [
    bracket.max,
    bracket.rate / 100.0,
  ]);
  return new TaxMap(bracketMap, this.currentInflation());
}

// Table 6: https://taxfoundation.org/2019-tax-brackets/
export function longTermCapitalGainsTaxRates() {
  return {
    single: new TaxMap(
      [
        [40000, 0.0],
        [441450, 0.15],
        [Number.MAX_SAFE_INTEGER, 0.2],
      ],
      this.currentInflation()
    ),
    headOfHousehold: new TaxMap(
      [
        [53600, 0.0],
        [469050, 0.15],
        [Number.MAX_SAFE_INTEGER, 0.2],
      ],
      this.currentInflation()
    ),
    marriedFilingJointly: new TaxMap(
      [
        [80000, 0.0],
        [496600, 0.15],
        [Number.MAX_SAFE_INTEGER, 0.2],
      ],
      this.currentInflation()
    ),
    marriedFilingSeparately: new TaxMap(
      [
        [40000, 0.0],
        [441450, 0.15],
        [Number.MAX_SAFE_INTEGER, 0.2],
      ],
      this.currentInflation()
    ),
  }[this.filingStatus];
}

// Table 2: https://taxfoundation.org/2019-tax-brackets/
export function standardDeduction() {
  return (
    {
      single: 12400,
      headOfHousehold: 18650,
      marriedFilingSeparately: 12400,
      marriedFilingJointly: 24800,
    }[this.filingStatus] *
    (1 + this.currentInflation())
  );
}

export function seniorDeduction() {
  return (
    {
      single: 1650,
      headOfHousehold: 1650,
      marriedFilingSeparately: 1300,
      marriedFilingJointly: 1300,
    }[this.filingStatus] *
    (1 + this.currentInflation())
  );
}

// https://taxfoundation.org/state-individual-income-tax-rates-brackets-2019/
export function stateIncomeTaxRates() {
  return this.getStateTaxData(this.stateProvince)?.[this.filingStatus] ?? [];
}

export function localIncomeTaxRates() {
  return this.getLocalTaxData("NYC")?.[this.filingStatus] ?? [];
}

export function stateStandardDeduction() {
  return (
    this.getStateTaxData(this.stateProvince)?.standardDeduction?.[
      this.filingStatus
    ] ?? 0
  );
}

/**
 * [{ rate: a, bracket: a }, { rate: b, bracket: b}, { rate: c, bracket: c }] ->
 * [[b, a], [c, b], [Number.MAX_SAFE_INTEGER, c]]
 * @param {array} stateBrackets
 */
export function formatBracket(stateBrackets, inflationRate) {
  const bracket = stateBrackets.map((bracket, index) => [
    stateBrackets?.[index + 1]?.bracket ?? Number.MAX_SAFE_INTEGER,
    bracket.rate,
  ]);
  return new TaxMap(bracket, inflationRate);
}

export function getStateTaxData() {
  if (!stateTaxRates[this.stateProvince]) {
    return null;
  }
  return {
    single: this.formatBracket(
      stateTaxRates[this.stateProvince].single,
      this.currentInflation()
    ),
    marriedFilingJointly: this.formatBracket(
      stateTaxRates[this.stateProvince].married,
      this.currentInflation()
    ),
    standardDeduction: {
      single: stateTaxRates[this.stateProvince].deduction.single,
      marriedFilingJointly: stateTaxRates[this.stateProvince].deduction.married,
    },
  };
}

export function getLocalTaxData(locale) {
  if (!localTaxRates[locale]) {
    return null;
  }
  return {
    single: this.formatBracket(
      localTaxRates[locale].single,
      this.currentInflation()
    ),
    marriedFilingJointly: this.formatBracket(
      localTaxRates[locale].married,
      this.currentInflation()
    ),
    standardDeduction: {
      single: localTaxRates[locale].deduction.single,
      marriedFilingJointly: localTaxRates[locale].deduction.married,
    },
  };
}

class TaxMap extends Map<number, number> {
  inflationRate: number;

  constructor(map, inflationRate) {
    super(map);
    this.inflationRate = inflationRate;
  }

  get(position: number): number {
    return position * (1 + this.inflationRate);
  }
}
