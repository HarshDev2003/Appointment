require('dotenv').config();

let favicon = require( 'serve-favicon' );
let express = require( 'express' );
let session = require('express-session')
let expressFileupload = require('express-fileupload');
let sharp = require('sharp');
let app = express();
const he = require('he');
const nodemailer = require('nodemailer');
let server = require( 'http' ).Server( app );
let io = require( 'socket.io' )( server );
let flash = require('connect-flash');
const mysql = require('mysql');
let path = require( 'path' );
let bodyParser = require('body-parser');
const fs = require('fs');
const htmlspecialchars = require('htmlspecialchars');
// const he.decode = require('he.decode');
const cors = require('cors');
let stream = require( './ws/stream' );
const randomstring = require('randomstring');
const mongoose = require("mongoose");
const multer = require('multer');
const moment = require('moment')

const serverPort = process.env.SERVER_PORT || 5005;
const serverURL = process.env.SERVER_URL || `http://localhost:${process.env.SERVER_PORT}/home`;

// const serverPort = 5000;
// const serverURL = "http://localhost:5000/home";


const { PDFDocument, rgb } = require('pdf-lib');
const { register } = require('module');

app.use(cors());


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs'); 
app.use('/custom', express.static(__dirname + '/node_modules/custom/')); // redirect root
app.use('/jsjq', express.static(__dirname + '/assets/jquery')); // redirect JS jQuery
app.use('/voice', express.static(__dirname + '/voice')); // redirect JS voice
app.use('/js', express.static(__dirname + '/assets/bootstrap/js')); // redirect bootstrap JS
app.use('/css', express.static(__dirname + '/assets/bootstrap/css')); // redirect CSS bootstrap
app.use('/font', express.static(__dirname + '/font')); // redirect root
app.use('/img', express.static(__dirname + '/img')); // redirect to img
app.use('/images', express.static(__dirname + '/public/images')); // redirect to img
// app.use('/images', express.static('__dirname + '/public/images'));;
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/uploads', express.static('/uploads')); 
// app.use('/videos', express.static(path.resolve(__dirname, 'uploads/videos')));
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// const fs = require('fs');
// const uploadDir = path.join(__dirname, 'uploads', 'videos');



// Set up session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'defaultsecret',
  resave: false,
  saveUninitialized: true
}));

// Set up bodyParser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// -------------------------------------------------------------------------------



// const storage = multer.diskStorage({
//   destination: './uploads/videos/',

//   filename: (req, file, cb) => {
//       cb(null, `${Date.now()}-${file.originalname}`);
//   }
// });
// const upload = multer({ storage });




// Set up storage for Multer
const storage = multer.diskStorage({
  destination: '/uploads/videos/',
  filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });





// Database Connection
const conn = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
  port: 3306
});

conn.connect(function(error){
    if(error)
    {
        throw error;
    }
    else{
        console.log("Connected To Database")
    }
});











app.get('/home/pdf/:id/list', (req, res) => {
  if (req.session.loggedin) {
    conn.query(
      `SELECT cu.*
      FROM cn_friend cf, cn_user cu
      WHERE cf.id_user = ${req.session.id_user}
      AND cf.who = '${req.session.username}'
      AND cf.id_friend = cu.id_user;
      SELECT cc.*, cu.name, cu.id_user id_friend, cu.username, cu.img_profile
      FROM cn_chat cc, cn_user cu
      WHERE id_chat IN (SELECT MAX(id_chat)
                        FROM cn_chat WHERE id_group_chat LIKE '%${req.session.username}%'
                        AND who = '${req.session.username}'
                        GROUP BY id_group_chat)
      AND cu.username = SUBSTRING_INDEX(cc.id_group_chat, "_", (CASE WHEN SUBSTRING_INDEX(cc.id_group_chat, "_", -1) = '${req.session.username}' THEN 1 ELSE -1 END));
      SELECT img_profile FROM cn_user WHERE id_user = ${req.session.id_user}`,
      (error, results) => {
        results[1].forEach((item, i) => {
          results[1][i]['message'] = he.decode(item.message)
        })
        
        res.render('list', {
          items: results[0],
          chat_list: results[1],
          user_login: req.session,
          flash: req.flash('login'),
          img_profile: results[2][0].img_profile,
          appointments: results
        });
      }
    );

  } else {
    res.redirect('/log');
  }
  
});


