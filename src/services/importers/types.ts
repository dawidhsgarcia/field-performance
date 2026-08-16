export interface ActivityReportRow {
  funcid?: string
  tecnico?: string
  data_fechamento?: unknown
  data_abertura?: unknown
  baremo?: unknown
  expurgo_dupla?: unknown
  avalia_prazo?: unknown
  realizado_no_prazo?: unknown
  atividade?: string
  codigo_os?: string
}

export interface FuelFleetRow {
  placa?: string
  datahoratransacao?: string
  qtdmercadoria?: unknown
  mercadoria?: string
  perfildeuso?: string
  [key: string]: unknown
}

export interface BhBaseRow {
  funcid?: string
  nome?: string
  bu?: string
  subbu?: string
  limitecomp?: unknown
  horas?: unknown
  vlr?: unknown
  dias?: unknown
}
