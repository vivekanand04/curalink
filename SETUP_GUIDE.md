# CuraLink - Complete Setup Guide

This guide provides step-by-step instructions to set up the CuraLink application, including environment variables, database configuration, and all required installations.

---

## 📋 Prerequisites - Required Software Installations

### 1. Node.js and npm

**Windows:**
- Download Node.js from [https://nodejs.org/](https://nodejs.org/)
- Choose the LTS version (v18 or higher recommended)
- Run the installer and follow the instructions
- Verify installation:
  ```bash
  node --version
  npm --version
  ```
- Should display versions like: `v18.17.0` and `9.6.7`

**macOS:**
- Using Homebrew:
  ```bash
  brew install node
  ```
- Or download from [https://nodejs.org/](https://nodejs.org/)
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

**Linux (Ubuntu/Debian):**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### 2. PostgreSQL Database

**Windows:**
- Download PostgreSQL from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
- Run the installer
- During installation:
  - Remember the password you set for the `postgres` user (you'll need this later)
  - Default port is `5432` (keep this unless you change it)
  - Installation path is usually `C:\Program Files\PostgreSQL\<version>`
- Verify installation:
  ```bash
  psql --version
  ```

**macOS:**
- Using Homebrew:
  ```bash
  brew install postgresql@14
  brew services start postgresql@14
  ```
- Verify installation:
  ```bash
  psql --version
  ```

**Linux (Ubuntu/Debian):**
  ```bash
  sudo apt update
  sudo apt install postgresql postgresql-contrib
  sudo systemctl start postgresql
  sudo systemctl enable postgresql
  ```
- Verify installation:
  ```bash
  psql --version
  ```

### 3. Git (Optional but Recommended)

- Download from [https://git-scm.com/downloads](https://git-scm.com/downloads)
- Verify installation:
  ```bash
  git --version
  ```

---

## 🗄️ Database Setup

### Step 1: Create PostgreSQL Database

1. **Open PostgreSQL command line or pgAdmin**

   **Windows (Command Prompt or PowerShell):**
   ```bash
   psql -U postgres
   ```

   **macOS/Linux:**
   ```bash
   sudo -u postgres psql
   ```

2. **Enter your PostgreSQL password** (the one you set during installation)

3. **Create the database:**
   ```sql
   CREATE DATABASE curalink;
   ```

4. **Verify database creation:**
   ```sql
   \l
   ```
   - You should see `curalink` in the list

5. **Exit PostgreSQL:**
   ```sql
   \q
   ```

### Step 2: Note Your Database Credentials

You'll need these for the `.env` file:
- **Database Name:** `curalink`
- **Database User:** `postgres` (or your custom username)
- **Database Password:** (the password you set during PostgreSQL installation)
- **Database Host:** `localhost` (default)
- **Database Port:** `5432` (default)

---

## 🔐 Environment Variables Setup

### Backend .env File

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a `.env` file** in the `backend` folder:
   - **Windows (PowerShell):**
     ```bash
     New-Item .env -ItemType File
     ```
   - **macOS/Linux:**
     ```bash
     touch .env
     ```

3. **Open the `.env` file** in a text editor and add the following content:

   ```env
   # ============================================
   # Database Configuration
   # ============================================
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=curalink
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password_here

   # ============================================
   # JWT Authentication
   # ============================================
   # Generate a secure random string for JWT_SECRET
   # You can use: openssl rand -base64 32
   # Or visit: https://www.random.org/strings/
   JWT_SECRET=your_super_secret_jwt_key_change_this_to_random_string

   # ============================================
   # OpenAI API (for AI-generated summaries)
   # ============================================
   # Get your API key from: https://platform.openai.com/api-keys
   # Optional: Application will work without it, but AI summaries won't work
   OPENAI_API_KEY=sk-your_openai_api_key_here

   # ============================================
   # Server Configuration
   # ============================================
   PORT=5000
   NODE_ENV=development

   # ============================================
   # External API Keys (Optional)
   # ============================================
   # PubMed API Key (optional, improves rate limits)
   # Get from: https://www.ncbi.nlm.nih.gov/account/settings/
   PUBMED_API_KEY=
   ```

4. **Replace the placeholder values:**

   - **DB_PASSWORD:** Replace `your_postgres_password_here` with your actual PostgreSQL password
   - **JWT_SECRET:** Replace `your_super_secret_jwt_key_change_this_to_random_string` with a secure random string
     - **Generate on Windows (PowerShell):**
       ```powershell
       -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
       ```
     - **Generate on macOS/Linux:**
       ```bash
       openssl rand -base64 32
       ```
     - **Or use online generator:** https://www.random.org/strings/
   
   - **OPENAI_API_KEY (Optional):**
     - Sign up at [https://platform.openai.com/](https://platform.openai.com/)
     - Go to API Keys section
     - Create a new secret key
     - Replace `sk-your_openai_api_key_here` with your actual key
     - **Note:** If you don't add this, the app will still work but use simple text summaries instead of AI-generated ones

   - **PUBMED_API_KEY (Optional):**
     - Sign up at [https://www.ncbi.nlm.nih.gov/account/register/](https://www.ncbi.nlm.nih.gov/account/register/)
     - Go to Account Settings → API Keys
     - Create an API key
     - This improves rate limits for PubMed searches (not required)

### Frontend .env File

1. **Navigate to the frontend directory** (from project root):
   ```bash
   cd frontend
   ```

2. **Create a `.env` file** in the `frontend` folder:
   - **Windows (PowerShell):**
     ```bash
     New-Item .env -ItemType File
     ```
   - **macOS/Linux:**
     ```bash
     touch .env
     ```

3. **Open the `.env` file** and add:

   ```env
   # ============================================
   # Backend API URL
   # ============================================
   # Default: http://localhost:5000/api
   # Change only if your backend runs on a different port
   REACT_APP_API_URL=http://localhost:5000/api
   ```

   **Note:** If your backend runs on a different port (e.g., 5001), change it accordingly.

---

## 📦 Installing Dependencies

### Option 1: Install All at Once (Recommended)

From the **project root directory**, run:

```bash
npm run install-all
```

This will install dependencies for:
- Root package.json
- Backend package.json
- Frontend package.json

### Option 2: Install Separately

**1. Install root dependencies:**
```bash
npm install
```

**2. Install backend dependencies:**
```bash
cd backend
npm install
cd ..
```

**3. Install frontend dependencies:**
```bash
cd frontend
npm install
cd ..
```

---

## 🗃️ Initialize Database Tables

1. **Make sure PostgreSQL is running:**
   - **Windows:** Should start automatically
   - **macOS:** `brew services start postgresql@14`
   - **Linux:** `sudo systemctl start postgresql`

2. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

3. **Run the database initialization script:**
   ```bash
   node scripts/initDatabase.js
   ```

   You should see output like:
   ```
   Connected to PostgreSQL database
   Database tables initialized successfully
   Forum categories initialized
   Database initialization completed
   ```

4. **Verify database setup:**
   ```bash
   psql -U postgres -d curalink -c "\dt"
   ```
   - This should show all created tables

---

## 🚀 Running the Application

### Option 1: Run Both Frontend and Backend Together (Recommended)

From the **project root directory**:

```bash
npm run dev
```

This will:
- Start the backend server on `http://localhost:5000`
- Start the frontend server on `http://localhost:3000`
- Open the frontend in your browser automatically

### Option 2: Run Separately (For Development)

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
- Backend will be available at `http://localhost:5000`
- API health check: `http://localhost:5000/api/health`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
- Frontend will be available at `http://localhost:3000`
- Opens automatically in your browser

---

## ✅ Verification Checklist

After setup, verify everything works:

### 1. Backend Health Check
Open in browser or use curl:
```
http://localhost:5000/api/health
```
Should return: `{"status":"OK","message":"CuraLink API is running"}`

### 2. Database Connection
- Check terminal for: `Connected to PostgreSQL database`
- No database errors in console

### 3. Frontend Access
- Open `http://localhost:3000`
- Should see the CuraLink landing page
- No console errors

### 4. Create Test Account
- Click "I am a Patient or Caregiver" or "I am a Researcher"
- Register with email and password
- Complete onboarding
- Verify you can access the dashboard

---

## 🔧 Troubleshooting

### Issue: Database Connection Failed

**Error:** `Connection refused` or `password authentication failed`

**Solutions:**
1. Verify PostgreSQL is running:
   - **Windows:** Check Services → PostgreSQL
   - **macOS:** `brew services list`
   - **Linux:** `sudo systemctl status postgresql`

2. Check `.env` file credentials match your PostgreSQL setup:
   - Username: `postgres` (or your custom user)
   - Password: Must match PostgreSQL installation password
   - Port: `5432` (default)

3. Test connection manually:
   ```bash
   psql -U postgres -d curalink -h localhost
   ```

### Issue: Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solutions:**
1. Find and kill the process using the port:
   - **Windows:**
     ```bash
     netstat -ano | findstr :5000
     taskkill /PID <PID> /F
     ```
   - **macOS/Linux:**
     ```bash
     lsof -ti:5000 | xargs kill -9
     ```

2. Or change the port in `backend/.env`:
   ```env
   PORT=5001
   ```
   And update `frontend/.env`:
   ```env
   REACT_APP_API_URL=http://localhost:5001/api
   ```

### Issue: Module Not Found

**Error:** `Cannot find module 'xxx'`

**Solution:**
1. Delete `node_modules` folders:
   ```bash
   rm -rf node_modules
   rm -rf backend/node_modules
   rm -rf frontend/node_modules
   ```
2. Reinstall dependencies:
   ```bash
   npm run install-all
   ```

### Issue: OpenAI API Errors

**Error:** `Invalid API key` or AI summaries not working

**Solutions:**
1. Verify `OPENAI_API_KEY` in `backend/.env` starts with `sk-`
2. Check API key is valid at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
3. Ensure you have credits in your OpenAI account
4. **Note:** App works without OpenAI, but uses simple text summaries

### Issue: CORS Errors

**Error:** `Access to fetch at 'http://localhost:5000/api' has been blocked by CORS policy`

**Solution:**
- This should be handled automatically by the backend CORS configuration
- Verify backend is running on the correct port
- Check `REACT_APP_API_URL` in `frontend/.env` matches backend port

---

## 📝 Summary of .env Files

### Backend `.env` (Required Variables)

| Variable | Description | Required | Default/Example |
|----------|-------------|----------|-----------------|
| `DB_HOST` | PostgreSQL host | Yes | `localhost` |
| `DB_PORT` | PostgreSQL port | Yes | `5432` |
| `DB_NAME` | Database name | Yes | `curalink` |
| `DB_USER` | PostgreSQL username | Yes | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | Yes | Your PostgreSQL password |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | Random secure string |
| `OPENAI_API_KEY` | OpenAI API key | No* | `sk-...` |
| `PORT` | Backend server port | No | `5000` |
| `NODE_ENV` | Environment mode | No | `development` |
| `PUBMED_API_KEY` | PubMed API key | No | (empty) |

*Required for AI-generated summaries, optional for basic functionality

### Frontend `.env` (Required Variables)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REACT_APP_API_URL` | Backend API URL | No | `http://localhost:5000/api` |

---

## 🎉 You're All Set!

Once everything is running:
1. Open `http://localhost:3000` in your browser
2. Create an account (Patient or Researcher)
3. Complete the onboarding process
4. Start exploring CuraLink!

For questions or issues, refer to the main `README.md` file.

