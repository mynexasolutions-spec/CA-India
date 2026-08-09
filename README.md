# A B KHAN & ASSOCIATES

React marketing site + Laravel 13 API (Sanctum), Client Portal, GST Billing, Admin Portal, Knowledge Centre.

## Stack
- Frontend: Vite + React 19 (`/` → `dist/`)
- Backend: Laravel 13 in `backend/`
- DB: MySQL `abkhanassociates`
- Nginx: SPA + `/api/` → PHP-FPM + `/storage/`

## Demo logins
| Portal | Email | Password |
|---|---|---|
| Admin | admin@abkhanassociates.com | Admin@2026 |
| Staff | staff@abkhanassociates.com | Staff@2026 |
| Client | client@abkhanassociates.com | Client@2026 |

## Build & deploy
```bash
npm install && npm run build
cd backend && composer install && php artisan migrate --force && php artisan db:seed --force
php artisan storage:link
# schedule: * * * * * cd /var/www/abkhanassociates/backend && php artisan schedule:run
```

## Key routes
- Site: `/`, `/billing-management`, `/knowledge-centre`
- Client: `/portal/login` → `/portal`, `/portal/billing`
- Admin: `/admin/login` → `/admin`
