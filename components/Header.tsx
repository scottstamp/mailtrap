import Link from "next/link";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";

export function Header() {
    return (
        <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-5 w-5 text-primary-foreground"
                            >
                                <rect width="20" height="16" x="2" y="4" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">MailTrap Local</h1>
                    </Link>

                    <nav className="flex items-center gap-1">
                        <Link href="/">
                            <Button variant="ghost" size="sm">OTP Codes</Button>
                        </Link>
                        <Link href="/emails">
                            <Button variant="ghost" size="sm">Emails</Button>
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold tracking-wider border border-primary/20 hidden md:inline-block">
                        Listening :25
                    </span>
                    <SettingsDialog />
                </div>
            </div>
        </header>
    );
}
