# Importing
from flask import Flask, request
from flask_cors import CORS
import json 

# Starting up
app = Flask(__name__)
CORS(app)

# Constants
JOURNAL_FILE = "storage/journal.json"

# ---------------

def loadJournal():
    with open(JOURNAL_FILE, "r") as file:
        return json.load(file)

def saveJournal(journal):
    with open(JOURNAL_FILE, "w") as file:
        json.dump(journal, file)

# ---------------

@app.get("/")
def health():
    return loadJournal()

@app.post("/journal")
def postJournal():
    journal = loadJournal()



if __name__ == "__main__":
    app.run(debug=True)