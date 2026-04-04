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
let LOGGED_IN_SCHOOL = null;

function toggleAuth(showSignup) {
    document.getElementById('login-card').classList.toggle('d-none', showSignup);
    document.getElementById('signup-section').classList.toggle('d-none', !showSignup);
}

async function handleSignup() {
    const name = document.getElementById('reg-name').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-pass').value;
    const school_name = document.getElementById('reg-school').value;

    const res = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password, school_name })
    });
    if ((await res.json()).success) {
        alert("Registration Successful! Now Login.");
        toggleAuth(false);
    }
}

// --- Login Logic ---
async function handleLogin() {
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
    });
    const data = await res.json();

    if(data.success) {
        LOGGED_IN_USER = data.user;
        // Sirf Principal aur Teacher ke liye school details fetch karein
        if (LOGGED_IN_USER.school_id) {
            const schoolRes = await fetch(`${API_URL}/school/${LOGGED_IN_USER.school_id}`);
            LOGGED_IN_SCHOOL = await schoolRes.json();
        }

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
    const filterEl = document.getElementById('class-filter');
    const filterValue = (filterEl ? filterEl.value : "All").trim();

    if (filterValue === "All" || filterValue === "") {
        renderStudentTable(ALL_STUDENTS);
    } else {
        const filtered = ALL_STUDENTS.filter(s => (s.studentClass || "").trim() === filterValue);
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
        const hasMarks = s.marks && s.marks.length > 0;
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
    document.getElementById('teacher-section').classList.remove('d-none');
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
        return `<tr><td>${p.name}</td><td>${p.phone}</td><td>${school ? school.name : p.school_id}</td></tr>`;
    }).join('');

    // Render Pending List
    const pendingList = document.getElementById('admin-pending-list');
    if (pendingList) {
        pendingList.innerHTML = data.pending.map(p => {
            const school = data.schools.find(s => s.id === p.school_id);
            return `<tr>
                <td>${p.name}</td><td>${p.phone}</td><td>${school ? school.name : p.school_id}</td>
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
    const phone = document.getElementById('admin-p-phone').value;
    const password = document.getElementById('admin-p-pass').value;
    const school_id = document.getElementById('admin-p-school').value;

    if (!name || !phone || !password || !school_id) {
        alert("All fields are required");
        return;
    }

    const res = await fetch(`${API_URL}/admin/principals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password, school_id })
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
        `<tr><td>${t.name}</td><td>${t.phone}</td></tr>`
    ).join('');
}

