/**
 * API service for Centris Extractor backend
 */

export interface PropertyData {
  address: string;
  price: string;
  type: string;
  city?: string;
  street?: string;
}

export interface ExtractResponse {
  success: boolean;
  filename: string;
  total_properties: number;
  properties: PropertyData[];
  message: string;
}

export interface ExportRequest {
  filename: string;
  properties: PropertyData[];
}

// API Configuration - Use Vercel API routes for serverless deployment
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? ''  // Use relative URLs for Vercel API routes
  : 'http://localhost:8001';  // Local FastAPI backend for development

class CentrisAPI {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Upload and extract PDF data
   */
  async extractPDF(file: File): Promise<ExtractResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Use Vercel API route in production, FastAPI locally
    const endpoint = this.baseURL ? `${this.baseURL}/extract-pdf` : '/api/extract-pdf';

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Export data to Excel
   */
  async exportToExcel(data: ExportRequest): Promise<Blob> {
    // Use Vercel API route in production, FastAPI locally
    const endpoint = this.baseURL ? `${this.baseURL}/export-excel` : '/api/export-excel';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ api: string; extraction_service: string }> {
    // Use Vercel API route in production, FastAPI locally
    const endpoint = this.baseURL ? `${this.baseURL}/health` : '/api/health';
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Test connection to backend
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.error('Backend connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const centrisAPI = new CentrisAPI();

// Export class for custom instances
export { CentrisAPI };

// Utility function to download blob as file with proper MIME type
export function downloadBlob(blob: Blob, filename: string) {
  // Ensure CSV has proper MIME type for Excel compatibility
  const csvBlob = new Blob([blob], { 
    type: 'text/csv; charset=utf-8' 
  });
  
  const url = window.URL.createObjectURL(csvBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : filename.replace(/\.[^/.]+$/, '.csv');
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}