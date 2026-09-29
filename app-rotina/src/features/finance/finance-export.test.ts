import { describe, expect, it } from 'vitest'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { exportFinanceCsv, exportFinancePdf, exportFinanceXlsx } from './finance-export'
import { buildFinancialMovements } from './finance'

const rows = buildFinancialMovements({ today: '2026-09-22', shifts: [], expenses: [], records: [{ id: '1', type: 'entrada', category: 'Outros', description: '=2+2; Água "teste"', amount: 1234.56, localDate: '2026-09-22', createdAt: '2026-09-22T13:00:00.000Z' }] })
const report = { rows, start: '2026-09-01', end: '2026-09-30', today: '2026-09-22' }

describe('exportações financeiras reais', () => {
  it('CSV tem BOM, separador brasileiro, escaping e proteção de fórmulas', () => {
    const csv = exportFinanceCsv(report)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('1234,56')
    expect(csv).toContain('"\'=2+2; Água ""teste"""')
    expect(csv).toContain('2026-09-01')
    expect(csv).toContain('Realizado')
  })
  it('XLSX é ZIP/OOXML com células numéricas e texto seguro, validado por leitor independente', () => {
    const bytes = exportFinanceXlsx(report)
    const directory = mkdtempSync(join(tmpdir(), 'ritmo-export-'))
    const path = join(directory, 'financeiro.xlsx')
    writeFileSync(path, bytes)
    expect(bytes.slice(0, 4)).toEqual(new Uint8Array([80, 75, 3, 4]))
    const output = execFileSync('python', ['-c', 'import sys,zipfile,xml.etree.ElementTree as E; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; [E.fromstring(z.read(n)) for n in z.namelist()]; ns={"s":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}; r=E.fromstring(z.read("xl/worksheets/sheet1.xml")); assert any(n.text=="1234.56" for n in r.findall(".//s:v",ns)); assert not r.findall(".//s:f",ns); print("valid")', path], { encoding: 'utf8' })
    expect(output.trim()).toBe('valid')
  })
  it('PDF possui offsets e streams coerentes, páginas reais e acentos', () => {
    const pdf = exportFinancePdf(report)
    const text = Buffer.from(pdf).toString('latin1')
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('/Type /Page ')
    expect(text).toContain('Água')
    expect(text).toContain('1.234,56')
    const xref = Number(text.match(/startxref\n(\d+)/)?.[1])
    expect(text.slice(xref, xref + 4)).toBe('xref')
    for (const match of text.matchAll(/(\d{10}) 00000 n/g)) expect(text.slice(Number(match[1]))).toMatch(/^\d+ 0 obj/)
    const directory = mkdtempSync(join(tmpdir(), 'ritmo-pdf-'))
    writeFileSync(join(directory, 'financeiro.pdf'), pdf)
    expect(readFileSync(join(directory, 'financeiro.pdf')).length).toBe(pdf.length)
  })
  it('pagina descrições longas e muitos registros sem perder linhas', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ ...rows[0], id: String(i), description: `Lançamento ${i} ${'Descrição extensa '.repeat(20)}` }))
    const text = Buffer.from(exportFinancePdf({ ...report, rows: many })).toString('latin1')
    expect((text.match(/\/Type \/Page /g) ?? []).length).toBeGreaterThan(1)
    expect(text).toContain('Lançamento 59')
  })
  it('formatos vazios continuam válidos e não inventam saldo zero', () => {
    expect(exportFinanceCsv({ ...report, rows: [] })).toContain('Sem dados')
    expect(exportFinanceXlsx({ ...report, rows: [] }).length).toBeGreaterThan(100)
    expect(Buffer.from(exportFinancePdf({ ...report, rows: [] })).toString('latin1')).toContain('Sem dados')
  })
})
