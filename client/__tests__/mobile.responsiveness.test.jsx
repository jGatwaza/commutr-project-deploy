/**
 * Mobile Responsiveness Test
 * Tests for bug: Commutr doesn't render properly on mobile display
 * 
 * This test verifies that mobile-specific CSS is applied correctly
 * for key pages (Wizard, History, Analytics) on mobile viewports.
 * 
 * Note: This is a basic test that checks for CSS class application
 * and viewport meta tag. Full visual regression testing would require
 * additional tools like Playwright or Puppeteer with screenshot comparison.
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreateCommuteWizard from '../flows/createWizard/screens/CreateCommuteWizard';
import WatchedList from '../components/history/WatchedList';
import AnalyticsTab from '../components/history/AnalyticsTab';
import { useAuth } from '../context/AuthContext';

// Mock dependencies
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

global.fetch = jest.fn();

describe('Mobile Responsiveness Tests', () => {
  const mockUser = { uid: 'test-user-123' };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser });
    
    // Mock fetch for components that need data
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], nextCursor: null, stats: {} })
    });
  });

  describe('Viewport Meta Tag', () => {
    test('should have viewport meta tag for mobile scaling', () => {
      // Check if viewport meta tag exists in document
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      
      // This test will fail if viewport meta is missing
      // Expected: <meta name="viewport" content="width=device-width, initial-scale=1.0">
      expect(viewportMeta).toBeTruthy();
      
      if (viewportMeta) {
        const content = viewportMeta.getAttribute('content');
        expect(content).toContain('width=device-width');
      }
    });
  });

  describe('Mobile Viewport Simulation', () => {
    beforeEach(() => {
      // Simulate mobile viewport (iPhone 14 Pro Max: 390×844)
      global.innerWidth = 390;
      global.innerHeight = 844;
      window.dispatchEvent(new Event('resize'));
    });

    test('CreateCommuteWizard renders with mobile-friendly classes', () => {
      render(
        <BrowserRouter>
          <CreateCommuteWizard />
        </BrowserRouter>
      );

      // Check if wizard shell exists (should have mobile styles applied)
      const wizardElements = document.querySelectorAll('.wizard-shell');
      expect(wizardElements.length).toBeGreaterThan(0);

      // Check if wizard cards exist
      const wizardCards = document.querySelectorAll('.wizard-card');
      expect(wizardCards.length).toBeGreaterThan(0);
    });

    test('WatchedList renders with mobile-friendly structure', async () => {
      render(<WatchedList />);

      // Wait for component to load
      await screen.findByText(/watched videos/i, {}, { timeout: 3000 }).catch(() => {
        // Component might show empty state
        return screen.findByText(/no watched videos/i);
      });

      // Check if watched list container exists
      const watchedList = document.querySelector('.watched-list');
      expect(watchedList).toBeTruthy();
    });

    test('AnalyticsTab renders with mobile-friendly structure', async () => {
      render(<AnalyticsTab />);

      // Check if analytics container exists
      const analyticsContainer = document.querySelector('.analytics-container');
      expect(analyticsContainer).toBeTruthy();
    });
  });

  describe('CSS Media Query Application (Indirect Test)', () => {
    test('mobile CSS files are loaded', () => {
      // Check if CSS files exist in the document
      const styleSheets = Array.from(document.styleSheets);
      
      // This is a basic check - in a real scenario, we'd verify
      // that mobile-specific styles are actually applied
      expect(styleSheets.length).toBeGreaterThan(0);
    });
  });

  describe('Touch-Friendly Elements', () => {
    beforeEach(() => {
      // Simulate mobile viewport
      global.innerWidth = 390;
      global.innerHeight = 844;
    });

    test('buttons should be rendered (touch targets)', () => {
      render(
        <BrowserRouter>
          <CreateCommuteWizard />
        </BrowserRouter>
      );

      // Check if buttons exist (they should be full-width on mobile)
      const buttons = document.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});

/**
 * TEST LIMITATIONS:
 * 
 * This test has several limitations for detecting mobile rendering bugs:
 * 
 * 1. **No Visual Validation**: Jest/RTL cannot verify actual visual appearance,
 *    layout positioning, or CSS rendering. It only checks DOM structure.
 * 
 * 2. **No Real Browser**: Tests run in jsdom, which doesn't fully support
 *    CSS media queries or computed styles like a real browser.
 * 
 * 3. **No Screenshot Comparison**: Cannot detect visual regressions like
 *    overlapping elements, cropped text, or misaligned buttons.
 * 
 * 4. **Limited Viewport Simulation**: Setting window.innerWidth doesn't
 *    actually trigger CSS media queries in jsdom.
 * 
 * RECOMMENDED IMPROVEMENTS:
 * - Use Playwright or Puppeteer for real browser testing
 * - Add visual regression testing with screenshot comparison
 * - Test on actual mobile devices or emulators
 * - Use tools like Percy or Chromatic for visual diffs
 * 
 * For now, this test serves as a basic smoke test to ensure components
 * render without crashing on mobile viewports and have the expected
 * CSS classes applied.
 */
