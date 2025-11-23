# Fitness Agent Project

**Created:** November 21, 2025

## Project Overview

Custom fitness agent that integrates multiple health and fitness data sources to provide intelligent workout recommendations, track hydration, and deliver daily briefings via SMS.

## Core Components

### 1. Data Sources & Integrations

#### Recovery Tracking (Manual Input via SMS)
**Note:** WHOOP API requires business/enterprise access with privacy policy. Using manual input for now.
- Daily recovery score input via SMS
- Optional: Sleep quality, HRV self-reported
- Stored in Notion "Recovery" database
- **Future:** Can migrate to WHOOP API when access is granted

#### Notion API (Read/Write)
- **Read:**
  - Workout templates and exercise library
  - Historical performance data
  - Previous workout weights and reps
- **Write:**
  - AI-predicted weights for upcoming workouts
  - Session notes with recovery-based adjustments
  - Template modifications based on performance trends
  - Completion status and actual performance data

#### Google Calendar API (Read)
- Scheduled workouts
- Rest days
- Training calendar events

#### Twilio SMS (Two-Way Communication)
- Daily morning briefings
- Hydration tracking via SMS replies
- Workout reminders
- Recovery alerts

### 2. Intelligence Features

#### Weight Prediction Algorithm
Uses historical data to predict appropriate weights:
- **Progressive Overload:** Incrementally increase weight when recovery is high
- **Deload Protocol:** Reduce weight by 10-15% when recovery is low
- **Factors Considered:**
  - Previous workout performance (weight × reps)
  - Manual recovery score input (via SMS)
  - Time since last similar workout
  - Progressive overload principles
  - Week in training cycle (deload every 4th week)

**Example Logic:**
```
Last week: B-Stance Hip Thrust @ 185 lbs × 15 reps
Recovery: 85% (Green) → Suggest: 190 lbs (progressive overload)

Recovery: 45% (Red) → Suggest: 165 lbs (deload by 10-15%)

No recovery data → Use 4-week cycle: Week 1-3 progress, Week 4 deload
```

#### Hydration Tracking
- Track daily water intake via SMS replies
- Periodic check-in reminders
- Adaptive recommendations based on:
  - Workout intensity/strain
  - Body weight
  - Environmental factors

#### Workout Optimization
- Match workout intensity to recovery scores
- Suggest modifications based on WHOOP data
- Auto-update Notion templates with AI predictions

### 3. Notion Database Structure

**Workout Properties:**
- Title (e.g., "Legs & Glutes Pt.2")
- Workout Type (multi-select: Lower Body, Upper Body, etc.)
- Workout Date
- Sauna (checkbox)
- Acupuncture (checkbox)
- Red Light Therapy (checkbox)

**Workout Table:**
| Workout | Sets | Reps | Lbs |
|---------|------|------|-----|
| B-Stance Hip Thrust | 3 | 12-15/TF | [AI predicted] |
| Step Ups | 3 | 12-15/TF | [AI predicted] |
| B-Stance RDL | 3 | 12-15 | [AI predicted] |
| Seated Hip Abduction | 3 | 12-15 | [AI predicted] |

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              NOTION DATABASE (R/W)                   │
│  ┌────────────────┬──────────────┬─────────────┐    │
│  │   Workouts     │   History    │  Recovery   │    │
│  └────────────────┴──────────────┴─────────────┘    │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │    INTELLIGENT AGENT          │
        │                               │
        │  • Weight Prediction Model    │
        │  • Manual Recovery Input      │
        │  • Hydration Tracking         │
        │  • Progressive Overload Logic │
        └───────┬───────────────────┬───┘
                │                   │
        ┌───────▼──────┐    ┌──────▼────────┐
        │  SMS Input   │    │  Google Cal   │
        │  (Recovery)  │    │  (Schedule)   │
        └──────────────┘    └───────────────┘
                │                   │
                └─────────┬─────────┘
                          ▼
                  ┌───────────────┐
                  │  TWILIO SMS   │
                  │  (Two-Way)    │
                  └───────────────┘

Note: WHOOP API integration deferred until API access is granted
```

## Daily Briefing Example

```
🌅 Good morning!

📊 How's your recovery today? (0-100)
Reply with a number to get your workout plan.

[After receiving "78"]

📊 RECOVERY: 78% (Green) - Nice!

🏋️ TODAY'S WORKOUT: Legs & Glutes Pt.2
• B-Stance Hip Thrust: 3×15 @ 190 lbs ⬆️
• Step Ups: 3×15 @ 135 lbs (maintain)
• B-Stance RDL: 3×15 @ 95 lbs ⬆️
• Seated Hip Abduction: 3×15 @ 110 lbs