async function saveSchoolSettings() {
    const fileInput = document.getElementById('p-school-logo-file');
    const file = fileInput.files[0];
    
    let logoData = LOGGED_IN_SCHOOL.logo;

    if (file) {
        // Convert the local file to a Base64 string
        logoData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    const res = await fetch(`${API_URL}/school/${LOGGED_IN_USER.school_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: logoData })
    });

    if ((await res.json()).success) {
        LOGGED_IN_SCHOOL.logo = logoData;
        alert("School Profile Updated!");
    }
}

async function handlePrincipalBulkUpload() {
    const fileInput = document.getElementById('p-bulk-excel');
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select an Excel file first.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        let allUploadedStudents = [];

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            
            // Helper to find column value by fuzzy key matching
            const getVal = (row, patterns) => {
                const key = Object.keys(row).find(k => 
                    patterns.some(p => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p))
                );
                return key ? String(row[key]).trim() : '';
            };

            const students = json.map(row => {
                const student = {
                    rollNo: getVal(row, ['rollnumber', 'rollno', 'roll']),
                    name: getVal(row, ['name', 'studentname']),
                    fatherName: getVal(row, ['fathername', 'fathersname', 'father']),
                    studentClass: getVal(row, ['class']) || sheetName, 
                    school_id: LOGGED_IN_USER.school_id,
                    marks: []
                };

                // Identify subject marks (any column not used for identity)
                const identityKeys = ['rollnumber', 'rollno', 'roll', 'name', 'studentname', 'fathername', 'fathersname', 'father', 'class', 'section'];
                Object.keys(row).forEach(key => {
                    const cleanKey = key.trim();
                    const normalizedKey = cleanKey.toLowerCase().replace(/[^a-z0-9]/g, '');
                    
                    // Skip if it's an identity column
                    if (identityKeys.some(ik => normalizedKey.includes(ik))) {
                        return;
                    }

                    if (!identityKeys.includes(normalizedKey) && row[key] !== undefined) {
                        // Check for format: Subject Name (Total Marks) e.g. "Maths (75)"
                        let subjectName = key;
                        let totalMarks = 100; // Default

                        const match = key.match(/(.+)\((.+)\)/);
                        if (match) {
                            subjectName = match[1].trim();
                            totalMarks = parseFloat(match[2]) || 100;
                        }

                        student.marks.push({
                            name: subjectName,
                            total: totalMarks,
                            obtained: row[key]
                        });
                    }
                });
                return student;
            }).filter(s => s.rollNo && s.name);

            allUploadedStudents = allUploadedStudents.concat(students);
        });

        if (allUploadedStudents.length === 0) {
            alert("No valid student data found. Ensure columns match: Roll No, Name, Father Name.");
            return;
        }

        const res = await fetch(`${API_URL}/upload-students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students: allUploadedStudents })
        });

        if ((await res.json()).success) {
            alert(`Successfully uploaded ${allUploadedStudents.length} students across all classes.`);
            fileInput.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

function showAddTeacherModal() {
    const modal = new bootstrap.Modal(document.getElementById('addTeacherModal'));
    modal.show();
}

async function submitAddTeacher() {
    const name = document.getElementById('p-t-name').value;
    const phone = document.getElementById('p-t-phone').value;
    const password = document.getElementById('p-t-pass').value;

    if (!name || !phone || !password) {
        alert("All fields are required");
        return;
    }

    const res = await fetch(`${API_URL}/principal/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password, school_id: LOGGED_IN_USER.school_id })
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
    document.getElementById('teacher-section').classList.add('d-none');
    document.getElementById('marks-section').classList.remove('d-none');

    // Fetch fresh data for this student
    CURRENT_STUDENT = ALL_STUDENTS.find(s => s.id === studentId);

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

function fillCardData(cardElement, student, metadata) {
    cardElement.querySelector('#disp-school').textContent = metadata.school;
    cardElement.querySelector('#disp-name').textContent = student.name;
    cardElement.querySelector('#disp-father').textContent = student.fatherName;
    cardElement.querySelector('#disp-roll').textContent = student.rollNo;
    cardElement.querySelector('#disp-class').textContent = metadata.cls;
    cardElement.querySelector('#disp-section').textContent = `(${metadata.sec})`;
    cardElement.querySelector('#disp-session').textContent = metadata.sess;

    const logoImg = cardElement.querySelector('#disp-logo-img');
    const logoIcon = cardElement.querySelector('#disp-logo-icon');
    if (LOGGED_IN_SCHOOL && LOGGED_IN_SCHOOL.logo) {
        logoImg.src = LOGGED_IN_SCHOOL.logo;
        logoImg.classList.remove('d-none');
        if (logoIcon) logoIcon.classList.add('d-none');
    } else {
        logoImg.classList.add('d-none');
        if (logoIcon) logoIcon.classList.remove('d-none');
    }

    const dispBody = cardElement.querySelector('#disp-marks-body');
    dispBody.innerHTML = '';
    let grandTotalMax = 0;
    let grandTotalObt = 0;

    student.marks.forEach(m => {
        const sub = m.name;
        const total = parseFloat(m.total) || 0;
        const obt = parseFloat(m.obtained) || 0;

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

    cardElement.querySelector('#grand-total-max').textContent = grandTotalMax;
    cardElement.querySelector('#grand-total-obt').textContent = grandTotalObt;
    cardElement.querySelector('#grand-percentage').textContent = grandPerc + "%";
    cardElement.querySelector('#grand-grade').textContent = grandGrade;
    cardElement.querySelector('#disp-remarks').textContent = remarks;
}

function generateResult() {
    const metadata = {
        school: document.getElementById('schoolName').value,
        cls: document.getElementById('studentClass').value,
        sec: document.getElementById('studentSection').value,
        sess: document.getElementById('studentSession').value
    };

    // Temporarily sync DOM marks back to CURRENT_STUDENT object for filling
    const rows = document.querySelectorAll('#marks-body tr');
    CURRENT_STUDENT.marks = Array.from(rows).map(row => ({
        name: row.querySelector('.subject-name').value,
        total: row.querySelector('.subject-total').value,
        obtained: row.querySelector('.subject-obt').value
    })).filter(m => m.name);

    fillCardData(document.getElementById('result-card'), CURRENT_STUDENT, metadata);

    // 5. Show Preview
    document.getElementById('preview-container').classList.remove('d-none');
    document.getElementById('preview-container').classList.add('d-flex');
    document.getElementById('preview-container').scrollIntoView({ behavior: 'smooth' });
}

async function printAllCards() {
    const filterValue = document.getElementById('class-filter').value;
    const studentsToPrint = filterValue === "All" 
        ? ALL_STUDENTS 
        : ALL_STUDENTS.filter(s => (s.studentClass || "").trim() === filterValue);

    if (studentsToPrint.length === 0) {
        alert("No students found in this class to print.");
        return;
    }

    const metadata = {
        school: "GHS Chitti Sheikhan", // Default or pull from school profile
        cls: filterValue === "All" ? "Various" : filterValue,
        sec: "A",
        sess: "2025-2026"
    };

    const printContainer = document.createElement('div');
    const template = document.getElementById('result-card');

    studentsToPrint.forEach((student, index) => {
        const cardClone = template.cloneNode(true);
        cardClone.id = `print-card-${index}`;
        
        // Ensure the card has a page break after it
        cardClone.style.marginBottom = "50px"; 
        cardClone.style.pageBreakAfter = "always";

        fillCardData(cardClone, student, metadata);
        printContainer.appendChild(cardClone);
    });

    const opt = {
        margin: [10, 10],
        filename: `Class_${metadata.cls}_Results.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    alert(`Preparing ${studentsToPrint.length} result cards... Please wait.`);
    await html2pdf().set(opt).from(printContainer).save();
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
