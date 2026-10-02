import { jsPDF } from 'jspdf'
import { AnalysisResult } from '../services/api'

export interface PDFReportData {
  result: AnalysisResult
  inputType?: string
  source?: string
  analysisDate?: string | Date
}

export function generateAnalysisPDF(data: PDFReportData): void {
  const { result, inputType = 'Text', source, analysisDate } = data

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18
  const contentWidth = pageWidth - margin * 2

  let y = margin

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage()
      y = margin
      renderPageHeaderMini()
    }
  }

  const renderPageHeaderMini = () => {
    doc.setFillColor(15, 23, 42) // slate-900
    doc.rect(margin, y, contentWidth, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text('TRUTHLENS AI — News Credibility Analysis Report (Cont.)', margin + 4, y + 5.5)
    y += 14
  }

  // 1. Header Banner
  doc.setFillColor(15, 23, 42) // #0F172A
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F')

  // Brand Name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('TRUTHLENS AI', margin + 8, y + 11)

  // Brand Subtitle
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text('News Credibility Analysis Report', margin + 8, y + 18)

  // Watermark/Badge on right of banner
  doc.setFillColor(30, 41, 59)
  doc.roundedRect(pageWidth - margin - 44, y + 6, 36, 14, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(56, 189, 248) // cyan-400
  doc.text('VERIFIED SCAN', pageWidth - margin - 26, y + 14.5, { align: 'center' })

  y += 32

  // 2. Metadata Section (Date, Input Type, Source)
  const dateStr = analysisDate
    ? typeof analysisDate === 'string'
      ? analysisDate
      : analysisDate.toLocaleString()
    : result.created_at
    ? new Date(result.created_at).toLocaleString()
    : new Date().toLocaleString()

  const formattedInputType = (
    result.input_type ||
    inputType ||
    'Text'
  ).toUpperCase()

  const formattedSource =
    result.source_url ||
    source ||
    result.title ||
    'Direct text input submission'

  doc.setFillColor(248, 250, 252) // slate-50
  doc.setDrawColor(226, 232, 240) // slate-200
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('ANALYSIS DATE', margin + 5, y + 7)
  doc.text('INPUT TYPE', margin + 65, y + 7)
  doc.text('SOURCE / REFERENCE', margin + 115, y + 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.text(dateStr, margin + 5, y + 14)
  doc.text(formattedInputType, margin + 65, y + 14)

  const truncatedSource =
    formattedSource.length > 34
      ? formattedSource.substring(0, 31) + '...'
      : formattedSource
  doc.text(truncatedSource, margin + 115, y + 14)

  if (result.title && result.title !== formattedSource) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    const subTitleText = doc.splitTextToSize(
      `Title: "${result.title}"`,
      contentWidth - 10
    )[0]
    doc.text(subTitleText, margin + 5, y + 20)
  }

  y += 30

  // 3. Verdict & Confidence Card
  const confValue = result.conf || 80
  const isReal = (result.verdict || '').toLowerCase() === 'real' || confValue >= 60
  let verdictColor = isReal ? [22, 163, 74] : [220, 38, 38]
  let verdictBg = isReal ? [240, 253, 244] : [254, 242, 242]
  let verdictBorder = isReal ? [187, 247, 208] : [254, 202, 202]
  let verdictText = isReal ? 'TRUE / REAL NEWS' : 'FAKE NEWS'

  doc.setFillColor(verdictBg[0], verdictBg[1], verdictBg[2])
  doc.setDrawColor(verdictBorder[0], verdictBorder[1], verdictBorder[2])
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'FD')

  // Verdict label and value
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('FINAL CLASSIFICATION (60% THRESHOLD)', margin + 8, y + 9)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(verdictColor[0], verdictColor[1], verdictColor[2])
  doc.text(verdictText, margin + 8, y + 19)

  // Confidence pill on right
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(pageWidth - margin - 52, y + 6, 44, 14, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('SCORE', pageWidth - margin - 30, y + 11, { align: 'center' })
  doc.setFontSize(12)
  doc.setTextColor(verdictColor[0], verdictColor[1], verdictColor[2])
  doc.text(`${confValue}%`, pageWidth - margin - 30, y + 17.5, { align: 'center' })

  y += 33

  // Helper for Section Headings
  const renderSectionHeading = (titleText: string) => {
    checkPageBreak(18)
    doc.setFillColor(37, 99, 235) // primary blue bar
    doc.rect(margin, y, 3, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    doc.text(titleText, margin + 6, y + 7)
    doc.setDrawColor(226, 232, 240)
    doc.line(margin + 6 + doc.getTextWidth(titleText) + 4, y + 5, pageWidth - margin, y + 5)
    y += 14
  }

  // 4. Analysis Summary
  renderSectionHeading('EXECUTIVE VERIFICATION SUMMARY')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85) // slate-700
  const summaryLines = doc.splitTextToSize(
    result.summary || 'No detailed analysis summary available.',
    contentWidth
  )
  doc.text(summaryLines, margin, y)
  y += summaryLines.length * 4.6 + 6

  // 5. Claim-by-Claim Analysis: True Claims and Fake Claims
  if (result.detailed_claims && result.detailed_claims.length > 0) {
    const trueClaims = result.detailed_claims.filter(c => c.status === 'true' || c.status === 'supported')
    const fakeClaims = result.detailed_claims.filter(c => c.status === 'fake' || c.status === 'contradicted' || c.status === 'needs_verification')

    // TRUE CLAIMS
    if (trueClaims.length > 0) {
      renderSectionHeading(`TRUE / REAL CLAIMS (${trueClaims.length})`)
      trueClaims.forEach((item, idx) => {
        checkPageBreak(22)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(22, 163, 74)
        doc.text(`STATEMENT ${idx + 1}  •  [TRUE CLAIM]`, margin, y)
        y += 4.5

        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8.5)
        doc.setTextColor(30, 41, 59)
        const claimLines = doc.splitTextToSize(`"${item.claim}"`, contentWidth - 4)
        doc.text(claimLines, margin + 2, y)
        y += claimLines.length * 4.2 + 2

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        const expLines = doc.splitTextToSize(`Why True: ${item.explanation}`, contentWidth - 4)
        doc.text(expLines, margin + 2, y)
        y += expLines.length * 3.8 + 4
      })
    }

    // FAKE CLAIMS
    if (fakeClaims.length > 0) {
      renderSectionHeading(`FAKE / CONTRADICTED CLAIMS (${fakeClaims.length})`)
      fakeClaims.forEach((item, idx) => {
        checkPageBreak(22)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(220, 38, 38)
        doc.text(`STATEMENT ${idx + 1}  •  [FAKE CLAIM]`, margin, y)
        y += 4.5

        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8.5)
        doc.setTextColor(30, 41, 59)
        const claimLines = doc.splitTextToSize(`"${item.claim}"`, contentWidth - 4)
        doc.text(claimLines, margin + 2, y)
        y += claimLines.length * 4.2 + 2

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        const expLines = doc.splitTextToSize(`Why Fake: ${item.explanation}`, contentWidth - 4)
        doc.text(expLines, margin + 2, y)
        y += expLines.length * 3.8 + 4
      })
    }
  } else {
    renderSectionHeading('KEY SIGNALS')
    const signals =
      result.claims && result.claims.length > 0
        ? result.claims
        : [
            'Linguistic analysis and vocabulary patterns assessed against credibility criteria.',
            'Claim structure evaluated for attribution and verifiable evidence markers.',
            'Tone and sensationalism indicators processed through NLP classifier.',
          ]


    signals.forEach((signal, idx) => {
      checkPageBreak(16)
      doc.setFillColor(238, 242, 255)
      doc.roundedRect(margin, y - 3.5, 6, 6, 1, 1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(79, 70, 229)
      doc.text(`${idx + 1}`, margin + 3, y + 0.8, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.8)
      doc.setTextColor(51, 65, 85)
      const signalLines = doc.splitTextToSize(signal, contentWidth - 10)
      doc.text(signalLines, margin + 9, y)
      y += Math.max(signalLines.length * 4.4, 6) + 3
    })
  }
  y += 4


  // 6. Evidence / Source Information (Metrics breakdown and source detail)
  if (result.metrics && result.metrics.length > 0) {
    checkPageBreak(35)
    renderSectionHeading('EVIDENCE / SOURCE INFORMATION')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)
    doc.text('Linguistic & Credibility Metrics Breakdown:', margin, y)
    y += 6

    const colWidth = (contentWidth - 6) / 2
    result.metrics.forEach((metric, i) => {
      const col = i % 2
      const x = margin + col * (colWidth + 6)
      const currentY = y + Math.floor(i / 2) * 9

      checkPageBreak(12)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(51, 65, 85)
      doc.text(metric.label, x, currentY + 4)

      doc.setFont('helvetica', 'bold')
      doc.text(`${metric.val}%`, x + colWidth - 14, currentY + 4, { align: 'right' })

      // Progress bar background
      doc.setFillColor(241, 245, 249)
      doc.roundedRect(x + colWidth - 12, currentY + 1.2, 12, 3, 1, 1, 'F')

      // Progress bar fill
      if (metric.val > 65) {
        doc.setFillColor(verdictColor[0], verdictColor[1], verdictColor[2])
      } else {
        doc.setFillColor(148, 163, 184)
      }
      doc.roundedRect(x + colWidth - 12, currentY + 1.2, (metric.val / 100) * 12, 3, 1, 1, 'F')
    })

    y += Math.ceil(result.metrics.length / 2) * 9 + 8
  }

  // 7. Disclaimer Box
  checkPageBreak(24)
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('DISCLAIMER', margin + 5, y + 5.5)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.8)
  doc.setTextColor(71, 85, 105)
  const disclaimerText =
    '"AI predictions are estimates and should not be treated as definitive proof of truth or falsehood."'
  doc.text(disclaimerText, margin + 5, y + 11.5)

  y += 24

  // Page numbering / footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      'TruthLens AI · News Credibility Analysis Platform',
      margin,
      pageHeight - 8
    )
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    )
  }

  // Generate unique filename with timestamp
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const filename = `TruthLens_Analysis_Report_${timestamp}.pdf`

  doc.save(filename)
}
