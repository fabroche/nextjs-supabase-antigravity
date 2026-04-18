import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import { getPdfColors, PDF_FONTS, PDF_SIZES, type PdfColorScheme } from './theme'
import type { DbWorkflowMetricsByRange } from '@/lib/supabase/types'

export interface PdfReportSections {
  metrics:          boolean
  trendChart:       boolean
  aggregateSummary: boolean
  businessMetrics:  boolean
}

export interface PdfReportHeader {
  title:        string
  subtitle:     string
  dateRange:    { from: Date; to: Date }
  orientation:  'portrait' | 'landscape'
  businessName: string
  colorScheme:  PdfColorScheme
}

interface WorkflowReportProps {
  header:             PdfReportHeader
  sections:           PdfReportSections
  metrics?:           DbWorkflowMetricsByRange | null
  metricDefs?:        { key: string; label: string; format: string }[]
  customMetricRows?:  { label: string; value: string }[]
  chartImage?:        string | null
  generatedAt:        string
}

function makeStyles(C: ReturnType<typeof getPdfColors>) {
  return StyleSheet.create({
    page: {
      fontFamily: PDF_FONTS.regular,
      backgroundColor: C.background,
      color: C.foreground,
      paddingHorizontal: PDF_SIZES.page.paddingH,
      paddingVertical: PDF_SIZES.page.paddingV,
      fontSize: 10,
    },
    // Cover
    coverBusiness: { fontSize: 11, color: C.mutedForeground, marginBottom: 8 },
    coverTitle:    { fontSize: 22, fontFamily: PDF_FONTS.bold, marginBottom: 6 },
    coverSub:      { fontSize: 11, color: C.mutedForeground, marginBottom: 4 },
    coverDate:     { fontSize: 9,  color: C.mutedForeground, marginTop: 32 },
    coverDivider:  { borderBottomWidth: 1, borderBottomColor: C.border, marginTop: 16, marginBottom: 32 },
    // Section
    sectionTitle:  { fontSize: 13, fontFamily: PDF_FONTS.bold, marginBottom: 10, marginTop: PDF_SIZES.sectionGap },
    // Metrics grid
    metricsRow:    { flexDirection: 'row', gap: 10, marginBottom: 10 },
    metricCard:    { flex: 1, backgroundColor: C.muted, borderRadius: PDF_SIZES.cardRadius, padding: 12 },
    metricLabel:   { fontSize: 8, color: C.mutedForeground, marginBottom: 4 },
    metricValue:   { fontSize: 18, fontFamily: PDF_FONTS.bold },
    metricSub:     { fontSize: 8, color: C.mutedForeground, marginTop: 2 },
    // Chart
    chartImage:    { width: '100%', borderRadius: PDF_SIZES.cardRadius, marginTop: 4 },
    // Summary table
    tableHeader:   { flexDirection: 'row', backgroundColor: C.muted, borderRadius: PDF_SIZES.cardRadius, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 2 },
    tableRow:      { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
    tableColLabel: { flex: 1, color: C.mutedForeground },
    tableColValue: { fontFamily: PDF_FONTS.bold },
    // Footer
    footer:        { position: 'absolute', bottom: 28, left: PDF_SIZES.page.paddingH, right: PDF_SIZES.page.paddingH, flexDirection: 'row', justifyContent: 'space-between' },
    footerText:    { fontSize: 8, color: C.mutedForeground },
  })
}

function fmt(format: string, value: number): string {
  if (format === 'currency') return `$${value.toFixed(4)}`
  if (format === 'percent')  return `${value.toFixed(1)}%`
  if (format === 'tokens')   return value.toLocaleString()
  return value.toLocaleString()
}

function metricValue(key: string, m: DbWorkflowMetricsByRange, format: string): string {
  const map: Record<string, number> = {
    executions_total: m.total_executions,
    error_rate:       m.error_rate,
    total_cost_usd:   m.total_cost,
    total_tokens:     m.total_tokens,
  }
  return fmt(format, map[key] ?? 0)
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })

