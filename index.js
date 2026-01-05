const mysql = require("mysql");
const crypto = require('crypto');
const cookiesSession = require('cookie-session');
const express = require('express');
const multer = require('multer')
const upload = multer({ dest: 'temp/' })
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
const { name } = require("ejs");
const password_salt = "test";
const fs = require("fs");
/* ================== Multer Config ================== */
const tempDir = path.join(__dirname, "temp");
const propertyDir = path.join(__dirname, "property");

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
if (!fs.existsSync(propertyDir)) fs.mkdirSync(propertyDir);



app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.use("/css", express.static(__dirname + "/css"));
app.use("/js", express.static(__dirname + "/js"));
app.use("/property", express.static(__dirname + "/property"));
app.use(express.static(__dirname + "/public"));


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cookiesSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge: 24 * 60 * 60 * 1000 // อายุ cookie = 1 วัน (ms)
}));

function ShowMessage(msg) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Register</title>
        <link href="/css/styles.css" rel="stylesheet" />
        <link href="//maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="text-center" style="padding:50px;">
        <h1>${msg}</h1>
        <button class="btn btn-success" style="background-color:rgb(20,152,250);" 
        onclick="if(document.referrer === ''){ window.location.href='/login'; } else { window.history.back(); }">
            back
        </button>   
    </body>
    </html>`;
}


app.get("/", (req, res) => {
    res.render("property_view", { items: [] })
});

app.get("/search", (req, res) => {

    const mysql = require("mysql");
    const conn = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "property"
    });

    const keyword = req.query.keyword || "";

    let sql = ` SELECT * FROM \`w701_test_properties\`
            WHERE \`real_estate_name\` LIKE ?
            OR \`LOCATION\` LIKE ?
            `;

    console.log(sql);
    conn.query(sql, ['%' + keyword + '%', '%' + keyword + '%'], function(err, results, fields) {
        if (err) throw err;
        console.log(results);
        res.render("property_view", { items: results });
    });

    conn.end();
});


app.get("/property_detail/:id", (req, res) => {

    const mysql = require("mysql");
    const conn = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "property"
    });

    const id = req.params.id || 0;

    let sql = ` SELECT * FROM \`w701_test_properties\`
    WHERE  id = ?
    `;

    console.log(sql);
    conn.query(sql, [id], function(err, results, fields) {
        if (err) throw err;
        console.log(results);
        res.render("property_detail", { item: results[0] });
        conn.end();
    });

});

app.get("/login", (req, res) => {

    res.render("login")

});

app.post("/login", (req, res) => {

    let user = req.body.email || "";
    let pass = req.body.pass || "";
    let conn = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "property"
    });

    const hash = crypto.createHash('sha256').update(pass + password_salt).digest('base64');
    const sqlCheck = `SELECT *  FROM users WHERE email = ? AND password = ?`;
    conn.query(sqlCheck, [user, hash], function(err, results, fields) {
        if (err) throw err;
        if (results.length > 0) {
            // 🔹 Login successful → ตั้ง session
            req.session.user = {
                name: results[0].name,
                role: results[0].role,
                email: results[0].email
            };

            res.redirect("/dashboard");

        } else {
            // Login failed
            res.send(`
                    <h1>Login Failed!</h1>
                    <p>Invalid email or password.</p>
                    <a href="/login">Go back</a>
                `);
        }
    });
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/");

});

app.get("/register", (req, res) => {

    res.render("register")

});

