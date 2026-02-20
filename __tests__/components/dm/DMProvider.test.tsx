/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { DMProvider, useDM } from '@/components/dm/DMProvider';
import { supabaseClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabaseClient: {
    auth: {
      getUser: jest.fn(),
    },
    channel: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockThreads = [
  {
    id: 'thread-1',
    user1_id: 'user-123',
    user2_id: 'user-456',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    unread_count: 2,
    other_user: {
      id: 'user-456',
      email: 'other@example.com',
      full_name: 'Other User',
    },
  },
];

const mockMessage = {
  id: 'msg-1',
  thread_id: 'thread-1',
  sender_id: 'user-123',
  content: 'Hello',
  is_read: false,
  created_at: '2024-01-01T00:00:00Z',
};

// Helper component to test the hook
function TestComponent() {
  const { threads, unreadCount, isLoading, sendMessage, createThread, refreshThreads } = useDM();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="threads-count">{threads.length}</div>
      <div data-testid="unread-count">{unreadCount}</div>
      <button onClick={() => sendMessage('thread-1', 'test')}>Send Message</button>
      <button onClick={() => createThread('user-456', 'Hi')}>Create Thread</button>
      <button onClick={refreshThreads}>Refresh</button>
    </div>
  );
}

describe('DMProvider', () => {
  let mockChannel: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock channel
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    };

    (supabaseClient.channel as jest.Mock).mockReturnValue(mockChannel);
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/dm/threads') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ threads: mockThreads }),
        });
      }
      if (url === '/api/dm/unread') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ unreadCount: 2 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  describe('Initial State', () => {
    it('should render with initial loading state', () => {
      (supabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      render(
        <DMProvider>
          <TestComponent />
        </DMProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
    });

    it('should initialize with empty state when no user is logged in', async () => {
      (supabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      render(
        <DMProvider>
          <TestComponent />
        </DMProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      expect(screen.getByTestId('threads-count')).toHaveTextContent('0');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    });

    it('should fetch threads and unread count when user is logged in', async () => {
      (supabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      render(
        <DMProvider>
          <TestComponent />
        </DMProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      expect(screen.getByTestId('threads-count')).toHaveTextContent('1');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
      expect(global.fetch).toHaveBeenCalledWith('/api/dm/threads');
      expect(global.fetch).toHaveBeenCalledWith('/api/dm/unread');
    });

    it('should setup realtime subscriptions on mount', async () => {
      (supabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      render(
        <DMProvider>
          <TestComponent />
        </DMProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      expect(supabaseClient.channel).toHaveBeenCalledWith('dm_updates');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
        },
        expect.any(Function)
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dm_messages',
        },
        expect.any(Function)
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_threads',
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
  });

  describe('Actions', () => {
    beforeEach(async () => {
      (supabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });
    });

    it('should send a message successfully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url === '/api/dm/threads/thread-1/messages' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ message: mockMessage }),
          });
        }
        if (url === '/api/dm/threads') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ threads: mockThreads }),
          });
        }
        if (url === '/api/dm/unread') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ unreadCount: 2 }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(
        <DMProvider>
          <TestComponent />
        </DMProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      await act(async () => {
        getByText('Send Message').click();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/dm/threads/thread-1/messages',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: 'test' }),
          })
        );
      });
    });

    it('should create a thread successfully', async () => {
      const newThread = {
        id: 'thread-2',
        user1_id: 'user-123',
        user2_id: 'user-456',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url === '/api/dm/threads' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ thread: newThread }),
          });
        }
        if (url === '/api/dm/threads') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ threads: [...mockThreads, newThread] }),
          });
        }
        if (url === '/api/dm/unread') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ unreadCount: 2 }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(
        <DMProvider>
          <TestComponent />
        </DMProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      await act(async () => {
        getByText('Create Thread').click();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/dm/threads',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientId: 'user-456', initialMessage: 'Hi' }),
          })
        );
      });
    });

    it('should refresh threads and unread count', async () => {
      const { getByText } = render(
        <DMProvider>
          <TestComponent />
        </DMProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      // Clear previous calls
      (global.fetch as jest.Mock).mockClear();

      await act(async () => {
        getByText('Refresh').click();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/dm/threads');
        expect(global.fetch).toHaveBeenCalledWith('/api/dm/unread');
      });
    });

    it('should handle send message failure gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url === '/api/dm/threads/thread-1/messages' && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 500,
          });
        }
        if (url === '/api/dm/threads') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ threads: mockThreads }),
          });
        }
        if (url === '/api/dm/unread') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ unreadCount: 2 }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(
        <DMProvider>
          <TestComponent />
        </DMProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      await act(async () => {
        getByText('Send Message').click();
      });

      // Should not throw error
      expect(screen.getByTestId('threads-count')).toHaveTextContent('1');
    });

    it('should handle create thread failure gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url === '/api/dm/threads' && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 400,
          });
        }
        if (url === '/api/dm/threads') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ threads: mockThreads }),
          });
        }
        if (url === '/api/dm/unread') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ unreadCount: 2 }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(
        <DMProvider>
          <TestComponent />
        </DMProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      await act(async () => {
        getByText('Create Thread').click();
      });

      // Should not throw error
      expect(screen.getByTestId('threads-count')).toHaveTextContent('1');
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from realtime channel on unmount', async () => {
      (supabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const { unmount } = render(
        <DMProvider>
          <TestComponent />
        </DMProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      // Verify channel was created
      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockChannel.unsubscribe).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useDM is used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useDM must be used within DMProvider');

      consoleError.mockRestore();
    });
  });
});
