#!/usr/bin/env bash
# Sets up the Arion main instance (Ubuntu 24.04): MySQL 8, the server (systemd), the analyst behind nginx, Tailscale,
# nightly backups to S3, and the node fleet's key in SSM Parameter Store. Run as root by the instance's user data;
# safe to re-run (it rebuilds and restarts, and keeps the database, passwords and keys it created before).
#
# Environment: ARION_REGION, ARION_BRANCH, ARION_BACKUP_BUCKET (set by the CloudFormation template)
set -euo pipefail
exec > >(tee -a /var/log/arion-setup.log) 2>&1
echo "=== Arion main setup $(date -Is)"

REGION="${ARION_REGION:?}"
BRANCH="${ARION_BRANCH:-main}"
BUCKET="${ARION_BACKUP_BUCKET:?}"
NODE_GROUP="${ARION_NODE_GROUP:-arion-nodes}"
ROOT=/opt/arion
REPOS="core pipeline c1 db server node analyst"
export DEBIAN_FRONTEND=noninteractive HOME=/root

param() { aws ssm get-parameter --region "$REGION" --name "$1" --with-decryption --query Parameter.Value --output text 2>/dev/null || true; }
put_secret() { aws ssm put-parameter --region "$REGION" --name "$1" --type SecureString --value "$2" --overwrite >/dev/null; }
status() { aws ssm put-parameter --region "$REGION" --name /arion/setup-status --type String --value "$1 $(date -Is)" --overwrite >/dev/null; }

# deployment settings, for deploy/aws/update.sh
mkdir -p /etc/arion
cat > /etc/arion/deploy.env <<ENV
ARION_REGION=$REGION
ARION_BRANCH=$BRANCH
ARION_BACKUP_BUCKET=$BUCKET
ARION_NODE_GROUP=$NODE_GROUP
ENV

# ---------------------------------------------------------------- packages
apt-get update -q
apt-get install -y -q ca-certificates curl git nginx mysql-server
if ! command -v node >/dev/null || ! node --version | grep -q '^v22'; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -q nodejs
fi
command -v aws >/dev/null || snap install aws-cli --classic
command -v tailscale >/dev/null || curl -fsSL https://tailscale.com/install.sh | sh
status "packages-installed"

# ---------------------------------------------------------------- code
# the checkouts belong to the arion user and this script runs as root: let git work in them on a re-run
git config --global --get-all safe.directory | grep -qx '\*' || git config --global --add safe.directory '*'
id arion >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin arion
mkdir -p "$ROOT"
for r in $REPOS; do
    d="$ROOT/aethon-arion-$r"
    if [ -d "$d/.git" ]; then git -C "$d" fetch -q origin "$BRANCH" && git -C "$d" checkout -q -B "$BRANCH" FETCH_HEAD
    else git clone -q --depth 1 --branch "$BRANCH" "https://github.com/aethonholdings/aethon-arion-$r.git" "$d"; fi
done
status "code-cloned"

# the node code deployed with this server: processes running other code are flagged on the Monitor page
NODE_VERSION="$(git -C "$ROOT/aethon-arion-node" rev-parse --short HEAD)"

# ---------------------------------------------------------------- database
DB_PASSWORD="$(param /arion/db-password)"
if [ -z "$DB_PASSWORD" ]; then DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=')"; put_secret /arion/db-password "$DB_PASSWORD"; fi
systemctl enable --now mysql
mysql -uroot <<SQL
CREATE DATABASE IF NOT EXISTS arion;
CREATE USER IF NOT EXISTS 'arion'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER 'arion'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON arion.* TO 'arion'@'localhost';
FLUSH PRIVILEGES;
SQL

# ---------------------------------------------------------------- server
cat > "$ROOT/aethon-arion-server/env/environment.ts" <<TS
import { C1 } from "aethon-arion-c1";
import { Model } from "aethon-arion-pipeline";
import { ServerEnvironment } from "src/common/types/server.types";

// written by deploy/aws/main-setup.sh
export default () =>
    ({
        root: { name: "aws", dev: false, listen: 3000 },
        database: {
            type: "mysql",
            host: "127.0.0.1",
            port: 3306,
            username: "arion",
            password: "${DB_PASSWORD}",
            database: "arion",
            synchronize: false,
            purgeOnStart: false,
            migrationsRun: true
        },
        redis: { url: "redis://127.0.0.1:6379", ttl: 60 },
        options: {
            storeStateSpace: false,
            convergenceMargin: 0.01,
            orgConfigConvergenceMargin: 0.05,
            convergenceAbsoluteError: 0,
            minOrgConfigs: 10,
            maxOrgConfigs: 200,
            minSimRuns: 10,
            maxSimRuns: 1000,
            maxRunFailures: 3,
            randomStreamType: "random",
            simulationDays: 100,
            models: [C1 as unknown as Model]
        },
        auth: { nodes: "required", loginAttemptsPerMinute: 5 },
        fleet: { autoScalingGroup: "${NODE_GROUP}", region: "${REGION}" },
        nodes: { expectedVersion: "${NODE_VERSION}" }
    }) as ServerEnvironment;
