import { resolveActivityLocalDateKey } from './activity-local-date.util.js';

describe('resolveActivityLocalDateKey', () => {
  it('uses start_date_local from Strava raw when timezone is missing', () => {
    const key = resolveActivityLocalDateKey(
      new Date('2026-05-20T01:30:00.000Z'),
      null,
      {
        summary: {
          start_date_local: '2026-05-19T22:30:00Z',
        },
      },
    );
    expect(key).toBe('2026-05-19');
  });
});