app.get('/home/pdf', async (req, res) => {
  try {
    // Check if the user is logged in
    if (!req.session.loggedin) {
      req.flash('login', 'Please log in to access this page');
      return res.redirect('/log');
    }

    // Extract parameters and query values
    const doctorId = parseInt(req.params.id, 10); // Ensure doctorId is a number
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
    const doctor_id = req.query.doctor_id;
    const userName = req.session.name;
    // const { date, doctor_id } = req.query;
    // const selectedDate = req.query.date || "";
    // const doctor_id = req.query.doctor_id || "";
  

    // if (isNaN(doctorId)) {
    //   return res.status(400).send('Invalid doctor ID');
    // }
    // console.log("Selected Date:", date);
    console.log("Selected Doctor ID:", doctor_id);
    // Queries
    const bookedSlotsQuery = `SELECT time FROM bookings WHERE date = ? AND doctor_id = ?`;
    const doctorQuery = `SELECT id_user, name FROM cn_user WHERE role = 'Doctor'`;
    const userQuery = `
      SELECT name, email, phone, address, age, sex
      FROM cn_user 
      WHERE id_user = ?`;

    // Fetch booked slots
    const bookedSlots = await new Promise((resolve, reject) => {
      conn.query(bookedSlotsQuery, [selectedDate, doctor_id], (err, results) => {
        if (err) return reject(err);
        resolve(results.map(slot => slot.time)); // Map only the time values
      });
    });

    // Fetch all doctors
    const doctors = await new Promise((resolve, reject) => {
      conn.query(doctorQuery, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // Fetch logged-in user's details
    const userData = await new Promise((resolve, reject) => {
      conn.query(userQuery, [req.session.id_user], (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0 ? results[0] : {}); // Default to empty object if no data
      });
    });

    
    // Generate available time slots (assuming generateTimeSlots is defined)
    const timeSlots = generateTimeSlots("09:00", "18:00");

    // Render the form view
    res.render('form', {
      timeSlots,
      doctors,
      selectedDoctorId: doctorId,
      user: userData,
      selectedDate,
      doctor_id,
      bookedSlots,
    });
  } catch (error) {
    console.error('Error in /home/pdf route:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

app.get("/past-appointment", (req, res) => {
  if (!req.session.name) {
      return res.redirect("/"); // Redirect if user is not logged in
  }

  const userName = req.session.name;
  const query = `
      SELECT id, name, sex, age, address, email, phone, date, time, doctor_id, created_at 
      FROM bookings 
      WHERE name = ?
  `;

  conn.query(query, [userName], (err, results) => {
      if (err) {
          console.error("Error fetching appointments:", err);
          return res.status(500).send("Database error");
      }
      const formattedAppointments = results.map(appointment => ({
        ...appointment,
        date: new Date(appointment.date).toLocaleDateString("en-US", { 
            year: "numeric", month: "short", day: "numeric" 
        }), 
        time: new Date(`2024-01-01 ${appointment.time}`).toLocaleTimeString("en-US", { 
          hour: "2-digit", minute: "2-digit", hour12: true 
      }),
        created_at: new Date(appointment.created_at).toLocaleString("en-US", { 
            year: "numeric", month: "short", day: "numeric", 
            hour: "2-digit", minute: "2-digit", hour12: true 
        }) 
    }));

      res.render("past-appointment",  { userName, appointments: formattedAppointments });
  });
});

// app.get('/home/pdf/:id', (req, res) => {
//   // Check if the user is logged in
//   if (!req.session.loggedin) {
//     req.flash('login', 'Please log in to access this page');
//     return res.redirect('/');
//   }

//   // const timeSlots = generateTimeSlots("09:00", "18:00");
//   const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
//   const doctor_id = req.query.doctor_id;
// const query = `
//   SELECT time FROM bookings WHERE date = ? AND doctor_id = ?
// `;
//   const doctorId = parseInt(req.params.id, 10); // Ensure doctorId is a number

//   // Query to fetch all doctors
//   const doctorQuery = 'SELECT id, doctor_name FROM doctor_table';

//   // Query to fetch logged-in user's details
//   const userQuery = `
//     SELECT name, email, phone, address, age ,sex
//     FROM cn_user 
//     WHERE id_user = ?`;


    
//   conn.query(query, [selectedDate,doctor_id], (err, results) => {
//     if (err) {
//       console.error('Error fetching booked slots:', err.message);
//       return res.status(500).send('Failed to fetch booked slots');
//     }

//   // Execute both queries in parallel
//   conn.query(doctorQuery, (doctorErr, doctorResults) => {
//     if (doctorErr) {
//       console.error("Database query error (Doctors):", doctorErr);
//       return res.status(500).send("Internal Server Error");
//     }

//     conn.query(userQuery, [req.session.id_user], (userErr, userResults) => {
//       if (userErr) {
//         console.error("Database query error (User):", userErr);
//         return res.status(500).send("Internal Server Error");
//       }

//       // Verify that the doctor ID from the URL matches a doctor in the results
//       const selectedDoctor = doctorResults.find(doctor => doctor.id === doctorId);

//       // Prepare user data (default to empty object if no data found)
//       const userData = userResults.length > 0 ? userResults[0] : {};

//       // Log debugging information
//       console.log('Selected Doctor ID:', doctorId);
//       console.log('User Data:', userData);

//       // Render the form view with timeSlots, doctors, selectedDoctorId, and user data
//       res.render('form', {
//         timeSlots,
//         doctors: doctorResults,
//         selectedDoctorId: selectedDoctor ? doctorId : null,
//         user: userData,
//         selectedDate,
//         doctor_id,
//         bookedSlots
      
//       });
//     });
//   });
// });




// Route to insert booking data into the database
app.post("/submit-booking", (req, res) => {
  const { name, sex, age, address, email, phone, date, time, doctor_id } = req.body;
  // const doctor_id = req.query.doctor_id;
  console.log(req.body,req.body.doctor_id, req.body.selectedDoctorId)
  // console.log("Received doctor_id:", doctor_id); // Debugging log
  
  // Corrected validation
  if (!name || !sex || !age || !address || !email || !phone || !date || !time || !doctor_id) {
    return res.status(400).json({ success: false, message: "All fields are required!" });
  }

  // Insert query
  const query = `
    INSERT INTO bookings (name, sex, age, address, email, phone, date, time, doctor_id, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const values = [name, sex, age, address, email, phone, date, time, doctor_id];

  console.log("Request Body:", req.body); // Debugging log

  conn.query(query, values, (err, result) => {
    if (err) {
      console.error("Error inserting booking:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    res.json({ success: true, message: "Booking successfully saved!" });
  });
});





app.get('/get-time-slots/:doctorId/:date', (req, res) => {
  const { doctorId, date } = req.params;

  // Query to get unavailable time slots for the selected doctor and date
  const sql = `
    SELECT time_slot 
    FROM bookings 
    WHERE doctor_id = ? AND booking_date = ?;
  `;

  conn.query(sql, [doctorId, date], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send({ error: 'Internal Server Error' });
    }

    const unavailableSlots = results.map(row => row.time_slot);
    res.json({ unavailableSlots });
  });
});





app.post('/submit-booking', (req, res) => {
  const { name, sex, age, address, email, phone, date, time, doctor_id } = req.body;

  // Validate required fields
  if (!name || !sex || !age || !address || !email || !phone || !date || !time || !doctor_id) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/form'); // Redirect back to form
  }

  // SQL queries
  const checkQuery = `
    SELECT COUNT(*) AS count 
    FROM bookings 
    WHERE date = ? AND time = ?
  `;
  const insertQuery = `
    INSERT INTO bookings (name, sex, age, address, email, phone, date, time, doctor_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Check slot availability
  conn.query(checkQuery, [date, time], (err, results) => {
    if (err) {
      console.error('Error checking slot availability:', err.message);
      req.flash('error', 'Failed to check slot availability.');
      return res.redirect('/form'); // Redirect back to form
    }

    if (results[0].count > 0) {
      req.flash('error', 'This time slot is already booked. Please choose another.');
      return res.redirect('/form'); // Redirect back to form
    }

    // If slot is available, insert booking into database
    conn.query(insertQuery, [name, sex, age, address, email, phone, date, time, doctor_id], (insertErr) => {
      if (insertErr) {
        console.error('Database insert error:', insertErr.message);
        req.flash('error', 'An error occurred while submitting the form.');
        return res.redirect('/form'); // Redirect back to form
      }

      // On success, redirect to success page
      req.flash('success', 'Form submitted successfully!');
      res.redirect('/list'); // Redirect to a success page
    });
  });
});


app.get("/success", (req, res) => {
  res.render("success"); // Ensure success.ejs exists in the views folder
});


// app.post('/submit-booking', (req, res) => {
//   const { name, sex, age, address, email, phone, date, time, doctor  } = req.body;

//   // Define your SQL query to insert data
//   const sql = `
//     INSERT INTO bookings (name, sex, age, address, email, phone, date, time, doctor)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `;
//   // Check if the slot is already booked
//   const checkQuery = `
//     SELECT COUNT(*) AS count FROM bookings WHERE date = ? AND time = ?
//   `;
//   conn.query(checkQuery, [date, time], (err, results) => {
//     if (err) {
//       console.error('Error checking slot availability:', err.message);
//       return res.status(500).send('Failed to check slot availability');
//     }

//     if (results[0].count > 0) {
//       return res.send('This time slot is already booked. Please choose another.');
//     }
//   // Execute the query
//   conn.query(sql, [name, sex, age, address, email, phone, date, time, doctor], (err, results) => {
//     if (err) {
//       console.error("Database insert error:", err);
//       req.flash('error', 'An error occurred while submitting the form.');
//       return res.redirect('/form');
//     }

//     // Redirect or show success message
//     req.flash('success', 'Form submitted successfully!');
//     res.redirect('/success'); // Redirect to a success page
//   });
// });
//========================================== Major All codes are here ======================================



array = []

function now__() {
    function pad(val) {
      var str = "" + val;
      var pad = "00";
      var ans = pad.substring(0, pad.length - str.length) + str;
      return ans;
    }
  
    let dt = new Date();
    let time = pad(dt.getHours()) + ":" + pad(dt.getMinutes()) + " " + dt.getDate() + "/" + pad(dt.getMonth()+1) + "/" + dt.getFullYear();
    return time
  }
  
  app.get('/log', function(req, res) {
      let flash_data = req.flash('login');
      let flash_ = '';
      if (flash_data != '') {
          flash_ = flash_data[0];
      }else {
          flash_ = 'Success';
      }
      console.log(flash_);
      res.render('login', {flash_login: flash_data, type: flash_.substr(0, 4) == 'Success' ? 'signup' : 'signin'});
  })
  

  app.get('/index/:id_receiver', (req, res) => {
    if (req.session.loggedin) {
      const userId = req.session.id_user;
      
      // Query to fetch the role of the logged-in user
      conn.query(
        `SELECT role FROM cn_user WHERE id_user = ?`,
        [userId],
        (roleError, roleResults) => {
          if (roleError) {
            console.error('Error fetching role:', roleError);
            return res.status(500).send('Error fetching role.');
          }
  
          const role = roleResults.length > 0 ? roleResults[0].role : null;
  
          // Query to get group chat details and receiver info
          conn.query(
            `SELECT cf.id_group_chat 
             FROM cn_user cu
             JOIN cn_friend cf on cf.id_user = cu.id_user or cf.id_friend = cu.id_user
             WHERE cu.id_user = ${userId}
             AND (cf.id_user = ${req.params.id_receiver} or cf.id_friend = ${req.params.id_receiver});
  
             SELECT name, id_user FROM cn_user WHERE id_user = ${req.params.id_receiver};`,
            (error, results) => {
              if (error) {
                console.error('Error fetching data:', error);
                return res.status(500).send('Error fetching data.');
              }
  
              conn.query(
                `SELECT id_chat, user_id, message, time_chat, img 
                 FROM cn_chat WHERE id_group_chat = '${results[0][0].id_group_chat}' 
                 AND who = '${req.session.username}' 
                 ORDER BY id_chat ASC;
  
                 SELECT img_profile, information FROM cn_user WHERE id_user = ${req.params.id_receiver}`,
                (error_, return_two) => {
                  if (error_) {
                    console.error('Error fetching chat history:', error_);
                    return res.status(500).send('Error fetching chat history.');
                  }
  
                  if (!results[0][0]) {
                    return res.redirect('/list'); // No group chat found, redirect
                  }
  
                  // Decode messages
                  return_two[0].forEach((item, i) => {
                    return_two[0][i].message = he.decode(item.message);
                  });
  
                  // Render the view with role and other data
                  res.render('index', {
                    user_login: req.session,
                    role: role, // Pass the role to the frontend
                    data_receiver: results[1][0],
                    group: results[0][0],
                    history_chat: return_two[0],
                    img_profile: return_two[1][0].img_profile,
                    information: he.decode(return_two[1][0].information)
                  });
                }
              );
            });
        });
    } else {
      res.redirect('/log'); // Redirect to login if not logged in
    }
  });
  

 

  app.get('/list', (req, res) => {
    if (req.session.loggedin) {
      const userId = req.session.id_user;
      const username = req.session.username;
     
      console.log(userId,username);
      // Fetch role from the database
      conn.query(
        `SELECT role FROM cn_user WHERE id_user = ?`,
        // console.log(role),
        [userId],
        (roleError, roleResults) => {
          if (roleError) {
            console.error('Error fetching role:', roleError);
            return res.status(500).send('Error fetching role.');
          }
  
          const role = roleResults.length > 0 ? roleResults[0].role : null;
  
          conn.query(
            `SELECT cu.*
             FROM cn_friend cf, cn_user cu
             WHERE cf.id_user = ${userId}
             AND cf.who = '${username}'
             AND cf.id_friend = cu.id_user;
  
             SELECT cc.*, cu.name, cu.id_user id_friend, cu.username, cu.img_profile
             FROM cn_chat cc, cn_user cu
             WHERE id_chat IN (SELECT MAX(id_chat)
                               FROM cn_chat WHERE id_group_chat LIKE '%${username}%'
                               AND who = '${username}'
                               GROUP BY id_group_chat)
             AND cu.username = SUBSTRING_INDEX(cc.id_group_chat, "_", 
               (CASE WHEN SUBSTRING_INDEX(cc.id_group_chat, "_", -1) = '${username}' THEN 1 ELSE -1 END));
  
             SELECT img_profile FROM cn_user WHERE id_user = ${userId}`,
            (error, results) => {
              if (error) {
                console.error('Error fetching chat list:', error);
                return res.status(500).send('Error fetching chat list.');
              }
  
              results[1].forEach((item, i) => {
                results[1][i].message = he.decode(item.message);
              });

             
              // Pass role to the view
              res.render('list', {
                items: results[0],
                chat_list: results[1],
                user_login: req.session,
                flash: req.flash('login'),
                img_profile: results[2][0].img_profile,
                role: role, // Pass role here as well
                appointments: results
              });
            
          } 
          );
        });

    } else {
      res.redirect('/log'); // Redirect to login if user is not logged in
    }
  });
  

  app.post('/check_username', (req, res) => {
    conn.query(
      `SELECT username FROM cn_user WHERE username = '${htmlspecialchars(req.body.username)}'`,
      (error, results) => {
        if (results.length > 0) {
          res.json(1);
        }else {
          res.json(0);
        }
      }
    )
  })
  
  
  
// GET route to display the form
app.get('/register-doctor', (req, res) => {
  res.render('dr-register'); // Render the EJS file
});

app.get('/test', (req, res) => {
  res.render('voice'); // Render the EJS file
});

app.get('/v', (req, res) => {
  res.render('v'); // Render the EJS file
});
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     // Ensure uploads directory exists
//     const uploadDir = './uploads';
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir); // Create the directory if it doesn't exist
//     }
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname)); // e.g., 1633348976543.jpg
//   }
// });
// const upload = multer({ storage: storage });






// POST route to handle form submission
// app.post('/register-doctor', upload.single('img_profile'), (req, res) => {
//   const {
//     name,
//     username,
//     password,
//     sex,
//     age,
//     address,
//     email,
//     phone,
//     specialization,
//     role,
//     education,
//   } = req.body;

//   const img_profile = req.file ? req.file.filename : null; 

//   const last_online = new Date(); 
//   const information = 1; 

  // Correct SQL query with proper syntax for parameterized query
//   const query = `INSERT INTO cn_user (
//     name, username, password, img_profile, last_online, information, 
//     sex, age, address, email, phone, specialization, role, education
//   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

//   const values = [
//     name, username, password, img_profile, last_online, information,
//     sex, age, address, email, phone, specialization, role, education
//   ];

//   conn.query(query, values, (err, result) => {
//     if (err) {
//       console.error('Error inserting data:', err);
//       return res.status(500).send('Error registering doctor.');
//     }
//     res.status(200).send('Doctor registered successfully!');
//   });
// });


  app.post('/signup', (req, res) => {
 
  
    // Continue with registration logic
    conn.query(
      'INSERT INTO cn_user (username, name, password) VALUES (?, ?, ?)',
      [
        htmlspecialchars(req.body.username),
        htmlspecialchars(req.body.name),
        htmlspecialchars(req.body.password),
      ],
      (error, results) => {
        if (error) {
          console.error('Error inserting user:', error);
          return res.status(500).json({ success: false, message: 'Server error' });
        }
        req.flash('login', 'Successfully added account, please login...');
                res.redirect('/log');
        // req.flash('login', 'Successfully added account, please login...');
        // res.json({ success: true, message: 'Registration successful' });
      }
    );
  });
  
  app.post('/signin', (req, res) => {
    conn.query(
      'SELECT * FROM cn_user WHERE username = ? AND password = ?',
      
      [htmlspecialchars(req.body.username), htmlspecialchars(req.body.password)],
      (error, results) => {
        if (results.length > 0) {
  
          req.session.loggedin = true;
          req.session.username = results[0].username;
          req.session.name = results[0].name;
          req.session.id_user = results[0].id_user;
          req.session.information = he.decode(results[0].information);
          req.session.img_profile = results[0].img_profile;
  
                  req.flash('login', 1);
          res.redirect('/list');
        } else {
                  req.flash('login', 'Wrong Password or Username!');
          res.redirect('/log');
        }
      }
    );
  });
  
  app.post('/find', (req, res) => {
      conn.query(
          `SELECT * FROM cn_user `,
          (error, results) => {
        let hasil;
        if (results.length > 0) {
          hasil = results;
        }else {
          hasil = 0;
        }
        res.render('result', {
          user_login: req.session,
          items: hasil,
        });
          }
      )
  });
  
  app.post('/cek_friend', (req, res) => {
      conn.query(
          `SELECT * FROM cn_friend WHERE id_friend = ${req.body.id_friend} AND id_user = ${req.session.id_user} and who = '${req.session.username}'`,
          (error, results) => {
        // console.log(results);
        let hasil;
        if (results.length > 0) {
          hasil = 0;
        }else {
          hasil = 1;
        }
        res.json(hasil);
          }
      )
  });
  
  app.post('/add_friend', (req, res) => {
    if (req.session.loggedin) {
    gt = req.body.id_group_chat.split('_');
      conn.query(
      `INSERT INTO cn_friend (id_user, id_friend, id_group_chat, who) VALUES (?, ?, ?, ?), (?, ?, ?, ?);
       SELECT img_profile FROM cn_user WHERE id_user = ${req.body.id_friend}`,
      [req.session.id_user, req.body.id_friend, req.body.id_group_chat, `${gt[0]}`,
      req.session.id_user, req.body.id_friend, req.body.id_group_chat, `${gt[1]}`],
          (error, results) => {
        if (results[0].affectedRows) {
          res.json({success:1,img_profile_friend:`${results[1][0].img_profile}`});
        }
          }
      )
   }
  });
  
  app.post('/uploadpp', function(req, res) {
    let thefile = req.files.img;
    if (req.session.loggedin) {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded. Back');
      }else if (thefile.mimetype.split('/')[0] != 'image') {
        return res.status(400).send('file must be image. Back');
      }
      let name_file = +new Date() + thefile.md5;
      let path = __dirname + '/img/ak47/' + name_file + '.' + thefile.name.split('.')[1];
      let for_save = '/img/ak47/' + name_file + '.' + thefile.name.split('.')[1];
  
      sharp(thefile.data)
      .resize(400, 400)
      .toFile(path, (err, info) => {
        if (err == null) {
          conn.query(
            `SELECT img_profile FROM cn_user WHERE id_user = ${req.session.id_user}`,
            (error, img_data) => {
              if (img_data.length > 0) {
                fs.unlink(__dirname+img_data[0].img_profile, (err) => {
                  if (err) {
                    console.error(err)
                  }
                })
              }
              //UPDATE
              conn.query(
                `UPDATE cn_user SET img_profile = ? WHERE id_user = ?`,
                [for_save, req.session.id_user],
                (error, results) => {
                  if (error) {
                    return res.status(400).send('Service Unracable, try again later. Back');
                  }else {
                    req.session.img_profile = for_save
                    res.redirect('/list');
                  }
                }
              )
  
            }
          )
        }else {
          return res.status(500).send(err);
        }
      });
  
    }else {
      res.redirect('/')
    }
  });
  
  app.post('/sendimg', function(req, res) {
    if (req.session.loggedin) {
      let thefile = req.files.img;
      let explode = req.body.group_chat.split('_');
      let time = now__();
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded. Back');
      }else if (thefile.mimetype.split('/')[0] != 'image') {
        return res.status(400).send('file must be image. Back');
      }
      let name_file = +new Date() + thefile.md5;
      let path = __dirname + '/img/ss2v5/' + name_file + '.' + thefile.name.split('.')[1];
      let for_save = '/img/ss2v5/' + name_file + '.' + thefile.name.split('.')[1];
  
      sharp(thefile.data)
      .resize(400, 400)
      .toFile(path, (err, info) => {
        if (err == null) {
          conn.query(
            `INSERT INTO cn_chat (message, id_group_chat, user_id, time_chat, who, img) VALUES
            ('${req.session.name} send an image!', '${req.body.group_chat}', ${req.body.id_user}, '${time}', '${explode[0]}', '${for_save}'),
            ('${req.session.name} send an image!', '${req.body.group_chat}', ${req.body.id_user}, '${time}', '${explode[1]}', '${for_save}')`,
            (error, results) => {
              console.log(results);
              if (results.affectedRows) {
                io.sockets.emit(`new_message_${req.body.group_chat}`, {
                  msg: `${req.session.name} send an image !`,
                  sender: req.body.username,
                  time: time,
                  img: `${for_save}`
                });
                io.sockets.emit(`notification_${req.body.receiver}`, {
                  msg: he.decode(req.body.message),
                  sender: req.body.username,
                  receiver: req.body.receiver,
                  time: time,
                  id_receiver: req.body.id_user,
                  name:req.body.name,
                  img_profile: req.body.img_profile
                });
                res.redirect('/index/'+req.body.id_receiver);
              }else {
                return res.status(400).send('Service Unracable, try again later. Back');
              }
            }
          )
        }else {
          return res.status(500).send(err);
        }
      });
  
    }else {
      res.redirect('/')
    }
  });
  
  app.post('/delete_chat', (req, res) => {
    if (req.session.loggedin) {
      conn.query( // get id group
        `SELECT cf.id_group_chat FROM cn_user cu
         JOIN cn_friend cf on cf.id_user = cu.id_user or cf.id_friend = cu.id_user
         WHERE cu.id_user = ${req.session.id_user}
         AND (cf.id_user = ${req.body.id_friend} or cf.id_friend = ${req.body.id_friend})`,
        (error, result_1) => {
          conn.query( //cek if last item to delete
            `SELECT DISTINCT who FROM cn_chat WHERE id_group_chat = '${result_1[0].id_group_chat}';
             SELECT DISTINCT img FROM cn_chat WHERE id_group_chat = '${result_1[0].id_group_chat}' and img != ''`,
            (error, results_2) => {
            if (results_2[0].length == 1 && results_2[1].length != 0) {
              results_2[1].forEach((val, i)=>{
                fs.unlink(__dirname+val.img, (err) => {
                  if (err) {
                    console.error(err)
                  }
                })
              })
            }
            conn.query( // delete the chat on database
              `DELETE FROM cn_chat WHERE id_group_chat = '${result_1[0].id_group_chat}' AND who = '${req.session.username}'`,
              (error, results_3) => {
              if (results_3.affectedRows) {
                res.json(1);
              }else {
                res.json(0)
              }
            })
          })
        })
    }else {
      res.redirect('/');
    }
  });
  
  app.post('/delete_contact', (req, res) => {
    if (req.session.loggedin) {
      conn.query(
        `SELECT cf.id_group_chat FROM cn_user cu
         JOIN cn_friend cf on cf.id_user = cu.id_user or cf.id_friend = cu.id_user
         WHERE cu.id_user = ${req.session.id_user}
         AND (cf.id_user = ${req.body.id_friend} or cf.id_friend = ${req.body.id_friend});`,
        (error, result_1) => {
          conn.query(
            `DELETE FROM cn_chat WHERE id_group_chat = '${result_1[0].id_group_chat}' AND who = '${req.session.username}';
             DELETE FROM cn_friend WHERE id_group_chat = '${result_1[0].id_group_chat}' AND who = '${req.session.username}'`,
            (error, results) => {
              if (results[1].affectedRows) {
                res.json(1);
              }else {
                res.json(0);
              }
          })
        })
    }else {
      res.redirect('/');
    }
  });
  
  app.post('/update_stat_info', function(req, res) {
    if (req.session.loggedin) {
      conn.query(
        `UPDATE cn_user SET ${req.body.kind__} = '${htmlspecialchars(req.body.val__)}' WHERE id_user = ${req.session.id_user}`,
        (error, results) => {
          if (error) {
            console.log(error);
            return res.status(400).send('Service Unracable, try again later. Back');
          }else {
            if (results.affectedRows) {
              if (req.body.kind__ == 'name') {
                req.session.name = req.body.val__;
              }else {
                req.session.information = req.body.val__;
              }
              res.redirect('/list');
            }
          }
        }
      )
    }else {
      res.redeirect('/')
    }
  })
  
  app.get('/logout', function(req, res) {
    req.session.destroy((err) => {
      if (err) {
        return console.log(err);
      }
      res.redirect('/home');
    });
  });
  
  io.sockets.on('connection', function(socket) {
    array.push(socket);
    console.log('Socktes are connected : %s', array.length);
    //disconnect
    socket.on('disconnect', function(data) {
      array.splice(array.indexOf(socket), 1)
      console.log('Connected : %s ', array.length)
    })
  
  // send message
  socket.on('send_message', function(data) {
    let explode = data.group.split('_');
    let time = now__();
    conn.query(
    `INSERT INTO cn_chat (message, id_group_chat, user_id, time_chat, who) VALUES
    ('${htmlspecialchars(data.message)}', '${data.group}', ${data.id_me}, '${time}', '${explode[0]}'),
    ('${htmlspecialchars(data.message)}', '${data.group}', ${data.id_me}, '${time}', '${explode[1]}')`,
   
      (error, results) => {
        console.log(error);
        console.log(results);
        if (results != undefined) {
          if (results.affectedRows) {

            io.sockets.emit(`new_message_${data.group}`, {
              msg: he.decode(data.message),
              sender: data.username,
              time: time,
              img: ''
            });

            io.sockets.emit(`notification_${data.receiver}`, {
              msg: he.decode(data.message),
              sender: data.username,
              receiver: data.receiver,
              time: time,
              id_receiver: data.id_me,
              name:data.name,
              img_profile: data.img_profile
            });
            // console.log('data receiver '+data.receiver);
          }else {
            io.sockets.emit(`new_message_${data.group}`, {
              msg: '~',
              sender: '~'
            });
          }
        }else {
          io.sockets.emit(`new_message_${data.group}`, {
            msg: '~*',
            sender: '~*'
          });
        }

      }
    )
  });
})

//========================================== Major All codes are here ======================================


let otpCode = null; // Temporary storage for OTP



// Endpoint to request an OTP
app.post('/request-otp', (req, res) => {
  otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit OTP
  console.log(otpCode);
  client.messages
    .create({
      body: `Your OTP code is ${otpCode}`,
      from: '+17755996136',
      to: '+918269906018' // Replace with the user's phone number if needed
    })
    .then(() => {
      // res.json({ success: true, message: 'OTP sent successfully!' });
      res.render('user-register')
    })
    .catch(error => {
      res.json({ success: false, message: 'Failed to send OTP', error: error.message });
    });
});

// Endpoint to verify the OTP
app.post('/verify-otp', (req, res) => {
  const { otp } = req.body;
  
  if (otp === otpCode) {
    res.json({ success: true, message: 'OTP verified successfully!' });
    otpCode = null; // Clear OTP after successful verification
  } else {
    res.json({ success: false, message: 'Invalid OTP. Please try again.' });
  }
  });


  app.post('/master', function (req, res) {
    const { email, password, adminCode } = req.body;

    // Check if all required fields are provided
    if (!email || !password || !adminCode) {
        return res.status(400).send('Please enter Email, Password, and Admin Code');
    }

    // Validate the admin code
    if (adminCode != 1234) {
        return res.status(401).send('Invalid Admin Code');
    }

    // SQL query to authenticate the user
    const sql = "SELECT * FROM `user_form` WHERE email = ? AND password = ?";
    conn.query(sql, [email, password], function (error, results) {
        if (error) {
            console.error("Error executing query:", error);
            return res.status(500).send("Internal Server Error");
        }

        if (results.length > 0) {
            // Set session variables upon successful authentication
            req.session.loggedin = true;
            req.session.email = email;

            // Render the admin page
            return res.render('admin.ejs');
        } else {
            // Redirect to login page if authentication fails
            return res.redirect("/login");
        }
    });
});


app.post('/register', function(req, res) {
    console.log(req.body);
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    var admincode = req.body.adminCode;
    // var role = req.body.role;
    




    if (name && email && password && admincode == 1234) {
        var sql = "INSERT INTO `user_form`(`Id`, `name`, `email`, `password`) VALUES (NULL,?,?,?)";
        conn.query(sql, [name, email, password], function(error, data) {
            if (error) {
                console.error("Error executing query: " + error);
                res.status(500).send("Internal Server Error");
            } else {
                res.redirect("/register");
                
                // alert("Registered Successfully Now Login");
            }
            res.end();
        });
    } else {
        res.status(400).send('Please enter Name, Email, Password, and Admin Code');
        res.end();
    }
    

});

app.delete('/api/doctors/:id', (req, res) => {
  const doctorId = req.params.id;
console.log(doctorId);
  const sql = "DELETE FROM `doctor_table` WHERE `Id` = ?";
  conn.query(sql, [doctorId], (error, results) => {
    if (error) {
      console.error('Error deleting doctor:', error);
      return res.status(500).send('Internal Server Error');
    }

    if (results.affectedRows > 0) {
      res.status(200).send('Doctor deleted successfully');
    } else {
      res.status(404).send('Doctor not found');
    }
  });
});



// Route to render the homepage
app.get('/', (req, res) => {
  const query = 'SELECT * FROM doctor_table';
  conn.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching doctor list:', err);
          return res.status(500).send('Internal Server Error');
      }
      res.render('homepage', { cards: results });
  });
});


