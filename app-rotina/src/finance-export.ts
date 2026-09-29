import { formatMoney } from './domain'
import { financialStatusLabels, financialTypeLabels, summarizeFinance, type FinancialMovement } from './finance'

export interface FinanceReport { rows: readonly FinancialMovement[]; start: string; end: string; today: string }
type Cell = string | number
function reportGrid(report: FinanceReport): Cell[][] {
  const summary = summarizeFinance(report.rows), money = (n: number | null): Cell => n === null ? 'Sem dados' : n
  return [
    ['Rotina · relatório financeiro'], ['Período', report.start, report.end], ['Data de referência', report.today],
    ['Entradas recebidas', money(summary.entries)], ['Saídas pagas', money(summary.exits)], ['Saldo realizado', money(summary.balance)],
    ['Créditos confirmados em aberto', money(summary.credits)], ['Pendências confirmadas em aberto', money(summary.payablePending)],
    ['Reserva de manutenção (estimativa)', money(summary.maintenanceReserve)],
    ['Planejamento e previsão não compõem o saldo realizado. Transferências e saldos iniciais não são receitas/despesas.'],
    [], ['Data', 'Descrição', 'Categoria', 'Tipo', 'Origem', 'Status', 'Valor (BRL)', 'Observação'],
    ...report.rows.map(row => [row.localDate, row.description, row.category, financialTypeLabels[row.type], row.origin, financialStatusLabels[row.status], money(row.amount), row.note ?? '']),
  ]
}

export function exportFinanceCsv(report: FinanceReport): string {
  const cell = (value: Cell) => {
    let text = typeof value === 'number' ? value.toFixed(2).replace('.', ',') : value
    // Texto do usuário nunca é uma fórmula ao abrir a planilha.
    if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }
  return '\uFEFF' + reportGrid(report).map(row => Array.from({ length: 8 }, (_, index) => cell(row[index] ?? '')).join(';')).join('\r\n') + '\r\n'
}

