// Test file to verify timezone functions
const { getStartOfMonth, getEndOfMonth, getTodayWIB } = require('./lib/utils/timezone.ts');

console.log('Testing timezone functions:');
console.log('getTodayWIB:', getTodayWIB());
console.log('getStartOfMonth:', getStartOfMonth());
console.log('getEndOfMonth:', getEndOfMonth());
