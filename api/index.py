import io
import os
import pandas as pd
from typing import List, Optional, Union
from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="RISE Research API")

# Airtable configuration from environment variables
AIRTABLE_WRITE_TOKEN = os.getenv("AIRTABLE_WRITE_TOKEN")
AIRTABLE_READ_TOKEN = os.getenv("AIRTABLE_READ_TOKEN")

LEAD_COLLECTION_BASE_ID = os.getenv("LEAD_COLLECTION_BASE_ID", "appI5BT69o10EAmY5")
COMPANY_TABLE_ID = "tblPe818m70QqzOJX"
CONTACTS_TABLE_ID = "tbls0ScSnuZUNe9UV"

CONTACTS_DATABASE_BASE_ID = os.getenv("CONTACTS_DATABASE_BASE_ID", "appNF0vZQGLNucTck")
TEAM_TABLE_ID = "tbltkz5mwNDjR3a6w"


def _check_columns(filename: str, df: pd.DataFrame, required: List[str]) -> Optional[str]:
    """Return a human-readable error if any required columns are missing."""
    found = [str(c).strip().lower() for c in df.columns]
    missing = [c for c in required if c not in found]
    if not missing:
        return None
    found_display = ", ".join(f"'{c}'" for c in found[:10]) or "(none detected)"
    missing_display = ", ".join(f"'{c}'" for c in missing)
    return (
        f"'{filename}' is missing required column(s): {missing_display}. "
        f"Columns detected in your file: {found_display}."
    )


