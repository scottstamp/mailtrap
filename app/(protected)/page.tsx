"use client";

import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { Copy, Check, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CodeMatch {
    id: string;
    code: string;
    email: string;
    date: string;
    subject: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CodesPage() {
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const { data: codes, mutate } = useSWR<CodeMatch[]>("/api/codes", fetcher, {
        refreshInterval: 3000,
        onSuccess: () => setLastRefreshed(new Date()),
    });

    if (!codes) {
        return <div className="p-8 text-center text-muted-foreground">Loading codes...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold tracking-tight">One-Time Codes</h2>
                <div className="flex items-center gap-4">
                    <div className="text-xs text-muted-foreground">
                        {lastRefreshed && `Last updated: ${lastRefreshed.toLocaleTimeString()}`}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => mutate()}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                </div>
            </div>

            {codes.length === 0 ? (
                <div className="p-12 text-center border rounded-lg bg-card text-muted-foreground">
                    No codes found matching pattern (###-####-###) in recent emails.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {codes.map((match) => (
                        <CodeCard key={match.id} match={match} />
                    ))}
                </div>
            )}
        </div>
    );
}

function CodeCard({ match }: { match: CodeMatch }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(match.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                        <p className="text-sm font-medium leading-none text-muted-foreground">To: {match.email}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(match.date), { addSuffix: true })}</p>
                    </div>
                    {new Date().getTime() - new Date(match.date).getTime() < 1000 * 60 * 5 && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">New</Badge>
                    )}
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <code className="flex-1 bg-muted p-2 rounded text-lg font-mono font-bold text-center border tracking-wider">
                        {match.code}
                    </code>
                    <Button size="icon" variant="outline" onClick={handleCopy}>
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                </div>

                <div className="pt-2 border-t mt-2">
                    <p className="text-xs text-muted-foreground truncate" title={match.subject}>
                        Subject: {match.subject}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
