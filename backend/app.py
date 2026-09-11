# Importing

import hashlib
import os
import re
import secrets
from datetime import date

from flask import Flask, request
from flask_cors import CORS
from supabase import create_client


# Starting up

app = Flask(__name__)

default_origins = [
    "https://ascendraofficial.github.io",
    "https://jedicuber.github.io",
    "http://127.0.0.1:8765",
    "http://localhost:8765",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "null",
]
allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "ASCENDRA_ALLOWED_ORIGINS",
        ",".join(default_origins),
    ).split(",")
    if origin.strip()
]
CORS(
    app,
    resources={
        r"/journal": {"origins": allowed_origins},
        r"/journal/claim": {"origins": allowed_origins},
    },
    allow_headers=["Content-Type", "Authorization"],
)


# Supabase

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY,
)


# --------------------
# Journal security
# --------------------

JOURNAL_AUTH_DATE = "__auth__"
JOURNAL_AUTH_PREFIX = "auth-v1:"
JOURNAL_FIELDS = (
    "user_id",
    "date",
    "mood",
    "day",
    "grateful",
    "learn",
    "goal",
)
USER_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")
TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{40,128}$")
JOURNAL_DATE_PATTERN = re.compile(r"^journal-(\d{4})-(\d{1,2})-(\d{1,2})$")


def valid_journal_date(value):
    match = JOURNAL_DATE_PATTERN.fullmatch(value)

    if not match:
        return False

    try:
        date(
            int(match.group(1)),
            int(match.group(2)),
            int(match.group(3)),
        )
    except ValueError:
        return False

    return True


def json_error(message, status, code=None):
    body = {
        "status": "error",
        "message": message,
    }

    if code:
        body["code"] = code

    return body, status


def normalize_user_id(value):
    user_id = str(value or "").strip()

    if not USER_ID_PATTERN.fullmatch(user_id):
        return ""

    return user_id


def get_bearer_token():
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer":
        return ""

    token = token.strip()

    if not TOKEN_PATTERN.fullmatch(token):
        return ""

    return token


def journal_token_hash(token):
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    return JOURNAL_AUTH_PREFIX + digest


def get_journal_auth_value(user_id):
    result = (
        supabase
        .table("journal")
        .select("mood")
        .eq("user_id", user_id)
        .eq("date", JOURNAL_AUTH_DATE)
        .execute()
    )

    if not result.data:
        return ""

    return str(result.data[0].get("mood", ""))


def journal_auth_status(user_id, token):
    expected = get_journal_auth_value(user_id)

    if not expected:
        return "missing"

    actual = journal_token_hash(token)

    if secrets.compare_digest(expected, actual):
        return "ok"

    return "denied"


def get_journal_rows(user_id):
    result = (
        supabase
        .table("journal")
        .select(",".join(JOURNAL_FIELDS))
        .eq("user_id", user_id)
        .execute()
    )

    return [
        row
        for row in (result.data or [])
        if row.get("date") != JOURNAL_AUTH_DATE
    ]


def clean_claim_entry(value):
    if not isinstance(value, dict):
        return None

    date = str(value.get("date", "")).strip()

    if not valid_journal_date(date):
        return None

    fields = ("mood", "day", "grateful", "learn", "goal")
    cleaned = {"date": date}

    for field in fields:
        field_value = value.get(field, "")

        if not isinstance(field_value, str):
            return None

        cleaned[field] = field_value

    return cleaned


def claim_matches_row(claim, row):
    if not claim:
        return False

    return all(
        str(row.get(field, "")) == claim[field]
        for field in ("date", "mood", "day", "grateful", "learn", "goal")
    )


def require_journal_auth(user_id):
    token = get_bearer_token()

    if not token:
        return None, json_error(
            "Journal authentication is required.",
            401,
            "journal_auth_missing",
        )

    status = journal_auth_status(user_id, token)

    if status == "missing":
        return None, json_error(
            "This journal needs to initialize its security token.",
            428,
            "journal_auth_required",
        )

    if status != "ok":
        return None, json_error(
            "Journal authentication failed.",
            403,
            "journal_auth_denied",
        )

    return token, None