async def parse_upload(file: UploadFile) -> pd.DataFrame:
    """Read an uploaded CSV or XLSX file into a DataFrame."""
    content = await file.read()
    if not content:
        raise ValueError(f"'{file.filename}' is empty.")
    ext = os.path.splitext(file.filename or "")[1].lower()
    try:
        if ext in (".xlsx", ".xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = _read_csv_smart(content)
        if df.empty:
            raise ValueError(f"'{file.filename}' contains no data rows.")
        # Replace NaN with empty string so JSON never contains bare `NaN`
        return df.where(df.notna(), other="")
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Could not read '{file.filename}': {e}")


def _read_csv_smart(content: bytes) -> pd.DataFrame:
    """
    Parse a CSV that may have metadata/title rows before the real header
    (e.g. Google Ads, Search Console exports). Tries multiple encodings and
    auto-detects the first row that looks like a proper header.
    """
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = content.decode(encoding)
        except UnicodeDecodeError:
            continue

        lines = text.splitlines()
        if not lines:
            raise ValueError("File is empty.")

        # Detect delimiter by examining the first 20 lines
        # Pick the delimiter that produces the most consistent column count
        best_skiprows = 0
        best_sep = ","
        best_ncols = 0

        for sep in (",", "\t", ";"):
            col_counts = [len(line.split(sep)) for line in lines[:20] if line.strip()]
            if not col_counts:
                continue
            max_cols = max(col_counts)
            if max_cols <= best_ncols:
                continue
            # Find the first row that has that max column count — that's the header
            for i, line in enumerate(lines[:20]):
                if len(line.split(sep)) == max_cols:
                    best_skiprows = i
                    best_sep = sep
                    best_ncols = max_cols
                    break

        if best_ncols == 0:
            raise ValueError("Could not detect columns in file.")

        try:
            df = pd.read_csv(
                io.BytesIO(content),
                sep=best_sep,
                skiprows=best_skiprows,
                encoding=encoding,
            )
            if len(df.columns) > 0:
                return df
        except Exception:
            continue

    raise ValueError("Could not parse the CSV file. Please check the format.")


# ---------------------------------------------------------------------------
# Delete List Generator
# ---------------------------------------------------------------------------

@app.post("/api/upload")
async def upload_csv(files: List[UploadFile] = File(...)):
    """
    Accept one or more CSV dump files (email + opens columns).
    Flags emails appearing in 3+ dumps with 0 total opens.
    Returns a JSON list — frontend generates the download.
    """
    allowed = {".csv", ".xlsx", ".xls"}
    grouped: Optional[pd.DataFrame] = None

    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in allowed:
            return JSONResponse(
                {"error": f"Invalid file type: {file.filename}. Only .csv, .xlsx and .xls are allowed."},
                status_code=400,
            )

        try:
            df = await parse_upload(file)
        except ValueError as e:
            return JSONResponse({"error": str(e)}, status_code=400)

        df.columns = [str(c).strip().lower() for c in df.columns]
        col_err = _check_columns(file.filename or "", df, ["email", "opens"])
        if col_err:
            return JSONResponse({"error": col_err}, status_code=400)

        df = df[["email", "opens"]].copy()
        df.columns = ["email", "open"]
        df["open"] = pd.to_numeric(df["open"], errors="coerce").fillna(0)
        df["email"] = df["email"].astype(str).str.strip().str.lower()
        df = df[df["email"].str.len() > 0]

        per_file = df.groupby("email", as_index=False).agg(total_open=("open", "sum"))
        per_file["presence"] = 1

        if grouped is None:
            grouped = per_file
        else:
            grouped = grouped.merge(per_file, on="email", how="outer", suffixes=("", "_r"))
            grouped["total_open"] = (
                grouped["total_open"].fillna(0) + grouped["total_open_r"].fillna(0)
            )
            grouped["presence"] = (
                grouped["presence"].fillna(0) + grouped["presence_r"].fillna(0)
            )
            grouped = grouped.drop(
                columns=[c for c in ["total_open_r", "presence_r"] if c in grouped.columns]
            )

    if grouped is None:
        return JSONResponse({"deleted_count": 0, "emails": []})

    grouped["total_open"] = pd.to_numeric(grouped["total_open"], errors="coerce").fillna(0)
    grouped["presence"] = pd.to_numeric(grouped["presence"], errors="coerce").fillna(0)

    mask = (grouped["presence"] >= 3) & (grouped["total_open"] == 0)
    emails = grouped.loc[mask, "email"].tolist()

    return JSONResponse({"deleted_count": len(emails), "emails": emails})


# ---------------------------------------------------------------------------
# Duplicate Finder
# ---------------------------------------------------------------------------

@app.post("/api/duplicate-email-finder")
async def duplicate_email_finder(
    files: List[UploadFile] = File(...),
    duplicate_type: str = Form("email"),
):
    """
    Find duplicates by email, company name, or full name.
    Returns rows as JSON — frontend generates the download.
    """
    allowed = {".csv", ".xlsx", ".xls"}
    all_dfs: List[pd.DataFrame] = []

    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in allowed:
            return JSONResponse(
                {"error": f"Invalid file type: {file.filename}. Only .csv, .xlsx and .xls are allowed."},
                status_code=400,
            )

        try:
            df = await parse_upload(file)
        except ValueError as e:
            return JSONResponse({"error": str(e)}, status_code=400)

        df.columns = [str(c).strip().lower() for c in df.columns]

        col_err = _check_columns(file.filename or "", df, ["email"])
        if col_err:
            return JSONResponse({"error": col_err}, status_code=400)

        for col in ("first_name", "last_name", "company"):
            if col not in df.columns:
                df[col] = ""
        for col in ("email", "first_name", "last_name", "company"):
            df[col] = df[col].astype(str).str.strip()
        df["email"] = df["email"].str.lower()
        df = df[df["email"].str.len() > 0]
        all_dfs.append(df)

    if not all_dfs:
        return JSONResponse({"duplicate_count": 0, "rows": []})

    combined = pd.concat(all_dfs, ignore_index=True)

    if duplicate_type == "email":
        counts = combined.groupby("email").size()
        dup_keys = counts[counts > 1].index
        if dup_keys.empty:
            return JSONResponse({"duplicate_count": 0, "rows": []})

        filtered = combined[combined["email"].isin(dup_keys)]

        def agg_email(g: pd.DataFrame) -> pd.Series:
            names = sorted(
                {n for n in (g["first_name"] + " " + g["last_name"]).str.strip() if n}
            )
            companies = sorted({c for c in g["company"] if c})
            return pd.Series({
                "Full Name": ", ".join(names),
                "Company Name": ", ".join(companies),
                "Count": len(g),
                "Emails": g.name,
            })

        out = filtered.groupby("email").apply(agg_email, include_groups=False).reset_index(drop=True)
        rows = out[["Full Name", "Company Name", "Count", "Emails"]].to_dict(orient="records")

    elif duplicate_type == "company":
        combined = combined[combined["company"].str.len() > 0]
        counts = combined.groupby("company").size()
        dup_keys = counts[counts > 1].index
        if dup_keys.empty:
            return JSONResponse({"duplicate_count": 0, "rows": []})

        filtered = combined[combined["company"].isin(dup_keys)]

        def agg_company(g: pd.DataFrame) -> pd.Series:
            names = sorted(
                {n for n in (g["first_name"] + " " + g["last_name"]).str.strip() if n}
            )
            emails = sorted(set(g["email"]))
            return pd.Series({
                "Company Name": g.name,
                "Full Name(s)": ", ".join(names),
                "Count": len(g),
                "Emails": ", ".join(emails),
            })

        out = filtered.groupby("company").apply(agg_company, include_groups=False).reset_index(drop=True)
        rows = out[["Company Name", "Full Name(s)", "Count", "Emails"]].to_dict(orient="records")

    elif duplicate_type == "fullname":
        combined["fullname"] = (combined["first_name"] + " " + combined["last_name"]).str.strip()
        combined = combined[combined["fullname"].str.len() > 0]
        counts = combined.groupby("fullname").size()
        dup_keys = counts[counts > 1].index
        if dup_keys.empty:
            return JSONResponse({"duplicate_count": 0, "rows": []})

        filtered = combined[combined["fullname"].isin(dup_keys)]

        def agg_fullname(g: pd.DataFrame) -> pd.Series:
            companies = sorted({c for c in g["company"] if c})
            emails = sorted(set(g["email"]))
            return pd.Series({
                "Full Name": g.name,
                "Company Name(s)": ", ".join(companies),
                "Count": len(g),
                "Emails": ", ".join(emails),
            })

        out = filtered.groupby("fullname").apply(agg_fullname, include_groups=False).reset_index(drop=True)
        rows = out[["Full Name", "Company Name(s)", "Count", "Emails"]].to_dict(orient="records")

    else:
        return JSONResponse({"error": "Invalid duplicate_type."}, status_code=400)

    return JSONResponse({"duplicate_count": len(rows), "rows": rows})


# ---------------------------------------------------------------------------
# Overlap Checker
# ---------------------------------------------------------------------------

@app.post("/api/overlap-checker")
async def overlap_checker(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
):
    """
    Remove emails in file2 from file1.
    Returns remaining emails as JSON — frontend generates the download.
    """
    allowed = {".csv", ".xlsx", ".xls"}
    for f in (file1, file2):
        ext = os.path.splitext(f.filename or "")[1].lower()
        if ext not in allowed:
            return JSONResponse(
                {"error": f"Invalid file type: {f.filename}. Only .csv, .xlsx and .xls are allowed."},
                status_code=400,
            )

    try:
        df1 = await parse_upload(file1)
        df2 = await parse_upload(file2)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)

    df1.columns = [str(c).strip().lower() for c in df1.columns]
    df2.columns = [str(c).strip().lower() for c in df2.columns]

    col_err1 = _check_columns(file1.filename or "CSV 1", df1, ["email"])
    if col_err1:
        return JSONResponse({"error": col_err1}, status_code=400)
    col_err2 = _check_columns(file2.filename or "CSV 2", df2, ["email"])
    if col_err2:
        return JSONResponse({"error": col_err2}, status_code=400)

    emails1_series = df1["email"].astype(str).str.strip().str.lower()
    emails2_series = df2["email"].astype(str).str.strip().str.lower()
    emails1 = set(e for e in emails1_series if e)
    emails2 = set(e for e in emails2_series if e)

    remaining = sorted(emails1 - emails2)
    overlap_count = len(emails1 & emails2)

    return JSONResponse({
        "csv1_total": len(emails1),
        "csv2_total": len(emails2),
        "overlap_count": overlap_count,
        "remaining_count": len(remaining),
        "emails": remaining,
    })


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str

