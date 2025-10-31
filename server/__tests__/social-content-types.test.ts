/**
 * Social Content Types Tests
 * 
 * Run with: npx tsx server/__tests__/social-content-types.test.ts
 */

import { 
  calculateTotalFormats, 
  groupWireframesByPlatformFormat,
  type WireframeOption 
} from "../langgraph/social-content-types";

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

console.log('\n=== Social Content Types Tests ===\n');

// Test 1: Calculate total formats - single platform
(() => {
  const formats = {
    'Facebook': ['Feed Image Ad', 'Stories Ad']
  };
  const total = calculateTotalFormats(formats);
  assertEquals(total, 2, "Should count formats for single platform");
})();

// Test 2: Calculate total formats - multiple platforms
(() => {
  const formats = {
    'Facebook': ['Feed Image Ad', 'Stories Ad'],
    'Instagram': ['Feed Photo Ad', 'Reels Ad', 'Stories Ad'],
    'TikTok': ['In-Feed Video Ad']
  };
  const total = calculateTotalFormats(formats);
  assertEquals(total, 6, "Should count all formats across platforms");
})();

// Test 3: Calculate total formats - empty
(() => {
  const formats = {};
  const total = calculateTotalFormats(formats);
  assertEquals(total, 0, "Should return 0 for empty formats");
})();

// Test 4: Group wireframes - single format
(() => {
  const wireframes: WireframeOption[] = [
    {
      id: '1',
      platform: 'Facebook',
      format: 'Feed Image Ad',
      optionLabel: 'A',
      textFields: {},
      mediaSpecs: {},
      mediaConcept: 'Test',
      rationale: 'Test',
      complianceChecks: []
    },
    {
      id: '2',
      platform: 'Facebook',
      format: 'Feed Image Ad',
      optionLabel: 'B',
      textFields: {},
      mediaSpecs: {},
      mediaConcept: 'Test',
      rationale: 'Test',
      complianceChecks: []
    }
  ];
  
  const grouped = groupWireframesByPlatformFormat(wireframes);
  assert(grouped['Facebook'] !== undefined, "Should group by platform");
  assert(grouped['Facebook']['Feed Image Ad'] !== undefined, "Should group by format");
  assertEquals(grouped['Facebook']['Feed Image Ad'].length, 2, "Should contain both options");
})();

// Test 5: Group wireframes - multiple platforms and formats
(() => {
  const wireframes: WireframeOption[] = [
    {
      id: '1',
      platform: 'Facebook',
      format: 'Feed Image Ad',
      optionLabel: 'A',
      textFields: {},
      mediaSpecs: {},
      mediaConcept: 'Test',
      rationale: 'Test',
      complianceChecks: []
    },
    {
      id: '2',
      platform: 'Facebook',
      format: 'Stories Ad',
      optionLabel: 'A',
      textFields: {},
      mediaSpecs: {},
      mediaConcept: 'Test',
      rationale: 'Test',
      complianceChecks: []
    },
    {
      id: '3',
      platform: 'Instagram',
      format: 'Feed Photo Ad',
      optionLabel: 'A',
      textFields: {},
      mediaSpecs: {},
      mediaConcept: 'Test',
      rationale: 'Test',
      complianceChecks: []
    }
  ];
  
  const grouped = groupWireframesByPlatformFormat(wireframes);
  assert(Object.keys(grouped).length === 2, "Should have 2 platforms");
  assert(Object.keys(grouped['Facebook']).length === 2, "Facebook should have 2 formats");
  assert(Object.keys(grouped['Instagram']).length === 1, "Instagram should have 1 format");
})();

// Test 6: Group wireframes - empty array
(() => {
  const wireframes: WireframeOption[] = [];
  const grouped = groupWireframesByPlatformFormat(wireframes);
  assertEquals(Object.keys(grouped).length, 0, "Should return empty object for empty array");
})();

// Test 7: Wireframe validation - all option labels present
(() => {
  const wireframes: WireframeOption[] = [
    { id: '1', platform: 'Facebook', format: 'Feed Image Ad', optionLabel: 'A', textFields: {}, mediaSpecs: {}, mediaConcept: '', rationale: '', complianceChecks: [] },
    { id: '2', platform: 'Facebook', format: 'Feed Image Ad', optionLabel: 'B', textFields: {}, mediaSpecs: {}, mediaConcept: '', rationale: '', complianceChecks: [] },
    { id: '3', platform: 'Facebook', format: 'Feed Image Ad', optionLabel: 'C', textFields: {}, mediaSpecs: {}, mediaConcept: '', rationale: '', complianceChecks: [] },
  ];
  
  const labels = wireframes.map(w => w.optionLabel);
  assert(labels.includes('A') && labels.includes('B') && labels.includes('C'), "Should have all three options A, B, C");
})();

// Test 8: Calculate formats with zero formats
(() => {
  const formats = {
    'Facebook': [],
    'Instagram': []
  };
  const total = calculateTotalFormats(formats);
  assertEquals(total, 0, "Should handle empty format arrays");
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
