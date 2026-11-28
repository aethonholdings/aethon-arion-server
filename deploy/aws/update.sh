#!/usr/bin/env bash
# Updates the Arion main instance to the latest code of its branch: pulls the deployment scripts, then re-runs
# main-setup.sh, which fetches every repository, rebuilds the server, analyst and node, applies pending database
# migrations (on server start) and restarts the server. The database, passwords and the node fleet's key are kept.
#
# Run on the main instance: sudo bash /opt/arion-deploy/deploy/aws/update.sh [branch]
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "run as root (sudo)"; exit 1; }

# deployment settings: written by main-setup.sh, else (instances set up before it wrote them) from the user data
if [ -f /etc/arion/deploy.env ]; then
    set -a; . /etc/arion/deploy.env; set +a
else
    eval "$(grep '^export ARION_' /var/lib/cloud/instance/user-data.txt)"
fi
export ARION_BRANCH="${1:-$ARION_BRANCH}"

git -C /opt/arion-deploy fetch -q origin "$ARION_BRANCH"
git -C /opt/arion-deploy checkout -q -B "$ARION_BRANCH" FETCH_HEAD
echo "Updating to $(git -C /opt/arion-deploy log --oneline -1)"
exec bash /opt/arion-deploy/deploy/aws/main-setup.sh
