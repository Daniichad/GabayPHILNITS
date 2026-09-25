# Gabay PhilCSE - Points System

This document outlines the rules for the points-based leaderboard system in the Gabay PhilCSE app.

## 1. Streak Points
Earned once per day, triggered when completing at least one Study, Practice, or Mock Exam session.
- **Day 1–2**: 5 points
- **Day 3–6**: 10 points
- **Day 7–13**: 15 points
- **Day 14–29**: 20 points
- **Day 30+**: 30 points
- **Milestone Bonuses**:
  - 30-day streak: +100 points
  - 100-day streak: +250 points

## 2. Reading Materials
- **Starting a session**: 5 points
- **Finishing (First Time)**: 15 points
- **Finishing (Repeat)**: 5 points
*Note: A session is only considered "finished" if the user meets the minimum engagement threshold (e.g., >15 seconds dwell time and scrolled to the bottom). Daily cap: 300 points.*

## 3. Practice Sessions (Handpose Gesture Recognition)
- **Starting a session**: 5 points
- **Finishing a session**: 10 points
- **Per correct gesture**: 2 points
- **Accuracy Multiplier**:
  - < 50% accuracy: x0.5
  - 50–74% accuracy: x1.0
  - 75–89% accuracy: x1.25
  - 90–100% accuracy: x1.5
*Note: Points are limited to 3 sessions per specific sign per day. Daily cap: 1000 points.*

## 4. Mock Exams
- **Completing an exam**: 20 points
- **Score points**: +3 points per percentage point scored (e.g., 80% = +240 pts)
- **Passing bonus (>=75%)**: +50 points
- **Perfect score bonus (100%)**: +150 points
- **First attempt bonus**: +30 points
- **Retake rule**: No first attempt, passing, or perfect bonuses on retake. Instead, users earn +5 points for every percentage point of improvement over their previous best score, on top of base completion and score points. Daily cap: 2000 points.

## System Architecture
- All points are calculated via pure functions in `utils/pointsEngine.js`.
- Points are written to `points_ledger_local` in SQLite.
- `syncManager.js` pushes unsynced points to the Supabase `sync_points_ledger` RPC, which validates and stores them in `points_ledger`.
- Leaderboards are generated via Supabase views (`leaderboard_all_time`, `leaderboard_monthly`, `leaderboard_weekly`).
