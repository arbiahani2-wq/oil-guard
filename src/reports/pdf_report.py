from fpdf import FPDF
from src.pipeline.types import PipelineResult
import datetime
import os

class PDF(FPDF):
    def header(self):
        # Header banner
        self.set_fill_color(10, 25, 47) # Dark ocean blue
        self.rect(0, 0, 210, 30, 'F')
        
        self.set_y(10)
        self.set_text_color(255, 255, 255)
        self.set_font("helvetica", "B", 18)
        self.cell(0, 10, "OilGuard Intelligence Report", border=False, ln=True, align="L")
        
        self.set_font("helvetica", "", 10)
        self.set_text_color(0, 229, 255) # Signal cyan
        self.cell(0, 5, "MARITIME SENTINEL SUMMARY", ln=True, align="L")
        self.ln(15)

    def footer(self):
        self.set_y(-15)
        self.set_text_color(150, 150, 150)
        self.set_font("helvetica", "I", 8)
        self.cell(0, 10, f"Generated automatically by OilGuard | Page {self.page_no()}", align="C")

def generate_pdf_report(result: PipelineResult, output_path: str):
    """
    Generates a beautifully formatted PDF report summarizing the oil spill analysis.
    """
    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # ---------------------------------------------------------
    # Meta Information Card
    # ---------------------------------------------------------
    pdf.set_fill_color(245, 247, 250)
    pdf.rect(10, 35, 190, 25, 'F')
    
    date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    image_name = os.path.basename(result.image_path) if result.image_path else "Unknown"
    
    pdf.set_y(38)
    pdf.set_x(15)
    pdf.set_text_color(100, 100, 110)
    pdf.set_font("helvetica", "B", 8)
    pdf.cell(90, 5, "DATE OF ANALYSIS", ln=False)
    pdf.cell(90, 5, "SOURCE IMAGERY", ln=True)
    
    pdf.set_x(15)
    pdf.set_text_color(30, 40, 50)
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(90, 8, date_str, ln=False)
    pdf.cell(90, 8, image_name, ln=True)
    
    pdf.ln(10)
    
    # ---------------------------------------------------------
    # Risk Assessment
    # ---------------------------------------------------------
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(10, 25, 47)
    pdf.cell(0, 10, "Risk Assessment", ln=True)
    
    risk_level = result.risk_report.level if result.risk_report else "LOW"
    
    # Define colors
    if risk_level == "CRITICAL":
        r, g, b = 255, 59, 71
    elif risk_level == "HIGH":
        r, g, b = 255, 112, 67
    elif risk_level == "MEDIUM":
        r, g, b = 255, 193, 7
    else:
        r, g, b = 0, 230, 118
        
    pdf.set_fill_color(r, g, b)
    pdf.rect(10, pdf.get_y(), 5, 20, 'F')
    
    pdf.set_x(20)
    pdf.set_text_color(r, g, b)
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, f"{risk_level} RISK", ln=True)
    
    pdf.set_x(20)
    pdf.set_text_color(100, 100, 100)
    pdf.set_font("helvetica", "", 10)
    
    if result.risk_report and result.risk_report.reasons:
        for reason in result.risk_report.reasons:
            clean_reason = reason.replace("km²", "km2")
            pdf.set_x(20)
            pdf.multi_cell(w=170, h=6, text=f"* {clean_reason}")
    else:
        pdf.set_x(20)
        pdf.cell(0, 6, "No specific risk factors detected.")
        
    pdf.ln(10)

    # ---------------------------------------------------------
    # Spatial Metrics
    # ---------------------------------------------------------
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(10, 25, 47)
    pdf.cell(0, 10, "Spill Metrics", ln=True)
    
    pdf.set_fill_color(245, 247, 250)
    pdf.rect(10, pdf.get_y(), 190, 30, 'F')
    
    pdf.set_y(pdf.get_y() + 5)
    
    if result.total_area_km2 > 0:
        pdf.set_x(15)
        pdf.set_text_color(100, 100, 110)
        pdf.set_font("helvetica", "B", 8)
        pdf.cell(60, 5, "TOTAL AREA", ln=False)
        pdf.cell(60, 5, "LATITUDE", ln=False)
        pdf.cell(60, 5, "LONGITUDE", ln=True)
        
        pdf.set_x(15)
        pdf.set_text_color(0, 180, 200)
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(60, 8, f"{result.total_area_km2:.2f} km2", ln=False)
        pdf.set_text_color(30, 40, 50)
        pdf.cell(60, 8, f"{result.center_lat:.4f} N", ln=False)
        pdf.cell(60, 8, f"{result.center_lon:.4f} E", ln=True)
    else:
        pdf.set_x(15)
        pdf.set_text_color(0, 150, 0)
        pdf.set_font("helvetica", "B", 12)
        pdf.cell(0, 15, "No spill zones detected in this region.", ln=True)

    pdf.ln(10)
    
    # ---------------------------------------------------------
    # Nearby Infrastructures
    # ---------------------------------------------------------
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(10, 25, 47)
    pdf.cell(0, 10, "Nearby Infrastructures (OGIM)", ln=True)
    
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(50, 50, 50)
    
    if not result.nearest_infrastructures:
        pdf.cell(0, 8, "No active infrastructures found in the vicinity.", ln=True)
    else:
        # Table Header
        pdf.set_fill_color(230, 235, 240)
        pdf.set_font("helvetica", "B", 9)
        pdf.cell(70, 8, " Facility Name", border=1, fill=True)
        pdf.cell(40, 8, " Type", border=1, fill=True)
        pdf.cell(50, 8, " Operator", border=1, fill=True)
        pdf.cell(30, 8, " Distance", border=1, fill=True, ln=True)
        
        pdf.set_font("helvetica", "", 9)
        for inf in result.nearest_infrastructures:
            pdf.cell(70, 8, f" {inf.name}", border=1)
            pdf.cell(40, 8, f" {inf.fac_type}", border=1)
            # truncate operator
            operator_name = (inf.operator[:22] + '..') if len(inf.operator) > 22 else inf.operator
            pdf.cell(50, 8, f" {operator_name}", border=1)
            pdf.cell(30, 8, f" {inf.distance_km:.2f} km", border=1, ln=True)
            
    # ---------------------------------------------------------
    # Output Mask
    # ---------------------------------------------------------
    if result.mask_path:
        pdf.add_page()
        pdf.set_font("helvetica", "B", 14)
        pdf.set_text_color(10, 25, 47)
        pdf.cell(0, 10, "Spill Segmentation Mask", ln=True)
        
        pdf.set_font("helvetica", "", 10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 5, "Visual representation of the detected oil spill boundaries.", ln=True)
        pdf.ln(5)
        
        try:
            pdf.set_fill_color(240, 240, 240)
            pdf.rect(25, pdf.get_y(), 160, 160, 'F')
            pdf.image(result.mask_path, x=30, y=pdf.get_y()+5, w=150)
        except Exception as e:
            pdf.set_text_color(200, 0, 0)
            pdf.cell(0, 8, f"Could not load mask image: {e}", ln=True)
            
    pdf.output(output_path)
    result.pdf_report_path = output_path
