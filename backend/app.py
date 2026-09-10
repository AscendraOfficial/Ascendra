# Importing

from flask import Flask, request
from flask_cors import CORS
import hashlib
import hmac
import os
import re
import secrets
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
    for origin in os.environ.get("ASCENDRA_ALLOWED_ORIGINS", ",".join(default_origins)).split(",")
    if origin.strip()
]
CORS(app, resources={r"/journal*": {"origins": allowed_origins}})


# Supabase

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# --------------------
# Journal security
# --------------------

MAX_USER_ID_LENGTH = 128
MAX_TOKEN_LENGTH = 256
MAX_ENCRYPTED_PAYLOAD_LENGTH = 100000
JOURNAL_AUTH_DATE = "__auth__"
TOKEN_PREFIX = "sha256:"
DATE_PATTERN = re.compile(r"^journal-(\d{4})-(\d{1,2})-(\d{1,2})$")


def normalize_user_id(value):
    user_id = str(value or "").strip()
    if not user_id or len(user_id) > MAX_USER_ID_LENGTH:
        return ""
    return user_id


def bearer_token():
    authorization = str(request.headers.get("Authorization") or "").strip()
    if not authorization.lower().startswith("bearer "):
        return ""
    token = authorization[7:].strip()
    if not token or len(token) > MAX_TOKEN_LENGTH:
        return ""
    return token


def hash_token(token):
    return TOKEN_PREFIX + hashlib.sha256(token.encode("utf-8")).hexdigest()


def is_valid_journal_date(value):
    date = str(value or "").strip()
    match = DATE_PATTERN.fullmatch(date)
    if not match:
        return False

    year, month, day = map(int, match.groups())
    if year < 2000 or year > 2200 or month < 1 or month > 12 or day < 1 or day > 31:
        return False

    return True


def journal_auth_record(user_id):
    response = (
        supabase
        .table("journal")
        .select("user_id,date,day")
        .eq("user_id", user_id)
        .eq("date", JOURNAL_AUTH_DATE)
        .execute()
    )
    return response.data[0] if response.data else None


def journal_user_entries(user_id):
    response = (
        supabase
        .table("journal")
        .select("user_id,date,mood,day,grateful,learn,goal")
        .eq("user_id", user_id)
        .execute()
    )
    return [entry for entry in response.data if entry.get("date") != JOURNAL_AUTH_DATE]


def token_is_authorized(user_id, token):
    if not user_id or not token:
        return False

    record = journal_auth_record(user_id)
    if not record:
        return False

    stored_hash = str(record.get("day") or "")
    return hmac.compare_digest(stored_hash, hash_token(token))


def store_token_hash(user_id, token):
    clean_entry = {
        "user_id": user_id,
        "date": JOURNAL_AUTH_DATE,
        "mood": "",
        "day": hash_token(token),
        "grateful": "",
        "learn": "",
        "goal": "",
    }

    existing = journal_auth_record(user_id)
    if existing:
        (
            supabase
            .table("journal")
            .update(clean_entry)
            .eq("user_id", user_id)
            .eq("date", JOURNAL_AUTH_DATE)
            .execute()
        )
    else:
        supabase.table("journal").insert(clean_entry).execute()


def validate_claim_proof(user_id, proof):
    if not isinstance(proof, dict):
        return False

    date = str(proof.get("date") or "").strip()
    if not is_valid_journal_date(date):
        return False

    fields = ("mood", "day", "grateful", "learn", "goal")
    response = (
        supabase
        .table("journal")
        .select("user_id,date,mood,day,grateful,learn,goal")
        .eq("user_id", user_id)
        .eq("date", date)
        .execute()
    )

    if not response.data:
        return False

    existing = response.data[0]
    for field in fields:
        if str(existing.get(field) or "") != str(proof.get(field) or ""):
            return False

    return True


def require_journal_authorization(user_id):
    token = bearer_token()
    if not token_is_authorized(user_id, token):
        return None, ({"status": "error", "message": "Unauthorized journal access"}, 401)
    return token, None


# --------------------
# Routes
# --------------------

@app.post("/journal/claim")
def claimJournal():
    payload = request.get_json(silent=True) or {}
    user_id = normalize_user_id(payload.get("user_id"))
    token = str(payload.get("token") or "").strip()

    if not user_id or not token or len(token) > MAX_TOKEN_LENGTH:
        return {"status": "error", "message": "user_id and token are required"}, 400

    existing_auth = journal_auth_record(user_id)
    if existing_auth:
        if token_is_authorized(user_id, token):
            return {"status": "success", "claimed": True}
        return {"status": "error", "message": "Journal is already claimed"}, 409

    existing_entries = journal_user_entries(user_id)
    if existing_entries:
        proof = payload.get("proof")
        if not validate_claim_proof(user_id, proof):
            return {"status": "error", "message": "Could not verify journal ownership"}, 403

    store_token_hash(user_id, token)
    return {"status": "success", "claimed": True}


@app.get("/journal")
def getJournal():
    user_id = normalize_user_id(request.args.get("user_id"))

    if not user_id:
        return {
            "status": "error",
            "message": "user_id is required"
        }, 400

    _, auth_error = require_journal_authorization(user_id)
    if auth_error:
        return auth_error

    return journal_user_entries(user_id)


@app.post("/journal")
def postJournal():
    newEntry = request.get_json(silent=True)

    if not isinstance(newEntry, dict):
        return {
            "status": "error",
            "message": "No journal data received"
        }, 400

    user_id = normalize_user_id(newEntry.get("user_id"))
    date = str(newEntry.get("date", "")).strip()

    if not user_id or not is_valid_journal_date(date):
        return {
            "status": "error",
            "message": "A valid user_id and journal date are required"
        }, 400

    _, auth_error = require_journal_authorization(user_id)
    if auth_error:
        return auth_error

    allowed_fields = ("user_id", "date", "mood", "day", "grateful", "learn", "goal")
    clean_entry = {
        field: str(newEntry.get(field) or "")
        for field in allowed_fields
    }
    clean_entry["user_id"] = user_id
    clean_entry["date"] = date

    payload_length = sum(len(clean_entry[field]) for field in ("mood", "day", "grateful", "learn", "goal"))
    if payload_length > MAX_ENCRYPTED_PAYLOAD_LENGTH:
        return {"status": "error", "message": "Journal payload is too large"}, 413

    existing = (
        supabase
        .table("journal")
        .select("user_id,date")
        .eq("user_id", user_id)
        .eq("date", date)
        .execute()
    )

    if existing.data:
        (
            supabase
            .table("journal")
            .update(clean_entry)
            .eq("user_id", user_id)
            .eq("date", date)
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
        "status": "success"
    }


@app.get("/test")
def test():
    return {
        "status": "worked"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


if __name__ == "__main__":
    app.run(debug=True)
