# -*- coding: utf-8 -*-
"""
Adaptateur corrigé pour l'extracteur Centris
Retourne maintenant le format ORIGINAL avec 11 colonnes exactement comme attendu
"""

import sys
import os
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
import pandas as pd

# Import de l'extracteur existant
sys.path.append('/home/cag/centris-extractor')
from extract_centris import CentrisExtractor

class CentrisExtractorCorrect:
    """
    Adaptateur qui utilise l'extracteur existant et retourne les données
    au format ORIGINAL attendu (11 colonnes)
    """
    
    def __init__(self):
        self.extractor = CentrisExtractor(validate=True, verbose=False)
    
    def extract_to_original_format(self, pdf_path: Path) -> Tuple[List[Dict], List[Dict]]:
        """
        Extrait les données du PDF et les retourne au format original attendu
        
        Returns:
            Tuple[List[Dict], List[Dict]]: (données_extraites, erreurs)
        """
        # Extraction avec l'extracteur existant
        try:
            extracted_data = self.extractor.extract_from_pdf(pdf_path)
        except Exception as e:
            error_record = {
                'NomFichier': pdf_path.name,
                'MessageErreur': f"Erreur extraction PDF: {str(e)}"
            }
            return [], [error_record]
        
        if not extracted_data:
            error_record = {
                'NomFichier': pdf_path.name,
                'MessageErreur': "Aucune donnée extraite du PDF"
            }
            return [], [error_record]
        
        # Format ORIGINAL : retourner les données telles quelles car l'extracteur
        # original retourne déjà le bon format avec les 11 colonnes
        formatted_data = []
        errors = []
        
        for property_data in extracted_data:
            try:
                # L'extracteur original retourne déjà le format avec ces colonnes :
                # - Centris #
                # - Adresse complète
                # - Quartier
                # - Type de propriété
                # - Prix actuel
                # - Prix original
                # - Propriétaire(s)
                # - Représentant(s)
                # - Courtier(s): nom(s)
                # - Courtier(s): téléphone(s)
                # - Courtier(s): courriel(s)
                
                # Format des prix pour correspondre exactement au format attendu
                formatted_record = {
                    'Centris #': property_data.get('Centris #', ''),
                    'Adresse complète': property_data.get('Adresse complète', ''),
                    'Quartier': property_data.get('Quartier', ''),
                    'Type de propriété': property_data.get('Type de propriété', ''),
                    'Prix actuel': self._format_price(property_data.get('Prix actuel', '')),
                    'Prix original': self._format_price(property_data.get('Prix original', '')),
                    'Propriétaire(s): nom(s) et adresse(s)': property_data.get('Propriétaire(s)', ''),
                    'Représentant(s): nom(s) et adresse(s)': property_data.get('Représentant(s)', ''),
                    'Courtier(s): nom(s)': property_data.get('Courtier(s): nom(s)', ''),
                    'Courtier(s): téléphone(s)': property_data.get('Courtier(s): téléphone(s)', ''),
                    'Courtier(s): courriel(s)': property_data.get('Courtier(s): courriel(s)', '')
                }
                
                formatted_data.append(formatted_record)
                
            except Exception as e:
                error_record = {
                    'NomFichier': pdf_path.name,
                    'Centris #': property_data.get('Centris #', 'N/A'),
                    'MessageErreur': f"Erreur formatage: {str(e)}"
                }
                errors.append(error_record)
        
        return formatted_data, errors
    
    def _format_price(self, price_str: str) -> str:
        """
        Formate le prix pour correspondre exactement au format attendu
        avec espaces entre les milliers et symbole $
        """
        if not price_str:
            return ''
        
        # Si le prix contient déjà le format attendu, le retourner tel quel
        if '$' in price_str:
            return price_str
        
        # Extraire uniquement les chiffres
        price_digits = re.sub(r'[^\d]', '', price_str)
        
        if not price_digits:
            return price_str  # Retourner tel quel si pas de chiffres
        
        try:
            # Convertir en nombre
            price_num = int(price_digits)
            
            # Formater avec espaces comme séparateurs de milliers
            formatted = f"{price_num:,}".replace(',', ' ')
            
            # Ajouter le symbole $
            return f"{formatted} $"
        except ValueError:
            return price_str  # Retourner tel quel en cas d'erreur
    
    def export_to_xlsx_original(self, data: List[Dict], errors: List[Dict], output_path: Path):
        """
        Exporte les données au format XLSX avec les colonnes originales attendues
        """
        try:
            with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                # Feuille principale avec les données
                if data:
                    df_data = pd.DataFrame(data)
                    
                    # S'assurer que les colonnes sont dans le bon ordre
                    columns_order = [
                        'Centris #',
                        'Adresse complète',
                        'Quartier',
                        'Type de propriété',
                        'Prix actuel',
                        'Prix original',
                        'Propriétaire(s): nom(s) et adresse(s)',
                        'Représentant(s): nom(s) et adresse(s)',
                        'Courtier(s): nom(s)',
                        'Courtier(s): téléphone(s)',
                        'Courtier(s): courriel(s)'
                    ]
                    
                    # Réorganiser les colonnes
                    df_data = df_data.reindex(columns=columns_order, fill_value='')
                    
                    # Exporter sans nom de feuille spécifique pour matcher le format attendu
                    df_data.to_excel(writer, index=False)
                    
                    # Ajustement des largeurs de colonnes
                    worksheet = writer.sheets['Sheet1']
                    for column in worksheet.columns:
                        max_length = 0
                        column_letter = column[0].column_letter
                        
                        for cell in column:
                            try:
                                if cell.value and len(str(cell.value)) > max_length:
                                    max_length = len(str(cell.value))
                            except:
                                pass
                        
                        adjusted_width = min(max_length + 2, 60)  # Max 60 caractères
                        worksheet.column_dimensions[column_letter].width = adjusted_width
                
                # Feuille d'erreurs si nécessaire
                if errors:
                    df_errors = pd.DataFrame(errors)
                    df_errors.to_excel(writer, sheet_name='Erreurs', index=False)
            
            return True
        except Exception as e:
            print(f"Erreur lors de l'export XLSX: {e}")
            return False