app.post("/register", (req, res) => {

    const mysql = require("mysql");
    const conn = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "property"
    });

    const email = req.body.email || "";
    const password = req.body.password || "";
    const name = req.body.name || "";
    const telephone = req.body.telephone || "";

    // ✅ ตรวจสอบว่าค่าครบไหม
    if (!email || !password || !name || !telephone) {
        return res.status(400).send("Please fill in all fields.");
    }

    const sqlCheck = `SELECT count(*) FROM users WHERE email = ?`;

    console.log("SQL:", sqlCheck);

    conn.query(sqlCheck, [email], function(err, results, fields) {
        if (err) throw err;

        if (results[0]['count(*)'] > 0) {
            return res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Register</title>
                    <link href="/css/styles.css" rel="stylesheet" />
                    <link href="//maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" rel="stylesheet">
                </head>
                <body class="text-center" style="padding:50px;">
                    <h1>Email already used</h1>
                    <p>Please <a href="/register" class="btn btn-warning">Go back</a></p>
                </body>
                </html>
            `);
        }

        const sql = `
    INSERT INTO users (email, password, name, telephone, role)
    VALUES (?, ?, ?, ?, 'user')`;
        const hash = crypto.createHash('sha256').update(password + password_salt).digest('base64');
        console.log("Password:", password);
        console.log("SHA-256 Hash:", hash);


        console.log("SQL:", sql);
        conn.query(sql, [email, hash, name, telephone], function(err, results, fields) {
            if (err) throw err;
            // console.log(results);

            // ✅ แสดงหน้า success หลังจากลงทะเบียนเสร็จ
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Register</title>
                    <link href="/css/styles.css" rel="stylesheet" />
                    <link href="//maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" rel="stylesheet">
                </head>
                <body class="text-center" style="padding:50px;">
                    <h1>Register successful!</h1>
                    <p>Please <a href="/login" class="btn btn-success">Login</a></p>
                </body>
                </html>
            `);

            conn.end();
        });
    });
});

app.get("/dashboard", (req, res) => {
    if (req.session.user) {
        res.render('dashboard/index', {
            name: req.session.user.name,
            role: req.session.user.role
        });
    } else {
        res.redirect("/login");
    }
});

app.get("/dashboard/user", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const conn = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "property"
    });

    conn.connect((err) => {
        if (err) throw err;

        let sqlCheck = ``;
        let email = req.session.user.email;

        if (req.session.user.role === 'admin') {

            sqlCheck = `SELECT * FROM users ORDER BY id`;

            conn.query(sqlCheck, function(err, results) {
                if (err) throw err;

                res.render("dashboard/user_manage", {
                    users: results,
                    name: req.session.user.name,
                    role: req.session.user.role
                });

                conn.end();
            });

        } else {

            sqlCheck = `SELECT * FROM users WHERE email = ? ORDER BY id`;

            conn.query(sqlCheck, [email], function(err, results) {
                if (err) throw err;

                res.render("dashboard/user_manage", {
                    users: results,
                    name: req.session.user.name,
                    role: req.session.user.role
                });

                conn.end();
            });
        }
    });
});

app.post("/dashboard/user/edit", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const conn = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "property"
    });

    conn.connect((err) => {
        if (err) throw err;

        let sqlCheck = ``;
        let newrole = req.body.newrole || '';
        let id = req.body.id || '';

        sqlCheck = `UPDATE users SET role = ? WHERE id = ?`;

        conn.query(sqlCheck, [newrole, id], function(err, results) {
            if (err) throw err;
            res.send(ShowMessage("Update Successfully")); // ✔ ส่งข้อความสำเร็จ
            conn.end();
        });


    });
});

app.get("/dashboard/property", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const conn = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "property"
    });

    conn.connect((err) => {
        if (err) throw err;

        let sqlCheck = `SELECT * FROM w701_test_properties ORDER BY id`;

        conn.query(sqlCheck, function(err, results) {
            if (err) throw err;

            res.render("dashboard/property_manage", {
                properties: results,
                name: req.session.user.name,
                role: req.session.user.role
            });

            conn.end();
        });

    });
});

