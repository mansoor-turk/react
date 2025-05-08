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
    methods: ['POST', 'GET', 'PUT', 'DELETE'],
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


 const base ='http://localhost:9900/static/images/'
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


 const already_check_email=`SELECT * FROM users WHERE email='${email}'`;
 const already_exit_email = await pool.query(already_check_email);
 if(already_exit_email.rows.length>0){
  return res.status(400).json({ message: 'Email already exists' });  
 }
  const query = {
            text: `INSERT INTO public.users(
    fullname, email, password, role, latitude, longitude, profile,
    created_by, status, mobile,countrys, city ,approved_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12 ,$13) RETURNING * `,
            values: [fullname, email, password, role, latitude, longitude, sortedImage, created_by, status, mobile, countrys, city, approved_by],
        };

        const result = await pool.query(query);

        res.status(200).json({ message: 'user updated successfully',update_user: result.rows });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    };
}

)

// update user --

app.put('/update-users-data',upload.single("profile")  ,authenticate, async (req,res) =>{
 const {fullname,email,password,role,latitude,longitude,profile,status,mobile,countrys,city, id,update_by , 
 }=req.body;
 const base ='http://localhost:9900/static/images/'
 const file =req?.file
 console.log("profile", req?.file)
//  if (!file) return res.status(400).json({ message: 'No image uploaded' });
 const sortedImage = `${base}${file?.filename}`
 console.log("sortedImage", sortedImage)
//  if (!req.body) return res.status(400).json({ message: 'No data provided' });
//  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
 if(!fullname || !email || !password || !role || !mobile || status == null || !latitude || !longitude ||
    !city || !countrys || !id
 ){ res.status(400).json({ message: 'All fields are required' });}
 console.log(
 req.body 
)
const allowedFields =['fullname','email','password','role','latitude','longitude','profile','status','mobile','countrys','city', 'id','update_by']
const  invalidFields =Object.keys(req.body).filter(field => !allowedFields.includes(field));
if (invalidFields.length > 0) {
    return res.status(400).json({ message: `Invalid fields: ${invalidFields.join(', ')}` });
  }
try{
let temp =sortedImage;
if(req?.file == undefined || req?.file==null){
 const ex_profile=`select * from users where record_id='${id}' `;
 const existing_profile = await pool.query( ex_profile);
 
//  console.log("existing_profile", existing_profile.rows)
//  return
 const ex_data= existing_profile.rows[0].profile ;
   temp=ex_data
   console.log("temp", temp);
}
//   const query ={
//     text:` UPDATE public.users
//   SET  fullname='${fullname}', email='${email}',
//   password='${password}', role='${role}', 
//   latitude='${latitude}' , longitude='${longitude}',
//   profile= '${temp}' , 
//    status= '${status}' ,
//   mobile= '${mobile}', countrys= '${countrys}', 
//   city= '${city}',update_by='${update_by }'  WHERE record_id='${id}' RETURNING *  ; `  
// };
  
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

  const result= await pool.query(query)
  res.status(200).json({message: 'user updated sucessfully',user_update:result.rows});
} catch (error){
    console.error(error)
    res.status(500).json({message:'Internal server error', error: error.message })
}  

});



// end point ha update user kia api ha 4-27-2025


