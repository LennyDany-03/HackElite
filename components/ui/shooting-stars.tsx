"use client"
import React, { useRef, useState } from "react"
import { cn } from "@/lib/utils"

export const ShootingStars = ({
  minSpeed = 10,
  maxSpeed = 30,
  minDelay = 1200,
  maxDelay = 4200,
  starColor = "#9E00FF",
  trailColor = "#2EB9DF",
  starWidth = 10,
  starHeight = 1,
  className,
}: {
  minSpeed?: number
  maxSpeed?: number
  minDelay?: number
  maxDelay?: number
  starColor?: string
  trailColor?: string
  starWidth?: number
  starHeight?: number
  className?: string
}) => {
  const [star, setStar] = useState<React.CSSProperties[]>([])
  const svgRef = useRef<SVGSVGElement>(null)

  React.useEffect(() => {
    const createStar = () => {
      const yPos = Math.random() * 100
      const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed
      const delay = Math.random() * (maxDelay - minDelay) + minDelay

      const newStar: React.CSSProperties = {
        left: "-10%",
        top: `${yPos}%`,
        width: `${starWidth}px`,
        height: `${starHeight}px`,
        animation: `shooting ${speed}s linear ${delay}ms`,
        position: "absolute",
      }

      setStar((prevStars) => [...prevStars.slice(-20), newStar])

      setTimeout(createStar, delay)
    }

    createStar()

    return () => {}
  }, [minSpeed, maxSpeed, minDelay, maxDelay, starWidth, starHeight])

  return (
    <svg ref={svgRef} className={cn("absolute inset-0 h-full w-full", className)}>
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: trailColor, stopOpacity: 0 }} />
          <stop offset="100%" style={{ stopColor: starColor, stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {star.map((style, index) => (
        <rect key={index} style={style} fill="url(#gradient)" rx={starHeight / 2} />
      ))}
      <style>
        {`
          @keyframes shooting {
            0% {
              transform: translateX(0) translateY(0);
              opacity: 1;
            }
            70% {
              opacity: 1;
            }
            100% {
              transform: translateX(300px) translateY(-300px);
              opacity: 0;
            }
          }
        `}
      </style>
    </svg>
  )
}