app.get('/home', (req, res) => {
  const query = 'SELECT * FROM doctor_table';
  conn.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching doctor list:', err);
          return res.status(500).send('Internal Server Error');
      }
      res.render('homepage', { cards: results });
  });
});

// Define a route for the doctor details page
app.get('/home/:id', (req, res) => {
  const doctorId = req.params.id;
  const query = 'SELECT * FROM doctor_table WHERE id = ?';

  conn.query(query, [doctorId], (err, results) => {
      if (err) {
          console.error('Error fetching doctor details:', err);
          return res.status(500).send('Internal Server Error');
      }

      if (results.length > 0) {
          res.render('doctor-details', { doctor: results[0] });
      } else {
          res.status(404).send('Doctor not found');
      }
  });
});

// Appointment booking route
app.post('/book-appointment', (req, res) => {
  const { doctor_id, patient_name, appointment_date, appointment_time, remarks } = req.body;

  const query = `
      INSERT INTO appointments (doctor_id, patient_name, appointment_date, appointment_time, remarks)
      VALUES (?, ?, ?, ?, ?)
  `;

  conn.query(query, [doctor_id, patient_name, appointment_date, appointment_time, remarks], (err, result) => {
      if (err) {
          console.error('Error saving appointment:', err);
          return res.status(500).send('Internal Server Error');
      }
      res.send('Appointment booked successfully!');
  });
});









