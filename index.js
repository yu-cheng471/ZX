const $ = id => document.getElementById(id);
const parseNum = v => parseFloat(v) || 0;
const fmt = v => Number.isFinite(v) ? v.toFixed(2) : '0.00';

let batch = JSON.parse(localStorage.getItem('batchPayslips') || '[]');

function getEmployees() {
  return JSON.parse(localStorage.getItem('employeeWages') || '[]');
}

// Auto-fill employee info and control wage fields
function updateWageTypeFields(){
  const wageType = $('wageType').value;

  if(wageType === 'monthly'){
    $('dailyWage').value = '';
    $('dailyWage').readOnly = true;
    $('daysWorked').value = '';
    $('daysWorked').readOnly = true;
    $('monthlyWage').readOnly = true;

    $('absenteeism').readOnly = false;
  } else {
    $('dailyWage').readOnly = false;
    $('daysWorked').readOnly = false;
    $('monthlyWage').readOnly = true;
    $('monthlyWage').value = '';

    $('absenteeism').value = '';
    $('absenteeism').readOnly = true;
    $('absenteeismDeduction').value = '0.00';
  }

  $('locationPay').readOnly = true;
}

// Auto-fill employee info on ID input
$('empId').addEventListener('input', ()=>{
  const emp = getEmployees().find(e => e.empId === $('empId').value.trim());
  if(emp){
    $('empName').value = emp.empName;
    $('empDept').value = emp.department || '';
    $('wageType').value = emp.wageType || 'daily';
    $('dailyWage').value = emp.wageType==='daily' ? emp.dailyWage : '';
    $('monthlyWage').value = emp.wageType==='monthly' ? emp.monthlyWage : '';
    $('locationPay').value = emp.wageType==='daily' ? emp.dailyLocationPay || 0 : emp.monthlyLocationPay || 0;
  } else {
    $('empName').value = '';
    $('empDept').value = '';
    $('wageType').value = '';
    $('dailyWage').value = '';
    $('monthlyWage').value = '';
    $('locationPay').value = '';
  }
  updateWageTypeFields();
  calculate();
});

// Main calculation function
function calculate(){
  const wageType = $('wageType').value;
  const daily = parseNum($('dailyWage').value);
  const monthly = parseNum($('monthlyWage').value);
  const days = parseNum($('daysWorked').value);
  const locationPay = parseNum($('locationPay').value);

  const basicTotal = wageType==='daily' ? daily*days : monthly;
  $('basicTotal').value = fmt(basicTotal);

  // Additional pay
  const overtimeHours = parseNum($('overtimeHours').value);
  const holidayDays = parseNum($('holidayDays').value);
  let holidayPay = 0;
  let overtimePay = 0;

  if(wageType==='daily'){
    holidayPay = holidayDays * daily * 2;
    overtimePay = (daily / 8) * 1.5 * overtimeHours;
  } else {
    holidayPay = holidayDays * (monthly / 30);
    overtimePay = (monthly / 30 / 8) * 1.5 * overtimeHours;
  }

  $('overtimePay').value = fmt(overtimePay);
  $('holidayPay').value = fmt(holidayPay);

  const totalEarnings = basicTotal + locationPay + overtimePay + holidayPay +
    parseNum($('kpiBonus').value) + parseNum($('attendanceBonus').value) + parseNum($('otherBonus').value);
  $('totalEarnings').value = fmt(totalEarnings);

  // Social Insurance
let si = 0;

if ($('siRequired').checked) {
  let siBase = wageType === 'monthly'
    ? monthly + locationPay + holidayPay
    : (daily * days) + locationPay + holidayPay;

  const cappedBase = Math.min(siBase, 17500);
  si = Math.round(cappedBase * 0.05);
}

$('socialInsurance').value = si;

  // Absenteeism deduction ONLY for monthly wage
  let absenteeismDeduction = 0;
  const absenteeismDays = parseNum($('absenteeism').value);
  if(wageType==='monthly' && absenteeismDays > 0){
    absenteeismDeduction = (monthly / 30) * absenteeismDays;
  }
  $('absenteeismDeduction').value = fmt(absenteeismDeduction);

  // Deductions
  const totalDeductions = parseNum($('advance').value) + si +
  absenteeismDeduction +
  parseNum($('passportFees').value) +
  parseNum($('otherFees').value);

  $('totalDeductions').value = fmt(totalDeductions);

  // Net Pay
  $('netPay').value = fmt(totalEarnings - totalDeductions);
}