def test_extraction():
    """Test de l'extraction avec le format corrigé"""
    print("🧪 TEST DE L'EXTRACTION AVEC FORMAT CORRIGÉ")
    print("=" * 60)
    
    extractor = CentrisExtractorCorrect()
    pdf_path = Path('/home/cag/centris-extractor/data/pdfs/Metrique_Detaille_courtier3569.PDF')
    
    if not pdf_path.exists():
        print(f"❌ Fichier introuvable: {pdf_path}")
        return
    
    print(f"📄 Extraction depuis: {pdf_path.name}")
    
    # Extraction
    data, errors = extractor.extract_to_original_format(pdf_path)
    
    print(f"✅ Extraction terminée: {len(data)} propriétés, {len(errors)} erreurs")
    
    if data:
        print("\n📋 Aperçu de la première propriété:")
        first = data[0]
        for key, value in first.items():
            if value:  # N'afficher que les valeurs non vides
                print(f"   {key}: {value[:80]}..." if len(str(value)) > 80 else f"   {key}: {value}")
    
    # Export test
    output_path = Path('output/test_format_correct.xlsx')
    if extractor.export_to_xlsx_original(data, errors, output_path):
        print(f"\n✅ Export réussi: {output_path}")
        print("\n📊 Format des colonnes:")
        print("   1. Centris #")
        print("   2. Adresse complète")
        print("   3. Quartier")
        print("   4. Type de propriété")
        print("   5. Prix actuel")
        print("   6. Prix original")
        print("   7. Propriétaire(s): nom(s) et adresse(s)")
        print("   8. Représentant(s): nom(s) et adresse(s)")
        print("   9. Courtier(s): nom(s)")
        print("   10. Courtier(s): téléphone(s)")
        print("   11. Courtier(s): courriel(s)")


if __name__ == "__main__":
    test_extraction()