const Anthropic = require('@anthropic-ai/sdk').default;

const apiKey = process.env.ANTHROPIC_API_KEY;

console.log('Testing Claude API authentication...');
console.log('API Key length:', apiKey?.length);
console.log('API Key prefix:', apiKey?.substring(0, 20) + '...');

const client = new Anthropic({ apiKey });

async function testAuth() {
  try {
    // Try multiple model names to find which one works
    const modelsToTry = [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-latest',
      'claude-3-5-sonnet-20240620',
      'claude-3-sonnet-20240229'
    ];

    for (const modelName of modelsToTry) {
      try {
        console.log(`\nTrying model: ${modelName}...`);
        const response = await client.messages.create({
          model: modelName,
          max_tokens: 10,
          messages: [{
            role: 'user',
            content: 'Hello'
          }]
        });
        console.log(`✅ Model ${modelName} works!`);
        console.log('Response:', response.content[0].text);
        return;
      } catch (err) {
        console.log(`❌ Model ${modelName} failed: ${err.status} ${err.message}`);
      }
    }
    console.log('\n✅ Authentication successful!');
    console.log('Response:', response.content[0].text);
  } catch (error) {
    console.log('\n❌ Authentication failed!');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    console.log('Status:', error.status);
  }
}

testAuth();
