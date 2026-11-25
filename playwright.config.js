import { defineConfig, devices } from '@playwright/test';

const hostedURL = process.env.HANOI_BASE_URL;
const hostedIP = process.env.HANOI_HOST_IP;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: hostedURL || 'http://127.0.0.1:5173',
    ...devices['Desktop Chrome'],
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    launchOptions: hostedURL && hostedIP ? {
      args: [`--host-resolver-rules=MAP ${new URL(hostedURL).hostname} ${hostedIP}`],
    } : {},
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: hostedURL ? undefined : { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true, timeout: 30000 },
});
