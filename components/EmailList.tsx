"use client";

import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Email {
    id: string;
    from: { address: string; name: string };
    to: { address: string; name: string }[];
    subject: string;
    text: string;
    html: string;
    date: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function EmailList() {
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

    const { data: emails, mutate } = useSWR<Email[]>("/api/emails", fetcher, {
        refreshInterval: 3000,
        onSuccess: () => setLastRefreshed(new Date()),
    });

    if (!emails) {
        return <div className="p-8 text-center text-muted-foreground">Loading emails...</div>;
    }

    if (emails.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                No emails received yet. Listening on port 25...
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-muted-foreground">
                    {lastRefreshed && `Last updated: ${lastRefreshed.toLocaleTimeString()}`}
                </div>
                <Button size="sm" variant="ghost" onClick={() => mutate()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </div>
            {emails.map((email) => (
                <EmailItem key={email.id} email={email} />
            ))}
        </div>
    );
}

function EmailItem({ email }: { email: Email }) {
    const [isOpen, setIsOpen] = useState(false);

    // According to rule: "In the collapsed view display the 'Name' in the from field if available, instead of the email address."
    const fromLabel = email.from.name && email.from.name.trim() !== "" ? email.from.name : email.from.address;

    // "Display the 'To' field for each entry as well."
    const toLabel = email.to.map((t) => t.address).join(", ");

    const [textDisplay, setTextDisplay] = useState(email.text);

    useEffect(() => {
        if (email.html) {
            const temp = document.createElement("div");
            // Basic pre-processing to preserve some structure
            const htmlWithNewlines = email.html
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/<\/p>/gi, "\n\n")
                .replace(/<\/div>/gi, "\n");

            temp.innerHTML = htmlWithNewlines;
            const text = (temp.textContent || temp.innerText || "").trim();
            // Remove consecutive blank lines (more than 2 newlines -> 2 newlines)
            setTextDisplay(text.replace(/\n\s*\n\s*\n/g, '\n\n'));
        } else {
            setTextDisplay(email.text ? email.text.replace(/\n\s*\n\s*\n/g, '\n\n') : "");
        }
    }, [email.html, email.text]);

    const [showHtml, setShowHtml] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-md bg-card">
            <CollapsibleTrigger asChild>
                <div className="flex items-center p-4 cursor-pointer hover:bg-muted/50 transition-colors gap-4 select-none">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}

                    <div className="grid grid-cols-12 gap-4 flex-1 items-center">
                        <div className="col-span-3 font-medium truncate flex items-center gap-2" title={email.from.address}>
                            <span className={!email.from.name ? "text-primary" : ""}>{fromLabel}</span>
                            {email.from.name && <span className="text-xs text-muted-foreground hidden lg:inline">&lt;{email.from.address}&gt;</span>}
                        </div>
                        <div className="col-span-3 text-muted-foreground truncate text-sm" title={toLabel}>
                            To: {toLabel}
                        </div>
                        <div className="col-span-4 truncate font-medium">
                            {email.subject}
                        </div>
                        <div className="col-span-2 text-right text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                        </div>
                    </div>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="p-4 pt-0 space-y-6">
                    <div className="grid grid-cols-1 gap-2 text-sm border-b pb-4 mt-2">
                        <div className="flex gap-2">
                            <span className="font-semibold text-muted-foreground min-w-[60px]">From:</span>
                            <span>{email.from.name ? `${email.from.name} <${email.from.address}>` : email.from.address}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-muted-foreground min-w-[60px]">To:</span>
                            <span>{email.to.map(t => t.name ? `${t.name} <${t.address}>` : t.address).join(', ')}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-muted-foreground min-w-[60px]">Subject:</span>
                            <span>{email.subject}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-muted-foreground min-w-[60px]">Date:</span>
                            <span>{new Date(email.date).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Text Content</h3>
                        <div className="p-4 bg-muted/30 rounded-md whitespace-pre-wrap text-sm font-mono leading-relaxed border">
                            {textDisplay || <span className="italic text-muted-foreground">No text content available</span>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setShowHtml(!showHtml)}>
                            {showHtml ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">HTML Source</h3>
                        </div>

                        {showHtml && (
                            <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/50">
                                <pre className="text-xs font-mono break-all whitespace-pre-wrap text-primary/80">
                                    {email.html || "<no-html-content />"}
                                </pre>
                            </ScrollArea>
                        )}
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