💧 HYDRATION: 0/100 oz
Reply with water intake throughout the day!

✅ Sauna ✅ Acupuncture ✅ Red Light
```

## SMS Interaction Flow

```
Agent: "🌅 Morning! How's your recovery today? (0-100)"

User: "78"

Agent: "📊 Recovery: 78% (Green)
🏋️ TODAY: Upper Body Push
• Bench Press: 3×12 @ 185 lbs ⬆️
• Incline DB Press: 3×12 @ 65 lbs
💧 Water goal: 100oz. Reply with intake!"

User: "16"

Agent: "Great start! 16/100oz logged ✅"

[Later...]

Agent: "💧 Hydration check: How much more have you had?"

User: "24"

Agent: "Awesome! 40/100oz total. Keep it up! 💪"
```

## Technology Stack

**Language:** TypeScript (Node.js)

**Rationale:**
- Heavy API integration workload (4 different APIs)
- Real-time SMS webhook handling (Twilio)
- Superior async I/O for concurrent operations
- Easier serverless deployment (Vercel, Railway)
- Type safety for API contracts
- Simpler weight prediction logic (doesn't require ML libraries)

## Project Structure

```
fitness-agent/
├── src/
│   ├── integrations/
│   │   ├── whoop.ts              # WHOOP API client
│   │   ├── notion.ts             # Notion read/write operations
│   │   ├── google-calendar.ts   # Google Calendar integration
│   │   └── twilio.ts             # SMS sending/receiving & webhooks
│   ├── services/
│   │   ├── weight-predictor.ts   # Weight prediction algorithm
│   │   ├── hydration-tracker.ts  # Hydration tracking logic
│   │   ├── briefing-generator.ts # Daily SMS briefing
│   │   └── workout-optimizer.ts  # Recovery-based optimization
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces & types
│   ├── utils/
│   │   ├── date-helpers.ts       # Date formatting utilities
│   │   └── logger.ts             # Logging utility
│   └── index.ts                  # Application entry point
├── config/
│   └── env.ts                    # Environment variables & API keys
├── package.json
├── tsconfig.json
├── vercel.json                   # Deployment & cron job config
└── README.md
```

## Key Questions & Decisions

### Scheduling
- **Daily briefing time:** 6:00 AM (configurable)
- **Hydration check-ins:** 12:00 PM, 4:00 PM, 8:00 PM
- **Cron job or scheduled task:** To be determined

### Intelligence Level
- Agent suggests workout modifications based on recovery
- User has final say (can ignore suggestions)
- Agent learns from actual performance data

### Data Storage
- **Primary:** Notion database (workout history, templates)
- **Cache/State:** Local database or JSON for session data
- **Hydration:** Daily tracking reset at midnight

### Interaction Mode
- **Primary:** One-way daily briefing
- **Secondary:** Two-way for hydration tracking
- **Future:** Could expand to conversational workout logging

## Additional Considerations

### 1. Error Handling & Reliability
**API Failures:**
- What if WHOOP API is down? Send briefing without recovery data?
- What if Notion is unreachable? Cache last known workout?
- Retry logic with exponential backoff
- Fallback strategies for each integration

**Data Quality:**
- Missing WHOOP data (device not synced, not worn overnight)
- Incomplete workout history (first-time exercises)
- Malformed Notion entries

**Solution:**
```typescript
// Graceful degradation
if (!whoopData) {
  sendBriefing("Recovery data unavailable. Proceed with caution.");
}
```

### 2. Data Privacy & Security
**Sensitive Health Data:**
- WHOOP data includes sleep, HRV, heart rate
- Workout history could reveal injuries or health issues
- Phone number for SMS

**Considerations:**
- Store API keys in environment variables (never commit)
- Encrypt at rest if using local database
- HIPAA compliance if sharing with others
- Clear data retention policy

**Questions:**
- Who has access to this data?
- Where is it stored (local, cloud, Notion only)?
- How long to retain historical data?

### 3. Rate Limiting & API Quotas
**API Limits:**
- WHOOP: Unknown, need to check docs
- Notion: 3 requests/second
- Google Calendar: 1M requests/day (generous)
- Twilio: Pay-per-message

**Strategies:**
- Implement rate limiting middleware
- Cache WHOOP data (update once per day)
- Batch Notion updates
- Track SMS costs (estimate: $0.0079/message)

### 4. Time Zones & Scheduling
**Critical Questions:**
- What timezone for 6 AM briefing?
- What if traveling (different timezone)?
- Daylight saving time handling

**Solution:**
- Store user timezone preference
- Use UTC internally, convert for display
- Libraries: `date-fns-tz` or `luxon`

### 5. Weight Prediction Edge Cases
**Scenarios to Handle:**
- **First time doing an exercise:** No historical data
  - Solution: Use template default or ask user
- **Long break (injury, vacation):** Last workout was 3+ weeks ago
  - Solution: Suggest deload by 20-30%
- **Plateau:** Same weight for 4+ weeks
  - Solution: Suggest rep scheme change or minor increase
- **Form breakdown:** User reports form issues
  - Solution: Maintain or reduce weight

**Progressive Overload Logic:**
```typescript
interface ProgressionRule {
  exerciseType: 'compound' | 'isolation';
  increment: number; // lbs
  minRecovery: number; // percentage
  deloadThreshold: number; // consecutive low recovery days
}

