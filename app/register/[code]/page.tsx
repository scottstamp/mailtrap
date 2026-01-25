"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from 'next/link';

export default function RegisterPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const params = useParams();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        setIsLoading(true);

        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: params.code,
                username,
                password
            }),
        });

        setIsLoading(false);

        if (res.ok) {
            setMessage("Account created successfully.");
            setTimeout(() => {
                router.push("/login");
            }, 2000);
        } else {
            const data = await res.json();
            setError(data.error || "Failed to create account.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <Card className="w-[350px]">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserPlus className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Register Account</CardTitle>
                    <CardDescription>Create your account to access MailTrap</CardDescription>
                </CardHeader>
                <CardContent>
                    {!message ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="text"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Creating Account..." : "Create Account"}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-green-500/10 text-green-500 rounded-md text-sm text-center border border-green-500/20">
                                {message}
                            </div>
                            <p className="text-center text-sm text-muted-foreground">Redirecting to login...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
