import sys, zipfile
from xml.etree import ElementTree as ET
W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
SRC='/Users/marcelohidalgopinto/Downloads/'
FILES=[('Activos','Ficha 1-2 Plan de Cuentas - Activos.docx'),
       ('Pasivos','Ficha 1-2 Plan de Cuentas - Pasivos.docx'),
       ('Costos','Ficha 1-2 Plan de Cuentas - Costos.docx'),
       ('Ingresos','Ficha 1-2 Plan de Cuentas - Ingresos.docx')]

def tables(path):
    root=ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    out=[]
    for tbl in root.iter(W+'tbl'):
        rows=[]
        for tr in tbl.findall('.//'+W+'tr'):
            cells=[''.join(t.text or '' for t in tc.iter(W+'t')).strip() for tc in tr.findall(W+'tc')]
            if any(cells): rows.append(cells)
        if rows: out.append(rows)
    return out

L=[]
L.append('# Plan de Cuentas — Agrícola El Bosque\n')
L.append('> Fuente: las cuatro fichas `Ficha 1-2 Plan de Cuentas` (Activos, Pasivos, Costos, Ingresos).')
L.append('> Extraído literalmente de los `.docx`. **No editar a mano**: si cambian las fichas, se regenera.\n')
L.append('## Estructura jerárquica\n')
L.append('Cada cuenta se describe en cuatro niveles y se traduce a un código contable. Primero se')
L.append('definen los 4 dígitos iniciales, luego se concatenan los demás niveles hasta formar el')
L.append('**ID General**, que es la llave única de integración entre módulos.\n')
L.append('| Nivel | Contenido | Ejemplos |')
L.append('|---|---|---|')
L.append('| Cuenta principal | La clase contable | Activo · Pasivo · Costos · Ingresos |')
L.append('| Clasificación | Agrupación secundaria | Circulante · Fijo · Operacional · No operacional |')
L.append('| Subtipo | Familia dentro de la clasificación | Disponible · Materias primas · Cuentas por pagar |')
L.append('| Detalle | La cuenta imputable | Caja · Fertilizantes · Remuneraciones Buin |\n')
L.append('Los cuatro campos operativos de la empresa aparecen como dimensión propia en varias')
L.append('familias: **Buin · Chumaco · Graneros · Los Lirios** (más una cuenta *General*).\n')

for name,f in FILES:
    L.append(f'\n---\n\n## {name}\n')
    for rows in tables(SRC+f):
        hdr=rows[0]; body=[r for r in rows[1:] if any(c.strip() for c in r)]
        L.append('| '+' | '.join(hdr)+' |')
        L.append('|'+'---|'*len(hdr))
        for r in body:
            r=(r+['']*len(hdr))[:len(hdr)]
            L.append('| '+' | '.join(c.replace('|','\\|') for c in r)+' |')
        L.append(f'\n*{len(body)} cuentas.*\n')

open(sys.argv[1],'w',encoding='utf-8').write('\n'.join(L)+'\n')
print('OK')
