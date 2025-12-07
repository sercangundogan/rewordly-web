// Test script for the Grammar Check API
// Run with: node test-grammar-api.js
// Make sure the dev server is running: npm run dev

const testGrammarAPI = async () => {
  const tests = [
    {
      name: 'Test 1: Basic grammar error',
      text: 'I goes to the store yesterday.',
    },
    {
      name: 'Test 2: Multiple errors',
      text: 'I goes to the store yesterday. I buyed some apples. They was happy.',
    },
    {
      name: 'Test 3: No errors',
      text: 'I went to the store yesterday. I bought some apples.',
    },
    {
      name: 'Test 4: Spelling error',
      text: 'This is a testt with a spelling error.',
    },
    {
      name: 'Test 5: Proper noun (should not be flagged)',
      text: 'I go to the store yesterday and I bought some apples. He did not like them. She is happy. They are there too. My name is Sercan.',
    },
    {
      name: 'Test 6: Duplicate verb (like Grammarly detects)',
      text: 'Is everything is going well or what?',
    },
  ];

  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log('='.repeat(50));
    console.log('Input text:', test.text);
    
    try {
      const response = await fetch('http://localhost:3000/api/grammar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: test.text
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ API call successful!');
        console.log('Errors found:', result.errors.length);
        
        if (result.errors.length > 0) {
          console.log('\nErrors:');
          result.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. [${error.start}-${error.end}] "${error.word}"`);
            console.log(`     Type: ${error.type}`);
            console.log(`     Suggestions: ${error.suggestions.join(', ')}`);
          });
        }
        
        console.log('\nCorrected text:', result.corrected);
      } else {
        console.log('❌ API call failed:', result.message || result.error);
      }
    } catch (error) {
      console.error('❌ Test failed with error:', error.message);
      console.log('Make sure the development server is running with: npm run dev');
    }
  }
};

// Only run if this file is executed directly
if (require.main === module) {
  testGrammarAPI().catch(console.error);
}

module.exports = { testGrammarAPI };


