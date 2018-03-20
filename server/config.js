module.exports = {
    AUTH0_DOMAIN: 'thinking-system.auth0.com',
    AUTH0_API_AUDIENCE: 'http://localhost:8083/api',
    MONGO_URI: process.env.MONGO_URI || 'mongodb://horse:horse456@ds012578.mlab.com:12578/thinking_system',
    NAMESPACE: 'http://myapp.com/roles',
}