import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🌱 Seeding mock analysis data...');

  // Ensure test user exists
  let user = await prisma.user.findUnique({
    where: { email: 'test@fightsight.dev' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: DEFAULT_TEST_USER_ID,
        email: 'test@fightsight.dev',
        passwordHash: 'not-used-yet',
        fullName: 'Test User',
        role: 'user',
        emailVerified: true,
      },
    });
    console.log('✅ Created test user');
  }

  // Create a video record using the actual uploaded file
  const actualVideoFile = 'VID-20241129-WA0099-1765202667665.mp4';
  const actualFileSize = 30408704; // ~29MB

  const video = await prisma.video.create({
    data: {
      userId: user.id,
      originalFilename: actualVideoFile,
      storagePath: actualVideoFile,
      fileSizeBytes: BigInt(actualFileSize),
      mimeType: 'video/mp4',
      durationSeconds: 180.5, // Approximate - update if you know exact duration
      width: 1920,
      height: 1080,
      fps: 30.0,
      uploadStatus: 'uploaded',
    },
  });
  console.log(`✅ Created video record for: ${actualVideoFile}`);
  console.log(`   Video ID: ${video.id}`);

  // Create a completed analysis session
  const analysisSession = await prisma.analysisSession.create({
    data: {
      videoId: video.id,
      userId: user.id,
      sportType: 'boxing',
      roundCount: 1,
      status: 'completed',
      progressPercentage: 100,
      startedAt: new Date(Date.now() - 180000), // Started 3 minutes ago
      completedAt: new Date(), // Just completed
      llmProvider: 'anthropic',
      llmModel: 'claude-3-5-sonnet',
      totalLlmApiCalls: 25,
      totalFramesAnalyzed: 542,
      totalStrikesDetected: 127,
      totalCombinationsDetected: 12,
      processingTimeSeconds: 165,
      totalCostUsd: 0.45,
    },
  });
  console.log(`✅ Created analysis session: ${analysisSession.id}`);

  // Create two session fighters
  const fighterA = await prisma.sessionFighter.create({
    data: {
      analysisSessionId: analysisSession.id,
      fighterLabel: 'fighter_a',
      cornerColor: 'red',
      displayName: 'Fighter A (Red)',
      stance: 'orthodox',
      totalStrikesThrown: 89,
      totalStrikesLanded: 65,
      totalStrikesReceived: 38,
    },
  });

  const fighterB = await prisma.sessionFighter.create({
    data: {
      analysisSessionId: analysisSession.id,
      fighterLabel: 'fighter_b',
      cornerColor: 'blue',
      displayName: 'Fighter B (Blue)',
      stance: 'southpaw',
      totalStrikesThrown: 78,
      totalStrikesLanded: 62,
      totalStrikesReceived: 65,
    },
  });
  console.log(`✅ Created session fighters`);

  // Generate realistic strike events
  const strikeTypes = [
    { technique: 'jab', category: 'hand', count: 45 },
    { technique: 'cross', category: 'hand', count: 28 },
    { technique: 'left_hook', category: 'hand', count: 16 },
    { technique: 'right_hook', category: 'hand', count: 12 },
    { technique: 'uppercut', category: 'hand', count: 11 },
    { technique: 'body_shot', category: 'hand', count: 9 },
    { technique: 'overhand', category: 'hand', count: 6 },
  ];

  const targetZones: Array<'head' | 'body' | 'legs'> = ['head', 'head', 'head', 'body', 'head', 'body', 'head', 'head'];
  const outcomes: Array<'landed_clean' | 'partially_landed' | 'blocked' | 'slipped' | 'missed'> = [
    'landed_clean',
    'landed_clean',
    'landed_clean',
    'partially_landed',
    'blocked',
    'landed_clean',
    'slipped',
    'landed_clean',
    'missed',
  ];

  let strikeEvents = [];
  let currentTime = 5.0; // Start 5 seconds into the video

  for (const strikeType of strikeTypes) {
    for (let i = 0; i < strikeType.count; i++) {
      // Alternate between fighters
      const isA = Math.random() > 0.48; // Slight advantage to fighter A
      const thrower = isA ? fighterA : fighterB;
      const receiver = isA ? fighterB : fighterA;

      currentTime += Math.random() * 3 + 0.5; // Random 0.5-3.5 second gaps

      if (currentTime > 180) break; // Don't exceed video duration

      strikeEvents.push({
        analysisSessionId: analysisSession.id,
        timestampSeconds: currentTime,
        frameNumber: Math.floor(currentTime * 30),
        roundNumber: 1,
        throwerId: thrower.id,
        receiverId: receiver.id,
        throwerStance: thrower.stance,
        strikeCategory: strikeType.category as 'hand',
        technique: strikeType.technique,
        targetZone: targetZones[Math.floor(Math.random() * targetZones.length)],
        outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
        detectionConfidence: 0.85 + Math.random() * 0.14, // 0.85-0.99
        classificationConfidence: 0.75 + Math.random() * 0.24, // 0.75-0.99
        isPartOfCombination: Math.random() > 0.7, // 30% are part of combos
      });
    }
  }

  // Create all strike events
  await prisma.strikeEvent.createMany({
    data: strikeEvents,
  });
  console.log(`✅ Created ${strikeEvents.length} strike events`);

  // Create some combinations
  const combinations = [
    {
      analysisSessionId: analysisSession.id,
      throwerId: fighterA.id,
      startTimestampSeconds: 15.2,
      endTimestampSeconds: 16.1,
      durationSeconds: 0.9,
      strikeCount: 3,
      combinationName: 'Jab-Cross-Hook',
      strikesLanded: 2,
      strikesMissed: 1,
    },
    {
      analysisSessionId: analysisSession.id,
      throwerId: fighterB.id,
      startTimestampSeconds: 45.5,
      endTimestampSeconds: 46.7,
      durationSeconds: 1.2,
      strikeCount: 4,
      combinationName: 'Double Jab-Cross-Hook',
      strikesLanded: 3,
      strikesMissed: 1,
    },
    {
      analysisSessionId: analysisSession.id,
      throwerId: fighterA.id,
      startTimestampSeconds: 92.1,
      endTimestampSeconds: 93.0,
      durationSeconds: 0.9,
      strikeCount: 2,
      combinationName: 'Cross-Hook',
      strikesLanded: 2,
      strikesMissed: 0,
    },
  ];

  await prisma.combination.createMany({
    data: combinations,
  });
  console.log(`✅ Created ${combinations.length} combinations`);

  // Create an analysis report
  await prisma.analysisReport.create({
    data: {
      analysisSessionId: analysisSession.id,
      reportType: 'summary',
      reportFormat: 'json',
      contentJson: {
        overview: 'Strong performance with good punch output and accuracy',
        stats: {
          totalStrikes: 127,
          avgStrikesPerMinute: 42,
          accuracy: '73%',
        },
      },
      keyInsights: [
        'Fighter A showed strong jab utilization (45 jabs thrown)',
        'Fighter B demonstrated effective counter-punching',
        'Both fighters maintained high work rate throughout the session',
      ],
      strengths: [
        'High volume punching',
        'Good defensive awareness',
        'Effective combination work',
      ],
      areasForImprovement: [
        'Reduce telegraphed crosses',
        'Improve body shot frequency',
        'Work on head movement after combinations',
      ],
      generatedByLlmProvider: 'anthropic',
      generatedByLlmModel: 'claude-3-5-sonnet',
      generationCostUsd: 0.12,
    },
  });
  console.log(`✅ Created analysis report`);

  console.log(`\n🎉 Mock data seeding complete!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Video File: ${actualVideoFile}`);
  console.log(`   Video ID: ${video.id}`);
  console.log(`   Analysis Session ID: ${analysisSession.id}`);
  console.log(`   Total Strikes: ${strikeEvents.length}`);
  console.log(`   Total Combinations: ${combinations.length}`);
  console.log(`\n🔗 Test the results page with REAL VIDEO:`);
  console.log(`   http://localhost:3001/results/${video.id}`);
  console.log(`\n✨ The video player will now work with your actual uploaded video!`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
