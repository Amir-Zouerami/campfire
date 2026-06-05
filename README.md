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
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-f0a85a?style=for-the-badge" />
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
- [Screens and workflows](#screens-and-workflows)
- [Persian and regional support](#persian-and-regional-support)
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
- 🗓️ working calendars and off-days
- 🌐 Persian calendar display and Persian/Arabic-friendly inputs

Campfire is designed for teams that want the structure of a lightweight operations dashboard without moving work discussion out of Mattermost.

---

## Who it is for

Campfire is useful for:

- engineering teams running async standups
- remote or hybrid teams
- operations teams that need simple leave visibility
- team leads who need daily missing/blocker reports
- organizations using Mattermost as their primary internal workspace
- Persian-speaking or mixed-language teams that need better RTL/Persian support

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
- inspect runtime decisions around standups and reminders

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
- task creation from answers

Templates can be daily or weekly and can be attached to schedules.

---

### 🌴 Leave and availability

Campfire includes a lightweight leave workflow:

- users request leave
- approvers review requests
- approved leave is reflected in availability screens
- missing-standup logic skips approved leave users
- approved leave announcements can be posted to a configured channel

---

### 🗓️ Working calendar

Admins can define the workspace rhythm.

Campfire supports:

- Monday to Friday teams
- Saturday to Wednesday teams
- Saturday to Thursday teams
- custom working-day patterns
- workspace off-days
- global off-days

These settings affect reminders, standup availability, and weekly report timing.

---

## Screens and workflows

Campfire is organized around four primary areas:

| Area            | Purpose                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| **My Day**      | Personal standup, tasks, time, and leave                                 |
| **Team Review** | Team submissions, availability, approvals, and runtime state             |
| **Reports**     | Markdown previews, CSV exports, saved filters, and report posting        |
| **Settings**    | Roles, calendar, forms, reminders, report rules, audit log, and off-days |

The UI is built as a focused full-screen workspace inside Mattermost, with dark styling, compact navigation, and reusable form controls.

---

## Persian and regional support

Campfire includes first-class support for Persian/Arabic-heavy workflows:

- Persian calendar display beside Gregorian dates
- Vazirmatn/Vazir font support inside Campfire UI controls
- bidi-safe rendering for mixed Persian and English text
- RTL-aware question and option rendering
- Persian-friendly standup questions, labels, and user-entered answers

This support is scoped to the Campfire UI and does not modify normal Mattermost channel messages outside the plugin.

---

## Installation

1. Go to the latest GitHub Release.
2. Download the Campfire plugin `.tar.gz` bundle.
3. In Mattermost, open **System Console → Plugin Management**.
4. Upload the plugin bundle.
5. Enable the plugin.
6. Open the Campfire workspace from the plugin entry point.
7. Configure roles, working days, forms, schedules, reminders, and reports.

Campfire is intended for self-hosted Mattermost deployments where plugin uploads are enabled.

---

## Configuration overview

After installation, configure Campfire from **Settings**.

Recommended setup order:

1. **Overview**  
   Confirm workspace identity, channel context, and timezone.

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

7. **Report Rules**  
   Choose sorting, report language, blocker behavior, and posting rules.

8. **Global Off-days**  
   Add organization-wide holidays or no-standup dates.

---

## Permissions and roles

Campfire uses workspace-specific roles.

Typical roles:

| Role         | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| **Member**   | Submit standups, manage personal tasks/time/leave               |
| **Lead**     | Review submissions, missing users, availability, and team state |
| **Approver** | Approve or reject leave requests                                |
| **Viewer**   | View reports and dashboards without changing settings           |
| **Admin**    | Configure workspace rules, schedules, forms, and access         |

Campfire can also inherit access from Mattermost roles depending on backend settings, such as channel admins or system admins. The current UI displays inherited access behavior; changing those inherited rules requires backend/settings support.

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

Reports can be manually reviewed before posting, which helps avoid noisy or incorrect channel output.

---

## Architecture

Campfire is a standard Mattermost plugin with a Go server and React webapp.

```text
campfire/
├── plugin.json              # Mattermost plugin manifest
├── server/                  # Go plugin backend
├── webapp/                  # React + TypeScript frontend
├── assets/                  # Plugin assets and logo
├── migrations/              # Database migrations
├── Makefile                 # Build, check, and bundle commands
└── .github/workflows/       # CI and release automation
```

### Backend

The backend is written in Go and handles:

- Mattermost plugin lifecycle
- HTTP API routes
- database access
- workspace configuration
- standup submission storage
- task/time/leave logic
- scheduled reminders
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
- bidi-safe text rendering

The UI is intentionally component-driven so behavior and styling stay consistent across pages.

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
- migrations

The release workflow is tag-based and publishes the generated `.tar.gz` bundle as a GitHub Release asset.

---

## Data and privacy

Campfire is self-hosted inside Mattermost.

It stores operational workspace data such as:

- standup answers
- generated tasks
- time entries
- leave requests
- reminder/report settings
- role assignments
- audit entries

Campfire does not require an external SaaS service to operate.

---

## Status

Campfire is released as **v1.0.0**.

The current focus is stability, predictable team workflows, and clean Mattermost-native reporting.