app.get("/dashboard/property/edit", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const conn = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "property"
    });

    conn.connect((err) => {
        if (err) throw err;
        // let id = req.body.id || '';
        let id = req.query.id || '';
        let sqlCheck = `SELECT * FROM w701_test_properties WHERE id = ? ORDER BY id`;

        conn.query(sqlCheck, [id], function(err, results) {
            if (err) throw err;

            res.render("dashboard/property_manage_edit", {
                item: results[0]
                    // ,
                    // name: req.session.user.name,
                    // role: req.session.user.role
            });

            conn.end();
        });

    });
});

app.post(
    "/dashboard/property/edit",
    upload.fields([
        { name: "image_01", maxCount: 1 },
        { name: "image_02", maxCount: 1 },
        { name: "image_03", maxCount: 1 },
        { name: "image_04", maxCount: 1 },
        { name: "image_05", maxCount: 1 },
    ]),
    (req, res) => {

        if (!req.session.user) {
            return res.redirect("/login");
        }

        const conn = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "property"
        });

        conn.connect(err => {
            if (err) throw err;

            /* ================== Handle Images ================== */
            const images = {};
            const allowedExt = [".jpg", ".jpeg", ".png"];

            for (let i = 1; i <= 5; i++) {
                const key = `image_0${i}`;

                if (req.files[key]) {
                    const file = req.files[key][0];
                    const ext = path.extname(file.originalname).toLowerCase();

                    if (!allowedExt.includes(ext)) {
                        fs.unlinkSync(file.path);
                        continue;
                    }

                    const newName = `${Date.now()}_${key}${ext}`;
                    const targetPath = path.join(propertyDir, newName);

                    fs.renameSync(file.path, targetPath);
                    images[key] = newName; // เก็บชื่อไฟล์ไว้ลง DB
                }
            }

            /* ================== Form Data ================== */
            const {
                id,
                real_estate_name,
                lat,
                lon,
                LOCATION,
                property_type,
                TRANSACTION,
                SALE_TERMS,
                SALE_PRICE,
                RENT_PRICE,
                COMMON_CHARGES,
                DECORATION_STYLE,
                BEDROOMS,
                BATHROOMS,
                DIRECTION_OF_ROOM,
                UNIT_SIZE,
                LAND_AREA,
                INROOM_FACILITIES,
                PUBLIC_FACILITIES
            } = req.body;

            /* ================== Build SQL Dynamically ================== */
            let sql = `
                UPDATE w701_test_properties SET
                    real_estate_name = ?,
                    lat = ?,
                    lon = ?,
                    LOCATION = ?,
                    property_type = ?,
                    TRANSACTION = ?,
                    SALE_TERMS = ?,
                    SALE_PRICE = ?,
                    RENT_PRICE = ?,
                    COMMON_CHARGES = ?,
                    DECORATION_STYLE = ?,
                    BEDROOMS = ?,
                    BATHROOMS = ?,
                    DIRECTION_OF_ROOM = ?,
                    UNIT_SIZE = ?,
                    LAND_AREA = ?,
                    INROOM_FACILITIES = ?,
                    PUBLIC_FACILITIES = ?
            `;

            const params = [
                real_estate_name, lat, lon, LOCATION, property_type,
                TRANSACTION, SALE_TERMS, SALE_PRICE, RENT_PRICE,
                COMMON_CHARGES, DECORATION_STYLE, BEDROOMS,
                BATHROOMS, DIRECTION_OF_ROOM, UNIT_SIZE,
                LAND_AREA, INROOM_FACILITIES, PUBLIC_FACILITIES
            ];

            for (let i = 1; i <= 5; i++) {
                const key = `image_0${i}`;
                if (images[key]) {
                    sql += `, ${key} = ?`;
                    params.push(images[key]);
                }
            }

            sql += " WHERE id = ?";
            params.push(id);

            /* ================== Execute ================== */
            conn.query(sql, params, (err) => {
                if (err) throw err;
                res.send("Update Successfully");
                conn.end();
            });
        });
    });

/* ================== Server ================== */
app.listen(8080, () => {
    console.log("Server running on http://localhost:8080");
});