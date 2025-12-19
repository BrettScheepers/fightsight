const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk').default;

const apiKey = process.env.ANTHROPIC_API_KEY;

console.log('Testing Claude vision with single frame...');
console.log('API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT SET');

async function testSingleFrame() {
  try {
    // Load the test frame
    const imagePath = '/app/tests/test-frame.jpg';
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');

    console.log(`\nLoaded image: ${imagePath}`);
    console.log(`Image size: ${imageBuffer.length} bytes`);
    console.log(`Base64 length: ${imageBase64.length} characters`);

    // Create Claude client
    const client = new Anthropic({ apiKey });

    // Use the actual prompt from the codebase
    const prompt = `You are analyzing a frame from a boxing sparring session.

Frame Information:
- Frame Number: 150
- Timestamp: 7.5s

Your task is to classify any strike visible in this frame. Analyze the image and provide the following information in JSON format:

{
  "strikeDetected": boolean,
  "technique": string | null,
  "thrower": "fighter_a" | "fighter_b" | null,
  "receiver": "fighter_a" | "fighter_b" | null,
  "targetZone": "head" | "body" | "legs" | null,
  "outcome": "landed_clean" | "partially_landed" | "blocked" | "slipped" | "missed" | null,
  "confidence": number (0-1)
}

Guidelines:
- strikeDetected: true if ANY strike is visible (throwing, landing, or in motion)
- technique: Specific strike type (jab, cross, hook, uppercut, body_shot, etc.)
- thrower: Which fighter is throwing the strike
- receiver: Which fighter is receiving/defending against the strike
- targetZone: Where the strike is aimed
- outcome: What happened with the strike
  * landed_clean: Strike connected cleanly with target
  * partially_landed: Strike grazed or partially connected
  * blocked: Strike was blocked by guard/defense
  * slipped: Defender moved head/body to avoid
  * missed: Strike completely missed target
- confidence: Your confidence in this classification (0.0-1.0)

Important:
- If no strike is visible in the frame, set strikeDetected to false and all other fields to null
- Be conservative with "landed_clean" - only use when strike clearly connects
- Consider fighter positioning, glove placement, and body movement
- Use context clues like defensive reactions to help classify outcome
- Maintain consistency with boxing techniques and rules

Return ONLY the JSON object, no additional text.`;

    console.log('\nCalling Claude API...');

    // Try different model names
    const modelsToTry = [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];

    let response = null;
    for (const modelName of modelsToTry) {
      try {
        console.log(`\nTrying model: ${modelName}...`);
        response = await client.messages.create({
          model: modelName,
          max_tokens: 1024,
          temperature: 0.4,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }]
        });
        console.log(`✅ Model ${modelName} works!`);
        break;
      } catch (err) {
        console.log(`❌ ${modelName}: ${err.status} - ${err.error?.error?.type || err.message}`);
      }
    }

    if (!response) {
      throw new Error('No working model found');
    }

    console.log('\n✅ SUCCESS! Claude responded:');
    console.log('Response ID:', response.id);
    console.log('Model:', response.model);
    console.log('Stop reason:', response.stop_reason);
    console.log('\nContent:');
    console.log(response.content[0].text);

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(response.content[0].text);
      console.log('\nParsed JSON:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('\nNote: Response is not valid JSON');
    }

  } catch (error) {
    console.log('\n❌ FAILED!');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    console.log('Status:', error.status);

    if (error.status === 404) {
      console.log('\nModel not found. This API key may not have access to Claude models.');
      console.log('Please verify your API key is from console.anthropic.com');
    } else if (error.status === 401) {
      console.log('\nAuthentication failed. Please check your API key.');
    }
  }
}

testSingleFrame();
