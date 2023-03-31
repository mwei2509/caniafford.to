import {
  get401kContributionLimits,
  getHSAContributionLimits,
  getIraContributionLimits,
  getIraContributionLimitsWithDeductions,
  getRothContributionLimits,
} from "./contributionLimits";
import { calculateUnemployment } from "./unemployment";
import Time from "../Time";
import type { Flags } from "../types";
import Person from "../Person";

class IRS {
  public time: Time;
  public flags: Flags;
  public user: Person;
  public spouse: Person;

  public filingStatus: string;
  public stateProvince: string;
  public taxRate: number;
  public inflationRate: number;

  // contribution limits
  public get401kContributionLimits = get401kContributionLimits;
  public getHSAContributionLimits = getHSAContributionLimits;
  public getIraContributionLimits = getIraContributionLimits;
  public getIraContributionLimitsWithDeductions =
    getIraContributionLimitsWithDeductions;
  public getRothContributionLimits = getRothContributionLimits;

  // unemployment
  public calculateUnemployment = calculateUnemployment;
  constructor(props) {
    const { user, spouse } = props;

    const { flags = {}, time = {} } = user;

    this.time = time;
    this.flags = flags;
    this.user = user;
    this.spouse = spouse;

    this.filingStatus = this.getFilingStatus();
    this.stateProvince = this.flags.stateProvince;
    this.taxRate = this.flags.effectiveTaxRate;
    this.inflationRate = this.flags.taxInflationRate;
  }

  currentInflation() {
    const currentYear = new Date().getUTCFullYear();
    return Math.pow(1 + this.inflationRate, this.time.year - currentYear) - 1;
  }

  getFilingStatus() {
    const { filingStatus } = this.flags;
    switch (filingStatus) {
      case "single":
      case "headOfHousehold":
      case "marriedFilingSeparately":
      case "marriedFilingJointly":
        return filingStatus;
      default:
        return this.user.married ? "marriedFilingJointly" : "single";
    }
  }
}

export default IRS;
