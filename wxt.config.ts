import { defineConfig } from 'wxt';

export default defineConfig({
    srcDir: 'src',
    modules: ['@wxt-dev/module-react'],
    manifest: {
        name: 'TestCraft - AI Testing Companion',
        description: 'Pick elements, scan pages, generate tests, audit accessibility — from a side panel that stays with you.',
        permissions: ['activeTab', 'storage', 'sidePanel', 'tabs', 'scripting'],
        host_permissions: ['<all_urls>'],
        icons: {
            16: 'icon/16.png',
            48: 'icon/48.png',
            128: 'icon/128.png',
        },
    },
});
