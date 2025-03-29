const express = require("express");
const pgp = require("pg-promise")(/* options */);
const validator = require("validator");
const db = pgp(
    'postgres://postgres:12345678@localhost/postgres'
);
const app = express();
const cors = require("cors");
app.use(express.json()); // Ensure this middleware is used

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors());//to enable cors
app.get("/get-all-goats", (req, res) => {

    db.any('SELECT * FROM goat')
        .then(data => {
            res.status(200).json({ message: "success", data: data });
            console.log(data);
        })
        .catch(error => {
            res.status(500).json({ message: "internal server error", error: error });
            console.error(error);
        });
});
//login api generate token
app.post("/add-goat", (req, res) => {
    const { name, sex, birth_date, breed, color, weight, height, health_status, mother_id, father_id, notes, updated_at, status } = req.body;

    db.any('INSERT INTO goat (name, sex, birth_date, breed, color, weight, height, health_status, mother_id, father_id, notes, updated_at, status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
        [name, sex, birth_date, breed, color, weight, height, health_status, mother_id, father_id, notes, updated_at, status])
        .then(data => {
            res.status(200).json({ message: "goat inserted successfully", data: data });
            console.log(data, "user added data");
        })
        .catch(error => {
            res.status(500).json({ message: "internal server error", error: error });
            console.error(error);
        });
});


//api to add user for login 
// app.post("/add-user", async (req, res) => {
//     const { employee_code, name, email, phone, cnic, password, role } = req.body;

//     const user_already_exist = await db.any('SELECT * FROM users WHERE email=$1 OR mobileno=$2 OR cnic=$3', [email, phone, cnic]);
//     console.log("user_already_exist", user_already_exist)
//     if (user_already_exist.length > 0) {
//          res.status(400).json({ message: "user already exist" });
//          return
//     }


//     db.any(`INSERT INTO users (employee_code, name, email, mobileno, cnic, password, role,created_at, status) VALUES 
//     ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [employee_code, name, email, phone, cnic, password, role, new Date(), 'TRUE'])
//         .then(data => {
//             res.status(200).json({ message: "user inserted successfully", data: data });
//             console.log(data);
//         })
//         .catch(error => {
//             res.status(500).json({ message: "internal server error", error: error });
//             console.error(error);
//         });
// });


app.post("/add-user", async (req, res) => {
    try {
        const { employee_code, name, email, phone, cnic, password, role } = req.body;

        if (!email || !phone || !cnic || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Trim and sanitize input
        const trimmedEmail = email.trim();
        const trimmedPhone = phone.trim();
        const formattedCnic = cnic.replace(/-/g, ""); // Remove dashes

        // Validate Email
        if (!validator.isEmail(trimmedEmail)) {
            return res.status(400).json({ message: "Invalid email format", success: false });
        }

        // Validate Phone (must be 11 digits)
        if (!/^\d{11}$/.test(trimmedPhone)) {
            return res.status(400).json({ message: "Phone number must be 11 digits", success: false });
        }

        // Validate CNIC (must be 13 digits)
        if (!/^\d{13}$/.test(formattedCnic)) {
            return res.status(400).json({ message: "CNIC must be 13 digits (without dashes)",success:false });
        }

        // Check if user exists
        const userExists = await db.any(
            "SELECT * FROM users WHERE email=$1 OR mobileno=$2 OR cnic=$3",
            [trimmedEmail, trimmedPhone, formattedCnic]
        );
        if (userExists.length > 0) {
            return res.status(400).json({ message: "User already exists : ",success:false });
        }

        const newUser = await db.any(
            `INSERT INTO users (employee_code, name, email, mobileno, cnic, password, role, created_at, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [employee_code, name, trimmedEmail, trimmedPhone, formattedCnic, password, role, new Date(), 'TRUE']
        );
        return res.status(200).json({ message: "User added successfully:",success:true });
    } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).json({ message: "Internal server error",success:false });   
    }
});


app.listen(6000, () => {
    console.log(`Custom API listening on port 6000`);
});

