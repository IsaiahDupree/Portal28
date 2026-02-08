import React from 'react'

interface StreakReminderEmailProps {
  userName: string
  currentStreak: number
  hoursRemaining: number
}

export function StreakReminderEmail({
  userName,
  currentStreak,
  hoursRemaining
}: StreakReminderEmailProps) {
  return (
    <html>
      <head>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            padding: 30px 0;
          }
          .streak-badge {
            font-size: 64px;
            margin: 20px 0;
          }
          .content {
            background: #f9fafb;
            border-radius: 8px;
            padding: 30px;
            margin: 20px 0;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .stats {
            background: white;
            padding: 20px;
            border-radius: 6px;
            margin: 15px 0;
          }
          .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          <h1>⚠️ Your Streak is at Risk!</h1>
        </div>

        <div className="content">
          <p>Hi {userName},</p>

          <div className="streak-badge">🔥</div>

          <div className="stats">
            <h2 style={{ margin: '0 0 10px 0' }}>
              {currentStreak} Day Streak
            </h2>
            <p style={{ margin: 0, color: '#6b7280' }}>
              You've been learning consistently for {currentStreak}{' '}
              {currentStreak === 1 ? 'day' : 'days'}. Don't break the chain now!
            </p>
          </div>

          <div className="warning">
            <strong>⏰ Only {hoursRemaining} hours left!</strong>
            <p style={{ margin: '5px 0 0 0' }}>
              Complete a lesson before midnight to keep your streak alive.
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/app/dashboard" className="cta-button">
              Continue Learning →
            </a>
          </div>

          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '30px' }}>
            <strong>Why streaks matter:</strong> Consistency is key to mastery. Even 15 minutes a day builds momentum and creates lasting habits.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px', color: '#9ca3af', fontSize: '12px' }}>
          <p>
            You're receiving this because you've built a learning streak.<br />
            Want to change how often you receive these emails?{' '}
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/settings/notifications">
              Update preferences
            </a>
          </p>
        </div>
      </body>
    </html>
  )
}

// Plain text version for email clients that don't support HTML
export function StreakReminderEmailText({
  userName,
  currentStreak,
  hoursRemaining
}: StreakReminderEmailProps) {
  return `
Hi ${userName},

⚠️ YOUR ${currentStreak}-DAY STREAK IS AT RISK!

You've been learning consistently for ${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}. Don't break the chain now!

⏰ Only ${hoursRemaining} hours left!
Complete a lesson before midnight to keep your streak alive.

Continue Learning: ${process.env.NEXT_PUBLIC_SITE_URL}/app/dashboard

Why streaks matter: Consistency is key to mastery. Even 15 minutes a day builds momentum and creates lasting habits.

---
Want to change how often you receive these emails?
Update preferences: ${process.env.NEXT_PUBLIC_SITE_URL}/settings/notifications
  `.trim()
}