class POCData(BaseModel):
    name: str
    email: str
    phoneNumber: str
    position: str
    tags: str

class AddLeadRequest(BaseModel):
    companyName: str
    country: str
    state: str
    qualification: str
    notes: str
    createdBy: str
    pocs: List[POCData]

@app.post("/api/login")
async def login(request: LoginRequest):
    """
    Authenticate user against the Team table in Contacts Database.
    Returns user info on successful login.
    """
    email = request.email
    password = request.password

    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {AIRTABLE_READ_TOKEN}"}

            # Fetch all team members
            team_url = f"https://api.airtable.com/v0/{CONTACTS_DATABASE_BASE_ID}/{TEAM_TABLE_ID}"
            response = await client.get(team_url, headers=headers)
            data = response.json()

            if response.status_code != 200:
                return JSONResponse(
                    {"error": f"Failed to fetch team data: {data.get('error', {}).get('message', 'Unknown error')}"},
                    status_code=response.status_code
                )

            # Find matching user
            for record in data.get("records", []):
                fields = record.get("fields", {})
                user_email = str(fields.get("Email", "")).strip().lower()
                user_password = str(fields.get("Password", "")).strip()

                if user_email == email.strip().lower() and user_password == password:
                    # Successful login
                    return JSONResponse({
                        "success": True,
                        "user": {
                            "id": record["id"],
                            "employeeId": fields.get("Employee ID", ""),
                            "name": fields.get("Name", ""),
                            "email": fields.get("Email", ""),
                            "workingStatus": fields.get("Working Status", ""),
                            "employeeType": fields.get("Employee Type", []),
                            "employeeLevel": fields.get("Employee Level", ""),
                            "phoneNumber": fields.get("Phone Number", ""),
                        }
                    })

            # No match found
            return JSONResponse(
                {"error": "Invalid email or password"},
                status_code=401
            )

    except Exception as e:
        return JSONResponse(
            {"error": f"Login failed: {str(e)}"},
            status_code=500
        )


