require('dotenv').config()
const express = require('express');
const multer = require("multer");
// const cors = require('cors');
var cors = require('cors');
const fs = require("fs/promises");
const path = require("path");
const { Pool } = require('pg');
const { text } = require('stream/consumers');
const { generateToken } = require('./src/utils/authorization');
const { authenticate } = require('./src/utils/authorization/authenticate');
const { stat } = require('fs');
const { type } = require('os');
const assert = require('assert');

const app = express();

app.use(cors());

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
    methods: ['POST', 'GET', 'PUT', 'DELETE', 'PATCH'],
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

app.post('/add-user', upload.single("profile"), authenticate, async (req, res) => {
    try {
        const { fullname, email, password, role, mobile, status, latitude, longitude, created_by, city, countrys, approved_by } = req.body;
     
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'No data provided' });
        }

        const base = 'http://localhost:9900/static/images/'
        const file = req.file
        console.log("profile", file.filename)
        const sortedImage = `${base}${file.filename}`
        console.log("sortedImage", sortedImage)
        if (!file.filename) return res.status(400).json({ message: 'filename No data provided' });
        // const file = req.file;
        if (!req.body) return res.status(400).json({ message: 'No data provided' });

        if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

        if (!fullname || !email || !password || !role || !mobile || !status || !latitude || !longitude || !created_by || !city || !countrys || !approved_by) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (!city || !countrys) {
            return res.status(400).json({ message: 'city and country is required' });
        };
        const allowedFields = ['fullname', 'email', 'password', 'role', 'mobile', 'status', 'latitude', 'longitude', 'created_by', 'profile', 'city', 'countrys', 'approved_by'];
        const invalidFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            return res.status(400).json({ message: `Invalid fields: ${invalidFields.join(', ')}` });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No file uploaded" });
        }
        const already_check_email = `SELECT * FROM users WHERE email='${email}'`;
        const already_exit_email = await pool.query(already_check_email);
        if (already_exit_email.rows.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const query = {
            text: `INSERT INTO public.users(
    fullname, email, password, role, latitude, longitude, profile,
    created_by, status, mobile,countrys, city ,approved_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12 ,$13) RETURNING * `,
            values: [fullname, email, password, role, latitude, longitude, sortedImage, created_by,
                status, mobile, countrys, city, approved_by],
        };

        const result = await pool.query(query);

        res.status(200).json({ message: 'user updated successfully', update_user: result.rows });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    };
})
// update user --
app.put('/update-users-data', upload.single("profile"), authenticate, async (req, res) => {

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }

    const { fullname, email, password, role, latitude, longitude, profile, status, mobile, countrys, city, id, update_by,
    } = req.body;
    const base = 'http://localhost:9900/static/images/'
    const file = req?.file
    console.log("profile", req?.file)

    const sortedImage = `${base}${file?.filename}`
    console.log("sortedImage", sortedImage)
    if (!fullname || !email || !password || !role || !mobile || status == null || !latitude || !longitude ||
        !city || !countrys || !id
    ) { res.status(400).json({ message: 'All fields are required' }); }
    console.log(
        req.body
    )
    const allowedFields = ['fullname', 'email', 'password', 'role', 'latitude', 'longitude', 'profile', 'status', 'mobile', 'countrys', 'city', 'id', 'update_by']
    const invalidFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
        return res.status(400).json({ message: `Invalid fields: ${invalidFields.join(', ')}` });
    }
    try {
        let temp = sortedImage;
        if (req?.file == undefined || req?.file == null) {
            const ex_profile = `select * from users where record_id='${id}' `;
            const existing_profile = await pool.query(ex_profile);

            //  console.log("existing_profile", existing_profile.rows)
            //  return
            const ex_data = existing_profile.rows[0].profile;
            temp = ex_data
            console.log("temp", temp);
        }

        const query = {
            text: `
      UPDATE public.users SET
        fullname = $1,
        email = $2,
        password = $3,
        role = $4,
        latitude = $5,
        longitude = $6,
        profile = $7,
        status = $8,
        mobile = $9,
        countrys = $10,
        city = $11,
        update_by = $12
      WHERE record_id = $13
      RETURNING *;
    `,
            values: [
                fullname,
                email,
                password,
                role,
                latitude,
                longitude,
                temp,
                status,
                mobile,
                countrys,
                city,
                update_by,
                id
            ]
        };
        console.log("MANSOOR");
        console.log("req.file", req?.file);

        const result = await pool.query(query)
        res.status(200).json({ message: 'user updated sucessfully', user_update: result.rows });
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }

});

