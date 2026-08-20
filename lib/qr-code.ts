export function buildQrCodeSrc(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(data)}`
}
