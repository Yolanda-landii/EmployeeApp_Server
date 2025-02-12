const express = require('express');
const admin = require('firebase-admin');
const multer = require('multer');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const app = express();
app.use(express.json());
app.use(cors());

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
  

app.delete('/api/employees/:idNumber', async (req, res) => {
  const { idNumber } = req.params;
  try {
    const employeeRef = db.collection('employees').doc(idNumber);
    await employeeRef.delete();
    res.status(200).send('Employee deleted successfully');
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