// end point ha update user kia api ha 4-27-2025
app.get('/get-all-users', authenticate, async (req, res) => {
    try {
        const query = {
            text:
                `SELECT c.name as country_name,ro.role_name,u.* from users AS u
left join roles AS ro
on u.role =ro.role_id
left join countries c
on
c.country_code = u.countrys
 `
        };
        const result = await pool.query(query);
        res.status(201).json({ message: 'user fetched sucessfully', user: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in user fetched' });
    };
}

)
// delete user ---
app.delete('/delete-user/:id', authenticate, async (req, res) => {
    const { id } = req.params; // Extract the ID from the request parameters
    if (!id) return res.status(400).json({ message: 'No id provided' });
    try {
        const allowedFields = ['id'];
        const invalidFields = Object.keys(req.params).filter(field => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            return res.status(400).json({ message: `Invalid fields: ${invalidFields.join(', ')}` });
        }
        if (!id) return res.status(400).json({ message: 'No id provided' });
        const ex_id = `select * from users where record_id='${id}'`;
        const existing_id = await pool.query(ex_id);
        if (existing_id.rows.length === 0) {
            return res.status(400).json({ message: 'user not found' });
        }

        const query = {
            text: `DELETE FROM public.users
	WHERE record_id='${id}' RETURNING * ;`
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'user deleted sucessfully', user_deleted: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in user deleted' });
    }
});
// roles start -- 
app.get('/get-all-roles', authenticate, async (req, res) => {
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
app.post('/add-role', authenticate, async (req, res) => {
  
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }

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
      
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'No data provided' });
        }

        const query = {
            text: `SELECT * FROM users  WHERE email = $1
            AND password =$2 ;`,
            values: [email, password]
        };
        console.log("query", query)
        const result = await pool.query(query);
        console.log("result", result.rows.length)
        if (result.rows.length == 0) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        if (result.rows.length > 0) {
            const token = generateToken(result?.rows?.record_id);
            return res.status(200).json({ message: 'user login sucessfully', user: result.rows, token });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
});
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
});
app.post('/add-store', upload.single("profile"), authenticate, async (req, res) => {
    const base = 'http://localhost:9900/static/images/';
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: 'Image is required' });
    }

  
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }

    const {
        store_name, latitudes, longitude, store_type, address, phone,
        email, website, store_owner_name, purchase_name, no_of_branches,
        tax_ntn, location, created_by, approved_by,
        date, creation_date, status
    } = req.body;

    const sortedImage = `${base}${file.filename}`;

    if (
        !store_name || !latitudes || !longitude || !store_type ||
        !address || !phone || !email || !website || !store_owner_name ||
        !purchase_name || !no_of_branches || !tax_ntn || !location ||
        !created_by || !approved_by ||
        !date || !creation_date || status == null
    ) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const allowedFields = [
            'store_name', 'latitudes', 'longitude', 'store_type', 'address', 'phone', 'email', 'website',
            'store_owner_name', 'purchase_name', 'no_of_branches', 'tax_ntn', 'location',
            'created_by', 'approved_by', 'date', 'creation_date', 'status'
        ];

        const invalidFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            return res.status(400).json({ message: 'Invalid fields detected', invalidFields });
        }

        const already_check_query = {
            text: `SELECT * FROM store WHERE phone=$1 OR email=$2 OR tax_ntn=$3`,
            values: [phone, email, tax_ntn]
        };
        const is_already_exits = await pool.query(already_check_query);
        if (is_already_exits.rows.length > 0) {
            return res.status(300).json({ message: 'Store already exists' });
        }

        const insertQuery = {
            text: `INSERT INTO public.store (
        image, store_name, latitudes, longitude, store_type, address, phone, email, website,
        store_owner_name, purchase_name, no_of_branches, tax_ntn, location,
        created_by, approved_by, date, creation_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
            values: [
                sortedImage, store_name, latitudes, longitude,
                store_type, address, phone, email, website,
                store_owner_name, purchase_name, no_of_branches, tax_ntn,
                location, created_by, approved_by,
                date, creation_date, status
            ]
        };

        const result = await pool.query(insertQuery);
        res.status(200).json({ message: 'Store added successfully', store: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in store added', error: error.message });
    }
});
app.put('/update-store', upload.single("profile"), authenticate, async (req, res) => {

    const { store_name, latitudes, longitude, store_type, address, phone,
        email, website,
        store_owner_name, purchase_name, no_of_branches, tax_ntn,
        location, status, record_id } = req.body;
  
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }
    const base = 'http://localhost:9900/static/images/';
    const file = req?.file;
    console.log("profile", file);
    const sabkuch_fix = `${base}${file?.filename}`
    console.log("sabkuch_fix", sabkuch_fix);
    if (
        !store_name || !latitudes || !longitude || !store_type ||
        !address || !phone || !email || !website ||
        !store_owner_name || !purchase_name ||
        !no_of_branches || !tax_ntn ||
        !location || !record_id || status == null
    ) {
        return res.status(400).json({ message: 'All fields are required ' });
    }
    // if (typeof status !== 'boolean') {
    //     return res.status(400).json({ message: 'Status must be true or false only' });
    // }
    const alloweds = [
        'store_name', 'latitudes', 'longitude', 'store_type', 'address', 'phone', 'email', 'website',
        'store_owner_name', 'purchase_name', 'no_of_branches', 'tax_ntn', 'location', 'status', 'record_id', 'profile'
    ];
    const invalidFields = Object.keys(req.body).filter(field => !alloweds.includes(field));
    if (invalidFields.length > 0) {
        return res.status(400).json({ message: `Invalid fields:${invalidFields.join(',')}` });
    }
    try {
        let tempimg = sabkuch_fix;
        if (req?.file == undefined || req?.file == null) {
            const exist_pr = `select * from store where record_id='store_b2801594-857b-482a-bb14-7457c52134df'`;
            const existing_profile = await pool.query(exist_pr);
            console.log("exist_data", existing_profile.rows[0].image)
            const ex_data = existing_profile.rows[0].image;
            tempimg = ex_data
            console.log("tempimg", tempimg);
        }
        const query = {
            text: `
UPDATE public.store 
 SET image='${tempimg}',
 store_name='${store_name}',
 latitudes ='${latitudes}', longitude ='${longitude}', store_type ='${store_type}', address ='${address}',
 phone='${phone}',email ='${email}', website='${website}',
 store_owner_name ='${store_owner_name}', purchase_name ='${purchase_name}', no_of_branches ='${no_of_branches}',tax_ntn='${tax_ntn}',
 location ='${location}',status='${status}'
 WHERE record_id ='${record_id}' RETURNING *;`,
        };

        const store_result = await pool.query(query);
        res.status(200).json({ message: 'store updated sucessfully', store: store_result.rows });

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }

});
app.get('/get-store-data', authenticate, async (req, res) => {
  
    // if (!req.body || Object.keys(req.body).length === 0) {
    //     return res.status(400).json({ message: 'No data provided' });
    // }
    try {
        const query = {  
            text: ' SELECT * FROM public.store where is_deleted =false',
        }
        const result = await pool.query(query);
        res.status(200).json({ message: 'store fetched sucessfully', store: result.rows });
       if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No store found' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in store fetched' });
    }
})
app.get('/store-type', authenticate, async (req, res) => {
  
    // if (!req.body || Object.keys(req.body).length === 0) {
    //     return res.status(400).json({ message: 'No data provided' });
    // }
    try {
        const query = {
            text: `SELECT * FROM store_type`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'store type fetched sucessfully', store_type: result.rows });
        // ya tarika shi ha 
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No store type found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in store type fetched' });

    }

})
app.post('/add-store-type', authenticate, async (req, res) => {
  
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }

    try {
        const { store_name, store_id, status } = req.body;
        if (!store_name || !status) {
            return res.status(400).json({ message: 'all fields are required' });
        }

        const query = {
            text: `INSERT INTO public.store_type (
             store_name, store_id, status) VALUES ($1, $2, $3) RETURNING *` ,
            values: [store_name, store_id, status],

        };
        const already_check_query = `select * FROM store_type where store_name='${store_name}'`;
        const is_already_exits = await pool.query(already_check_query);
        if (is_already_exits.rows.length > 0) {
            return res.status(300).json({ message: 'store type already exists' });
        }
        const result = await pool.query(query);
        res.status(200).json({ message: 'store type added sucessfully', store_type: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in store type added', error: error });
    }
});

app.patch('/delete-store',authenticate,async (req,res)=>{
    const { record_id } = req.body;
    if (!record_id) {
        return res.status(400).json({ message: 'No Store Found' });
    }
    const allowed = ['record_id'];
    const extraFields = Object.keys(req.body).filter(key => !allowed.includes(key));
    if (extraFields.length > 0) {
        return res.status(400).json({ message: `Invalid field(s): ${extraFields.join(', ')}` });
    }

    try{
        const check_data = `SELECT * FROM public.store WHERE record_id = '${record_id}' AND is_deleted = false`;
        const is_already_exits = await pool.query(check_data);

        if (is_already_exits.rows.length === 0) {
            return res.status(404).json({ message: 'No store found' });
            }
        const query = {
            text: `UPDATE public.store
set is_deleted = true  where record_id ='${record_id}' RETURNING *`
        }
        const result = await pool.query(query);
        res.status(200).json({ message: 'store deleted sucessfully', store: result.rows ,result:result.rows.length});
    } 
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in store deleted', error: error });
    }
})

app.post('/add-stock', authenticate, async (req, res) => {
  
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }
    try {
        const { product_id, store_id, quantity, reserved, available, created_by, approved_by, date, stock_name, status } = req.body;


        // ✅ Validate allowed fields
        const allowedFields = [
            'product_id',
            'store_id',
            'quantity',
            'reserved',
            'available',
            'created_by',
            'approved_by',
            'date',
            'stock_name',
            'status'
        ];
        const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
        if (extraFields.length > 0) {
            return res.status(400).json({ message: `Invalid field(s): ${extraFields.join(', ')}` });
        }
        const fields = [product_id, store_id, quantity, reserved, available, created_by, approved_by, date, stock_name, status];

        if (!product_id || !store_id || !quantity || !reserved || !available || !created_by || !approved_by || !date || !stock_name || status == null) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if any field is missing or empty after trimming

        // ✅ Strict status validation
        if (typeof status !== 'boolean') {
            return res.status(400).json({ message: 'Status must be true or false (boolean).' });
        }

        const already_check_query = {
            text: `SELECT * FROM public.stock 
           WHERE TRIM(LOWER(product_id)) = TRIM(LOWER($1))
             AND TRIM(LOWER(store_id)) = TRIM(LOWER($2))
             AND TRIM(LOWER(stock_name)) = TRIM(LOWER($3))`,
            values: [product_id, store_id, stock_name]
        };

        const is_already_exits = await pool.query(already_check_query);
        if (is_already_exits.rows.length > 0) {
            return res.status(400).json({ message: 'stock already exists' });
        }
        const query = {
            text: `INSERT INTO public.stock(
	 product_id, store_id, quantity, reserved, available,created_by, approved_by, date,stock_name,status)
	VALUES ($1, $2,$3,$4,$5,$6,$7,$8,$9 ,$10) RETURNING *`,
            values: [product_id, store_id, quantity, reserved, available, created_by, approved_by, date, stock_name, status],
        }
        const result = await pool.query(query);
        res.status(200).json({ message: 'stock added sucessfully', stock: result.rows });
    } catch (error) {
        console.error(error);

        res.status(500).json({ message: 'Internal server error in stock added' });

    }
});

app.get('/get-stock', authenticate, async (req, res) => {
    try {
        const query = {
            text: `select * from stock where is_deleted = false`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'stock fetched sucessfully', stock: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in stock fetched' });
    }
});

// products management
//  categories 12-4-2025
//  suppliers with  get suppliers api
//  products
//  purchase_order_items
//  purchase_orders
// suppliers api start
app.post('/add-suplier', authenticate, async (req, res) => {
  
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }

    try {
        const { supplier_id, name, contact_person, email, phone, address, gst_number, countrys,status } = req.body;
        const allowedFields = [
            'supplier_id',
            'name',
            'contact_person',
            'email',
            'phone',
            'address',
            'gst_number',
            'countrys',
            'status'
        ];
        const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
        if (extraFields.length > 0) {
            return res.status(400).json({ message: `Invalid field(s): ${extraFields.join(', ')}` });
        }
        console.log("req.body", req.body)
        if (!supplier_id || !name || !contact_person || !email || !phone || !address || !gst_number || !countrys || status == null) {
            return res.status(400).json({ message: 'all fields are required' });
        }

        if (typeof status !== 'boolean') {
            return res.status(400).json({ message: 'Status must be true or false only' });
        } 


        // Check for existing supplier_id
        const checkSupplierIdQuery = {
            text: `SELECT 1 FROM public.suppliers WHERE supplier_id = $1`,
            values: [supplier_id]
        };
        const checkEmailQuery = {
            text: `SELECT 1 FROM public.suppliers WHERE TRIM(LOWER(email)) = TRIM(LOWER($1))`,
            values: [email]
        };

        const [idResult, emailResult] = await Promise.all([
            pool.query(checkSupplierIdQuery),
            pool.query(checkEmailQuery)
        ]);

        if (idResult.rows.length > 0) {
            return res.status(400).json({ message: 'supplier_id already exists' });
        }

        if (emailResult.rows.length > 0) {
            return res.status(400).json({ message: 'email already exists' });
        }
        const query = {
            text: `INSERT INTO public.suppliers(
	 supplier_id, name, contact_person, email, phone, address, gst_number, countrys ,status)
	VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9 ) RETURNING *`,
            values: [supplier_id, name, contact_person, email, phone, address,gst_number,countrys,status]
        }
        const results = await pool.query(query);
        // console.log("result ka data", results)
      return  res.status(200).json({ message: 'supplier added sucessfully', supplier: results.rows });
        // res.status(200).json({ message: 'supplier added sucessfully', supplier: results.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in supplier added' });
    }
});
//done 4-14-2025
// suppliers api end
// update supplier api start

app.put('/update-supplier',authenticate ,async (req,res)=>{
    const { name, contact_person, email, phone, address, gst_number, countrys, status ,id  }=req.body;

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }

   const allowedfields =[
       'name', 'contact_person','email', 'phone','address', 'gst_number', 'countrys', 'status', 'id'
   ]
    const extrafields = Object.keys(req.body).filter(key => !allowedfields.includes(key));
    if(extrafields.length > 0){
        return res.status(400).json({message: `Invalid field(s): ${extrafields.join(', ')}`});
    }
    if (typeof status !== 'boolean') {
        return res.status(400).json({ message: 'Status must be true or false only' });
    } 
    //  console.log("req.body", req.body)
     
    if (!name || !contact_person || !email || !phone || !address || !gst_number || !countrys || !id || status == null){
        return res.status(400).json({ message: 'all fields are required' });
    }
      
    try{
    const query ={
        text: `
      UPDATE public.suppliers
      SET  
        name = $1,
        contact_person = $2,
        email = $3,
        phone = $4,
        address = $5,
        gst_number = $6,
        countrys = $7,
        status = $8
      WHERE record_id = $9 RETURNING *;
    `,  values: [name, contact_person, email, phone, address, gst_number, countrys, status,id]
    }
      const result = await pool.query(query);
      res.status(200).json({ message: `supplier updated sucessfully `, supplier: result.rows , count: result.rows.length});
    // console.log("result ka data", result)
} catch (error){
    console.error(error);
    // console.log("error ka data", error)
        // console.log( error.message)
    res.status(500).json({ message: 'Internal server error in supplier updated', error: error.message });
}
 
})
//soft delete supplier api 
app.patch('/delete-supplier', authenticate , async (req, res)=>{
    const {id}= req.body;
    if (!id) {
        return res.status(400).json({ message: 'No supplier id provided' });
    }
 try{
     const check_data = `SELECT * FROM public.suppliers WHERE record_id = $1 AND is_deleted = false`;
     const chek_result = await pool.query(check_data , [id]);
     if(chek_result.rows.length === 0){
        return res.status(400).json({ message: `supplier not found`});
     }
      const allowedfields = ['id'];
    const extrafields = Object.keys(req.body).filter(key => !allowedfields.includes(key));
    if(extrafields.length > 0){
        return res.status(400).json({message: `Invalid field(s): ${extrafields.join(', ')}`});
    }
 
     const query ={
         text: ` UPDATE public.suppliers
