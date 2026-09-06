# Importing

from flask import Flask, request
from flask_cors import CORS
import os
from supabase import create_client


# Starting up

app = Flask(__name__)

default_origins = [
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

@app.get("/journal")
def getJournal():
    user_id = request.args.get("user_id", "").strip()

    if not user_id:
        return {
            "status": "error",
            "message": "user_id is required"
        }, 400

    data = (
        supabase
        .table("journal")
        .select("user_id,date,mood,day,grateful,learn,goal")
        .eq("user_id", user_id)
        .execute()
    )

    return data.data


@app.post("/journal")
def postJournal():
    newEntry = request.get_json(silent=True)

    if not newEntry:
        return {
            "status": "error",
            "message": "No journal data received"
        }, 400

    user_id = str(newEntry.get("user_id", "")).strip()
    date = str(newEntry.get("date", "")).strip()

    if not user_id or not date:
        return {
            "status": "error",
            "message": "user_id and date are required"
        }, 400

    allowed_fields = ("user_id", "date", "mood", "day", "grateful", "learn", "goal")
    clean_entry = {
        field: newEntry[field]
        for field in allowed_fields
        if field in newEntry
    }
    clean_entry["user_id"] = user_id
    clean_entry["date"] = date

    existing = (
        supabase
        .table("journal")
        .select("*")
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
