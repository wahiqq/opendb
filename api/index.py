import csv
import io
import os
from typing import List, Optional, Dict
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


def _check_columns(filename: str, headers: List[str], required: List[str]) -> Optional[str]:
    """Return a human-readable error if any required columns are missing."""
    found = [c.strip().lower() for c in headers]
    missing = [c for c in required if c not in found]
    if not missing:
        return None
    found_display = ", ".join(f"'{c}'" for c in found[:10]) or "(none detected)"
    missing_display = ", ".join(f"'{c}'" for c in missing)
    return (
        f"'{filename}' is missing required column(s): {missing_display}. "
        f"Columns detected in your file: {found_display}."
    )


def _parse_csv_bytes(content: bytes, filename: str) -> List[Dict[str, str]]:
    """
    Parse CSV bytes into a list of dicts. Tries multiple encodings and
    auto-detects delimiter + skips metadata rows before the real header
    (e.g. Google Ads, Search Console exports).
    """
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = content.decode(encoding)
        except UnicodeDecodeError:
            continue

        lines = [l for l in text.splitlines() if l.strip()]
        if not lines:
            raise ValueError(f"'{filename}' is empty.")

        # Find best delimiter and header row by max consistent column count
        best_skip = 0
        best_sep = ","
        best_ncols = 0

        for sep in (",", "\t", ";"):
            col_counts = [len(line.split(sep)) for line in lines[:20]]
            max_cols = max(col_counts)
            if max_cols <= best_ncols:
                continue
            for i, line in enumerate(lines[:20]):
                if len(line.split(sep)) == max_cols:
                    best_skip = i
                    best_sep = sep
                    best_ncols = max_cols
                    break

        if best_ncols == 0:
            raise ValueError(f"Could not detect columns in '{filename}'.")

        try:
            relevant = "\n".join(lines[best_skip:])
            reader = csv.DictReader(io.StringIO(relevant), delimiter=best_sep)
            rows = [row for row in reader]
            if rows:
                return rows
        except Exception:
            continue

    raise ValueError(f"Could not parse '{filename}'. Please check the format.")


async def _parse_upload(file: UploadFile) -> List[Dict[str, str]]:
    """Read an uploaded CSV or XLSX file into a list of dicts with lowercased keys."""
    content = await file.read()
    if not content:
        raise ValueError(f"'{file.filename}' is empty.")

    ext = os.path.splitext(file.filename or "")[1].lower()

    if ext in (".xlsx", ".xls"):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            ws = wb.active
            row_iter = iter(ws.rows)
            headers = [str(cell.value or "").strip() for cell in next(row_iter)]
            rows = []
            for row in row_iter:
                values = [str(cell.value) if cell.value is not None else "" for cell in row]
                rows.append(dict(zip(headers, values)))
            wb.close()
            if not rows:
                raise ValueError(f"'{file.filename}' contains no data rows.")
            return rows
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Could not read '{file.filename}': {e}")

    rows = _parse_csv_bytes(content, file.filename or "file.csv")
    if not rows:
        raise ValueError(f"'{file.filename}' contains no data rows.")
    return rows


