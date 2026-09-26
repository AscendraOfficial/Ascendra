# Importing

import hashlib
import json
import os
import re
import secrets
from datetime import date, datetime, timezone

from flask import Flask, request
from flask_cors import CORS
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from supabase import create_client
from werkzeug.security import check_password_hash, generate_password_hash


# Starting up

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 512 * 1024

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
        r"/sync/.*": {"origins": allowed_origins},
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
# Profile sync security
# --------------------

PROFILE_SYNC_TABLE = "profile_sync_accounts"
PROFILE_SYNC_TOKEN_MAX_AGE = 60 * 60 * 24 * 30
PROFILE_SYNC_SECRET = os.environ.get("ASCENDRA_PROFILE_SYNC_SECRET", "").strip()
PROFILE_SYNC_SERIALIZER = (
    URLSafeTimedSerializer(
        PROFILE_SYNC_SECRET,
        salt="ascendra-profile-sync-v1",
    )
    if PROFILE_SYNC_SECRET
    else None
)
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,20}$")
PROFILE_FIELDS = {
    "name",
    "surname",
    "bio",
    "profile_picture",
    "settings",
    "achievements",
    "progression",
    "streak",
    "tasks_completed",
}


def sync_unavailable():
    return json_error(
        "Profile sync is not configured on this server.",
        503,
        "profile_sync_unavailable",
    )


def normalize_sync_username(value):
    username = str(value or "").strip()

    if not USERNAME_PATTERN.fullmatch(username):
        return ""

    return username


def clean_sync_profile(value):
    if not isinstance(value, dict):
        return None

    if any(key not in PROFILE_FIELDS for key in value):
        return None

    profile = {}

    for field in ("name", "surname"):
        field_value = value.get(field, "")
        if not isinstance(field_value, str) or len(field_value) > 60:
            return None
        profile[field] = field_value

    bio = value.get("bio", "")
    if not isinstance(bio, str) or len(bio) > 2_000:
        return None
    profile["bio"] = bio

    profile_picture = value.get("profile_picture", "")
    if not isinstance(profile_picture, str) or len(profile_picture) > 300_000:
        return None
    profile["profile_picture"] = profile_picture

    settings = value.get("settings", {})
    achievements = value.get("achievements", [])
    progression = value.get("progression", {})
    streak = value.get("streak", 0)
    tasks_completed = value.get("tasks_completed", 0)

    if not isinstance(settings, dict):
        return None
    if not isinstance(achievements, (list, dict)):
        return None
    if not isinstance(progression, dict):
        return None
    if not isinstance(streak, (int, float, str, dict, list, type(None))):
        return None
    if not isinstance(tasks_completed, (int, float)):
        return None

    profile["settings"] = settings
    profile["achievements"] = achievements
    profile["progression"] = progression
    profile["streak"] = streak
    profile["tasks_completed"] = tasks_completed

    try:
        serialized = json.dumps(
            profile,
            separators=(",", ":"),
            ensure_ascii=False,
        )
    except (TypeError, ValueError):
        return None

    if len(serialized.encode("utf-8")) > 400_000:
        return None

    return profile


def sync_account_by_username(username):
    username_key = username.casefold()
    result = (
        supabase
        .table(PROFILE_SYNC_TABLE)
        .select(
            "account_id,username,username_key,password_hash,"
            "profile,profile_version,updated_at"
        )
        .eq("username_key", username_key)
        .limit(1)
        .execute()
    )

    return result.data[0] if result.data else None


def sync_account_by_id(account_id):
    result = (
        supabase
        .table(PROFILE_SYNC_TABLE)
        .select(
            "account_id,username,username_key,password_hash,"
            "profile,profile_version,updated_at"
        )
        .eq("account_id", account_id)
        .limit(1)
        .execute()
    )

    return result.data[0] if result.data else None


def create_sync_token(account):
    if not PROFILE_SYNC_SERIALIZER:
        return ""

    return PROFILE_SYNC_SERIALIZER.dumps(
        {
            "account_id": account["account_id"],
        }
    )


