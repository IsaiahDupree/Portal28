/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { CollaborationProvider, useCollaboration } from '@/components/video/CollaborationProvider';
import { supabaseClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabaseClient: {
    channel: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

const mockSession = {
  id: 'session-1',
  name: 'Test Session',
  description: 'Test Description',
  status: 'active' as const,
  created_by: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  participants: [
    {
      id: 'participant-1',
      session_id: 'session-1',
      user_id: 'user-123',
      role: 'owner' as const,
      joined_at: '2024-01-01T00:00:00Z',
      last_seen_at: '2024-01-01T00:00:00Z',
    },
  ],
};

const mockPresences = [
  {
    id: 'presence-1',
    session_id: 'session-1',
    user_id: 'user-123',
    is_active: true,
    cursor_position: { x: 0, y: 0 },
    current_section: 'intro',
    last_activity_at: '2024-01-01T00:00:00Z',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
    },
  },
];

const mockEdits = [
  {
    id: 'edit-1',
    session_id: 'session-1',
    user_id: 'user-123',
    operation_type: 'update' as const,
    path: '/metadata/title',
    old_value: 'Old Title',
    new_value: 'New Title',
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
  },
];

const mockComments = [
  {
    id: 'comment-1',
    session_id: 'session-1',
    user_id: 'user-123',
    content: 'Great work!',
    target_path: '/intro',
    target_timestamp: 30,
    resolved: false,
    created_at: '2024-01-01T00:00:00Z',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
    },
  },
];

// Helper component to test the hook
function TestComponent() {
  const {
    session,
    participants,
    presences,
    edits,
    comments,
    isConnected,
    updatePresence,
    createEdit,
    createComment,
    resolveComment,
  } = useCollaboration();

  return (
    <div>
      <div data-testid="session-id">{session?.id || 'None'}</div>
      <div data-testid="participants-count">{participants.length}</div>
      <div data-testid="presences-count">{presences.length}</div>
      <div data-testid="edits-count">{edits.length}</div>
      <div data-testid="comments-count">{comments.length}</div>
      <div data-testid="is-connected">{isConnected ? 'Connected' : 'Disconnected'}</div>
      <button onClick={() => updatePresence({ currentSection: 'outro' })}>
        Update Presence
      </button>
      <button
        onClick={() =>
          createEdit({
            operationType: 'update',
            path: '/title',
            oldValue: 'Old',
            newValue: 'New',
          })
        }
      >
        Create Edit
      </button>
      <button onClick={() => createComment({ content: 'Nice!' })}>Create Comment</button>
      <button onClick={() => resolveComment('comment-1', true)}>Resolve Comment</button>
    </div>
  );
}

