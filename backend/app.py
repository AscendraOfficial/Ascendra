# Importing
from flask import Flask
from flask_cors import CORS

# Starting up
app = Flask(__name__)
CORS(app)

# ---------------

@app.get("/")
def home():
    return {
        "startup_message": "Ascendra backend lived to see another day",
        "status": "online"
    }

@app.get("/health")
def health():
    return {
        "status": "online",
        "app": "Ascendra"
    }

if __name__ == "__main__":
    app.run(debug=True)