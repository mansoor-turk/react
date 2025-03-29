require('dotenv').config()
 const express = require('express');
const multer = require("multer");
const cors = require('cors');
const fs = require("fs/promises");
const path = require("path");
const { Pool } = require('pg');
const { text } = require('stream/consumers');
const { generateToken } = require('./src/utils/authorization');
const { authenticate } = require('./src/utils/authorization/authenticate');

const app = express();

// Environment variables configuration
const pool = new Pool({

    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "sd_db",
    password: process.env.DB_PASSWORD || "12345678",
    port: process.env.DB_PORT || 5432,

});

// Enhanced CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Configure static files serving
const staticPath = path.join(__dirname, 'uploads/static');
app.use('/static', express.static(staticPath));

// Improved multer configuration
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(staticPath, 'images');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `image-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /mp4|jpeg|jpg|png|gif|mp3|webp|jfif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

//routes start --
app.get('/api-health', async (req, res) => {

    try {


        res.status(200).json({
            success: true,
            message: 'ok'
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
})
app.post('/add-user', upload.single("profile"), async (req, res) => {
    if (!req.body) return res.status(400).json({ message: 'No data provided' });
    if (!req.file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
    }
    const base = 'http://localhost:9900/static/images/'
    const file = req.file
    console.log("profile", file.filename)
    const sortedImage = `${base}${file.filename}`
    console.log("sortedImage", sortedImage)
    if (!file.filename) return res.status(400).json({ message: 'filename No data provided' });

    try {
        const { fullname, email, password, role, mobile, status, latitude, longitude, created_by } = req.body;
        if (!fullname || !email || !password || !role || !mobile || !status || !latitude || !longitude || !created_by) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const query = {
            text: `INSERT INTO public.users (fullname, email, password, role, mobile, status, latitude, longitude,profile,created_by )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            values: [fullname, email, password, role, mobile, status, latitude, longitude, sortedImage, created_by],

        };
        const result = await pool.query(query);
        res.status(201).json({ message: 'user added sucessfully', user: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    };
}

)
app.get('/get-all-users',authenticate, async (req, res) => {
    try {
        const query = {
            text: `select * from users`,
        };
        const result = await pool.query(query);
        res.status(201).json({ message: 'user fetched sucessfully', user: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in user fetched' });
    };
}

)
app.get('/get-all-roles', async (req, res) => {
    try {
        const query = {
            text: `select * from roles order by creation_date desc`,
        };
        const result = await pool.query(query);
        res.status(201).json({ message: 'roles fetched sucessfully', data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in roles fetched' });
    };
})

app.post('/add-role', async (req, res) => {
    if (!req.body) return res.status(400).json({ message: 'No data provided' });

    try {
        const allowedFields = ['role_name', 'created_by', 'updated_by', 'status'];
        const invalidFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));

        const already_check_query = `SELECT * FROM roles WHERE role_name = $1`;
        const alreadyExists = await pool.query(already_check_query, [req.body.role_name]);
        console.log("alreadyExists", alreadyExists.rows)
        if (alreadyExists.rows.length > 0) {
            return res.status(400).json({ message: 'Role already exists' });
        }

        if (invalidFields.length > 0) {
            return res.status(400).json({
                message: 'Invalid fields detected',
                invalidFields: invalidFields
            });
        }

        // 2. Phir required fields check karo
        const { role_name, created_by, updated_by, status } = req.body;
        if (!role_name || !created_by || !updated_by || !status) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const query = {
            text: `INSERT INTO public.roles (role_name, created_by, updated_by,status) VALUES ($1, $2, $3,$4) RETURNING *`,
            values: [role_name, created_by, updated_by, status],

        };
        const result = await pool.query(query);
        res.status(201).json({ message: 'role added sucessfully', role: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in role added' });
    }

})


app.post('/user-login', async (req, res) => {
    if (!req.body) return res.status(400).json({ message: 'No data provided' });


    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
       
        
        const query = {
            text: `SELECT * FROM users  WHERE email = $1 
            AND password = $2;`,
            values: [email, password]
        };
         const result = await pool.query(query);
         if(result.rows.length === 0){

            return res.status(400).json({ message: 'user not found' });
         }
        const token = generateToken(result?.rows?.record_id);
        res.status(200).json({ message: 'user login sucessfully', user: result.rows, token });
    }
    catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Internal server error in user login' });
    }
})
app.get('/get-all-lols', authenticate, async (req, res) => {
    try {
        const query = {
            text: `select * from users`,
        };
        const result = await pool.query(query);
        res.status(201).json({ message: 'user fetched sucessfully', user: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in user fetched' });
    };
})

















//routes end --
//server listening
const PORT = process.env.PORT || 9900;

// // **Start Server**
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});


module.exports = { app, upload, pool }