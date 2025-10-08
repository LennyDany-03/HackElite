"use client"
import { useEffect, useMemo, useState } from "react"
import { StarsBackground } from "@/components/ui/stars-background"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { MultiStepLoader } from "@/components/ui/multi-step-loader"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import MovieCardHorizontal from "@/components/ui/movie-card-horizontal"

export default function MoviesPage() {
  // State for the 3 short questions
  const questions = useMemo(
    () => [
      {
        id: "mood",
        label: "What's your current mood?",
        options: ["Chill", "Adventurous", "Thoughtful", "Uplifted"],
      },
      {
        id: "pace",
        label: "Preferred pace?",
        options: ["Slow burn", "Balanced", "Fast-paced"],
      },
      {
        id: "vibe",
        label: "Tonight’s vibe?",
        options: ["Classic", "Modern", "Indie", "Blockbuster"],
      },
    ],
    [],
  )
  const [answers, setAnswers] = useState({})
  const [stage, setStage] = useState("questions") // "questions" | "select" | "results"
  const [qIndex, setQIndex] = useState(0)
  const currentQuestion = questions[qIndex]
  const canNextQuestion = Boolean(currentQuestion && answers[currentQuestion.id])
  const answeredCount = useMemo(() => Object.values(answers).filter(Boolean).length, [answers])
  const questionProgress = Math.round((answeredCount / questions.length) * 100)
  const allAnswered = useMemo(() => questions.every((q) => Boolean(answers[q.id])), [answers, questions])

  // Sample movies and selection state (8–16 required)
  const allMovies = useMemo(
    () =>
      [
        "Inception",
        "Interstellar",
        "The Dark Knight",
        "Parasite",
        "Whiplash",
        "La La Land",
        "Mad Max: Fury Road",
        "Her",
        "The Social Network",
        "Arrival",
        "The Matrix",
        "Spirited Away",
        "The Godfather",
        "The Shawshank Redemption",
        "Fight Club",
        "The Grand Budapest Hotel",
        "Dune",
        "Blade Runner 2049",
        "Everything Everywhere All at Once",
        "Oppenheimer",
      ].map((title) => ({
        id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title,
        imageUrl: `/placeholder.svg?height=360&width=640&query=${encodeURIComponent(`horizontal movie poster ${title}`)}`,
      })),
    [],
  )
  const [selected, setSelected] = useState(() => new Set())
  const minSelect = 8
  const maxSelect = 16
  const count = selected.size
  const selectionValid = count >= minSelect && count <= maxSelect

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < maxSelect) next.add(id)
      return next
    })
  }

  // Processing state: inline encrypting progress + multi-step loader
  const [processing, setProcessing] = useState(false)
  const [inlineProgress, setInlineProgress] = useState(0)
  const [done, setDone] = useState(false)

  const canStart = stage === "select" && selectionValid && !processing

  useEffect(() => {
    if (!processing) return
    setInlineProgress(0)
    let p = 0
    const t = setInterval(() => {
      p = Math.min(100, p + Math.floor(Math.random() * 12) + 6)
      setInlineProgress(p)
      if (p >= 100) clearInterval(t)
    }, 350)
    return () => clearInterval(t)
  }, [processing])

  const steps = useMemo(
    () => [
      { text: "Encrypting your preferences…" },
      { text: "Training your private model…" },
      { text: "Generating recommendations…" },
      { text: "Finalizing…" },
    ],
    [],
  )

  // Simple recommendation list (derive from selections)
  const recommended = useMemo(() => {
    if (!done) return []
    // prioritize selected first, then fill from remaining
    const selectedMovies = allMovies.filter((m) => selected.has(m.id))
    const remaining = allMovies.filter((m) => !selected.has(m.id))
    return [...selectedMovies.slice(0, 8), ...remaining.slice(0, 8)].slice(0, 12)
  }, [done, allMovies, selected])

  return (
    <div className="relative isolate min-h-dvh bg-background overflow-hidden">
      {/* Background layers - match Home theme */}
      <StarsBackground className="pointer-events-none z-0" />
      <ShootingStars
        className="pointer-events-none z-0"
        starColor={"var(--primary-foreground)"}
        trailColor={"var(--ring)"}
      />

      <main className="relative z-10 flex min-h-dvh flex-col items-center justify-start px-6 py-10">
        <section className="mx-auto w-full max-w-7xl">
          {/* Heading */}
          <header className="text-center space-y-6">
            {/* Main heading */}
            <h1 className="text-5xl md:text-5xl font-extrabold tracking-tight text-balance">
              Your Taste. Your Mood. Encrypted. Personalized.
            </h1>
            {/* Subheading/question */}
            <p className="text-3xl md:text-4xl text-muted-foreground leading-relaxed text-pretty">
              Select your favorite films or let us detect your emotion — we train AI without seeing your raw data.
            </p>
          </header>

          {/* Benefits */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <span className="mt-0.5 text-primary">
                <Lock size={20} aria-hidden />
              </span>
              <p className="text-sm text-pretty">
                <span className="font-medium">Encrypted on your device</span> — raw data is never uploaded.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <span className="mt-0.5 text-primary">{/* <Film size={20} aria-hidden /> */}</span>
              <p className="text-sm text-pretty">
                <span className="font-medium">Personalized movie suggestions</span> from your tastes.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <span className="mt-0.5 text-primary">{/* <Smile size={20} aria-hidden /> */}</span>
              <p className="text-sm text-pretty">
                <span className="font-medium">Emotion detection</span> with your privacy in mind.
              </p>
            </div>
          </div>

          {/* Questions: now one-by-one with step progress */}
          {stage === "questions" && (
            <div className="mt-12">
              <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-background/50 shadow-lg ring-1 ring-border/50 p-8 md:p-10 backdrop-blur supports-[backdrop-filter]:backdrop-blur-lg">
                <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Step {qIndex + 1} of {questions.length}
                  </span>
                  <span>{questionProgress}%</span>
                </div>
                <Progress value={questionProgress} className="h-2" />

                <fieldset key={currentQuestion.id} className="mt-6">
                  <legend className="mb-4 px-1 text-2xl md:text-3xl font-semibold text-foreground">
                    {currentQuestion.label}
                  </legend>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {currentQuestion.options.map((opt) => {
                      const active = answers[currentQuestion.id] === opt
                      return (
                        <button
                          key={opt}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setAnswers((a) => ({ ...a, [currentQuestion.id]: opt }))}
                          className={cn(
                            "rounded-full border px-5 py-2.5 text-base md:text-lg transition-colors ring-1",
                            active
                              ? "bg-primary text-primary-foreground border-primary ring-primary"
                              : "bg-background/60 text-foreground/90 border-border/60 ring-border/60 hover:bg-background/80",
                          )}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>

                <div className="mt-6 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setQIndex((i) => Math.max(0, i - 1))}
                    disabled={qIndex === 0}
                  >
                    Back
                  </Button>
                  {qIndex < questions.length - 1 ? (
                    <Button
                      onClick={() => canNextQuestion && setQIndex((i) => Math.min(questions.length - 1, i + 1))}
                      disabled={!canNextQuestion}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button onClick={() => setStage("select")} disabled={!canNextQuestion}>
                      Continue to picks
                    </Button>
                  )}
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  Answer all 3 questions to continue. You’ll then pick {minSelect}–{maxSelect} movies you love.
                </p>
              </div>
            </div>
          )}

          {/* Movie selection grid only after questions are done */}
          {stage === "select" && !done && (
            <div className="mt-10">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-4xl md:text-5xl font-semibold">Pick your favorites</h2>
                <div
                  className={cn("text-xl md:text-2xl", selectionValid ? "text-muted-foreground" : "text-destructive")}
                >
                  Selected: {count} / {maxSelect}
                </div>
              </div>

              {/* 4-column grid on XL; scales down gracefully */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allMovies.map((m) => (
                  <li key={m.id}>
                    <MovieCardHorizontal movie={m} selected={selected.has(m.id)} onToggle={toggleSelect} />
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col items-center gap-4">
                <Button
                  size="lg"
                  onClick={() => {
                    if (!canStart) return
                    setDone(false)
                    setProcessing(true)
                  }}
                  disabled={!canStart}
                >
                  {processing ? "Processing…" : "Start Processing"}
                </Button>

                {!processing && !done && (
                  <p className="text-sm md:text-base text-muted-foreground">
                    Select {minSelect}–{maxSelect} movies to begin.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Inline encrypting progress visible during processing */}
          {processing && !done && (
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="w-full max-w-2xl rounded-xl border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Lock size={20} className="text-primary" />
                  <span className="text-base md:text-lg font-medium">Encrypting your preferences…</span>
                </div>
                <Progress value={inlineProgress} className="w-full" />
                <div className="mt-1 text-right text-xs text-muted-foreground" aria-live="polite">
                  {inlineProgress}% complete
                </div>
              </div>
            </div>
          )}

          {/* Done + recommendations appear after processing */}
          {done && (
            <div className="mt-10">
              <div className="w-full max-w-2xl rounded-xl border p-4 mb-6">
                <p className="text-sm font-medium">Done!</p>
                <p className="text-xs text-muted-foreground">Here are recommendations based on your tastes.</p>
              </div>

              <h3 className="text-2xl md:text-3xl font-semibold mb-5">Recommended for you</h3>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {recommended.map((m) => (
                  <li key={`rec-${m.id}`} className="rounded-xl border overflow-hidden">
                    <MovieCardHorizontal movie={m} selected={false} onToggle={() => {}} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      <MultiStepLoader
        loading={processing && !done}
        loadingStates={steps}
        duration={900}
        onComplete={() => {
          setProcessing(false)
          setDone(true)
          setStage("results") // move to results stage after loader completes
        }}
      />
    </div>
  )
}
