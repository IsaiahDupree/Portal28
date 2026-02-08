import React from 'react'

interface StreakMilestoneEmailProps {
  userName: string
  milestone: number
  badgeName: string
  badgeEmoji: string
}

export function StreakMilestoneEmail({
  userName,
  milestone,
  badgeName,
  badgeEmoji
}: StreakMilestoneEmailProps) {
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
            padding: 40px 0;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            border-radius: 12px 12px 0 0;
          }
          .celebration-emoji {
            font-size: 96px;
            margin: 20px 0;
          }
          .content {
            background: #f9fafb;
            padding: 40px 30px;
            text-align: center;
          }
          .badge {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 18px;
            margin: 30px 0;
          }
          .stats-grid {
            display: flex;
            gap: 20px;
            margin: 30px 0;
          }
          .stat-box {
            flex: 1;
            background: white;
            padding: 20px;
            border-radius: 8px;
          }
          .confetti {
            font-size: 24px;
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          <div className="confetti">🎉 🎊 ✨</div>
          <h1 style={{ margin: '20px 0 10px 0', fontSize: '32px' }}>
            Congratulations!
          </h1>
          <p style={{ margin: 0, opacity: 0.9 }}>
            You've reached an incredible milestone
          </p>
        </div>

        <div className="content">
          <div className="celebration-emoji">{badgeEmoji}</div>

          <h2 style={{ fontSize: '36px', margin: '20px 0' }}>
            {milestone} Day Streak!
          </h2>

          <div className="badge">
            <h3 style={{ margin: '0 0 10px 0', color: '#f97316' }}>
              Achievement Unlocked
            </h3>
            <p style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
              {badgeName}
            </p>
          </div>

          <p style={{ fontSize: '18px', lineHeight: '1.8', maxWidth: '400px', margin: '30px auto' }}>
            {milestone === 3 &&
              "Three days in a row! You're building a powerful habit. Keep the momentum going!"}
            {milestone === 7 &&
              "A full week of learning! You've proven your commitment. This is where transformation begins."}
            {milestone === 30 &&
              "30 days of consistent learning! You've officially built a habit. You're in the top 1% of learners."}
            {milestone === 100 &&
              "100 days! This is extraordinary dedication. You're not just learning—you're transforming."}
            {milestone === 365 &&
              "A FULL YEAR of daily learning! This is legendary status. You're an inspiration to everyone."}
            {milestone > 365 &&
              `${milestone} days is incredible! Your dedication is truly exceptional.`}
          </p>

          <div style={{ textAlign: 'center' }}>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/app/dashboard" className="cta-button">
              Keep Going! 🚀
            </a>
          </div>

          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '40px' }}>
            <strong>Share your achievement:</strong> Let others know about your dedication! Your consistency inspires fellow learners.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px', color: '#9ca3af', fontSize: '12px', padding: '20px' }}>
          <p>
            Celebrating your learning journey 🎓<br />
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/settings/notifications">
              Notification preferences
            </a>
          </p>
        </div>
      </body>
    </html>
  )
}

// Plain text version
export function StreakMilestoneEmailText({
  userName,
  milestone,
  badgeName,
  badgeEmoji
}: StreakMilestoneEmailProps) {
  let message = ''
  if (milestone === 3) {
    message =
      "Three days in a row! You're building a powerful habit. Keep the momentum going!"
  } else if (milestone === 7) {
    message =
      "A full week of learning! You've proven your commitment. This is where transformation begins."
  } else if (milestone === 30) {
    message =
      "30 days of consistent learning! You've officially built a habit. You're in the top 1% of learners."
  } else if (milestone === 100) {
    message =
      "100 days! This is extraordinary dedication. You're not just learning—you're transforming."
  } else if (milestone === 365) {
    message =
      "A FULL YEAR of daily learning! This is legendary status. You're an inspiration to everyone."
  } else {
    message = `${milestone} days is incredible! Your dedication is truly exceptional.`
  }

  return `
🎉 CONGRATULATIONS ${userName}! 🎉

${badgeEmoji} ${milestone} DAY STREAK! ${badgeEmoji}

Achievement Unlocked: ${badgeName}

${message}

Keep Going! ${process.env.NEXT_PUBLIC_SITE_URL}/app/dashboard

Share your achievement: Let others know about your dedication! Your consistency inspires fellow learners.

---
Celebrating your learning journey 🎓
Notification preferences: ${process.env.NEXT_PUBLIC_SITE_URL}/settings/notifications
  `.trim()
}
