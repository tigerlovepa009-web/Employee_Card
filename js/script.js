const SHEET_ID= '168aJDSW_T0ic_op-QAjYVD-ZNZGGRvEZ8zAsRQtN274';
const SHEET_NAME = 'Database';
let employeeData = [];
let selectedRows = new Set();

function gi(id) { return document.getElementById(id); }
function initials(f, l) { return ((f[0] || '') + (l[0] || '')).toUpperCase() || '??'; }

/* ── Google gviz parser (robust) ─────────────────────────────────────────── */
function parseGviz(text) {
  // Response format: google.visualization.Query.setResponse({...});
  const start = text.indexOf('(');
  const end   = text.lastIndexOf(')');
  if (start === -1 || end === -1) throw new Error('ไม่สามารถอ่าน response จาก Google Sheet ได้');
  return JSON.parse(text.substring(start + 1, end));
}

/* Column map (0-based):  A=0 B=1 C=2 D=3 E=4 F=5 G=6 H=7 I=8  …  AF=31 */
const COL = { empid:1, name:2, name_th:3, gender:4, dept:5, position:6, product:7, startdate:8, photo:31 };

function cellVal(row, idx) {
  const c = row.c?.[idx];
  if (!c) return '';
  // date values come as "Date(2021,2,1)" — convert to readable string
  if (c.f) return c.f;
  return c.v != null ? String(c.v) : '';
}

function setStatus(msg, type = '') {
  const el = gi('load-status');
  el.className = type;
  el.innerHTML = msg;
}

function updateStatBadges() {
  gi('stat-loaded').textContent = employeeData.length + ' employees';
  gi('stat-selected').textContent = selectedRows.size + ' selected';
  gi('info-total').textContent = employeeData.length;
  gi('info-selected').textContent = selectedRows.size;
  gi('sel-count').textContent = 'Selected: ' + selectedRows.size;
}

