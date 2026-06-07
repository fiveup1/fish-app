import { useEffect, useRef } from 'react'

export default function OceanBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let animId
    let t = 0

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.0003 + 0.0001,
      opacity: Math.random() * 0.4 + 0.1,
      drift: (Math.random() - 0.5) * 0.0002,
    }))

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function draw() {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      // Deep ocean gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height)
      grad.addColorStop(0, '#020d18')
      grad.addColorStop(0.5, '#041428')
      grad.addColorStop(1, '#010810')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)

      // Bioluminescent particles (bubbles)
      particles.forEach(p => {
        p.y -= p.speed
        p.x += Math.sin(t * 2 + p.y * 10) * p.drift
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random() }

        const px = p.x * width
        const py = p.y * height

        const g = ctx.createRadialGradient(px, py, 0, px, py, p.r * 4)
        g.addColorStop(0, `rgba(0, 229, 255, ${p.opacity})`)
        g.addColorStop(1, 'rgba(0, 229, 255, 0)')
        ctx.beginPath()
        ctx.arc(px, py, p.r * 4, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()
      })

      // Subtle wave lines
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.03 - i * 0.008})`
        ctx.lineWidth = 1
        for (let x = 0; x <= width; x += 2) {
          const y = height * (0.3 + i * 0.2) + Math.sin((x / width) * Math.PI * 4 + t + i) * 8
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      t += 0.005
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
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
