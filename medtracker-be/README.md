# Medicine Tracker Backend API

A comprehensive Node.js Express backend for a medicine tracking application that handles user authentication, medicine management, intake logging, and weight tracking using Supabase as the backend-as-a-service platform.

## Features

### 🔐 Authentication
- User registration and login using Supabase Auth
- JWT token-based authentication
- Password reset functionality
- User profile management
- Secure route protection middleware

### 💊 Medicine Management
- CRUD operations for medicines
- Medicine scheduling (daily/weekly/as-needed)
- Dosage and instruction tracking
- Medicine search and filtering
- Schedule management with time-based alerts

### 📝 Medicine Intake Logging
- Log when medicines are taken with timestamps
- Track actual dosage taken vs prescribed
- Add notes for each intake
- Adherence analytics and reporting
- Duplicate intake prevention

### ⚖️ Weight Tracking
- Log weight measurements with timestamps
- Support for multiple units (kg, lbs, pounds)
- Weight trend analysis and analytics
- Historical weight data visualization
- Body composition tracking (optional)

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Backend-as-a-Service (Auth, Database, Real-time)
- **JavaScript** - Programming language
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## Project Structure

```
medtracker-be/
├── server.js              # Main server file
├── package.json            # Dependencies and scripts
├── .env.example           # Environment variables template
├── middleware/
│   └── auth.js            # Authentication middleware
└── routes/
    ├── auth.js            # Authentication routes
    ├── medicines.js       # Medicine management routes
    ├── medicineLogs.js    # Medicine intake logging routes
    └── weights.js         # Weight tracking routes
```

## Installation

1. **Clone the repository** (if not already done)
   ```bash
   cd medtracker-be
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your actual Supabase credentials
   nano .env
   ```

4. **Configure environment variables in `.env`**
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3001
   NODE_ENV=development
   ```

   > **Key Choice**: We use `SUPABASE_ANON_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`) because:
   > - We rely on user authentication + RLS policies for security
   > - ANON_KEY respects Row Level Security, ensuring users only access their own data
   > - SERVICE_ROLE_KEY would bypass RLS and grant admin access to all data
   > - This architecture is more secure for user-facing applications

5. **Verify environment setup**
   ```bash
   npm run check-env
   ```

## Database Schema

### Required Supabase Tables

Create the following tables in your Supabase database:

#### 1. medicines
```sql
CREATE TABLE medicines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    schedule_type VARCHAR(20) CHECK (schedule_type IN ('daily', 'weekly', 'as_needed')) NOT NULL,
    schedule_times JSONB DEFAULT '[]'::jsonb,
    instructions TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_medicines_user_id ON medicines(user_id);
