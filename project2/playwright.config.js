import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests',
    timeout: 30000,
    retries: 0,
    use: {
        baseURL: 'http://localhost:1919',
        headless: true,
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
    webServer: {
        command: 'TOKEN_RATE_LIMIT_PER_MINUTE=1000 API_RATE_LIMIT_PER_MINUTE=1000 npm start',
        url: 'http://localhost:1919',
        reuseExistingServer: !process.env.CI,
        timeout: 15000,
    },
});
