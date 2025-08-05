# Medicine Tracker App

Track your medicine schedule and log your health information (like weight) using a minimal, mobile-first web app.

## 🧠 Features

- ✅ Supabase Auth login/logout
- ✅ Dashboard for quick overview
- ✅ Add, edit, delete medicines with flexible scheduling
- ✅ Log medicine intake timestamps
- ✅ Log and view weight history
- ✅ Email reminders using Supabase Edge Functions + Cron
- ✅ Mobile-first UI using Skeleton
- ✅ Node.js + Express backend API

## 🛠 Tech Stack

- React (Vite) + Skeleton UI
- Node.js + Express
- Supabase (Auth, DB, Edge Functions, Cron)
- CI/CD: GitHub + Vercel + Render (or Railway)

## 🧱 Project Structure

```
medicine-tracker/
├── backend/           # Express API
├── frontend/          # React + Vite SPA
├── supabase/          # SQL and Edge Function code
└── .gitignore
```

## 🚀 Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/yourusername/medicine-tracker.git
cd medicine-tracker
```

### 2. Setup Supabase

- Create project on [supabase.com](https://supabase.com)
- Copy keys from **Settings > API**
- Apply `supabase/sql/schema.sql` using Supabase SQL Editor
- Enable extensions:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

### 3. Configure Environment Variables

#### `backend/.env`

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### `frontend/.env`

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Locally

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Backend

```bash
cd backend
npm install
node server.js
```

### 5. Deploy Reminder Function

```bash
supabase functions deploy sendReminderEmail
```

### 6. Schedule Cron Job (SQL)

```sql
select cron.schedule('med-reminder', '0 * * * *', $$
  select net.http_post(
    url := 'https://your-project.functions.supabase.co/sendReminderEmail',
    headers := jsonb_build_object('Authorization', 'Bearer your-anon-key')
  )
$$);
```

## 🧪 Testing

- Log in and create medicines
- Log intakes and weights
- Wait for hourly email reminders

## 📦 Deployment

- Frontend: [Vercel](https://vercel.com)
- Backend: [Render](https://render.com) or [Railway](https://railway.app)
- Set appropriate environment variables on both

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss your ideas.

## 📄 License

[MIT](LICENSE)

