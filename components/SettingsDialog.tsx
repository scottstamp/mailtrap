"use client";

import { useEffect, useState } from "react";
import { Settings, LogOut, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

export function SettingsDialog() {
    const [open, setOpen] = useState(false);
    const [domains, setDomains] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (open) {
            fetch("/api/settings")
                .then((res) => {
                    if (res.status === 401) {
                        router.push("/login");
                        return null;
                    }
                    return res.json();
                })
                .then((data) => {
                    if (!data) return;
                    setDomains(data.allowedDomains ? data.allowedDomains.join(", ") : "");
                    setApiKey(data.auth?.apiKey || "");
                })
                .catch(console.error);
        }
    }, [open, router]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const list = domains.split(",").map((s) => s.trim()).filter((s) => s);
            const body: any = { allowedDomains: list };
            if (newPassword) {
                body.newPassword = newPassword;
            }

            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setOpen(false);
                setNewPassword(""); // Clear password field
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRotateKey = async () => {
        if (!confirm("Are you sure? This will invalidate the old key.")) return;
        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rotateApiKey: true }),
            });
            const data = await res.json();
            if (data.apiKey) {
                setApiKey(data.apiKey);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                    <Settings className="h-[1.2rem] w-[1.2rem]" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Configure email rules and security.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">
                            Allowed 'To' Domains
                        </label>
                        <Input
                            value={domains}
                            onChange={(e) => setDomains(e.target.value)}
                            placeholder="example.com, test.com"
                        />
                        <p className="text-xs text-muted-foreground">
                            Comma separated. Leave empty to allow all.
                        </p>
                    </div>

                    <Separator />

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">
                            API Key
                        </label>
                        <div className="flex gap-2">
                            <code className="flex-1 p-2 bg-muted rounded border text-xs font-mono break-all items-center flex">
                                {apiKey}
                            </code>
                            <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(apiKey)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={handleRotateKey} title="Rotate Key">
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">
                            Change Password
                        </label>
                        <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password (leave empty to keep current)"
                        />
                    </div>
                </div>
                <DialogFooter className="flex justify-between sm:justify-between w-full">
                    <Button variant="ghost" onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <LogOut className="h-4 w-4 mr-2" /> Logout
                    </Button>
                    <Button type="submit" onClick={handleSave} disabled={loading}>
                        Save changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
