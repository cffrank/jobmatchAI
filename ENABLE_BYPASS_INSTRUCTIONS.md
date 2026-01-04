# Enable Repository Rule Bypass - Step by Step

## Current Problem

The repository rulesets for `develop` and `main` branches require passing tests but have no bypass actors configured. We need to add bypass permissions.

## Solution: Add Bypass Actors to Repository Rules

### Step 1: Go to Repository Rules Settings

1. Open: https://github.com/cffrank/jobmatchAI/settings/rules
2. You should see two rulesets:
   - `development` (for develop branch)
   - One for main branch (check the name)

### Step 2: Edit Development Ruleset

1. Click on the `development` ruleset
2. Or go directly to: https://github.com/cffrank/jobmatchAI/rules/11378861
3. Click "Edit" (pencil icon in top right)
4. Scroll down to "Bypass list" section
5. Click "Add bypass"
6. Select "Repository admin" or add yourself specifically
7. Click "Save changes" at the bottom

### Step 3: Edit Main Branch Ruleset

1. Go back to: https://github.com/cffrank/jobmatchAI/settings/rules
2. Find the ruleset for `main` branch
3. Click to edit it
4. Scroll to "Bypass list"
5. Click "Add bypass"
6. Select "Repository admin" or add yourself specifically
7. Click "Save changes"

### Step 4: Verify Changes

After saving, the ruleset should show:
- Bypass actors: Repository admin (or your username)
- You should be able to merge PRs despite failing tests

### Step 5: Try Merging Again

Once you've updated both rulesets, I'll be able to merge the PRs via CLI.

## Alternative: Merge Manually via GitHub Web UI

If the above doesn't work, you can merge directly in the web UI:

1. Go to: https://github.com/cffrank/jobmatchAI/pull/21
2. Click "Merge pull request" dropdown
3. You should see "Merge without waiting for requirements to be met"
4. Click it and confirm

Repeat for:
- PR #19: https://github.com/cffrank/jobmatchAI/pull/19
- PR #20: https://github.com/cffrank/jobmatchAI/pull/20

## Visual Guide

### Finding Bypass List Section

When editing a ruleset, look for this section:

```
Bypass list
───────────────────────────────────────
Who can bypass this ruleset?

[ Add bypass ]

Repository admins
Organization admins
Specific people, teams, or apps
```

Click "Add bypass" and select "Repository admin"

### After Adding Bypass

You should see:

```
Bypass actors
───────────────────────────────────────
✓ Repository admin
```

## Important Notes

1. **Temporary**: After merging the 3 PRs, you should remove the bypass (or keep it for emergencies)
2. **Security**: Bypass allows merging without tests - use carefully
3. **Future**: After these PRs are merged and tests are fixed, all new PRs will require passing tests

## What Happens After

Once you add bypass and I can merge:

1. PR #21 merges to `develop` → Syncs develop with main
2. PR #19 merges to `main` → CORS simplification
3. PR #20 merges to `main` → Railway automation

Then we'll:
1. Sync develop with the new main commits
2. Fix the frontend TypeScript errors
3. Future PRs will require passing tests

## Need Help?

If you're stuck, just:
1. Go to each PR in the web UI
2. Click "Merge pull request" (with admin override)
3. Let me know when they're merged so I can update local branches