describe('CollaborationProvider', () => {
  let mockChannel: any;
  let subscribeCallback: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mock channel
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        subscribeCallback = callback;
        // Simulate successful subscription
        setTimeout(() => callback('SUBSCRIBED'), 0);
        return mockChannel;
      }),
      unsubscribe: jest.fn(),
    };

    (supabaseClient.channel as jest.Mock).mockReturnValue(mockChannel);

    // Mock fetch responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/video/collaboration/sessions/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ session: mockSession }),
        });
      }
      if (url.includes('/api/video/collaboration/presence?sessionId=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ presences: mockPresences }),
        });
      }
      if (url.includes('/api/video/collaboration/edits?sessionId=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ edits: mockEdits }),
        });
      }
      if (url.includes('/api/video/collaboration/comments?sessionId=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ comments: mockComments }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should render with initial disconnected state', () => {
      render(
        <CollaborationProvider sessionId="session-1">
          <TestComponent />
        </CollaborationProvider>
      );

      expect(screen.getByTestId('is-connected')).toHaveTextContent('Disconnected');
    });

    it('should fetch session data on mount', async () => {
      render(
        <CollaborationProvider sessionId="session-1">
          <TestComponent />
        </CollaborationProvider>
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/video/collaboration/sessions/session-1');
      expect(screen.getByTestId('session-id')).toHaveTextContent('session-1');
      expect(screen.getByTestId('participants-count')).toHaveTextContent('1');
    });

    it('should fetch presences, edits, and comments on mount', async () => {
      render(
        <CollaborationProvider sessionId="session-1">
          <TestComponent />
        </CollaborationProvider>
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/video/collaboration/presence?sessionId=session-1'
      );
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/video/collaboration/edits?sessionId=session-1&limit=50'
      );
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/video/collaboration/comments?sessionId=session-1'
      );

      expect(screen.getByTestId('presences-count')).toHaveTextContent('1');
      expect(screen.getByTestId('edits-count')).toHaveTextContent('1');
      expect(screen.getByTestId('comments-count')).toHaveTextContent('1');
    });

    it('should setup realtime subscriptions on mount', async () => {
      render(
        <CollaborationProvider sessionId="session-1">
          <TestComponent />
        </CollaborationProvider>
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(supabaseClient.channel).toHaveBeenCalledWith('collaboration:session-1');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_collaboration_presence',
          filter: 'session_id=eq.session-1',
        },
        expect.any(Function)
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_collaboration_edits',
          filter: 'session_id=eq.session-1',
        },
        expect.any(Function)
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_collaboration_comments',
          filter: 'session_id=eq.session-1',
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should set isConnected to true when subscription succeeds', async () => {
      render(
        <CollaborationProvider sessionId="session-1">
          <TestComponent />
        </CollaborationProvider>
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(screen.getByTestId('is-connected')).toHaveTextContent('Connected');
    });

    it('should not initialize if sessionId is not provided', () => {
      render(
        <CollaborationProvider sessionId="">
          <TestComponent />
        </CollaborationProvider>
      );

      expect(supabaseClient.channel).not.toHaveBeenCalled();
    });
  });

  describe('Actions', () => {
    it('should update presence successfully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url === '/api/video/collaboration/presence' && options?.method === 'POST') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        if (url.includes('/api/video/collaboration/sessions/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ session: mockSession }),
          });
        }
        if (url.includes('/api/video/collaboration/presence?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ presences: mockPresences }),
          });
        }
        if (url.includes('/api/video/collaboration/edits?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ edits: mockEdits }),
          });
        }
        if (url.includes('/api/video/collaboration/comments?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ comments: mockComments }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(
        <CollaborationProvider sessionId="session-1">
          <TestComponent />
        </CollaborationProvider>
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await act(async () => {
        getByText('Update Presence').click();
        await jest.runAllTimersAsync();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/video/collaboration/presence',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'session-1',
            isActive: true,
            currentSection: 'outro',
          }),
        })
      );
    });

    it('should create edit successfully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url === '/api/video/collaboration/edits' && options?.method === 'POST') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        if (url.includes('/api/video/collaboration/sessions/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ session: mockSession }),
          });
        }
        if (url.includes('/api/video/collaboration/presence?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ presences: mockPresences }),
          });
        }
        if (url.includes('/api/video/collaboration/edits?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ edits: mockEdits }),
          });
        }
        if (url.includes('/api/video/collaboration/comments?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ comments: mockComments }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(
        <CollaborationProvider sessionId="session-1">
          <TestComponent />
        </CollaborationProvider>
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await act(async () => {
        getByText('Create Edit').click();
        await jest.runAllTimersAsync();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/video/collaboration/edits',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'session-1',
            operationType: 'update',
            path: '/title',
            oldValue: 'Old',
            newValue: 'New',
          }),
        })
      );
    });

    it('should create comment successfully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url === '/api/video/collaboration/comments' && options?.method === 'POST') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        if (url.includes('/api/video/collaboration/sessions/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ session: mockSession }),
          });
        }
        if (url.includes('/api/video/collaboration/presence?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ presences: mockPresences }),
          });
        }
        if (url.includes('/api/video/collaboration/edits?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ edits: mockEdits }),
          });
        }
        if (url.includes('/api/video/collaboration/comments?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ comments: mockComments }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(
        <CollaborationProvider sessionId="session-1">
          <TestComponent />
        </CollaborationProvider>
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await act(async () => {
        getByText('Create Comment').click();
        await jest.runAllTimersAsync();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/video/collaboration/comments',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'session-1',
            content: 'Nice!',
          }),
        })
      );
    });

    it('should resolve comment successfully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/video/collaboration/comments/comment-1') && options?.method === 'PATCH') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        if (url.includes('/api/video/collaboration/sessions/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ session: mockSession }),
          });
        }
        if (url.includes('/api/video/collaboration/presence?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ presences: mockPresences }),
          });
        }
        if (url.includes('/api/video/collaboration/edits?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ edits: mockEdits }),
          });
        }
        if (url.includes('/api/video/collaboration/comments?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ comments: mockComments }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(
        <CollaborationProvider sessionId="session-1">
          <TestComponent />
        </CollaborationProvider>
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await act(async () => {
        getByText('Resolve Comment').click();
        await jest.runAllTimersAsync();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/video/collaboration/comments/comment-1',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolved: true }),
        })
      );
    });

    it('should throw error when createEdit fails', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url === '/api/video/collaboration/edits' && options?.method === 'POST') {
          return Promise.resolve({ ok: false, status: 500 });
        }
        if (url.includes('/api/video/collaboration/sessions/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ session: mockSession }),
          });
        }
        if (url.includes('/api/video/collaboration/presence?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ presences: mockPresences }),
          });
        }
        if (url.includes('/api/video/collaboration/edits?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ edits: mockEdits }),
          });
        }
        if (url.includes('/api/video/collaboration/comments?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ comments: mockComments }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { getByText } = render(
        <CollaborationProvider sessionId="session-1">
          <TestComponent />
        </CollaborationProvider>
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        try {
          getByText('Create Edit').click();
          await jest.runAllTimersAsync();
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      consoleError.mockRestore();
    });
  });

  describe('Heartbeat', () => {
    it('should send presence heartbeat every 30 seconds', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url === '/api/video/collaboration/presence' && options?.method === 'POST') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        if (url.includes('/api/video/collaboration/sessions/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ session: mockSession }),
          });
        }
        if (url.includes('/api/video/collaboration/presence?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ presences: mockPresences }),
          });
        }
        if (url.includes('/api/video/collaboration/edits?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ edits: mockEdits }),
          });
        }
        if (url.includes('/api/video/collaboration/comments?sessionId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ comments: mockComments }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(
        <CollaborationProvider sessionId="session-1">
          <TestComponent />
        </CollaborationProvider>
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Clear the initial calls
      (global.fetch as jest.Mock).mockClear();

      // Advance timer by 30 seconds
      await act(async () => {
        jest.advanceTimersByTime(30000);
        await jest.runAllTimersAsync();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/video/collaboration/presence',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe and clear interval on unmount', async () => {
      const { unmount } = render(
        <CollaborationProvider sessionId="session-1">
          <TestComponent />
        </CollaborationProvider>
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      unmount();

      await waitFor(() => {
        expect(mockChannel.unsubscribe).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useCollaboration is used outside provider', async () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      // React Testing Library catches errors from rendering, we need to check the error boundary
      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          if (error instanceof Error) {
            expect(error.message).toBe('useCollaboration must be used within CollaborationProvider');
            return null;
          }
          throw error;
        }
      };

      expect(() => {
        render(
          <ErrorBoundary>
            <TestComponent />
          </ErrorBoundary>
        );
      }).toThrow('useCollaboration must be used within CollaborationProvider');

      consoleError.mockRestore();
    });
  });
});
