// API URL (Adjust port if needed)
const API_URL = "/api";

// Default Subjects
const DEFAULT_SUBJECTS = [
    { name: "English", total: "" },
    { name: "Mathematics", total: "" },
    { name: "Science", total: "" },
    { name: "Social Studies", total: "" },
    { name: "Computer", total: "" }
];

let LOGGED_IN_USER = null;

function toggleAuth(showSignup) {
    document.getElementById('login-card').classList.toggle('d-none', showSignup);
    document.getElementById('signup-section').classList.toggle('d-none', !showSignup);
}

async function handleSignup() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const school_name = document.getElementById('reg-school').value;

    const res = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, school_name })
    });
    if ((await res.json()).success) {
        alert("Registration Successful! Now Login.");
        toggleAuth(false);
    }
}

// --- Login Logic ---
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if(data.success) {
        LOGGED_IN_USER = data.user;
        document.getElementById('login-section').classList.add('d-none');
        
        if (LOGGED_IN_USER.role === 'Admin') {
            document.getElementById('admin-section').classList.remove('d-none');
            loadAdminData();
        } else if (LOGGED_IN_USER.role === 'Principal') {
            document.getElementById('principal-section').classList.remove('d-none');
            loadPrincipalData();
        } else if (LOGGED_IN_USER.role === 'Teacher') {
            document.getElementById('teacher-section').classList.remove('d-none');
            loadStudents(); 
        }
    } else {
        alert(data.error || "Invalid Login!");
    }
}

function logout() {
    location.reload();
}

// --- Class List Logic ---
let ALL_STUDENTS = [];

async function loadStudents() {
    try {
        const res = await fetch(`${API_URL}/students?school_id=${LOGGED_IN_USER.school_id}`);
        ALL_STUDENTS = await res.json();
        filterStudents(); // Render with current filter
    } catch (e) {
        console.error("Error loading students:", e);
    }
}

function filterStudents() {
    const filterValue = document.getElementById('class-filter').value;
    if (filterValue === "All") {
        renderStudentTable(ALL_STUDENTS);
    } else {
        const filtered = ALL_STUDENTS.filter(s => s.studentClass === filterValue);
        renderStudentTable(filtered);
    }
}

function renderStudentTable(students) {
    const tbody = document.getElementById('student-list-body');
    tbody.innerHTML = '';

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No students added yet. Click "+ Add Student".</td></tr>';
        return;
    }

    students.forEach(s => {
        const hasMarks = s.marks && Object.keys(s.marks).length > 0;
        const statusBadge = hasMarks 
            ? '<span class="badge bg-success">Done</span>' 
            : '<span class="badge bg-warning text-dark">Pending</span>';
        
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
            <td>${s.rollNo}</td>
            <td><span class="badge bg-secondary">${s.studentClass || '-'}</span></td>
            <td class="fw-bold">${s.name}</td>
            <td>${s.fatherName}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openMarksEntry('${s.id}')">
                    <i class="fas fa-edit"></i> Enter Marks
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function addNewStudent() {
    const rollNo = document.getElementById('new-roll').value;
    const studentClass = document.getElementById('new-class').value;
    const name = document.getElementById('new-name').value;
    const fatherName = document.getElementById('new-father').value;

    if (!rollNo || !name) {
        alert("Roll No and Name are required");
        return;
    }

    await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            rollNo, 
            studentClass, 
            name, 
            fatherName, 
            school_id: LOGGED_IN_USER.school_id 
        })
    });

    // Close modal manually
    const modalEl = document.getElementById('addStudentModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl); // Safer method
    modal.hide();

    // Reload list
    loadStudents();
    
    // Clear inputs
    document.getElementById('new-roll').value = '';
    document.getElementById('new-name').value = '';
    document.getElementById('new-father').value = '';
    document.getElementById('new-class').value = '9th'; // Reset to default
}

function showClassList() {
    document.getElementById('marks-section').classList.add('d-none');
    document.getElementById('preview-container').classList.add('d-none');
    document.getElementById('class-section').classList.remove('d-none');
    loadStudents(); // Refresh data
}

