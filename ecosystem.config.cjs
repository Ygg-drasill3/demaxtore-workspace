/** PM2 production — cluster mode for zero-downtime reloads. */
module.exports = {
  apps: [
    {
      name: "demaxtore-backend",
      cwd: "/var/www/demaxtore/DemaxtoreSolitions-main",
      script: "yarn",
      args: "workspace @dmx/backend exec tsx src/server.ts",
      interpreter: "none",
      instances: process.env.PM2_INSTANCES || 2,
      exec_mode: "cluster",
      wait_ready: false,
      listen_timeout: 10_000,
      kill_timeout: 8_000,
      env: {
        NODE_ENV: "production",
        SOCKET_ADAPTER: process.env.SOCKET_ADAPTER || "memory",
      },
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 3_000,
    },
  ],
};
