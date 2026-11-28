# Arion on AWS

A small, home-scale deployment: one main instance and a Spot node fleet that runs only while experiments run.

| Part | What it is |
|---|---|
| Main instance `arion-main` | t4g.medium, Ubuntu 24.04: MySQL 8, the server (systemd `arion-server`), the analyst behind nginx, Tailscale, nightly backups to S3 |
| Node fleet `arion-nodes` | Auto Scaling group of Spot Graviton instances (c7g/c6g/m7g/m6g.xlarge), 0 to 8, one node process per vCPU under pm2 |
| Network | Own VPC; no inbound internet access except SSH from EC2 Instance Connect. Nodes reach the server on its private address |
| Secrets | SSM Parameter Store: `/arion/db-password`, `/arion/operator-password`, `/arion/node-key`, `/arion/server-url` |

Files: `template.yaml` (CloudFormation), `main-setup.sh` (main instance), `node-setup.sh` (each node), `update.sh` (updates).

## Set up

1. Create the stack (region of your choice; the instances clone the branch given as `Branch`):

   ```
   aws cloudformation create-stack --stack-name arion --region eu-west-2 \
       --template-body file://template.yaml --capabilities CAPABILITY_IAM
   ```

   `InstanceConnectPrefixList` defaults to eu-west-2's EC2 Instance Connect prefix list; in another region pass
   that region's `com.amazonaws.<region>.ec2-instance-connect` list. `SshCidr` optionally allows SSH from one address.

2. Wait for setup to finish (about 10 minutes): `aws ssm get-parameter --name /arion/setup-status` reads `ready`.
   The log is `/var/log/arion-setup.log` on the main instance. Setup creates the database, an operator account
   (`operator`, password in `/arion/operator-password`) and the node fleet's key.

3. Connect the analyst through Tailscale (once). In the EC2 console select `arion-main`, then Connect, EC2 Instance
   Connect (user `ubuntu`), and run:

   ```
   sudo tailscale up --hostname arion      # open the printed link and sign in
   sudo tailscale serve --bg 80
   ```

   The analyst is then at `https://arion.<your-tailnet>.ts.net` from any device on your tailnet.

## Run experiments

1. Create a SimSet (optimisation) or a control experiment (from an org config) in the analyst.
2. Start nodes from the analyst's **Monitor** page (Node fleet: set the size), or
   `aws autoscaling set-desired-capacity --auto-scaling-group-name arion-nodes --desired-capacity 4`.
   A node takes about 5 minutes to build before it takes work.
3. Set the fleet back to 0 when the work is done (Monitor page: Stop all). Spot instances can be reclaimed at any
   time; their unfinished runs are handed out again.

## Update to the latest code

On the main instance (EC2 Instance Connect or Session Manager):

```
sudo bash /opt/arion-deploy/deploy/aws/update.sh            # the deployed branch
sudo bash /opt/arion-deploy/deploy/aws/update.sh main       # or another branch
```

It rebuilds the server, analyst and node, applies new database migrations when the server starts, and restarts the
server; data, passwords and keys are kept. Nodes started afterwards build the new code; running nodes keep theirs
until they are replaced (scale to 0 and back).

Changes to `template.yaml` itself (permissions, instance types) are applied with a CloudFormation stack update.

## Costs (approximate, London)

| Item | Cost |
|---|---|
| Main instance running all month (with disk and public IPv4) | about $30 |
| Main instance stopped | a few dollars a month (disk, snapshots) |
| Node, Spot xlarge (4 vCPU) | about $0.05 to $0.08 per hour |

Stop the main instance from the EC2 console when you do not need it; Tailscale and the analyst return when it starts.

## Remove

1. Empty the backup bucket (stack output `BackupBucket`); a non-empty bucket stops the stack deletion.
2. `aws cloudformation delete-stack --stack-name arion`
3. Delete the `/arion/*` parameters in Parameter Store (the instances created them, not the stack).
