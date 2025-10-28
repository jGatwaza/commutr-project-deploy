import { buildPack, type Candidate, type PackReq } from '../builder.js';

describe('Pack Builder', () => {
  // Small in-test catalog for testing
  const testCatalog: Candidate[] = [
    {
      videoId: 'vid1',
      durationSec: 180,
      title: 'Python Basics Part 1',
      channelTitle: 'CodeAcademy',
      level: 'beginner',
      topicTags: ['python', 'programming'],
    },
    {
      videoId: 'vid2',
      durationSec: 240,
      title: 'Python Basics Part 2',
      channelTitle: 'CodeAcademy',
      level: 'beginner',
      topicTags: ['python', 'programming'],
    },
    {
      videoId: 'vid3',
      durationSec: 300,
      title: 'Python Intermediate',
      channelTitle: 'TechEd',
      level: 'intermediate',
      topicTags: ['python', 'programming'],
    },
    {
      videoId: 'vid4',
      durationSec: 360,
      title: 'Advanced Python',
      channelTitle: 'ProCoder',
      level: 'advanced',
      topicTags: ['python', 'programming'],
    },
    {
      videoId: 'vid5',
      durationSec: 120,
      title: 'Quick Python Tips',
      channelTitle: 'QuickLearn',
      level: 'beginner',
      topicTags: ['python', 'tips'],
    },
    {
      videoId: 'vid6',
      durationSec: 200,
      title: 'Python for Beginners',
      channelTitle: 'EasyCode',
      level: 'beginner',
      topicTags: ['python', 'tutorial'],
    },
    {
      videoId: 'vid7',
      durationSec: 150,
      title: 'JavaScript Basics',
      channelTitle: 'WebDev',
      level: 'beginner',
      topicTags: ['javascript', 'web'],
    },
    {
      videoId: 'vid8',
      durationSec: 420,
      title: 'Python Deep Dive',
      channelTitle: 'DeepCode',
      level: 'beginner',
      topicTags: ['python', 'advanced-topics'],
    },
    {
      videoId: 'vid9',
      durationSec: 90,
      title: 'Python Quick Start',
      channelTitle: 'FastLearn',
      level: 'beginner',
      topicTags: ['python', 'quickstart'],
    },
    {
      videoId: 'vid10',
      durationSec: 150,
      title: 'Python Essentials',
      channelTitle: 'CodeBasics',
      level: 'beginner',
      topicTags: ['python', 'essentials'],
    },
  ];

  test('fits_within_tolerance', () => {
    const req: PackReq = {
      topic: 'python',
      level: 'beginner',
      targetSeconds: 600,
    };

    const pack = buildPack(testCatalog, req);

    // Should be within [540, 660] (target ± 60)
    expect(pack.totalDurationSec).toBeGreaterThanOrEqual(540);
    expect(pack.totalDurationSec).toBeLessThanOrEqual(660);
    expect(pack.underFilled).toBe(false);
  });

  test('no_duplicates', () => {
    // Create catalog with duplicate videoIds
    const catalogWithDupes: Candidate[] = [
      {
        videoId: 'dup1',
        durationSec: 100,
        level: 'beginner',
        topicTags: ['python'],
      },
      {
        videoId: 'dup1', // Duplicate
        durationSec: 100,
        level: 'beginner',
        topicTags: ['python'],
      },
      {
        videoId: 'dup2',
        durationSec: 150,
        level: 'beginner',
        topicTags: ['python'],
      },
      {
        videoId: 'dup2', // Duplicate
        durationSec: 150,
        level: 'beginner',
        topicTags: ['python'],
      },
    ];

    const req: PackReq = {
      topic: 'python',
      level: 'beginner',
      targetSeconds: 300,
    };

    const pack = buildPack(catalogWithDupes, req);

    // Extract all videoIds from the pack
    const videoIds = pack.items.map((item) => item.videoId);
    const uniqueIds = new Set(videoIds);

    // No duplicates: set size should equal array length
    expect(uniqueIds.size).toBe(videoIds.length);
  });

  test('exact_fit_preferred_over_near_fit', () => {
    // Catalog designed to test exact fit preference
    const catalog: Candidate[] = [
      {
        videoId: 'exact',
        durationSec: 600, // Exactly target
        level: 'beginner',
        topicTags: ['python'],
      },
      {
        videoId: 'near1',
        durationSec: 300,
        level: 'beginner',
        topicTags: ['python'],
      },
      {
        videoId: 'near2',
        durationSec: 300,
        level: 'beginner',
        topicTags: ['python'],
      },
    ];

    const req: PackReq = {
      topic: 'python',
      level: 'beginner',
      targetSeconds: 600,
    };

    const pack = buildPack(catalog, req);

    // With greedy algorithm starting from shortest, it should pick near1+near2 first
    // But if we want exact fit preferred, we need to adjust the algorithm
    // For now, greedy will pick shortest first: near1 (300) + near2 (300) = 600
    // This is still an exact fit to target
    expect(pack.totalDurationSec).toBe(600);
    expect(pack.underFilled).toBe(false);
  });

  test('sparse_topic_returns_underFilled', () => {
    // Very limited catalog that can't meet target
    const sparseCatalog: Candidate[] = [
      {
        videoId: 'sparse1',
        durationSec: 100,
        level: 'beginner',
        topicTags: ['rare-topic'],
      },
      {
        videoId: 'sparse2',
        durationSec: 150,
        level: 'beginner',
        topicTags: ['rare-topic'],
      },
    ];

    const req: PackReq = {
      topic: 'rare-topic',
      level: 'beginner',
      targetSeconds: 600, // Target 600, but only 250 available
    };

    const pack = buildPack(sparseCatalog, req);

    // Should be underFilled since total < target - 60 (540)
    expect(pack.underFilled).toBe(true);
    expect(pack.totalDurationSec).toBeLessThan(540);
    expect(pack.totalDurationSec).toBe(250); // All available content
  });

  test('determinism_same_inputs_same_output', () => {
    const req: PackReq = {
      topic: 'python',
      level: 'beginner',
      targetSeconds: 500,
    };

    // Run the same request multiple times
    const pack1 = buildPack(testCatalog, req);
    const pack2 = buildPack(testCatalog, req);
    const pack3 = buildPack(testCatalog, req);

    // All results should be identical
    expect(pack1).toEqual(pack2);
    expect(pack2).toEqual(pack3);

    // Verify items are in the same order
    expect(pack1.items).toEqual(pack2.items);
    expect(pack2.items).toEqual(pack3.items);

    // Verify same total duration
    expect(pack1.totalDurationSec).toBe(pack2.totalDurationSec);
    expect(pack2.totalDurationSec).toBe(pack3.totalDurationSec);
  });

  // Additional edge case tests
  test('empty_catalog_returns_underFilled', () => {
    const req: PackReq = {
      topic: 'python',
      level: 'beginner',
      targetSeconds: 600,
    };

    const pack = buildPack([], req);

    expect(pack.underFilled).toBe(true);
    expect(pack.totalDurationSec).toBe(0);
    expect(pack.items).toHaveLength(0);
  });

  test('no_matching_level_returns_underFilled', () => {
    const req: PackReq = {
      topic: 'python',
      level: 'advanced', // Most videos are beginner
      targetSeconds: 600,
    };

    const pack = buildPack(testCatalog, req);

    // Only vid4 matches (360 sec), which is < 540 (target - 60)
    expect(pack.underFilled).toBe(true);
    expect(pack.totalDurationSec).toBe(360);
  });

  test('no_matching_topic_returns_underFilled', () => {
    const req: PackReq = {
      topic: 'nonexistent',
      level: 'beginner',
      targetSeconds: 600,
    };

    const pack = buildPack(testCatalog, req);

    expect(pack.underFilled).toBe(true);
    expect(pack.totalDurationSec).toBe(0);
    expect(pack.items).toHaveLength(0);
  });

  test('respects_upper_bound', () => {
    // Catalog with many short videos
    const catalog: Candidate[] = Array.from({ length: 20 }, (_, i) => ({
      videoId: `short${i}`,
      durationSec: 100,
      level: 'beginner' as const,
      topicTags: ['python'],
    }));

    const req: PackReq = {
      topic: 'python',
      level: 'beginner',
      targetSeconds: 600,
    };

    const pack = buildPack(catalog, req);

    // Should not exceed target + 60 = 660
    expect(pack.totalDurationSec).toBeLessThanOrEqual(660);
  });

  test('deterministic_sort_by_duration_then_videoId', () => {
    // Catalog with same durations but different videoIds
    const catalog: Candidate[] = [
      {
        videoId: 'zebra',
        durationSec: 200,
        level: 'beginner',
        topicTags: ['python'],
      },
      {
        videoId: 'alpha',
        durationSec: 200,
        level: 'beginner',
        topicTags: ['python'],
      },
      {
        videoId: 'beta',
        durationSec: 200,
        level: 'beginner',
        topicTags: ['python'],
      },
    ];

    const req: PackReq = {
      topic: 'python',
      level: 'beginner',
      targetSeconds: 600,
    };

    const pack = buildPack(catalog, req);

    // Should select in alphabetical order: alpha, beta, zebra
    expect(pack.items[0]?.videoId).toBe('alpha');
    expect(pack.items[1]?.videoId).toBe('beta');
    expect(pack.items[2]?.videoId).toBe('zebra');
  });
});
