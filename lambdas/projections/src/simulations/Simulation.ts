import Time from "../Time";
import { Flags } from "../types";
import Household from "../household/Household";
import { HouseholdStreamInfo } from "../household/streams";
import { setPreviousYear, endOfYearTaxes } from "./yearly";
import {
  runMonthlySimulation,
  monthlyRecord,
  getIncomeAndCalculateSpending,
  getSurplusAvailable,
  endOfMonthGrowAccounts,
  endOfMonthAnalysis,
} from "./monthly";
import type { alert, record } from "./types";

const { MONTHS_PER_YEAR, ALERT_LEVEL } = require("../constants");
const { addYears, isBefore, addMonths } = require("date-fns");
import {
  withdrawFromBank,
  tryToMeetDeficit,
  depositIntoBank,
} from "./withdraw";

export class Simulation {
  // withdraw
  public withdrawFromBank = withdrawFromBank;
  public tryToMeetDeficit = tryToMeetDeficit;
  public depositIntoBank = depositIntoBank;
  // yearly
  public setPreviousYear = setPreviousYear;
  public endOfYearTaxes = endOfYearTaxes;

  // monthly
  public runMonthlySimulation = runMonthlySimulation;
  public getIncomeAndCalculateSpending = getIncomeAndCalculateSpending;
  public getSurplusAvailable = getSurplusAvailable;
  public endOfMonthGrowAccounts = endOfMonthGrowAccounts;
  public endOfMonthAnalysis = endOfMonthAnalysis;

  public lastMonth: monthlyRecord;

  public household: Household;
  public streams: HouseholdStreamInfo;
  public accounts: any[]; // fix this
  public stop: boolean;

  public time: Time;
  public flags: Flags;
  public alerts: { unique: alert[]; all: alert[]; byYear: {} };
  public record: record;

  public start: Date;
  public end: Date;

  constructor({ household, startDate = new Date() }) {
    this.household = household;
    this.time = this.household.time;
    this.flags = this.household.flags;

    this.streams = this.household.getStreamInfo();
    this.accounts = this.household.getAccountInfo();
    this.start = new Date(startDate);
    this.end = new Date(
      addYears(this.start, this.flags.years).getUTCFullYear(),
      12,
      0
    );
    this.record = {};
    this.alerts = {
      unique: [],
      all: [],
      byYear: {},
    };
  }

  addAlert(alert, level = ALERT_LEVEL.notice, notes = []) {
    const timeStampedAlert = {
      alert: `${alert} - ${this.time.month + 1}/${this.time.year}`,
      level,
      notes,
    };

    if (!this.alerts.unique.includes(alert)) {
      this.alerts.unique.push(alert);
      this.alerts.all.push(timeStampedAlert);
    }
    this.alerts.byYear[this.time.year] =
      this.alerts.byYear[this.time.year] || {};
    this.alerts.byYear[this.time.year][this.time.month] =
      this.alerts.byYear[this.time.year][this.time.month] || [];
    this.alerts.byYear[this.time.year][this.time.month].push({
      alert,
      level,
      notes,
    });
  }

  isFirstMonth() {
    return this.time.month === 0;
  }

  isTaxMonth() {
    return this.time.month === 3;
  }

  isLastMonth() {
    return this.time.month === MONTHS_PER_YEAR - 1;
  }

  /**
   * Set up simulation and records
   * @param {Date} simulationDate
   */
  setDate(simulationDate) {
    this.time.setDate(simulationDate);

    const newYearDefaults = {
      months: Array(12).fill({}),
      taxes: {},
      income: {},
    };

    this.record[this.time.year] =
      this.record[this.time.year] || newYearDefaults;
  }

  run() {
    this.setPreviousYear(this.start); // run before the loop to get last year's taxes
    this.setDate(this.start);
    this.household.yearlyAccountReset();

    for (let i = this.start; isBefore(i, this.end); i = addMonths(i, 1)) {
      // optimize for paying the least amount of interest?
      // newton's optimization should be for the SPLIT
      // ALWAYS - pay down loans that are accruing interest
      //
      // but if no loans are currently accruing interest (e.g. APR not for another x months) - what to do?
      // use newton's with the variable being the split:
      // 100% to paying down future loans vs 0% paying into growth accounts
      // to 0% paying down future loans vs 100% paying into growth accounts
      // (maybe)

      // if paying into growth accounts, use roth first strategy
      // and this is all before retirement
      // debugger;

      if (this.stop) {
        break;
      }

      // setup time and records for the month
      this.setDate(i);

      // run monthly simulation
      this.runMonthlySimulation();
    }
  }
}

export default Simulation;
