# RISE Research — Lead Management Platform

A full-stack web application for B2D (Business Development) research, lead collection, and email data management. Built for the RISE Research team to capture company and contact data, search and edit records, and clean email lists using built-in utility tools.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Pages & Features](#pages--features)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Utility Tools](#utility-tools)
- [Input & File Format Requirements](#input--file-format-requirements)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

RISE Research is used by the BD team to:

- **Collect leads** — Add companies and their points of contact (POCs) directly from the dashboard
- **Search & edit records** — Find any company or contact and update their details
- **Clean email lists** — Use built-in tools to remove inactive emails, find duplicates, and eliminate overlap between files

All company and contact data is stored in **Airtable**. The app acts as a custom frontend and backend layer on top of Airtable's REST API.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Routing | React Router v6 |
| Backend | FastAPI (Python 3) + Uvicorn |
| Database | Airtable (cloud) |
| HTTP Client | httpx (async, for Airtable API calls) |
| File Parsing | pandas, openpyxl, xlrd |
| Styling | Custom CSS with CSS variables |
| Deployment | Vercel (frontend + serverless API) |
| Dev Runner | concurrently (runs API + Vite in one command) |

---

## Project Structure

```
opendb/
├── api/
│   └── index.py              # Main FastAPI application (all backend routes)
├── src/
│   ├── main.tsx              # React app entry point
│   ├── App.tsx               # React Router setup
│   ├── index.css             # Global styles and CSS variables
│   ├── utils.ts              # Shared utilities (CSV download helper, etc.)
│   ├── data/
│   │   └── geoData.ts        # Country and state data for selectors
│   ├── components/
│   │   ├── Navbar.tsx        # Top navigation bar
│   │   ├── Layout.tsx        # Page layout wrapper
│   │   ├── AddLeadModal.tsx  # Slot-based modal for adding companies + POCs
│   │   ├── UploadZone.tsx    # Drag-and-drop file upload component
│   │   ├── CountryStateFields.tsx  # Country/state selector
│   │   └── Icons.tsx         # SVG icon library
│   └── pages/
│       ├── Login.tsx                 # Login page
│       ├── SearchDashboard.tsx       # Main search and lead management page
│       ├── CompanyPage.tsx           # Company detail and edit view
│       ├── ToolSuite.tsx             # Tool suite landing page
│       ├── DeleteListGenerator.tsx   # Email dump cleanup tool
│       ├── DuplicateFinder.tsx       # Duplicate email/company detection tool
│       └── OverlapChecker.tsx        # Email overlap removal tool
├── public/                   # Static public assets
├── uploads/                  # Temporary server-side file storage
├── .env                      # Environment variables (not committed)
├── .env.example              # Environment variable template
├── package.json              # NPM dependencies and scripts
├── vite.config.ts            # Vite configuration (API proxy)
├── tsconfig.json             # TypeScript configuration
├── vercel.json               # Vercel deployment configuration
└── requirements.txt          # Python dependencies
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **Python** 3.11 or higher
- A Python virtual environment (`.venv`)
- An Airtable account with the configured bases (see [Environment Variables](#environment-variables))

### 1. Clone the repository

```bash
git clone <repo-url>
cd opendb
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Set up the Python virtual environment

```bash
python -m venv .venv
```

Activate it:

- **Windows:** `.venv\Scripts\activate`
- **Mac/Linux:** `source .venv/bin/activate`

### 4. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 5. Set up environment variables

Copy `.env.example` to `.env` and fill in your Airtable tokens:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) for what each value means.

---

## Environment Variables

Create a `.env` file in the project root with the following:

```env
AIRTABLE_WRITE_TOKEN=your_write_token_here
AIRTABLE_READ_TOKEN=your_read_token_here
LEAD_COLLECTION_BASE_ID=appI5BT69o10EAmY5
CONTACTS_DATABASE_BASE_ID=appNF0vZQGLNucTck
```

| Variable | Description |
|---|---|
| `AIRTABLE_WRITE_TOKEN` | Airtable PAT with create/update/delete scopes |
| `AIRTABLE_READ_TOKEN` | Airtable PAT with read-only scope |
| `LEAD_COLLECTION_BASE_ID` | Base ID for the Companies and Contacts tables |
| `CONTACTS_DATABASE_BASE_ID` | Base ID for the Team (authentication) table |

> Never commit `.env` to git. It is already listed in `.gitignore`.

---

## Running the App

### Development (recommended)

This single command starts both the FastAPI backend (port 8000) and the Vite dev server concurrently:

```bash
npm run dev
```

The terminal will show two labeled streams:
- `[api]` — FastAPI/Uvicorn output
- `[web]` — Vite dev server output

Open your browser at: **http://localhost:5173**

The Vite dev server proxies all `/api/` requests to `http://localhost:8000`, so you don't need to worry about CORS during development.

### Other scripts

| Script | Description |
|---|---|
| `npm run dev` | Run backend + frontend in parallel |
| `npm run build` | Build the React app for production |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run TypeScript type checking without emitting |

---

## Pages & Features

### Login — `/`

Simple email + password login. Credentials are validated against the **Team table** in Airtable. On success, the user object is stored in `localStorage` and the user is redirected to the dashboard.

No registration flow — accounts must be added directly to the Team table in Airtable.

---

### Search Dashboard — `/dashboard`

The main working screen. Includes:

- **Search bar** — Search companies and contacts by name, email, phone, or ID. Results appear as cards with the company name, country, qualification, and a list of associated contacts.
- **Add Lead button** — Opens the AddLead modal (see below).
- **Company cards** — Each result card shows the company's key details. Click a card to open the full company page.

#### Adding a Lead (AddLead Modal)

A slot-based form with two sections:

**Company Details:**
- Company Name (required)
- Country + State (with geo selectors)
- Website
- Qualification: `Small`, `MSME`, or `Enterprise`
- Notes

**Points of Contact (POCs):**
- Up to multiple POC slots, each with:
  - Name
  - Position
  - Work Email (validated)
  - Personal Email (optional)
  - Phone Number (validated)
  - Tags: `IECA`, `HECA`, `NACAC`, `WACAC`, `School`, `Community`, `Homeschool`

On submit, the app creates a Company record and all POC records in Airtable, with contacts linked to the company via `CompanyID`.

---

### Company Page — `/company/:companyId`

Full detail view for a single company. Shows:

- All company fields (editable inline)
- All associated contacts (editable inline)
- Each field can be clicked to edit and saved individually

---

### Tool Suite — `/tool-suite`

Landing page for the utility tools. Links to:
- Delete List Generator
- Duplicate Finder
- Overlap Checker

---

## Database Schema

All data is in **Airtable**. There are two bases:

### Lead Collection Base (`appI5BT69o10EAmY5`)

**Companies Table** (`tblPe818m70QqzOJX`)

| Field | Type | Notes |
|---|---|---|
| CompanyID | Text | Auto-assigned (format: `COMP0001`) |
| Company Name | Text | Required |
| Country | Text | From geo selector |
| State | Text | From geo selector |
| Website | URL | |
| Qualification | Single select | `Small`, `MSME`, `Enterprise` |
| CreatedBy | Text | Logged-in user's name |
| Notes | Long text | |

**Contacts Table** (`tbls0ScSnuZUNe9UV`)

| Field | Type | Notes |
|---|---|---|
| ContactID | Text | Auto-assigned (format: `CON0001`) |
| Name | Text | |
| Email | Email | Work email |
| Email FNAME | Text | Auto-extracted from email prefix |
| Personal Email | Email | Optional |
| Phone Number | Text | |
| Position | Text | |
| Tags | Multi-select | `IECA`, `HECA`, `NACAC`, `WACAC`, `School`, `Community`, `Homeschool` |
| CompanyID | Text | Links contact to a company |

---

### Contacts Database (`appNF0vZQGLNucTck`)

**Team Table** (`tbltkz5mwNDjR3a6w`) — Used for authentication only.

| Field | Type |
|---|---|
| Employee ID | Text |
| Name | Text |
| Email | Email |
| Password | Text |
| Working Status | Single select |
| Employee Type | Single select |
| Employee Level | Single select |
| Phone Number | Text |

---

## API Reference

All routes are prefixed with `/api/`. In development, Vite proxies these to `http://localhost:8000`.

### Authentication

#### `POST /api/login`

Validates credentials against the Team table.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response (success):**
```json
{
  "success": true,
  "user": {
    "id": "recXXXXXX",
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

---

### Lead Management

#### `POST /api/add-lead`

Creates a new company record and one or more contact records. Contacts are linked to the company via `CompanyID`.

**Request body:**
```json
{
  "company": {
    "name": "Acme Corp",
    "country": "United States",
    "state": "California",
    "website": "https://acme.com",
    "qualification": "Enterprise",
    "notes": "Found via LinkedIn"
  },
  "pocs": [
    {
      "name": "Jane Smith",
      "email": "jane@acme.com",
      "personalEmail": "jane@gmail.com",
      "phone": "+1 555 123 4567",
      "position": "Director of Admissions",
      "tags": ["NACAC"]
    }
  ],
  "createdBy": "John Doe"
}
```

---

#### `GET /api/search-leads?q=<query>`

Searches companies and contacts. Matches against: company name, contact name, email, phone, CompanyID, ContactID.

Returns an array of company objects, each with their associated contacts.

---

#### `GET /api/company/{company_id}`

Returns full details for one company and all its linked contacts.

---

#### `POST /api/update-company/{company_id}`

Updates one or more fields on a company record.

**Request body:** Any subset of company fields as key-value pairs.

---

#### `POST /api/update-contact/{contact_id}`

Updates one or more fields on a contact record.

**Request body:** Any subset of contact fields as key-value pairs.

---

### Utility Tools

#### `POST /api/upload`

**Delete List Generator.** Accepts one or more CSV/XLSX files. Processes them to find emails that appear in 3 or more files with zero total opens.

- **Form field:** `files` (multipart, multiple files)
- **Returns:** JSON with count of flagged emails + a download link

#### `GET /api/download`

Downloads the generated `delete_list.csv`.

#### `POST /api/duplicate-email-finder`

**Duplicate Finder.** Accepts one or more CSV/XLSX files and a duplicate type.

- **Form field:** `files` (multipart, multiple files)
- **Form field:** `duplicate_type` — one of `email`, `company`, `fullname`
- **Returns:** JSON with count of duplicate groups + a download link

#### `POST /api/overlap-checker`

**Overlap Checker.** Accepts exactly two files. Returns a cleaned version of file 1 with emails that exist in file 2 removed.

- **Form field:** `file1` — your main list
- **Form field:** `file2` — the list to check against
- **Returns:** JSON with removed count + cleaned file download

#### `POST /api/clear-uploads`

Clears the server-side `uploads/` folder.

---

## Utility Tools

### Delete List Generator

**Purpose:** Given one or more email dump files, identify emails that should be removed from your mailing list because they are disengaged.

**Logic:** An email is flagged for deletion if it appears in **3 or more separate files** with a **total opens count of 0** across all files.

**How to use:**
1. Navigate to Tool Suite > Delete List Generator
2. Upload one or more CSV/XLSX files — each file must have:
   - `Email` column
   - `Opens` column (numeric)
3. Click Process
4. Download `delete_list.csv`

**Output:** `delete_list.csv` — a single-column file with all flagged email addresses.

---

### Duplicate Finder

**Purpose:** Find duplicate entries across one or more contact files. Useful for deduplicating before sending campaigns or importing into a CRM.

**Grouping modes:**
- **By Email** — Groups records that share the same email address
- **By Company** — Groups records from the same company
- **By Full Name** — Groups records with the same full name

**How to use:**
1. Navigate to Tool Suite > Duplicate Finder
2. Upload one or more CSV/XLSX files — each file must have at least an `email` column. `first_name`, `last_name`, and `company` are optional but improve grouping accuracy.
3. Select a grouping mode
4. Click Find Duplicates
5. Download the results

**Output files:**
| File | Grouped by | Columns |
|---|---|---|
| `duplicate_emails.csv` | Email | Full Name, Company Name, Count, Emails |
| `common_company.csv` | Company | Company Name, Full Name(s), Count, Emails |
| `common_fullname.csv` | Full Name | Full Name, Company Name(s), Count, Emails |

---

### Overlap Checker

**Purpose:** Remove contacts from your main list that already exist in another list. Prevents sending duplicate outreach.

**How to use:**
1. Navigate to Tool Suite > Overlap Checker
2. Upload **File 1** — your main outreach list
3. Upload **File 2** — the list to check against (e.g. previously contacted)
4. Click Check Overlap
5. Download the cleaned version of File 1 (with matching emails removed)

**Input requirements:**
- Both files must be CSV or XLSX
- Both files must have an `email` column
- Matching is case-insensitive

---

## Input & File Format Requirements

All upload tools accept `.csv` and `.xlsx` files. Column names are **case-insensitive** and surrounding whitespace is trimmed automatically.

| Tool | Required Columns | Optional Columns |
|---|---|---|
| Delete List Generator | `email`, `opens` | — |
| Duplicate Finder | `email` | `first_name`, `last_name`, `company` |
| Overlap Checker | `email` | — |

---

## Deployment

The app is deployed on **Vercel**.

### How it works

- The React frontend is built with `vite build` and served as a static site
- The FastAPI backend runs as a **Vercel Serverless Function** via `api/index.py`
- `vercel.json` configures build output, SPA routing rewrites, and API routing

### Deploy

```bash
vercel --prod
```

Or push to the `main` branch if connected to Vercel via GitHub.

### `vercel.json` summary

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.py" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Troubleshooting

**App won't start / Python errors on `npm run dev`**

Make sure you have created and activated the `.venv` virtual environment and installed requirements:
```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

**`ModuleNotFoundError` for `python-multipart`**

Run `pip install -r requirements.txt` inside the activated virtual environment.

**Airtable calls returning 401 or 403**

Check that `AIRTABLE_WRITE_TOKEN` and `AIRTABLE_READ_TOKEN` in your `.env` are valid and have the correct scopes. Tokens must have `data.records:read` and `data.records:write` on the relevant bases.

**Login fails even with correct credentials**

The Team table is in a separate Airtable base (`CONTACTS_DATABASE_BASE_ID`). Make sure your read token has access to that base, not just the Lead Collection base.

**File upload fails**

- Confirm the file is `.csv` or `.xlsx` — no other formats are accepted
- Check that the required column names are present (case-insensitive)
- Check the terminal running uvicorn for detailed error output

**Changes in Airtable not showing up**

The app reads from Airtable on each request. There is no local cache. If data looks stale, hard refresh the browser page.

**TypeScript errors**

Run `npm run typecheck` to see all type errors. Fix before building for production.

**Vercel deployment failing**

Check that all environment variables (`AIRTABLE_WRITE_TOKEN`, `AIRTABLE_READ_TOKEN`, `LEAD_COLLECTION_BASE_ID`, `CONTACTS_DATABASE_BASE_ID`) are set in the Vercel project settings under Environment Variables.
