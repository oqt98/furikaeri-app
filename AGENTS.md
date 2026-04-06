# AGENTS.md

This file gives guidance to coding agents and contributors working in this repository.

## Product Intent

`furikaeri-app` is a lightweight self-review app.

The core goal is not "write a full diary" but:

- make daily reflection easy to continue
- make past entries easy to look back on
- help the user improve the next day a little

When making product or UI decisions, prefer simplicity, speed, and clarity over feature depth.

## Current Scope

The current app is an Expo / React Native app with these implemented areas:

- create reflection entries from templates
- browse history
- view entries on a calendar
- view simple analytics
- manage settings including daily reminder notifications

Implemented data includes:

- date
- mood
- category
- template-based answers
- tags
- optional photo
- favorite flag

## Important Gaps Between Vision And Current Code

Do not assume the aspirational product vision is already implemented.

In particular:

- the app does not enforce one entry per day
- tags are not yet separated into action tags and state tags
- weekly summaries, week-over-week comparison, and automatic text summaries are not implemented
- analytics are intentionally lightweight and based on current stored data

If updating docs or UI copy, clearly separate:

- what exists now
- what is planned later

## Repository Structure

- `app/`: Expo Router screens and navigation
- `components/`: shared UI components
- `data/`: static template and tag definitions
- `lib/`: storage and data access helpers

Expected responsibility split:

- keep screens in `app/` focused on UI and navigation
- keep reusable logic out of screen files when it starts growing
- keep storage concerns in `lib/`
- keep static selectable data in `data/`

## Editing Guidance

- Preserve the lightweight feel of the app
- Avoid adding heavy flows, long forms, or enterprise-style complexity
- Prefer incremental changes over broad rewrites
- Do not introduce backend assumptions unless explicitly requested
- Keep offline-first behavior in mind because current persistence is local via AsyncStorage

## UX Guidance

- Japanese UI copy is the default expectation for user-facing text
- Prioritize low-friction input over exhaustive detail
- Favor views that help users review trends at a glance
- If adding new fields, justify why they are worth the extra input cost

## Documentation Guidance

- Keep `README.md` aligned with the current implementation
- Do not present planned features as already shipped
- If you notice doc drift, update the docs in the same change when reasonable

## Safety For Contributors And Agents

- Do not remove user data behavior casually
- Be careful when changing storage shape in `lib/storage.ts`
- If a storage schema change is needed, consider backward compatibility for existing AsyncStorage data
- Do not overwrite unrelated user changes in the working tree

## Good Default Behavior For Agents

When unsure, choose the smaller change that:

1. keeps the app easy to use
2. matches the existing Expo Router structure
3. reflects the current implementation honestly
4. leaves room for future iteration
