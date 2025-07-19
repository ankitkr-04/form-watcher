export enum INJECTABLES {
  CACHE = 'cache',
  HASH_GENERATOR = 'hashGenerator',
  CIRCUIT_BREAKER = 'circuitBreaker',
  CONTENT_FETCHER = 'contentFetcher',
  HTTP_CLIENT = 'httpClient',
  EMAIL_NOTIFIER = 'emailNotifier',
  SLACK_NOTIFIER = 'slackNotifier',
  DISCORD_NOTIFIER = 'discordNotifier',
  RATE_LIMITER = 'rateLimiter',
  REQUEST_DEDUPLICATOR = 'requestDeduplicator',
  SECRET_ROTATOR = 'secretRotator',

  GOOGLE_FORM_WATCHER = 'googleFormWatcher',
  HTML_SNIPPET_WATCHER = 'htmlSnippetWatcher',
  AI_TEXT_WATCHER = 'aiTextWatcher',
}
