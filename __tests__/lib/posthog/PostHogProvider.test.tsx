/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { PostHogProvider } from '@/lib/posthog/PostHogProvider';
import { hasConsent } from '@/lib/cookies/consent';
import { initPostHog } from '@/lib/posthog/client';

// Mock dependencies
jest.mock('@/lib/cookies/consent', () => ({
  hasConsent: jest.fn(),
}));

jest.mock('@/lib/posthog/client', () => ({
  initPostHog: jest.fn(),
}));

describe('PostHogProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Initial State', () => {
    it('should render without errors', () => {
      (hasConsent as jest.Mock).mockReturnValue(false);

      const { container } = render(<PostHogProvider />);

      expect(container).toBeEmptyDOMElement();
    });

    it('should check consent on mount', () => {
      (hasConsent as jest.Mock).mockReturnValue(false);

      render(<PostHogProvider />);

      expect(hasConsent).toHaveBeenCalledWith('analytics');
    });

    it('should not initialize PostHog when consent is not granted', () => {
      (hasConsent as jest.Mock).mockReturnValue(false);

      render(<PostHogProvider />);

      expect(initPostHog).not.toHaveBeenCalled();
    });

    it('should initialize PostHog when consent is granted', async () => {
      (hasConsent as jest.Mock).mockReturnValue(true);

      render(<PostHogProvider />);

      await waitFor(() => {
        expect(initPostHog).toHaveBeenCalled();
      });
    });

    it('should not initialize PostHog when API key is missing', () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      (hasConsent as jest.Mock).mockReturnValue(true);

      render(<PostHogProvider />);

      expect(initPostHog).not.toHaveBeenCalled();
    });
  });

  describe('Consent Changes', () => {
    it('should listen for consent changes', () => {
      (hasConsent as jest.Mock).mockReturnValue(false);

      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      render(<PostHogProvider />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'consentChanged',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('should initialize PostHog when consent changes to granted', async () => {
      (hasConsent as jest.Mock).mockReturnValue(false);

      render(<PostHogProvider />);

      // Initially, PostHog should not be initialized
      expect(initPostHog).not.toHaveBeenCalled();

      // Simulate consent being granted
      (hasConsent as jest.Mock).mockReturnValue(true);
      window.dispatchEvent(new Event('consentChanged'));

      await waitFor(() => {
        expect(initPostHog).toHaveBeenCalled();
      });
    });

    it('should not initialize PostHog when consent changes but API key is missing', async () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      (hasConsent as jest.Mock).mockReturnValue(false);

      render(<PostHogProvider />);

      // Simulate consent being granted
      (hasConsent as jest.Mock).mockReturnValue(true);
      window.dispatchEvent(new Event('consentChanged'));

      await waitFor(() => {
        expect(hasConsent).toHaveBeenCalled();
      });

      expect(initPostHog).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      (hasConsent as jest.Mock).mockReturnValue(false);

      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<PostHogProvider />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'consentChanged',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Multiple Renders', () => {
    it('should not initialize PostHog multiple times with same conditions', async () => {
      (hasConsent as jest.Mock).mockReturnValue(true);

      const { rerender } = render(<PostHogProvider />);

      await waitFor(() => {
        expect(initPostHog).toHaveBeenCalledTimes(1);
      });

      rerender(<PostHogProvider />);

      // Should not call initPostHog again
      expect(initPostHog).toHaveBeenCalledTimes(1);
    });
  });
});
