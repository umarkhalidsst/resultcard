const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- In-Memory Database (RBAC Structure) ---
let SCHOOLS = [{ id: "s1", name: "FUTURE SCHOLARS HIGH SCHOOL" }];
let USERS = [
    { id: "u1", name: "System Admin", email: "admin@school.com", password: "123", role: "Admin" },
    { id: "u2", name: "Principal John", email: "principal@school.com", password: "123", role: "Principal", school_id: "s1" },
    { id: "u3", name: "Teacher Sarah", email: "teacher@school.com", password: "123", role: "Teacher", school_id: "s1" }
];
let STUDENTS = [
    { id: "st1", name: "Ali Ahmed", rollNo: "101", fatherName: "Ahmed", studentClass: "10th", school_id: "s1", marks: [] }
];

// --- Auth Routes ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = USERS.find(u => u.email === email && u.password === password);
    if (user) {
        const { password, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

// --- Admin Routes (Manage Schools & Principals) ---
app.get('/api/admin/data', (req, res) => {
    res.json({ schools: SCHOOLS, principals: USERS.filter(u => u.role === 'Principal') });
});

app.post('/api/admin/principals', (req, res) => {
    const { name, email, password, school_id } = req.body;
    const newUser = { id: Date.now().toString(), name, email, password, role: "Principal", school_id };
    USERS.push(newUser);
    res.json({ success: true });
});

// --- Principal Routes (Manage Teachers) ---
app.get('/api/principal/teachers/:school_id', (req, res) => {
    const teachers = USERS.filter(u => u.role === 'Teacher' && u.school_id === req.params.school_id);
    res.json(teachers);
});

app.post('/api/principal/teachers', (req, res) => {
    const { name, email, password, school_id } = req.body;
    const newUser = { id: Date.now().toString(), name, email, password, role: "Teacher", school_id };
    USERS.push(newUser);
    res.json({ success: true });
});

// --- Student/Marks Routes (Filtered by School) ---
app.get('/api/students', (req, res) => {
    const { school_id } = req.query;
    if (school_id) {
        res.json(STUDENTS.filter(s => s.school_id === school_id));
    } else {
        res.json(STUDENTS);
    }
});

app.post('/api/students', (req, res) => {
    const { name, rollNo, fatherName, studentClass, school_id } = req.body;
    const newStudent = { id: Date.now().toString(), name, rollNo, fatherName, studentClass, school_id, marks: [] };
    STUDENTS.push(newStudent);
    res.json({ success: true, student: newStudent });
});

// Save marks for a student
app.post('/api/students/:id/marks', (req, res) => {
    const { id } = req.params;
    const { marks } = req.body;
    
    const student = STUDENTS.find(s => s.id === id);
    if (student) {
        student.marks = marks;
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Student not found" });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`School Result Card System running at http://localhost:${PORT}`);
});