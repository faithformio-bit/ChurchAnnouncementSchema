# Church Calendar -> Zapier -> OpenAI Announcement Pipeline

This repository contains everything needed to run your Zap flow:

1. Google Calendar `Find Events`
2. `Code by Zapier` (JavaScript) normalize/filter step
3. OpenAI step with structured output

## Files

- `zapier/normalize-events.js`: JavaScript for Code by Zapier
- `openai/schemas/church-announcements.schema.json`: JSON Schema for structured output
- `openai/prompts/system.txt`: System instructions
- `openai/prompts/user.txt`: User message template

## Zap Step Order

1. **Google Calendar: Find Events**
2. **Code by Zapier: Run JavaScript**
3. **OpenAI: Conversation (Structured Output)**

## Code by Zapier Input Fields

Map these from Google Calendar line-item outputs:

- `id` -> `Results ID`
- `summary` -> `Results Summary`
- `description` -> `Results Description`
- `location` -> `Results Location`
- `start` -> `Event Begins`
- `end` -> `Event Ends`
- `status` -> `Results Status`
- `html_link` -> `Results Html Link`
- `recurring_event_id` -> `Results Recurring Event Id`
- `attendee_emails_or_count` -> `Results Attendee Emails` (or count field)
- `start_time_zone` -> `Results Start Time Zone`
- `days_ahead` -> optional static value (example `120`)
- `now_iso` -> optional override (normally blank)

No headers are required.

## Code by Zapier Script

Copy the content of:

- `zapier/normalize-events.js`

Outputs from this step:

- `total_events`
- `total_attendees`
- `total_series`
- `events_json`
- `series_json`
- `announcements_text`

## OpenAI Step Configuration

### 1. System Instructions

Use:

- `openai/prompts/system.txt`

### 2. User Message

Use:

- `openai/prompts/user.txt`

Replace token names with your Zap step token paths as needed.

### 3. Structured Output Schema

If Zapier asks for **JSON Schema URL**, use the raw GitHub URL of:

- `openai/schemas/church-announcements.schema.json`

Example raw URL format:

```text
https://raw.githubusercontent.com/<your-username>/<your-repo>/<branch>/openai/schemas/church-announcements.schema.json
```

## Expected OpenAI Output

The model returns JSON with:

- polished unstructured content:
  - `announcement_title`
  - `announcement_overview`
  - `announcement_bullets`
  - `announcement_full_text`
- extracted values:
  - `totals`
  - `events_extracted[]`

## Publish To GitHub

```bash
git init
git add .
git commit -m "Add Zapier calendar normalization + OpenAI structured output assets"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

