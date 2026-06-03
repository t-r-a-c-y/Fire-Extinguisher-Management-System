# User Manual — Fire Extinguisher Management System

This manual covers day-to-day use of the FEMS web application.

## 1. Roles

| Role | Can do |
|---|---|
| **Admin** | Everything: manage users, manage extinguishers, schedule & complete inspections, log maintenance, view all reports, send notifications |
| **Inspector** | Update extinguishers (cannot add/delete), conduct & complete inspections, log maintenance, schedule inspections, view reports |
| **User** | View extinguisher status, schedule inspections, view inspection history & reports |

## 2. Getting started

### Register
1. Open the app (`http://localhost:3000`).
2. Click **Register**.
3. Enter First name, Last name, Email and a password (min 8 chars incl. a letter and a number).
4. New self-registered accounts get the **user** role. An admin can elevate you to inspector/admin.

### Log in
1. Click **Login**, enter your email and password.
2. On success you land on the **Dashboard**.

### Demo accounts
| Email | Password | Role |
|---|---|---|
| `admin@tzw.com` | `Password123!` | admin |
| `inspector@tzw.com` | `Password123!` | inspector |
| `user@tzw.com` | `Password123!` | user |

### Forgot password
1. On the Login page click **Forgot password**.
2. Enter your email; a reset token is issued (shown on screen in the demo).
3. Paste the token and set a new password.

## 3. Dashboard (role-scoped)

Shows live KPIs:
- Total extinguishers and breakdown by status/type.
- Inspection counts: **pending / completed / overdue**.
- Compliance: **% compliant**, **expired**, **upcoming expirations**.
- Recent maintenance activity.

**What you see depends on your role:**
- **Admin / Inspector** — figures for the **whole system**.
- **User** — only **your own** activity (extinguishers you added, inspections
  you scheduled). A brand-new user sees all zeros until they add something.

> Tip: use the 🌙 / ☀️ button in the top bar to switch between **light and dark
> mode** (your choice is remembered). On small screens, tap the **☰** icon to
> open the sidebar.

## 4. Fire extinguishers

- **List** — search by serial/location, filter by status or type.
- **View details** — click a serial number (or **View**) to open its detail page
  with full information plus its **inspection and maintenance history**, including
  the **inspector's notes/result**.
- **Add** (**admin only** — inspectors cannot add) — Serial number, Location,
  Type (Water/CO₂/Foam/Dry Chemical), Size (2.5/5/9/12 lb), Installation date,
  Expiry date, Status.
- **Edit** (admin/inspector) — update any field.
- **Delete** (admin) — a confirmation dialog asks you to confirm.

### Date rules (enforced)
- **Installation date** cannot be in the future.
- **Expiry date must be after the installation date.** If it is on/before the
  installation date the record is rejected with a clear message.
- **Inspection date** cannot be in the past.

### Requesting help (any user)
On an extinguisher's detail page, click **Send a request** to notify admins and
inspectors — e.g. *ask them to update the details/location*, *request an
inspection*, or *request the purchase of a similar unit*.

## 5. Inspections

- **Schedule** — pick an extinguisher, choose date & time, optionally assign an
  inspector. The assigned inspector receives a notification.
- **List/filter** — by status (pending/completed/overdue/cancelled), extinguisher, inspector.
- **Complete** (admin/inspector) — record a result: **pass**, **fail**, or
  **needs maintenance**. A "needs maintenance" result moves the extinguisher to
  `maintenance` status; otherwise it returns to `active`.

## 6. Maintenance

- **Log maintenance** (admin/inspector) — choose the extinguisher (and optionally
  the related inspection), record Action taken, Date, Issues identified, Notes,
  and Recommendations.
- **History** — view all maintenance records, filterable by extinguisher and date.

## 7. Reports

Four report types, each viewable on screen and exportable to **PDF** or **CSV**:

- **Inventory** — totals; breakdown by status/type/size; daily/monthly/yearly summaries.
- **Inspections** — pending, completed, overdue.
- **Compliance** — expired units, upcoming expirations, overall compliance %.
- **Maintenance** — full history, frequency per unit, recent activity.

Click **Export PDF** or **Export CSV** on any report.

## 8. Notifications

- The **bell icon** shows a quick dropdown of recent unread notifications.
- The dedicated **Notifications page** (sidebar → Notifications) lists everything,
  with an **All / Unread** filter, **Mark read** per item, and **Mark all read**.
- Notifications are generated automatically when you **create / update / delete**
  an extinguisher, **schedule or complete** an inspection, **log maintenance**,
  and when a user **sends a request**.

## 9. Profile

From the user menu:
- **View / edit profile** (name, email).
- **Change password** (requires current password).
- **Logout** (revokes your refresh token).

## 10. Tips

- Overdue inspections are computed automatically: a pending inspection whose
  scheduled date has passed becomes **overdue**.
- Expired extinguishers appear in the Compliance report and drive the dashboard
  compliance percentage.
