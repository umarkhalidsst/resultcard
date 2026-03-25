// Default Subjects
const DEFAULT_SUBJECTS = [
    { name: "English", total: "" },
    { name: "Mathematics", total: "" },
    { name: "Science", total: "" },
    { name: "Social Studies", total: "" },
    { name: "Computer", total: "" }
];

// --- Login Logic ---
function handleLogin() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    
    if(u === "admin" && p === "1234") {
        document.getElementById('login-section').classList.add('d-none');
        document.getElementById('dashboard-section').classList.remove('d-none');
        initDashboard();
    } else {
        alert("Invalid Credentials! (Try: admin / 1234)");
    }
}

function logout() {
    location.reload();
}

// --- Dashboard Logic ---
function initDashboard() {
    const tbody = document.getElementById('marks-body');
    tbody.innerHTML = '';
    
    DEFAULT_SUBJECTS.forEach(sub => {
        addSubjectRow(sub.name, sub.total);
    });
}

function addSubjectRow(name = "", total = "") {
    const tbody = document.getElementById('marks-body');
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><input type="text" class="form-control subject-name" value="${name}" placeholder="Subject"></td>
        <td><input type="number" class="form-control subject-total" value="${total}" placeholder="100"></td>
        <td><input type="number" class="form-control subject-obt" placeholder="0"></td>
        <td class="text-center"><button class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()">X</button></td>
    `;
    tbody.appendChild(row);
}

// --- Calculation & Generation Logic ---
function calculateGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
}

function getRemarks(percentage) {
    if (percentage >= 90) return "Excellent Performance! Keep it up.";
    if (percentage >= 75) return "Very Good. Consistent effort shown.";
    if (percentage >= 60) return "Good. Can improve with more focus.";
    if (percentage >= 50) return "Needs Improvement. Work harder.";
    return "Fail. Critical attention required.";
}

function generateResult() {
    // 1. Get Student Info
    const school = document.getElementById('schoolName').value;
    const name = document.getElementById('studentName').value;
    const father = document.getElementById('fatherName').value;
    const roll = document.getElementById('rollNo').value;
    const cls = document.getElementById('class').value;
    const sec = document.getElementById('section').value;
    const sess = document.getElementById('session').value;

    if(!name || !roll) {
        alert("Please fill in Student Name and Roll Number.");
        return;
    }

    // 2. Populate Info Grid
    document.getElementById('disp-school').textContent = school;
    document.getElementById('disp-name').textContent = name;
    document.getElementById('disp-father').textContent = father;
    document.getElementById('disp-roll').textContent = roll;
    document.getElementById('disp-class').textContent = cls;
    document.getElementById('disp-section').textContent = `(${sec})`;
    document.getElementById('disp-session').textContent = sess;

    // 3. Process Marks
    const rows = document.querySelectorAll('#marks-body tr');
    const dispBody = document.getElementById('disp-marks-body');
    dispBody.innerHTML = '';

    let grandTotalMax = 0;
    let grandTotalObt = 0;

    rows.forEach(row => {
        const sub = row.querySelector('.subject-name').value;
        const total = parseFloat(row.querySelector('.subject-total').value) || 0;
        const obt = parseFloat(row.querySelector('.subject-obt').value) || 0;

        if(!sub) return;

        const perc = total > 0 ? ((obt / total) * 100).toFixed(1) : 0;
        const grade = calculateGrade(perc);
        
        grandTotalMax += total;
        grandTotalObt += obt;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-start ps-3">${sub}</td>
            <td>${total}</td>
            <td>${obt}</td>
            <td>${perc}%</td>
            <td class="fw-bold ${grade === 'F' ? 'text-danger' : ''}">${grade}</td>
        `;
        dispBody.appendChild(tr);
    });

    // 4. Totals
    const grandPerc = grandTotalMax > 0 ? ((grandTotalObt / grandTotalMax) * 100).toFixed(2) : 0;
    const grandGrade = calculateGrade(grandPerc);
    const remarks = getRemarks(grandPerc);

    document.getElementById('grand-total-max').textContent = grandTotalMax;
    document.getElementById('grand-total-obt').textContent = grandTotalObt;
    document.getElementById('grand-percentage').textContent = grandPerc + "%";
    document.getElementById('grand-grade').textContent = grandGrade;
    document.getElementById('disp-remarks').textContent = remarks;

    // 5. Show Preview
    document.getElementById('preview-container').classList.remove('d-none');
    document.getElementById('preview-container').classList.add('d-flex');
    
    // Scroll to preview
    document.getElementById('preview-container').scrollIntoView({ behavior: 'smooth' });
}

function editData() {
    document.getElementById('preview-container').classList.add('d-none');
    document.getElementById('preview-container').classList.remove('d-flex');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function downloadPDF() {
    const element = document.getElementById('result-card');
    const name = document.getElementById('studentName').value || 'student';
    const opt = {
        margin:       0,
        filename:     `${name}_ResultCard.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}
