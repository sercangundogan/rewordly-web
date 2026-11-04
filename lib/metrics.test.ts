import { describe, expect, it } from 'vitest';
import { normalizeHost, parseUsageRows } from './metrics';

describe('normalizeHost', () => {
  it.each([
    ['medium.com', 'medium.com'],
    ['WWW.Medium.com', 'medium.com'],
    ['mail.google.com', 'mail.google.com'],
    ['localhost', 'private'],
    ['192.168.1.20', 'private'],
    ['jira.company.internal', 'private'],
    ['intranet', 'private'],
    ['[::1]', 'private'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeHost(input)).toBe(expected);
  });

  it('rejects things that are not hostnames', () => {
    expect(normalizeHost('https://medium.com/@me/post')).toBeNull();
    expect(normalizeHost('drop table;')).toBeNull();
    expect(normalizeHost(42)).toBeNull();
  });
});

describe('parseUsageRows', () => {
  it('drops unknown events, merges duplicates and caps counts', () => {
    const rows = parseUsageRows({
      events: [
        { host: 'www.medium.com', event: 'live_fix', count: 2 },
        { host: 'medium.com', event: 'live_fix', count: 3 },
        { host: 'medium.com', event: 'live_check', count: 1, chars: 120 },
        { host: 'medium.com', event: 'hack', count: 1 },
        { host: 'x.com', event: 'rewrite', count: 1e9 },
      ],
    });
    expect(rows).toEqual([
      { host: 'medium.com', event: 'live_fix', count: 5, chars: 0 },
      { host: 'medium.com', event: 'live_check', count: 1, chars: 120 },
      { host: 'x.com', event: 'rewrite', count: 1000, chars: 0 },
    ]);
  });
});
