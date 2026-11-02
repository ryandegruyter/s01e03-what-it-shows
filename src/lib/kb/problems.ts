// The problems inside ticket #4471. The incident page calls them one parser bug.
// A report lands in the first group whose description matches its body, then by
// the tenant cause (causes.ts) when the body is the month/day swap.

import { causeOf, type Report, type Tenant } from '#lib/kb/causes';

export const PROBLEMS = ['parser', 'hint', 'one-day', 'early', 'timezone'] as const;
export type Problem = (typeof PROBLEMS)[number];

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const WEEKDAY = 'sunday|monday|tuesday|wednesday|thursday|friday|saturday';

function datesIn(body: string): { d: number; mo: number }[] {
  const re = new RegExp(
    `\\b(?:(?:${WEEKDAY})\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(january|february|march|april|may|june|july|august|september|october|november|december)\\b`,
    'gi',
  );
  return [...body.matchAll(re)].map((m) => ({ d: +m[1], mo: MONTHS[m[2].toLowerCase()] }));
}

// A one-day move keeps the month and shifts the day, or says so in words.
// A month/day swap is a different problem and does not match this.
function isOneDay(body: string): boolean {
  if (/one day off/i.test(body)) return true;
  const dates = datesIn(body);
  if (dates.length >= 2) {
    const [a, b] = dates;
    return a.mo === b.mo && Math.abs(a.d - b.d) === 1;
  }
  return dates.length === 1 && new RegExp(`showed as (?:${WEEKDAY})\\b`, 'i').test(body);
}

export function problemOf(r: Pick<Report, 'channel' | 'body'>, t: Tenant | undefined): Problem | 'unplaced' {
  if (/lisbon/i.test(r.body) && /toronto/i.test(r.body)) return 'timezone';
  if (/before i made the booking/i.test(r.body)) return 'early';
  if (isOneDay(r.body)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  tenants: number;
  firstSeen: string;
  lastSeen: string;
};

export function groupProblems(reports: Report[], tenantOf: (r: Report) => Tenant | undefined): ProblemGroup[] {
  const by = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of reports) {
    const problem = problemOf(r, tenantOf(r));
    by.set(problem, [...(by.get(problem) ?? []), r]);
  }
  const order = (p: ProblemGroup['problem']) => (p === 'unplaced' ? PROBLEMS.length : PROBLEMS.indexOf(p));
  return [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length || order(a.problem) - order(b.problem));
}