// --- Placeholder functions for Admin/Principal views ---
// --- Admin Dashboard Logic ---
async function loadAdminData() {
    const res = await fetch(`${API_URL}/admin/data`);
    const data = await res.json();
    
    // Render Principals Table
    const list = document.getElementById('admin-principals-list');
    list.innerHTML = data.principals.map(p => {
        const school = data.schools.find(s => s.id === p.school_id);
        return `<tr><td>${p.name}</td><td>${p.email}</td><td>${school ? school.name : p.school_id}</td></tr>`;
    }).join('');

    // Render Pending List
    const pendingList = document.getElementById('admin-pending-list');
    if (pendingList) {
        pendingList.innerHTML = data.pending.map(p => {
            const school = data.schools.find(s => s.id === p.school_id);
            return `<tr>
                <td>${p.name}</td><td>${p.email}</td><td>${school ? school.name : p.school_id}</td>
                <td><button class="btn btn-success btn-sm" onclick="approvePrincipal('${p.id}')">Approve</button></td>
            </tr>`;
        }).join('');
    }

    // Populate Schools dropdown in Add Principal Modal
    const schoolSelect = document.getElementById('admin-p-school');
    if (schoolSelect) {
        schoolSelect.innerHTML = data.schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
}

function showAddPrincipalModal() {
    const modal = new bootstrap.Modal(document.getElementById('addPrincipalModal'));
    modal.show();
}

async function approvePrincipal(userId) {
    const res = await fetch(`${API_URL}/admin/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    });
    if ((await res.json()).success) {
        loadAdminData();
        alert("Principal approved successfully!");
    }
}

async function submitAddPrincipal() {
    const name = document.getElementById('admin-p-name').value;
    const email = document.getElementById('admin-p-email').value;
    const password = document.getElementById('admin-p-pass').value;
    const school_id = document.getElementById('admin-p-school').value;

    if (!name || !email || !password || !school_id) {
        alert("All fields are required");
        return;
    }

    const res = await fetch(`${API_URL}/admin/principals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, school_id })
    });

    if ((await res.json()).success) {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('addPrincipalModal')).hide();
        loadAdminData();
        alert("Principal added successfully!");
    }
}

// --- Principal Dashboard Logic ---
async function loadPrincipalData() {
    const res = await fetch(`${API_URL}/principal/teachers/${LOGGED_IN_USER.school_id}`);
    const data = await res.json();
    const list = document.getElementById('principal-teachers-list');
    list.innerHTML = data.map(t => 
        `<tr><td>${t.name}</td><td>${t.email}</td></tr>`
    ).join('');
}

function showAddTeacherModal() {
    const modal = new bootstrap.Modal(document.getElementById('addTeacherModal'));
    modal.show();
}

async function submitAddTeacher() {
    const name = document.getElementById('p-t-name').value;
    const email = document.getElementById('p-t-email').value;
    const password = document.getElementById('p-t-pass').value;

    if (!name || !email || !password) {
        alert("All fields are required");
        return;
    }

    const res = await fetch(`${API_URL}/principal/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, school_id: LOGGED_IN_USER.school_id })
    });

    if ((await res.json()).success) {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('addTeacherModal')).hide();
        loadPrincipalData();
        alert("Teacher added successfully!");
    }
}

// --- Dashboard Logic ---
let CURRENT_STUDENT = null;

async function openMarksEntry(studentId) {
    // Hide list, show marks section
    document.getElementById('class-section').classList.add('d-none');
    document.getElementById('marks-section').classList.remove('d-none');

    // Fetch fresh data for this student
    const res = await fetch(`${API_URL}/students`);
    const students = await res.json();
    CURRENT_STUDENT = students.find(s => s.id === studentId);

    if (!CURRENT_STUDENT) return;

    // Populate Student Details in Dashboard
    document.getElementById('active-student-name').textContent = CURRENT_STUDENT.name;
    document.getElementById('active-student-roll').textContent = CURRENT_STUDENT.rollNo;
    document.getElementById('active-student-father').textContent = CURRENT_STUDENT.fatherName;
    document.getElementById('active-student-id').value = CURRENT_STUDENT.id;

    // Populate Rows
    const tbody = document.getElementById('marks-body');
    tbody.innerHTML = '';
    
    // If marks already saved, use them. Otherwise use defaults.
    const savedMarks = CURRENT_STUDENT.marks && CURRENT_STUDENT.marks.length > 0 
        ? CURRENT_STUDENT.marks 
        : DEFAULT_SUBJECTS;

    savedMarks.forEach(sub => {
        addSubjectRow(sub.name, sub.total, sub.obtained);
    });
}

function addSubjectRow(name = "", total = "", obtained = "") {
    const tbody = document.getElementById('marks-body');
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><input type="text" class="form-control subject-name" value="${name}" placeholder="Subject"></td>
        <td><input type="number" class="form-control subject-total" value="${total}" placeholder="100"></td>
        <td><input type="number" class="form-control subject-obt" value="${obtained}" placeholder="0"></td>
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

async function saveMarksToBackend() {
    const studentId = document.getElementById('active-student-id').value;
    const rows = document.querySelectorAll('#marks-body tr');
    const marksData = [];

    rows.forEach(row => {
        marksData.push({
            name: row.querySelector('.subject-name').value,
            total: row.querySelector('.subject-total').value,
            obtained: row.querySelector('.subject-obt').value
        });
    });

    await fetch(`${API_URL}/students/${studentId}/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: marksData })
    });

    alert("Marks Saved Successfully!");
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
    const cls = document.getElementById('studentClass').value;
    const sec = document.getElementById('studentSection').value;
    const sess = document.getElementById('studentSession').value;

    // Use current student data
    const name = CURRENT_STUDENT.name;
    const father = CURRENT_STUDENT.fatherName;
    const roll = CURRENT_STUDENT.rollNo;

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
    const name = CURRENT_STUDENT ? CURRENT_STUDENT.name : 'student';
    const opt = {
        margin:       0,
        filename:     `${name}_ResultCard.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}
