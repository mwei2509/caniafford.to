import {
  addYears,
  startOfYear,
  startOfMonth,
  subYears,
  isWithinInterval,
} from "date-fns";
import { createProjection } from "./projections";
import { getPercent, rateToMonthly } from "../utils";
import { GENERAL_INFLATION_RATE } from "../constants";
import Time from "../Time";
import Person from "../Person";

export type ProjectionStreamType = {
  [key: string]: number[];
};

class StreamItem {
  public projection: ProjectionStreamType;
  public time: Time;
  public user: Person;
  public startDate: Date;
  public endDate: Date;
  public amount: number;
  public inflationRate: number;
  public isPresentValue: boolean;

  public originalInputs: any; // fix later
  public startNotes: string;
  public endNotes: string;
  public shadowKey: string;
  public type: string;
  public description: string;
  public accountId: number;

  constructor(props) {
    const {
      inputAmount,
      shadowKey,
      type,
      description,
      endDate,
      startDate,
      isPresentValue,
      inflationRate = GENERAL_INFLATION_RATE,
      startNotes = [],
      endNotes = [],
      user = {},
      accountId,
    } = props;

    this.originalInputs = {
      ...props,
      amount: inputAmount,
      user: undefined,
    };
    this.startNotes = startNotes;
    this.endNotes = endNotes;
    this.shadowKey = shadowKey;
    this.user = user;
    this.time = user.time;
    this.type = type;
    this.description = description;
    this.accountId = accountId;

    // if no start date, then start projections from last year and set isPresentValue to true
    // this way we can estimate last year's amounts based on current year's amounts
    this.isPresentValue = startDate ? !!isPresentValue : true;
    this.startDate = startDate
      ? new Date(startDate)
      : startOfYear(startOfMonth(subYears(new Date(), 1)));
    this.endDate = endDate
      ? new Date(endDate)
      : new Date(addYears(new Date(), 100).getUTCFullYear(), 12, 0);

    this.inflationRate = getPercent(inflationRate);
    // calculate everything to monhtly
    this.amount = rateToMonthly(props);

    // create projection
    this.createProjection();
  }

  isActive() {
    return isWithinInterval(this.time.date, {
      start: this.startDate,
      end: this.endDate,
    });
  }

  createProjection() {
    this.projection = createProjection(
      this.startDate,
      this.endDate,
      this.amount,
      this.inflationRate,
      this.isPresentValue
    );
    return this.projection;
  }
}

export default StreamItem;
