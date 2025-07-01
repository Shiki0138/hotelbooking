# Database Setup Guide

## Prerequisites
- PostgreSQL installed and running
- Redis installed and running
- Node.js and npm installed

## Setup Steps

### 1. Database Creation
Create a PostgreSQL database for the project:
```bash
createdb lastminutestay
```

### 2. Environment Configuration
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Update the `.env` file with your database credentials:
```
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/lastminutestay"
REDIS_URL="redis://localhost:6379"
JWT_SECRET=your-secure-secret-key-here
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Generate Prisma Client
```bash
npm run prisma:generate
```

### 5. Run Database Migrations
```bash
npm run prisma:migrate
```

### 6. Seed the Database
```bash
npm run prisma:seed
```

### 7. Start the Backend Server
```bash
npm run dev
```

### 8. Test the API
```bash
node test-api.js
```

## API Endpoints

### Health Check
- GET `/health` - Check if the server is running

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user

### Hotels
- GET `/api/hotels` - Search hotels with filters
- GET `/api/hotels/:id` - Get hotel details

### Rooms
- GET `/api/rooms/hotel/:hotelId` - Get rooms for a hotel

### Bookings
- POST `/api/bookings` - Create a booking
- GET `/api/bookings` - Get user bookings (authenticated)

## Frontend Connection

The frontend is configured to connect to the backend at `http://localhost:3000`.

Make sure both services are running:
- Backend: `npm run dev` (port 3000)
- Frontend: `npm run dev` (port 3001 or as configured)

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running: `pg_ctl status`
- Check database exists: `psql -l`
- Verify credentials in `.env`

### Redis Connection Issues
- Ensure Redis is running: `redis-cli ping`
- Check Redis URL in `.env`

### API Not Responding
- Check if port 3000 is available
- Review logs for errors
- Ensure all dependencies are installed