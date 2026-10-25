// Victor's scorecard targets (launch plan, 2026-10-25): what each number should read at week 4 of the launch and on
// December 31, 2026. These are the owner's numbers, not the server's: edit them here and nowhere else. They are shown
// as plain text beside the real numbers; nothing compares, colours or scores against them.
export const TARGET_COLUMNS = Object.freeze([
  { key: 'week4', label: 'Week 4' },
  { key: 'dec31', label: 'Dec 31' },
]);

export const SCORECARD_TARGETS = Object.freeze({
  coaches_activated: Object.freeze({ week4: '5', dec31: '9' }),
  paying_athletes_per_coach: Object.freeze({ week4: '5', dec31: '8' }),
  gmv: Object.freeze({ week4: '$8,000', dec31: '$30,000' }),
  month2_retention: Object.freeze({ week4: '—', dec31: '100% of the five' }),
  platform_revenue: Object.freeze({ week4: '$450', dec31: '$1,800' }),
});
