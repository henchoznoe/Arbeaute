import { ImageResponse } from 'next/og'
import { contact } from '@/lib/constants/contact'

export const alt = 'Arbeauté — Soins esthétiques à Bulle'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const OpengraphImage = () =>
  new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundImage:
          'linear-gradient(135deg, #fdf1ee 0%, #fdf8f3 45%, #fef6e7 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 26,
          letterSpacing: 8,
          textTransform: 'uppercase',
          color: '#c17a6f',
          fontWeight: 600,
        }}
      >
        Soins esthétiques à Bulle
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 148,
          fontWeight: 700,
          color: '#2a211c',
          marginTop: 16,
        }}
      >
        {contact.name}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 32,
          color: '#6b5d55',
          marginTop: 20,
        }}
      >
        Épilation laser · Soins du visage · Onglerie · Microblading
      </div>
    </div>,
    { ...size },
  )

export default OpengraphImage
