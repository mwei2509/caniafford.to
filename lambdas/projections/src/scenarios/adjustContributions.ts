export default function simulateAdjustContributions(scenario, inputs) {
  const {
    accountToAdjust, // shadowkey
    contributingMaxAmount = 0,
    contributingMaxAllowed = false,
  } = scenario;

  // end old account
  let accountFound: any = false;
  for (const account of inputs.user.investmentAccounts || []) {
    if (accountToAdjust === account.shadowKey) {
      accountFound = account;
    }
  }

  if (!accountFound) {
    for (const account of inputs.spouse.investmentAccounts || []) {
      if (accountToAdjust === account.shadowKey) {
        accountFound = account;
      }
    }
  }

  accountFound.contributingMaxAllowed = contributingMaxAllowed;
  accountFound.contributingMaxAmount = contributingMaxAmount;

  return inputs;
}
