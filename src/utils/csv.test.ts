import { describe, expect, it } from 'vitest'
import { decodeActivityText, parseActivityCsv, parseBhCsv, splitCsvLine } from './csv'

function latin1Bytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i) & 0xff
  }
  return out
}

describe('decodeActivityText', () => {
  it('decodifica UTF-8 válido', () => {
    const bytes = new TextEncoder().encode('nome;cidade\njosé;ão\n')
    expect(decodeActivityText(bytes)).toBe('nome;cidade\njosé;ão\n')
  })

  it('cai para Windows-1252 quando UTF-8 é inválido', () => {
    const bytes = latin1Bytes('nome;cidade\njosé;ão\n')
    const text = decodeActivityText(bytes)
    expect(text).toContain('josé')
    expect(text).toContain('ão')
  })
})

describe('parseActivityCsv', () => {
  it('parseia CSV com ; e aspas', () => {
    const text = 'funcid;tecnico;atividade;obs\nT1;JOSÉ;INSTALAÇÃO;"texto;com;ponto"\nT2;;APOIO;\n'
    const rows = parseActivityCsv(new TextEncoder().encode(text))
    expect(rows).toHaveLength(2)
    expect(rows[0]['funcid']).toBe('T1')
    expect(rows[0]['obs']).toBe('texto;com;ponto')
    expect(rows[1]['tecnico']).toBeNull()
  })

  it('ignora linhas totalmente vazias', () => {
    const text = 'a;b\n1;2\n;;\n'
    const rows = parseActivityCsv(new TextEncoder().encode(text))
    expect(rows).toHaveLength(1)
  })

  it('remove BOM', () => {
    const text = '\uFEFFa;b\n1;2\n'
    const rows = parseActivityCsv(new TextEncoder().encode(text))
    expect(rows[0]['a']).toBe('1')
  })
})

describe('splitCsvLine', () => {
  it('respeita aspas com ; interno', () => {
    const cells = splitCsvLine('a;"b;c";d')
    expect(cells).toEqual(['a', 'b;c', 'd'])
  })

  it('interpreta "" como aspas literal', () => {
    const cells = splitCsvLine('"um ""dois"""')
    expect(cells).toEqual(['um "dois"'])
  })
})

describe('parseBhCsv', () => {
  it('auto-detecta delimitador ;', () => {
    const rows = parseBhCsv('FUNCID;NOME;LIMITE COMP.;HORAS\nB1;BEN;14/08/2026;21:00\n')
    expect(rows[0]['FUNCID']).toBe('B1')
    expect(rows[0]['HORAS']).toBe('21:00')
  })

  it('auto-detecta tabulação', () => {
    const rows = parseBhCsv('FUNCID\tNOME\tLIMITE COMP.\tHORAS\nB1\tBEN\t14/08/2026\t21:00\n')
    expect(rows[0]['NOME']).toBe('BEN')
  })
})
