const express = require('express');
const admin = require('firebase-admin');
const multer = require('multer');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  
});
// console.log({
//   projectId: process.env.FIREBASE_PROJECT_ID,
//   clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//   privateKey:process.env.FIREBASE_PRIVATE_KEY
// });

const db = admin.firestore();
const bucket = admin.storage().bucket();

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true,
}));
app.use(cookieParser());
const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/employees', async (req, res) => {   
  try {
    const { name, surname, email, phone, image } = req.body;

    if (!email || !name || !surname || !phone) {
      return res.status(400).send('Missing required fields');
    }

    if (typeof email !== 'string' || email.trim() === '') {
      return res.status(400).send('Invalid email');
    }

    const employeeData = {
      name,
      surname,
      email,
      phone,
      image,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const employeeRef = db.collection('employees').doc(email);  
    await employeeRef.set(employeeData);

    res.status(200).json(employeeData);  
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).send(`Error adding employee: ${error.message}`);
  }
});

app.post('/api/register', csrfProtection, async (req, res) => {
  
  const { email, password, name } = req.body;
  console.log('Received registration request:', req.body);
  console.log('CSRF Token:', req.headers['x-csrf-token']);

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    const userData = {
      uid: userRecord.uid,
      email,
      name,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    res.status(201).json({ message: 'User registered successfully', user: userData });
  } catch (error) {
    console.error('Error registering user:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: `Error registering user: ${error.message}` });
  }
});

const JWT_SECRET = process.env.JWT_SECRET;
console.log("JWT_SECRET:", process.env.JWT_SECRET);
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined. Please set it in the environment variables.');
}
app.post('/api/login', csrfProtection, async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Missing idToken' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userSnapshot = await db.collection('users').doc(uid).get();
    if (!userSnapshot.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userSnapshot.data();

    const token = jwt.sign(
      { uid: userData.uid, email: userData.email, name: userData.name },
      process.env.JWT_SECRET,
      { expiresIn: '2m' }  
    );

    res.cookie('token', token, { httpOnly: true, secure: true, maxAge: 120000 }); 
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: `Error logging in: ${error.message}` });
  }
});

app.post('/api/logout', csrfProtection, (req, res) => {
  try {
    
    res.clearCookie('token', { httpOnly: true, secure: true });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

app.post('/upload-photo', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).send('No file uploaded');
    }

    const blob = bucket.file(file.originalname);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on('finish', async () => {
      const [url] = await blob.getSignedUrl({
        action: 'read',
        expires: '03-09-2491', 
      });
      res.status(200).send({ message: `Uploaded: ${file.originalname}`, url });
    });

    blobStream.on('error', (err) => {
      res.status(500).send(`Error uploading file: ${err.message}`);
    });

    blobStream.end(file.buffer);
  } catch (error) {
    res.status(500).send(`Error uploading file: ${error.message}`);
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const employeesSnapshot = await db.collection('employees').get();
    const employees = employeesSnapshot.docs.map(doc => doc.data());
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).send(`Error fetching employees: ${error.message}`);
  }
});

app.put('/api/employees/:idNumber', async (req, res) => {
  const { idNumber } = req.params;
  const updatedData = req.body;
  try {
    const employeeRef = db.collection('employees').doc(idNumber);
    await employeeRef.update(updatedData);

    const updatedDoc = await employeeRef.get();
    if (updatedDoc.exists) {
      res.status(200).json({
        message: 'Employee updated successfully',
        updatedEmployee: updatedDoc.data(),
      });
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ message: `Error updating employee: ${error.message}` });
  }
});

const { getStorage, ref, deleteObject } = require('firebase-admin/storage'); 

app.delete('/api/employees/:idNumber', async (req, res) => {
  const { idNumber } = req.params;
  
  try {
    const employeeRef = db.collection('employees').doc(idNumber);
    const employeeDoc = await employeeRef.get();

    if (!employeeDoc.exists) {
      return res.status(404).send('Employee not found');
    }

    const employeeData = employeeDoc.data();
    const imageUrl = employeeData.image; 

    if (imageUrl) {
      const storage = getStorage();
      const fileRef = ref(storage, imageUrl);

      await deleteObject(fileRef); 
    }

    await employeeRef.delete();

    res.status(200).send('Employee and associated image deleted successfully');
  } catch (error) {
    res.status(500).send(`Error deleting employee: ${error.message}`);
  }
});

app.get('/api/employees/:idNumber', async (req, res) => {
  const { idNumber } = req.params;
  try {
    const employeeRef = db.collection('employees').doc(idNumber);
    const doc = await employeeRef.get();
    if (doc.exists) {
      res.status(200).json(doc.data());
    } else {
      res.status(404).send('Employee not found');
    }
  } catch (error) {
    res.status(500).send(`Error fetching employee: ${error.message}`);
  }
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
