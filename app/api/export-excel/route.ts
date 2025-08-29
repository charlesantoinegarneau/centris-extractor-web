import { NextRequest, NextResponse } from 'next/server';

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
    const csvHeader = 'Adresse,Prix,Type,Ville,Rue\r\n';
    const csvData = properties.map((prop: { address: string; price: string; type: string; city?: string; street?: string }) => 
      `"${prop.address.replace(/"/g, '""')}","${prop.price.replace(/"/g, '""')}","${prop.type.replace(/"/g, '""')}","${(prop.city || '').replace(/"/g, '""')}","${(prop.street || '').replace(/"/g, '""')}"`
    ).join('\r\n');
    
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