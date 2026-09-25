import openpyxl
import json
import datetime

wb = openpyxl.load_workbook('huertos_carlos.xlsx', data_only=True)

parcelas = []
faenas = []
informes = []

def serialize_val(val):
    if val is None:
        return ""
    if isinstance(val, (datetime.datetime, datetime.date)):
        return val.strftime('%Y-%m-%d')
    if isinstance(val, float):
        return round(val, 4)
    return str(val).strip()

for sheet_name in wb.sheetnames:
    ws = wb[sheet_name]
    max_r = ws.max_row
    max_c = ws.max_column
    
    # 1. Extraer INFO (Baseline)
    # Buscar columna con 'INFO' o celdas de metadatos
    info_col = None
    for r in range(1, min(10, max_r + 1)):
        for c in range(1, max_c + 1):
            val = ws.cell(r, c).value
            if val and str(val).strip().upper() == 'INFO':
                info_col = c
                break
        if info_col:
            break
            
    # Extraer metadatos de la parcela
    parcela_data = {
        'id': 'p-' + sheet_name.lower().replace(' ', '-').replace('.', '').replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u'),
        'nombre': sheet_name,
        'cultiu': '',
        'varietat': '',
        'patron': '',
        'marco': '',
        'superficieHa': '',
        'superficieFa': '',
        'codic': '',
        'anyPlantacio': '',
        'subparcelas': []
    }
    
    # Si encontramos columna INFO, escanear hacia abajo
    if info_col:
        for r in range(1, min(40, max_r + 1)):
            label_cell = ws.cell(r, info_col).value
            val_cell = ws.cell(r, info_col + 1).value
            if label_cell:
                lbl = str(label_cell).strip().lower()
                val_str = serialize_val(val_cell)
                if 'cultiu' in lbl and not parcela_data['cultiu']:
                    parcela_data['cultiu'] = val_str
                elif 'variet' in lbl and not parcela_data['varietat']:
                    parcela_data['varietat'] = val_str
                elif 'patr' in lbl and not parcela_data['patron']:
                    parcela_data['patron'] = val_str
                elif 'marc' in lbl and not parcela_data['marco']:
                    parcela_data['marco'] = val_str
                elif 'finca (fa)' in lbl or 'superficie (fa)' in lbl:
                    parcela_data['superficieFa'] = f"{val_str} Hanegadas" if val_str else ""
                elif 'finca (ha)' in lbl or 'superficie total' in lbl:
                    if not parcela_data['superficieHa']:
                        parcela_data['superficieHa'] = f"{val_str} Ha" if val_str else ""
                elif 'codic' in lbl and not parcela_data['codic']:
                    parcela_data['codic'] = val_str
                elif 'any de plantaci' in lbl and not parcela_data['anyPlantacio']:
                    parcela_data['anyPlantacio'] = val_str
                elif 'parcela' in lbl and val_str and val_str not in parcela_data['subparcelas']:
                    parcela_data['subparcelas'].append(val_str)
                    
    # Formatear superficie general
    sup_txt = []
    if parcela_data['superficieFa']:
        sup_txt.append(str(parcela_data['superficieFa']))
    if parcela_data['superficieHa']:
        sup_txt.append(f"({parcela_data['superficieHa']})")
    parcela_data['superficie'] = " ".join(sup_txt) if sup_txt else "Superficie en ficha"

    parcelas.append(parcela_data)

    # 2. Extraer FAENAS (Columnas A - D)
    # Fila 1 suele ser cabecera: Fetxa, Faena, Persona, Comentari
    for r in range(2, max_r + 1):
        fetxa = ws.cell(r, 1).value
        faena_nom = ws.cell(r, 2).value
        persona = ws.cell(r, 3).value
        comentari = ws.cell(r, 4).value
        
        if fetxa or faena_nom or comentari:
            f_str = serialize_val(fetxa)
            if not f_str or f_str.lower() == 'fetxa':
                continue
            
            # Clasificar tipo y posibles químicos
            com_str = serialize_val(comentari)
            faena_str = serialize_val(faena_nom)
            
            # Detectar si hay químico mencionado
            quimico = ""
            if any(k in faena_str.lower() or k in com_str.lower() for k in ['turbo', 't1', 't2', 't5', 't9', 't10', 't11', 't15', 't16', 't21', 't27', 'herbicida', 'abamectina', 'fe', 'abon', 'spintor', 'cobre']):
                quimico = f"{faena_str} - {com_str}" if com_str else faena_str

            faenas.append({
                'id': f"faena-{sheet_name.lower()}-{r}",
                'parcelaId': parcela_data['id'],
                'parcelaNombre': sheet_name,
                'fecha': f_str,
                'hora': '10:00',
                'tipoFaena': faena_str if faena_str else 'Trabajos de campo',
                'usuario': serialize_val(persona) if persona else 'Equipo',
                'usuarioId': 'carlos' if 'carlos' in str(persona).lower() else 'operario1',
                'quimicoProducto': quimico,
                'quimicoDosis': com_str if quimico else '',
                'plagas': ['Araña roja'] if 'ar' in (faena_str + ' ' + com_str).lower() else [],
                'hierba': 'Poca hierba',
                'notas': com_str
            })

    # 3. Extraer INFORMES de estado (Columnas F - K)
    # Cabeceras típicas: Fetxa, Persona, Parcela, Texto
    # Buscar dónde están las fechas de informes
    for r in range(2, max_r + 1):
        # A veces la fecha del informe está en col 6 o 7
        inf_fecha = None
        inf_persona = None
        inf_parcela = None
        inf_texto = None
        
        for c in range(5, 12):
            val = ws.cell(r, c).value
            if val and str(val).strip().lower() == 'fetxa':
                inf_fecha = ws.cell(r, c + 1).value
            elif val and str(val).strip().lower() == 'persona':
                inf_persona = ws.cell(r, c + 1).value
            elif val and str(val).strip().lower() == 'parcela':
                inf_parcela = ws.cell(r, c + 1).value
        
        # El texto del informe suele estar en una fila siguiente o en col 6
        texto_cand = ws.cell(r, 6).value
        if texto_cand and isinstance(texto_cand, str) and len(texto_cand) > 15:
            inf_texto = texto_cand
            
        if inf_texto:
            # Buscar fecha cercana arriba
            fecha_encontrada = ""
            persona_encontrada = "Carlos"
            for back_r in range(r, max(1, r - 5), -1):
                for c in range(5, 12):
                    if ws.cell(back_r, c).value and str(ws.cell(back_r, c).value).strip().lower() == 'fetxa':
                        fecha_encontrada = serialize_val(ws.cell(back_r, c + 1).value)
                    if ws.cell(back_r, c).value and str(ws.cell(back_r, c).value).strip().lower() == 'persona':
                        persona_encontrada = serialize_val(ws.cell(back_r, c + 1).value)
            
            # Detectar plagas mencionadas en el texto del informe
            plagas_detectadas = []
            txt_lower = inf_texto.lower()
            if 'araña' in txt_lower or ' ar' in txt_lower: plagas_detectadas.append('Araña roja')
            if 'mosca' in txt_lower or ' mb' in txt_lower: plagas_detectadas.append('Mosca blanca')
            if 'trip' in txt_lower: plagas_detectadas.append('Trip')
            if 'cotonet' in txt_lower: plagas_detectadas.append('Cotonet')
            if 'prc' in txt_lower or 'piojo' in txt_lower: plagas_detectadas.append('Piojo rojo')

            hierba_estado = 'Limpio'
            if 'brossa' in txt_lower or 'hierba' in txt_lower or 'herbicida' in txt_lower:
                hierba_estado = 'Mucha hierba' if 'molta' in txt_lower or 'mucha' in txt_lower else 'Poca hierba'

            faenas.append({
                'id': f"informe-{sheet_name.lower()}-{r}",
                'parcelaId': parcela_data['id'],
                'parcelaNombre': sheet_name,
                'fecha': fecha_encontrada if fecha_encontrada else '2026-07-01',
                'hora': '12:00',
                'tipoFaena': 'Informe de Estado / Revisión',
                'usuario': persona_encontrada if persona_encontrada else 'Carlos',
                'usuarioId': 'carlos',
                'quimicoProducto': '',
                'quimicoDosis': '',
                'plagas': plagas_detectadas,
                'hierba': hierba_estado,
                'notas': inf_texto
            })

print(f"Total parcelas extraidas: {len(parcelas)}")
print(f"Total faenas/informes extraidos: {len(faenas)}")

with open('datos_huertos_extraidos.json', 'w', encoding='utf-8') as f:
    json.dump({'parcelas': parcelas, 'faenas': faenas}, f, ensure_ascii=False, indent=2)

print("Guardado en datos_huertos_extraidos.json con exito.")
