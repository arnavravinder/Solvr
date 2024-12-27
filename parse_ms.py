from flask import Flask, request, jsonify
from flask_cors import CORS
import tabula
import os, uuid
import pandas as pd

app = Flask(__name__)
CORS(app)  # <-- add this line
UPLOAD_FOLDER = "./temp_uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/uploadPapers", methods=["POST"])
def upload_papers():
    qp_file = request.files.get("qp")
    ms_file = request.files.get("ms")
    if not qp_file or not ms_file:
        return jsonify({"error":"Missing QP or MS"}),400
    qp_filename = str(uuid.uuid4())+"_"+qp_file.filename
    ms_filename = str(uuid.uuid4())+"_"+ms_file.filename
    qp_path = os.path.join(UPLOAD_FOLDER, qp_filename)
    ms_path = os.path.join(UPLOAD_FOLDER, ms_filename)
    qp_file.save(qp_path)
    ms_file.save(ms_path)
    try:
        df_list = tabula.read_pdf(ms_path, pages="all", lattice=True)
        combined_df = pd.concat(df_list, ignore_index=True)
        combined_df.dropna(subset=["Question","Answer"], inplace=True)
        combined_df = combined_df.sort_values("Question")
        answers_list = combined_df["Answer"].tolist()
        num_questions = len(answers_list)
        return jsonify({"answers":answers_list,"numQuestions":num_questions})
    except Exception as e:
        return jsonify({"error":str(e)}),500

if __name__=="__main__":
    app.run(debug=True,port=5000)
