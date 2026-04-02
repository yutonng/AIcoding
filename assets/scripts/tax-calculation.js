const usSalaryInput = document.querySelector("#usSalaryInput");
const chinaSalaryInput = document.querySelector("#chinaSalaryInput");
const exchangeRateInput = document.querySelector("#exchangeRate");
const socialDeductionInput = document.querySelector("#socialDeduction");
const specialDeductionInput = document.querySelector("#specialDeduction");
const federalPrepaidTaxInput = document.querySelector("#federalPrepaidTax");
const statePrepaidTaxInput = document.querySelector("#statePrepaidTax");
const calculateBtn = document.querySelector("#calculateBtn");
const settlementCalculateBtn = document.querySelector("#settlementCalculateBtn");
const panelCurrencyButtons = document.querySelectorAll("[data-panel-currency]");
const topUpCard = document.querySelector("#topUpCard");
const topUpExplanation = document.querySelector("#topUpExplanation");

const panelCurrencies = {
  china: "USD",
  us: "USD",
};

let mainCalculation = null;
let settlementCalculation = null;

const outputs = {
  totalIncomeUsdDisplay: document.querySelector("#totalIncomeUsdDisplay"),
  totalIncomeCnyDisplay: document.querySelector("#totalIncomeCnyDisplay"),
  chinaTax: document.querySelector("#chinaTax"),
  chinaRate: document.querySelector("#chinaRate"),
  chinaGross: document.querySelector("#chinaGross"),
  chinaBasicDeduction: document.querySelector("#chinaBasicDeduction"),
  chinaSocialDeduction: document.querySelector("#chinaSocialDeduction"),
  chinaSpecialDeduction: document.querySelector("#chinaSpecialDeduction"),
  chinaTaxable: document.querySelector("#chinaTaxable"),
  chinaTaxOnly: document.querySelector("#chinaTaxOnly"),
  chinaTopUp: document.querySelector("#chinaTopUp"),
  usTax: document.querySelector("#usTax"),
  usRate: document.querySelector("#usRate"),
  usIncomeTaxRate: document.querySelector("#usIncomeTaxRate"),
  usGross: document.querySelector("#usGross"),
  federalTaxableIncome: document.querySelector("#federalTaxableIncome"),
  californiaTaxableIncome: document.querySelector("#californiaTaxableIncome"),
  federalTax: document.querySelector("#federalTax"),
  federalPrepaidTaxDisplay: document.querySelector("#federalPrepaidTaxDisplay"),
  federalBalance: document.querySelector("#federalBalance"),
  californiaTax: document.querySelector("#californiaTax"),
  statePrepaidTaxDisplay: document.querySelector("#statePrepaidTaxDisplay"),
  stateBalance: document.querySelector("#stateBalance"),
  socialSecurityTax: document.querySelector("#socialSecurityTax"),
  medicareTax: document.querySelector("#medicareTax"),
  additionalMedicareTax: document.querySelector("#additionalMedicareTax"),
  sdiTax: document.querySelector("#sdiTax"),
  creditableUsTax: document.querySelector("#creditableUsTax"),
  usIncomeTaxBalance: document.querySelector("#usIncomeTaxBalance"),
};

const chinaBrackets = [
  { limit: 36000, rate: 0.03, quickDeduction: 0 },
  { limit: 144000, rate: 0.1, quickDeduction: 2520 },
  { limit: 300000, rate: 0.2, quickDeduction: 16920 },
  { limit: 420000, rate: 0.25, quickDeduction: 31920 },
  { limit: 660000, rate: 0.3, quickDeduction: 52920 },
  { limit: 960000, rate: 0.35, quickDeduction: 85920 },
  { limit: Infinity, rate: 0.45, quickDeduction: 181920 },
];

