// src/export/reportExporter.js
// CSV and PDF export for CodeShield analysis reports.

// jspdf and jspdf-autotable are dynamically imported in exportPDF
// to keep them out of the main bundle (~400 kB savings).

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a timestamp string for filenames: YYYYMMDD-HHmmss */
function getTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** Readable timestamp for report headers */
function getReadableTimestamp() {
    return new Date().toLocaleString();
}

/** Trigger a file download via Blob */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Escape a CSV cell value (wrap in quotes if it contains comma, quote, or newline) */
function csvCell(value) {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// ── CSV Export ───────────────────────────────────────────────────────────────

/**
 * Export analysis report to CSV format.
 * @param {Array} report - TDI report array from computeTDIReport
 * @param {object} settings - Current threshold settings
 */
export function exportCSV(report, settings) {
    const timestamp = getReadableTimestamp();
    const rows = [];

    // ── Metadata header
    rows.push(['CodeShield Analysis Report']);
    rows.push(['Generated', timestamp]);
    rows.push(['TDI Threshold', settings.tdiThreshold]);
    rows.push(['Complexity Threshold', settings.complexityThreshold]);
    rows.push(['Vuln Density Threshold', settings.vulnDensityThreshold]);
    rows.push([]);  // blank line

    // ── Summary
    const totalFiles = report.length;
    const totalFunctions = report.reduce((s, r) => s + r.functionCount, 0);
    const avgTDI = totalFiles > 0
        ? (report.reduce((s, r) => s + r.tdi, 0) / totalFiles).toFixed(2)
        : '0.00';
    const flaggedCount = report.filter((r) => r.flagged).length;

    rows.push(['SUMMARY']);
    rows.push(['Files Analyzed', totalFiles]);
    rows.push(['Total Functions', totalFunctions]);
    rows.push(['Average TDI', avgTDI]);
    rows.push(['High-Risk Modules', flaggedCount]);
    rows.push([]);

    // ── Per-file detail
    rows.push(['FILE DETAILS']);
    rows.push(['File', 'LOC', 'Functions', 'Aggregate Complexity', 'Complexity Score', 'Vuln Count', 'Vuln Density', 'TDI', 'Risk Level', 'Flagged']);
    for (const r of report) {
        rows.push([
            r.file, r.loc, r.functionCount, r.aggregateComplexity,
            r.complexityScore, r.vulnCount, r.vulnDensity,
            r.tdi, r.riskLevel, r.flagged ? 'Yes' : 'No',
        ]);
    }
    rows.push([]);

    // ── Per-function detail
    rows.push(['FUNCTION DETAILS']);
    rows.push(['File', 'Function', 'Complexity', 'Start Line']);
    for (const r of report) {
        for (const fn of r.functions) {
            rows.push([r.file, fn.name, fn.complexity, fn.startLine || '']);
        }
    }

    // Build CSV string
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `codeshield-report-${getTimestamp()}.csv`);
}

// ── PDF Export ───────────────────────────────────────────────────────────────

/**
 * Export analysis report to professionally-formatted PDF.
 * @param {Array} report - TDI report array from computeTDIReport
 * @param {object} settings - Current threshold settings
 */