// When login is successful
// For User Login
app.get("/loginin",function(req,res){
    if (req.session.loggedin && req.session.role === 'user2') {
        res.sendFile(path.join(__dirname, 'home.html'));
    } else {
        res.redirect('/login'); // Redirect to login page if not logged in or not authorized
    }
});


// For Admin Login
app.get("/admin",(req,res)=>{
    conn.query('SELECT * FROM `user_form`',function(error,results,fields){
        if(error)throw error;
        if (req.session.loggedin && req.session.role === 'admin') {
            res.render('admin.ejs',{data:results});
        } else {
            res.redirect('/login'); // Redirect to login page if not logged in or not authorized
        }
        
});

})

app.get("/user",(req,res)=>{
    conn.query('SELECT `Id`, `name`, `email`, `user_type` FROM `user_form` WHERE `user_type` = \'user2\'OR `user_type` = \'user\''
    ,function(error,results,fields){
        if(error)throw error;
        if (req.session.loggedin && req.session.role === 'user') {
            res.render('user.ejs',{data:results});
        } else {
            res.redirect('/login'); // Redirect to login page if not logged in or not authorized
        }
        
        
    })
});

app.get('/api/bookings', (req, res) => {
  const sql = 'SELECT * FROM doctor_table';   // Adjust table name and columns
  conn.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);  // Send results as JSON
  });
});