const cleanControls = (text: string) => Array.from(text).filter(char => char.charCodeAt(0) >= 32 && char !== '\uFFFE' && char !== '\uFFFF' || '\t\r\n'.includes(char)).join('')
const xml = (text: string) => cleanControls(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
const utf8 = (text: string) => new TextEncoder().encode(text)
const joinBytes = (parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0)); let offset = 0
  for (const part of parts) { result.set(part, offset); offset += part.length }
  return result
}
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xEDB88320 ^ crc >>> 1 : crc >>> 1
  return crc >>> 0
})
function crc32(bytes: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ crc >>> 8
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// ZIP sem compressão: poucas partes XML, sem biblioteca ou acesso à rede.
function zip(files: readonly { name: string; text: string }[]): Uint8Array<ArrayBuffer> {
  const local: Uint8Array[] = [], central: Uint8Array[] = []; let offset = 0
  for (const file of files) {
    const name = utf8(file.name), body = utf8(file.text), crc = crc32(body)
    const header = new Uint8Array(30), view = new DataView(header.buffer)
    view.setUint32(0, 0x04034B50, true); view.setUint16(4, 20, true); view.setUint16(12, 33, true)
    view.setUint32(14, crc, true); view.setUint32(18, body.length, true); view.setUint32(22, body.length, true); view.setUint16(26, name.length, true)
    local.push(header, name, body)
    const directory = new Uint8Array(46), entry = new DataView(directory.buffer)
    entry.setUint32(0, 0x02014B50, true); entry.setUint16(4, 20, true); entry.setUint16(6, 20, true); entry.setUint16(14, 33, true)
    entry.setUint32(16, crc, true); entry.setUint32(20, body.length, true); entry.setUint32(24, body.length, true); entry.setUint16(28, name.length, true); entry.setUint32(42, offset, true)
    central.push(directory, name); offset += header.length + name.length + body.length
  }
  const directory = joinBytes(central), end = new Uint8Array(22), view = new DataView(end.buffer)
  view.setUint32(0, 0x06054B50, true); view.setUint16(8, files.length, true); view.setUint16(10, files.length, true)
  view.setUint32(12, directory.length, true); view.setUint32(16, offset, true)
  return joinBytes([...local, directory, end])
}

export function exportFinanceXlsx(report: FinanceReport): Uint8Array<ArrayBuffer> {
  const grid = reportGrid(report)
  if (grid.length > 1048576) throw new Error('O período excede o limite de linhas do Excel. Escolha um período menor.')
  const spreadsheet = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
  const relationships = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const packageRelationships = 'http://schemas.openxmlformats.org/package/2006/relationships'
  const sheetData = grid.map((row, index) => `<row r="${index + 1}">${row.map((cell, column) => {
    const reference = `${String.fromCharCode(65 + column)}${index + 1}`
    return typeof cell === 'number' ? `<c r="${reference}" s="2"><v>${cell}</v></c>`
      : `<c r="${reference}" t="inlineStr" s="${index === 0 || index === 11 ? 1 : 0}"><is><t xml:space="preserve">${xml(cell)}</t></is></c>`
  }).join('')}</row>`).join('')
  return zip([
    { name: '[Content_Types].xml', text: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name: '_rels/.rels', text: `<Relationships xmlns="${packageRelationships}"><Relationship Id="rId1" Type="${relationships}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', text: `<workbook xmlns="${spreadsheet}" xmlns:r="${relationships}"><sheets><sheet name="Financeiro" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', text: `<Relationships xmlns="${packageRelationships}"><Relationship Id="rId1" Type="${relationships}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${relationships}/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', text: `<styleSheet xmlns="${spreadsheet}"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$ &quot;#,##0.00;[Red]-&quot;R$ &quot;#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
    { name: 'xl/worksheets/sheet1.xml', text: `<worksheet xmlns="${spreadsheet}"><dimension ref="A1:H${grid.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="12" topLeftCell="A13" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="30"/><cols><col min="1" max="1" width="42" customWidth="1"/><col min="2" max="2" width="55" customWidth="1"/><col min="3" max="6" width="24" customWidth="1"/><col min="7" max="7" width="20" customWidth="1"/><col min="8" max="8" width="65" customWidth="1"/></cols><sheetData>${sheetData}</sheetData><autoFilter ref="A12:H${Math.max(12, grid.length)}"/></worksheet>` },
  ])
}

// WinAnsi cobre português; demais caracteres têm representação U+ legível.
function pdfText(text: string): string {
  const punctuation: Record<string, string> = { '–': '-', '—': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '…': '...', '\u00A0': ' ' }
  return cleanControls(Array.from(text).map(char => punctuation[char] ?? (char.charCodeAt(0) < 256 ? char : `[U+${char.codePointAt(0)!.toString(16).toUpperCase()}]`)).join(''))
}
function wrap(text: string, width = 80): string[] {
  const result: string[] = []
  for (const paragraph of pdfText(text).split(/\r?\n/)) {
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      if (line && line.length + word.length + 1 > width) { result.push(line); line = '' }
      let rest = word
      while (rest.length > width) { if (line) { result.push(line); line = '' } result.push(rest.slice(0, width)); rest = rest.slice(width) }
      line = line ? `${line} ${rest}` : rest
    }
    result.push(line)
  }
  return result
}

export function exportFinancePdf(report: FinanceReport): Uint8Array<ArrayBuffer> {
  const grid = reportGrid(report)
  const lines = grid.slice(1, 10).flatMap(row => wrap(row.map(cell => typeof cell === 'number' ? formatMoney(cell) : cell).join('  ')))
  lines.push('', `${report.rows.length} movimentação(ões) no período`, '')
  for (const row of report.rows) lines.push(...wrap(`${row.localDate} | ${financialTypeLabels[row.type]} | ${formatMoney(row.amount)}`), ...wrap(row.description), ...wrap(`${row.category} | ${row.origin} | ${financialStatusLabels[row.status]}`), ...row.note ? wrap(`Observação: ${row.note}`) : [], '')
  if (!report.rows.length) lines.push('Sem dados neste período.')
  const pages: string[][] = []
  for (let index = 0; index < lines.length; index += 47) pages.push(lines.slice(index, index + 47))
  const objects: string[] = ['', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>']
  const pageIds: number[] = []
  const escaped = (text: string) => pdfText(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  pages.forEach((page, index) => {
    const pageId = objects.length + 1, streamId = pageId + 1
    pageIds.push(pageId)
    const content = `BT /F2 16 Tf 44 790 Td (${escaped('Rotina - relatório financeiro')}) Tj ET\nBT /F1 10 Tf 44 762 Td 14 TL\n${page.map(line => `(${escaped(line)}) Tj T*`).join('\n')}\nET\nBT /F1 9 Tf 44 34 Td (${escaped(`Página ${index + 1} de ${pages.length} | ${report.start} a ${report.end}`)}) Tj ET`
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  let document = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offsets = [0]
  objects.forEach((object, index) => { offsets.push(document.length); document += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = document.length
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Uint8Array.from(document, character => character.charCodeAt(0))
}

export function downloadFinanceReport(format: 'csv' | 'xlsx' | 'pdf', report: FinanceReport): void {
  const mime = { csv: 'text/csv;charset=utf-8', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pdf: 'application/pdf' }[format]
  const body = format === 'csv' ? exportFinanceCsv(report) : format === 'xlsx' ? exportFinanceXlsx(report) : exportFinancePdf(report)
  const url = URL.createObjectURL(new Blob([body], { type: mime })), link = document.createElement('a')
  link.href = url; link.download = `rotina-financeiro-${report.start}-${report.end}.${format}`; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
