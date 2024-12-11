import os
import re
from flask import Flask, request, render_template, send_file

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'  # Configura la directory per i caricamenti

def clean_vtt_file(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as input_file, open(output_path, 'w', encoding='utf-8') as output_file:
        lines = input_file.readlines()
        for line in lines:
            if re.match(r'^\d+\n$', line):
                output_file.write("\n")
            else:
                output_file.write(line)

@app.route("/", methods=["GET"])
def index():
    return render_template("avocado.html")

@app.route("/clean_vtt", methods=["POST"])
def clean_vtt():
    file = request.files.get("vttFile")
    if file and file.filename.endswith(".vtt"):
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{os.path.splitext(file.filename)[0]}_cleaned.vtt")
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        file.save(input_path)
        clean_vtt_file(input_path, output_path)
        return send_file(output_path, as_attachment=True)
    return "Invalid file format. Please upload a .vtt file."

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
