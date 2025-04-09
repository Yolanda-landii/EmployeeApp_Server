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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

// Add employee endpoint
app.post('/api/employees', async (req, res) => {
    try {
        const { 
            name, 
            surname, 
            email, 
            phone, 
            idNumber, 
            role, 
            department, 
            techStack, 
            githubUsername, 
            linkedinProfile, 
            image 
        } = req.body;

        // Validate required fields
        if (!email || !name || !surname || !phone || !idNumber || !role || !department || !techStack) {
            return res.status(400).send('Missing required fields');
        }

        // Validate email format
        if (typeof email !== 'string' || email.trim() === '') {
            return res.status(400).send('Invalid email');
        }

        // Check if employee with this ID already exists
        const existingEmployee = await db.collection('employees').doc(idNumber).get();
        if (existingEmployee.exists) {
            return res.status(409).send('Employee with this ID number already exists');
        }

        const employeeData = {
            name,
            surname,
            email,
            phone,
            idNumber,
            role,
            department,
            techStack,
            githubUsername: githubUsername || '',
            linkedinProfile: linkedinProfile || '',
            image: image || '', 
            createdAt: admin.firestore.FieldValue.serverTimestamp(), 
        };

        // Use idNumber as the document ID for consistency
        const employeeRef = db.collection('employees').doc(idNumber);  
        await employeeRef.set(employeeData);

        res.status(200).json(employeeData);  
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).send(`Error adding employee: ${error.message}`);
    }
});

// Upload photo endpoint
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
  
// Get all employees endpoint
app.get('/api/employees', async (req, res) => {
  try {
    const employeesSnapshot = await db.collection('employees').get();
    const employees = employeesSnapshot.docs.map(doc => doc.data());
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).send(`Error fetching employees: ${error.message}`);
  }
});

// Update employee endpoint
app.put('/api/employees/:idNumber', async (req, res) => {
    const { idNumber } = req.params;
    const { 
      name, 
      surname, 
      email, 
      phone, 
      role, 
      department, 
      techStack, 
      githubUsername, 
      linkedinProfile, 
      image 
  } = req.body;
    
    try {
      // Check if employee exists
      const employeeRef = db.collection('employees').doc(idNumber);
      const doc = await employeeRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      
      // Update the employee
      await employeeRef.update(updatedData);
  
      // Get the updated document
      const updatedDoc = await employeeRef.get();
      res.status(200).json({
        message: 'Employee updated successfully',
        updatedEmployee: updatedDoc.data(),
      });
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ message: `Error updating employee: ${error.message}` });
    }
  });
  
// Delete employee endpoint
app.delete('/api/employees/:idNumber', async (req, res) => {
  const { idNumber } = req.params;
  try {
    const employeeRef = db.collection('employees').doc(idNumber);
    
    // Check if employee exists
    const doc = await employeeRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    await employeeRef.delete();
    res.status(200).send('Employee deleted successfully');
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).send(`Error deleting employee: ${error.message}`);
  }
});

// Get single employee endpoint
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
    console.error('Error fetching employee:', error);
    res.status(500).send(`Error fetching employee: ${error.message}`);
  }
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});