export async function exportPDF(report, settings) {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ]);

    const timestamp = getReadableTimestamp();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Color palette
    const BRAND_BLUE  = [59, 130, 246];
    const DARK_BG     = [17, 24, 39];
    const CARD_BG     = [31, 41, 55];
    const TEXT_PRIMARY = [241, 245, 249];
    const TEXT_MUTED   = [148, 163, 184];
    const GREEN        = [34, 197, 94];
    const YELLOW       = [245, 158, 11];
    const ORANGE       = [249, 115, 22];
    const RED          = [239, 68, 68];

    const riskColor = (level) => {
        switch (level) {
            case 'Low': return GREEN;
            case 'Medium': return YELLOW;
            case 'High': return ORANGE;
            case 'Critical': return RED;
            default: return TEXT_PRIMARY;
        }
    };

    // ── Page background helper
    const fillPageBg = () => {
        doc.setFillColor(...DARK_BG);
        doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');
    };

    // ── Title Page ───────────────────────────────────────────────────────────
    fillPageBg();

    // Brand bar
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Title
    doc.setTextColor(...TEXT_PRIMARY);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('CodeShield', 20, 35);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Source Code Analysis Report', 20, 45);

    // Divider
    doc.setDrawColor(...BRAND_BLUE);
    doc.setLineWidth(0.5);
    doc.line(20, 52, pageWidth - 20, 52);

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_MUTED);
    const meta = [
        `Generated: ${timestamp}`,
        `TDI Threshold: ${settings.tdiThreshold}`,
        `Complexity Threshold: ${settings.complexityThreshold}`,
        `Vuln Density Threshold: ${settings.vulnDensityThreshold}`,
    ];
    meta.forEach((line, i) => doc.text(line, 20, 62 + i * 7));

    // ── Summary stats
    const totalFiles = report.length;
    const totalFunctions = report.reduce((s, r) => s + r.functionCount, 0);
    const avgTDI = totalFiles > 0
        ? (report.reduce((s, r) => s + r.tdi, 0) / totalFiles).toFixed(2)
        : '0.00';
    const flaggedCount = report.filter((r) => r.flagged).length;

    const summaryY = 100;
    const summaryItems = [
        { label: 'Files Analyzed', value: String(totalFiles) },
        { label: 'Functions Found', value: String(totalFunctions) },
        { label: 'Average TDI', value: avgTDI },
        { label: 'High-Risk Modules', value: String(flaggedCount) },
    ];

    const boxW = 55;
    const boxH = 30;
    const startX = (pageWidth - (summaryItems.length * boxW + (summaryItems.length - 1) * 10)) / 2;

    summaryItems.forEach((item, i) => {
        const x = startX + i * (boxW + 10);
        doc.setFillColor(...CARD_BG);
        doc.roundedRect(x, summaryY, boxW, boxH, 3, 3, 'F');

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        // Color the avg TDI value
        if (item.label === 'Average TDI') {
            const tdiVal = parseFloat(item.value);
            doc.setTextColor(...(tdiVal > 50 ? RED : tdiVal > 25 ? YELLOW : GREEN));
        } else if (item.label === 'High-Risk Modules') {
            doc.setTextColor(...(parseInt(item.value, 10) > 0 ? RED : GREEN));
        } else {
            doc.setTextColor(...TEXT_PRIMARY);
        }
        doc.text(item.value, x + boxW / 2, summaryY + 14, { align: 'center' });

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_MUTED);
        doc.text(item.label.toUpperCase(), x + boxW / 2, summaryY + 23, { align: 'center' });
    });

    // ── File Details Table ───────────────────────────────────────────────────
    doc.addPage();
    fillPageBg();

    doc.setFillColor(...BRAND_BLUE);
    doc.rect(0, 0, pageWidth, 4, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_PRIMARY);
    doc.text('File Analysis Details', 20, 18);

    const fileHeaders = [['File', 'LOC', 'Functions', 'Complexity', 'Score', 'Vulns', 'Vuln Density', 'TDI', 'Risk', 'Flagged']];
    const fileRows = report.map((r) => [
        r.file, r.loc, r.functionCount, r.aggregateComplexity,
        r.complexityScore, r.vulnCount, r.vulnDensity.toFixed(2),
        r.tdi.toFixed(2), r.riskLevel, r.flagged ? 'YES' : '',
    ]);

    autoTable(doc, {
        head: fileHeaders,
        body: fileRows,
        startY: 24,
        theme: 'plain',
        styles: {
            fillColor: CARD_BG,
            textColor: TEXT_PRIMARY,
            fontSize: 8,
            cellPadding: 3,
            lineColor: [55, 65, 81],
            lineWidth: 0.3,
            font: 'helvetica',
        },
        headStyles: {
            fillColor: BRAND_BLUE,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
        },
        alternateRowStyles: {
            fillColor: DARK_BG,
        },
        columnStyles: {
            0: { cellWidth: 50 },
            8: { cellWidth: 20 },
            9: { cellWidth: 18 },
        },
        didParseCell: (data) => {
            // Color the Risk column
            if (data.section === 'body' && data.column.index === 8) {
                const rc = riskColor(data.cell.raw);
                data.cell.styles.textColor = rc;
                data.cell.styles.fontStyle = 'bold';
            }
            // Color the Flagged column
            if (data.section === 'body' && data.column.index === 9 && data.cell.raw === 'YES') {
                data.cell.styles.textColor = RED;
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });

    // ── Function Details Table ───────────────────────────────────────────────
    const allFunctions = [];
    for (const r of report) {
        for (const fn of r.functions) {
            allFunctions.push([r.file, fn.name, fn.complexity, fn.startLine || '—']);
        }
    }

    if (allFunctions.length > 0) {
        doc.addPage();
        fillPageBg();

        doc.setFillColor(...BRAND_BLUE);
        doc.rect(0, 0, pageWidth, 4, 'F');

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TEXT_PRIMARY);
        doc.text('Function-Level Details', 20, 18);

        const fnHeaders = [['File', 'Function', 'Complexity', 'Start Line']];

        autoTable(doc, {
            head: fnHeaders,
            body: allFunctions,
            startY: 24,
            theme: 'plain',
            styles: {
                fillColor: CARD_BG,
                textColor: TEXT_PRIMARY,
                fontSize: 8,
                cellPadding: 3,
                lineColor: [55, 65, 81],
                lineWidth: 0.3,
                font: 'helvetica',
            },
            headStyles: {
                fillColor: BRAND_BLUE,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
            },
            alternateRowStyles: {
                fillColor: DARK_BG,
            },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 80 },
            },
        });
    }

    // ── Footer on every page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(...TEXT_MUTED);
        doc.text(
            `CodeShield Report — Page ${i} of ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 6,
            { align: 'center' }
        );
    }

    doc.save(`codeshield-report-${getTimestamp()}.pdf`);
}