set is_deleted =true  where record_id ='${id}' RETURNING *`,
     }
const result = await pool.query(query);
res.status(200).json({ message: `supplier deleted sucessfully `, supplier: result.rows , count: result.rows.length});
if(result.rows.length === 0){
    return res.status(400).json({ message: `supplier not found`});
}

 }
 catch (error){
    console.error(error);
    res.status(500).json({ message: 'Internal server error in supplier deleted' });
}
})
app.get('/get-supplier', authenticate, async (req, res) => {
    try {
        const query = {
            text: `SELECT * FROM public.suppliers where  is_deleted =false;`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'supplier fetched sucessfully', supplier: result.rows, count: result.rows.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in supplier fetched' });
    }
});
// ya supplier ka sapret get kia api ha gis sa ma dropdown ma data show kro ga 4-16-2025
app.get('/get-supplier-data', authenticate, async (req, res) => {
    try {

        const query = {
            text: `SELECT * FROM public.suppliers where  is_deleted =false;`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'supplier fetched sucessfully', supplier: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in supplier fetched' });
    }
});
// suppliers api end
// done 4-14-2025

// end part 4-16-2025
app.post('/add-product', authenticate, async (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }
    try {
        const {
            product_id, name, description, sku, unit, purchase_price, selling_price, status, updated_at } = req.body;
        if (typeof status !== 'boolean') {
            return res.status(400).json({ message: 'Status must be true or false only' });
        }
        const allowedFields = [
            'product_id',
            'name',
            'description',
            'sku',
            'unit',
            'purchase_price',
            'selling_price',
            'status'
        ];
        const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
        if (extraFields.length > 0) {
            return res.status(400).json({ message: `Invalid field(s): ${extraFields.join(', ')}` });
        }
        if (!product_id || !name || !description || !sku || !unit || !purchase_price || !selling_price || status == null) {
            return res.status(400).json({ message: 'all fields are required' });
        }
        const already_insertpdid = `SELECT * FROM products WHERE product_id = '${product_id}'`;
        const already_insertsku = `SELECT * FROM products WHERE  sku = '${sku}'`;
        const [pidresult, skuresult] = await Promise.all([
            pool.query(already_insertpdid),
            pool.query(already_insertsku)
        ])
        if (pidresult.rows.length > 0) {
            return res.status(400).json({ message: 'product_id already exists', product: pidresult.rows });
        }
        if (skuresult.rows.length > 0) {
            return res.status(400).json({ message: 'sku already exists', product: skuresult.rows });
        }

        const already_exits = `select * from products where name ='${name} ' `;
        const already_exits_result = await pool.query(already_exits);
        if (already_exits_result.rows.length > 0) {
            return res.status(400).json({ message: 'product already exists', product: already_exits_result.rows });
        }
        const query = {
            text: ` INSERT INTO public.products(
            product_id, name, description, sku, unit, purchase_price, selling_price, status ,updated_at)
            VALUES ( '${product_id}', '${name}', '${description}', '${sku}', '${unit}', '${purchase_price}', '${selling_price}','${status}' ,null ) RETURNING *;`
        }
        const result = await pool.query(query);
        if (result?.rowCount === 0) {
            return res.status(400).json({ message: 'Product not added' });
        }
        res.status(200).json({ message: 'product added sucessfully', status: true, status_code: 200 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in product added', error: error.message });
    }
});

// Update product
app.put('/update_product', authenticate, async (req, res) => {
    const { name, description, sku, unit, purchase_price, selling_price, status, id } = req.body;

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }

    if (!name || !description || !sku || !unit || !purchase_price || !selling_price || status === null || !id) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (typeof status !== 'boolean') {
        return res.status(400).json({ message: 'Status must be true or false only' });
    }

    const allowedFields = ['name', 'description', 'sku', 'unit', 'purchase_price', 'selling_price', 'status', 'id'];
    const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
    if (extraFields.length > 0) {
        return res.status(400).json({ message: `Invalid field(s): ${extraFields.join(', ')}` });
    }

    const trimmed = {
        name: name.trim(),
        description: description.trim(),
        sku: sku.trim(),
        unit: unit.trim(),
        id: id.trim()
    };

    // Check for duplicate product name
    const checkQuery = {
        text: 'SELECT * FROM products WHERE name = $1 AND record_id != $2',
        values: [trimmed.name, trimmed.id]
    };

    try {
        const checkResult = await pool.query(checkQuery);
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ message: 'Product name already exists' });
        }

        const updatedAt = new Date().toISOString();

        const updateQuery = {
            text: `UPDATE public.products
                   SET name = $1,
                       description = $2,
                       sku = $3,
                       unit = $4,
                       purchase_price = $5,
                       selling_price = $6,
                       updated_at = $7,
                       status = $8
                   WHERE record_id = $9
                   RETURNING *`,
            values: [
                trimmed.name,
                trimmed.description,
                trimmed.sku,
                trimmed.unit,
                parseFloat(purchase_price),
                parseFloat(selling_price),
                updatedAt,
                status,
                trimmed.id
            ]
        };

        const result = await pool.query(updateQuery);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({
            message: 'Product updated successfully',
            product: result.rows[0]
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
});

// app.put('/update_product', authenticate, async (req, res) => {
//     try {
//         const { id, name, description, sku, unit, purchase_price, selling_price, status } = req.body;

//         // Generate timestamp
//         const updatedAt = new Date().toISOString();
//         console.log("Attempting to set updated_at to:", updatedAt);

//         const query = {
//             text: `UPDATE public.products
//                    SET name = $1,
//                        description = $2,
//                        sku = $3,
//                        unit = $4,
//                        purchase_price = $5,
//                        selling_price = $6,
//                        updated_at = $7,
//                        status = $8
//                    WHERE record_id = $9
//                    RETURNING *`,
//             values: [
//                 name,
//                 description,
//                 sku,
//                 unit,
//                 parseFloat(purchase_price),
//                 parseFloat(selling_price),
//                 updatedAt,
//                 status,
//                 id
//             ]
//         };

