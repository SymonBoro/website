# XP Reward

XP Reward is a mobile-first rewards web app where users complete verified CPA tasks, earn XP, convert XP to INR, and request withdrawals.

## Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: Google OAuth 2.0

## Features

- Fintech-style landing page with task preview, stats, trust messaging, and live earning notifications
- Google sign-in, referral codes, XP wallet, INR conversion, streaks, levels, and recent activity
- Task engine with daily limits, cooldowns, offer rotation, tracked CPA links, optional content locker, and postback verification
- Withdrawal flow for UPI and Google Play gift cards
- Admin panel for users, tasks, completions, withdrawals, settings, and anti-fraud controls
- Legal pages for terms, privacy, and earnings disclaimer

## Quick Start

1. Copy `.env.example` to `.env`
2. Add your MongoDB connection string
3. Add Google OAuth credentials and callback URL
4. Set admin credentials
5. Install dependencies with `npm install`
6. Seed default data with `npm run seed`
7. Start the app with `npm start`

## Required Environment Variables

- `MONGODB_URI`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`
- `CPA_POSTBACK_SECRET`

## CPA Postback Example

Use a postback URL shaped like:

`GET /api/webhooks/cpa?secret=YOUR_SECRET&subid={subid}&click_id={click_id}&transaction_id={transaction_id}&status={status}&payout={payout}`

- `subid` should match the XP Reward user public ID
- `click_id` should match the generated click ID
- XP is credited only after approved postbacks or manual admin approval

## Notes

- Default economy: `1000 XP = ₹1`
- Default minimum withdrawal: `₹100`
- Default content locker wait: `5s`
- Task rewards and economy settings can be updated from the admin panel
