import { Hono } from 'hono';

const app = new Hono();

// --- In-Memory Database (RBAC Structure) ---
// Note: This resets when the Worker goes idle.
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
app.post('/api/login', async (c) => {
    const { email, password } = await c.req.json();
    const user = USERS.find(u => u.email === email && u.password === password);
    if (user) {
        const { password: _, ...userWithoutPassword } = user;
        return c.json({ success: true, user: userWithoutPassword });
    }
    return c.json({ error: "Invalid credentials" }, 401);
});

// --- Admin Routes ---
app.get('/api/admin/data', (c) => {
    return c.json({ schools: SCHOOLS, principals: USERS.filter(u => u.role === 'Principal') });
});

app.post('/api/admin/principals', async (c) => {
    const { name, email, password, school_id } = await c.req.json();
    USERS.push({ id: Date.now().toString(), name, email, password, role: "Principal", school_id });
    return c.json({ success: true });
});

// --- Principal Routes ---
app.get('/api/principal/teachers/:school_id', (c) => {
    const school_id = c.req.param('school_id');
    return c.json(USERS.filter(u => u.role === 'Teacher' && u.school_id === school_id));
});

app.post('/api/principal/teachers', async (c) => {
    const { name, email, password, school_id } = await c.req.json();
    USERS.push({ id: Date.now().toString(), name, email, password, role: "Teacher", school_id });
    return c.json({ success: true });
});

// --- Student/Marks Routes ---
app.get('/api/students', (c) => {
    const school_id = c.req.query('school_id');
    if (school_id) {
        return c.json(STUDENTS.filter(s => s.school_id === school_id));
    }
    return c.json(STUDENTS);
});

app.post('/api/students', async (c) => {
    const { name, rollNo, fatherName, studentClass, school_id } = await c.req.json();
    const newStudent = { 
        id: Date.now().toString(), 
        name, 
        rollNo, 
        fatherName, 
        studentClass, 
        school_id, 
        marks: [] 
    };
    STUDENTS.push(newStudent);
    return c.json({ success: true, student: newStudent });
});

app.post('/api/students/:id/marks', async (c) => {
    const id = c.req.param('id');
    const { marks } = await c.req.json();
    const student = STUDENTS.find(s => s.id === id);
    if (student) {
        student.marks = marks;
        return c.json({ success: true });
    }
    return c.json({ error: "Student not found" }, 404);
});

export default app;