app.get('/get-all-users', authenticate, async (req, res) => {
    try {
        const query = {

            text: 
  `SELECT DISTINCT users.record_id, users.fullname, users.email, roles.role_name, users.latitude, users.longitude,
users.profile, users.created_by, users.creation_date, users.approved_by, countries.name AS countrys,  countries.country_code,
users.city, users.mobile, users.status, users.password
FROM users 
INNER JOIN roles ON roles.role_id = users.role
INNER JOIN countries ON countries.country_code = users.countrys;`

//  `	select  users.record_id,  users.fullname,  users.email, roles.role_name, users.latitude, users.longitude,
// users.profile, users.created_by,  users.creation_date, users.approved_by,countries.name as countrys ,
// users.city ,users.mobile,users.status,users.password
// from users 
// inner join roles  on roles.role_id = users.role
// inner join countries on countries.country_code =users.countrys
// `

 

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
} );

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
            AND password =$2 ;`,
            values: [email, password]
        };
        const result = await pool.query(query);
        if (result.rows.length === 0) {

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
});

app.post('/add-store', upload.single("profile"), authenticate, async (req, res) => {

    console.log("profile", req.file)
    const base = 'http://localhost:9900/static/images/'
    const file = req.file

    const sortedImage = `${base}${file.filename}`
    console.log("sortedImage", sortedImage)
    if (!req.body) return res.status(400).json({ message: 'first fill the form' })
    try {
        const allowedFields = [
            'image', 'store_name', 'latitudes', 'longitude', 'store_type', 'address', 'phone', 'email', 'website',
            'store_owner_name', 'purchase_name', 'no_of_branches', 'tax_ntn', 'location', 'created_by', 'created_date',
            'approved_by', 'date', 'creation_date', 'status'
        ];
        const invalidFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            return res.status(400).json({
                message: 'Invalid fields detected',
                invalidFields: invalidFields
            });
        }

        // 2. Phir required fields check karo
        const { image, store_name, latitudes, longitude,
            store_type, address, phone, email,
            website, store_owner_name, purchase_name,
            no_of_branches, tax_ntn, location,
            created_by, created_date, approved_by,
            date, creation_date, status } = req.body;

        if (!image == null || !store_name || !latitudes || !longitude ||
            !store_type || !address || !phone || !email ||
            !website || !store_owner_name || !purchase_name ||
            !no_of_branches || !tax_ntn || !location ||
            !created_by || !created_date || !approved_by ||
            !date || !creation_date || status == null) {
            return res.status(400).json({ message: 'All fields are required' })
        }
        const query = {
            text: `INSERT INTO public.store(
	 image, store_name, latitudes, longitude,
	 store_type, address, phone, email, website,
	 store_owner_name,
	 purchase_name, no_of_branches, tax_ntn,
	 location, created_by, created_date,
	 approved_by, date, creation_date, status)
     VALUES ($1, $2, $3, $4,
     $5, $6, $7, $8, $9,
     $10, $11, $12, $13,
     $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
            values: [sortedImage, store_name, latitudes, longitude,
                store_type, address, phone, email,
                website, store_owner_name, purchase_name,
                no_of_branches, tax_ntn, location,
                created_by, created_date, approved_by,
                date, creation_date, status]

        };

        const already_check_query = `select * FROM store where phone='${phone}' or email='${email}' or tax_ntn='${tax_ntn}'`;
        const is_already_exits = await pool.query(already_check_query);
        if (is_already_exits.rows.length > 0) {
            return res.status(300).json({ message: 'store already exists' });
        }
        const result = await pool.query(query);
        res.status(200).json({ message: 'store added sucessfully', store: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in store added' });
    }

});

app.get('/get-store-data', authenticate, async (req, res) => {
    try {
        const query = {
            text: 'select * from store',
        }
        const result = await pool.query(query);
        res.status(200).json({ message: 'store fetched sucessfully', store: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in store fetched' });
    }
})
app.get('/store-type', authenticate, async (req, res) => {
    try {
        const query = {

            text: `select * from store_type`,

        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'store type fetched sucessfully', store_type: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in store type fetched' });

    }

})
app.post('/add-store-type', authenticate, async (req, res) => {
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

app.post('/add-stock', authenticate, async (req, res) => {
    if (!req.body) return res.status(400).json({ message: 'No data provided' });
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
})

app.get('/get-stock', authenticate, async (req, res) => {
    try {
        const query = {
            text: `select * from stock`,
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
    if (!req.body) return res.status(400).status({ message: 'no data provided' });
    try {
        const { supplier_id, name, contact_person, email, phone, address, gst_number, created_at, status } = req.body;
        if (typeof status !== 'boolean') {
            return res.status(400).json({ message: 'Status must be true or false only' });
        }
        const allowedFields = [
            'supplier_id',
            'name',
            'contact_person',
            'email',
            'phone',
            'address',
            'gst_number',
            'created_at',
            'status'
        ];
        const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
        if (extraFields.length > 0) {
            return res.status(400).json({ message: `Invalid field(s): ${extraFields.join(', ')}` });
        }
        if (!supplier_id || !name || !contact_person || !email || !phone || !address || !gst_number || !created_at || status == null) {
            return res.status(400).json({ message: 'all fields are required' });
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
            text: ` INSERT INTO public.suppliers(
	 supplier_id, name, contact_person, email, phone, address, gst_number, created_at, status)
	VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            values: [supplier_id, name, contact_person, email, phone, address, gst_number, created_at, status]
        }
        const result = await pool.query(query);
        res.status(200).json({ message: 'supplier added sucessfully', supplier: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in supplier added' });
    }
});
//done 4-14-2025
// suppliers api end
app.get('/get-supplier', authenticate, async (req, res) => {
    try {
        const query = {
            text: `select * from suppliers`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'supplier fetched sucessfully', supplier: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in supplier fetched' });
    }
});
// ya supplier ka sapret get kia api ha gis sa ma dropdown ma data show kro ga 4-16-2025
app.get('/get-supplier-data', authenticate, async (req, res) => {
    try {

        const query = {
            text: `select * from suppliers order by created_at desc`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'supplier fetched sucessfully', supplier: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in supplier fetched' });
    }
});
// end part 4-16-2025
app.post('/add-product', authenticate, async (req, res) => {
    if (!req.body) return res.status(400).json({ message: 'No data provided' });
    try {
        const {
            product_id, name, description, sku, unit, purchase_price, selling_price, status } = req.body;
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
            return res.status(400).json({ message: 'product_id already exists' });
        }
        if (skuresult.rows.length > 0) {
            return res.status(400).json({ message: 'sku already exists' });
        }
        const query = ` INSERT INTO public.products(
            product_id, name, description, sku, unit, purchase_price, selling_price, status)
            VALUES ( '${product_id}', '${name}', '${description}', '${sku}', '${unit}', '${purchase_price}', '${selling_price}','${status}' RETURNING *  );`
        const result = await pool.query(query);
        if (result?.rowCount === 0) {
            return res.status(400).json({ message: 'Product not added' });
        }
        res.status(200).json({ message: 'product added sucessfully', status: true, status_code: 200 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in product added', error: error.message });
    }
}
);
// suppliers api end 
// done 4-14-2025
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
        const { item_id, product_id, quantity, unit_price, status } = req.body;
        if (!req.body) return res.status(400).json({ message: 'No data provided' });
        if (typeof status !== 'boolean') {
            return res.status(400).json({ message: 'Status must be true or false only' });
        }
        if (!item_id || !product_id || !quantity || !unit_price || status == null) {
            return res.status(400).json({ message: 'all fields are required' });
        }
        const allowedfields = [
            'item_id',
            'product_id',
            'quantity',
            'unit_price',
            'status'
        ];
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
	 item_id, product_id, quantity, unit_price,status)
	VALUES ( $1, $2, $3, $4, $5) RETURNING *`,
            values: [item_id, product_id, quantity, unit_price, status],
        };
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
// done 4-14-2025

app.get('/get-purchase_order_items', authenticate, async (req, res) => {
    try {
        const query = {
            text: `SELECT * FROM purchase_order_items`,
        };
        const result = await pool.query(query);
        res.status(200).json({ message: 'product fetched sucessfully', product: result.rows });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error in product fetched' });
    }
}
);

app.post('/purchase_orders', authenticate, async (req, res) => {
    try {
        const { order_id, supplier_id, order_date, expected_delivery_date, total_amount, remarks, status } = req.body;

        if (!req.body) return res.status(400).json({ message: 'No data provided' });
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

app.get('/get-all-countries',authenticate ,async (req,res)=> {
    try{
        const query = {
            text: `select * from  countries`,
        };
    const result = await pool.query(query);
    res.status(200).json({ message: 'country fetched sucessfully', country: result.rows });
    } 
    catch (error){
        console.error(error);
        res.status(500).json({ message: 'Internal server error in country fetched, try again ', error: error.message });
    }
})

app.post('/get-all-cities',authenticate ,async (req,res) =>{
    try{
const {country_code} = req.body;

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
    catch (error){
        console.error(error);
        res.status(500).json({ message: 'Internal server error in product added', error: error.message });
    }
} )

//routes end --
//server listening
const PORT = process.env.PORT || 9900;

// // **Start Server**
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

module.exports = { app, upload, pool }