const rules = {
  compound: { increment: 5, minRecovery: 66, deloadThreshold: 2 },
  isolation: { increment: 2.5, minRecovery: 66, deloadThreshold: 3 }
};
```

### 6. Notion Database Schema Decisions
**Current Structure:**
- Each workout is a Notion page
- Table of exercises within each page

**Questions:**
- How to handle historical data?
  - Option A: Archive completed workouts
  - Option B: Keep template + create new "session" pages
- How to track progress over time?
  - Separate "History" database with relations?
- How to handle exercise variations?
  - "B-Stance Hip Thrust" vs "Hip Thrust" vs "Barbell Hip Thrust"

**Recommended Structure:**
```
Database 1: Workout Templates (read-only-ish)
├── Template: "Legs & Glutes Pt.2"
├── Template: "Upper Body Push"
└── Template: "Full Body"

Database 2: Workout Sessions (read/write)
├── Session: "Nov 21, 2025 - Legs & Glutes Pt.2"
│   ├── Relation → Template
│   ├── Actual weights performed
│   ├── Recovery score at time of workout
│   └── Notes
└── ...

Database 3: Exercise Library (reference)
├── Exercise: "B-Stance Hip Thrust"
│   ├── Type: Compound
│   ├── Muscle Group: Glutes
│   └── Default progression: +5 lbs
└── ...
```

### 7. Hydration Tracking Details
**Questions:**
- How to calculate daily goal? (body weight × 0.5 = oz?)
- Adjust for workout intensity? (+8-16oz per workout)
- Adjust for temperature/season?
- What if user forgets to log? Send reminder but don't nag

**Smart Features:**
- "You logged 120oz yesterday! Same goal today?"
- "High strain workout today (+16oz recommended)"
- Weekly hydration report

### 8. SMS Conversation Design
**UX Considerations:**
- Keep messages concise (SMS is limited)
- Use emojis for quick scanning
- Provide actionable information only
- Don't spam (max 4-5 messages per day)

**Conversation States:**
```typescript
enum ConversationState {
  AWAITING_HYDRATION,
  AWAITING_WORKOUT_FEEDBACK,
  IDLE
}
```

**Commands:**
- "skip" - skip today's workout
- "done" - mark workout complete
- "24" - log 24oz water
- "help" - show available commands

### 9. Testing Strategy
**Unit Tests:**
- Weight prediction algorithm
- Recovery score parsing
- Hydration calculations

**Integration Tests:**
- Notion read/write operations
- SMS sending/receiving
- WHOOP data fetching

**Manual Testing:**
- End-to-end daily briefing flow
- SMS conversation scenarios
- Error recovery

### 10. Deployment & Infrastructure
**Hosting Options:**
- **Vercel:** Easy cron jobs, free tier, great for webhooks
- **Railway:** Simple deployment, persistent storage if needed
- **AWS Lambda + EventBridge:** More complex but scalable

**Cron Jobs:**
- Daily briefing (6 AM)
- Hydration reminders (12 PM, 4 PM, 8 PM)
- Weekly summary (Sunday evening?)

**Webhooks:**
- Twilio SMS replies → `/api/sms/receive`
- Need public HTTPS endpoint

**Environment Variables:**
```
WHOOP_API_KEY=
NOTION_API_KEY=
NOTION_DATABASE_ID=
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
USER_PHONE_NUMBER=
USER_TIMEZONE=America/New_York
```

### 11. Future Enhancements (V2+)
- **WHOOP API integration:** When business/enterprise access is granted
- **Voice notes:** Whisper API to transcribe workout notes
- **Progress photos:** Store in Notion, AI analysis
- **Injury tracking:** Log pain/discomfort, adjust workouts
- **Nutrition tracking:** Integrate MyFitnessPal or similar
- **Weekly summaries:** Charts, trends, achievements
- **Multiple users:** Support for coaches/training partners
- **Mobile app:** React Native companion app
- **AI coaching:** GPT-4 for form tips and motivation

### 12. Cost Estimates
**Monthly Costs:**
- Twilio SMS: ~$12/month (5 messages/day × 30 days × $0.0079)
- Notion API: Free
- Google Calendar API: Free
- Hosting (Vercel): Free tier likely sufficient
- **Total: ~$12/month**

**Note:** WHOOP API access deferred (requires business account with privacy policy)

### 13. Development Phases

**Phase 1: Core Infrastructure (Week 1)**
- Project setup
- API integrations (read-only first)
- Basic daily briefing (no AI yet)

**Phase 2: Intelligence Layer (Week 2)**
- Weight prediction algorithm
- Recovery-based adjustments
- Notion write operations

**Phase 3: Hydration & Interactivity (Week 3)**
- Two-way SMS handling
- Hydration tracking
- Command parsing

**Phase 4: Polish & Deploy (Week 4)**
- Error handling
- Testing
- Deployment
- Monitoring

## Implementation Task List

### Phase 1: Project Setup & Infrastructure
- [ ] Initialize Node.js project (`npm init`)
- [ ] Install dependencies (you will handle this independently)
- [ ] Create TypeScript configuration (`tsconfig.json`)
- [ ] Set up folder structure (`src/`, `config/`, etc.)
- [ ] Create `.env.example` file with required variables
- [ ] Set up `.gitignore` (exclude `.env`, `node_modules/`, `dist/`)
- [ ] Initialize Git repository
- [ ] Create basic `README.md` with setup instructions

### Phase 2: Type Definitions & Utilities
- [ ] Define TypeScript interfaces in `src/types/index.ts`:
  - `WhoopRecovery`, `WhoopSleep`, `WhoopStrain`
  - `NotionWorkout`, `NotionExercise`, `NotionSession`
  - `CalendarEvent`
  - `HydrationLog`
  - `WorkoutPrediction`
- [ ] Create `src/utils/logger.ts` for consistent logging
- [ ] Create `src/utils/date-helpers.ts` for timezone handling
- [ ] Create `src/config/env.ts` for environment variable validation

### Phase 3: API Integration Layer (Read-Only First)
- [ ] **Recovery Tracking** (`src/services/recovery-tracker.ts`):
  - [ ] Implement manual recovery input via SMS
  - [ ] Store recovery scores in Notion "Daily Recovery" database
  - [ ] Implement `getLatestRecovery()` method
  - [ ] Implement `getRecoveryTrend()` method (last 7 days)
  - [ ] Add validation (0-100 range)
  - [ ] **Future:** Migrate to WHOOP API when access granted

- [ ] **Notion Integration** (`src/integrations/notion.ts`):
  - [ ] Set up Notion client
  - [ ] Implement `getWorkoutTemplates()` method
  - [ ] Implement `getWorkoutHistory(exerciseName)` method
  - [ ] Implement `getTodaysWorkout()` method
  - [ ] Parse Notion table blocks (exercises, sets, reps)
  - [ ] Add error handling

- [ ] **Google Calendar Integration** (`src/integrations/google-calendar.ts`):
  - [ ] Set up OAuth 2.0 flow
  - [ ] Implement `getTodaysEvents()` method
  - [ ] Implement `getUpcomingWorkouts()` method
  - [ ] Filter for workout-related events
  - [ ] Add error handling

- [ ] **Twilio Integration** (`src/integrations/twilio.ts`):
  - [ ] Set up Twilio client
  - [ ] Implement `sendSMS(message)` method
  - [ ] Add error handling and delivery confirmation

### Phase 4: Core Services
- [ ] **Weight Predictor** (`src/services/weight-predictor.ts`):
  - [ ] Implement `predictWeight(exercise, history, recovery)` function
  - [ ] Add progressive overload logic
  - [ ] Add deload logic based on recovery
  - [ ] Handle edge cases (first time, long break, plateau)
  - [ ] Unit tests for prediction algorithm

- [ ] **Briefing Generator** (`src/services/briefing-generator.ts`):
  - [ ] Implement `generateDailyBriefing()` function
  - [ ] Format recovery data section
  - [ ] Format workout section with predictions
  - [ ] Format hydration section
  - [ ] Add emoji and formatting
  - [ ] Handle missing data gracefully

- [ ] **Workout Optimizer** (`src/services/workout-optimizer.ts`):
  - [ ] Implement `optimizeWorkout(workout, recovery)` function
  - [ ] Adjust intensity based on recovery
  - [ ] Suggest modifications (reduce sets/weight)
  - [ ] Add reasoning to suggestions

- [ ] **Hydration Tracker** (`src/services/hydration-tracker.ts`):
  - [ ] Implement `calculateDailyGoal()` function
  - [ ] Implement `logWaterIntake(amount)` function
  - [ ] Implement `getHydrationStatus()` function
  - [ ] Reset daily at midnight
  - [ ] Store in-memory or simple JSON file

### Phase 5: Notion Write Operations
- [ ] **Notion Write Methods** (`src/integrations/notion.ts`):
  - [ ] Implement `updateWorkoutWeights(workoutId, predictions)` method
  - [ ] Implement `addSessionNotes(workoutId, notes)` method
  - [ ] Implement `createWorkoutSession(template, date)` method
  - [ ] Implement `markWorkoutComplete(workoutId)` method
  - [ ] Add validation and error handling

### Phase 6: SMS Conversation Flow
- [ ] **SMS Webhook Handler** (`src/integrations/twilio.ts`):
  - [ ] Implement webhook endpoint handler
  - [ ] Parse incoming SMS messages
  - [ ] Extract commands ("skip", "done", numbers for hydration)
  - [ ] Route to appropriate service
  - [ ] Send confirmation responses

- [ ] **Conversation State Management**:
  - [ ] Track conversation state (awaiting response, idle)
  - [ ] Handle multi-turn conversations
  - [ ] Timeout inactive conversations

### Phase 7: Scheduling & Automation
- [ ] **Cron Jobs** (using `node-cron` or Vercel cron):
  - [ ] Daily briefing job (6 AM)
  - [ ] Hydration reminder job (12 PM, 4 PM, 8 PM)
  - [ ] Weekly summary job (optional)
  - [ ] Configure timezone handling

- [ ] **Main Application** (`src/index.ts`):
  - [ ] Set up Express server (for webhooks)
  - [ ] Register webhook routes
  - [ ] Initialize cron jobs
  - [ ] Add health check endpoint
  - [ ] Add graceful shutdown handling

### Phase 8: Error Handling & Resilience
- [ ] Implement global error handler
- [ ] Add retry logic with exponential backoff for API calls
- [ ] Add fallback strategies for each integration
- [ ] Log errors to file or monitoring service
- [ ] Send error notifications (SMS or email)

### Phase 9: Testing
- [ ] Unit tests for weight prediction algorithm
- [ ] Unit tests for hydration calculations
- [ ] Integration tests for Notion read/write
- [ ] Integration tests for WHOOP data fetching
- [ ] Mock SMS sending for local testing
- [ ] End-to-end test for daily briefing flow

### Phase 10: Deployment
- [ ] Create `vercel.json` or deployment config
- [ ] Set up environment variables in hosting platform
- [ ] Configure cron jobs in hosting platform
- [ ] Set up webhook URL for Twilio
- [ ] Test in production environment
- [ ] Monitor first few days of operation

### Phase 11: Documentation & Maintenance
- [ ] Document API setup process (WHOOP, Notion, Google, Twilio)
- [ ] Document environment variables
- [ ] Create troubleshooting guide
- [ ] Document Notion database schema requirements
- [ ] Add inline code comments
- [ ] Create user guide for SMS commands

### Optional Enhancements
- [ ] Add logging/monitoring (e.g., LogRocket, Sentry)
- [ ] Create admin dashboard (view logs, trigger manual briefing)
- [ ] Add web interface for configuration
- [ ] Implement weekly summary with charts
- [ ] Add workout completion tracking
- [ ] Implement exercise variation detection

## Dependencies

```json
{
  "dependencies": {
    "@notionhq/client": "^2.x",
    "twilio": "^4.x",
    "googleapis": "^120.x",
    "node-cron": "^3.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "@types/node-cron": "^3.x",
    "typescript": "^5.x",
    "tsx": "^4.x"
  }
}
```

## API Requirements

- ~~WHOOP API credentials~~ (Deferred - requires business account)
- Notion API token + Database IDs (Workouts, Sessions, Exercise Library, Recovery)
- Google Calendar API credentials (OAuth 2.0)
- Twilio Account SID + Auth Token + Phone Number

## Notes

- TF in rep ranges = "To Failure"
- Recovery zones: Red (<33%), Yellow (33-66%), Green (>66%)
- Progressive overload: +2.5-5 lbs per week for lower body, +2.5 lbs for upper body
- Deload triggers: Recovery <50% for 2+ consecutive days
