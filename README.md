# Form Watcher

A robust TypeScript-based form monitoring system that tracks changes to web forms (Google Forms, HTML snippets, AI text) and sends notifications via multiple channels (Email, Discord, Slack).

## Features

- **Multiple Watcher Types**:
  - Google Forms (tracks form open/closed status)
  - HTML Snippets (monitors specific HTML elements)
  - AI Text (uses regex patterns for flexible content matching)

- **Multiple Notification Channels**:
  - Email (SMTP)
  - Discord Webhooks
  - Slack Webhooks

- **Robust Features**:
  - Circuit breaker pattern for fault tolerance
  - Exponential backoff with jitter for retries
  - Input validation and sanitization
  - Content hashing for efficient change detection
  - Live configuration updates
  - Health monitoring
  - Comprehensive logging

## Prerequisites

- Node.js 16+
- PostgreSQL (for data storage)
- SMTP server (for email notifications)
- Discord/Slack webhook URLs (for respective notifications)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/form-watcher.git
   cd form-watcher
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and update with your configuration:
   ```bash
   cp .env.example .env
   ```

4. Run database migrations:
   ```bash
   npm run migrate
   ```

5. Start the application:
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options. Key variables include:

```
# Database
DATABASE_URL=postgres://user:password@localhost:5432/form_watcher

# SMTP (for email notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@example.com

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#alerts
SLACK_USERNAME=Form Watcher

# Application
LOG_LEVEL=info
ADMIN_EMAIL=admin@example.com
CHECK_INTERVAL_MINUTES=5
MAX_RETRIES=3
CIRCUIT_BREAKER_MAX_FAILURES=5
CIRCUIT_BREAKER_TIMEOUT_MS=30000
```

## Usage

### Adding a New Form to Monitor

1. **Google Form**:
   ```typescript
   import { db } from './db';
   import { forms } from './schema';

   await db.insert(forms).values({
     name: 'My Google Form',
     url: 'https://docs.google.com/forms/d/...',
     watcherType: 'google-form',
     watcherConfig: {},
     intervalSeconds: 300, // Check every 5 minutes
     startDate: new Date().toISOString(),
     endDate: '2024-12-31T23:59:59Z',
     weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
     activeFrom: '09:00',
     activeTo: '17:00',
     enabled: true,
     priority: 1,
   });
   ```

2. **HTML Snippet**:
   ```typescript
   await db.insert(forms).values({
     name: 'Important Status',
     url: 'https://example.com/status',
     watcherType: 'html-snippet',
     watcherConfig: {
       selector: '#status-indicator',
     },
     // ... other fields as above
   });
   ```

3. **AI Text**:
   ```typescript
   await db.insert(forms).values({
     name: 'AI Content Monitor',
     url: 'https://example.com/ai-content',
     watcherType: 'ai-text',
     watcherConfig: {
       regex: 'special.*offer|discount',
     },
     // ... other fields as above
   });
   ```

### Adding Notifiers

```typescript
import { db } from './db';
import { notifiers } from './schema';

// Email notifier
await db.insert(notifiers).values({
  formId: 'form-id-here',
  strategy: 'email',
  emailTo: ['user@example.com'],
  enabled: true,
});

// Discord notifier
await db.insert(notifiers).values({
  formId: 'form-id-here',
  strategy: 'discord',
  webhookUrl: 'https://discord.com/api/webhooks/...',
  enabled: true,
});

// Slack notifier
await db.insert(notifiers).values({
  formId: 'form-id-here',
  strategy: 'slack',
  webhookUrl: 'https://hooks.slack.com/services/...',
  customVars: {
    channel: '#alerts',
    username: 'Form Watcher',
  },
  enabled: true,
});
```

## API Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "environment": "development",
  "uptime": 123.45,
  "activeForms": 5,
  "metrics": {
    "totalChecks": 100,
    "successfulChecks": 98,
    "failedChecks": 2,
    "avgResponseTime": 1.23
  },
  "timestamp": "2023-04-01T12:34:56.789Z"
}
```

### Reload Configuration

```
POST /reload
```

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building for Production

```bash
npm run build
```

## Deployment

### Docker

```bash
docker build -t form-watcher .
docker run -d --name form-watcher --env-file .env form-watcher
```

### PM2

```bash
npm install -g pm2
pm2 start dist/index.js --name form-watcher
```

## License

MIT
