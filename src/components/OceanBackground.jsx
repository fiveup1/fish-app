import { useEffect, useRef } from 'react'

export default function OceanBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId, t = 0



    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function draw() {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      // Deep quality-blue gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height)
      grad.addColorStop(0,   '#08142e')
      grad.addColorStop(0.4, '#0d1f45')
      grad.addColorStop(0.8, '#142a5a')
      grad.addColorStop(1,   '#0d1f45')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)

      // Soft radial ambient light top-right
      const amb = ctx.createRadialGradient(width * 0.75, height * 0.1, 0, width * 0.75, height * 0.1, width * 0.55)
      amb.addColorStop(0,   'rgba(74, 114, 196, 0.10)')
      amb.addColorStop(0.5, 'rgba(74, 114, 196, 0.04)')
      amb.addColorStop(1,   'rgba(74, 114, 196, 0)')
      ctx.fillStyle = amb
      ctx.fillRect(0, 0, width, height)

      // Subtle wave lines
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(168, 192, 232, ${0.035 - i * 0.007})`
        ctx.lineWidth = 1
        for (let x = 0; x <= width; x += 3) {
          const y = height * (0.25 + i * 0.18) + Math.sin((x / width) * Math.PI * 5 + t + i * 1.2) * 6
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      t += 0.004
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none',
      }}
    />
  )
}