def _norm_rows(rows: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Lowercase all keys and strip whitespace from values."""
    return [{k.strip().lower(): (v or "").strip() for k, v in row.items()} for row in rows]


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
    # email -> [total_opens, presence_count]
    aggregated: Dict[str, List[float]] = {}

    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in allowed:
            return JSONResponse(
                {"error": f"Invalid file type: {file.filename}. Only .csv, .xlsx and .xls are allowed."},
                status_code=400,
            )

        try:
            rows = await _parse_upload(file)
        except ValueError as e:
            return JSONResponse({"error": str(e)}, status_code=400)

        rows = _norm_rows(rows)
        col_err = _check_columns(file.filename or "", list(rows[0].keys()) if rows else [], ["email", "opens"])
        if col_err:
            return JSONResponse({"error": col_err}, status_code=400)

        # Sum opens per email within this file
        per_file: Dict[str, float] = {}
        for row in rows:
            email = row.get("email", "").strip().lower()
            if not email:
                continue
            try:
                opens = float(row.get("opens", 0) or 0)
            except (ValueError, TypeError):
                opens = 0.0
            per_file[email] = per_file.get(email, 0.0) + opens

        # Merge into aggregated
        for email, opens in per_file.items():
            if email not in aggregated:
                aggregated[email] = [0.0, 0]
            aggregated[email][0] += opens
            aggregated[email][1] += 1

    emails = [
        email for email, (total_opens, presence) in aggregated.items()
        if presence >= 3 and total_opens == 0
    ]

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
    all_rows: List[Dict[str, str]] = []

    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in allowed:
            return JSONResponse(
                {"error": f"Invalid file type: {file.filename}. Only .csv, .xlsx and .xls are allowed."},
                status_code=400,
            )

        try:
            rows = await _parse_upload(file)
        except ValueError as e:
            return JSONResponse({"error": str(e)}, status_code=400)

        rows = _norm_rows(rows)
        col_err = _check_columns(file.filename or "", list(rows[0].keys()) if rows else [], ["email"])
        if col_err:
            return JSONResponse({"error": col_err}, status_code=400)

        for row in rows:
            email = row.get("email", "").strip().lower()
            if not email:
                continue
            all_rows.append({
                "email": email,
                "first_name": row.get("first_name", "").strip(),
                "last_name": row.get("last_name", "").strip(),
                "company": row.get("company", "").strip(),
            })

    if not all_rows:
        return JSONResponse({"duplicate_count": 0, "rows": []})

    if duplicate_type == "email":
        # Group by email
        groups: Dict[str, List[Dict]] = {}
        for row in all_rows:
            groups.setdefault(row["email"], []).append(row)

        rows_out = []
        for email, group in groups.items():
            if len(group) < 2:
                continue
            names = sorted({f"{r['first_name']} {r['last_name']}".strip() for r in group if (r['first_name'] or r['last_name'])})
            companies = sorted({r["company"] for r in group if r["company"]})
            rows_out.append({
                "Full Name": ", ".join(names),
                "Company Name": ", ".join(companies),
                "Count": len(group),
                "Emails": email,
            })

    elif duplicate_type == "company":
        groups = {}
        for row in all_rows:
            if not row["company"]:
                continue
            groups.setdefault(row["company"], []).append(row)

        rows_out = []
        for company, group in groups.items():
            if len(group) < 2:
                continue
            names = sorted({f"{r['first_name']} {r['last_name']}".strip() for r in group if (r['first_name'] or r['last_name'])})
            emails = sorted({r["email"] for r in group})
            rows_out.append({
                "Company Name": company,
                "Full Name(s)": ", ".join(names),
                "Count": len(group),
                "Emails": ", ".join(emails),
            })

    elif duplicate_type == "fullname":
        groups = {}
        for row in all_rows:
            fullname = f"{row['first_name']} {row['last_name']}".strip()
            if not fullname:
                continue
            groups.setdefault(fullname, []).append(row)

        rows_out = []
        for fullname, group in groups.items():
            if len(group) < 2:
                continue
            companies = sorted({r["company"] for r in group if r["company"]})
            emails = sorted({r["email"] for r in group})
            rows_out.append({
                "Full Name": fullname,
                "Company Name(s)": ", ".join(companies),
                "Count": len(group),
                "Emails": ", ".join(emails),
            })

    else:
        return JSONResponse({"error": "Invalid duplicate_type."}, status_code=400)

    return JSONResponse({"duplicate_count": len(rows_out), "rows": rows_out})


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
        rows1 = _norm_rows(await _parse_upload(file1))
        rows2 = _norm_rows(await _parse_upload(file2))
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)

    col_err1 = _check_columns(file1.filename or "CSV 1", list(rows1[0].keys()) if rows1 else [], ["email"])
    if col_err1:
        return JSONResponse({"error": col_err1}, status_code=400)
    col_err2 = _check_columns(file2.filename or "CSV 2", list(rows2[0].keys()) if rows2 else [], ["email"])
    if col_err2:
        return JSONResponse({"error": col_err2}, status_code=400)

    emails1 = {r["email"].strip().lower() for r in rows1 if r.get("email", "").strip()}
    emails2 = {r["email"].strip().lower() for r in rows2 if r.get("email", "").strip()}

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
    emailFName: str = ""
    personalEmail: str = ""
    phoneNumber: str
    position: str
    tags: str

class AddLeadRequest(BaseModel):
    companyName: str
    country: str
    state: str
    website: str = ""
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

            # Fetch all team members (paginate)
            team_url = f"https://api.airtable.com/v0/{CONTACTS_DATABASE_BASE_ID}/{TEAM_TABLE_ID}"
            all_team_records = []
            offset = None
            while True:
                params = {}
                if offset:
                    params["offset"] = offset
                response = await client.get(team_url, headers=headers, params=params)
                data = response.json()
                if response.status_code != 200:
                    return JSONResponse(
                        {"error": f"Failed to fetch team data: {data.get('error', {}).get('message', 'Unknown error')}"},
                        status_code=response.status_code
                    )
                all_team_records.extend(data.get("records", []))
                offset = data.get("offset")
                if not offset:
                    break

            # Find matching user
            for record in all_team_records:
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
            # Fetch ALL existing companies (paginate) to determine next ID
            companies_url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{COMPANY_TABLE_ID}"
            existing_ids = []
            offset = None
            while True:
                params = {"fields[]": "CompanyID"}
                if offset:
                    params["offset"] = offset
                companies_response = await client.get(companies_url, headers=headers, params=params)
                companies_data = companies_response.json()
                if companies_response.status_code != 200:
                    return JSONResponse(
                        {"error": f"Failed to fetch companies: {companies_data.get('error', {}).get('message', 'Unknown error')}"},
                        status_code=companies_response.status_code
                    )
                for record in companies_data.get("records", []):
                    cid = record.get("fields", {}).get("CompanyID", "")
                    if cid and cid.startswith("COMP"):
                        try:
                            existing_ids.append(int(cid.replace("COMP", "")))
                        except ValueError:
                            continue
                offset = companies_data.get("offset")
                if not offset:
                    break

            next_id = max(existing_ids, default=0) + 1
            company_id = f"COMP{next_id:04d}"  # e.g., COMP0001, COMP0002, etc.

            # Step 2: Create Company record
            company_payload = {
                "fields": {
                    "CompanyID": company_id,
                    "Company Name": request.companyName,
                    "Country": request.country,
                    "State": request.state if request.state else "",
                    "Website": request.website if request.website else "",
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

            # Generate Contact IDs — paginate through all records
            existing_contact_ids = []
            offset = None
            while True:
                params = {"fields[]": "ContactID"}
                if offset:
                    params["offset"] = offset
                contacts_fetch_response = await client.get(contacts_url, headers=headers, params=params)
                contacts_fetch_data = contacts_fetch_response.json()
                for record in contacts_fetch_data.get("records", []):
                    cid = record.get("fields", {}).get("ContactID", "")
                    if cid and cid.startswith("CON"):
                        try:
                            existing_contact_ids.append(int(cid.replace("CON", "")))
                        except ValueError:
                            continue
                offset = contacts_fetch_data.get("offset")
                if not offset:
                    break

            next_contact_id = max(existing_contact_ids, default=0) + 1

            created_contacts = []
            for idx, poc in enumerate(request.pocs):
                contact_id = f"CON{next_contact_id + idx:04d}"

                contact_payload = {
                    "fields": {
                        "ContactID": contact_id,
                        "Name": poc.name,
                        "Email": poc.email,
                        "Email FNAME": poc.emailFName or poc.name.strip().split()[0] if poc.name.strip() else "",
                        "Personal Email": poc.personalEmail if poc.personalEmail else "",
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
async def search_leads(q: str = Query(default="")):
    """
    Search companies and contacts in the Lead Collection Airtable base.
    Searches by company name, email, contact ID, and company ID.
    """
    query = q.strip().lower()

    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {AIRTABLE_WRITE_TOKEN}"}

            # Fetch all companies (paginate)
            companies_url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{COMPANY_TABLE_ID}"
            all_company_records = []
            offset = None
            while True:
                params = {}
                if offset:
                    params["offset"] = offset
                companies_response = await client.get(companies_url, headers=headers, params=params)
                companies_data = companies_response.json()
                if companies_response.status_code != 200:
                    return JSONResponse(
                        {"error": f"Failed to fetch companies: {companies_data.get('error', {}).get('message', 'Unknown error')}"},
                        status_code=companies_response.status_code
                    )
                all_company_records.extend(companies_data.get("records", []))
                offset = companies_data.get("offset")
                if not offset:
                    break

            # Fetch all contacts (paginate)
            contacts_url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{CONTACTS_TABLE_ID}"
            all_contact_records = []
            offset = None
            while True:
                params = {}
                if offset:
                    params["offset"] = offset
                contacts_response = await client.get(contacts_url, headers=headers, params=params)
                contacts_data = contacts_response.json()
                if contacts_response.status_code != 200:
                    return JSONResponse(
                        {"error": f"Failed to fetch contacts: {contacts_data.get('error', {}).get('message', 'Unknown error')}"},
                        status_code=contacts_response.status_code
                    )
                all_contact_records.extend(contacts_data.get("records", []))
                offset = contacts_data.get("offset")
                if not offset:
                    break

            # Filter companies
            filtered_companies = []
            for record in all_company_records:
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
            for record in all_company_records:
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

            # IDs of companies that matched the query — include all their contacts
            matched_company_ids = {c["id"] for c in filtered_companies}

            # Filter contacts — either query matches the contact itself,
            # or the contact belongs to a matched company
            filtered_contacts = []
            for record in all_contact_records:
                fields = record.get("fields", {})
                name = str(fields.get("Name", "")).lower()
                email = str(fields.get("Email", "")).lower()
                contact_id = str(fields.get("ContactID", "")).lower()
                phone = str(fields.get("Phone Number", "")).lower()
                position = str(fields.get("Position", "")).lower()

                company_ids = fields.get("CompanyID", [])
                linked_company_id = company_ids[0] if company_ids else None
                belongs_to_matched_company = linked_company_id in matched_company_ids

                query_matches = (
                    query in name or
                    query in email or
                    query in contact_id or
                    query in phone or
                    query in position
                )

                if query_matches or belongs_to_matched_company:
                    company_data = company_lookup.get(linked_company_id) if linked_company_id else None
                    filtered_contacts.append({
                        "id": record["id"],
                        "ContactID": fields.get("ContactID", ""),
                        "Name": fields.get("Name", ""),
                        "Email": fields.get("Email", ""),
                        "Phone Number": fields.get("Phone Number", ""),
                        "Position": fields.get("Position", ""),
                        "Tags": fields.get("Tags", ""),
                        "CompanyID": linked_company_id,
                        "Company": company_data,
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


# ---------------------------------------------------------------------------
# Company Detail + Edit
# ---------------------------------------------------------------------------

@app.get("/api/company/{company_id}")
async def get_company(company_id: str):
    """Fetch a single company and its contacts by CompanyID (e.g. COMP0042)."""
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {AIRTABLE_WRITE_TOKEN}"}

            # Look up company by CompanyID field
            companies_url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{COMPANY_TABLE_ID}"
            res = await client.get(companies_url, headers=headers, params={
                "filterByFormula": f"{{CompanyID}}='{company_id}'",
                "maxRecords": 1,
            })
            data = res.json()
            records = data.get("records", [])
            if not records:
                return JSONResponse({"error": "Company not found"}, status_code=404)

            record = records[0]
            record_id = record["id"]
            fields = record.get("fields", {})
            company = {
                "id": record_id,
                "CompanyID": fields.get("CompanyID", ""),
                "Company Name": fields.get("Company Name", ""),
                "Country": fields.get("Country", ""),
                "State": fields.get("State", ""),
                "Website": fields.get("Website", ""),
                "CreatedBy": fields.get("CreatedBy", ""),
                "Notes": fields.get("Notes", ""),
                "Qualification": fields.get("Qualification", ""),
            }

            # Fetch contacts linked to this company
            # CompanyID is a linked record field — filter in Python by record ID
            contacts_url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{CONTACTS_TABLE_ID}"
            all_contacts = []
            offset = None
            while True:
                params: Dict = {}
                if offset:
                    params["offset"] = offset
                contacts_res = await client.get(contacts_url, headers=headers, params=params)
                contacts_data = contacts_res.json()
                for rec in contacts_data.get("records", []):
                    linked = rec.get("fields", {}).get("CompanyID", [])
                    if record_id in linked:
                        all_contacts.append(rec)
                offset = contacts_data.get("offset")
                if not offset:
                    break

            contacts = []
            for rec in all_contacts:
                f = rec.get("fields", {})
                contacts.append({
                    "id": rec["id"],
                    "ContactID": f.get("ContactID", ""),
                    "Name": f.get("Name", ""),
                    "Email": f.get("Email", ""),
                    "Email FNAME": f.get("Email FNAME", ""),
                    "Personal Email": f.get("Personal Email", ""),
                    "Phone Number": f.get("Phone Number", ""),
                    "Position": f.get("Position", ""),
                    "Tags": f.get("Tags", ""),
                })

            return JSONResponse({"company": company, "contacts": contacts})

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


class UpdateCompanyRequest(BaseModel):
    company: Dict
    contacts: Dict  # airtable record_id -> fields dict


@app.patch("/api/company/{company_id}")
async def update_company(company_id: str, request: UpdateCompanyRequest):
    """Update company fields and any changed contact fields. Looks up by CompanyID."""
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {AIRTABLE_WRITE_TOKEN}"}

            # Look up the Airtable record ID from CompanyID
            companies_url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{COMPANY_TABLE_ID}"
            lookup_res = await client.get(companies_url, headers=headers, params={
                "filterByFormula": f"{{CompanyID}}='{company_id}'",
                "maxRecords": 1,
                "fields[]": "CompanyID",
            })
            lookup_data = lookup_res.json()
            records = lookup_data.get("records", [])
            if not records:
                return JSONResponse({"error": "Company not found"}, status_code=404)

            record_id = records[0]["id"]

            # Patch company
            c = request.company
            company_fields = {k: c[k] for k in ("Company Name", "Country", "State", "Website", "CreatedBy", "Notes", "Qualification") if k in c}
            patch_res = await client.patch(
                f"{companies_url}/{record_id}",
                headers=headers,
                json={"fields": company_fields},
            )
            if patch_res.status_code != 200:
                data = patch_res.json()
                return JSONResponse(
                    {"error": data.get("error", {}).get("message", "Failed to update company")},
                    status_code=patch_res.status_code,
                )

            # Patch each contact
            contacts_base_url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{CONTACTS_TABLE_ID}"
            for contact_record_id, fields in request.contacts.items():
                contact_fields = {k: fields[k] for k in ("Name", "Email", "Email FNAME", "Personal Email", "Phone Number", "Position", "Tags") if k in fields}
                if not contact_fields:
                    continue
                await client.patch(
                    f"{contacts_base_url}/{contact_record_id}",
                    headers=headers,
                    json={"fields": contact_fields},
                )

            return JSONResponse({"success": True})

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ---------------------------------------------------------------------------
# Add / Delete Contact
# ---------------------------------------------------------------------------

class AddContactRequest(BaseModel):
    companyRecordId: str   # Airtable record ID of the company
    companyId: str         # e.g. COMP0042 — used to generate ContactID
    Name: str
    Email: str = ""
    EmailFName: str = ""
    PersonalEmail: str = ""
    PhoneNumber: str = ""
    Position: str = ""
    Tags: str = ""


@app.post("/api/contact")
async def add_contact(request: AddContactRequest):
    """Add a single contact linked to an existing company."""
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {AIRTABLE_WRITE_TOKEN}"}
            contacts_url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{CONTACTS_TABLE_ID}"

            # Determine next ContactID
            existing_ids = []
            offset = None
            while True:
                params: Dict = {"fields[]": "ContactID"}
                if offset:
                    params["offset"] = offset
                res = await client.get(contacts_url, headers=headers, params=params)
                data = res.json()
                for rec in data.get("records", []):
                    cid = rec.get("fields", {}).get("ContactID", "")
                    if cid and cid.startswith("CON"):
                        try:
                            existing_ids.append(int(cid.replace("CON", "")))
                        except ValueError:
                            pass
                offset = data.get("offset")
                if not offset:
                    break

            next_id = max(existing_ids, default=0) + 1
            contact_id = f"CON{next_id:04d}"

            fname = request.EmailFName or (request.Name.strip().split()[0] if request.Name.strip() else "")
            payload = {
                "fields": {
                    "ContactID": contact_id,
                    "Name": request.Name,
                    "Email": request.Email,
                    "Email FNAME": fname,
                    "Personal Email": request.PersonalEmail,
                    "Phone Number": request.PhoneNumber,
                    "Position": request.Position,
                    "Tags": request.Tags,
                    "CompanyID": [request.companyRecordId],
                }
            }

            create_res = await client.post(contacts_url, headers=headers, json=payload)
            create_data = create_res.json()
            if create_res.status_code != 200:
                return JSONResponse(
                    {"error": create_data.get("error", {}).get("message", "Failed to create contact")},
                    status_code=create_res.status_code,
                )

            return JSONResponse({"success": True, "id": create_data["id"], "ContactID": contact_id})

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.delete("/api/contact/{record_id}")
async def delete_contact(record_id: str):
    """Delete a contact record by Airtable record ID."""
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {AIRTABLE_WRITE_TOKEN}"}
            url = f"https://api.airtable.com/v0/{LEAD_COLLECTION_BASE_ID}/{CONTACTS_TABLE_ID}/{record_id}"
            res = await client.delete(url, headers=headers)
            if res.status_code not in (200, 204):
                data = res.json()
                return JSONResponse(
                    {"error": data.get("error", {}).get("message", "Failed to delete contact")},
                    status_code=res.status_code,
                )
            return JSONResponse({"success": True})

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
