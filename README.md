<p align="center">
  <img src="assets/campfire-logo.svg" alt="Campfire logo" width="156" height="156" />
</p>

<h1 align="center">Campfire</h1>

<p align="center">
  A focused workspace companion for Mattermost: standups, tasks, leave, reminders, and team reports in one place.
</p>

<p align="center">
  <a href="https://github.com/Amir-Zouerami/campfire/actions/workflows/ci.yml">
    <img alt="CI" src="https://img.shields.io/github/actions/workflow/status/Amir-Zouerami/campfire/ci.yml?branch=main&label=CI&style=for-the-badge" />
  </a>
  <a href="https://github.com/Amir-Zouerami/campfire/releases">
    <img alt="Release" src="https://img.shields.io/github/v/release/Amir-Zouerami/campfire?label=Release&style=for-the-badge" />
  </a>
  <img alt="Version" src="https://img.shields.io/badge/version-1.3.0-f0a85a?style=for-the-badge" />
  <img alt="Mattermost" src="https://img.shields.io/badge/Mattermost-Plugin-2b2b2b?style=for-the-badge" />
  <img alt="Go" src="https://img.shields.io/badge/Go-Server-2b2b2b?style=for-the-badge" />
  <img alt="React" src="https://img.shields.io/badge/React-Webapp-2b2b2b?style=for-the-badge" />
</p>

---

## Table of contents

