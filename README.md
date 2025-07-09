[![Total LOC](https://img.shields.io/badge/Total-12511-blue?style=flat&color=purple)](https://lineup-github.vercel.app) [![TypeScript LOC](https://img.shields.io/badge/TypeScript-11804-blue?style=flat&color=purple)](https://lineup-github.vercel.app) [![JSON LOC](https://img.shields.io/badge/JSON-125-blue?style=flat&color=purple)](https://lineup-github.vercel.app) [![JavaScript LOC](https://img.shields.io/badge/JavaScript-83-blue?style=flat&color=purple)](https://lineup-github.vercel.app) [![Markdown LOC](https://img.shields.io/badge/Markdown-371-blue?style=flat&color=purple)](https://lineup-github.vercel.app) [![CSS LOC](https://img.shields.io/badge/CSS-85-blue?style=flat&color=purple)](https://lineup-github.vercel.app) [![Nix LOC](https://img.shields.io/badge/Nix-43-blue?style=flat&color=purple)](https://lineup-github.vercel.app)

# MyRobocon Portal - User & Technical Guide

Welcome to the MyRobocon Portal! This document serves as a comprehensive guide to understanding, running, managing, and extending the portal.

## Table of Contents

1.  [Overview](#overview)
2.  [Tech Stack](#tech-stack)
3.  [Project Structure](#project-structure)
4.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Installation](#installation)
    *   [Encryption Setup (MANDATORY)](#encryption-setup-mandatory)
    *   [Environment Configuration](#environment-configuration)
    *   [Configuring Email (SMTP)](#configuring-email-smtp)
    *   [Running in Development](#running-in-development)
    *   [Building for Production](#building-for-production)
    *   [Running in Production](#running-in-production)
5.  [Core Concepts](#core-concepts)
    *   [Data Management (.data directory)](#data-management-data-directory)
    *   [Server Actions](#server-actions)
    *   [Authentication](#authentication)
    *   [Routing and Layouts](#routing-and-layouts)
    *   [UI Components and Styling](#ui-components-and-styling)
    *   [Theming](#theming)
    *   [Notifications](#notifications)
6.  [Portal Features](#portal-features)
    *   [Admin Portal](#admin-portal)
        *   [Admin Dashboard](#admin-dashboard)
        *   [Team Management](#team-management)
        *   [User Management](#user-management)
        *   [Resource Management](#resource-management)
        *   [Announcement Management](#announcement-management)
        *   [Progress Review Management](#progress-review-management)
        *   [Email Campaign Management](#email-campaign-management)
        *   [Send Notification Page](#send-notification-page)
        *   [Site Settings](#site-settings)
    *   [Participant Portal](#participant-portal)
        *   [My Team Page](#my-team-page)
        *   [Team Progress Page](#team-progress-page)
        *   [Notification Center (Header)](#notification-center-header)
7.  [API Endpoints](#api-endpoints)
    *   [Announcements API (`/api/announcements`)](#announcements-api-apiannouncements)
    *   [Team & User Import API (`/api/v1/import/team-and-users`)](#team--user-import-api-apiv1importteam-and-users)
    *   [Dashboard API Endpoints (`/api/v1/dashboard/*`)](#dashboard-api-endpoints-apiv1dashboard)
    *   [Adding New API Routes](#adding-new-api-routes)
8.  [Data Recovery](#data-recovery)
    *   [Decrypting a Value](#decrypting-a-value)
9.  [Self-Hosting](#self-hosting)
10.  [Customization and Extension](#customization-and-extension)
    *   [Adding New Pages](#adding-new-pages)
    *   [Modifying Components](#modifying-components)
    *   [Extending Data Models](#extending-data-models)
11. [Troubleshooting](#troubleshooting)

## 1. Overview

The MyRobocon Portal is a web application designed to manage participants, teams, resources, announcements, and team progress for a Robocon-style competition. It provides separate interfaces for administrators and participants.

**Key Features:**
*   User authentication with distinct roles (admin, participant).
*   Management dashboards for teams, users, resources, and announcements.
*   Participant-specific views for team information, resources, progress submissions, and notifications.
*   Admin interface for reviewing team progress, awarding points, providing feedback, sending manual notifications, and managing bulk email campaigns.
*   Site branding, theme customization, configurable team progress point quotas, and SMTP email settings.
*   Admin-managed API keys for external integrations.
*   **Encrypted file-based data storage** for enhanced security and easy portability.
*   Extensible with Next.js API routes for features like announcements and external system integration (e.g., team import, dashboard data).
*   In-app notification system for users.
*   The portal can act as a centralized **SSO (Single Sign-On) provider** for other applications, using OAuth 2.0.
*   Advanced email automation with **templates, triggers, and scheduling**.
*   **Passkey support** for secure, passwordless authentication.

## 2. Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **UI Library:** [React](https://react.dev/)
*   **Component Library:** [ShadCN UI](https://ui.shadcn.com/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Authentication:** `oidc-provider` (for SSO), `@simplewebauthn/server` (for passkeys)
*   **Email:** [Nodemailer](https://nodemailer.com/)
*   **Language:** TypeScript
*   **Data Storage:** Encrypted local JSON files (managed via server actions)

## 3. Project Structure

```
.
├── .data/                  # Persisted application data (JSON files) - Created at runtime
├── .vscode/                # VS Code settings
├── public/                 # Static assets (e.g., favicon)
├── scripts/
│   ├── generate-secret.js  # Helper script for creating the encryption key
│   └── decrypt-value.js    # Helper script for decrypting a value
├── src/
│   ├── actions/            # Server Actions for data manipulation
│   ├── app/                # Next.js App Router: pages, layouts, API routes
│   │   ├── (admin)/        # Admin-specific routes and layout
│   │   │   └── admin/
│   │   │       ├── announcements/
│   │   │       ├── email/          # Admin page for sending email campaigns
│   │   │       ├── notifications/  # Admin page for sending manual notifications
│   │   │       ├── progress-review/
│   │   │       ├── resources/
│   │   │       ├── settings/
│   │   │       ├── teams/
│   │   │       └── users/
│   │   ├── (participant)/  # Participant-specific routes and layout
│   │   │   ├── my-team/
│   │   │   └── progress/
│   │   ├── api/            # API routes
│   │   │   ├── announcements/
│   │   │   ├── passkeys/       # Endpoints for WebAuthn/Passkey ceremonies
│   │   │   └── v1/
│   │   │       ├── dashboard/      # Endpoints for external dashboards
│   │   │       │   ├── progress-submissions/
│   │   │       │   ├── stats/
│   │   │       │   └── teams/
│   │   │       └── import/
│   │   │           └── team-and-users/ # API for external team/user import
│   │   ├── globals.css     # Global styles and Tailwind directives
│   │   ├── layout.tsx      # Root layout
│   │   ├── login/          # Login page
│   │   └── page.tsx        # Root page (handles redirection)
│   ├── components/         # Reusable React components
│   │   └── ui/             # ShadCN UI components
│   ├── contexts/           # React Context providers (Auth, Settings)
│   ├── hooks/              # Custom React Hooks
│   ├── lib/                # Utility functions, type definitions, file utils
│   └── services/           # Business logic services (e.g., email)
├── components.json         # ShadCN UI configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Project dependencies and scripts
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## 4. Getting Started

### Prerequisites
*   Node.js (v18 or later recommended)
*   npm or yarn

### Installation
1.  Clone the repository:
    ```bash
    git clone <repository_url>
    cd <project_directory>
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    # yarn install
    ```

### Encryption Setup (MANDATORY)
The application uses strong encryption to protect sensitive data (passwords, API keys, etc.) stored in the `.data` directory. To run the application, you **must** generate a secret encryption key.

1.  **Generate the Key**: Run the following command in your terminal:
    ```bash
    npm run setup:encrypt
    ```
    This will generate a secure, random key and display a line like this:
    `ENCRYPTION_SECRET=a1b2c3d4e5f6...`

2.  **Create `.env.local` file**: In the root of your project directory, create a new file named `.env.local`.

3.  **Add the Key**: Copy the entire `ENCRYPTION_SECRET=...` line from the terminal and paste it into your new `.env.local` file.

**IMPORTANT**:
*   The `ENCRYPTION_SECRET` is vital. If you lose it, all encrypted data will become permanently unreadable. Back it up securely.
*   Do **NOT** commit your `.env.local` file to version control.

### Environment Configuration
For features like Passkeys and SSO to work correctly, the application needs to know its own public URL. This is also configured in your `.env.local` file.

1.  Open your `.env.local` file (the same one where you added the encryption secret).
2.  Add the following line, replacing the URL with the one for your development or production environment:
    ```
    OIDC_ISSUER=https://your-public-url.com
    ```
    For example, in a Google Cloud Workstation, this would be your workstation's URL. For local development on your own machine, you can use `http://localhost:9002`. If this variable is not set, it will default to `http://localhost:9002`.

### Configuring Email (SMTP)
To use the email campaign feature, you must configure your SMTP service credentials. This is done directly within the application's admin interface for security and ease of management.

1.  Run the application (`npm run dev`) and log in as an administrator.
2.  Navigate to **Site Settings** from the sidebar.
3.  Find the **SMTP Email Settings** card.
4.  Enter your SMTP server details:
    *   **SMTP Host**: The hostname of your SMTP server (e.g., `smtp.office365.com`).
    *   **SMTP Port**: The port number (e.g., `587` for TLS, or `465` for SSL).
    *   **SMTP Username**: Your email address/username for the SMTP service.
    *   **SMTP Password**: Your password for the SMTP service. **Crucially**, for services like Outlook or Gmail, you must generate a special **"App Password"** from your account's security settings and use that here. Using your main account password may not work.
    *   **Sender Name**: The name that will appear in the "From" field of emails (e.g., "MyRobocon Portal Admin").
    *   **Sender Email**: The email address that will appear in the "From" field.
5.  Click **"Save All Settings"** at the bottom of the page. The credentials will be saved securely and encrypted in the `.data/settings.json` file.

### Running in Development
To start the development server:
```bash
npm run dev
```
This will typically start the app on `http://localhost:9002`.

### Building for Production
To create an optimized production build:
```bash
npm run build
```
This command compiles your Next.js application and outputs the build artifacts to the `.next` directory.

### Running in Production
After building, you can start the production server:
```bash
npm start
```
By default, this script is configured to attempt running on port 80 (`next start -p 80`). See the [Self-Hosting](#self-hosting) section for important considerations about running on port 80/443.

## 5. Core Concepts

### Data Management (`.data` directory)
The portal uses a simple file-based data storage system. All application data (users, teams, announcements, etc.) is stored as JSON files within the `.data` directory at the root of the project. This directory is created automatically if it doesn't exist.

**Sensitive data within these files (passwords, API keys, etc.) is encrypted using AES-256-GCM.**

**Key Data Files:**
*   `.data/users.json`: Stores user accounts and credentials.
*   `.data/teams.json`: Stores team information.
*   `.data/resources.json`: Stores resources for teams.
*   `.data/announcements.json`: Stores site announcements.
*   `.data/settings.json`: Stores site configuration like title, logo, theme, progress point quotas, API tokens, and SMTP credentials.
*   `.data/progress_submissions.json`: Stores team progress updates.
*   `.data/notifications.json`: Stores user notifications.
*   `.data/email_templates.json`: Stores reusable email templates.
*   `.data/scheduled_emails.json`: Stores emails that are scheduled to be sent.

**Note:** This file-based storage is suitable for single-instance deployments or development. For multi-instance or serverless deployments, consider migrating to a database.

### Server Actions
Data fetching and mutations are primarily handled using Next.js Server Actions. These are functions defined in `src/actions/*.ts`. They execute on the server and can be called directly from client components, simplifying data flow. They interact with the encrypted JSON data files via `src/lib/file-utils.ts`.

### Authentication
User authentication is managed through the `users.json` file.
*   **Credentials Check:** The `AuthContext` (`src/contexts/AuthContext.tsx`) handles login logic.
*   **Session Management:** Basic session management is handled by storing user information in `localStorage`.
*   **Roles:** Users can have "admin" or "participant" roles.
*   **Protected Routes:** `src/components/ProtectedRoute.tsx` ensures only authenticated users with the correct roles can access specific routes.
*   **Self-Service Password Change:** Users can change their own passwords via the user menu in the site header.
*   **Passkey Support (Passwordless Login):** The portal supports WebAuthn for highly secure, passwordless authentication. Any user can register multiple passkeys (e.g., Face ID, Windows Hello, fingerprint, YubiKey) to their account via the "Security & Passkeys" option in the user menu. Once a passkey is registered, they can use it for a fast and secure login experience. This is especially useful for teams, as multiple members can register their own device's passkey to a shared team account, eliminating the need to share passwords.

### Routing and Layouts
The portal uses the Next.js App Router.
*   **Admin Area:** Routes under `/admin` are protected and use the layout defined in `src/app/(admin)/layout.tsx`.
*   **Participant Area:** Routes under `/my-team` and `/progress` are for participants and use the layout from `src/app/(participant)/layout.tsx`.
*   **Login Page:** `src/app/login/page.tsx` is the entry point for authentication.
*   **Root Page:** `src/app/page.tsx` handles redirection based on authentication status.

### UI Components and Styling
*   **ShadCN UI:** Components are in `src/components/ui/`.
*   **Tailwind CSS:** Used for all styling.

### Theming
The portal supports multiple themes, managed in "Site Settings". The `ThemeProvider` from `next-themes` is used for light/dark mode toggling in the "Normal" theme.

### Notifications
User-specific notifications are generated for resource updates, progress status changes, or sent manually by admins. They appear in the site header.

## 6. Portal Features

### Admin Portal

#### Admin Dashboard (`/admin`)
*   Overview of key metrics: total teams, total resources.
*   Displays the latest active announcement.
*   Quick links to management sections.

#### Team Management (`/admin/teams`)
*   Full CRUD operations for teams.
*   CSV Import/Export.
*   Bulk actions for deleting teams or setting their banner image.

#### User Management (`/admin/users`)
*   Full CRUD for users.
*   Manual password setting for any user.
*   CSV Import/Export.
*   Bulk actions for deleting users or setting passwords.

#### Resource Management (`/admin/resources`)
*   Manage resources with content, links, and team assignments.

#### Announcement Management (`/admin/announcements`)
*   Manage site-wide announcements, including their content, type, and display location.

#### Progress Review Management (`/admin/progress-review`)
*   Review, comment on, and assign points to team progress submissions.
*   Approve or reject submissions, which affects team point totals.
*   Manage submitted images (download or clear data).

#### Email Campaign Management (`/admin/email`)
*   **Compose Email:** Paste raw HTML code for your email design and enter a subject line.
*   **Personalization Placeholders:** Use `{{name}}`, `{{teamName}}`, `{{schoolName}}` in the subject and HTML body.
*   **Preview:** Render a preview of the HTML before sending.
*   **Targeting:** Send emails to All Users, All Participants, All Admins, or a specific Team.
*   **Sending:** Uses the external SMTP service configured in **Site Settings**.
*   **Email Templates**: Create and manage reusable email templates for campaigns or automated notifications.
*   **Automated Email Triggers**: Emails are automatically sent when new users are created or when progress submissions are approved/rejected.
*   **Email Scheduling**: Schedule email campaigns to be sent at a future date and time. This requires an external service (like a cron job) to periodically call a specific API endpoint to trigger the send process.

#### Send Notification Page (`/admin/notifications`)
*   Compose and send manual in-app notifications to users or teams.

#### Site Settings (`/admin/settings`)
*   **Branding:** Customize site title, logo URL, login page hint, and footer text.
*   **SMTP Email Settings:** Configure the external email service used by the Email Campaign feature.
*   **Site Theme:** Select the active theme for the portal.
*   **Progress Quotas:** Set the "Max Progress Points Per Team".
*   **Site Access Modes:** Enable/disable Demo Mode (shows default credentials on login) or Maintenance Mode (blocks participant logins).
*   **API Token Management:** Create, view (masked), and delete API tokens used for external integrations.
*   **OAuth Application Management (SSO Provider)**: Register external applications that can use this portal for login.

### Participant Portal

#### My Team Page (`/my-team`)
*   Displays team information, assigned resources, and active announcements.
*   Participants can mark resources as read/unread.
*   Includes an "Account Security" card to guide users in setting up Passkeys for passwordless login.

#### Team Progress Page (`/progress`)
*   Submit progress updates with an image and description.
*   View submission history, points awarded, and admin feedback.
*   View a progress bar showing earned points against the team's quota.

#### Notification Center (Header)
*   A bell icon in the site header indicates new notifications.

## 7. API Endpoints

All API endpoints are authenticated using Bearer tokens. Valid tokens are managed by administrators on the "Site Settings" page.

### Announcements API (`/api/announcements`)
*   **Method:** `GET`, `POST`
*   **Auth:** Bearer token.
*   **`GET`:** Returns a list of all *active* announcements.
*   **`POST`:** Creates a new announcement.

### Team & User Import API (`/api/v1/import/team-and-users`)
*   **Method:** `POST`
*   **Path:** `/api/v1/import/team-and-users`
*   **Auth:** Bearer token.
*   **Purpose:** Allows an external system to programmatically create a new team and its users.
*   **Request Body (JSON):** See the route file `src/app/api/v1/import/team-and-users/route.ts` for the exact payload structure. It accepts `teamData`, `teamLeadUserData`, and `studentMemberData`.

### Dashboard API Endpoints (`/api/v1/dashboard/*`)
These endpoints are designed to provide data for external dashboards.

#### GET /api/v1/dashboard/stats
*   **Returns:** A JSON object with key statistics (total teams, users, submissions by status, etc.).

#### GET /api/v1/dashboard/teams
*   **Returns:** A JSON array of all teams (WiFi password is omitted).

#### GET /api/v1/dashboard/progress-submissions
*   **Returns:** A JSON array of all progress submissions.

### Adding New API Routes
Create new route handlers under `src/app/api/`. Implement authentication by loading API keys from settings and validating the Bearer token.

## 8. Data Recovery

### Decrypting a Value
If you ever need to manually decrypt a value from one of the `.data/*.json` files (e.g., a user's password for troubleshooting), you can use the built-in decryption script.

**Prerequisites:**
*   You must have command-line access to the server where the portal is running.
*   The `ENCRYPTION_SECRET` must be correctly set in the `.env.local` file.

**Usage:**
1.  Find the encrypted value in the JSON file. It will be a long string with `::` separators.
2.  Run the following command, replacing `<encrypted_string>` with the value you copied:
    ```bash
    npm run decrypt -- "<encrypted_string>"
    ```
    **Note:** It's important to wrap the encrypted string in quotes to prevent the shell from misinterpreting special characters.

3.  The script will print the decrypted, plaintext value to your console.

## 9. Self-Hosting
1.  **Build the app:** `npm run build`
2.  **Run the app:** `npm start`
3.  **Permissions:** Ensure the Node.js process has write permissions to the project's root directory to create and write to the `.data` folder.
4.  **Reverse Proxy (Recommended):** Use Nginx or Apache as a reverse proxy to handle traffic on ports 80/443 and forward it to the Next.js app running on an unprivileged port (e.g., 3000).
5.  **Process Manager:** Use a process manager like PM2 to keep the application running.

## 10. Customization and Extension

### Adding New Pages
*   Add new route segments under `src/app/(admin)/admin/` or `src/app/(participant)/`.
*   Update navigation links in `src/app/(admin)/layout.tsx` or `src/components/SiteHeader.tsx`.

### Modifying Components
*   ShadCN UI components are in `src/components/ui/`.
*   Custom application components are in `src/components/`.

### Extending Data Models
1.  Update the TypeScript interfaces in `src/lib/types.ts`.
2.  Update default data structures in `src/actions/*Actions.ts`.
3.  Update any UI components, forms, and server actions that interact with the modified data model.
4.  If modifying data files directly, ensure your application logic can handle older entries that might not have the new fields.

## 11. Troubleshooting
*   **Application Fails to Start (ENCRYPTION_SECRET error):** This is the most common error after setup. Ensure you have run `npm run setup:encrypt` and have correctly added the `ENCRYPTION_SECRET=...` line to a `.env.local` file in the project's root directory.
*   **Data Not Saving:** Check write permissions for the `.data` folder.
*   **Emails Not Sending:**
    *   Double-check your SMTP credentials in **Site Settings**.
    *   Ensure your SMTP provider (e.g., Outlook, Gmail) allows SMTP access. You may need to enable it.
    *   Verify you are using an "App Password" if your provider requires it.
    *   Check the terminal where your Next.js app is running for any error messages from Nodemailer.
*   **Passkey/SSO Errors:** Ensure the `OIDC_ISSUER` environment variable is set correctly in your `.env.local` file to match your public URL.
*   **Incorrect CSV Import:** Ensure your CSV file adheres strictly to the required headers and format.
*   **API Errors (401 Unauthorized):** Ensure the `Authorization: Bearer <token>` header is correctly sent. Verify the token exists and is correct in "Site Settings" > "API Token Management".
*   **Large Data Files:** For high usage, `progress_submissions.json` (with image data) can become large. Consider an external file storage solution or using the "Clear Image Data" feature in the progress review modal.
