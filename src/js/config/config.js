const APP_CONFIG = {
  name: "Ascendra",
  version: "1.1.3-beta",
  update: "Horizon",
  publicUrl: "https://ascendraofficial.github.io/Ascendra/",
};

let API_URL;

// If running from the file system (file://) or served locally, use local backend for development
if (window.location.protocol === "file:" || window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
  API_URL = "http://127.0.0.1:5000";
} else {
  API_URL = "https://ascendra-oc22.onrender.com";
}