def get_sync_identity():
    if not PROFILE_SYNC_SERIALIZER:
        return None, sync_unavailable()

    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token.strip():
        return None, json_error(
            "Profile sync authentication is required.",
            401,
            "profile_sync_auth_missing",
        )

    try:
        identity = PROFILE_SYNC_SERIALIZER.loads(
            token.strip(),
            max_age=PROFILE_SYNC_TOKEN_MAX_AGE,
        )
    except SignatureExpired:
        return None, json_error(
            "Profile sync session expired.",
            401,
            "profile_sync_session_expired",
        )
    except BadSignature:
        return None, json_error(
            "Profile sync authentication failed.",
            403,
            "profile_sync_auth_denied",
        )

    account_id = normalize_user_id(identity.get("account_id"))

    if not account_id:
        return None, json_error(
            "Profile sync authentication failed.",
            403,
            "profile_sync_auth_denied",
        )

    return {
        "account_id": account_id,
    }, None


def require_sync_account(account_id):
    identity, auth_error = get_sync_identity()

    if auth_error:
        return None, auth_error

    if identity["account_id"] != account_id:
        return None, json_error(
            "Profile sync authentication does not match this account.",
            403,
            "profile_sync_account_mismatch",
        )

    account = sync_account_by_id(account_id)

    if not account:
        return None, json_error(
            "Profile sync account could not be verified.",
            403,
            "profile_sync_auth_denied",
        )

    return account, None


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

