import { NextRequest, NextResponse } from 'next/server';

interface ExportPropertyData {
  'Centris #'?: string;
  'Adresse complète'?: string;
  'Quartier'?: string;
  'Type de propriété'?: string;
  'Prix actuel'?: string;
  'Prix original'?: string;
  'Propriétaire(s): nom(s) et adresse(s)'?: string;
  'Représentant(s): nom(s) et adresse(s)'?: string;
  'Courtier(s): nom(s)'?: string;
  'Courtier(s): téléphone(s)'?: string;
  'Courtier(s): courriel(s)'?: string;
  // Basic fields for backward compatibility
  address?: string;
  price?: string;
  type?: string;
  city?: string;
  street?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { properties, filename } = body;

    if (!properties || !Array.isArray(properties)) {
      return NextResponse.json(
        { error: 'Invalid properties data' }, 
        { status: 400 }
      );
    }

    // Create Excel-compatible CSV with BOM for proper encoding
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    
    // Check if we have enhanced data (11 columns) or basic data (5 columns)
    const hasEnhancedData = properties.length > 0 && properties[0]['Centris #'];
    
    let csvHeader: string;
    let csvData: string;
    
    if (hasEnhancedData) {
      // Enhanced format with all 11 columns
      csvHeader = 'Centris #,Adresse complète,Quartier,Type de propriété,Prix actuel,Prix original,Propriétaire(s): nom(s) et adresse(s),Représentant(s): nom(s) et adresse(s),Courtier(s): nom(s),Courtier(s): téléphone(s),Courtier(s): courriel(s)\r\n';
      csvData = properties.map((prop: ExportPropertyData) => {
        const values = [
          prop['Centris #'] || '',
          prop['Adresse complète'] || prop.address || '',
          prop['Quartier'] || '',
          prop['Type de propriété'] || prop.type || '',
          prop['Prix actuel'] || prop.price || '',
          prop['Prix original'] || '',
          prop['Propriétaire(s): nom(s) et adresse(s)'] || '',
          prop['Représentant(s): nom(s) et adresse(s)'] || '',
          prop['Courtier(s): nom(s)'] || '',
          prop['Courtier(s): téléphone(s)'] || '',
          prop['Courtier(s): courriel(s)'] || ''
        ];
        return values.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
      }).join('\r\n');
    } else {
      // Basic format (backward compatibility)
      csvHeader = 'Adresse,Prix,Type,Ville,Rue\r\n';
      csvData = properties.map((prop: { address: string; price: string; type: string; city?: string; street?: string }) => 
        `"${prop.address.replace(/"/g, '""')}","${prop.price.replace(/"/g, '""')}","${prop.type.replace(/"/g, '""')}","${(prop.city || '').replace(/"/g, '""')}","${(prop.street || '').replace(/"/g, '""')}"`
      ).join('\r\n');
    }
    
    const csvContent = BOM + csvHeader + csvData;
    
    // Return Excel-compatible CSV file
    const excelFilename = filename?.replace('.pdf', '.csv') || 'centris_extraction.csv';
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${excelFilename}"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { 
        error: 'Export failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}