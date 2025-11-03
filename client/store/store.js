import { configureStore } from '@reduxjs/toolkit';
import conversationReducer from './conversationSlice';

export const store = configureStore({
  reducer: {
    conversation: conversationReducer,
  },
});
