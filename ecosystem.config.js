// PM2 — jalankan dari folder proyek ini:  pm2 start ecosystem.config.js
module.exports = {
  apps: [{
    name: "ard-net",
    script: "app-customer.js",
    cwd: __dirname,
    // Jalankan sebagai user non-root bila perlu (sesuaikan uid/gid server Anda):
    // uid: 988,
    // gid: 988,
    node_args: "--max-old-space-size=512",
    env: { NODE_ENV: "production" },
    autorestart: true,
    max_restarts: 30,
    restart_delay: 5000,
    time: true
  }]
};
