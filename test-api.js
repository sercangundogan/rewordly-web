// Simple test script for the Rewordly API
// Run with: node test-api.js

const testAPI = async () => {
  const testText = "This text needs to be rewrite for better grammar and clarity.";
  
  try {
    const response = await fetch('http://localhost:3000/api/rewrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: testText
      })
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ API test successful!');
      console.log('Original text:', testText);
      console.log('Rewritten text:', result.rewritten);
    } else {
      console.log('❌ API test failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('Make sure the development server is running with: npm run dev');
  }
};

// Only run if this file is executed directly
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI }; 