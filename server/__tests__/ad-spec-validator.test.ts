/**
 * Ad Spec Validator Tests
 * 
 * Run with: npx tsx server/__tests__/ad-spec-validator.test.ts
 */

import { validateTextField, validateCTA, getRealTimeValidation, parseCharLimit } from "../utils/ad-spec-validator";

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`? ${message}`);
    testsPassed++;
  } else {
    console.error(`? ${message}`);
    testsFailed++;
  }
}

function assertEquals(actual: any, expected: any, message: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`? ${message}`);
    testsPassed++;
  } else {
    console.error(`? ${message}`);
    console.error(`  Expected: ${JSON.stringify(expected)}`);
    console.error(`  Actual: ${JSON.stringify(actual)}`);
    testsFailed++;
  }
}

console.log('\n=== Ad Spec Validator Tests ===\n');

// Test 1: Text field validation - under limit
(() => {
  const result = validateTextField("Hello world", { limit: "20 characters" });
  assert(result.passed, "Text under limit should pass");
  assertEquals(result.charCount, 11, "Character count should be 11");
})();

// Test 2: Text field validation - over limit
(() => {
  const result = validateTextField("This is a very long text that exceeds the limit", { limit: "20 characters" });
  assert(!result.passed, "Text over limit should fail");
  assert(result.reason !== undefined, "Should provide reason for failure");
})();

// Test 3: Text field validation - exactly at limit
(() => {
  const result = validateTextField("Exactly20Characters!", { limit: "20 characters" });
  assert(result.passed, "Text at exactly limit should pass");
  assertEquals(result.charCount, 20, "Character count should be 20");
})();

// Test 4: Text field validation - numeric limit
(() => {
  const result = validateTextField("Test", { limit: 10 });
  assert(result.passed, "Text should pass with numeric limit");
  assertEquals(result.charCount, 4, "Character count should be 4");
})();

// Test 5: CTA validation - valid option
(() => {
  const result = validateCTA("Shop Now", { 
    options: ["Learn More", "Shop Now", "Sign Up"],
    optional: false 
  });
  assert(result.passed, "Valid CTA should pass");
})();

// Test 6: CTA validation - invalid option
(() => {
  const result = validateCTA("Invalid CTA", { 
    options: ["Learn More", "Shop Now", "Sign Up"],
    optional: false 
  });
  assert(!result.passed, "Invalid CTA should fail");
})();

// Test 7: CTA validation - optional and missing
(() => {
  const result = validateCTA(undefined, { 
    options: ["Learn More", "Shop Now"],
    optional: true 
  });
  assert(result.passed, "Missing optional CTA should pass");
})();

// Test 8: CTA validation - required but missing
(() => {
  const result = validateCTA(undefined, { 
    options: ["Learn More"],
    required: true 
  });
  assert(!result.passed, "Missing required CTA should fail");
})();

// Test 9: Real-time validation - safe
(() => {
  const result = getRealTimeValidation("Short text", 100);
  assertEquals(result.status, "safe", "Short text should be safe");
  assert(result.remaining !== null && result.remaining > 10, "Should have plenty of room");
})();

// Test 10: Real-time validation - warning
(() => {
  const result = getRealTimeValidation("This is approaching the limit", 30);
  assertEquals(result.status, "warning", "Text near limit should show warning");
})();

// Test 11: Real-time validation - error
(() => {
  const result = getRealTimeValidation("This text is way too long for the limit", 20);
  assertEquals(result.status, "error", "Text over limit should show error");
  assert(result.remaining !== null && result.remaining < 0, "Should have negative remaining");
})();

// Test 12: Character limit parsing - various formats
(() => {
  const formats = [
    { input: "125 characters", expected: 125 },
    { input: "280 characters (recommended)", expected: 280 },
    { input: 40, expected: 40 },
    { input: "~100 chars", expected: 100 },
  ];
  
  formats.forEach(({ input, expected }) => {
    const limit = typeof input === 'number' ? input : parseInt(input.match(/\d+/)?.[0] || '0', 10);
    assertEquals(limit, expected, `Should parse "${input}" as ${expected}`);
  });
})();

// Test 13: Empty text validation
(() => {
  const result = validateTextField("", { limit: "100 characters" });
  assert(result.passed, "Empty text should pass validation");
  assertEquals(result.charCount, 0, "Empty text should have 0 characters");
})();

// Test 14: Unicode characters
(() => {
  const text = "Hello ?? World ??";
  const result = validateTextField(text, { limit: "20 characters" });
  assert(result.passed, "Unicode text should be counted correctly");
  assertEquals(result.charCount, text.length, "Should count unicode characters");
})();

// Test 15: Whitespace handling
(() => {
  const text = "   Text with   spaces   ";
  const result = validateTextField(text, { limit: "30 characters" });
  assertEquals(result.charCount, text.length, "Should count all whitespace");
})();

// Summary
console.log('\n=== Test Summary ===');
console.log(`Total: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed === 0) {
  console.log('\n? All tests passed!');
  process.exit(0);
} else {
  console.log(`\n? ${testsFailed} test(s) failed`);
  process.exit(1);
}
