module.exports = {
    apps: [
        {
            name: 'websiteCheckerBot',
            script: 'index.js',
            watch: true,
            ignore_watch: ['node_modules', 'logs'],
            instances: 1,
            autorestart: true,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
}