- [Table of contents](#table-of-contents)
- [What Campfire is](#what-campfire-is)
- [Who it is for](#who-it-is-for)
- [Core features](#core-features)
  - [🔥 My Day](#-my-day)
  - [👥 Team Review](#-team-review)
  - [📊 Reports](#-reports)
  - [🔔 Reminders](#-reminders)
  - [🧩 Standup Forms](#-standup-forms)
  - [🌴 Leave and availability](#-leave-and-availability)
  - [🗓️ Working calendar](#️-working-calendar)
  - [🌐 Language, direction, and regional support](#-language-direction-and-regional-support)
- [Screens and workflows](#screens-and-workflows)
- [Language and regional support](#language-and-regional-support)
- [Installation](#installation)
- [Configuration overview](#configuration-overview)
- [Permissions and roles](#permissions-and-roles)
- [Reports](#reports)
- [Architecture](#architecture)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Build from source](#build-from-source)
- [Release artifacts](#release-artifacts)
- [Data and privacy](#data-and-privacy)
- [Status](#status)

---

## What Campfire is

**Campfire** is a Mattermost plugin for teams that want a lightweight, self-hosted way to manage daily work rituals directly inside Mattermost.

It brings together:

- 📝 daily and weekly standups
- ✅ task capture from standup answers
- ⏱️ time logging
- 🌴 leave requests and availability review
- 🔔 DM and channel reminders
- 📊 daily, weekly, time, missing, blocker, and CSV reports
- 🧩 workspace-level configuration
- 🗓️ working calendars, workspace timezones, and off-days
- 🌐 English, Persian, and Arabic UI support with RTL-aware layouts
- 📅 Persian calendar display beside Gregorian dates

Campfire is designed for teams that want the structure of a lightweight operations dashboard without moving work discussion out of Mattermost.

---

## Who it is for

Campfire is useful for:

- engineering teams running async standups
- remote or hybrid teams
- operations teams that need simple leave visibility
- team leads who need daily missing/blocker reports
- organizations using Mattermost as their primary internal workspace
- Persian-speaking, Arabic-speaking, English-speaking, or mixed-language teams
- teams that need RTL-aware UI while keeping Mattermost channel discussion unchanged
- teams that use non-Western working weeks, such as Saturday to Wednesday or Saturday to Thursday

---

## Core features

### 🔥 My Day

A personal workspace for each user.

Users can:

- submit standups
- answer custom daily or weekly questions
- create tasks from standup answers
- review their active tasks
- log time against tasks
- request leave
- edit or delete eligible leave requests
- request changes for approved leave that is already in progress
- review their leave history

---

### 👥 Team Review

A lead/admin workspace for reviewing team activity.

Team reviewers can:

- see who submitted standups
- see who is missing
- see who is on approved leave
- review availability windows
- approve or reject leave requests
- inspect runtime decisions around standups, reminders, working days, and off-days
- review leave approval queues in a compact, operational view

---

### 📊 Reports

Campfire can generate and preview multiple report types:

- daily report
- weekly summary
- missing standups
- blockers-first review
- time report
- CSV export
- saved report filters
- global workspace reports
- global time reports across workspaces
- global leave reports across workspaces

Reports are designed for Mattermost channels, so the output is readable as Markdown and useful for team review.

---

### 🔔 Reminders

Campfire supports reminder rules for standup schedules.

A schedule can have:

- an opening time
- a closing/report posting time
- up to three reminder times
- DM reminders
- channel reminders
- optional mentions for missing users

Only users who have not submitted and are not on approved leave should be reminded.

Weekly reminders and weekly report automation run on the workspace's last working day, based on that workspace's working calendar and timezone.

---

### 🧩 Standup Forms

Admins can configure standup templates and questions.

Supported question behavior includes:

- long text
- dropdown/select
- boolean yes/no
- multiple options
- required questions
- report visibility
- private answers
- task creation from answers

Templates can be daily or weekly and can be attached to schedules.

---

### 🌴 Leave and availability

Campfire includes a lightweight leave workflow:

- users request leave
- users can directly edit or delete pending leave requests
- users can directly edit or delete approved leave requests before the leave starts
- users request a change when approved leave is already in progress
- admins, leads, and approvers can edit or delete leave requests regardless of the requester-side condition
- approvers review requests and approve or reject them
- approved leave is reflected in availability screens
- missing-standup logic skips approved leave users
- approved leave announcements can be posted to a configured channel
- hourly leave includes start and end times in forms, approval views, and notifications

---

### 🗓️ Working calendar

Admins can define the workspace rhythm.

Campfire supports:

- Monday to Friday teams
- Saturday to Wednesday teams
- Saturday to Thursday teams
- custom working-day patterns
- workspace-level timezone settings
- workspace off-days
- global off-days

These settings affect reminders, standup availability, leave timing, and weekly report timing.

---

### 🌐 Language, direction, and regional support

Campfire supports language and direction settings across the webapp and generated messages.

Supported languages include:

- English
- Persian
- Arabic

The UI supports:

- LTR layouts for English
- RTL layouts for Persian and Arabic
- localized labels and page copy
- bidi-safe rendering for mixed Persian, Arabic, and English text
- workspace-generated message language settings
- Persian calendar labels next to canonical Gregorian dates
- timezone selection independent of UI language

---

## Screens and workflows

Campfire is organized around four primary areas:

| Area            | Purpose                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| **My Day**      | Personal standup, tasks, time, and leave                                 |
| **Team Review** | Team submissions, availability, approvals, and runtime state             |
| **Reports**     | Markdown previews, CSV exports, saved filters, and report posting        |
| **Settings**    | Roles, calendar, forms, reminders, report rules, audit log, and off-days |

The UI is built as a focused full-screen workspace inside Mattermost, with dark styling, compact navigation, reusable form controls, and channel-aware bootstrap behavior.

When Campfire opens from a Mattermost channel, it loads the workspace context for that channel instead of reusing stale state from a previously opened channel.

---

## Language and regional support

Campfire includes first-class support for Persian/Arabic-heavy workflows:

- English, Persian, and Arabic UI catalogs
- Persian calendar display beside Gregorian dates
- workspace timezone editing from Settings
- generated message language settings for workspace notifications
- Vazirmatn font support inside Campfire UI controls
- bidi-safe rendering for mixed Persian, Arabic, and English text
- RTL-aware navigation, form controls, selects, date pickers, and time pickers
- localized weekday cards with native labels and English references
- Persian-friendly standup questions, labels, leave reasons, notes, and user-entered answers

This support is scoped to the Campfire UI and Campfire-generated messages. It does not modify normal Mattermost channel messages outside the plugin.

---

## Installation

1. Go to the latest GitHub Release.
2. Download the Campfire plugin `.tar.gz` bundle.
3. In Mattermost, open **System Console → Plugin Management**.
4. Upload the plugin bundle.
5. Enable the plugin.
6. Open the Campfire workspace from the plugin entry point.
7. Configure roles, working days, timezone, forms, schedules, reminders, leave notifications, and reports.

Campfire is intended for self-hosted Mattermost deployments where plugin uploads are enabled.

---

## Configuration overview

After installation, configure Campfire from **Settings**.

Recommended setup order:

1. **Overview**
   Confirm workspace identity, channel context, timezone, and generated message language.

2. **Roles & Access**
   Assign explicit Campfire roles such as Lead, Approver, Viewer, Member, or Admin.

3. **Working Calendar**
   Select active working days and add workspace off-days.

4. **Standup Forms**
   Create or edit daily/weekly templates and questions.

5. **Schedules**
   Attach templates to daily or weekly schedules and set open/close times.

6. **Reminders**
   Configure DM/channel reminders before the standup closes.

7. **Leave Notifications**
   Configure approved-leave announcement channels, direct-message recipients, and notification language.

8. **Report Rules**
   Choose sorting, report language, blocker behavior, and posting rules.

9. **Global Off-days**
   Add organization-wide holidays or no-standup dates.

---

## Permissions and roles

Campfire uses workspace-specific roles.

Typical roles:

| Role         | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| **Member**   | Submit standups, manage personal tasks/time/leave               |
| **Lead**     | Review submissions, missing users, availability, and team state |
| **Approver** | Approve or reject leave requests and manage leave corrections   |
| **Viewer**   | View reports and dashboards without changing settings           |
| **Admin**    | Configure workspace rules, schedules, forms, access, and leave  |

Campfire can also inherit access from Mattermost roles depending on backend settings, such as channel admins or system admins. The current UI displays inherited access behavior; changing those inherited rules requires backend/settings support.

Admins and privileged reviewers can manage leave requests directly when normal users would need to request a change.

---

## Reports

Campfire reports are generated as Mattermost-friendly Markdown.

Supported report workflows include:

- daily standup preview
- weekly summary preview
- blockers-first review
- missing standups
- time totals by person/project/task/day/week
- CSV export
- saved report views
- global time reports across workspaces
- global leave reports across workspaces

Reports can be manually reviewed before posting, which helps avoid noisy or incorrect channel output.

Weekly report automation follows the workspace working calendar and runs on the workspace's last working day.

---

## Architecture

Campfire is a standard Mattermost plugin with a Go server and React webapp.

```text
campfire/
├── plugin.json              # Mattermost plugin manifest
├── server/                  # Go plugin backend
├── webapp/                  # React + TypeScript frontend
├── assets/                  # Plugin assets and logo
├── Makefile                 # Build, check, and bundle commands
└── .github/workflows/       # CI and release automation
```

### Backend

The backend is written in Go and handles:

- Mattermost plugin lifecycle
- HTTP API routes
- database access and migrations
- workspace configuration
- workspace timezone and generated-message language settings
- standup submission storage
- task/time/leave logic
- leave approval, deletion, and change-request rules
- scheduled reminders
- working-calendar runtime decisions
- report generation
- audit logging

### Frontend

The webapp is built with React and TypeScript.

The UI uses shared Campfire components for:

- inputs
- selects
- date pickers
- time pickers
- channel/user pickers
- question cards
- report panels
- layout sections
- title cards and data cards
- bidi-safe text rendering

The UI is intentionally component-driven so behavior, typography, RTL handling, and styling stay consistent across pages.

---

## Build from source

For local validation:

```bash
make bundle-check
```

For a production plugin bundle:

```bash
make bundle
```

The final Mattermost plugin bundle is written to:

```text
dist/
```

---

## Release artifacts

GitHub Releases provide installable Campfire plugin bundles.

The release bundle includes:

- `plugin.json`
- server binaries
- webapp build output
- assets
- migrations embedded in the server package

The release workflow is tag-based and publishes the generated `.tar.gz` bundle as a GitHub Release asset.

---

## Data and privacy

Campfire is self-hosted inside Mattermost.

It stores operational workspace data such as:

- standup answers
- generated tasks
- time entries
- leave requests
- leave decisions and change requests
- reminder/report settings
- timezone and generated-message language settings
- role assignments
- audit entries

Campfire does not require an external SaaS service to operate.

---

## Status

The current focus is stability, predictable team workflows, clean Mattermost-native reporting, consistent multilingual UI, and reliable workspace-specific automation.
