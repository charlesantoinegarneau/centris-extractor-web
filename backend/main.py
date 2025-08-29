#!/usr/bin/env python3
"""
FastAPI Backend for Centris Extractor Web
Provides PDF extraction endpoints for the Next.js frontend
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import io
import json
from typing import List, Dict, Any
import tempfile
import os
from pathlib import Path

# Import our extraction logic
from core.pdf_extractor import extract_pdf_data_wrapper as extract_pdf_data

app = FastAPI(
    title="Centris Extractor API",
    description="API for extracting real estate data from Centris PDF files",
    version="1.0.0"
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:8080",
        "https://*.vercel.app",
        "https://centris-extractor-*.vercel.app",
        "https://centris-extractor-web.vercel.app",
        "https://centris-extractor-ge1zksn76-charles-antoines-projects-128c98b8.vercel.app",
        # Add Render domains
        "https://*.onrender.com",
        "https://centris-extractor-backend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Centris Extractor API is running!",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "api": "healthy",
        "extraction_service": "ready",
        "supported_formats": ["PDF"],
        "max_file_size": "10MB"
    }

@app.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    """
    Extract real estate data from uploaded Centris PDF
    """
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=400, 
                detail="File must be a PDF"
            )
        
        # Check file size (10MB limit)
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 10MB"
            )
        
        # Read file content
        pdf_content = await file.read()
        
        # Save to temporary file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(pdf_content)
            temp_file_path = temp_file.name
        
        try:
            # Extract data using our Python script
            extracted_data = extract_pdf_data(temp_file_path)
            
            # Format response
            response = {
                "success": True,
                "filename": file.filename,
                "total_properties": len(extracted_data) if extracted_data else 0,
                "properties": extracted_data or [],
                "message": f"Successfully extracted {len(extracted_data) if extracted_data else 0} properties"
            }
            
            return JSONResponse(content=response)
            
        except Exception as extraction_error:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to extract data from PDF: {str(extraction_error)}"
            )
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.post("/export-excel")
async def export_excel(data: Dict[str, Any]):
    """
    Export extracted data to Excel format
    """
    try:
        properties = data.get('properties', [])
        filename = data.get('filename', 'centris_extraction.xlsx')
        
        if not properties:
            raise HTTPException(
                status_code=400,
                detail="No data provided for export"
            )
        
        # Convert to DataFrame
        df = pd.DataFrame(properties)
        
        # Create Excel file in memory
        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Centris Data')
            
            # Auto-adjust column widths
            worksheet = writer.sheets['Centris Data']
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width
        
        excel_buffer.seek(0)
        
        # Return file response
        from fastapi.responses import StreamingResponse
        
        return StreamingResponse(
            io.BytesIO(excel_buffer.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename.replace('.pdf', '.xlsx')}"
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate Excel export: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.environ.get("PORT", 8001))
    
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=False,  # Disable reload in production
        log_level="info"
    )