def validate_journal_entry(value):
    if not isinstance(value, dict):
        return None

    user_id = normalize_user_id(value.get("user_id"))
    date = str(value.get("date", "")).strip()

    if not user_id or not valid_journal_date(date):
        return None

    clean_entry = {
        "user_id": user_id,
        "date": date,
    }

    limits = {
        "mood": 100,
        "day": 100_000,
        "grateful": 10_000,
        "learn": 10_000,
        "goal": 10_000,
    }

    for field, limit in limits.items():
        field_value = value.get(field, "")

        if not isinstance(field_value, str) or len(field_value) > limit:
            return None

        clean_entry[field] = field_value

    return clean_entry


# --------------------
# Routes
# --------------------

@app.get("/journal")
def getJournal():
    user_id = normalize_user_id(request.args.get("user_id"))

    if not user_id:
        return json_error(
            "A valid user_id is required.",
            400,
            "invalid_user_id",
        )

    _, auth_error = require_journal_auth(user_id)

    if auth_error:
        return auth_error

    return get_journal_rows(user_id)


@app.post("/journal/claim")
def claimJournal():
    body = request.get_json(silent=True)

    if not isinstance(body, dict):
        return json_error(
            "No journal security data received.",
            400,
            "invalid_request",
        )

    user_id = normalize_user_id(body.get("user_id"))
    token = get_bearer_token()

    if not user_id:
        return json_error(
            "A valid user_id is required.",
            400,
            "invalid_user_id",
        )

    if not token:
        return json_error(
            "Journal authentication is required.",
            401,
            "journal_auth_missing",
        )

    current_status = journal_auth_status(user_id, token)

    if current_status == "ok":
        return {"status": "success"}

    if current_status == "denied":
        return json_error(
            "This journal already has a different security token.",
            403,
            "journal_auth_denied",
        )

    rows = get_journal_rows(user_id)

    if rows:
        claim = clean_claim_entry(body.get("claim"))

        if not claim or not any(
            claim_matches_row(claim, row)
            for row in rows
        ):
            return json_error(
                "A matching local journal entry is required to secure this older journal.",
                403,
                "legacy_proof_required",
            )

    auth_entry = {
        "user_id": user_id,
        "date": JOURNAL_AUTH_DATE,
        "mood": journal_token_hash(token),
        "day": "",
        "grateful": "",
        "learn": "",
        "goal": "",
    }

    try:
        supabase.table("journal").insert(auth_entry).execute()
    except Exception:
        # If two setup requests raced, accept the winner only when it
        # installed the same token. Otherwise keep the journal locked.
        if journal_auth_status(user_id, token) != "ok":
            raise

    return {"status": "success"}


@app.post("/journal")
def postJournal():
    new_entry = request.get_json(silent=True)
    clean_entry = validate_journal_entry(new_entry)

    if not clean_entry:
        return json_error(
            "Invalid journal data received.",
            400,
            "invalid_journal_entry",
        )

    user_id = clean_entry["user_id"]
    _, auth_error = require_journal_auth(user_id)

    if auth_error:
        return auth_error

    existing = (
        supabase
        .table("journal")
        .select("user_id,date")
        .eq("user_id", user_id)
        .eq("date", clean_entry["date"])
        .execute()
    )

    if existing.data:
        (
            supabase
            .table("journal")
            .update(clean_entry)
            .eq("user_id", user_id)
            .eq("date", clean_entry["date"])
            .execute()
        )
    else:
        (
            supabase
            .table("journal")
            .insert(clean_entry)
            .execute()
        )

    return {
        "status": "success",
    }


@app.get("/test")
def test():
    return {
        "status": "worked",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
    }


if __name__ == "__main__":
    app.run(debug=True)
