"use client"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { StarsBackground } from "@/components/ui/stars-background"
import { Button } from "@/components/ui/button"
import { LayoutTextFlip } from "@/components/ui/layout-text-flip"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="relative isolate min-h-dvh bg-background overflow-hidden">
      {/* Background layers */}
      <StarsBackground className="pointer-events-none z-0" />
      <ShootingStars
        className="pointer-events-none z-0"
        starColor={"var(--primary-foreground)"}
        trailColor={"var(--ring)"}
      />

      <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6">
        <section className="mx-auto max-w-3xl text-center space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <LayoutTextFlip text="Welcome to" words={["HackElite", "Modern UI", "Fast Builds", "Beautiful Apps"]} />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">Build better, faster.</h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Experience thoughtfully crafted components and motion that bring your ideas to life. Designed with
            accessibility, performance, and your brand in mind.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link href="/userinfo" passHref>
              <Button size="lg">Get Started</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
