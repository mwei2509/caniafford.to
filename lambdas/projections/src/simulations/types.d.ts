type year<t> = { [key: number]: t };
type month<t> = { [key: number]: t };

export type monthAlert = month<alert[]>;
type yearAlert = year<monthAlert>;

type record = year<{ months: any; taxes: any; income: any }>;
export type alert = {
  alert: string;
  level: any;
  notes: any[];
};
