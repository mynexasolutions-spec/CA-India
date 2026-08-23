# Deployment Guide: Updating Project on AWS EC2

This guide outlines the step-by-step process to deploy new changes to the AWS EC2 server after you push them to GitHub.

---

### Step 1: Connect to the Server (SSH)
Open your PowerShell/Terminal in the directory containing your key (`nexa.pem`) and run:
```bash
ssh -i "nexa.pem" ec2-user@ec2-13-127-122-172.ap-south-1.compute.amazonaws.com
```

---

### Step 2: Go to the Project Directory
On the server, navigate to the folder where the project is cloned:
```bash
cd /var/www/abkhanassociates
```

---

### Step 3: Pull New Code from GitHub
Fetch and merge the latest changes from your GitHub repository:
```bash
git pull origin main
```
*(If it asks for GitHub credentials/token, please enter them).*

---

### Step 4: Update Backend Dependencies (Laravel)
Go to the backend directory and update composer packages:
```bash
cd backend
composer install --no-dev --optimize-autoloader --ignore-platform-reqs
```

---

### Step 5: Run Database Migrations
If you added any new database tables or columns, apply the changes:
```bash
php artisan migrate --force
```

---

### Step 6: Clear Cache
Ensure Laravel reads the fresh configurations and routes:
```bash
php artisan config:clear
php artisan route:clear
php artisan cache:clear
```

---

### Step 7: Fix Directory Permissions (Optional but Recommended)
Make sure the web server can read/write to log files and cache:
```bash
sudo chmod -R 777 storage
sudo chmod -R 777 bootstrap/cache
```

---

### Step 8: Update Frontend and Build (React)
Go back to the main directory, install packages, and build static files:
```bash
cd /var/www/abkhanassociates
npm install
npm run build
```

---

### Step 9: Restart Web Server Services
Restart Nginx and PHP-FPM to apply all code and configuration changes:
```bash
sudo systemctl restart nginx
sudo systemctl restart php-fpm
```

---
**Done!** Your application is now updated with the latest code from GitHub.
