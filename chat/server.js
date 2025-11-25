const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const db = new sqlite3.Database("./database.db");

// ---------------------------------------------
// MIDDLEWARE
// ---------------------------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use(session({
    secret: "gizli_anahtar",
    resave: false,
    saveUninitialized: false
}));

// ---------------------------------------------
// DOSYA UPLOAD AYARI
// ---------------------------------------------
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// ---------------------------------------------
// DATABASE OLUŞTURMA
// ---------------------------------------------
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS announcements (id INTEGER PRIMARY KEY, title TEXT, body TEXT, time TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, filename TEXT, time TEXT)");
});

// ---------------------------------------------
// İLK ADMİN OLUŞTURMA (eğer yoksa)
// username: admin, password: 1234
// ---------------------------------------------
db.get("SELECT * FROM users WHERE username = 'admin'", async (err, row) => {
    if (!row) {
        const hashed = await bcrypt.hash("1234", 10);
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", ["admin", hashed]);
        console.log("Admin oluşturuldu: admin / 1234");
    }
});

// ---------------------------------------------
// MIDDLEWARE → LOGIN KONTROL
// ---------------------------------------------
function auth(req, res, next) {
    if (!req.session.user) return res.redirect("/login");
    next();
}

// ---------------------------------------------
// ROUTES
// ---------------------------------------------
app.get("/", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.redirect("/dashboard");
});

// Login sayfası
app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/views/login.html");
});

// Login POST
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (!user) return res.send("Kullanıcı bulunamadı.");
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.send("Şifre yanlış.");
        req.session.user = user;
        res.redirect("/dashboard");
    });
});

// Dashboard
app.get("/dashboard", auth, (req, res) => {
    res.sendFile(__dirname + "/views/dashboard.html");
});

// Duyuru ekleme
app.post("/add-announcement", auth, (req, res) => {
    db.run(
        "INSERT INTO announcements (title, body, time) VALUES (?, ?, datetime('now'))",
        [req.body.title, req.body.body]
    );
    res.redirect("/dashboard");
});

// Dosya yükleme
app.post("/upload", auth, upload.single("file"), (req, res) => {
    db.run(
        "INSERT INTO files (filename, time) VALUES (?, datetime('now'))",
        [req.file.filename]
    );
    res.redirect("/dashboard");
});

// Duyuruları listeleme (API)
app.get("/api/announcements", auth, (req, res) => {
    db.all("SELECT * FROM announcements ORDER BY id DESC", [], (err, rows) => {
        res.json(rows);
    });
});

// Dosyaları listeleme (API)
app.get("/api/files", auth, (req, res) => {
    db.all("SELECT * FROM files ORDER BY id DESC", [], (err, rows) => {
        res.json(rows);
    });
});

// Dosya indirme
app.get("/download/:name", auth, (req, res) => {
    res.download(path.join(__dirname, "uploads", req.params.name));
});

// Çıkış
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// ---------------------------------------------
app.listen(3000, () => console.log("Panel çalışıyor: http://localhost:3000"));