@app.post("/api/add-lead")
async def add_lead(request: AddLeadRequest):
    """
    Add a new company and associated contacts to the Lead Collection database.
    Auto-generates Company ID and links contacts to the company.
    """
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {AIRTABLE_WRITE_TOKEN}"}

            # Step 1: Generate Company ID
            # Fetch existing companies to determine next ID
            companies_url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{COMPANY_TABLE_ID}"
            companies_response = await client.get(companies_url, headers=headers)
            companies_data = companies_response.json()

            if companies_response.status_code != 200:
                return JSONResponse(
                    {"error": f"Failed to fetch companies: {companies_data.get('error', {}).get('message', 'Unknown error')}"},
                    status_code=companies_response.status_code
                )

            # Generate next Company ID
            existing_ids = []
            for record in companies_data.get("records", []):
                company_id = record.get("fields", {}).get("CompanyID", "")
                if company_id and company_id.startswith("COMP"):
                    try:
                        num = int(company_id.replace("COMP", ""))
                        existing_ids.append(num)
                    except ValueError:
                        continue

            next_id = max(existing_ids, default=0) + 1
            company_id = f"COMP{next_id:04d}"  # e.g., COMP0001, COMP0002, etc.

            # Step 2: Create Company record
            company_payload = {
                "fields": {
                    "CompanyID": company_id,
                    "Company Name": request.companyName,
                    "Country": request.country,
                    "State": request.state if request.state else "",
                    "Qualification": request.qualification,
                    "CreatedBy": request.createdBy,
                    "Notes": request.notes,
                }
            }

            company_create_response = await client.post(
                companies_url,
                headers=headers,
                json=company_payload
            )
            company_create_data = company_create_response.json()

            if company_create_response.status_code != 200:
                return JSONResponse(
                    {"error": f"Failed to create company: {company_create_data.get('error', {}).get('message', 'Unknown error')}"},
                    status_code=company_create_response.status_code
                )

            company_record_id = company_create_data["id"]

            # Step 3: Create Contact records for each POC
            contacts_url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{CONTACTS_TABLE_ID}"

            # Generate Contact IDs
            contacts_fetch_response = await client.get(contacts_url, headers=headers)
            contacts_fetch_data = contacts_fetch_response.json()

            existing_contact_ids = []
            for record in contacts_fetch_data.get("records", []):
                contact_id = record.get("fields", {}).get("ContactId", "")
                if contact_id and contact_id.startswith("CON"):
                    try:
                        num = int(contact_id.replace("CON", ""))
                        existing_contact_ids.append(num)
                    except ValueError:
                        continue

            next_contact_id = max(existing_contact_ids, default=0) + 1

            created_contacts = []
            for idx, poc in enumerate(request.pocs):
                contact_id = f"CON{next_contact_id + idx:04d}"

                contact_payload = {
                    "fields": {
                        "ContactID": contact_id,
                        "Name": poc.name,
                        "Email": poc.email,
                        "CompanyID": [company_record_id],  # Link to company
                        "Phone Number": poc.phoneNumber if poc.phoneNumber else "",
                        "Position": poc.position,
                        "Tags": poc.tags,
                    }
                }

                contact_create_response = await client.post(
                    contacts_url,
                    headers=headers,
                    json=contact_payload
                )

                if contact_create_response.status_code == 200:
                    created_contacts.append(contact_create_response.json())

            return JSONResponse({
                "success": True,
                "company": {
                    "id": company_record_id,
                    "companyId": company_id,
                    "name": request.companyName,
                },
                "contacts": [
                    {
                        "id": c["id"],
                        "contactId": c["fields"]["ContactID"],
                        "email": c["fields"]["Email"],
                    }
                    for c in created_contacts
                ],
            })

    except Exception as e:
        return JSONResponse(
            {"error": f"Failed to add lead: {str(e)}"},
            status_code=500
        )


