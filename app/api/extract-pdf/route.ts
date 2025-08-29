import { NextRequest, NextResponse } from 'next/server';

interface PythonPropertyData {
  'Centris #'?: string;
  'Adresse complète'?: string;
  'Quartier'?: string;
  'Type de propriété'?: string;
  'Prix actuel'?: string;
  'Prix original'?: string;
  'Propriétaire(s)'?: string;
  'Propriétaire(s): nom(s) et adresse(s)'?: string;
  'Représentant(s)'?: string;
  'Représentant(s): nom(s) et adresse(s)'?: string;
  'Courtier(s): nom(s)'?: string;
  'Courtier(s): téléphone(s)'?: string;
  'Courtier(s): courriel(s)'?: string;
  // Basic fallback fields
  address?: string;
  price?: string;
  type?: string;
  city?: string;
  street?: string;
}

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

    // Try to use external Python backend for real extraction
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL;
    
    if (pythonBackendUrl) {
      try {
        // Forward the request to the Python backend
        const backendFormData = new FormData();
        backendFormData.append('file', file);
        
        const backendResponse = await fetch(`${pythonBackendUrl}/extract-pdf`, {
          method: 'POST',
          body: backendFormData,
        });
        
        if (backendResponse.ok) {
          const backendData = await backendResponse.json();
          
          // Transform Python backend response to match our interface
          const transformedProperties = backendData.properties?.map((prop: PythonPropertyData) => ({
            // Basic fields for compatibility
            address: prop['Adresse complète'] || prop.address || 'N/A',
            price: prop['Prix actuel'] || prop.price || 'N/A',
            type: prop['Type de propriété'] || prop.type || 'N/A',
            city: prop.city || extractCityFromAddress(prop['Adresse complète'] || prop.address || ''),
            street: prop.street || extractStreetFromAddress(prop['Adresse complète'] || prop.address || ''),
            
            // Enhanced fields from Python backend
            'Centris #': prop['Centris #'] || '',
            'Adresse complète': prop['Adresse complète'] || '',
            'Quartier': prop['Quartier'] || '',
            'Type de propriété': prop['Type de propriété'] || '',
            'Prix actuel': prop['Prix actuel'] || '',
            'Prix original': prop['Prix original'] || '',
            'Propriétaire(s): nom(s) et adresse(s)': prop['Propriétaire(s)'] || prop['Propriétaire(s): nom(s) et adresse(s)'] || '',
            'Représentant(s): nom(s) et adresse(s)': prop['Représentant(s)'] || prop['Représentant(s): nom(s) et adresse(s)'] || '',
            'Courtier(s): nom(s)': prop['Courtier(s): nom(s)'] || '',
            'Courtier(s): téléphone(s)': prop['Courtier(s): téléphone(s)'] || '',
            'Courtier(s): courriel(s)': prop['Courtier(s): courriel(s)'] || ''
          })) || [];
          
          return NextResponse.json({
            success: true,
            filename: file.name,
            total_properties: transformedProperties.length,
            properties: transformedProperties,
            message: `Extraction réussie de ${file.name} - ${transformedProperties.length} propriétés trouvées`,
            extraction_method: 'python_backend'
          });
        }
      } catch (backendError) {
        console.error('Python backend failed:', backendError);
        // Fall through to demo data
      }
    }

    // Fallback: return enhanced demo data that simulates the full format
    const demoData = {
      success: true,
      filename: file.name,
      total_properties: 3,
      properties: [
        {
          // Basic fields
          address: `4134 Rue Wellington, Montréal (Verdun)`,
          price: "425,000 $",
          type: "Condo",
          city: "Montréal",
          street: "Rue Wellington",
          
          // Enhanced demo fields
          'Centris #': "10786940",
          'Adresse complète': "4134 Rue Wellington, Montréal (Verdun/Île-des-Soeurs) H4G 1V4",
          'Quartier': "Verdun/Île-des-Soeurs", 
          'Type de propriété': "Condo - 2 chambres",
          'Prix actuel': "425 000 $",
          'Prix original': "450 000 $",
          'Propriétaire(s): nom(s) et adresse(s)': "ABC Immobilier Inc., 1234 Rue Example, Montréal",
          'Représentant(s): nom(s) et adresse(s)': "Jean Dupont, 5678 Avenue Test, Montréal",
          'Courtier(s): nom(s)': "Marie Tremblay",
          'Courtier(s): téléphone(s)': "(514) 123-4567",
          'Courtier(s): courriel(s)': "marie.tremblay@example.com"
        },
        {
          address: "1234 Avenue du Parc, Montréal",
          price: "385,000 $", 
          type: "Appartement",
          city: "Montréal",
          street: "Avenue du Parc",
          
          'Centris #': "10786941",
          'Adresse complète': "1234 Avenue du Parc, Montréal (Plateau Mont-Royal) H2X 3A1",
          'Quartier': "Plateau Mont-Royal",
          'Type de propriété': "Appartement - 3 chambres",
          'Prix actuel': "385 000 $",
          'Prix original': "385 000 $",
          'Propriétaire(s): nom(s) et adresse(s)': "XYZ Properties Ltd., 9876 Boulevard Saint-Laurent, Montréal",
          'Représentant(s): nom(s) et adresse(s)': "Pierre Lavoie, 4321 Rue Sainte-Catherine, Montréal", 
          'Courtier(s): nom(s)': "Sophie Gagnon",
          'Courtier(s): téléphone(s)': "(514) 987-6543",
          'Courtier(s): courriel(s)': "sophie.gagnon@example.com"
        },
        {
          address: "567 Rue Sherbrooke, Montréal",
          price: "520,000 $",
          type: "Maison",
          city: "Montréal", 
          street: "Rue Sherbrooke",
          
          'Centris #': "10786942",
          'Adresse complète': "567 Rue Sherbrooke Est, Montréal (Ville-Marie) H2L 1K2",
          'Quartier': "Ville-Marie",
          'Type de propriété': "Maison unifamiliale",
          'Prix actuel': "520 000 $", 
          'Prix original': "500 000 $",
          'Propriétaire(s): nom(s) et adresse(s)': "Résidences Sherbrooke SENC, 2468 Rue Notre-Dame, Montréal",
          'Représentant(s): nom(s) et adresse(s)': "Luc Martin, 1357 Avenue Mont-Royal, Montréal",
          'Courtier(s): nom(s)': "Catherine Roy",
          'Courtier(s): téléphone(s)': "(514) 555-7890", 
          'Courtier(s): courriel(s)': "catherine.roy@example.com"
        }
      ],
      message: `Extraction démo de ${file.name} (Backend Python indisponible)`,
      extraction_method: 'demo_data'
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

// Helper functions for address parsing
function extractCityFromAddress(address: string): string {
  const cityMatch = address.match(/,\s*([^,()]+)(?:\s*\([^)]+\))?/);
  return cityMatch ? cityMatch[1].trim() : '';
}

function extractStreetFromAddress(address: string): string {
  const streetMatch = address.match(/^[^,]+/);
  return streetMatch ? streetMatch[0].trim() : '';
}