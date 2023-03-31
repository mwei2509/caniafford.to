class Time {
  date: Date;
  year: number;
  month: number;

  constructor(startDate: string | Date) {
    if (typeof startDate === "string") {
      this.setDate(startDate ? new Date(startDate) : new Date());
    } else {
      this.setDate(startDate);
    }
  }

  setDate(date: Date) {
    this.date = date;
    this.year = date.getUTCFullYear();
    this.month = date.getUTCMonth();
  }
}

export default Time;
