"use client"
import { cn } from "@/lib/utils"

type Movie = {
  id: string | number
  title: string
  imageUrl?: string
}

export default function MovieCardHorizontal({
  movie,
  selected,
  onToggle,
  className,
}: {
  movie: Movie
  selected: boolean
  onToggle: (id: string | number) => void
  className?: string
}) {
  const src =
    movie.imageUrl ||
    `/placeholder.svg?height=360&width=640&query=horizontal movie poster for ${encodeURIComponent(movie.title)}`

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={selected ? `Deselect ${movie.title}` : `Select ${movie.title}`}
      onClick={() => onToggle(movie.id)}
      className={cn(
        "group relative block w-full aspect-video overflow-hidden rounded-[calc(var(--radius)+6px)]",
        "ring-1 ring-border bg-background/40 backdrop-blur-md",
        "transition-transform hover:-translate-y-0.5 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "shadow-[0_14px_40px_-12px_var(--shadow-strong,rgba(0,0,0,0.55))]",
        className,
      )}
    >
      {/* Poster image */}
      <img
        src={src || "/placeholder.svg"}
        alt={`${movie.title} poster`}
        className="absolute inset-0 h-full w-full object-cover [image-rendering:optimizeQuality]"
        crossOrigin="anonymous"
      />

      {/* Gradient overlay for legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent opacity-100 transition-opacity" />

      {/* Title chip */}
      <div className="pointer-events-none absolute left-4 bottom-4">
        <span className="rounded-md bg-background/70 px-4 py-2 text-lg md:text-2xl font-semibold text-foreground/90 backdrop-blur">
          {movie.title}
        </span>
      </div>

      {/* Check badge */}
      <div
        className={cn(
          "pointer-events-none absolute right-3 top-3 flex items-center justify-center rounded-full",
          "h-10 w-10",
          "ring-1 ring-border backdrop-blur-md",
          selected ? "bg-primary/90 text-primary-foreground" : "bg-background/60 text-foreground/70",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className={cn("transition-transform", selected ? "scale-100 h-6 w-6" : "scale-90 h-6 w-6")}
          aria-hidden="true"
        >
          <path
            d="M20 6L9 17l-5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Selection ring */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[calc(var(--radius)+6px)] ring-1 transition-colors",
          selected ? "ring-primary/60" : "ring-transparent",
        )}
      />
    </button>
  )
}
