# Server bir martalik sozlash (84.238.132.16)

Bu qadamlar faqat BIR MARTA, qo'lda bajariladi. Shundan keyin GitHub Actions
har bir `git push` da avtomatik backend/frontend'ni yangilab turadi.

## 1. Papkalar

```bash
mkdir -p /opt/avitsena/backend
mkdir -p /var/www/avitsena/dist
```

## 2. Postgres — alohida baza va user

```bash
sudo -u postgres psql -c "CREATE DATABASE avitsena_db;"
sudo -u postgres psql -c "CREATE USER avitsena_user WITH PASSWORD 'KUCHLI_PAROL_BERING';"
sudo -u postgres psql -c "ALTER ROLE avitsena_user SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE avitsena_db TO avitsena_user;"
sudo -u postgres psql -d avitsena_db -c "GRANT ALL ON SCHEMA public TO avitsena_user;"
```

## 3. Python venv va kutubxonalarni sinab ko'rish

Python 3.14 juda yangi, Django 5.2 bilan mos kelishini oldindan tekshiramiz:

```bash
cd /opt/avitsena/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
```

Keyin kodni birinchi marta shu papkaga joylashtirish kerak (birinchi GitHub
Action push'idan oldin, yoki qo'lda `git clone`/`scp` orqali), so'ng:

```bash
pip install -r requirements/base.txt
```

**Agar xato chiqsa** (masalan `psycopg` yoki boshqa paket build bo'lmasa),
Python 3.12'ni qo'shib o'rnatamiz:

```bash
apt update && apt install -y software-properties-common
add-apt-repository -y ppa:deadsnakes/ppa
apt update && apt install -y python3.12 python3.12-venv
rm -rf venv
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements/base.txt
```

## 4. `.env` fayli (serverda, git'ga tushmaydi)

`/opt/avitsena/backend/.env`:

```env
PORT=8000
DEBUG=False
SECURE_SSL_REDIRECT=False
CSRF_COOKIE_SECURE=False
SESSION_COOKIE_SECURE=False
DJANGO_SECRET_KEY=<yangi, tasodifiy uzun kalit>
ALLOWED_HOSTS=84.238.132.16,127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=http://84.238.132.16:8080
CSRF_TRUSTED_ORIGINS=http://84.238.132.16:8080

POSTGRES_DB=avitsena_db
POSTGRES_USER=avitsena_user
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_PASSWORD=<2-qadamdagi parol>
```

`DJANGO_SECRET_KEY` generatsiya qilish uchun:

```bash
source venv/bin/activate
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## 5. Migratsiya va superuser

```bash
cd /opt/avitsena/backend
source venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

## 6. systemd service

```bash
cp deployments/systemd/avitsena-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable avitsena-backend
systemctl start avitsena-backend
systemctl status avitsena-backend
```

## 7. nginx

```bash
cp deployments/nginx/avitsena.conf /etc/nginx/sites-available/avitsena.conf
ln -s /etc/nginx/sites-available/avitsena.conf /etc/nginx/sites-enabled/avitsena.conf
nginx -t
systemctl reload nginx
```

## 8. Firewall (agar ufw yoqilgan bo'lsa)

```bash
ufw status
ufw allow 8080/tcp
```

## 9. GitHub repo Secrets

`https://github.com/IlkhomTilovov/Avitsena/settings/secrets/actions` sahifasida qo'shing:

| Nom | Qiymat |
|---|---|
| `AVITSENA_DEPLOY_KEY` | generatsiya qilingan **private** kalit matni (to'liq, `-----BEGIN...` dan `-----END...` gacha) |
| `AVITSENA_SERVER_HOST` | `84.238.132.16` |
| `AVITSENA_SERVER_USER` | `root` |
| `AVITSENA_BACKEND_PATH` | `/opt/avitsena/backend` |
| `AVITSENA_FRONTEND_PATH` | `/var/www/avitsena/dist` |
| `AVITSENA_FRONTEND_API_BASE` | `http://84.238.132.16:8080` |

Shundan keyin `main` branchga `backend/` yoki `frontend/` ichida o'zgarish
push qilinsa, tegishli workflow avtomatik ishga tushadi.
