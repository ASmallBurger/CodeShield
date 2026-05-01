import {
    Chart,
    BarController,
    BarElement,
    DoughnutController,
    ArcElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from 'chart.js';

Chart.register(
    BarController,
    BarElement,
    DoughnutController,
    ArcElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend
);

// colors matching index.css design tokens
const COLOR = {
    success:    '#22c55e',
    warning:    '#f59e0b',
    high:       '#f97316',
    error:      '#ef4444',
    accent:     '#3b82f6',
    textMuted:  '#94a3b8',
    bgCard:     '#1f2937',
    grid:       '#374151',
};

const RISK_COLOR = {
    Low:      COLOR.success,
    Medium:   COLOR.warning,
    High:     COLOR.high,
    Critical: COLOR.error,
};

// palette for doughnut slices
const DOUGHNUT_PALETTE = [
    COLOR.error, COLOR.high, COLOR.warning, COLOR.accent,
    COLOR.success, '#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#fbbf24',
];

// chart instance refs for cleanup on re-scan
const chartInstances = [];

// data helpers

function binByScore(report, field) {
    const bins = [0, 0, 0, 0];
    for (const r of report) {
        const v = r[field];
        if (v < 25)       bins[0]++;
        else if (v < 50)  bins[1]++;
        else if (v < 75)  bins[2]++;
        else              bins[3]++;
    }
    return bins;
}

function aggregateVulnTypes(modules) {
    const counts = {};
    for (const mod of modules) {
        for (const v of (mod.vulnerabilities || [])) {
            const key = v.pattern || v.type || 'Unknown';
            counts[key] = (counts[key] || 0) + 1;
        }
    }
    return counts;
}

// kpi strip

function renderKPIs(report) {
    const el = document.getElementById('dashboard-kpis');
    if (!el) return;

    const totalVulns     = report.reduce((s, r) => s + r.vulnCount, 0);
    const totalLOC       = report.reduce((s, r) => s + r.loc, 0);
    const criticalCount  = report.filter(r => r.riskLevel === 'Critical').length;
    const avgComplexity  = report.length > 0
        ? report.reduce((s, r) => s + r.complexityScore, 0) / report.length
        : 0;
    const flaggedCount   = report.filter(r => r.flagged).length;

    el.innerHTML = `
        <div class="summary-stat">
            <span class="summary-stat__value">${report.length}</span>
            <span class="summary-stat__label">Files Analyzed</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat__value" style="color:${flaggedCount > 0 ? 'var(--error)' : 'var(--success)'}">
                ${flaggedCount}
            </span>
            <span class="summary-stat__label">Flagged Modules</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat__value" style="color:${criticalCount > 0 ? 'var(--error)' : 'var(--success)'}">
                ${criticalCount}
            </span>
            <span class="summary-stat__label">Critical Risk</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat__value">${totalVulns}</span>
            <span class="summary-stat__label">Total Vulnerabilities</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat__value">${totalLOC.toLocaleString()}</span>
            <span class="summary-stat__label">Total LOC</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat__value">${avgComplexity.toFixed(1)}</span>
            <span class="summary-stat__label">Avg Complexity Score</span>
        </div>
    `;
}

// chart builders

const BIN_LABELS  = ['Low', 'Medium', 'High', 'Critical'];
const BIN_RANGES  = ['0–24', '25–49', '50–74', '75–100'];
const BIN_COLORS  = [COLOR.success, COLOR.warning, COLOR.high, COLOR.error];

const COMMON_SCALES = {
    x: {
        ticks: { color: COLOR.textMuted, maxRotation: 0, minRotation: 0, autoSkip: false },
        grid: { color: COLOR.grid },
    },
    y: { ticks: { color: COLOR.textMuted, stepSize: 1 }, grid: { color: COLOR.grid }, beginAtZero: true },
};

const BIN_TOOLTIP = {
    callbacks: {
        title: (items) => `${BIN_LABELS[items[0].dataIndex]} (${BIN_RANGES[items[0].dataIndex]})`,
        label: (ctx) => ` ${ctx.raw} module${ctx.raw !== 1 ? 's' : ''}`,
    },
};

function buildTDIDistChart(report) {
    const canvas = document.getElementById('chart-tdi-dist');
    if (!canvas) return;
    const counts = binByScore(report, 'tdi');
    chartInstances.push(new Chart(canvas, {
        type: 'bar',
        data: {
            labels: BIN_LABELS,
            datasets: [{
                label: 'Modules',
                data: counts,
                backgroundColor: BIN_COLORS,
                borderRadius: 4,
                borderSkipped: false,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: BIN_TOOLTIP,
            },
            scales: COMMON_SCALES,
        },
    }));
}

function buildTopModulesChart(report) {
    const canvas = document.getElementById('chart-top-modules');
    if (!canvas) return;
    const top10 = [...report].sort((a, b) => b.tdi - a.tdi).slice(0, 10);
    chartInstances.push(new Chart(canvas, {
        type: 'bar',
        data: {
            labels: top10.map(r => r.file.split(/[\\/]/).pop()),
            datasets: [{
                label: 'TDI Score',
                data: top10.map(r => r.tdi),
                backgroundColor: top10.map(r => RISK_COLOR[r.riskLevel] || COLOR.accent),
                borderRadius: 4,
                borderSkipped: false,
            }],
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items) => top10[items[0].dataIndex].file,
                        label: (ctx) => ` TDI: ${Number(ctx.raw).toFixed(2)} — ${top10[ctx.dataIndex].riskLevel}`,
                    },
                },
            },
            scales: {
                x: { max: 100, ticks: { color: COLOR.textMuted }, grid: { color: COLOR.grid } },
                y: { ticks: { color: COLOR.textMuted }, grid: { color: 'transparent' } },
            },
        },
    }));
}

