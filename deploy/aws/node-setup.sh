#!/usr/bin/env bash
# Sets up an Arion calculation node (Ubuntu 24.04, Auto Scaling Group instance): builds the node, reads the fleet's
# server address and key from SSM Parameter Store, and runs one node process per vCPU under pm2.
# Run as root by the launch template's user data. Environment: ARION_REGION, ARION_BRANCH
set -euo pipefail
exec > >(tee -a /var/log/arion-setup.log) 2>&1
echo "=== Arion node setup $(date -Is)"

REGION="${ARION_REGION:?}"
BRANCH="${ARION_BRANCH:-main}"
ROOT=/opt/arion
export DEBIAN_FRONTEND=noninteractive HOME=/root

apt-get update -q
apt-get install -y -q ca-certificates curl git
if ! command -v node >/dev/null || ! node --version | grep -q '^v22'; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -q nodejs
fi
command -v aws >/dev/null || snap install aws-cli --classic
command -v pm2 >/dev/null || npm install -g pm2@5 --no-audit --no-fund

id arion >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash arion
mkdir -p "$ROOT"
for r in core pipeline c1 node; do
    d="$ROOT/aethon-arion-$r"
    [ -d "$d/.git" ] || git clone -q --depth 1 --branch "$BRANCH" "https://github.com/aethonholdings/aethon-arion-$r.git" "$d"
done
(cd "$ROOT/aethon-arion-node" && bash ci/link-siblings.sh core pipeline c1 && npm run build)

# the main instance publishes the key once its server is running: wait for it (up to an hour)
param() { aws ssm get-parameter --region "$REGION" --name "$1" --with-decryption --query Parameter.Value --output text 2>/dev/null || true; }
for i in $(seq 1 120); do
    KEY="$(param /arion/node-key)"; URL="$(param /arion/server-url)"
    [ -n "$KEY" ] && [ -n "$URL" ] && break
    echo "waiting for /arion/node-key and /arion/server-url"; sleep 30
done
[ -n "$KEY" ] && [ -n "$URL" ] || { echo "no fleet key or server address in Parameter Store"; exit 1; }

# this instance's id: part of every node process's id, so that the Monitor shows which instance a process runs on
TOKEN="$(curl -s -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 300')"
INSTANCE_ID="$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)"

cat > "$ROOT/aethon-arion-node/config/arion.config.node.json" <<JSON
{ "id": "aws-fleet", "host": "unused", "basePath": "arion", "loopInterval": 2000, "verbose": false, "saveStateSpace": false }
JSON
cat > "$ROOT/ecosystem.config.js" <<JS
module.exports = { apps: [{
    name: "arion-node",
    script: "$ROOT/aethon-arion-node/dist/src/main.js",
    instances: "max",
    exec_mode: "fork",
    env: { ARION_SERVER_URL: "$URL", ARION_NODE_KEY: "$KEY", ARION_NODE_INSTANCE: "$INSTANCE_ID" },
    max_restarts: 50,
    restart_delay: 10000
}] };
JS
chmod 600 "$ROOT/ecosystem.config.js"
chown -R arion:arion "$ROOT"

sudo -u arion -H pm2 start "$ROOT/ecosystem.config.js"
sudo -u arion -H pm2 save
env PATH="$PATH" pm2 startup systemd -u arion --hp /home/arion

# mark the instance ready, so that the analyst's Monitor page shows it as running rather than building
aws ec2 create-tags --region "$REGION" --resources "$INSTANCE_ID" --tags Key=arion:node-ready,Value=true ||
    echo "could not tag the instance ready (the Monitor page will show it as building)"
echo "=== Arion node setup complete $(date -Is): $(nproc) node processes"
