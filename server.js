const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- In-Memory Database (RBAC Structure) ---
let SCHOOLS = [{ id: "s1", name: "GHS Chitti Sheikhan", logo: "" }];
let USERS = [
    { id: "u1", name: "System Admin", phone: "03217193209", password: "Umar@8627", role: "Admin", approved: true },
    { id: "u2", name: "Umar Khalid", phone: "03337193209", password: "123", role: "Principal", school_id: "s1", approved: true },
    { id: "u3", name: "Teacher Sarah", phone: "03111111111", password: "123", role: "Teacher", school_id: "s1", approved: true }
];
let STUDENTS = [
    { id: "st1", name: "Ali Ahmed", rollNo: "101", fatherName: "Ahmed", studentClass: "10th", school_id: "s1", marks: [] }
];

// --- Auth Routes ---
app.post('/api/login', (req, res) => {
    console.log("Login Attempt:", req.body.phone);
    const { phone, password } = req.body;
    const user = USERS.find(u => u.phone === phone && u.password === password);
    if (user) {
        if (user.role !== 'Admin' && !user.approved) {
            return res.status(403).json({ error: "Wait for Admin Approval" });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

// Principal Sign-up
app.post('/api/signup', (req, res) => {
    console.log("Signup Received:", req.body);
    const { name, phone, password, school_name } = req.body;
    const school_id = "s" + Date.now();
    SCHOOLS.push({ id: school_id, name: school_name, logo: "" });
    USERS.push({ id: "u" + Date.now(), name, phone, password, role: "Principal", school_id, approved: false });
    res.json({ success: true });
});

// --- Admin Routes (Manage Schools & Principals) ---
app.get('/api/admin/data', (req, res) => {
    res.json({ 
        schools: SCHOOLS, 
        principals: USERS.filter(u => u.role === 'Principal' && u.approved),
        pending: USERS.filter(u => u.role === 'Principal' && !u.approved)
    });
});

app.post('/api/admin/approve', (req, res) => {
    const { user_id } = req.body;
    const user = USERS.find(u => u.id === user_id);
    if (user) {
        user.approved = true;
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "User not found" });
    }
});

app.post('/api/admin/principals', (req, res) => {
    const { name, phone, password, school_id } = req.body;
    const newUser = { id: Date.now().toString(), name, phone, password, role: "Principal", school_id, approved: true };
    USERS.push(newUser);
    res.json({ success: true });
});

// --- Principal Routes (Manage Teachers) ---
app.get('/api/principal/teachers/:school_id', (req, res) => {
    const teachers = USERS.filter(u => u.role === 'Teacher' && u.school_id === req.params.school_id);
    res.json(teachers);
});

app.post('/api/principal/teachers', (req, res) => {
    const { name, phone, password, school_id } = req.body;
    const newUser = { id: Date.now().toString(), name, phone, password, role: "Teacher", school_id, approved: true };
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

app.post('/api/upload-students', (req, res) => {
    const { students } = req.body;
    if (!students || !Array.isArray(students)) {
        return res.status(400).json({ error: "Invalid data format: 'students' array required" });
    }

    students.forEach(s => {
        s.id = "st" + Date.now() + Math.random().toString(36).substr(2, 5);
        if (!s.marks) s.marks = [];
        STUDENTS.push(s);
    });
    res.json({ success: true });
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

// --- School Profile Routes ---
app.get('/api/school/:id', (req, res) => {
    const school = SCHOOLS.find(s => s.id === req.params.id);
    if (school) return res.json(school);
    res.status(404).json({ error: "School not found" });
});

app.post('/api/school/:id', (req, res) => {
    const { logo, name } = req.body;
    const school = SCHOOLS.find(s => s.id === req.params.id);
    if (school) {
        if (logo !== undefined) school.logo = logo;
        if (name !== undefined) school.name = name;
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "School not found" });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`School Result Card System running at http://localhost:${PORT}`);
});