function buildVulnTypesChart(modules) {
    const canvas = document.getElementById('chart-vuln-types');
    if (!canvas) return;

    const counts = aggregateVulnTypes(modules);
    const labels = Object.keys(counts);
    const values = Object.values(counts);

    if (labels.length === 0) {
        const parent = canvas.parentElement;
        canvas.style.display = 'none';
        const msg = document.createElement('p');
        msg.className = 'chart-card__empty';
        msg.textContent = 'No vulnerabilities detected.';
        parent.appendChild(msg);
        return;
    }

    const bgColors = labels.map((_, i) => DOUGHNUT_PALETTE[i % DOUGHNUT_PALETTE.length]);
    chartInstances.push(new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: COLOR.bgCard,
            }],
        },
        options: {
            responsive: true,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: COLOR.textMuted, font: { size: 11 }, padding: 12 },
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.raw} occurrence${ctx.raw !== 1 ? 's' : ''}`,
                    },
                },
            },
        },
    }));
}

function buildComplexityDistChart(report) {
    const canvas = document.getElementById('chart-complexity-dist');
    if (!canvas) return;
    const counts = binByScore(report, 'complexityScore');
    chartInstances.push(new Chart(canvas, {
        type: 'bar',
        data: {
            labels: BIN_LABELS,
            datasets: [{
                label: 'Modules',
                data: counts,
                backgroundColor: BIN_COLORS,
                borderRadius: 4,
                borderSkipped: false,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: BIN_TOOLTIP,
            },
            scales: COMMON_SCALES,
        },
    }));
}

// public api

export function destroyDashboard() {
    chartInstances.forEach(c => c.destroy());
    chartInstances.length = 0;
    const section = document.getElementById('dashboard-section');
    if (section) section.style.display = 'none';
}

export function renderDashboard(report, modules) {
    destroyDashboard();

    if (!report || report.length === 0) return;

    const section = document.getElementById('dashboard-section');
    if (!section) return;

    section.style.display = '';
    renderKPIs(report);
    buildTDIDistChart(report);
    buildTopModulesChart(report);
    buildVulnTypesChart(modules);
    buildComplexityDistChart(report);

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