// Live calculation including location pay
document.querySelectorAll('#payslipForm input, #siRequired').forEach(i=>{
  i.addEventListener('input', calculate);
});

// Enter key navigation
const inputs = Array.from(document.querySelectorAll('#payslipForm input'));
inputs.forEach((input,index)=>{
  input.addEventListener('keydown', e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      if(inputs[index+1]) inputs[index+1].focus();
    }
  });
});

// ----------------- Batch functionality -----------------
let editBatchIndex = null;

// Add / Update Batch
$('addBatchBtn').addEventListener('click', ()=>{
  const empId = $('empId').value.trim();
  const empName = $('empName').value.trim();
  if(!empId || !empName){ alert('Enter Employee ID'); return; }

  const obj = {
    empId, empName,
    department: $('empDept').value,
    wageType: $('wageType').value,
    dailyWage: fmt(parseNum($('dailyWage').value)),
    monthlyWage: fmt(parseNum($('monthlyWage').value)),
    daysWorked: parseNum($('daysWorked').value),
    basicTotal: fmt(parseNum($('basicTotal').value)),
    overtimeHours: fmt(parseNum($('overtimeHours').value)),
    overtimePay: fmt(parseNum($('overtimePay').value)),
    holidayDays: fmt(parseNum($('holidayDays').value)),
    holidayPay: fmt(parseNum($('holidayPay').value)),
    locationPay: fmt(parseNum($('locationPay').value)),
    kpiBonus: fmt(parseNum($('kpiBonus').value)),
    attendanceBonus: fmt(parseNum($('attendanceBonus').value)),
    otherBonus: fmt(parseNum($('otherBonus').value)),
    totalEarnings: fmt(parseNum($('totalEarnings').value)),
    advance: fmt(parseNum($('advance').value)),
    socialInsurance: fmt(parseNum($('socialInsurance').value)),
    absenteeism: fmt(parseNum($('absenteeism').value)),
    absenteeismDeduction: fmt(parseNum($('absenteeismDeduction').value)),
    passportFees: fmt(parseNum($('passportFees').value)),
    otherFees: fmt(parseNum($('otherFees').value)),
    totalDeductions: fmt(parseNum($('totalDeductions').value)),
    netPay: fmt(parseNum($('netPay').value))
  };

  if(editBatchIndex !== null){
    batch[editBatchIndex] = obj;
    editBatchIndex = null;
  } else {
    batch.push(obj);
  }

  // Sort batch by employee ID
  batch.sort((a,b)=> a.empId.localeCompare(b.empId));

  localStorage.setItem('batchPayslips', JSON.stringify(batch));
  renderBatch();
  $('payslipForm').reset();
  updateWageTypeFields();
  calculate();
  $('addBatchBtn').textContent = 'Add';
});

// Reset button
$('resetBtn').addEventListener('click', ()=>{
  $('payslipForm').reset();
  updateWageTypeFields();
  calculate();
  $('addBatchBtn').textContent = 'Add';
});

