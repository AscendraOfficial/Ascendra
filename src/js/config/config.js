const APP_CONFIG = {
  name: "Ascendra",
  version: "1.1.0-beta",
  update: "Horizon",
};

let API_URL;

if (
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
) {
  API_URL = "http://127.0.0.1:5000";
} else {
  API_URL = "https://ascendra-oc22.onrender.com";
}
