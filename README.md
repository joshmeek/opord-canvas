# OPORD CANVAS - Demo

A demo web application showcasing modern approaches to creating, analyzing, and managing military operation orders with AI-powered tactical analysis capabilities. This project demonstrates the integration of modern web technologies with AI for military document processing.

## Overview

This demo project showcases:
- Document upload and management for military operation orders
- AI-powered tactical analysis and enhancement
- Interactive document viewing and editing
- Modern web application architecture using React and FastAPI

## Tech Stack

### Backend
- Python 3.x with FastAPI framework
- PostgreSQL database
- Alembic for database migrations
- Pydantic for data validation
- Google Gemini AI for tactical analysis

### Frontend
- React with React Router for navigation
- Tailwind CSS for styling
- Modern, responsive UI components

### Development Tools
- Cursor IDE for AI-assisted development
- Docker and Docker Compose for local development
- Git for version control

## Key Features

- Interactive OPORD canvas for document viewing and editing
- AI-powered tactical analysis using Google Gemini
- Document upload and management
- Real-time collaboration capabilities
- Modern, responsive user interface

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js and npm
- Python 3.x
- Google Gemini API key

### Environment Setup
1. Clone the repository
2. Create a `.env` file with the following variables:
   ```
   GOOGLE_API_KEY=
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
   ```

### Running the Application
1. Start the services with Docker Compose:
```bash
docker-compose up -d
```

2. Install backend dependencies and run migrations:
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --reload
```

3. Install frontend dependencies and start the development server:
```bash
cd frontend
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Project Structure

```
mil/
├── backend/           # FastAPI backend service
│   ├── alembic/      # Database migrations
│   ├── app/          # Main application code
│   │   ├── crud/     # Database operations
│   │   ├── models/   # Database models
│   │   ├── routers/  # API endpoints
│   │   └── services/ # Business logic
│   └── tests/        # Backend tests
└── frontend/         # React frontend
    ├── app/          # Application components
    └── routes/       # Route definitions
```

## Development Notes

- This is a demonstration project showcasing the integration of modern web technologies with AI for military document processing
- The application runs locally using Docker Compose for easy setup and development
- All military document processing is done for demonstration purposes only
