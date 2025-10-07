"use client"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { StarsBackground } from "@/components/ui/stars-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

export default function UserInfoPage() {
  function onSubmit(e) {
    e.preventDefault()
  }

  return (
    <div className="relative isolate min-h-dvh bg-background overflow-hidden">
      {/* Background layers - match Home theme */}
      <StarsBackground className="pointer-events-none z-0" />
      <ShootingStars
        className="pointer-events-none z-0"
        starColor={"var(--primary-foreground)"}
        trailColor={"var(--ring)"}
      />

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-6 py-16">
        <section className="w-full max-w-4xl">
          <Card className="backdrop-blur supports-[backdrop-filter]:bg-background/70 border-border shadow-md">
            <CardHeader className="space-y-2">
              <CardTitle className="text-3xl md:text-4xl text-balance">User Information</CardTitle>
              <CardDescription className="text-base md:text-lg text-pretty">
                Please fill in your details below. We’ll use this to personalize your experience.
              </CardDescription>
            </CardHeader>

            <form onSubmit={onSubmit}>
              <CardContent className="grid gap-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="John Doe"
                      autoComplete="name"
                      required
                      className="h-12 text-base"
                    />
                    <p className="text-xs text-muted-foreground">Your full legal name.</p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <InputGroup>
                      <InputGroupAddon aria-hidden="true" className="px-3 text-base">
                        +
                      </InputGroupAddon>
                      <InputGroupInput
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="1 555 123 4567"
                        required
                        aria-describedby="phone-help"
                        className="h-12 text-base"
                      />
                    </InputGroup>
                    <p id="phone-help" className="text-xs text-muted-foreground">
                      Include country and area code.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <InputGroup>
                      <InputGroupAddon aria-hidden="true" className="px-3 text-base">
                        @
                      </InputGroupAddon>
                      <InputGroupInput
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        required
                        aria-describedby="email-help"
                        className="h-12 text-base"
                      />
                    </InputGroup>
                    <p id="email-help" className="text-xs text-muted-foreground">
                      We’ll send confirmations here.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input id="dob" name="dob" type="date" required className="h-12 text-base" />
                    <p className="text-xs text-muted-foreground">Format: YYYY-MM-DD</p>
                  </div>

                  <div className="md:col-span-2 grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      name="address"
                      placeholder="Street, City, State, ZIP"
                      rows={3}
                      required
                      aria-describedby="address-help"
                      className="min-h-32 text-base"
                    />
                    <p id="address-help" className="text-xs text-muted-foreground">
                      Use a complete address for deliveries.
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="justify-end">
                <Button type="submit" size="lg" className="w-full md:w-auto px-10 h-12 text-base">
                  Submit
                </Button>
              </CardFooter>
            </form>
          </Card>
        </section>
      </main>
    </div>
  )
}
