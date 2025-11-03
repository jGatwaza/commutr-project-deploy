// Jest setup file for global test configuration

// Mock environment variables
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.YOUTUBE_API_KEY = 'test-youtube-key';

// Global test utilities can be added here
global.testUtils = {
  // Helper to create mock conversation history
  createMockHistory: (exchanges) => {
    const history = [];
    exchanges.forEach(({ user, assistant }) => {
      if (user) history.push({ role: 'user', content: user });
      if (assistant) history.push({ role: 'assistant', content: assistant });
    });
    return history;
  },
  
  // Helper to create mock video candidates
  createMockVideos: (count, baseDuration = 600) => {
    return Array.from({ length: count }, (_, i) => ({
      videoId: `video${i + 1}`,
      title: `Test Video ${i + 1}`,
      channelTitle: 'Test Channel',
      durationSec: baseDuration + (i * 60),
      level: ['beginner', 'intermediate', 'advanced'][i % 3]
    }));
  },
};