//         console.log("Safe parameterized query:", {
//             text: query.text,
//             values: query.values
//         });

//         const result = await pool.query(query);

//         if (result.rows.length === 0) {
//             return res.status(404).json({ message: 'Product not found' });
//         }

//         res.status(200).json({
//             message: 'Product updated successfully',
//             product: result.rows,
//             count: result.rows.length
//         });

//     } catch (error) {
//         console.error('Update error:', {
//             message: error.message,
//             stack: error.stack,
//             detail: error.detail
//         });
//         res.status(500).json({
//             message: 'Internal server error',
//             error: error.message
//         });
//     }
// });

app.get('/get-product', authenticate, async (req, res) => {
    try {
        const query = {
            text: `select * from products order by created_at desc`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'product fetched sucessfully', product: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in product fetched' });
    }
});

// ya product ka sapret get kia api ha gis sa ma dropdown ma data show kro ga 4-16-2025

app.get('/product-id', authenticate, async (req, res) => {
    try {
        const query = {
            text: `select * from products order by created_at desc`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'product fetched sucessfully', product: result.rows });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in product fetched' });
    }
});

// end part 4-16-2025
// done 4-15-2025

app.post('/purchase_order_items', authenticate, async (req, res) => {
    try {
        const { item_id, product_id, quantity, status ,price } = req.body;


        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'No data provided' });
        }

        if (typeof status !== 'boolean') {
            return res.status(400).json({ message: 'Status must be true or false only' });
        }
        if (!item_id || !product_id || !quantity || status == null || !price) {
            return res.status(400).json({ message: 'all fields are required' });
        }
        const allowedfields = [
            'item_id',
            'product_id',
            'quantity',
            'price',
            'status'
        ];
        if (item_id.length > 50) {
            return res.status(400).json({
                error: "item_id must be 50 characters or fewer.",
            });
        }

        const extraFields = Object.keys(!req.body).filter(key => !allowedfields.includes(key));
        if (extraFields.length > 0) {
            return res.status(400).json({ message: `Invalid field(s): ${extraFields.join(', ')}` });
        }
        console.log("payload", req.body);
        const already_item_id = `SELECT * FROM purchase_order_items WHERE item_id ='${item_id}'`;
        // const already_order_id =`SELECT * FROM purchase_order_items WHERE order_id ='${order_id}'`;
        // const already_product_id =`SELECT * FROM purchase_order_items WHERE product_id ='${product_id}'`;
        const [iteamidresult] = await Promise.all([
            pool.query(already_item_id)
            // pool.query(already_order_id),
            // pool.query(already_product_id)
        ])
        if (iteamidresult.rows.length > 0) {
            return res.status(400).json({ message: 'item_id already exists' });
        }
        const query = {
            text: `INSERT INTO public.purchase_order_items(
	 item_id, product_id, quantity,status,price)
	VALUES ( $1, $2, $3, $4, $5 ) RETURNING *`,
            values: [item_id, product_id, quantity, status, price],
        };
        const result = await pool.query(query);
        if (result?.rowCount === 0) {
            return res.status(400).json({ message: 'Product not added' });
        }
        res.status(200).json({ message: 'Order added sucessfully', status: true, status_code: 200 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in order iteam added', error: error.message });
    }

});
// done 4-14-2025

