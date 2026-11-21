import { formatDate } from '../../utils/displayFormat'
import type { Prescription } from './prescriptionService'

const escapeHtml = (value: string | null | undefined) => (value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)

/** HTML imprimible de una receta; todo el contenido del usuario se escapa. */
export function prescriptionHtml(prescription: Prescription, patientName: string): string {
  const rows = prescription.medicamentos.map((item) => `<tr><td>${escapeHtml(item.nombre)}</td><td>${escapeHtml(item.dosis)}</td><td>${escapeHtml(item.frecuencia)}</td><td>${escapeHtml(item.duracion)}</td><td>${escapeHtml(item.indicaciones)}</td></tr>`).join('')
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Receta - ${escapeHtml(patientName)}</title><style>
body{font-family:system-ui,sans-serif;color:#0f172a;margin:40px}h1{font-size:22px;margin:0}p{margin:4px 0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;font-size:14px}th{background:#f1f5f9}.firma{margin-top:64px;width:260px;border-top:1px solid #0f172a;text-align:center;padding-top:6px}
</style></head><body><h1>Receta médica</h1><p>Consultorio odontológico</p><hr>
<p><strong>Paciente:</strong> ${escapeHtml(patientName)}${prescription.paciente ? ` · Cédula ${escapeHtml(prescription.paciente.cedula)}` : ''}</p>
<p><strong>Fecha:</strong> ${escapeHtml(formatDate(prescription.fecha))}</p>
${prescription.diagnostico ? `<p><strong>Diagnóstico:</strong> ${escapeHtml(prescription.diagnostico)}</p>` : ''}
<table><thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th><th>Indicaciones</th></tr></thead><tbody>${rows}</tbody></table>
${prescription.indicaciones ? `<p style="margin-top:16px"><strong>Indicaciones generales:</strong> ${escapeHtml(prescription.indicaciones)}</p>` : ''}
<div class="firma">${escapeHtml(prescription.emitida_por?.name ?? 'Firma')}</div></body></html>`
}

export function printPrescription(prescription: Prescription, patientName: string): boolean {
  const view = window.open('', '_blank')
  if (!view) return false
  view.document.write(prescriptionHtml(prescription, patientName))
  view.document.close()
  view.focus()
  view.print()
  return true
}
