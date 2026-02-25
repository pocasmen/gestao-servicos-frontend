import pino from 'pino';

const isDevelopment = import.meta.env.MODE === 'development';

export const logger = pino({
    level: isDevelopment ? 'debug' : 'info',
    browser: {
        asObject: true
    }
});

export default logger;
