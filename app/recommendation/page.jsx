"use client"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { StarsBackground } from "@/components/ui/stars-background"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Film, Brain, Lock, Shield } from "lucide-react"
import Link from "next/link"

export default function RecommendationPage() {
  return (
    <div className="relative isolate min-h-dvh bg-background overflow-hidden">
      {/* Background layers */}
      <StarsBackground className="pointer-events-none z-0" />
      <ShootingStars
        className="pointer-events-none z-0"
        starColor={"var(--primary-foreground)"}
        trailColor={"var(--ring)"}
      />

      <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 py-12">
        <section className="mx-auto max-w-6xl w-full space-y-10">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-card/50 backdrop-blur-sm">
              <Lock className="size-4 text-primary" />
              <span className="text-sm font-medium">Privacy-Focused AI</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
              Choose Your Federated Learning Experience
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Pick how you'd like to experience our privacy-preserving AI. Your data stays encrypted and secure.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Movie Recommendation Card */}
            <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:scale-[1.02] border-2 hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <CardHeader className="space-y-4 pb-4">
                <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Film className="size-7 text-primary" />
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-2xl lg:text-3xl">Movie Recommendation AI</CardTitle>
                  <CardDescription className="text-base">
                    Experience AI-powered movie recommendations tailored to your taste — without sharing your data.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Shield className="size-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Your Data, Your Choice</p>
                      <p className="text-sm text-muted-foreground">All processing happens locally on your device</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Film className="size-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Personalized Suggestions</p>
                      <p className="text-sm text-muted-foreground">Get recommendations based on your preferences</p>
                    </div>
                  </div>
                </div>

                <Link href="/movie-recommendation" className="block">
                  <Button size="lg" className="w-full">
                    Explore Movies
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Emotional Status Detection Card */}
            <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:scale-[1.02] border-2 hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <CardHeader className="space-y-4 pb-4">
                <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Brain className="size-7 text-primary" />
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-2xl lg:text-3xl">Emotional Status Detection AI</CardTitle>
                  <CardDescription className="text-base">
                    Understand your emotional patterns with AI that respects your privacy completely.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Shield className="size-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Private & Secure</p>
                      <p className="text-sm text-muted-foreground">
                        Your emotions are analyzed without data collection
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Brain className="size-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Real-Time Insights</p>
                      <p className="text-sm text-muted-foreground">Get immediate feedback on emotional states</p>
                    </div>
                  </div>
                </div>

                <Link href="/emotion-detection" className="block">
                  <Button size="lg" className="w-full">
                    Try Emotion Detection
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Both features use federated learning to ensure your data never leaves your device. Experience the future
              of privacy-preserving artificial intelligence.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