export function WorkflowPdfReport({
  header,
  sections,
  metrics,
  metricDefs = [],
  customMetricRows = [],
  chartImage,
  generatedAt,
}: WorkflowReportProps) {
  const C = getPdfColors(header.colorScheme)
  const s = makeStyles(C)
  const rangeLabel = `${fmtDate(header.dateRange.from)} – ${fmtDate(header.dateRange.to)}`

  const summaryRows = metrics
    ? [
        { label: 'Ejecuciones totales', value: metrics.total_executions.toLocaleString() },
        { label: 'Exitosas',            value: metrics.success_count.toLocaleString() },
        { label: 'Fallidas',            value: metrics.error_count.toLocaleString() },
        { label: 'Tasa de error',       value: `${metrics.error_rate.toFixed(1)}%` },
        { label: 'Costo total',         value: `$${metrics.total_cost.toFixed(4)}` },
        { label: 'Tokens totales',      value: metrics.total_tokens.toLocaleString() },
        ...(metrics.avg_duration_ms !== null
          ? [{ label: 'Duración promedio', value: `${Math.round(metrics.avg_duration_ms / 1000)}s` }]
          : []),
      ]
    : []

  const defsToShow = metricDefs.length > 0
    ? metricDefs
    : [
        { key: 'executions_total', label: 'Ejecuciones',   format: 'number'   },
        { key: 'error_rate',       label: 'Tasa de error', format: 'percent'  },
        { key: 'total_cost_usd',   label: 'Costo',         format: 'currency' },
        { key: 'total_tokens',     label: 'Tokens',        format: 'tokens'   },
      ]

  return (
    <Document>
      <Page
        size="A4"
        orientation={header.orientation}
        style={s.page}
      >
        {/* Cover */}
        <Text style={s.coverBusiness}>{header.businessName}</Text>
        <Text style={s.coverTitle}>{header.title}</Text>
        {header.subtitle ? <Text style={s.coverSub}>{header.subtitle}</Text> : null}
        <Text style={s.coverSub}>{rangeLabel}</Text>
        <View style={s.coverDivider} />

        {/* Metrics section */}
        {sections.metrics && metrics && (
          <>
            <Text style={s.sectionTitle}>Métricas del workflow</Text>
            <View style={s.metricsRow}>
              {defsToShow.slice(0, 2).map((d) => (
                <View key={d.key} style={s.metricCard}>
                  <Text style={s.metricLabel}>{d.label}</Text>
                  <Text style={s.metricValue}>{metricValue(d.key, metrics, d.format)}</Text>
                </View>
              ))}
            </View>
            <View style={s.metricsRow}>
              {defsToShow.slice(2, 4).map((d) => (
                <View key={d.key} style={s.metricCard}>
                  <Text style={s.metricLabel}>{d.label}</Text>
                  <Text style={s.metricValue}>{metricValue(d.key, metrics, d.format)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Business metrics section */}
        {sections.businessMetrics && customMetricRows.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Métricas de negocio</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableColLabel, { fontFamily: PDF_FONTS.bold }]}>Métrica</Text>
              <Text style={[s.tableColValue]}>Valor</Text>
            </View>
            {customMetricRows.map((row) => (
              <View key={row.label} style={s.tableRow}>
                <Text style={s.tableColLabel}>{row.label}</Text>
                <Text style={s.tableColValue}>{row.value}</Text>
              </View>
            ))}
          </>
        )}

        {/* Chart section */}
        {sections.trendChart && chartImage && (
          <>
            <Text style={s.sectionTitle}>Tendencia de ejecuciones</Text>
            <Image src={chartImage} style={s.chartImage} />
          </>
        )}

        {/* Aggregate summary */}
        {sections.aggregateSummary && summaryRows.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Resumen de ejecuciones</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableColLabel, { fontFamily: PDF_FONTS.bold }]}>Métrica</Text>
              <Text style={[s.tableColValue]}>Valor</Text>
            </View>
            {summaryRows.map((row) => (
              <View key={row.label} style={s.tableRow}>
                <Text style={s.tableColLabel}>{row.label}</Text>
                <Text style={s.tableColValue}>{row.value}</Text>
              </View>
            ))}
          </>
        )}

        {/* No data fallback */}
        {!metrics && (sections.metrics || sections.aggregateSummary) && (
          <Text style={{ color: C.mutedForeground, marginTop: 20 }}>
            Sin datos en el rango seleccionado.
          </Text>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generado el {generatedAt} · {header.businessName}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
