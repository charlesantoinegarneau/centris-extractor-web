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

    // Create simple CSV data (Excel alternative for serverless)
    const csvHeader = 'Adresse,Prix,Type,Ville,Rue\n';
    const csvData = properties.map((prop: any) => 
      `"${prop.address}","${prop.price}","${prop.type}","${prop.city || ''}","${prop.street || ''}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvData;
    
    // Return CSV file (Excel-compatible)
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename?.replace('.pdf', '.csv') || 'centris_extraction.csv'}"`
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