const federalBrackets2025Single = [
  { upTo: 11925, rate: 0.1 },
  { upTo: 48475, rate: 0.12 },
  { upTo: 103350, rate: 0.22 },
  { upTo: 197300, rate: 0.24 },
  { upTo: 250525, rate: 0.32 },
  { upTo: 626350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

const californiaBrackets2025Single = [
  { upTo: 11079, rate: 0.01 },
  { upTo: 26264, rate: 0.02 },
  { upTo: 41452, rate: 0.04 },
  { upTo: 57542, rate: 0.06 },
  { upTo: 72724, rate: 0.08 },
  { upTo: 371479, rate: 0.093 },
  { upTo: 445771, rate: 0.103 },
  { upTo: 742953, rate: 0.113 },
  { upTo: Infinity, rate: 0.123 },
];

const FEDERAL_STANDARD_DEDUCTION_2025_SINGLE = 15750;
const CALIFORNIA_STANDARD_DEDUCTION_2025_SINGLE = 5706;
const SOCIAL_SECURITY_WAGE_BASE_2025 = 176100;
const SOCIAL_SECURITY_RATE = 0.062;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = 200000;
const VPDI_RATE = 0.006;
const VPDI_ADJUSTMENT = 23500;
const CHINA_BASIC_DEDUCTION = 60000;

function clampMoney(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }
  return number;
}

function formatMoney(value, currency) {
  const rounded = Math.round(value);
  const number = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.abs(rounded));

  if (currency === "USD") {
    return `${rounded < 0 ? "-" : ""}$${number}`;
  }

  if (currency === "CNY") {
    return `${rounded < 0 ? "-" : ""}¥${number}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatBalance(amount, exchangeRate) {
  const label = amount >= 0 ? "待补 " : "待退 ";
  return `${label}${formatPanelMoneyFromUsd(Math.abs(amount), exchangeRate, "us")}`;
}

function convertFromUsd(amount, exchangeRate, displayCurrency) {
  return displayCurrency === "USD" ? amount : amount * exchangeRate;
}

function convertFromCny(amount, exchangeRate, displayCurrency) {
  return displayCurrency === "CNY" ? amount : amount / exchangeRate;
}

function formatPanelMoneyFromUsd(amount, exchangeRate, panel) {
  const displayCurrency = panelCurrencies[panel];
  return formatMoney(convertFromUsd(amount, exchangeRate, displayCurrency), displayCurrency);
}

function formatPanelMoneyFromCny(amount, exchangeRate, panel) {
  const displayCurrency = panelCurrencies[panel];
  return formatMoney(convertFromCny(amount, exchangeRate, displayCurrency), displayCurrency);
}

function progressiveTax(income, brackets) {
  let tax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    if (income <= previousLimit) {
      break;
    }

    const taxableSlice = Math.min(income, bracket.upTo) - previousLimit;
    if (taxableSlice > 0) {
      tax += taxableSlice * bracket.rate;
    }

    previousLimit = bracket.upTo;
  }

  return Math.max(0, tax);
}

function calculateChinaTax(grossSalaryCny, socialDeduction, specialDeduction) {
  const taxableIncome = Math.max(
    0,
    grossSalaryCny - CHINA_BASIC_DEDUCTION - socialDeduction - specialDeduction,
  );

  if (taxableIncome === 0 || grossSalaryCny === 0) {
    return {
      grossSalaryCny,
      socialDeduction,
      specialDeduction,
      taxableIncome,
      tax: 0,
      effectiveRate: 0,
    };
  }

  const bracket = chinaBrackets.find((item) => taxableIncome <= item.limit);
  const tax = Math.max(0, taxableIncome * bracket.rate - bracket.quickDeduction);

  return {
    grossSalaryCny,
    socialDeduction,
    specialDeduction,
    taxableIncome,
    tax,
    effectiveRate: tax / grossSalaryCny,
  };
}

function calculateUsTax(grossSalaryUsd, federalPrepaidTax, statePrepaidTax) {
  const federalTaxableIncome = Math.max(0, grossSalaryUsd - FEDERAL_STANDARD_DEDUCTION_2025_SINGLE);
  const californiaTaxableIncome = Math.max(0, grossSalaryUsd - CALIFORNIA_STANDARD_DEDUCTION_2025_SINGLE);

  const federalTax = progressiveTax(federalTaxableIncome, federalBrackets2025Single);
  const californiaTax = progressiveTax(californiaTaxableIncome, californiaBrackets2025Single);
  const socialSecurityTax = Math.min(grossSalaryUsd, SOCIAL_SECURITY_WAGE_BASE_2025) * SOCIAL_SECURITY_RATE;
  const medicareTax = grossSalaryUsd * MEDICARE_RATE;
  const additionalMedicareTax =
    Math.max(0, grossSalaryUsd - ADDITIONAL_MEDICARE_THRESHOLD_SINGLE) * ADDITIONAL_MEDICARE_RATE;
  const sdiTax = (grossSalaryUsd + VPDI_ADJUSTMENT) * VPDI_RATE;
  const totalTax =
    federalTax + californiaTax + socialSecurityTax + medicareTax + additionalMedicareTax + sdiTax;
  const creditableIncomeTax = federalTax + californiaTax;
  const federalBalance = federalTax - federalPrepaidTax;
  const stateBalance = californiaTax - statePrepaidTax;

  return {
    grossSalaryUsd,
    federalTaxableIncome,
    californiaTaxableIncome,
    federalTax,
    federalPrepaidTax,
    federalBalance,
    californiaTax,
    statePrepaidTax,
    stateBalance,
    socialSecurityTax,
    medicareTax,
    additionalMedicareTax,
    sdiTax,
    totalTax,
    creditableIncomeTax,
    incomeTaxBalance: federalBalance + stateBalance,
    effectiveRate: grossSalaryUsd > 0 ? totalTax / grossSalaryUsd : 0,
    creditableRate: grossSalaryUsd > 0 ? creditableIncomeTax / grossSalaryUsd : 0,
    incomeTaxRate: grossSalaryUsd > 0 ? creditableIncomeTax / grossSalaryUsd : 0,
  };
}

function normalizeIncome() {
  const usSalary = clampMoney(usSalaryInput.value);
  const chinaSalary = clampMoney(chinaSalaryInput.value);
  const exchangeRate = Math.max(0.01, clampMoney(exchangeRateInput.value, 7.2));
  const grossSalaryUsd = usSalary + chinaSalary / exchangeRate;
  const grossSalaryCny = chinaSalary + usSalary * exchangeRate;

  return {
    usSalary,
    chinaSalary,
    exchangeRate,
    grossSalaryUsd,
    grossSalaryCny,
  };
}

function updateCurrencyButtons() {
  panelCurrencyButtons.forEach((button) => {
    const panel = button.dataset.panelCurrency;
    button.classList.toggle("is-active", button.dataset.currency === panelCurrencies[panel]);
  });
}

function renderTopUp(china, us, exchangeRate) {
  const creditableUsTaxCny = us.creditableIncomeTax * exchangeRate;
  const topUpTax = Math.max(0, china.tax - creditableUsTaxCny);
  const hasTopUp = china.effectiveRate > us.creditableRate && topUpTax > 0;

  outputs.chinaTopUp.textContent = formatPanelMoneyFromCny(topUpTax, exchangeRate, "china");
  outputs.creditableUsTax.textContent = formatPanelMoneyFromUsd(us.creditableIncomeTax, exchangeRate, "us");

  if (hasTopUp) {
    topUpCard.classList.remove("no-top-up");
    topUpExplanation.textContent =
      "中国综合税率高于美国可抵扣所得税税率，按当前口径估算需要在中国补缴这部分差额。";
    return;
  }

  topUpCard.classList.add("no-top-up");
  topUpExplanation.textContent =
    "按当前输入，中国综合税率没有高于美国可抵扣所得税税率，估算无需额外在中国补缴。";
}

function getCurrentCalculations() {
  const { exchangeRate, grossSalaryUsd, grossSalaryCny } = normalizeIncome();
  const socialDeduction = clampMoney(socialDeductionInput.value);
  const specialDeduction = clampMoney(specialDeductionInput.value);
  const federalPrepaidTax = clampMoney(federalPrepaidTaxInput.value);
  const statePrepaidTax = clampMoney(statePrepaidTaxInput.value);

  const china = calculateChinaTax(grossSalaryCny, socialDeduction, specialDeduction);
  const us = calculateUsTax(grossSalaryUsd, federalPrepaidTax, statePrepaidTax);

  return {
    exchangeRate,
    grossSalaryUsd,
    grossSalaryCny,
    china,
    us,
  };
}

function renderMainResults() {
  if (!mainCalculation) {
    return;
  }

  const { exchangeRate, grossSalaryUsd, grossSalaryCny, china, us } = mainCalculation;

  outputs.totalIncomeUsdDisplay.textContent = formatMoney(grossSalaryUsd, "USD");
  outputs.totalIncomeCnyDisplay.textContent = formatMoney(grossSalaryCny, "CNY");

  outputs.chinaTax.textContent = formatPanelMoneyFromCny(china.tax, exchangeRate, "china");
  outputs.chinaRate.textContent = formatPercent(china.effectiveRate);
  outputs.chinaGross.textContent = formatPanelMoneyFromCny(china.grossSalaryCny, exchangeRate, "china");
  outputs.chinaBasicDeduction.textContent = formatPanelMoneyFromCny(CHINA_BASIC_DEDUCTION, exchangeRate, "china");
  outputs.chinaSocialDeduction.textContent = formatPanelMoneyFromCny(china.socialDeduction, exchangeRate, "china");
  outputs.chinaSpecialDeduction.textContent = formatPanelMoneyFromCny(china.specialDeduction, exchangeRate, "china");
  outputs.chinaTaxable.textContent = formatPanelMoneyFromCny(china.taxableIncome, exchangeRate, "china");
  outputs.chinaTaxOnly.textContent = formatPanelMoneyFromCny(china.tax, exchangeRate, "china");

  outputs.usTax.textContent = formatPanelMoneyFromUsd(us.totalTax, exchangeRate, "us");
  outputs.usRate.textContent = formatPercent(us.effectiveRate);
  outputs.usIncomeTaxRate.textContent = formatPercent(us.incomeTaxRate);
  outputs.usGross.textContent = formatPanelMoneyFromUsd(us.grossSalaryUsd, exchangeRate, "us");
  outputs.federalTaxableIncome.textContent = formatPanelMoneyFromUsd(us.federalTaxableIncome, exchangeRate, "us");
  outputs.californiaTaxableIncome.textContent = formatPanelMoneyFromUsd(us.californiaTaxableIncome, exchangeRate, "us");
  outputs.federalTax.textContent = formatPanelMoneyFromUsd(us.federalTax, exchangeRate, "us");
  outputs.californiaTax.textContent = formatPanelMoneyFromUsd(us.californiaTax, exchangeRate, "us");
  outputs.socialSecurityTax.textContent = formatPanelMoneyFromUsd(us.socialSecurityTax, exchangeRate, "us");
  outputs.medicareTax.textContent = formatPanelMoneyFromUsd(us.medicareTax, exchangeRate, "us");
  outputs.additionalMedicareTax.textContent = formatPanelMoneyFromUsd(us.additionalMedicareTax, exchangeRate, "us");
  outputs.sdiTax.textContent = formatPanelMoneyFromUsd(us.sdiTax, exchangeRate, "us");

  renderTopUp(china, us, exchangeRate);
}

function renderSettlement() {
  if (!settlementCalculation) {
    return;
  }

  const { exchangeRate, us } = settlementCalculation;

  outputs.federalPrepaidTaxDisplay.textContent = formatPanelMoneyFromUsd(us.federalPrepaidTax, exchangeRate, "us");
  outputs.federalBalance.textContent = formatBalance(us.federalBalance, exchangeRate);
  outputs.statePrepaidTaxDisplay.textContent = formatPanelMoneyFromUsd(us.statePrepaidTax, exchangeRate, "us");
  outputs.stateBalance.textContent = formatBalance(us.stateBalance, exchangeRate);
  outputs.usIncomeTaxBalance.textContent = formatBalance(us.incomeTaxBalance, exchangeRate);
}

function recalculateMainResults() {
  mainCalculation = getCurrentCalculations();
  renderMainResults();
}

function recalculateSettlement() {
  settlementCalculation = getCurrentCalculations();
  renderSettlement();
}

panelCurrencyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    panelCurrencies[button.dataset.panelCurrency] = button.dataset.currency;
    updateCurrencyButtons();
    renderMainResults();
    renderSettlement();
  });
});

calculateBtn.addEventListener("click", recalculateMainResults);
settlementCalculateBtn.addEventListener("click", recalculateSettlement);
updateCurrencyButtons();
mainCalculation = getCurrentCalculations();
settlementCalculation = getCurrentCalculations();
renderMainResults();
renderSettlement();
