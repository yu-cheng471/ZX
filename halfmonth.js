const $ = id => document.getElementById(id);
const parseNum = v => parseFloat(v) || 0;
const fmt = v => Number.isFinite(v) ? v.toFixed(2) : '0.00';

let batch = JSON.parse(localStorage.getItem('zxbatchHalfMonthPayslips') || '[]');

function getEmployees() {
  return JSON.parse(localStorage.getItem('zxemployeeWages') || '[]');
}

// Auto-fill employee info
$('empId').addEventListener('input', ()=>{
  const emp = getEmployees().find(e => e.empId === $('empId').value.trim());
if(emp){
  $('empName').value = emp.empName;
  $('empDept').value = emp.department || '';
  $('wageType').value = emp.wageType || 'daily';
  $('dailyWage').value = emp.wageType==='daily' ? emp.dailyWage : '';
  $('monthlyWage').value = emp.wageType==='monthly' ? emp.monthlyWage : '';

  // 🔒 Lock input fields depending on wage type
  const isMonthly = emp.wageType === 'monthly';
  $('dailyWage').readOnly = isMonthly;
  $('daysWorked').readOnly = isMonthly;
  $('absenteeism').readOnly = !isMonthly;
} else {
  $('empName').value = '';
  $('empDept').value = '';
  $('wageType').value = '';
  $('dailyWage').value = '';
  $('monthlyWage').value = '';
  
  // 🔓 Unlock all when not found
  $('dailyWage').readOnly = false;
  $('daysWorked').readOnly = false;
  $('absenteeism').readOnly = false;
}
calculate();

});

// Calculation
function calculate(){
  const wageType = $('wageType').value;
  const daily = parseNum($('dailyWage').value);
  const monthly = parseNum($('monthlyWage').value);
  const days = parseNum($('daysWorked').value);

  // Basic Pay
  const basicTotal = wageType==='daily' ? daily * days : (monthly / 2);
  $('basicTotal').value = fmt(basicTotal);

  // Absenteeism deduction (only for monthly)
  let absenteeismDeduction = 0;
  const absenteeismDays = parseNum($('absenteeism').value);
  if (wageType === 'monthly' && absenteeismDays > 0) {
    absenteeismDeduction = (monthly / 30) * absenteeismDays;
  }
  $('absenteeismDeduction').value = fmt(absenteeismDeduction);

  // Total deductions
  const totalDeductions = absenteeismDeduction + parseNum($('otherFees').value);
  $('totalDeductions').value = fmt(totalDeductions);

  // Net Pay
  $('netPay').value = fmt(basicTotal - totalDeductions);
}

// Live update
document.querySelectorAll('#payslipForm input').forEach(i=>{
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

// ----------------- Batch functions -----------------
let editBatchIndex = null;

$('addBatchBtn').addEventListener('click', ()=>{
  const empId = $('empId').value.trim();
  const empName = $('empName').value.trim();
  if(!empId || !empName){ alert('Enter Employee ID'); return; }

  const obj = {
    empId, empName,
    department: $('empDept').value,
    wageType: $('wageType').value,
    dailyWage: $('dailyWage').value || '0',
    monthlyWage: $('monthlyWage').value || '0',
    daysWorked: $('daysWorked').value || '0',
    basicTotal: $('basicTotal').value,
    absenteeism: $('absenteeism').value || '0',
    absenteeismDeduction: $('absenteeismDeduction').value,
    otherFees: $('otherFees').value || '0',
    totalDeductions: $('totalDeductions').value,
    netPay: $('netPay').value
  };

  if(editBatchIndex !== null){
    batch[editBatchIndex] = obj;
    editBatchIndex = null;
  } else {
    batch.push(obj);
  }

  batch.sort((a,b)=> a.empId.localeCompare(b.empId));
  localStorage.setItem('zxbatchHalfMonthPayslips', JSON.stringify(batch));
  renderBatch();
  $('payslipForm').reset();
  calculate();
  $('addBatchBtn').textContent = 'Add';
});

$('resetBtn').addEventListener('click', ()=>{
  $('payslipForm').reset();
  calculate();
  $('addBatchBtn').textContent = 'Add';
});

// Render batch
function renderBatch(displayBatch=batch){
  const el = $('batchList');
  if(displayBatch.length===0){ el.textContent='No payslips added'; return; }

  const table = document.createElement('table');
  table.className = 'mini';
  table.innerHTML = `
    <thead>
      <tr><th>ID</th><th>Name</th><th>Department</th><th>Net-Total</th><th>Action</th></tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');
  displayBatch.forEach((r,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.empId}</td>
      <td>${r.empName}</td>
      <td>${r.department}</td>
      <td>${r.netPay}</td>
      <td>
        <button class="btn small editBtn" data-i="${i}">Edit</button>
        <button class="btn small ghost deleteBtn" data-i="${i}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  el.innerHTML = '';
  el.appendChild(table);

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
        localStorage.setItem('zxbatchHalfMonthPayslips', JSON.stringify(batch));
        renderBatch();
      }
    });
  });
}

// Load batch
function loadBatchToForm(obj,index){
  for (const key in obj) {
    if($(key)) $(key).value = obj[key];
  }
  editBatchIndex = index;
  $('addBatchBtn').textContent = 'Update';
}

// Search
$('batchSearch').addEventListener('input', ()=>{
  const q = $('batchSearch').value.trim().toLowerCase();
  renderBatch(batch.filter(r=>
    (r.empId && r.empId.toLowerCase().includes(q)) ||
    (r.empName && r.empName.toLowerCase().includes(q)) ||
    (r.department && r.department.toLowerCase().includes(q))
  ));
});

// Export to CSV
// ----------------- Header mapping for CSV -----------------
const headerMap = {
  empId: 'ID',
  empName: 'Name',
  department: 'Dept',
  dailyWage: 'Daily',
  monthlyWage: 'Monthly',
  daysWorked: 'Worked',
  basicTotal: 'Total',
  absenteeism: 'Absent',
  absenteeismDeduction: 'Net-Absent',
  otherFees: 'Other',
  totalDeductions: 'Total',
  netPay: 'Net-Total'
};

// ----------------- EXPORT: All Half-Month Payslips -----------------
$('exportBatchBtn')?.addEventListener('click', ()=>{
  if(batch.length === 0){
    alert('No data to export!');
    return;
  }

  const headers = Object.keys(batch[0]).filter(h => h !== 'wageType');
  const rows = batch.map(obj => headers.map(h => obj[h] || '0.00'));

  const csvContent = [
    headers.map(h => headerMap[h] || h).join(','), // mapped header names
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'ZHONGXINGHalfMonthPayslips.csv';
  link.click();
});

// ----------------- EXPORT: Individual Half-Month Payslips -----------------
$('exportIndividualBtn')?.addEventListener('click', ()=>{
  if(batch.length === 0){
    alert('No data to export!');
    return;
  }

  const headers = Object.keys(batch[0]).filter(h => h !== 'wageType');
  const mappedHeaders = headers.map(h => headerMap[h] || h);
  let csvContent = '';

  batch.forEach(emp => {
    csvContent += mappedHeaders.join(',') + '\n'; // header for this employee
    const dataRow = headers.map(h => emp[h] || '0.00');
    csvContent += dataRow.join(',') + '\n\n'; // blank line between employees
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'ZHONGXINGIndividual_HalfMonthPayslips.csv';
  link.click();
});

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
    localStorage.removeItem('zxbatchHalfMonthPayslips');
    renderBatch();
    alert('All payslips cleared.');
  }
});
