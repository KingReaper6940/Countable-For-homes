from pathlib import Path
from reportlab.pdfgen import canvas

target = Path(__file__).resolve().parents[1] / 'tests' / 'fixtures'
target.mkdir(parents=True, exist_ok=True)

text_pdf = canvas.Canvas(str(target / 'synthetic-occupancy-text.pdf'))
text_pdf.drawString(72, 700, 'Synthetic A3 occupancy nine apartments')
text_pdf.save()

blank_pdf = canvas.Canvas(str(target / 'synthetic-occupancy-blank.pdf'))
blank_pdf.showPage()
blank_pdf.save()
