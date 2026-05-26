export const SCORE_DELTA = {
  opened: 5,
  clicked: 10,
  replied: 25,
  bounced: -50,
  unsubscribed: -100,
} as const

export type ScoreEvent = keyof typeof SCORE_DELTA
