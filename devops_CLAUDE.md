# CLAUDE.md - Server DevOps Configuration Template

> **Template** — Replace `{{PLACEHOLDERS}}` with values for your server. Drop unused sections. This file makes Claude Code behave as a server DevOps specialist on any Linux host.

## User & Access
- **User**: `{{USERNAME}}`
- **Home**: `/home/{{USERNAME}}`
- **Role**: DevOps Engineer & Developer
- **Permissions**: `{{sudo access available | restricted shell | etc.}}`

## Primary Project

**{{PROJECT_NAME}}** (`{{PROJECT_PATH}}`)
- {{One-line description of what this server hosts}}
- Stack: {{e.g., Rails 8 + Python Flask + Node}}
- Web root / symlink: `{{/var/www/example.com}}`
- Detailed docs: `{{PROJECT_PATH}}/CLAUDE.md`

---

## Critical Rules (MUST FOLLOW)

### 1. ALWAYS Create Backups Before Destructive Operations
```bash
cp file.ext file.ext.bak.$(date +%Y%m%d_%H%M%S)
```
Applies to config files, databases, migrations, and any irreversible edit. For databases prefer a dump:
```bash
sqlite3 db.sqlite3 ".backup db.sqlite3.bak.$(date +%Y%m%d_%H%M%S)"
pg_dump {{db}} > {{db}}.$(date +%Y%m%d_%H%M%S).sql
mysqldump {{db}} > {{db}}.$(date +%Y%m%d_%H%M%S).sql
```

### 2. ALWAYS Set File Permissions After Creating Files
```bash
chmod 644 /path/to/new/file       # Files
chmod 755 /path/to/new/directory  # Directories
```
The web server (typically `www-data` / `nginx`) needs read access to all served files. Sensitive files (`.env`, keys, credentials) must be `600` and owned by the app user.

### 3. NEVER Start Application Servers Manually
Use systemd, never raw process commands.
```bash
# CORRECT
sudo systemctl restart {{app}}.service

# WRONG — bypasses logging, supervision, restart-on-failure
rails server   # NO
puma           # NO
node app.js    # NO
gunicorn ...   # NO (unless explicitly the systemd ExecStart)
```

### 4. ALWAYS Validate Config Before Reloading
```bash
sudo nginx -t && sudo systemctl reload nginx
sudo apache2ctl configtest && sudo systemctl reload apache2
sudo sshd -t && sudo systemctl reload ssh
```
Reloading a broken config can take the service down and lock you out.

### 5. ALWAYS Read Files Before Editing
Never propose changes to code you haven't read. Confirm the current state, then edit.

### 6. NEVER Create New Branches Unsolicited
Work directly on the default branch (`main` / `master`) unless the user explicitly asks for a feature branch or PR. Don't auto-create branches for "safety."

### 7. ALWAYS Log Production Changes
Every production-affecting change gets a dated entry in the project's `CLAUDE.md` (or `CHANGELOG.md`). Treat Claude as the architect/main dev — silent changes will be forgotten.

### 8. NEVER Bypass Hooks or Signing
Don't use `--no-verify`, `--no-gpg-sign`, or skip pre-commit hooks unless the user explicitly asks. If a hook fails, fix the underlying issue.

### 9. NEVER Force-Push to Main / Shared Branches
`git push --force` to `main`, `master`, or any shared branch requires explicit user approval. Prefer `--force-with-lease` even when authorized.

### 10. Investigate Before Deleting
If you find unexpected files, branches, lock files, or running processes, investigate before removing. They may be the user's in-progress work.

---

## Active Services

| Service | Port | Description |
|---------|------|-------------|
| {{service-1}} | {{port}} | {{purpose}} |
| {{service-2}} | {{port}} | {{purpose}} |
| nginx | 80/443 | Reverse proxy + TLS |

### Service Commands
```bash
sudo systemctl status   <service>
sudo systemctl restart  <service>
sudo systemctl reload   <service>   # prefer reload over restart when possible
sudo journalctl -u <service> -f      # follow logs
sudo journalctl -u <service> -n 100  # last 100 lines
sudo journalctl -u <service> --since "1 hour ago"
```

### Discovering Services
```bash
systemctl list-units --type=service --state=running
sudo ss -tlnp                # what's listening on which port
sudo lsof -i :{{port}}       # what owns a specific port
```

---

## Cron / Scheduled Jobs

```bash
crontab -l                                  # current user
sudo crontab -l -u {{user}}                 # other user
ls /etc/cron.d/ /etc/cron.daily/            # system-wide
systemctl list-timers --all                 # systemd timers
```
Document each scheduled job in a table (job name, schedule, command, log path) so they don't become invisible cron-orphans.

---

## Web Server (Nginx)

```bash
# Config locations
/etc/nginx/nginx.conf
/etc/nginx/sites-available/
/etc/nginx/sites-enabled/

# Test → reload (always together)
sudo nginx -t && sudo systemctl reload nginx

# Logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Per-site error rate, last hour
sudo journalctl -u nginx --since "1 hour ago" | grep -i error
```

### Apache equivalents
```bash
sudo apache2ctl configtest && sudo systemctl reload apache2
sudo tail -f /var/log/apache2/error.log
```

---

## TLS Certificates (Let's Encrypt)

```bash
sudo certbot certificates                       # list + expiry
sudo certbot renew --dry-run                    # test renewal
sudo certbot renew                              # actual renewal (cron usually does this)
sudo certbot --nginx -d example.com -d www...   # issue + auto-configure nginx
```
Renewal is usually handled by `certbot.timer` or `/etc/cron.d/certbot`. Check it exists before assuming auto-renewal works.

---

## Database (Generic Patterns)

