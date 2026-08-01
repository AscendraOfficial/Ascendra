from flask import Flask

app = Flask(__name__)

@app.get("/")
def home():
    return "Ascendra backend lived to see another day"

if __name__ == "__main__":
    app.run(debug=True)