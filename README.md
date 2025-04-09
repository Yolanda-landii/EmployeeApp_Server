# Employee Management System - Server

A robust REST API server for managing employee information, built with Node.js, Express, and Firebase.

## Features

- Employee CRUD operations (Create, Read, Update, Delete)
- Image upload support with Firebase Storage
- Data validation and error handling
- Secure Firebase integration
- CORS enabled for cross-origin requests

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Firebase project with Firestore and Storage enabled
- Firebase service account credentials

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd EmployeeApp_Server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_STORAGE_BUCKET=your-storage-bucket
```

## API Endpoints

### Employees

#### Create Employee
- **POST** `/api/employees`
- Required fields:
  - name
  - surname
  - email
  - phone
  - idNumber
  - role
  - department
  - techStack
  - age (must be between 18 and 100)
- Optional fields:
  - githubUsername
  - linkedinProfile
  - image

#### Get All Employees
- **GET** `/api/employees`

#### Get Single Employee
- **GET** `/api/employees/:idNumber`

#### Update Employee
- **PUT** `/api/employees/:idNumber`
- Same fields as Create Employee

#### Delete Employee
- **DELETE** `/api/employees/:idNumber`

### File Upload

#### Upload Photo
- **POST** `/upload-photo`
- Form data field: `file`

## Error Handling

The API includes comprehensive error handling for:
- Missing required fields
- Invalid email format
- Age validation (must be between 18 and 100)
- Duplicate employee IDs
- File upload issues
- Server errors

## Security

- Firebase Authentication for secure data access
- Environment variables for sensitive credentials
- Input validation and sanitization
- CORS protection

## Running the Server

Start the server:
```bash
node index.js
```

The server will run on port 3001 by default.

## Dependencies

- express
- firebase-admin
- multer
- cors
- dotenv

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.
