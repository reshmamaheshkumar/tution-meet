# Tution_Meet - Node.js OVIPanel Deployment

## Quick Deploy Guide for OVIPanel Subdomain

### Prerequisites:
- OVIPanel hosting account with Node.js support
- MongoDB Atlas account (free tier works)
- LiveKit Cloud account (free tier available)

---

## Step 1: Upload Files

Upload all files to your subdomain folder:
```
/home/username/public_html/subdomain/
```

Required files:
- server.js
- package.json
- .env (create from .env.example)
- dist/ (frontend build folder)
- routes/
- middleware/
- models/

---

## Step 2: Configure Environment Variables

Create `.env` file:

```bash
# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster.mongodb.net/tution_meet

# Security
JWT_SECRET=your-super-secret-key-min-32-characters

# LiveKit (from cloud.livekit.io)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Port (OVIPanel usually assigns this)
PORT=5000
```

---

## Step 3: Install Dependencies

In OVIPanel terminal or SSH:

```bash
cd /home/username/public_html/subdomain
npm install
```

This installs:
- express (web server)
- mongoose (MongoDB ODM)
- socket.io (WebSockets)
- jsonwebtoken (JWT auth)
- bcryptjs (password hashing)
- livekit-server-sdk (video)
- cors (cross-origin requests)

---

## Step 4: Setup Node.js App in OVIPanel

1. Login to OVIPanel
2. Go to "Setup Node.js App" (or similar)
3. Click "Create Application"
4. Fill in:
   - **Node.js Version**: 18.x or 20.x (recommended)
   - **Application Root**: `/home/username/public_html/subdomain`
   - **Application URL**: `https://your-subdomain.domain.com`
   - **Application Startup File**: `server.js`
   - **Passenger File**: Leave default or set to `server.js`
5. Click "Create"

---

## Step 5: Restart & Test

1. Click "Restart" button in OVIPanel
2. Wait 10-30 seconds
3. Visit: `https://your-subdomain.domain.com/health`
4. Should show: `Server is Running! Mode: production`

---

## Step 6: Test Application

1. Visit: `https://your-subdomain.domain.com/`
2. Should see the login page
3. Try registering a new account
4. Test login
5. Test live session (need LiveKit credentials)

---

## Troubleshooting

### 404 Error:
- Check if `dist/` folder exists with `index.html`
- Verify Node.js app is running
- Check OVIPanel error logs

### MongoDB Connection Error:
- Whitelist your server IP in MongoDB Atlas
- Check MONGODB_URI format
- Verify password doesn't have special characters (url-encode if needed)

### LiveKit Not Working:
- Get real API keys from https://cloud.livekit.io
- Check LIVEKIT_URL format (should start with wss://)

### Socket.IO Issues:
- Check browser console for CORS errors
- Verify server is running on correct port
- Check if port is blocked by firewall

### Port Already in Use:
- OVIPanel usually assigns a port automatically
- Check `process.env.PORT` in server.js
- May need to use assigned port from OVIPanel

---

## File Structure

```
subdomain/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env                   # Environment variables
├── .env.example           # Example env file
├── dist/                  # React build
│   ├── index.html
│   └── assets/
├── routes/                # API routes
│   ├── auth.js
│   ├── livekit.js
│   ├── assignments.js
│   ├── attendance.js
│   ├── subjects.js
│   ├── session.js
│   └── notifications.js
├── middleware/            # Auth middleware
│   ├── auth.js
│   └── roleGuard.js
└── models/                # Mongoose models
    ├── User.js
    ├── Assignment.js
    ├── Subject.js
    ├── Attendance.js
    ├── Notification.js
    └── SessionData.js
```

---

## Support

Check logs in OVIPanel:
- Error logs: `/home/username/logs/`
- Application logs: Check Node.js app logs in OVIPanel

Common commands:
```bash
# Check if server is running
ps aux | grep node

# View logs
tail -f /home/username/logs/error.log

# Restart manually
killall node
npm start
```

---

## Security Notes

1. **Change JWT_SECRET** to a random 32+ character string
2. **Use strong passwords** for MongoDB
3. **Enable MongoDB Atlas IP whitelist**
4. **Use HTTPS** in production
5. **Keep LiveKit credentials secret**

---

## LiveKit Setup

1. Go to https://cloud.livekit.io
2. Create a new project
3. Get API keys from Settings > API Keys
4. Copy LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
5. Paste in your .env file

---

## MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com
2. Create a cluster (free tier works)
3. Create a database user
4. Whitelist your server IP
5. Get connection string from Connect > Drivers > Node.js
6. Paste in your .env file

---

**Ready to deploy!**