app.get('/get-purchase_order_items', authenticate, async (req, res) => {
    try {
        const query = {
            text: `SELECT * FROM purchase_order_items`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'Order items fetched sucessfully', order: result.rows });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in product fetched' });
    }
}
);
// update purchase order items 
app.put('/update-purchase_order_items',authenticate, async (req ,res )=>{
 const {
       product_id, quantity, status ,price ,record_id
 } = req.body;

 if (!req.body || Object.keys(req.body).length === 0) {
     return res.status(400).json({ message: 'No data provided' });
 }
    if (!product_id || !quantity || status == null || !price) {
        return res.status(400).json({ message: 'all fields are required' });
    }

    if (!record_id){
        return res.status(400).json({ message: 'no order record found' });
    }
    
 if(typeof status  !== 'boolean'){
return res.status(400).json({ message: 'Status must be true or false only' }); 
}
const allowedfields = [
    'product_id',
    'quantity',
    'status',
    'price'
];
const extraFields = Object.keys(!req.body).filter(key => !allowedfields.includes(key));
if (extraFields.length > 0) {
    return res.status(400).json({ message: `Invalid field(s): ${extraFields.join(', ')}` });
}
console.log("payload", req.body);
try{
    const query ={
        text:`UPDATE  public.purchase_order_items SET product_id ='${product_id}', quantity ='${quantity}',
        status =${status}, price ='${price} where record_id = '${record_id}' RETURNING *`,
    }
    const result = await pool.query(query);
    res.status(200).json({ message: 'purchase order items updated sucessfully', purchase_order_items: result.rows ,count: result.rows.length});
}
catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error in product fetched', error: error.message });
}
});