### SQLite
```bash
sqlite3 /path/to/db.sqlite3
.tables
.schema table_name
.backup /path/to/backup.sqlite3
```

### PostgreSQL
```bash
sudo -u postgres psql
\l                    # list databases
\c dbname             # connect
\dt                   # list tables
pg_dump dbname > dbname.sql
psql dbname < dbname.sql
```

### MySQL / MariaDB
```bash
sudo mysql
SHOW DATABASES;
USE dbname;
SHOW TABLES;
mysqldump dbname > dbname.sql
mysql dbname < dbname.sql
```

### Always before migrations
```bash
# 1. Backup
# 2. Run migration in production env explicitly
# 3. Verify with a SELECT or app smoke test
```

---

## Firewall (UFW)

```bash
sudo ufw status verbose
sudo ufw allow 22/tcp           # always preserve SSH first
sudo ufw allow 'Nginx Full'
sudo ufw enable                 # only after confirming SSH rule exists
sudo ufw reload
```

`firewalld` equivalents: `firewall-cmd --list-all`, `firewall-cmd --add-service=https --permanent`, `firewall-cmd --reload`.

---

## SSH & Access

```bash
# Authorized keys
cat ~/.ssh/authorized_keys

# Recent logins
last -n 20
sudo journalctl -u ssh --since today

# Failed auth
sudo journalctl -u ssh | grep -i "failed\|invalid"

# Test config before reload
sudo sshd -t && sudo systemctl reload ssh
```

Never edit `sshd_config` without keeping a second authenticated session open.

---

## Disk, Memory, Process Triage

```bash
df -h                       # disk usage by mount
du -sh /var/log/* | sort -h # biggest log dirs
free -h                     # memory
top / htop                  # live processes
ps auxf                     # process tree
sudo dmesg -T | tail -50    # kernel ring (OOM, disk errors)
```

When disk fills up, the usual suspects are: `/var/log/journal` (`sudo journalctl --vacuum-size=500M`), Docker (`docker system prune`), old kernels (`apt autoremove`), application logs without rotation.

---

## Logs & Log Rotation

```bash
ls /etc/logrotate.d/        # rotation configs per service
sudo logrotate -d /etc/logrotate.d/{{service}}   # dry-run
sudo journalctl --disk-usage
sudo journalctl --vacuum-time=30d
```
Any log file written by your app belongs in logrotate. Unrotated logs are how servers run out of disk at 3am.

---

## Backups

Before writing a backup script, answer:
1. **What** is being backed up (DB? user uploads? config?)
2. **Where** (local disk? remote? object storage?)
3. **How often** + **how long retained**
4. **Restore tested?** — an untested backup is not a backup.

Standard rsync pattern:
```bash
rsync -avz --delete /source/ user@remote:/dest/
```

---

## Deployment Workflow (Generic)

```bash
cd {{PROJECT_PATH}}
git pull
# language-specific build/deps:
bundle install --deployment            # Ruby
npm ci && npm run build                # Node
pip install -r requirements.txt        # Python
# migrations (with backup first!)
sudo systemctl restart {{app}}.service
sudo nginx -t && sudo systemctl reload nginx
# smoke test
curl -fsS https://{{domain}}/health || echo "FAIL"
```

---

## Troubleshooting Playbook

### App returns 502 / 504
1. `sudo systemctl status {{app}}` — is the service up?
2. `sudo journalctl -u {{app}} -n 100` — recent errors?
3. `sudo lsof -i :{{port}}` — is anything listening on the upstream port?
4. `sudo nginx -t` — is the proxy config valid?
5. `sudo tail -f /var/log/nginx/error.log` — what does nginx see?

### App returns 500
1. Application logs (`journalctl -u {{app}}` or app-specific log file)
2. Database reachable? (`psql`, `redis-cli ping`, etc.)
3. Disk full? (`df -h`)
4. Recent deploy? Roll back.

### Permission denied
```bash
ls -la /path/to/file
namei -l /path/to/file       # show ownership at every level
chmod 644 /path/to/file
chown {{user}}:{{group}} /path/to/file
```

### "Address already in use"
```bash
sudo lsof -i :{{port}}
# usually a previous process didn't die — kill it cleanly via systemctl, not kill -9
```

---

## Adding a New Service (Checklist)

1. **systemd unit** in `/etc/systemd/system/{{name}}.service`
2. `sudo systemctl daemon-reload`
3. `sudo systemctl enable --now {{name}}`
4. **nginx vhost** (if HTTP) — proxy_pass to upstream port
5. `sudo nginx -t && sudo systemctl reload nginx`
6. **Firewall** rule if external
7. **TLS** via certbot if external
8. **Logrotate** entry if it writes its own log file
9. **Backup** entry if it has state
10. **Document** in this CLAUDE.md's services table

---

## Key Paths (Customize)

| Resource | Path |
|----------|------|
| Project root | `{{PROJECT_PATH}}` |
| App config | `{{PROJECT_PATH}}/config/` |
| Database | `{{DB_PATH}}` |
| Web root | `/var/www/{{domain}}` |
| Nginx config | `/etc/nginx/sites-enabled/{{domain}}` |
| Systemd units | `/etc/systemd/system/` |
| Logs | `/var/log/{{service}}/` |
| Backups | `{{BACKUP_PATH}}` |

---

## Detailed Documentation

Per-project specifics live in the project's own `CLAUDE.md`. This template covers the **server-level** rules that apply regardless of which project is hosted.

Recommended sub-docs (in `{{PROJECT_PATH}}/.claude/`):
- `rules/coding-standards.md`
- `rules/api-standards.md`
- `rules/operations-checklist.md`
- `context/architecture.md`
- `context/services.md`
- `context/database.md`
- `templates/new-service.md`
