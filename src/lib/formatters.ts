export function formatLoanCode(loanNumber: number) {
  return `LN_${String(loanNumber).padStart(6, '0')}`;
}

export function formatCustomerCode(customerNumber: number) {
  return `CN_${String(customerNumber).padStart(5, '0')}`;
}


