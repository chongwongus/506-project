from flask import Flask,request, Response, send_from_directory
from datetime import datetime

app = Flask(__name__, static_folder='build')

# Log file path
LOG_FILE = "app.log"

# Function to log endpoint hits
def log_message(endpoint):
    with open(LOG_FILE, "a") as log_file:
        log_file.write(f"{datetime.now()} - {endpoint} endpoint was accessed\n")

# Serve React static files
@app.route('/')
def serve_react():
    log_message(app.static_folder)
    return send_from_directory(app.static_folder, 'index.html')

# Serve other static files (e.g., JS, CSS)
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)