// ============================Admin panner=================================

// Route to add a doctor and send an email
app.post('/add-doctor', (req, res) => {
  const { doctor_name, email, password, specialization } = req.body;

  const sql = 'INSERT INTO doctor_table (doctor_name, email, password, specialization) VALUES (?, ?, ?, ?)';
  conn.query(sql, [doctor_name, email, password, specialization], (err, result) => {
    if (err) {
      console.error('Error inserting doctor data:', err);
      return res.status(500).send('Database Error');
    }

    console.log('Doctor data inserted:', result);

    // Set up Nodemailer transport
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Use your email service
      auth: {
        user: 'harshdew0207@gmail.com', // Your email address
        pass: 'nhzy ebkg dbks cvjd'  // Your email password or app-specific password
      }
    });

    // Email options
    const mailOptions = {
      from: 'harshdew0207@gmail.com', // Sender address
      to: email, // Receiver's email
      subject: 'Welcome to Our Hospital',
      text: `Dear Dr. ${doctor_name},

Welcome to our hospital team. Below are your credentials to access our system:

Email: ${email}
Password: ${password}

Please keep this information secure.

Best regards,
Hospital Management`
    };

    // Send the email
    transporter.sendMail(mailOptions, (emailErr, info) => {
      if (emailErr) {
        console.error('Error sending email:', emailErr);
        return res.status(500).send('Doctor added but email not sent');
      }

      console.log('Email sent:', info.response);
      res.redirect('/admin?status=success');

    });
  });
});


