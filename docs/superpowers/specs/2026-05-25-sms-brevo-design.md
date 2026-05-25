# SMS via Brevo: Design Spec

**Date:** 2026-05-25

## Context

quic-plat sends automated notifications to clients on checklist item events. Currently only email (Brevo) is implemented. The notification infrastructure already supports `sms` as a channel type in the DB schema, dispatcher, and worker payload — but no SMS sender exists.

Goal: add SMS delivery via Brevo Transactional SMS so clients receive the same updates by text message.

## Architecture

No DB migrations needed. The schema already has:
- `notification_jobs.channel` supports `'sms'`
- `message_templates.channel` supports `'sms'`
- `NotificationJobPayload.client_phone` already passed through dispatcher and worker

### New: `lib/notifications/channels/sms.ts`

Single exported function:

```ts
sendSms({ to: string, message: string }): Promise<string>
```

- Calls Brevo `/v3/transactionalSMS/sms`
- Uses `BREVO_API_KEY` (existing) and `BREVO_SMS_SENDER` (new env var, max 11 chars)
- Retry logic: 3 attempts, 500ms backoff, no retry on 4xx (same pattern as `email.ts`)
- Returns Brevo `messageId`

### Modified: `app/api/workers/send-notification/route.ts`

Add `else if (payload.channel === 'sms')` branch:
- Throws if `client_phone` is null
- Calls `sendSms({ to: client_phone, message: rendered_body })`
- Logs provider as `'brevo'`

### New: SMS message templates (seed SQL)

Two templates per language (`pt`), both `is_active = true`:

| template_key | channel | notes |
|---|---|---|
| `checklist_complete` | `sms` | <160 chars, no HTML, uses same template vars |
| `checklist_start` | `sms` | <160 chars, no HTML |

Template vars available: `client_name`, `event_name`, `event_date`, `item_client_label`, `portal_url`, `progress_percent`, `completion_note`.

SMS body should be plain text. Portal URL included as raw URL (no HTML buttons).

### New env var

| Var | Description | Example |
|---|---|---|
| `BREVO_SMS_SENDER` | Sender name shown on client's phone, max 11 chars | `QUIC` |

Add to `.env.example` and `lib/env.ts`.

## Data Flow

```
checklist item completed
  → dispatchNotificationsForItem()
    → finds sms templates in templateCache
    → inserts notification_job (channel='sms')
    → QStash publishes to /api/workers/send-notification
      → worker: channel==='sms' → sendSms()
        → Brevo /v3/transactionalSMS/sms
      → updates job status, inserts notification_log
```

## Error Handling

- Missing `client_phone`: throw, job → `failed`
- Brevo 4xx: throw immediately (no retry), job → `failed`
- Brevo 5xx: retry 3x with backoff, then throw, job → `failed`
- All failures logged to `notification_log` with `event_type: 'failed'`

## Out of Scope

- WhatsApp channel (future: Meta Cloud API)
- Opt-out via SMS reply
- SMS delivery status webhooks
- Multi-language templates (PT only for now)