# ---------------------------------------------------------------------------
# Lead Collection Search
# ---------------------------------------------------------------------------

@app.get("/api/search-leads")
async def search_leads(q: str = Query(..., min_length=1)):
    """
    Search companies and contacts in the Lead Collection Airtable base.
    Searches by company name, email, contact ID, and company ID.
    """
    query = q.strip().lower()

    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {AIRTABLE_WRITE_TOKEN}"}

            # Search companies
            companies_url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{COMPANY_TABLE_ID}"
            companies_response = await client.get(companies_url, headers=headers)
            companies_data = companies_response.json()

            # Search contacts
            contacts_url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{CONTACTS_TABLE_ID}"
            contacts_response = await client.get(contacts_url, headers=headers)
            contacts_data = contacts_response.json()

            if companies_response.status_code != 200:
                return JSONResponse(
                    {"error": f"Failed to fetch companies: {companies_data.get('error', {}).get('message', 'Unknown error')}"},
                    status_code=companies_response.status_code
                )

            if contacts_response.status_code != 200:
                return JSONResponse(
                    {"error": f"Failed to fetch contacts: {contacts_data.get('error', {}).get('message', 'Unknown error')}"},
                    status_code=contacts_response.status_code
                )

            # Filter companies
            filtered_companies = []
            for record in companies_data.get("records", []):
                fields = record.get("fields", {})
                company_name = str(fields.get("Company Name", "")).lower()
                company_id = str(fields.get("CompanyID", "")).lower()
                country = str(fields.get("Country", "")).lower()
                state = str(fields.get("State", "")).lower()

                if (query in company_name or
                    query in company_id or
                    query in country or
                    query in state):
                    filtered_companies.append({
                        "id": record["id"],
                        "CompanyID": fields.get("CompanyID", ""),
                        "Company Name": fields.get("Company Name", ""),
                        "Country": fields.get("Country", ""),
                        "State": fields.get("State", ""),
                        "CreatedBy": fields.get("CreatedBy", ""),
                        "Notes": fields.get("Notes", ""),
                    })

            # Create a company lookup map (Airtable record ID -> company details)
            company_lookup = {}
            for record in companies_data.get("records", []):
                fields = record.get("fields", {})
                company_lookup[record["id"]] = {
                    "id": record["id"],
                    "CompanyID": fields.get("CompanyID", ""),
                    "Company Name": fields.get("Company Name", ""),
                    "Country": fields.get("Country", ""),
                    "State": fields.get("State", ""),
                    "CreatedBy": fields.get("CreatedBy", ""),
                    "Notes": fields.get("Notes", ""),
                }

            # Filter contacts
            filtered_contacts = []
            for record in contacts_data.get("records", []):
                fields = record.get("fields", {})
                name = str(fields.get("Name", "")).lower()
                email = str(fields.get("Email", "")).lower()
                contact_id = str(fields.get("ContactID", "")).lower()
                phone = str(fields.get("Phone Number", "")).lower()
                position = str(fields.get("Position", "")).lower()

                if (query in name or
                    query in email or
                    query in contact_id or
                    query in phone or
                    query in position):
                    # Get the company this contact belongs to
                    company_ids = fields.get("CompanyID", [])
                    company_data = None
                    if company_ids and len(company_ids) > 0:
                        company_id = company_ids[0]  # Airtable link field returns array
                        company_data = company_lookup.get(company_id)

                    filtered_contacts.append({
                        "id": record["id"],
                        "ContactID": fields.get("ContactID", ""),
                        "Name": fields.get("Name", ""),
                        "Email": fields.get("Email", ""),
                        "Phone Number": fields.get("Phone Number", ""),
                        "Position": fields.get("Position", ""),
                        "Tags": fields.get("Tags", ""),
                        "CompanyID": company_ids[0] if company_ids else None,
                        "Company": company_data,  # Include full company details
                    })

            return JSONResponse({
                "companies": filtered_companies,
                "contacts": filtered_contacts,
            })

    except Exception as e:
        return JSONResponse(
            {"error": f"Search failed: {str(e)}"},
            status_code=500
        )
