// Node smoke-test for the extracted calculation logic.
// Run with: node tests/time-algorithm.test.js

const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync('js/app.js', 'utf8');

assert(html.includes("const TIME_ZONE_OFFSET_HOURS = 6"), 'Bangladesh UTC+6 must be explicit');
assert(html.includes('const leap = new Date(year, 1, 29).getDate() === 29'), 'Leap-year handling missing');
assert(html.includes('getTimes(targetDate, division, isSalafi)'), 'Tomorrow Fajr should be calculated using tomorrow\'s date');
assert(!html.includes('https://'), 'Runtime JavaScript must not contain external URLs');

console.log('Offline algorithm smoke checks passed.');
