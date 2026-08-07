# Importing

from flask import Flask, request
from flask_cors import CORS
import os
from supabase import create_client


# Starting up

app = Flask(__name__)
CORS(app)


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
    data = (
        supabase
        .table("journal")
        .select("*")
        .execute()
    )

    return data.data


@app.post("/journal")
def postJournal():
    newEntry = request.get_json()

    if not newEntry:
        return {
            "status": "error",
            "message": "No journal data received"
        }, 400

    user_id = newEntry.get("user_id")
    date = newEntry.get("date")

    if not user_id or not date:
        return {
            "status": "error",
            "message": "user_id and date are required"
        }, 400

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
            .update(newEntry)
            .eq("user_id", user_id)
            .eq("date", date)
            .execute()
        )

    else:
        (
            supabase
            .table("journal")
            .insert(newEntry)
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