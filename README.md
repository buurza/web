# TypeScript Auth System 🚀

Minimal authentication system built with **TypeScript**, **Prisma ORM**, and **SQLite**.

## 📁 Project Structure

```
├── prisma/              # Database schema & migrations
│   ├── schema.prisma    # Type-safe database definition
│   └── dev.db           # SQLite database (auto-generated)
├── src/
│   └── auth.ts          # Login/register functions with type safety
├── .env                 # Database connection string
├── package.json         # Dependencies & scripts
└── README.md            # This file
```

## 🔐 Features

- ✅ Type-safe authentication (TypeScript)
- ✅ Secure password hashing (bcrypt)
- ✅ Prisma ORM for database operations
- ✅ SQLite for local development
- ✅ Ready to migrate to PostgreSQL/MySQL

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
npm run db:migrate   # Create database from schema (PostgreSQL/SQLite)
# OR
npm run db:push      # Quick setup (no migrations, SQLite only)
```

### 3. Run the App

```bash
npm run dev          # Start with hot-reload
npm start            # Production mode
```

## 📖 Usage

```typescript
import { register, login, emailExists } from './src/auth';

// Register a new user (email & password will be hashed)
const user = await register('user@example.com', 'password123', 'User Name');

// Login
const result = await login('user@example.com', 'password123');
if (result) {
  console.log(`Logged in as: ${result.email}`);
}

// Check if email exists before registering
if (!await emailExists('user@example.com')) {
  await register(...);
}
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start TypeScript watcher with hot-reload |
| `npm start` | Run compiled TypeScript |
| `npm run db:migrate` | Create migrations & update DB |
| `npm run db:push` | Push schema to DB (no migrations) |
| `npm run db:studio` | Open Prisma Studio GUI (`http://localhost:5555`) |
| `npm run db:reset` | Delete & recreate database |

## 🌐 Hosting

### Local Development (SQLite)
```bash
DATABASE_URL="file:./prisma/dev.db"
npm run db:migrate
npm run dev
```

### Production (PostgreSQL/MySQL)
1. Create PostgreSQL database on your host (Supabase, Railway, AWS RDS)
2. Update `.env`: `DATABASE_URL="postgresql://user:pass@host:5432/dbname"`
3. Run migrations: `npm run db:migrate`
4. Deploy!

## 🔒 Security Notes

- **Never** store plain-text passwords (hashed with bcrypt)
- Always use HTTPS in production
- Implement rate limiting on login endpoints
- Add JWT/session tokens for stateful auth

## 📚 Tech Stack

- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Prisma ORM](https://www.prisma.io/) - Database access layer
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) - Password hashing
- [SQLite](https://www.sqlite.org/) / [PostgreSQL](https://www.postgresql.org/) - Database

## 📄 License

MIT