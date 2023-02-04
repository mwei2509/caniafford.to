import type { taxableIncome } from "./types.d";

export function incomeTax(
  taxableIncome: taxableIncome,
  exemptIncome = 0,
  deductions = 0
) {
  let longTermCapitalGainsTax = 0;
  let incomeTax = 0;
  let stateIncomeTax = 0;
  let localIncomeTax = 0;

  // calculate AGI by summing all non-SS income
  const agi = this.getAGI(taxableIncome);

  // calculate amount of SS to be taxed first
  const socialSecurityTaxedAmount = this.calculateSocialSecurityTaxedAmount(
    agi,
    taxableIncome.socialSecurity,
    exemptIncome,
    deductions
  );

  // calculate ordinary income with SS
  const incomeAmount = taxableIncome.ordinary + socialSecurityTaxedAmount;

  incomeTax = this.calculateIncomeTax(incomeAmount);
  stateIncomeTax = this.calculateStateIncomeTax(incomeAmount);
  localIncomeTax = this.calculateLocalIncomeTax(incomeAmount);

  if (taxableIncome.longTermCapitalGains) {
    // don't inclue LTCG in the AGI for this calculation
    longTermCapitalGainsTax = this.calculateLongTermCapitalGainsTax(
      incomeAmount,
      taxableIncome.longTermCapitalGains
    );
  }

  const total =
    incomeTax + stateIncomeTax + localIncomeTax + longTermCapitalGainsTax;

  return {
    total,
    incomeTax,
    stateIncomeTax,
    localIncomeTax,
    longTermCapitalGainsTax,
    socialSecurityTaxedAmount,
  };
}

export function getAGI(taxableIncome) {
  return Object.keys(taxableIncome).reduce((agi, source) => {
    if (source !== "socialSecurity") {
      return agi + taxableIncome[source];
    }
    return agi;
  }, 0);
}

// TODO - figure out if this is accurate
/**
   * deductions
   * Student loan interest
      One-half of self-employment tax
      Qualified tuition expenses
      Tuition and fees deduction
      Passive loss or passive income
      IRA contributions
      Taxable social security payments
      The exclusion for income from U.S. savings bonds
      Foreign earned income exclusion
      Foreign housing exclusion or deduction
      The exclusion under 137 for adoption expenses
      Rental losses
      Any overall loss from a publicly traded partnership
   */
export function getMAGI(taxableIncome, exemptIncome = 0, deductions = 0) {
  const agi = this.getAGI(taxableIncome);
  // calculate amount of SS to be taxed first
  const socialSecurityTaxedAmount = this.calculateSocialSecurityTaxedAmount(
    agi,
    taxableIncome.socialSecurity,
    exemptIncome,
    deductions
  );

  // calculate ordinary income with SS
  const incomeAmount = taxableIncome.ordinary + socialSecurityTaxedAmount;
  return Math.max(incomeAmount - this.getDeductions(), 0);
}

export function calculateSocialSecurityTaxedAmount(
  agi,
  ssAmount,
  exemptIncome = 0,
  deductions = 0
) {
  // Calculate amount of SS taxed
  // https://www.irs.gov/pub/irs-pdf/p915.pdf

  let taxedAmount = 0;

  const combinedIncome = agi + exemptIncome + ssAmount / 2;
  const taxThreshold = this.socialSecurityTaxThreshold();

  if (combinedIncome > taxThreshold.taxableThreshold + deductions) {
    const taxableAmount =
      combinedIncome - taxThreshold.taxableThreshold - deductions; // line 10

    // add the 50% taxed ssAmount
    const taxed50PercentAmount = Math.min(
      taxableAmount,
      taxThreshold.taxed50Percent
    ); // line 13
    taxedAmount += Math.min(taxed50PercentAmount / 2, ssAmount / 2); // line 15

    // add the 85% taxed ssAmount
    const taxed85PercentAmount = taxableAmount - taxThreshold.taxed50Percent; // line 12
    if (taxed85PercentAmount > 0) {
      taxedAmount = Math.min(
        0.85 * taxed85PercentAmount + taxedAmount,
        0.85 * ssAmount
      ); // line 19
    }
  }

  return taxedAmount;
}