async function loadEmployeeData() {
  try {
    gi('emp-tbody').innerHTML = `<tr><td colspan="6" style="padding:50px;text-align:center;color:#8899B0;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
        <div class="spinner" style="width:22px;height:22px;border-width:3px;"></div>
        <span style="font-size:12px;">กำลังโหลดข้อมูลจาก Google Sheet...</span>
      </div></td></tr>`;
    setStatus('<span class="spinner"></span> กำลังเชื่อมต่อ Google Sheet...');

    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&t=${Date.now()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();

    // Parse Google Visualization response
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const json = JSON.parse(text.substring(jsonStart, jsonEnd));

    if (!json.table || !json.table.rows) throw new Error('ไม่พบข้อมูลในตาราง');

    employeeData = json.table.rows
      .filter(r => cellVal(r, COL.empid))
      .map((r, i) => ({
        idx: i,
        empid:    cellVal(r, COL.empid),
        name:     cellVal(r, COL.name),
        name_th:  cellVal(r, COL.name_th),
        gender:   cellVal(r, COL.gender),
        dept:     cellVal(r, COL.dept),
        position: cellVal(r, COL.position),
        product:  cellVal(r, COL.product),
        startdate:cellVal(r, COL.startdate),
        photo:    cellVal(r, COL.photo)
      }));

    renderEmployeeTable();
    setStatus('✓ โหลดสำเร็จ ' + employeeData.length + ' รายการ', 'success');
    updateStatBadges();

  } catch (e) {
    setStatus('✗ โหลดไม่สำเร็จ: ' + e.message, 'error');
    gi('emp-tbody').innerHTML = `<tr><td colspan="6" style="padding:40px;text-align:center;color:#D03A3A;">
      <i class="ti ti-alert-circle" style="font-size:24px;display:block;margin-bottom:8px;"></i>
      ไม่สามารถเชื่อมต่อ Google Sheet ได้<br>
      <small style="color:#8899B0;font-size:11px;">${e.message}</small></td></tr>`;
    console.error(e);
  }
}

function renderEmployeeTable() {
  const tbody = gi('emp-tbody');
  if (employeeData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="padding:40px;text-align:center;color:#8899B0;">ไม่พบข้อมูลพนักงาน</td></tr>`;
    return;
  }
  tbody.innerHTML = employeeData.map(e => `
    <tr data-idx="${e.idx}" onclick="selectRow(${e.idx}, event)">
      <td style="text-align:center;"><input type="checkbox" class="row-check" data-idx="${e.idx}" onchange="updateSelection()"></td>
      <td style="font-weight:600;color:#1F467D;">${e.empid}</td>
      <td>${e.name}</td>
      <td style="font-family:'Sarabun',sans-serif;">${e.name_th}</td>
      <td>${e.dept}</td>
      <td><span style="background:#EEF1F8;border-radius:6px;padding:2px 8px;font-size:11.5px;">${e.position}</span></td>
    </tr>
  `).join('');
}

function selectRow(idx, event) {
  if (event.target.tagName === 'INPUT') return;
  const check = document.querySelector(`input.row-check[data-idx="${idx}"]`);
  if (!check) return;
  check.checked = !check.checked;
  updateSelection();
  // Auto-preview on click
  populateFromEmployee(idx);
}

function updateSelection() {
  selectedRows.clear();
  document.querySelectorAll('input.row-check').forEach(c => {
    if (c.checked) {
      selectedRows.add(parseInt(c.dataset.idx));
      c.closest('tr').classList.add('selected');
    } else {
      c.closest('tr').classList.remove('selected');
    }
  });
  updateStatBadges();
}

function selectAllRows() {
  const isChecked = gi('sel-all-check').checked;
  document.querySelectorAll('input.row-check').forEach(c => c.checked = isChecked);
  updateSelection();
}

function populateFromEmployee(idx) {
  const e = employeeData[idx];
  if (!e) return;
  const names = (e.name || '').split(' ');
  const thNames = (e.name_th || '').split(' ');
  gi('fname').value = names[0] || '';
  gi('lname').value = names.slice(1).join(' ') || '';
  gi('fname_th').value = thNames[0] || '';
  gi('lname_th').value = thNames.slice(1).join(' ') || '';
  gi('empid').value = e.empid || '';
  gi('position').value = e.position || '';
  gi('dept').value = e.dept || '';
  gi('division').value = e.product || '';
  gi('startdate').value = e.startdate || '';
  gi('gender').value = e.gender || '';
  gi('photo_url').value = e.photo || '';
  generateCard();
}

function generateCard() {
  const fn = gi('fname').value.trim() || 'Employee';
  const ln = gi('lname').value.trim() || '';
  const ft = gi('fname_th').value.trim() || '';
  const lt = gi('lname_th').value.trim() || '';
  const co = gi('company').value.trim() || 'COMPANY';

  gi('c-lc-name').textContent = co;
  gi('c-lc-sub').textContent = gi('subtitle').value.trim();
  
  const photoUrl = gi('photo_url').value.trim();
  const photoImg = gi('c-photo');
  const initialsDiv = gi('c-initials');
  
  if (photoUrl) {
    photoImg.src = photoUrl;
    photoImg.style.display = 'block';
    initialsDiv.style.display = 'none';
  } else {
    photoImg.style.display = 'none';
    initialsDiv.style.display = 'flex';
    initialsDiv.textContent = initials(fn, ln);
  }

  gi('c-empid').textContent = gi('empid').value.trim() || '—';
  gi('c-fullname').textContent = fn + (ln ? ' ' + ln : '');
  const th = (ft + (lt ? ' ' + lt : '')).trim();
  gi('c-fullname-th').textContent = th;
  gi('c-fullname-th').style.display = th ? '' : 'none';
  gi('c-position').textContent = gi('position').value.trim() || '—';
  gi('c-dept').textContent = gi('dept').value.trim() || '—';
  gi('c-div').textContent = gi('division').value.trim() || '—';
  gi('c-date').textContent = gi('startdate').value.trim() || '—';
  gi('c-gender').textContent = gi('gender').value || '—';
  gi('c-company-footer').textContent = co;
}

async function generateBatchPDF() {
  if (selectedRows.size === 0) { alert('กรุณาเลือกพนักงานก่อน'); return; }
  const ids = Array.from(selectedRows);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const cardsPerPage = 8;
  let cardCount = 0;

  for (const idx of ids) {
    populateFromEmployee(idx);
    await new Promise(r => setTimeout(r, 300));
    const canvas = await html2canvas(gi('idCard'), { scale: 2, useCORS: true, backgroundColor: '#F7F8FC', imageTimeout: 0, allowTaint: false });
    const img = canvas.toDataURL('image/png');
    const col = cardCount % 4;
    const row = Math.floor((cardCount % cardsPerPage) / 4);
    const x = 12 + col * 67; const y = 10 + row * 100;
    pdf.addImage(img, 'PNG', x, y, 63, 97);
    cardCount++;
    if (cardCount % cardsPerPage === 0 && cardCount < ids.length) { pdf.addPage(); }
  }
  pdf.save('employee-cards.pdf');
}

async function printPreview() {
  if (selectedRows.size === 0) { alert('กรุณาเลือกพนักงานก่อน'); return; }
  const ids = Array.from(selectedRows);
  const cardsPerPage = 8;
  let cardCount = 0;
  let pageHtml = '';

  for (const idx of ids) {
    populateFromEmployee(idx);
    await new Promise(r => setTimeout(r, 60));
    if (cardCount % cardsPerPage === 0) {
      if (cardCount > 0) pageHtml += '</div>';
      pageHtml += '<div class="print-page">';
    }
    const cardClone = gi('idCard').cloneNode(true);
    pageHtml += `<div class="card-wrapper"><span class="cut-v left"></span>${cardClone.outerHTML}<span class="cut-v right"></span></div>`;
    cardCount++;
  }
  pageHtml += '</div>';

  let styles = '';
  for (let sheet of document.styleSheets) {
    try { for (let rule of sheet.cssRules) { styles += rule.cssText + '\n'; } } catch (e) {}
  }

  const win = window.open('', 'Print Preview', 'width=1280,height=960');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Print Preview — Employee Cards</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
    <link rel="stylesheet" href="css/style.css">
    <style>
      ${styles}
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      @page { size: A4 landscape; margin: 0; }
      body { background: #E5E7EB; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
      .print-toolbar {
        position: fixed; top: 0; left: 0; right: 0; height: 60px;
        background: #1F467D; color: #fff;
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 30px; z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .toolbar-title { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
      .toolbar-actions { display: flex; gap: 12px; }
      .t-btn {
        padding: 8px 20px; border: none; border-radius: 8px;
        font-size: 14px; font-weight: 600; cursor: pointer;
        display: flex; align-items: center; gap: 6px; font-family: inherit;
      }
      .btn-print { background: #E55A00; color: #fff; }
      .btn-print:hover { background: #f56a10; }
      .btn-close { background: rgba(255,255,255,0.15); color: #fff; }
      .btn-close:hover { background: rgba(255,255,255,0.25); }
      
      .preview-container {
        margin-top: 80px; /* space for toolbar */
        display: flex; flex-direction: column; align-items: center; gap: 30px;
        padding-bottom: 40px;
      }
      .print-page { 
        background: #fff;
        width: 297mm;
        height: 210mm; 
        box-shadow: 0 8px 30px rgba(0,0,0,0.1);
        page-break-after: always;
        page-break-inside: avoid;
        box-sizing: border-box;
        display: grid;
        grid-template-columns: repeat(4, 54.5mm);
        grid-template-rows: repeat(2, 87.5mm);
        justify-content: center;
        align-content: center;
        gap: 2px; /* 2px gap between cards for easy cutting */
      }
      @media print {
        @page { size: A4 landscape; margin: 0; }
        .print-toolbar { display: none !important; }
        .preview-container { margin-top: 0; padding-bottom: 0; gap: 0; }
        .print-page { box-shadow: none; width: 297mm; height: 210mm; }
        body { background: #fff; }
      }
      .card-wrapper {
        width: 54.5mm;   /* ~206px */
        height: 87.5mm;  /* ~331px */
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        /* Crop marks as outline outside the card */
        outline: 0.5px dashed rgba(0,0,0,0.35);
        outline-offset: 0px;
      }
      .id-card {
        position: absolute;
        top: 0; left: 0;
        /* 320px * 0.644 = 206px ≈ 54.5mm  |  518px * 0.644 = 333px ≈ 87.5mm */
        transform: scale(0.644);
        transform-origin: top left;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        background: #FEF6EC !important; /* Warm cream-orange — visible on white paper */
      }
    </style>
  </head><body>
    <div class="print-toolbar">
      <div class="toolbar-title">
        <i class="ti ti-printer"></i> Print Preview (${ids.length} Cards)
      </div>
      <div class="toolbar-actions">
        <button class="t-btn btn-close" onclick="window.close()"><i class="ti ti-x"></i> ปิดหน้าต่าง</button>
        <button class="t-btn btn-print" onclick="window.print()"><i class="ti ti-printer"></i> สั่งปริ้นเลย</button>
      </div>
    </div>
    <div class="preview-container">
      ${pageHtml}
    </div>
  </body></html>`);
  win.document.close();
  // We no longer auto-print, user can click the Print button
}

function downloadCardSingle() {
  if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') { alert('กำลังโหลด Libraries...'); return; }
  const { jsPDF } = window.jspdf;
  html2canvas(gi('idCard'), { scale: 2.5, useCORS: true, backgroundColor: '#F7F8FC', imageTimeout: 0, allowTaint: false }).then(canvas => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [85, 135] });
    const img = canvas.toDataURL('image/png');
    pdf.addImage(img, 'PNG', 0, 0, 85, 135);
    pdf.save('employee-id-card.pdf');
  });
}

// Init
window.addEventListener('load', () => loadEmployeeData());
