import { defineConfig } from 'wxt';

export default defineConfig({
    srcDir: 'src',
    modules: ['@wxt-dev/module-react'],
    manifest: {
        name: 'TestCraft - AI Testing Companion',
        description: 'Pick elements, scan pages, generate tests, audit accessibility — from a side panel that stays with you.',
        key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmbMWPcJzzeLFiXs49WfbB+M8FDaXgVbecubF8xKGQB19USXuslAnCb4sGMB5WWRrq/UNhTk1qoc3lsvKdKrbIYG2XtSnHI/NDQybJaviUZXXBsOPSTxn52AIFwDMvxQPWG26WS4UlDmiDQLdSVKuTDauqSWtLrAJuvUlShKD4sdJQ+lxXox6tmkFg3sqhg67puVJJLeRDTiYthvloBalOH0Lb0z2ZFkrD/t1btzGLdrcj+nKsme1LkOma99zNXz3UKOt+kXXu4jZhkmdNMFiSuW1G0SVNv5GJYsZtKURXacnyyUSSbeiE2knpUve/M+URr4Q8mYQhlQTT5iCsnaHIQIDAQAB',
        permissions: ['activeTab', 'storage', 'sidePanel', 'tabs', 'scripting', 'identity'],
        host_permissions: ['<all_urls>'],
        icons: {
            16: 'icon/16.png',
            48: 'icon/48.png',
            128: 'icon/128.png',
        },
    },
});
