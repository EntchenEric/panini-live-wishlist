import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'panini.entcheneric.com'

export default async function QRPage({
  params,
}: {
  params: Promise<{ wishEnding: string }>
}) {
  const { wishEnding } = await params

  const account = await prisma.accountData.findUnique({
    where: { urlEnding: wishEnding },
    select: { urlEnding: true },
  })

  if (!account) {
    return new Response(JSON.stringify({ message: 'Wishlist not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const wishlistUrl = `https://${APP_DOMAIN}/${wishEnding}`

  try {
    const qrCodeBuffer = await QRCode.toBuffer(wishlistUrl, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: 'M',
    })

    return new Response(qrCodeBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return new Response(JSON.stringify({ message: 'Failed to generate QR code' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}