import { jest } from '@jest/globals';

export const __mockGroqCreate = jest.fn();

export default class GroqMock {
  // constructor preserves compatibility with new Groq({ apiKey })
  constructor(_: any) {}

  chat = {
    completions: {
      create: __mockGroqCreate,
    },
  };
}