app.get('/api/doctors', async (req, res) => {
  const sql = 'SELECT * FROM doctor_table';  // Adjust table name and columns
  conn.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);  // Send results as JSON
  });
});



// app.get('/api/patients', async (req, res) => {
//   const sql = 'SELECT id_user, name FROM cn_user WHERE role = "User"';  // Adjust table name and columns
//   conn.query(sql, (err, results) => {
//     if (err) throw err;
//     res.json(results);  // Send results as JSON
//   });
// });
app.get('/api/patients', (req, res) => {
  const sql = 'SELECT  name, sex, age, address, phone FROM cn_user WHERE role = "User"';

  conn.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching patients:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(results); // Send results as JSON
  });
});






// ============================Admin panner=================================












app.use( favicon( path.join( __dirname, 'favicon.ico' ) ) );
app.use( '/assets', express.static( path.join( __dirname, 'assets' ) ) );



// app.get( '/', ( req, res ) => {
//     res.sendFile( __dirname + '/home.html' );
// } );

// app.get( '/home', ( req, res ) => {
//   res.sendFile( __dirname + '/home.html' );
// } );

app.get( '/chat', ( req, res ) => {
    res.sendFile( __dirname + '/chat.html' );
} );

app.get('/Voice', (req, res) => {
  res.sendFile(__dirname + '/voice.html');
});

