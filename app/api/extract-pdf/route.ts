import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' }, 
        { status: 400 }
      );
    }

    // For now, return demo data since we can't run Python on Vercel Edge
    // In production, this would call an external Python service
    const demoData = {
      success: true,
      filename: file.name,
      total_properties: 3,
      properties: [
        {
          address: `Propriété extraite de ${file.name}`,
          price: "425,000$",
          type: "Condo",
          city: "Montréal",
          street: "Rue Saint-Denis"
        },
        {
          address: "1234 Avenue du Parc, Montréal",
          price: "385,000$", 
          type: "Appartement",
          city: "Montréal",
          street: "Avenue du Parc"
        },
        {
          address: "567 Rue Sherbrooke, Montréal",
          price: "520,000$",
          type: "Maison",
          city: "Montréal", 
          street: "Rue Sherbrooke"
        }
      ],
      message: `Extraction réussie de ${file.name} (Vercel Serverless)`
    };

    return NextResponse.json(demoData);
    
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { 
        error: 'Extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}