import { NextResponse } from 'next/server'

export async function GET() {
  const assetlinks = [{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "sbs.zenova.twa",
      "sha256_cert_fingerprints": ["CB:1D:C4:F1:B2:42:6A:B2:56:57:BC:D8:2E:75:FD:A6:38:DE:97:AD:20:D2:4B:AD:A2:D8:CC:02:57:DB:08:9A"]
    }
  }]

  return NextResponse.json(assetlinks, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    },
  })
}

