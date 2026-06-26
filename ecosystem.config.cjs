/** PM2 production — compiled dist/server.js entrypoint (no tsx in prod). */
//
// Deploy: yarn workspace @dmx/backend build && pm2 startOrReload ecosystem.config.cjs
// Env: apps/backend/.env (load via dotenv in server bootstrap)
module.exports = {
  apps: [
    {
      name: "demaxtore-backend",
      cwd: "/var/www/demaxtore/DemaxtoreSolitions-main/apps/backend",
      script: "dist/server.js",
      interpreter: "node",
      instances: Number(process.env.PM2_INSTANCES) || 1,
      exec_mode: Number(process.env.PM2_INSTANCES) > 1 ? "cluster" : "fork",
      autorestart: true,
      watch: false,
      wait_ready: false,
      listen_timeout: 10_000,
      kill_timeout: 8_000,
      max_memory_restart: "768M",
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 3_000,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      error_file: "/var/log/demaxtore/backend-error.log",
      out_file: "/var/log/demaxtore/backend-out.log",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        SOCKET_ADAPTER: process.env.SOCKET_ADAPTER || "redis",
        REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379",
      },
    },
  ],
};
