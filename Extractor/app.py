from PyPDF2 import PdfReader
import json

pdf_path = '0455_s24_ms_13.pdf' # replace with path
output_file = 'output.json'

reader = PdfReader(pdf_path)
answers = []

for page in reader.pages:
    text = page.extract_text()
    for line in text.splitlines():
        parts = line.split()
        if parts and parts[0].isdigit():
            answer = parts[1].strip()
            if answer in {"A", "B", "C", "D"}:
                answers.append(answer)

output = {
    pdf_path: [
        answers[i] for i in range(len(answers))
    ]
}

with open(output_file, 'w') as f:
    json.dump(output, f, indent=2)
