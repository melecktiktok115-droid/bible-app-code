import type { CapacitorConfig } from '@capacitor/cli'
// Initial hosted-web wrapper. The SSR app has no standalone index.html in dist/client.
// This is NOT a bundled offline Android release. See docs/ANDROID.md.
const config: CapacitorConfig = {
  appId: 'com.meleck.biblechretiennemoderne',
  appName: 'Bible Chrétienne Moderne — par Meleck',
  webDir: 'dist/client',
  server: { url: 'https://bible-app-code.netlify.app', cleartext: false },
  android: { backgroundColor: '#071426', allowMixedContent: false },
  backgroundColor: '#071426',
}
export default config
