import StreamItem from "./streamItem";
import { SPENDING_TYPES } from "../../constants";
import { GENERAL_INFLATION_RATE } from "../constants";

class Spending extends StreamItem {
  constructor(props) {
    super({
      ...props,
      inputAmount: props.amount,
      inflationRate: getSpendingInflationRate(props),
    });

    this.spending = true;
  }
}

function getSpendingInflationRate({ type }) {
  if (type === SPENDING_TYPES.loanPay) {
    return 0;
  }
  return GENERAL_INFLATION_RATE;
}

export default Spending;
