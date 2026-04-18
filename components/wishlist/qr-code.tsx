'use client'

import QRCode from 'qrcode'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Link2 } from 'lucide-react'

interface QRCodeProps {
  wishlistUrl: string
  className?: string
}

export function QRCodeComponent({ wishlistUrl, className }: QRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generateQR()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlistUrl])

  const generateQR = async () => {
    setLoading(true)
    setError(null)
    try {
      const dataUrl = await QRCode.toDataURL(wishlistUrl, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
      setQrDataUrl(dataUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate QR code'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(wishlistUrl)
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative">
        {loading && (
          <div className="w-full max-w-[12rem] aspect-square flex items-center justify-center bg-white/80 rounded-lg">
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        )}
        {error && (
          <div className="w-full max-w-[12rem] aspect-square flex items-center justify-center bg-red-900/20 rounded-lg border border-red-700">
            <p className="text-sm text-red-400 text-center p-2">QR-Code konnte nicht generiert werden</p>
          </div>
        )}
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="Wishlist QR Code"
            className="w-full max-w-[12rem] aspect-square rounded-lg border-2 border-blue-500"
          />
        )}
      </div>

      <div className="flex flex-col gap-2 w-full">
        <Button
          onClick={copyUrl}
          variant="secondary"
          className="w-full justify-center"
        >
          <Link2 className="h-4 w-4 mr-2" />
          Copy Link
        </Button>
        <Button
          onClick={() => window.open(wishlistUrl, '_blank')}
          variant="outline"
          className="w-full justify-center"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Open Wishlist
        </Button>
      </div>

      <p className="text-xs text-center text-gray-400">
        Scan the QR code or share the link to view this wishlist
      </p>
    </div>
  )
}