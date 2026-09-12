# Importing

from datetime import date as calendar_date
import re

from flask import Flask, request
from flask_cors import CORS
import os
from supabase import create_client


# Starting up

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024

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
CORS(app, resources={r"/journal": {"origins": allowed_origins}})

ACCOUNT_ID_PATTERN = re.compile(
    r"^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$",
    re.IGNORECASE,
)
JOURNAL_DATE_PATTERN = re.compile(r"^journal-(\d{4})-(\d{1,2})-(\d{1,2})$")
JOURNAL_MOODS = {"Happy", "Good", "Okay", "Sad", "Angry", "Tired"}
JOURNAL_TEXT_FIELDS = ("day", "grateful", "learn", "goal")
MAX_JOURNAL_FIELD_LENGTH = 2000


# Supabase

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# --------------------
# Routes
# --------------------

def error_response(message, status_code):
    return {
        "status": "error",
        "message": message,
    }, status_code


def is_valid_account_id(user_id):
    return bool(ACCOUNT_ID_PATTERN.fullmatch(user_id))


def is_valid_journal_date(value):
    match = JOURNAL_DATE_PATTERN.fullmatch(value)
    if not match:
        return False

    try:
        calendar_date(*(int(part) for part in match.groups()))
    except ValueError:
        return False

    return True


def validate_journal_entry(payload):
    if not isinstance(payload, dict):
        return None, "Journal data must be a JSON object."

    user_id = str(payload.get("user_id", "")).strip()
    entry_date = str(payload.get("date", "")).strip()
    mood = payload.get("mood", "Happy")

    if not is_valid_account_id(user_id):
        return None, "A valid account ID is required."

    if not is_valid_journal_date(entry_date):
        return None, "A valid journal date is required."

    if not isinstance(mood, str) or mood not in JOURNAL_MOODS:
        return None, "The selected mood is not valid."

    clean_entry = {
        "user_id": user_id,
        "date": entry_date,
        "mood": mood,
    }

    for field in JOURNAL_TEXT_FIELDS:
        value = payload.get(field, "")
        if not isinstance(value, str):
            return None, f"{field} must be text."
        if len(value) > MAX_JOURNAL_FIELD_LENGTH:
            return None, f"{field} must be {MAX_JOURNAL_FIELD_LENGTH} characters or fewer."
        clean_entry[field] = value

    return clean_entry, None


@app.after_request
def disable_journal_caching(response):
    if request.path == "/journal":
        response.headers["Cache-Control"] = "no-store"
    return response


@app.errorhandler(413)
def journal_payload_too_large(_error):
    return error_response("Journal data is too large.", 413)


@app.get("/journal")
def getJournal():
    user_id = request.headers.get("X-Ascendra-Account-Id", request.args.get("user_id", "")).strip()

    if not is_valid_account_id(user_id):
        return error_response("A valid account ID is required.", 400)

    try:
        data = (
            supabase
            .table("journal")
            .select("user_id,date,mood,day,grateful,learn,goal")
            .eq("user_id", user_id)
            .execute()
        )
    except Exception:
        app.logger.exception("Could not load journal entries from Supabase.")
        return error_response("The journal service is temporarily unavailable.", 503)

    return data.data


@app.post("/journal")
def postJournal():
    newEntry = request.get_json(silent=True)
    clean_entry, validation_error = validate_journal_entry(newEntry)

    if validation_error:
        return error_response(validation_error, 400)

    user_id = clean_entry["user_id"]
    entry_date = clean_entry["date"]

    try:
        existing = (
            supabase
            .table("journal")
            .select("user_id")
            .eq("user_id", user_id)
            .eq("date", entry_date)
            .execute()
        )

        if existing.data:
            (
                supabase
                .table("journal")
                .update(clean_entry)
                .eq("user_id", user_id)
                .eq("date", entry_date)
                .execute()
            )
        else:
            (
                supabase
                .table("journal")
                .insert(clean_entry)
                .execute()
            )
    except Exception:
        app.logger.exception("Could not save a journal entry to Supabase.")
        return error_response("The journal service is temporarily unavailable.", 503)

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
