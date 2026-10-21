"""Smart Darshan prediction service (Flask).

Endpoints (called by the Node.js API, not the browser):
  GET  /health               service status and trained temples
  POST /train                {templeId, records: [{hour, dayOfWeek, month, isFestival, entries}]}
  POST /predict              {templeId, rows: [{hour, dayOfWeek, month, isFestival}]}
  GET  /models/<templeId>    metrics of a trained model

Run locally:  python app.py   (listens on http://127.0.0.1:8000)
Production:   gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120

When ML_API_KEY is set, every endpoint except /health requires the header
"X-Api-Key: <ML_API_KEY>", so a publicly hosted service cannot be used by others.
"""

import hmac
import os
from pathlib import Path

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from model import ModelError, ModelStore

app = Flask(__name__)
store = ModelStore(Path(os.environ.get("MODELS_DIR", Path(__file__).parent / "models")))
API_KEY = os.environ.get("ML_API_KEY", "")


@app.before_request
def require_api_key():
    if not API_KEY or request.path == "/health":
        return None
    if not hmac.compare_digest(request.headers.get("X-Api-Key", ""), API_KEY):
        return jsonify({"error": "Invalid or missing API key"}), 401
    return None


@app.errorhandler(ModelError)
def handle_model_error(err: ModelError):
    return jsonify({"error": str(err)}), err.status


@app.errorhandler(Exception)
def handle_unexpected(err: Exception):
    if isinstance(err, HTTPException):
        return jsonify({"error": err.description}), err.code
    app.logger.exception(err)
    return jsonify({"error": "Prediction service error"}), 500


def json_body() -> dict:
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ModelError("Expected a JSON object body")
    return body


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "smart-darshan-ml", "trainedTemples": store.list_ids()})


@app.post("/train")
def train():
    body = json_body()
    return jsonify(store.train(str(body.get("templeId", "")), body.get("records")))


@app.post("/predict")
def predict():
    body = json_body()
    return jsonify(store.predict(str(body.get("templeId", "")), body.get("rows")))


@app.get("/models/<temple_id>")
def model_info(temple_id: str):
    return jsonify(store.metadata(temple_id))


if __name__ == "__main__":
    # Hosts such as Render pass the port in PORT; ML_HOST=0.0.0.0 accepts outside connections.
    port = int(os.environ.get("PORT") or os.environ.get("ML_PORT", "8000"))
    app.run(host=os.environ.get("ML_HOST", "127.0.0.1"), port=port, debug=False)