// https://www.google.com/url?q=https://financialducksinarow.com/2303/taxation-of-social-security-benefits/&ust=1548433260000000&usg=AFQjCNFp0k9MlKOfsNaT-i4qR77AwJZIrw&hl=en
export function socialSecurityTaxThreshold() {
  return {
    single: { taxableThreshold: 25000, taxed50Percent: 9000 },
    headOfHousehold: { taxableThreshold: 25000, taxed50Percent: 9000 },
    marriedFilingSeparately: { taxableThreshold: 25000, taxed50Percent: 9000 },
    marriedFilingJointly: { taxableThreshold: 32000, taxed50Percent: 12000 },
  }[this.filingStatus];
}

export function getDeductions() {
  let deductions = 0;
  deductions += this.standardDeduction();
  if (this.user.age() > 65) {
    deductions += this.seniorDeduction();
  }

  // user's spouse
  if (this.filingStatus === "marriedFilingJoingly" && this.spouse.age() > 65) {
    deductions += this.seniorDeduction();
  }

  return deductions;
}

export function calculateIncomeTax(amt) {
  // don't let income drop below 0
  let amount = Math.max(amt - this.getDeductions(), 0);

  if (this.taxRate !== undefined) {
    return amount * this.taxRate;
  }

  const brackets = this.incomeTaxRates();

  // loop through tax brackets
  let taxAmount = 0;
  let lastBracket = 0;
  brackets.forEach((taxRate, bracket) => {
    const tmpBracket = bracket * (1 + this.currentInflation());
    const bracketDiff = tmpBracket - lastBracket;
    lastBracket = tmpBracket;
    taxAmount += Math.min(bracketDiff, amount) * taxRate;
    amount = Math.max(amount - bracketDiff, 0);
  });

  return taxAmount;
}

export function calculateLocalIncomeTax(amt) {
  const brackets = this.localIncomeTaxRates();
  // don't let income drop below 0
  let amount = amt;

  // loop through tax brackets
  let taxAmount = 0;
  let lastBracket = 0;
  brackets.forEach((taxRate, bracket) => {
    const tmpBracket = bracket;
    const bracketDiff = tmpBracket - lastBracket;
    lastBracket = tmpBracket;
    taxAmount += Math.min(bracketDiff, amount) * taxRate;
    amount = Math.max(amount - bracketDiff, 0);
  });

  return taxAmount;
}

export function calculateStateIncomeTax(amt) {
  const brackets = this.stateIncomeTaxRates();
  // don't let income drop below 0
  let amount = Math.max(amt - this.stateStandardDeduction(), 0);

  // loop through tax brackets
  let taxAmount = 0;
  let lastBracket = 0;
  brackets.forEach((taxRate, bracket) => {
    const tmpBracket = bracket;
    const bracketDiff = tmpBracket - lastBracket;
    lastBracket = tmpBracket;
    taxAmount += Math.min(bracketDiff, amount) * taxRate;
    amount = Math.max(amount - bracketDiff, 0);
  });

  return taxAmount;
}

export function calculateLongTermCapitalGainsTax(agiVal, amtVal) {
  let agi = agiVal;
  let amount = amtVal;
  const brackets = this.longTermCapitalGainsTaxRates();

  // loop through tax brackets
  let taxAmount = 0;
  let lastBracket = 0;
  if (amount > 0) {
    brackets.forEach((taxRate, bracketItem) => {
      const bracket = bracketItem * (1 + this.currentInflation());
      if (bracket < agi) {
        lastBracket = bracket;
      } else if (bracket > agi && bracket < agi + amount) {
        const capitalGainsDiff = bracket - agi;
        taxAmount += capitalGainsDiff * taxRate;
        // update AGI to include additional gains
        agi = bracket;
        amount -= capitalGainsDiff;
        lastBracket = bracket;
      } else if (lastBracket < agi + amount && bracket > agi + amount) {
        taxAmount += amount * taxRate;
        lastBracket = bracket;
      }
    });
  }

  return taxAmount;
}