app.get( '/video', ( req, res ) => {
    res.sendFile( __dirname + '/index.html' );
} );
app.get( '/login', ( req, res ) => {
    res.sendFile( __dirname + '/login.html' );
} );
app.get( '/register', ( req, res ) => {
    res.sendFile( __dirname + '/register.html' );
} );
app.get('/register-user', (req, res) => {
  res.render('user-register'); 
});

// Handle the form submission
app.post('/newuser-signup', async (req, res) => {
  const { username, name, sex, age, address, email, phone, password } = req.body;

  // Hash the password before saving it to the database
  

  const sql = 'INSERT INTO cn_user ( name, username, password, sex, age, address, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  const values = [ name, username, password, sex, age, address, email, phone];

  conn.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error inserting data into the database:', err);
      return res.status(500).send('An error occurred while registering the user.');
    }
    console.log('User registered successfully:', result);
    res.redirect('/log'); // Redirect to the login page after successful registration
  });
});





app.post("/save-slot", (req, res) => {
  // Handle the slot saving logic
  res.json({ success: true, message: "Time slot saved successfully!" });
});


app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/home'); // Redirect to login page after logout
        }
    });
});

// app.get('/appointment', (req, res) => {
 
  
//   res.render('appointments');

// });
app.get("/appointments", (req, res) => {
  if (req.session.loggedin) {
    const userId = req.session.id_user; // Retrieve user ID from session
    const username = req.session.username; // Retrieve username from session
    

    console.log("User ID:", userId);
    console.log("Username:", username);
    

    // Query to fetch appointments
    const query = `
 SELECT 
    bookings.*, 
    bookings.name AS name 
FROM 
    bookings 
LEFT JOIN 
    cn_user 
ON 
    bookings.doctor_id = cn_user.id_user
WHERE 
    cn_user.id_user = ?

       
    `;

    // Execute the query with doctorId as a parameter
    conn.query(query, [userId], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Error retrieving data.");
      }

      // Render the 'appointments' page with the fetched data
      res.render("appointments", { appointments: results });
    });
  } else {
    res.redirect("/"); // Redirect to login if not logged in
  }
});


// app.get("/appointments", (req, res) => {
//   const query = `
//     SELECT id, name, sex, age, address, email, phone, date, time, doctor_id, created_at
//     FROM bookings
//   `;

//   conn.query(query, (err, results) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).send("Error retrieving data.");
//     }

//     // Send the data as JSON
//     res.json(results);
//   });
// });

app.get('/get-appointments', (req, res) => {
  const query = 'SELECT * FROM bookings';
  conn.query(query, (err, results) => {
      if (err) {
          console.error(err);
          res.status(500).send('Error fetching data');
      } else {
          res.json(results);
      }
  });
});

const timeSlots = generateTimeSlots('09:00', '12:00');
function generateTimeSlots(startTime, endTime) {
  const slots = [];
  let currentTime = new Date(`1970-01-01T${startTime}:00`); // Start time
  const end = new Date(`1970-01-01T${endTime}:00`); // End time

  while (currentTime <= end) {
    const time = currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); // Format as 9 or 9:30
    slots.push(time);
    currentTime.setMinutes(currentTime.getMinutes() + 60); // Increment by 30 minutes
  }

  return slots;
}

// function generateTimeSlots(startTime, endTime) {
//   const slots = [];
//   let currentTime = new Date(`1970-01-01T${startTime}:00`); // Start time
//   const end = new Date(`1970-01-01T${endTime}:00`); // End time

//   while (currentTime < end) {
//     const start = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//     currentTime.setMinutes(currentTime.getMinutes() + 30); // Increment by 15 minutes
//     const end = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//     slots.push(`${start} - ${end}`);
//   }

//   return slots;
// }

app.get("/booking-api", (req, res) => {
  // const timeSlots = generateTimeSlots("09:00", "18:00"); // Generate slots from 9:00 AM to 6:00 PM
  const sql = 'SELECT * FROM doctor_table'; // Query to fetch doctors

  conn.query(sql, (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).send("Internal Server Error"); // Send an error response
    }

    // Render the EJS template with timeSlots and doctor data
    res.render("timeSlots", { timeSlots, doctors: results });
  });
});


app.post("/save-slots", (req, res) => {
  const { timeSlots } = req.body;

  if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
    return res.status(400).json({ success: false, message: "Invalid time slots" });
  }

  // Save to database (mock query for demonstration)
  console.log("Selected time slots:", timeSlots);

  // Respond to the client
  res.json({ success: true, message: "Time slots saved successfully!" });
});




// ===================Multer===============================

// const storage1 = multer.diskStorage({
//   destination: (req, file, cb) => {
//       cb(null, 'uploads/videos/'); // Save videos to the 'uploads' folder
//   },
//   filename: (req, file, cb) => {
//       const uniqueName = `${req.body.user}-${moment().unix()}-record.webm`;
//       cb(null, uniqueName);
//   }
// });

