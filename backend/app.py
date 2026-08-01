# Importing
from flask import Flask
from flask_cors import CORS

# Starting up
app = Flask(__name__)
CORS(app)

# ---------------

@app.get("/")
def health():
    return {
        "status": "online",
        "app": "Ascendra"
    }



if __name__ == "__main__":
    app.run(debug=True)