@app.after_request
def disable_sensitive_caching(response):
    if request.path in ("/journal", "/journal/claim") or request.path.startswith("/sync/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.errorhandler(413)
def payload_too_large(_error):
    if request.path.startswith("/sync/"):
        return json_error(
            "Profile sync data is too large.",
            413,
            "profile_sync_payload_too_large",
        )

    return json_error(
        "Journal data is too large.",
        413,
        "journal_payload_too_large",
    )


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


@app.post("/sync/account")
def createSyncAccount():
    if not PROFILE_SYNC_SERIALIZER:
        return sync_unavailable()

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return json_error(
            "Invalid profile sync account data.",
            400,
            "invalid_sync_account",
        )

    account_id = normalize_user_id(body.get("account_id"))
    username = normalize_sync_username(body.get("username"))
    password = body.get("password")
    profile = clean_sync_profile(body.get("profile", {}))

    if (
        not account_id
        or not username
        or not isinstance(password, str)
        or len(password) < 8
        or len(password) > 128
        or profile is None
    ):
        return json_error(
            "Invalid profile sync account data.",
            400,
            "invalid_sync_account",
        )

    if sync_account_by_id(account_id):
        return json_error(
            "This Ascendra account is already registered for profile sync.",
            409,
            "profile_sync_account_exists",
        )

    if sync_account_by_username(username):
        return json_error(
            "That username is already registered for profile sync.",
            409,
            "profile_sync_username_exists",
        )

    now = datetime.now(timezone.utc).isoformat()
    account = {
        "account_id": account_id,
        "username": username,
        "username_key": username.casefold(),
        "password_hash": generate_password_hash(
            password,
            method="pbkdf2:sha256:600000",
        ),
        "profile": profile,
        "profile_version": 1,
        "updated_at": now,
    }

    supabase.table(PROFILE_SYNC_TABLE).insert(account).execute()

    return {
        "status": "success",
        "account_id": account_id,
        "username": username,
        "profile": profile,
        "profile_version": 1,
        "updated_at": now,
        "token": create_sync_token(account),
    }, 201


@app.put("/sync/account/username")
def renameSyncUsername():
    body = request.get_json(silent=True)

    if not isinstance(body, dict):
        return json_error(
            "Invalid profile sync username data.",
            400,
            "invalid_sync_username",
        )

    account_id = normalize_user_id(body.get("account_id"))
    username = normalize_sync_username(body.get("username"))

    if not account_id or not username:
        return json_error(
            "Invalid profile sync username data.",
            400,
            "invalid_sync_username",
        )

    account, auth_error = require_sync_account(account_id)
    if auth_error:
        return auth_error

    username_key = username.casefold()
    existing = sync_account_by_username(username)

    if existing and existing.get("account_id") != account_id:
        return json_error(
            "That username is already registered for profile sync.",
            409,
            "profile_sync_username_exists",
        )

    now = datetime.now(timezone.utc).isoformat()

    result = (
        supabase
        .table(PROFILE_SYNC_TABLE)
        .update(
            {
                "username": username,
                "username_key": username_key,
                "updated_at": now,
            }
        )
        .eq("account_id", account_id)
        .execute()
    )

    if not result.data:
        return json_error(
            "Profile sync account could not be updated.",
            500,
            "profile_sync_update_failed",
        )

    updated_account = sync_account_by_id(account_id)

    return {
        "status": "success",
        "account_id": account_id,
        "username": username,
        "updated_at": now,
        "token": create_sync_token(updated_account),
    }


@app.post("/sync/login")
def loginSyncAccount():
    if not PROFILE_SYNC_SERIALIZER:
        return sync_unavailable()

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return json_error(
            "Invalid profile sync login.",
            400,
            "invalid_sync_login",
        )

    username = normalize_sync_username(body.get("username"))
    password = body.get("password")

    if (
        not username
        or not isinstance(password, str)
        or len(password) < 8
        or len(password) > 128
    ):
        return json_error(
            "Invalid profile sync login.",
            400,
            "invalid_sync_login",
        )

    account = sync_account_by_username(username)

    if not account or not check_password_hash(
        str(account.get("password_hash", "")),
        password,
    ):
        return json_error(
            "Wrong username or password.",
            401,
            "profile_sync_login_denied",
        )

    return {
        "status": "success",
        "account_id": account["account_id"],
        "username": account["username"],
        "profile": account.get("profile") or {},
        "profile_version": int(account.get("profile_version") or 1),
        "updated_at": account.get("updated_at"),
        "token": create_sync_token(account),
    }


@app.get("/sync/profile")
def getSyncProfile():
    account_id = normalize_user_id(request.args.get("account_id"))

    if not account_id:
        return json_error(
            "A valid account_id is required.",
            400,
            "invalid_user_id",
        )

    account, auth_error = require_sync_account(account_id)
    if auth_error:
        return auth_error

    return {
        "status": "success",
        "account_id": account["account_id"],
        "username": account["username"],
        "profile": account.get("profile") or {},
        "profile_version": int(account.get("profile_version") or 1),
        "updated_at": account.get("updated_at"),
    }


@app.put("/sync/profile")
def putSyncProfile():
    body = request.get_json(silent=True)

    if not isinstance(body, dict):
        return json_error(
            "Invalid profile sync data.",
            400,
            "invalid_sync_profile",
        )

    account_id = normalize_user_id(body.get("account_id"))
    profile = clean_sync_profile(body.get("profile"))
    base_version = body.get("base_version")

    if (
        not account_id
        or profile is None
        or not isinstance(base_version, int)
        or base_version < 1
    ):
        return json_error(
            "Invalid profile sync data.",
            400,
            "invalid_sync_profile",
        )

    account, auth_error = require_sync_account(account_id)
    if auth_error:
        return auth_error

    current_version = int(account.get("profile_version") or 1)

    if base_version != current_version:
        return {
            "status": "conflict",
            "code": "profile_sync_conflict",
            "message": "The cloud profile changed on another device.",
            "profile": account.get("profile") or {},
            "profile_version": current_version,
            "updated_at": account.get("updated_at"),
        }, 409

    next_version = current_version + 1
    now = datetime.now(timezone.utc).isoformat()

    result = (
        supabase
        .table(PROFILE_SYNC_TABLE)
        .update(
            {
                "profile": profile,
                "profile_version": next_version,
                "updated_at": now,
            }
        )
        .eq("account_id", account_id)
        .eq("profile_version", current_version)
        .execute()
    )

    if not result.data:
        latest = sync_account_by_id(account_id)
        return {
            "status": "conflict",
            "code": "profile_sync_conflict",
            "message": "The cloud profile changed on another device.",
            "profile": latest.get("profile") if latest else {},
            "profile_version": int(
                (latest or {}).get("profile_version") or current_version
            ),
            "updated_at": (latest or {}).get("updated_at"),
        }, 409

    return {
        "status": "success",
        "account_id": account_id,
        "profile": profile,
        "profile_version": next_version,
        "updated_at": now,
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
