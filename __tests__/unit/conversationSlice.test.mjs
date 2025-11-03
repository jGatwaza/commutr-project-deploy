import { configureStore } from '@reduxjs/toolkit';
import conversationReducer, {
  addUserMessage,
  addAssistantMessage,
  clearConversation,
  initializeSession,
  selectMessages,
  selectSessionId,
  selectConversationHistory,
} from '../../client/store/conversationSlice.js';

describe('Conversation Slice - Redux State Management', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        conversation: conversationReducer,
      },
    });
  });

  describe('Initial State', () => {
    test('should have empty messages array initially', () => {
      const state = store.getState();
      expect(selectMessages(state)).toEqual([]);
    });

    test('should have null sessionId initially', () => {
      const state = store.getState();
      expect(selectSessionId(state)).toBeNull();
    });
  });

  describe('Initialize Session', () => {
    test('should create sessionId when initialized', () => {
      store.dispatch(initializeSession());
      const state = store.getState();
      const sessionId = selectSessionId(state);
      
      expect(sessionId).not.toBeNull();
      expect(typeof sessionId).toBe('string');
    });

    test('should not overwrite existing sessionId', () => {
      store.dispatch(initializeSession());
      const state1 = store.getState();
      const sessionId1 = selectSessionId(state1);

      store.dispatch(initializeSession());
      const state2 = store.getState();
      const sessionId2 = selectSessionId(state2);

      expect(sessionId1).toBe(sessionId2);
    });
  });

  describe('Add User Message', () => {
    test('should add user message to store', () => {
      store.dispatch(addUserMessage('Hello'));
      const state = store.getState();
      const messages = selectMessages(state);

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello');
      expect(messages[0].timestamp).toBeDefined();
    });

    test('should add multiple user messages', () => {
      store.dispatch(addUserMessage('First message'));
      store.dispatch(addUserMessage('Second message'));
      const state = store.getState();
      const messages = selectMessages(state);

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].content).toBe('Second message');
    });

    test('should have increasing timestamps', () => {
      store.dispatch(addUserMessage('First'));
      store.dispatch(addUserMessage('Second'));
      const state = store.getState();
      const messages = selectMessages(state);

      expect(messages[1].timestamp).toBeGreaterThanOrEqual(messages[0].timestamp);
    });
  });

  describe('Add Assistant Message', () => {
    test('should add assistant message to store', () => {
      store.dispatch(addAssistantMessage('Hi there!'));
      const state = store.getState();
      const messages = selectMessages(state);

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
      expect(messages[0].content).toBe('Hi there!');
      expect(messages[0].timestamp).toBeDefined();
    });

    test('should maintain message order', () => {
      store.dispatch(addUserMessage('User message'));
      store.dispatch(addAssistantMessage('Assistant response'));
      store.dispatch(addUserMessage('User reply'));
      const state = store.getState();
      const messages = selectMessages(state);

      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].role).toBe('user');
    });
  });

  describe('Clear Conversation', () => {
    test('should clear all messages', () => {
      store.dispatch(addUserMessage('Message 1'));
      store.dispatch(addAssistantMessage('Message 2'));
      store.dispatch(addUserMessage('Message 3'));
      store.dispatch(clearConversation());
      
      const state = store.getState();
      const messages = selectMessages(state);

      expect(messages).toHaveLength(0);
    });

    test('should create new sessionId', () => {
      store.dispatch(initializeSession());
      const state1 = store.getState();
      const sessionId1 = selectSessionId(state1);

      store.dispatch(clearConversation());
      const state2 = store.getState();
      const sessionId2 = selectSessionId(state2);

      expect(sessionId2).not.toBe(sessionId1);
      expect(sessionId2).toBeDefined();
    });
  });

  describe('Conversation History Selector', () => {
    test('should return messages in API format', () => {
      store.dispatch(addUserMessage('Hello'));
      store.dispatch(addAssistantMessage('Hi there!'));
      
      const state = store.getState();
      const history = selectConversationHistory(state);

      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({ role: 'user', content: 'Hello' });
      expect(history[1]).toEqual({ role: 'assistant', content: 'Hi there!' });
    });

    test('should strip timestamps from history', () => {
      store.dispatch(addUserMessage('Test'));
      const state = store.getState();
      const history = selectConversationHistory(state);

      expect(history[0].timestamp).toBeUndefined();
    });

    test('should return empty array for no messages', () => {
      const state = store.getState();
      const history = selectConversationHistory(state);

      expect(history).toEqual([]);
    });
  });

  describe('Complex Conversation Scenarios', () => {
    test('should handle long conversation', () => {
      // Add 50 messages
      for (let i = 0; i < 25; i++) {
        store.dispatch(addUserMessage(`User message ${i}`));
        store.dispatch(addAssistantMessage(`Assistant response ${i}`));
      }

      const state = store.getState();
      const messages = selectMessages(state);

      expect(messages).toHaveLength(50);
    });

    test('should maintain chronological order in long conversation', () => {
      for (let i = 0; i < 10; i++) {
        store.dispatch(addUserMessage(`Message ${i}`));
      }

      const state = store.getState();
      const messages = selectMessages(state);

      for (let i = 1; i < messages.length; i++) {
        expect(messages[i].timestamp).toBeGreaterThanOrEqual(messages[i-1].timestamp);
      }
    });
  });
});
