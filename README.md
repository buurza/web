| `npm run dev` | Start TypeScript watcher with hot-reload |
| `npm start` | Run compiled TypeScript |
| `npm run db:migrate` | Create migrations & update DB |
| `npm run db:push` | Push schema to DB (no migrations) |
| `npm run db:studio` | Open Prisma Studio GUI (`http://localhost:5555`) |
| `npm run db:reset` | Delete & recreate database |

## 🌐 Hosting with db.local Hostname ✨

### Quick Setup

1. **Add hosts entry** (one-time):
   ```bash
   # Add this line to your hosts file
   127.0.0.1       db.local
   ```

2. **Start the web server**:
   ```bash
   npm install          # Install dependencies
   npx tsx db-local-server.ts  # Start at http://db.local
   ```

3. **Access via browser**:
   - Visit `http://db.local` (no port needed!)
   - API: `http://db.local/api/health`
   - Auth test: `http://db.local/api/auth/test`

### Configuration Files

- [hosts.txt](./db-frontend/hosts.txt) - Hosts entry template for Windows/Mac/Linux

### Local Development (SQLite)
```bash
DATABASE_URL="file:./prisma/dev.db"
npm run db:migrate
npx tsx db-local-server.ts
# Then open http://db.local in your browser
```

### Production (PostgreSQL/MySQL)
1. Create PostgreSQL database on your host (Supabase, Railway, AWS RDS)
2. Update `.env`: `DATABASE_URL="postgresql://user:pass@host:5432/dbname"`
3. Run migrations: `npm run db:migrate`
4. Start server: `npx tsx db-local-server.ts`

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
- [Express.js](https://expressjs.com/) - Web server (db-local-server.ts)

## 📄 License
