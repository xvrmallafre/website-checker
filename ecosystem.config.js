module.exports = {
    apps: [
        {
            name: 'websiteCheckerBot',
            mode: 'fork',
            script: 'index.js',
            watch: true,
            ignore_watch: ['node_modules', 'logs'],
            autorestart: true,
            max_restarts: 5,
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
}