// delete purchase order items
// app.delete('/delete-purchase_order_items', authenticate, async (req, res) =>
//     {
//         const { record_id } = req.body;
//         if (!req.body || Object.keys(req.body).length === 0) {
//             return res.status(400).json({ message: 'No data provided' });
//         }
//         if (!record_id) {
//             return res.status(400).json({ message: 'no order record found' });
//         }
//         const allowed = ['record_id'];
//         const extraFields = Object.keys(req.body).filter(key => !allowed.includes(key));
//         if (extraFields.length > 0) {
//             return res.status(400).json({ message: `Invalid field(s): ${extraFields.join(', ')}` });
//         }
//         try{
//             const query = {
//                 text: `UPDATE public.purchase_order_items
// set is_deleted = true  where record_id ='${record_id}' RETURNING *`
//             }
//             const result = await pool.query(query);
//             res.status(200).json({ message: 'purchase order items deleted sucessfully', purchase_order_items: result.rows ,count: result.rows.length});
//         } 
//         catch (error) {
//             console.error(error);
//             res.status(500).json({ message: 'Internal server error in product fetched', error: error.message });
//         }
//     }
// );


app.post('/purchase_orders', authenticate, async (req, res) => {
    try {
        const { order_id, supplier_id, order_date, expected_delivery_date, total_amount, remarks, status } = req.body;
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'No data provided' });
        }
        if (typeof status !== 'boolean') {
            return res.status(400).json({ message: 'Status must be true or false only' });
        }
        if (!order_id || !supplier_id || !order_date || !expected_delivery_date || !total_amount || !remarks || status == null) {
            return res.status(400).json({ message: 'all fields are required' });
        }
        const allowedfields = [
            'order_id',
            'supplier_id',
            'order_date',
            'expected_delivery_date',
            'total_amount',
            'remarks',
            'status'
        ];
        const extraFields = Object.keys(!req.body).filter(key => !allowedfields.includes(key));
        if (extraFields.length > 0) {
            return res.status(400).json({ message: `Invalid field(s): ${extraFields.join(', ')}` });
        }
        const already_order_id = `SELECT * FROM purchase_orders WHERE order_id ='${order_id}'`;
        // const already_supplier_id =`SELECT * FROM purchase_orders WHERE supplier_id ='${supplier_id}'`;
        const [orderidresult] = await Promise.all([
            pool.query(already_order_id),
            // pool.query(already_supplier_id)
        ])
        if (orderidresult.rows.length > 0) {
            return res.status(400).json({ message: 'order_id already exists' });
        }
        // if (supplieridresult.rows.length > 0) {
        //     return res.status(400).json({ message: 'supplier_id already exists' });
        // }

        const query = {
            text: `INSERT INTO public.purchase_orders(
        order_id, supplier_id,order_date,expected_delivery_date,total_amount,remarks,status
    )VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            values: [order_id, supplier_id, order_date, expected_delivery_date, total_amount, remarks, status],
        };
        const result = await pool.query(query);
        if (result?.rowCount === 0) {
            return res.status(400).json({ message: 'Product not added' });
        }
        res.status(200).json({ message: 'product added sucessfully', status: true, status_code: 200, order: result.rows });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in product added', error: error.message });
    }
});

app.get('/get_purchase_orders', authenticate, async (req, res) => {
    try {
        const query = {
            text: `SELECT * FROM purchase_orders`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'product fetched sucessfully', product: result.rows });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in product fetched' });
    }
});

// api done and ui started 4-14-2025

app.get('/get-purchase_order', authenticate, async (req, res) => {
    try {
        const query = {
            text: `select * from purchase_orders order by created_at desc`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'supplier fetched sucessfully', supplier: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in supplier fetched' });
    }
});

app.get('/get-all-countries', authenticate, async (req, res) => {
    try {
        const query = {
            text: `select * from  countries`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'country fetched sucessfully', country: result.rows });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in country fetched, try again ', error: error.message });
    }
})

app.post('/get-all-cities', authenticate, async (req, res) => {
    try {
        const { country_code } = req.body;

        if (!country_code) {
            return res.status(400).json({ message: 'country_code is required' });
        }
        const query = {
            text: 'SELECT * FROM cities WHERE country_code = $1',
            values: [country_code],
        };
        // return  console.log("Received country_code:", country_code);
        const result = await pool.query(query);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No cities found for the given country_code' });
        }
        res.status(200).json({
            message: 'Cities fetched successfully',
            cities: result.rows,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in product added', error: error.message });
    }
})

app.put('/update-stock', authenticate, async (req, res) => {
    const { product_id, store_id, quantity, reserved, available, date, status, stock_name, record_id } = req.body;
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }

    if (!product_id || !store_id || !quantity || !reserved || !available || !date || !stock_name || !record_id || status == null) {
        return res.status(400).json({ message: 'all fields are required' });
    }
    if (typeof status !== 'boolean') {
        return res.status(400).json({ message: 'Status must be true or false only' });
    }
    // ✅ Validate allowed fields in the request body 
    const allowedFields = ['product_id', 'store_id', 'quantity', 'reserved', 'available', 'date', 'status', 'stock_name', 'record_id'];
    const extraFields = Object.keys(req.body).filter(keys => !allowedFields.includes(keys));
    if (extraFields.length > 0) {
        return res.status(400).json({ message: `Invalid field(s): ${extraFields.join(', ')}` });
    }
    // created_by  approved_by
    try {
        const query = {
            text: `UPDATE public.stock SET 
	stock_name = $1,
	product_id= $2, store_id=$3,quantity = $4, reserved = $5, 
	available =$6, date =$7, status = $8
      WHERE record_id=$9  RETURNING *`,
            values: [stock_name, product_id, store_id, quantity, reserved, available,
                date, status, record_id],
        }
        const result = await pool.query(query);
        if (result?.rowCount === 0) {
            return res.status(400).json({ message: 'Product not updated' });
        }
        res.status(200).json({ message: 'product updated sucessfully', status: true, status_code: 200, stock: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in stock updated', error: error.message });
    }
})
// delete stock api 
app.patch('/delete-stock', authenticate, async (req, res) => {
    const { record_id } = req.body;
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }
    try {
        const checkQuery = `SELECT * FROM stock WHERE record_id = $1 AND is_deleted = false`;
        const checkResult = await pool.query(checkQuery, [record_id]);
        if (checkResult.rows.length === 0) {
            return res.status(400).json({ message: 'Product not found or already deleted' });
        }
        const allowedFields = ['record_id'];
        const invalidFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            return res.status(400).json({ message: `Invalid field(s): ${invalidFields.join(', ')}` });
        }
        const query = {
            text: ` update  public.stock SET 
      is_deleted = true
   WHERE record_id ='${record_id}' RETURNING *`,

        }
        const result = await pool.query(query);
        if (result?.rowCount === 0) {
            return res.status(400).json({ message: 'Product not deleted' });
        }
        res.status(200).json({ message: 'product deleted sucessfully', status: true, status_code: 200, stock: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in stock deleted', error: error.message });
    }
});
app.get('/get-adress', authenticate, async (req, res) => {
    try {
        const query = {
            text: ` select * from cities_address`,
        }
        const result = await pool.query(query);
        res.status(200).json({ message: 'adress fetched sucessfully', adress: result.rows });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in address fetched', error: error.message });
    }
});

// done 5-12-2025

app.post('/get-areas', authenticate, async (req, res) => {

    const { cities_id } = req.body;

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No data provided' });
    }

    if (!cities_id) {
        return res.status(400).json({ message: 'cities_id is required' });
    }
    try {
        const query = {
            text: `SELECT * FROM areas_address WHERE cities_id ='${cities_id}'`,
        }
        const result_areas = await pool.query(query);
        if (result_areas.rows.length === 0) {
            return res.status(404).json({ message: 'No areas found for the given cities_id' });
        }
        res.status(200).json({
            message: 'Areas fetched successfully',
            areas: result_areas.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in areas fetched', error: error.message });
    }
});















//routes end --
//server listening
const PORT = process.env.PORT || 9900;

// // **Start Server**
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

module.exports = { app, upload, pool }


 