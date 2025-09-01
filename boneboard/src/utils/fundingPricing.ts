/**
 * Utility functions for funding pricing calculations
 */

export const BASE_FUNDING_COST = 6; // Base cost in ADA for 1 month

/**
 * Calculate the cost for funding based on duration in months
 * Cost is linear: 6 ADA for 1 month, 12 for 2 months, 18 for 3 months, etc.
 * @param months Number of months (1-12)
 * @param baseCost Base cost per month (defaults to BASE_FUNDING_COST)
 * @returns Cost in specified currency
 */
export const calculateFundingCost = (months: number, baseCost: number = BASE_FUNDING_COST): number => {
  if (months < 1 || months > 12) {
    throw new Error('Months must be between 1 and 12');
  }
  
  return baseCost * months;
};

/**
 * Calculate months from current date to target month-year
 * @param targetMonthYear Format: "YYYY-MM"
 * @returns Number of months from now
 */
export const calculateMonthsFromNow = (targetMonthYear: string): number => {
  if (!targetMonthYear) return 0;
  
  const [year, month] = targetMonthYear.split('-').map(Number);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() is 0-indexed
  
  const monthsFromNow = (year - currentYear) * 12 + (month - currentMonth);
  return Math.max(1, monthsFromNow + 1); // Minimum 1 month, +1 because we count current month as 1
};

/**
 * Format ADA amount for display
 * @param amount Amount in ADA
 * @returns Formatted string
 */
export const formatAdaAmount = (amount: number): string => {
  return `${amount.toLocaleString()} ADA`;
};

/**
 * Get pricing breakdown for all available months
 * @param baseCost Base cost per month
 * @param currency Currency symbol (ADA or BONE)
 * @returns Array of pricing options
 */
export const getPricingBreakdown = (baseCost: number = BASE_FUNDING_COST, currency: string = 'ADA'): Array<{months: number, cost: number, costFormatted: string}> => {
  const breakdown = [];
  for (let i = 1; i <= 12; i++) {
    const cost = calculateFundingCost(i, baseCost);
    breakdown.push({
      months: i,
      cost,
      costFormatted: `${cost.toLocaleString()} ${currency}`
    });
  }
  return breakdown;
};
