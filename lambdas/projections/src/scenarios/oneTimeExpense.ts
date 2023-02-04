const { startOfMonth, endOfMonth } = require("date-fns");
const shortid = require("shortid");

export default function simulateOneTimeExpense(scenario, inputs) {
  const {
    amount = 0,
    description,
    date: dateFmt = new Date(),
    spendingType: type,
  } = scenario;

  const date = new Date(dateFmt);
  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);

  const oneTimeExpense = {
    amount,
    rate: "monthly",
    startDate,
    endDate,
    isPresentValue: true,
    description,
    type,
    startNotes: ["scenario generated"],
    shadowKey: shortid(),
  };

  inputs.user.spendings.push(oneTimeExpense);

  return inputs;
}
