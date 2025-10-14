import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full flex flex-col items-center text-center gap-6">
        <h1 className="text-4xl font-bold">Private, End‑to‑End Encrypted Chat</h1>
        <p className="text-gray-600 max-w-2xl">
          Chat and share securely with E2EE. Your private keys never leave your device.
          We use modern cryptography with a simple, friendly interface.
        </p>
        <Link
          href="/login"
          className="px-6 py-3 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
