const $ = id => document.getElementById(id);
let employees = JSON.parse(localStorage.getItem('zxemployeeWages') || '[]');
let editIndex = null;

// Toggle wage type fields
$('wageType').addEventListener('change', e => {
  if(e.target.value === 'monthly'){
    $('monthlyFields').style.display = 'block';
    $('dailyFields').style.display = 'none';
  } else {
    $('monthlyFields').style.display = 'none';
    $('dailyFields').style.display = 'block';
  }
});

// Render employee list
function renderEmployees(list = employees){
  const el = $('employeeList');
  if(list.length === 0){ el.textContent = 'No employees found'; return; }

 list.sort((a, b) => a.empId.localeCompare(b.empId));
 
  const t = document.createElement('table');
  t.className = 'mini';
  t.innerHTML = `
    <thead>
      <tr><th>ID</th><th>Name</th><th>Department</th><th>Wage Type</th><th>Daily</th><th>Monthly</th><th>Location</th><th>Action</th></tr>
    </thead>
  `;

  const tb = document.createElement('tbody');
  list.forEach(emp=>{
    const i = employees.indexOf(emp);
    const tr = document.createElement('tr');

    const dailyWage = emp.wageType === 'daily' ? emp.dailyWage : '-';
    const monthlyWage = emp.wageType === 'monthly' ? emp.monthlyWage : '-';
    const locationPay = emp.wageType === 'daily' ? emp.dailyLocationPay || '-' : emp.monthlyLocationPay || '-';

    tr.innerHTML = `
      <td>${emp.empId}</td>
      <td>${emp.empName}</td>
      <td>${emp.department}</td>
      <td>${emp.wageType}</td>
      <td>${dailyWage}</td>
      <td>${monthlyWage}</td>
      <td>${locationPay}</td>
      <td>
        <button class="btn small editBtn" data-i="${i}">Edit</button>
        <button class="btn small ghost deleteBtn" data-i="${i}">Delete</button>
      </td>`;
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  el.innerHTML = '';
  el.appendChild(t);

  // Edit / Delete
  document.querySelectorAll('.editBtn').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const i = e.target.dataset.i;
      loadEmployeeToForm(employees[i], i);
    });
  });

  document.querySelectorAll('.deleteBtn').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const i = e.target.dataset.i;
      if(confirm(`Delete employee ${employees[i].empName}?`)){
        employees.splice(i, 1);
        localStorage.setItem('zxemployeeWages', JSON.stringify(employees));
        renderEmployees();
        $('employeeForm').reset();
        editIndex = null;
        $('saveEmployeeBtn').textContent = 'Save'; // reset button text
      }
    });
  });
}

// Load data to form
function loadEmployeeToForm(emp, index){
  $('empId').value = emp.empId;
  $('empName').value = emp.empName;
  $('empDept').value = emp.department;
  $('wageType').value = emp.wageType || 'daily';
  $('dailyWage').value = emp.dailyWage || '';
  $('dailyLocationPay').value = emp.dailyLocationPay || '';
  $('monthlyWage').value = emp.monthlyWage || '';
  $('monthlyLocationPay').value = emp.monthlyLocationPay || '';
  $('wageType').dispatchEvent(new Event('change'));
  editIndex = index;
  $('saveEmployeeBtn').textContent = 'Update'; // change button to "Update"
}

// Save employee
$('saveEmployeeBtn').addEventListener('click', ()=>{
  const empId = $('empId').value.trim();
  const empName = $('empName').value.trim();
  const dept = $('empDept').value;
  const wageType = $('wageType').value;

  if(!empId || !empName || !dept){ alert('Please fill ID, Name and select Department'); return; }

  let dailyWage = '', monthlyWage = '', dailyLocationPay = 0, monthlyLocationPay = 0;

  if(wageType === 'daily'){
    dailyWage = parseFloat($('dailyWage').value) || 0;
    dailyLocationPay = parseFloat($('dailyLocationPay').value) || 0;
  } else {
    monthlyWage = parseFloat($('monthlyWage').value) || 0;
    monthlyLocationPay = parseFloat($('monthlyLocationPay').value) || 0;
  }

  const obj = {empId, empName, department: dept, wageType, dailyWage, dailyLocationPay, monthlyWage, monthlyLocationPay};

  if(editIndex !== null){
    employees[editIndex] = obj;
  } else {
    const existIndex = employees.findIndex(e => e.empId === empId);
    if(existIndex >= 0){
      if(!confirm('Employee exists. Overwrite?')) return;
      employees[existIndex] = obj;
    } else {
      employees.push(obj);
    }
  }

  localStorage.setItem('zxemployeeWages', JSON.stringify(employees));
  renderEmployees();
  $('employeeForm').reset();
  editIndex = null;
  $('saveEmployeeBtn').textContent = 'Save'; // revert back to Save
});

// Reset form
$('resetBtn').addEventListener('click', ()=>{
  $('employeeForm').reset();
  editIndex = null;
  $('saveEmployeeBtn').textContent = 'Save'; // reset button text
});

// Search employees
$('employeeSearch').addEventListener('input', ()=>{
  const q = $('employeeSearch').value.trim().toLowerCase();
  renderEmployees(employees.filter(e =>
    (e.empId && e.empId.toLowerCase().includes(q)) ||
    (e.empName && e.empName.toLowerCase().includes(q)) ||
    (e.department && e.department.toLowerCase().includes(q))
  ));
});

renderEmployees();
