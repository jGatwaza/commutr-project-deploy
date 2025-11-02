import { createSlice } from '@reduxjs/toolkit';

const conversationSlice = createSlice({
  name: 'conversation',
  initialState: {
    messages: [],
    sessionId: null,
  },
  reducers: {
    addUserMessage: (state, action) => {
      state.messages.push({
        role: 'user',
        content: action.payload,
        timestamp: Date.now(),
      });
    },
    addAssistantMessage: (state, action) => {
      state.messages.push({
        role: 'assistant',
        content: action.payload,
        timestamp: Date.now(),
      });
    },
    clearConversation: (state) => {
      state.messages = [];
      state.sessionId = Date.now().toString();
    },
    initializeSession: (state) => {
      if (!state.sessionId) {
        state.sessionId = Date.now().toString();
      }
    },
  },
});

export const { 
  addUserMessage, 
  addAssistantMessage, 
  clearConversation,
  initializeSession 
} = conversationSlice.actions;

export const selectMessages = (state) => state.conversation.messages;
export const selectSessionId = (state) => state.conversation.sessionId;

// Get conversation history in a format suitable for the API
export const selectConversationHistory = (state) => {
  return state.conversation.messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
};

export default conversationSlice.reducer;