// ----------------- Render batch list -----------------
function renderBatch(displayBatch = batch) {
  const el = $('batchList');
  if(displayBatch.length===0){ el.textContent='No payslips added'; return; }

  const table = document.createElement('table');
  table.className = 'mini';
  table.innerHTML = `
    <thead>
      <tr>
        <th>ID</th><th>Name</th><th>Department</th><th>Net-Total</th><th>Action</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');
  displayBatch.forEach((r)=>{
  const realIndex = batch.findIndex(b => b.empId === r.empId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.empId}</td>
      <td>${r.empName}</td>
      <td>${r.department}</td>
      <td>${r.netPay}</td>
      <td>
        <button class="btn small editBtn" data-i="${realIndex}">Edit</button>
        <button class="btn small ghost deleteBtn" data-i="${realIndex}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  el.innerHTML = '';
  el.appendChild(table);

  // Edit / Delete
  document.querySelectorAll('.editBtn').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const i = e.target.dataset.i;
      loadBatchToForm(batch[i], i);
    });
  });
  document.querySelectorAll('.deleteBtn').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const i = e.target.dataset.i;
      if(confirm(`Delete payslip for ${batch[i].empName}?`)){
        batch.splice(i,1);
        localStorage.setItem('batchPayslips', JSON.stringify(batch));
        renderBatch();
      }
    });
  });
}

// Load batch for editing
function loadBatchToForm(obj, index){

  // Normal fields
  for (const key in obj) {
    if ($(key)) {
      $(key).value = obj[key];
    }
  }

  // Fix department field
  if (obj.department) {
    $('empDept').value = obj.department;
  }

  editBatchIndex = index;
  $('addBatchBtn').textContent = 'Update';

  updateWageTypeFields();
  calculate();
}

// Batch search
$('batchSearch').addEventListener('input', ()=>{
  const q = $('batchSearch').value.trim().toLowerCase();
  renderBatch(batch.filter(r=>
    (r.empId && r.empId.toLowerCase().includes(q)) ||
    (r.empName && r.empName.toLowerCase().includes(q)) ||
    (r.department && r.department.toLowerCase().includes(q))
  ));
});

// ----------------- Header mapping -----------------
const headerMap = {
  empId: 'ID',
  empName: 'Name',
  department: 'Dept',
  dailyWage: 'Daily',
  monthlyWage: 'Monthly',
  daysWorked: 'Worked',
  basicTotal: 'Total',
  overtimeHours: 'OT',
  overtimePay: 'Net-OT',
  holidayDays: 'Sunday',
  holidayPay: 'Net-Sunday',
  locationPay: 'Location',
  kpiBonus: 'KPI',
  attendanceBonus: 'Attendance',
  otherBonus: 'Other',
  totalEarnings: 'Total',
  advance: 'Advance',
  socialInsurance: 'SSO',
  absenteeism: 'Absent',
  absenteeismDeduction: 'Net-Absent',
  passportFees: 'Passport',
  otherFees: 'Other',
  totalDeductions: 'Total',
  netPay: 'Net-Pay'
};

// Helper function to escape CSV values
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// ----------------- EXPORT 1: Single Table (All Data) -----------------
$('exportBatchBtn')?.addEventListener('click', ()=> {
  if(batch.length === 0){
    alert('No data to export!');
    return;
  }

  const headers = [
    'empId','empName','department','dailyWage','monthlyWage','daysWorked','basicTotal',
    'overtimeHours','overtimePay','holidayDays','holidayPay','locationPay',
    'kpiBonus','attendanceBonus','otherBonus','totalEarnings',
    'advance','socialInsurance','absenteeism','absenteeismDeduction','passportFees','otherFees','totalDeductions','netPay'
  ];

  const mappedHeaders = headers.map(h => headerMap[h] || h);
  const rows = batch.map(obj => headers.map(h => escapeCSV(obj[h] ?? '0.00')));

  const csvContent = [mappedHeaders.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'All_Payslips.csv';
  link.click();
});

// ----------------- EXPORT 2: Individual Payslips -----------------
$('exportIndividualBtn')?.addEventListener('click', ()=> {
  if(batch.length === 0){
    alert('No data to export!');
    return;
  }

  const headers = [
    'empId','empName','department','dailyWage','monthlyWage','daysWorked','basicTotal',
    'overtimeHours','overtimePay','holidayDays','holidayPay','locationPay',
    'kpiBonus','attendanceBonus','otherBonus','totalEarnings',
    'advance','socialInsurance','absenteeism','absenteeismDeduction','passportFees','otherFees','totalDeductions','netPay'
  ];

  const mappedHeaders = headers.map(h => headerMap[h] || h);
  
  let csvContent = '';

  batch.forEach((emp) => {
    csvContent += mappedHeaders.join(',') + '\n';
    const dataRow = headers.map(h => escapeCSV(emp[h] ?? '0.00'));
    csvContent += dataRow.join(',') + '\n\n';
  });

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'Individual_Payslips.csv';
  link.click();
});

// Initial render
renderBatch();
calculate();


// ----------------- CLEAR ALL BUTTON -----------------
$('clearAllBtn')?.addEventListener('click', () => {
  if (batch.length === 0) {
    alert('No payslips to clear!');
    return;
  }
  if (confirm('Are you sure to clear all payslips?')) {
    batch = [];
    localStorage.removeItem('batchPayslips');
    renderBatch();
    alert('All payslips cleared.');
  }
});