TS
(cd "$ROOT/aethon-arion-server" && bash ci/link-siblings.sh core pipeline c1 db && npm run build)
status "server-built"

# ---------------------------------------------------------------- analyst (API on the address it is served from)
for e in environment environment.dev environment.prod environment.test; do
    cat > "$ROOT/aethon-arion-analyst/src/env/$e.ts" <<'TS'
import { Environment } from "src/app/root/types/root.types";

// an empty host name: the API is called on the address the analyst was loaded from (nginx proxies /arion)
export const environment = { debug: false, host: { protocol: "http", name: "", basePath: "arion" } } as Environment;
TS
done
(cd "$ROOT/aethon-arion-analyst" && bash ci/link-siblings.sh core pipeline c1 && npx ng build --configuration production)
rm -rf /var/www/arion && cp -r "$ROOT/aethon-arion-analyst/dist/arion/analyst" /var/www/arion
status "analyst-built"

# ---------------------------------------------------------------- node package (used here only to authorise the fleet)
(cd "$ROOT/aethon-arion-node" && bash ci/link-siblings.sh core pipeline c1 && npm run build)
chown -R arion:arion "$ROOT"
chmod 600 "$ROOT/aethon-arion-server/env/environment.ts"

cat > /etc/systemd/system/arion-server.service <<UNIT
[Unit]
Description=Arion server
After=network-online.target mysql.service
Requires=mysql.service

[Service]
User=arion
WorkingDirectory=$ROOT/aethon-arion-server
ExecStart=/usr/bin/node --max-old-space-size=2048 dist/src/main.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable arion-server
systemctl restart arion-server

cat > /etc/nginx/sites-available/arion <<'NGINX'
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 50m;
    root /var/www/arion;
    location /arion/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
    # the page itself is never cached, so browsers load the new build after an update (its scripts have hashed names)
    location = /index.html { add_header Cache-Control "no-cache"; }
    location / { try_files $uri $uri/ /index.html; add_header Cache-Control "no-cache"; }
    location ~* \.(js|css|woff2?|ico|png|svg)$ { expires 30d; }
}
NGINX
ln -sf /etc/nginx/sites-available/arion /etc/nginx/sites-enabled/arion
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

for i in $(seq 1 60); do curl -sf -o /dev/null http://127.0.0.1/arion/sim-set && break; sleep 5; done
curl -sf -o /dev/null http://127.0.0.1/arion/sim-set || { status "server-not-responding"; exit 1; }
status "server-running"

# ---------------------------------------------------------------- operator account and node fleet key
OPERATOR_PASSWORD="$(param /arion/operator-password)"
cd "$ROOT/aethon-arion-server"
if [ -z "$OPERATOR_PASSWORD" ]; then
    OPERATOR_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=')"
    echo operator | sudo -u arion env ARION_USER_PASSWORD="$OPERATOR_PASSWORD" npm run -s user:create
    put_secret /arion/operator-password "$OPERATOR_PASSWORD"
fi
if [ -z "$(param /arion/node-key)" ]; then
    echo '{"id":"aws-fleet","host":"127.0.0.1","basePath":"arion","loopInterval":2000}' > /tmp/arion-fleet.json
    printf 'http://127.0.0.1\noperator\n%s\n' "$OPERATOR_PASSWORD" |
        ARION_NODE_CREDENTIALS=/tmp/arion-fleet-credentials.json node "$ROOT/aethon-arion-node/dist/src/main.js" login /tmp/arion-fleet.json
    put_secret /arion/node-key "$(node -p 'require("/tmp/arion-fleet-credentials.json").key')"
    rm -f /tmp/arion-fleet-credentials.json /tmp/arion-fleet.json
fi
PRIVATE_IP="$(curl -s -H "X-aws-ec2-metadata-token: $(curl -s -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')" http://169.254.169.254/latest/meta-data/local-ipv4)"
aws ssm put-parameter --region "$REGION" --name /arion/server-url --type String --value "http://$PRIVATE_IP" --overwrite >/dev/null

# ---------------------------------------------------------------- nightly backup to S3 (kept 30 days by the bucket)
cat > /etc/cron.d/arion-backup <<CRON
30 2 * * * root mysqldump --single-transaction arion | gzip | aws s3 cp - s3://$BUCKET/arion-\$(date +\%F).sql.gz --region $REGION
CRON

status "ready"
echo "=== Arion main setup complete $(date -Is)"
