const Anthropic = require('@anthropic-ai/sdk').default;

console.log('Creating Anthropic client...');
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'test-key'
});

console.log('Client created:', !!client);
console.log('Client type:', typeof client);
console.log('Has messages:', !!client.messages);
console.log('messages type:', typeof client.messages);
console.log('Has messages.create:', typeof client.messages?.create);
console.log('\nClient properties:', Object.keys(client));
if (client.messages) {
  console.log('Messages properties:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.messages)));
}
