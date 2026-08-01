# Importing
from flask import Flask, request
from flask_cors import CORS
import json 

# Starting up
app = Flask(__name__)
CORS(app)

# Constants
JOURNAL_FILE = "storage/journal.json"

# Fuctions

def loadJournal():
    with open(JOURNAL_FILE, "r") as file:
        return json.load(file)

def saveJournal(journal):
    with open(JOURNAL_FILE, "w") as file:
        json.dump(journal, file, indent=4)

# ---------------

@app.get("/")
def health():
    return loadJournal()

@app.post("/journal")
def postJournal():
    journal = loadJournal()
    newEntry = request.get_json()
    entryFound = False

    for entry in journal:
        if entry.get("date") == newEntry.get("date"):
            entry.update(newEntry)
            entryFound = True
            break
    if not entryFound:
        journal.append(newEntry)
        
    saveJournal(journal)

    return {
        "status": "success"
    }

if __name__ == "__main__":
    app.run(debug=True)