// const upload1 = multer({ storage1 });


app.post('/update_profile', async (req, res) => {
  const { field, value } = req.body;
  const userId = req.session.userId; // Assuming user session contains userId

  try {
    await conn.query(`UPDATE users SET ${field} = ? WHERE id = ?`, [value, userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({ success: false, error: 'Database update failed' });
  }
});


app.post('/upload', upload.single('video'), (req, res) => {
  console.log('File:', req.file);
  if (!req.file) return res.json({ success: false, message: 'No file uploaded' });

  console.log('User:', req.session.name);
  console.log('Doctor ID:', req.session.doctor_id);

  const filePath = `/uploads/videos/${req.file.filename}`;
  conn.query('INSERT INTO videos (user, file_path) VALUES (?, ?)', [req.session.name, filePath], (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, filePath });
  });
});



// app.post('/upload', upload.single('video'), (req, res) => {
//   console.log('File:', req.file);
//   if (!req.file) return res.json({ success: false, message: 'No file uploaded' });
//    console.log("No file Uploaded")

//   console.log('User:', req.session.name);
//   console.log('Doctor ID:', req.session.doctor_id);

//   const filePath = `uploads/videos/${req.file.filename}`;

//   // const filePath = `./uploads/${req.file.filename}`;
//   conn.query('INSERT INTO videos (user, file_path) VALUES (?, ?)', [req.session.name, filePath], (err) => {
//     if (err) {
//       console.error('Database error:', err);
//       return res.json({ success: false, message: 'Database error' });
//     }
//     res.json({ success: true, filePath });
//     console.log("Uploaded Successfully");
//   });
// });





// app.get('/videos', (req, res) => {
//   if ( !req.session.name) {
//     return res.status(401).send('You must be logged in to view videos.');
//   }
// console.log(req.session.name)
// console.log(req.session.username)
// console.log(req.session.id_user)
//   const user = req.session.name  // Assuming the user object is stored in session
//   const sql = 'SELECT * FROM videos WHERE user = ? ORDER BY uploaded_at DESC';

//   conn.query(sql, [user], (err, results) => {
//       if (err) {
//           console.error('Database error:', err);
//           return res.status(500).send('Database error');
//       }

//       res.render('videos', { videos: results });
//   });
// });




// ✅ Upload Endpoint (Production Ready)
// app.post('/upload', upload.single('video'), (req, res) => {
//   if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

//   if (!req.session?.name) {
//     return res.status(401).json({ success: false, message: 'Unauthorized' });
//   }

//   const user = req.session.name;
//   const doctor_id = req.session.doctor_id || null; // Optional if not used
//   const filePath = `/videos/${req.file.filename}`; // Use correct path

//   const sql = 'INSERT INTO videos (user, doctor_id, file_path) VALUES (?, ?, ?)';
//   conn.query(sql, [user, doctor_id, filePath], (err) => {
//     if (err) {
//       console.error('Database error:', err);
//       return res.status(500).json({ success: false, message: 'Database error' });
//     }
//     res.json({ success: true, filePath });
//   });
// });

// ✅ Video Fetch Endpoint (Production Ready)
app.get('/videos', (req, res) => {
  if (!req.session.name) {
    return res.status(401).send('You must be logged in to view videos.');
  }

  console.log(req.session.name, req.session.username, req.session.id_user);

  const user = req.session.name;
  const sql = 'SELECT * FROM videos WHERE user = ? ORDER BY uploaded_at DESC';

  conn.query(sql, [user], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    res.render('videos', { videos: results });
  });
});



















// app.get('/videos', (req, res) => {
//   const sql = 'SELECT * FROM videos WHERE user = ? ORDER BY uploaded_at DESC';

  
//   conn.query(sql, (err, results) => {
//       if (err) {
//           console.error('Database error:', err);
//           return res.status(500).send('Database error');
//       }

//       res.render('videos', { videos: results });
//   });
// });


// app.post("/upload-audio", upload.single("audio"), (req, res) => {
//   if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//   }

//   const filePath = req.file.path;

//   // Save file path to database
//   const sql = "INSERT INTO recordings (file_path) VALUES (?)";
//   conn.query(sql, [filePath], (err, result) => {
//       if (err) throw err;
//       res.status(200).json({ message: "Audio uploaded successfully", filePath });
//   });
// });


// app.post('/upload', upload1.single('video'), (req, res) => {
//   if (!req.file) {
//       return res.json({ success: false, message: 'No file uploaded' });
//   }

//   const user = req.body.user;
//   const filePath = `/uploads/videos/${req.file.filename}`; // Save path to database

//   // Store file reference in MySQL
//   const sql = 'INSERT INTO videos (user, file_path) VALUES (?, ?)';
//   conn.query(sql, [user, filePath], (err, result) => {
//       if (err) {
//           console.error('Database error:', err);
//           return res.json({ success: false, message: 'Database error' });
//       }
//       res.json({ success: true, filePath });
//   });
// });


// ====================Multer=================================

























app.get("/getUserRole", (req, res) => {
  if (!req.session || !req.session.id_user) {
      return res.status(401).json({ message: "Unauthorized" });
  }
  
  
  const userId = req.session.id_user;
  console.log("Session Data:", req.session.role);
  
  const sql = "SELECT role FROM cn_user WHERE id_user = ?";
  conn.query(sql, [userId], (err, result) => {
      if (err) {
          console.error("Database query error:", err);
          return res.status(500).json({ error: "Internal Server Error" });
      }

      if (result.length > 0) {
          return res.json({ role: result[0].role });
      } else {
          return res.status(404).json({ message: "User not found" });
      }
  });
});




app.post("/send-email", async (req, res) => {
  const { email } = req.body;
  const currentURL = req.get("Referer") || "No referrer";
  console.log(currentURL);

  const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: 'harshdew0207@gmail.com',
          pass: 'nhzy ebkg dbks cvjd'
      }
  });

  const mailOptions = {
      from: 'harshdew0207@gmail.com',
      to: email,
      subject: 'Meeting URL',
      html: `<p>Hello,</p><p>Link to join your meeting is: <a href="${currentURL}">${currentURL}</a></p>`
  };

  transporter.sendMail(mailOptions, (emailErr, info) => {
      if (emailErr) {
          console.error('Error sending email:', emailErr);
          return res.status(500).json({ error: 'Failed to send email' });
      }

      console.log('Email sent:', info.response);
      res.json({ message: 'Email sent successfully' });
  });
});



io.of( '/stream' ).on( 'connection', stream );

server.listen(serverPort);
console.log("Server started on " + serverURL);



// END SERVER