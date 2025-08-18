// Quick test to verify time formatting with floating point numbers
function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "Unknown duration";
  const totalSeconds = Math.floor(Math.abs(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Test cases
const testCases = [
  { input: 72.412299999999996, expected: "1:12" },
  { input: 357.14648, expected: "5:57" },
  { input: 60.99999, expected: "1:00" },
  { input: 119.5, expected: "1:59" },
  { input: 0, expected: "0:00" }
];

console.log("Testing time formatting with floating point numbers:");
testCases.forEach(test => {
  const result = formatDuration(test.input);
  const passed = result === test.expected;
  console.log(`Input: ${test.input} => Output: ${result} | Expected: ${test.expected} | ${passed ? '✓ PASS' : '✗ FAIL'}`);
});
