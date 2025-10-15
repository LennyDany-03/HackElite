"use client"
import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

export const StarsBackground = ({
  starDensity = 0.00015,
  allStarsTwinkle = true,
  twinkleProbability = 0.7,
  minTwinkleSpeed = 0.5,
  maxTwinkleSpeed = 1,
  className,
}: {
  starDensity?: number
  allStarsTwinkle?: boolean
  twinkleProbability?: number
  minTwinkleSpeed?: number
  maxTwinkleSpeed?: number
  className?: string
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()

    const stars: {
      x: number
      y: number
      radius: number
      opacity: number
      twinkleSpeed: number | null
    }[] = []

    const createStars = () => {
      const starCount = Math.floor(canvas.width * canvas.height * starDensity)
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5,
          opacity: Math.random(),
          twinkleSpeed:
            allStarsTwinkle || Math.random() < twinkleProbability
              ? minTwinkleSpeed + Math.random() * (maxTwinkleSpeed - minTwinkleSpeed)
              : null,
        })
      }
    }

    createStars()

    const drawStars = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach((star) => {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.fill()

        if (star.twinkleSpeed !== null) {
          star.opacity += star.twinkleSpeed * 0.01
          if (star.opacity > 1 || star.opacity < 0) {
            star.twinkleSpeed *= -1
          }
          star.opacity = Math.max(0, Math.min(1, star.opacity))
        }
      })
    }

    const animate = () => {
      drawStars()
      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      resizeCanvas()
      stars.length = 0
      createStars()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [starDensity, allStarsTwinkle, twinkleProbability, minTwinkleSpeed, maxTwinkleSpeed])

  return <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full", className)} />
}
