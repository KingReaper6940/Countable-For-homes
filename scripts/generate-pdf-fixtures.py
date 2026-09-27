from pathlib import Path
from reportlab.pdfgen import canvas

target = Path(__file__).resolve().parents[1] / 'tests' / 'fixtures'
target.mkdir(parents=True, exist_ok=True)

text_pdf = canvas.Canvas(str(target / 'pdf-with-text.pdf'))
text_pdf.drawString(72, 700, 'PDF text extraction fixture')
text_pdf.save()

blank_pdf = canvas.Canvas(str(target / 'blank-pdf.pdf'))
blank_pdf.showPage()
blank_pdf.save()
