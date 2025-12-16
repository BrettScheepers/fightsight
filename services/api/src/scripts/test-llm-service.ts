/**
 * Test LLM Service Script
 *
 * Demonstrates the mock LLM service with sample requests
 */

import { getLLMService } from '../services/llm';

async function main() {
  console.log('=== Testing LLM Service ===\n');

  const llmService = getLLMService();

  // Test 1: Strike Classification
  console.log('Test 1: Strike Classification');
  console.log('------------------------------');

  const strikeRequest = {
    image: Buffer.from('mock-frame-data'),
    frameNumber: 120,
    timestamp: 6.0,
    sportType: 'boxing',
  };

  console.log('Request:', {
    frameNumber: strikeRequest.frameNumber,
    timestamp: strikeRequest.timestamp,
    sportType: strikeRequest.sportType,
  });

  const strikeResponse = await llmService.classifyStrike(strikeRequest);
  console.log('Response:', JSON.stringify(strikeResponse, null, 2));

  // Test 2: Multiple Classifications
  console.log('\n\nTest 2: Multiple Classifications (simulating parallel processing)');
  console.log('------------------------------------------------------------------');

  const requests = Array.from({ length: 5 }, (_, i) => ({
    image: Buffer.from(`mock-frame-${i}`),
    frameNumber: i * 30,
    timestamp: i * 1.5,
    sportType: 'boxing',
  }));

  const startTime = Date.now();
  const responses = await Promise.all(
    requests.map((req) => llmService.classifyStrike(req))
  );
  const duration = Date.now() - startTime;

  console.log(`Processed ${responses.length} frames in ${duration}ms (parallel)`);
  console.log('Average per frame:', (duration / responses.length).toFixed(1), 'ms');
  console.log('\nStrike detection rate:', responses.filter((r) => r.strikeDetected).length, '/', responses.length);

  responses.forEach((response, i) => {
    if (response.strikeDetected) {
      console.log(`Frame ${requests[i].frameNumber}: ${response.technique} (${response.outcome}) - ${(response.confidence! * 100).toFixed(1)}% confidence`);
    }
  });

  // Test 3: Report Generation
  console.log('\n\nTest 3: Report Generation');
  console.log('-------------------------');

  const reportRequest = {
    strikes: [
      {
        technique: 'jab',
        thrower: 'John Doe',
        targetZone: 'head',
        outcome: 'landed_clean',
        timestamp: 10.5,
      },
      {
        technique: 'cross',
        thrower: 'John Doe',
        targetZone: 'head',
        outcome: 'landed_clean',
        timestamp: 11.0,
      },
      {
        technique: 'hook',
        thrower: 'Jane Smith',
        targetZone: 'body',
        outcome: 'blocked',
        timestamp: 12.5,
      },
      {
        technique: 'jab',
        thrower: 'Jane Smith',
        targetZone: 'head',
        outcome: 'slipped',
        timestamp: 13.0,
      },
      {
        technique: 'uppercut',
        thrower: 'John Doe',
        targetZone: 'head',
        outcome: 'landed_clean',
        timestamp: 15.0,
      },
    ],
    combinations: [],
    fighters: [
      {
        displayName: 'John Doe',
        totalStrikesThrown: 45,
        totalStrikesLanded: 32,
        totalStrikesReceived: 28,
      },
      {
        displayName: 'Jane Smith',
        totalStrikesThrown: 38,
        totalStrikesLanded: 25,
        totalStrikesReceived: 32,
      },
    ],
    sportType: 'boxing',
  };

  const reportStartTime = Date.now();
  const reportResponse = await llmService.generateReport(reportRequest);
  const reportDuration = Date.now() - reportStartTime;

  console.log(`Report generated in ${reportDuration}ms`);
  console.log('\nOverview:');
  console.log(reportResponse.overview);
  console.log('\nKey Insights:');
  reportResponse.keyInsights.forEach((insight, i) => {
    console.log(`  ${i + 1}. ${insight}`);
  });
  console.log('\nStrengths:');
  reportResponse.strengths.forEach((strength, i) => {
    console.log(`  ${i + 1}. ${strength}`);
  });
  console.log('\nAreas for Improvement:');
  reportResponse.areasForImprovement.forEach((area, i) => {
    console.log(`  ${i + 1}. ${area}`);
  });

  console.log('\n=== All Tests Complete ===');
}

main().catch(console.error);
