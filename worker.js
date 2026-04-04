import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import manifest from '__STATIC_CONTENT_MANIFEST';

const app = new Hono();

// --- In-Memory Database (RBAC Structure) ---
// Note: This resets when the Worker goes idle.
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
app.post('/api/login', async (c) => {
    try {
        const body = await c.req.json().catch(() => ({}));
        const { phone, password } = body;
        
        // Use environment variables for admin if available in the worker context
        const adminPhone = (c.env && c.env.ADMIN_PHONE) || "03217193209";
        const adminPass = (c.env && c.env.ADMIN_PASSWORD) || "Umar@8627";

        const foundUser = USERS.find(u => {
            const isSystemAdmin = u.id === "u1" && phone === adminPhone && password === adminPass;
            return isSystemAdmin || (u.phone === phone && u.password === password);
        });

        if (foundUser) {
            if (foundUser.role !== 'Admin' && !foundUser.approved) {
                return c.json({ error: "Wait for Admin Approval" }, 403);
            }
            const { password: _, ...userWithoutPassword } = foundUser;
            return c.json({ success: true, user: userWithoutPassword });
        }
        return c.json({ error: "Invalid credentials" }, 401);
    } catch (err) {
        return c.json({ error: "Invalid request format" }, 400);
    }
});

// --- Admin Routes ---
app.get('/api/admin/data', (c) => {
    return c.json({ 
        schools: SCHOOLS, 
        principals: USERS.filter(u => u.role === 'Principal' && u.approved),
        pending: USERS.filter(u => u.role === 'Principal' && !u.approved)
    });
});

// Principal Sign-up (Self-service)
app.post('/api/signup', async (c) => {
    const { name, phone, password, school_name } = await c.req.json();
    const school_id = "s" + Date.now();
    SCHOOLS.push({ id: school_id, name: school_name });
    USERS.push({ id: "u" + Date.now(), name, phone, password, role: "Principal", school_id, approved: false });
    return c.json({ success: true });
});

app.post('/api/admin/principals', async (c) => {
    const { name, phone, password, school_id } = await c.req.json();
    USERS.push({ id: Date.now().toString(), name, phone, password, role: "Principal", school_id, approved: true });
    return c.json({ success: true });
});

app.post('/api/admin/approve', async (c) => {
    const { user_id } = await c.req.json();
    const user = USERS.find(u => u.id === user_id);
    if (user) {
        user.approved = true;
        return c.json({ success: true });
    }
    return c.json({ error: "User not found" }, 404);
});

// --- School Profile Routes ---
app.get('/api/school/:id', (c) => {
    const school = SCHOOLS.find(s => s.id === c.req.param('id'));
    if (school) return c.json(school);
    return c.json({ error: "School not found" }, 404);
});

app.post('/api/school/:id', async (c) => {
    const { logo, name } = await c.req.json();
    const school = SCHOOLS.find(s => s.id === c.req.param('id'));
    if (school) {
        if (logo !== undefined) school.logo = logo;
        if (name !== undefined) school.name = name;
        return c.json({ success: true });
    }
    return c.json({ error: "School not found" }, 404);
});

// --- Principal Routes ---
app.get('/api/principal/teachers/:school_id', (c) => {
    const school_id = c.req.param('school_id');
    return c.json(USERS.filter(u => u.role === 'Teacher' && u.school_id === school_id));
});

app.post('/api/principal/teachers', async (c) => {
    const { name, phone, password, school_id } = await c.req.json();
    USERS.push({ id: Date.now().toString(), name, phone, password, role: "Teacher", school_id, approved: true });
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

app.post('/api/upload-students', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { students } = body;
    
    if (!students || !Array.isArray(students)) {
        return c.json({ error: "Invalid data format: 'students' array required" }, 400);
    }

    students.forEach(s => {
        s.id = "st" + Date.now() + Math.random().toString(36).substr(2, 5);
        if (!s.marks) s.marks = [];
        STUDENTS.push(s);
    });
    return c.json({ success: true });
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

// --- Serve Static Frontend Assets (Must be at the end) ---
app.use('/*', serveStatic({ 
    root: './', 
    manifest,
    rewriteRequestPath: (path) => (path === '/' ? '/index.html' : path)
}));

export default app;