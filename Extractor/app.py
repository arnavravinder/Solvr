import os
import json
from PyPDF2 import PdfReader

def extract_answers_from_pdf(file_path):
    reader = PdfReader(file_path)
    answers = []
    last_question = 35  # Extract up to Q35

    for page in reader.pages:
        text = page.extract_text()
        lines = text.splitlines()
        for line in lines:
            parts = line.split()
            if len(parts) >= 2 and parts[0].isdigit():  # Detect valid question lines
                question_number = int(parts[0])
                if question_number <= last_question:
                    answer = parts[1]
                    if "/" in answer:
                        answers.append(answer.split("/"))  # Multi-answer as sub-array
                    else:
                        answers.append(answer)  # Single answer
    # Add placeholders for Q35-Q37
    answers.extend([["", ""], ["", ""], ["", ""]])
    return answers

def process_pdfs(directory):
    output = {}
    for filename in sorted(os.listdir(directory)):
        if filename.endswith(".pdf"):
            parts = filename.split("_")
            if len(parts) >= 4:
                series, ms = parts[1], parts[3].split(".")[0]
                # Feb/March (m): ms_12 only | May/June (s), Oct/Nov (w): all papers
                if (series.startswith("m") and ms == "ms_12") or (series.startswith(("s", "w"))):
                    paper_code = filename.replace(".pdf", "")
                    file_path = os.path.join(directory, filename)
                    answers = extract_answers_from_pdf(file_path)
                    output[paper_code] = answers

    # Write proper JSON format
    with open("output.json", "w") as json_file:
        json.dump(output, json_file, indent=2)

if __name__ == "__main__":
    directory = input("Enter the directory path containing the PDFs: ").strip()
    if not directory:
        directory = "."  # Default to current directory
    process_pdfs(directory)
    print("✅ Answers extracted and saved to output.json in proper JSON format.")