CREATE INDEX idx_medicines_active ON medicines(user_id, is_active);
```

#### 2. medicine_logs
```sql
CREATE TABLE medicine_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE NOT NULL,
    taken_at TIMESTAMPTZ NOT NULL,
    dosage_taken VARCHAR(50),
    notes TEXT,
    scheduled_time VARCHAR(5), -- HH:MM format
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_medicine_logs_user_id ON medicine_logs(user_id);
CREATE INDEX idx_medicine_logs_medicine_id ON medicine_logs(medicine_id);
CREATE INDEX idx_medicine_logs_taken_at ON medicine_logs(taken_at);
```

#### 3. weight_logs
```sql
CREATE TABLE weight_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    weight DECIMAL(5,2) NOT NULL CHECK (weight > 0),
    unit VARCHAR(10) CHECK (unit IN ('kg', 'lbs', 'pounds')) NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    body_fat_percentage DECIMAL(4,1) CHECK (body_fat_percentage >= 0 AND body_fat_percentage <= 100),
    muscle_mass DECIMAL(5,2) CHECK (muscle_mass >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_weight_logs_user_id ON weight_logs(user_id);
CREATE INDEX idx_weight_logs_measured_at ON weight_logs(measured_at);
```

### Row Level Security (RLS)

Enable RLS and create policies for each table:

```sql
-- Enable RLS
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- Medicines policies
CREATE POLICY "Users can view own medicines" ON medicines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medicines" ON medicines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medicines" ON medicines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medicines" ON medicines FOR DELETE USING (auth.uid() = user_id);

-- Medicine logs policies
CREATE POLICY "Users can view own medicine logs" ON medicine_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medicine logs" ON medicine_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medicine logs" ON medicine_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medicine logs" ON medicine_logs FOR DELETE USING (auth.uid() = user_id);

-- Weight logs policies
CREATE POLICY "Users can view own weight logs" ON weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weight logs" ON weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weight logs" ON weight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weight logs" ON weight_logs FOR DELETE USING (auth.uid() = user_id);
```

## Usage

### Development Mode
```bash
# Start the server with auto-reload
npm run dev
```

### Production Mode
```bash
# Start the server
npm start
```

The server will start on `http://localhost:3001` (or the port specified in your `.env` file).

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout (requires auth)
- `GET /api/auth/user` - Get current user (requires auth)
- `PUT /api/auth/user` - Update user profile (requires auth)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Medicines (`/api/medicines`)
- `GET /api/medicines` - Get user's medicines (requires auth)
- `GET /api/medicines/:id` - Get specific medicine (requires auth)
- `POST /api/medicines` - Create new medicine (requires auth)
- `PUT /api/medicines/:id` - Update medicine (requires auth)
- `DELETE /api/medicines/:id` - Delete medicine (requires auth)
- `GET /api/medicines/:id/schedule` - Get medicine schedule (requires auth)

### Medicine Logs (`/api/medicine-logs`)
- `GET /api/medicine-logs` - Get medicine intake logs (requires auth)
- `GET /api/medicine-logs/:id` - Get specific log (requires auth)
- `POST /api/medicine-logs` - Log medicine intake (requires auth)
- `PUT /api/medicine-logs/:id` - Update intake log (requires auth)
- `DELETE /api/medicine-logs/:id` - Delete intake log (requires auth)
- `GET /api/medicine-logs/analytics/adherence` - Get adherence analytics (requires auth)

### Weight Logs (`/api/weights`)
- `GET /api/weights` - Get weight logs (requires auth)
- `GET /api/weights/:id` - Get specific weight log (requires auth)
- `POST /api/weights` - Create weight log (requires auth)
- `PUT /api/weights/:id` - Update weight log (requires auth)
- `DELETE /api/weights/:id` - Delete weight log (requires auth)
- `GET /api/weights/analytics/trends` - Get weight trends (requires auth)

### System
- `GET /` - API information
- `GET /health` - Health check endpoint

## Authentication

All protected routes require a Bearer token in the Authorization header:

```javascript
headers: {
  'Authorization': 'Bearer your_jwt_token_here',
  'Content-Type': 'application/json'
}
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": ["Additional error details if applicable"]
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

## Security Features

- JWT token authentication via Supabase Auth
- Row Level Security (RLS) for data isolation
- Input validation and sanitization
- CORS protection
- Rate limiting (via Supabase)
- SQL injection prevention (via Supabase parameterized queries)
- Secure password handling (via Supabase Auth)

## Environment Variables

| Variable | Description | Required | Notes |
|----------|-------------|----------|-------|
| `SUPABASE_URL` | Your Supabase project URL | Yes | Found in your Supabase project settings |
| `SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | Yes | **Use ANON_KEY, not SERVICE_ROLE_KEY** for security |
| `PORT` | Server port (default: 3001) | No | Port where the API server will run |
| `NODE_ENV` | Environment (development/production) | No | Affects error verbosity and CORS settings |
| `JWT_SECRET` | Additional JWT secret (optional) | No | For additional token verification if needed |

### Key Security Note

**Why ANON_KEY instead of SERVICE_ROLE_KEY?**

- **ANON_KEY**: Respects Row Level Security (RLS) policies, ensuring users only access their own data
- **SERVICE_ROLE_KEY**: Bypasses RLS completely, granting admin access to all data
- Our backend uses user authentication + RLS for security, making ANON_KEY the correct choice
- SERVICE_ROLE_KEY should only be used for admin operations or server-side tasks that need to bypass RLS

## Contributing

1. Follow the existing code style and patterns
2. Add comprehensive comments for new functions
3. Include input validation for all endpoints
4. Write descriptive commit messages
5. Test all endpoints before submitting

## License

ISC License

## Support

For issues and questions, please refer to the project documentation or create an issue in the repository.