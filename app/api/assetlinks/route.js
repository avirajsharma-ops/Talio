import { NextResponse } from 'next/server'

export async function GET() {
  const assetlinks = [{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "sbs.zenova.twa",
      "sha256_cert_fingerprints": ["D7:6D:0B:B9:9B:B9:6A:8C:15:F0:EE:9A:E3:F8:21:65:20:4C:CB:91:F3:80:E4:0D:C4:FC:6C:BF:24:32:3D:E1"]
    }
  }]

  return NextResponse.json(assetlinks, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

