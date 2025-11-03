/**
 * Integration tests for POST /api/recommend endpoint
 */

import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../server.js';

describe('POST /api/recommend', () => {
  describe('Success cases', () => {
    it('should return recommendations for valid request', async () => {
      const response = await request(app)
        .post('/api/recommend')
        .send({
          remainingSeconds: 900,
        })
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('totalSec');
      expect(response.body).toHaveProperty('strategy');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(typeof response.body.totalSec).toBe('number');
      expect(typeof response.body.strategy).toBe('string');
      expect(response.body.totalSec).toBeLessThanOrEqual(900 * 1.03);
    });

    it('should respect excludeIds parameter', async () => {
      const excludeIds = ['vid1', 'vid2'];
      const response = await request(app)
        .post('/api/recommend')
        .send({
          remainingSeconds: 1500,
          excludeIds,
        })
        .expect(200);

      const returnedIds = response.body.items.map((item: any) => item.id);
      excludeIds.forEach((excludedId) => {
        expect(returnedIds).not.toContain(excludedId);
      });
    });

    it('should filter by topic when provided', async () => {
      const response = await request(app)
        .post('/api/recommend')
        .send({
          remainingSeconds: 2000,
          topic: 'react',
        })
        .expect(200);

      response.body.items.forEach((item: any) => {
        expect(item.topicTags).toBeDefined();
        const hasReactTag = item.topicTags.some(
          (tag: string) => tag.toLowerCase() === 'react'
        );
        expect(hasReactTag).toBe(true);
      });
    });

    it('should handle all parameters together', async () => {
      const response = await request(app)
        .post('/api/recommend')
        .send({
          remainingSeconds: 1200,
          excludeIds: ['vid1'],
          topic: 'javascript',
        })
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBe(true);
      
      const returnedIds = response.body.items.map((item: any) => item.id);
      expect(returnedIds).not.toContain('vid1');
      
      response.body.items.forEach((item: any) => {
        const hasJsTag = item.topicTags?.some(
          (tag: string) => tag.toLowerCase() === 'javascript'
        );
        expect(hasJsTag).toBe(true);
      });
    });

    it('should return empty items when no matches found', async () => {
      const response = await request(app)
        .post('/api/recommend')
        .send({
          remainingSeconds: 1000,
          topic: 'nonexistent-topic',
        })
        .expect(200);

      expect(response.body.items).toEqual([]);
      expect(response.body.totalSec).toBe(0);
    });
  });

  describe('Error cases', () => {
    it('should return 400 for missing remainingSeconds', async () => {
      const response = await request(app)
        .post('/api/recommend')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid request body');
    });

    it('should return 400 for negative remainingSeconds', async () => {
      const response = await request(app)
        .post('/api/recommend')
        .send({
          remainingSeconds: -100,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.issues).toBeDefined();
    });

    it('should return 400 for zero remainingSeconds', async () => {
      const response = await request(app)
        .post('/api/recommend')
        .send({
          remainingSeconds: 0,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid remainingSeconds type', async () => {
      const response = await request(app)
        .post('/api/recommend')
        .send({
          remainingSeconds: 'invalid',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid excludeIds type', async () => {
      const response = await request(app)
        .post('/api/recommend')
        .send({
          remainingSeconds: 900,
          excludeIds: 'not-an-array',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 405 for GET request', async () => {
      const response = await request(app)
        .get('/api/recommend')
        .expect(405);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Method not allowed');
    });

    it('should return 405 for PUT request', async () => {
      const response = await request(app)
        .put('/api/recommend')
        .send({ remainingSeconds: 900 })
        .expect(405);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 405 for DELETE request', async () => {
      const response = await request(app)
        .delete('/api/recommend')
        .expect(405);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response structure', () => {
    it('should return correct video object structure', async () => {
      const response = await request(app)
        .post('/api/recommend')
        .send({
          remainingSeconds: 1000,
        })
        .expect(200);

      if (response.body.items.length > 0) {
        const video = response.body.items[0];
        expect(video).toHaveProperty('id');
        expect(video).toHaveProperty('url');
        expect(video).toHaveProperty('title');
        expect(video).toHaveProperty('durationSec');
        expect(typeof video.id).toBe('string');
        expect(typeof video.url).toBe('string');
        expect(typeof video.title).toBe('string');
        expect(typeof video.durationSec).toBe('number');
      }
    });

    it('should have totalSec equal to sum of item durations', async () => {
      const response = await request(app)
        .post('/api/recommend')
        .send({
          remainingSeconds: 1500,
        })
        .expect(200);

      const calculatedTotal = response.body.items.reduce(
        (sum: number, item: any) => sum + item.durationSec,
        0
      );
      expect(response.body.totalSec).toBe(calculatedTotal);
    });
  });
});
