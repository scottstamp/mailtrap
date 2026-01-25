"use client";

import { useEffect, useState } from "react";
import { Settings, LogOut, Copy, RefreshCw, UserPlus, Trash, Shield } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


export function SettingsDialog() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

    // User Data
    const [isAdmin, setIsAdmin] = useState(false);
    const [apiKey, setApiKey] = useState("");

    // General Form
    const [newPassword, setNewPassword] = useState("");

    // Admin Data
    const [globalAllowedDomains, setGlobalAllowedDomains] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [invites, setInvites] = useState<any[]>([]);
    const [smtp, setSmtp] = useState<any>({
        host: "", port: 587, user: "", pass: "", secure: false, from: "", enabled: false
    });

    // Invite Form
    const [inviteRole, setInviteRole] = useState("user");
    const [inviteDomains, setInviteDomains] = useState("");
    const [generatedInviteLink, setGeneratedInviteLink] = useState("");

    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const loadData = () => {
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

                // General
                setIsAdmin(data.auth?.role === 'admin');
                setApiKey(data.auth?.apiKey || "");
                setGlobalAllowedDomains(data.allowedDomains ? data.allowedDomains.join(", ") : "");

                // Admin
                if (data.users) setUsers(data.users);
                if (data.invites) setInvites(data.invites);
                if (data.smtp) setSmtp(data.smtp);
            })
            .catch(console.error);
    };

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    const handleSaveGeneral = async () => {
        setLoading(true);
        try {
            const list = globalAllowedDomains.split(",").map((s) => s.trim()).filter((s) => s);
            const body: any = {};

            if (isAdmin) {
                body.allowedDomains = list;
            }
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
                setNewPassword("");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSMTP = async () => {
        setLoading(true);
        try {
            const body: any = {
                smtp: {
                    ...smtp,
                    port: parseInt(smtp.port as string)
                }
            };

            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            alert("SMTP Settings Saved");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateInvite = async () => {
        setLoading(true);
        try {
            const list = inviteDomains.split(",").map((s) => s.trim()).filter((s) => s);
            const body = {
                role: inviteRole,
                allowedDomains: list.length > 0 ? list : ['*'] // Default to * if empty for invite
            };

            const res = await fetch("/api/auth/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (data.success) {
                setGeneratedInviteLink(data.link);
                setInviteDomains("");
                loadData(); // Refresh lists
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
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 gap-0">
                <div className="p-6 pb-2">
                    <DialogHeader>
                        <DialogTitle>System Settings</DialogTitle>
                        <DialogDescription>
                            Configure application, users, and security.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <div className="px-6">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="general">General</TabsTrigger>
                            {isAdmin && <TabsTrigger value="users">Users & Invites</TabsTrigger>}
                            {isAdmin && <TabsTrigger value="smtp">SMTP</TabsTrigger>}
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 pt-4">
                        <TabsContent value="general" className="mt-0 space-y-6">
                            {isAdmin && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Global Allowed 'To' Domains</label>
                                    <Input
                                        value={globalAllowedDomains}
                                        onChange={(e) => setGlobalAllowedDomains(e.target.value)}
                                        placeholder="example.com, test.com"
                                    />
                                    <p className="text-xs text-muted-foreground">Comma separated. Leave empty to allow all.</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Your API Key</label>
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

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Change Password</label>
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="New password (leave empty to keep current)"
                                />
                            </div>

                            <div className="pt-4 flex justify-between">
                                <Button variant="ghost" onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                    <LogOut className="h-4 w-4 mr-2" /> Logout
                                </Button>
                                <Button onClick={handleSaveGeneral} disabled={loading}>Save</Button>
                            </div>
                        </TabsContent>

                        {isAdmin && (
                            <TabsContent value="users" className="mt-0 space-y-6">
                                <Card>
                                    <CardContent className="p-4 space-y-4">
                                        <h3 className="font-semibold text-sm flex items-center gap-2">
                                            <UserPlus className="w-4 h-4" /> Generate Invite
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">Role</label>
                                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select a role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">User</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">Allowed Domains (Optional)</label>
                                                <Input
                                                    value={inviteDomains}
                                                    onChange={(e) => setInviteDomains(e.target.value)}
                                                    placeholder="example.com"
                                                    className="h-9"
                                                />
                                            </div>
                                        </div>
                                        <Button size="sm" onClick={handleCreateInvite} disabled={loading}>Generate Link</Button>

                                        {generatedInviteLink && (
                                            <div className="p-3 bg-muted rounded-md text-sm break-all border flex gap-2 items-center">
                                                <span className="flex-1">{generatedInviteLink}</span>
                                                <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(generatedInviteLink)}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="space-y-2">
                                    <h3 className="font-semibold text-sm">Active Users ({users.length})</h3>
                                    <ScrollArea className="h-[200px] border rounded-md">
                                        <div className="p-4 space-y-2">
                                            {users.map(u => (
                                                <div key={u.id} className="flex items-center justify-between text-sm p-2 border-b last:border-0 hover:bg-muted/50">
                                                    <div className="flex flex-col flex-1 mr-4">
                                                        <span className="font-medium flex items-center gap-2">
                                                            {u.username}
                                                            {u.role === 'admin' && <Badge variant="secondary" className="text-[10px] h-5">Admin</Badge>}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{u.allowedDomains.join(', ')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <EditUserDomainsButton
                                                            user={u}
                                                            onSave={async (id, domains) => {
                                                                setLoading(true);
                                                                await fetch("/api/settings/user", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({ id, allowedDomains: domains }),
                                                                });
                                                                loadData();
                                                                setLoading(false);
                                                            }}
                                                        />
                                                        {u.role !== 'admin' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                onClick={async () => {
                                                                    if (!confirm(`Are you sure you want to delete user ${u.username}?`)) return;
                                                                    setLoading(true);
                                                                    await fetch("/api/settings/user", {
                                                                        method: "DELETE",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({ id: u.id }),
                                                                    });
                                                                    loadData();
                                                                    setLoading(false);
                                                                }}
                                                            >
                                                                <Trash className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </TabsContent>
                        )}

                        {isAdmin && (
                            <TabsContent value="smtp" className="mt-0 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="smtp-enabled"
                                            checked={smtp.enabled}
                                            onCheckedChange={(c) => setSmtp({ ...smtp, enabled: !!c })}
                                        />
                                        <label htmlFor="smtp-enabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Enable External SMTP (for sending emails)
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Host</label>
                                            <Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.gmail.com" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Port</label>
                                            <Input type="number" value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} placeholder="587" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Username</label>
                                            <Input value={smtp.user} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Password</label>
                                            <Input type="password" value={smtp.pass} onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">From Address</label>
                                        <Input value={smtp.from} onChange={(e) => setSmtp({ ...smtp, from: e.target.value })} placeholder="noreply@example.com" />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="smtp-secure"
                                            checked={smtp.secure}
                                            onCheckedChange={(c) => setSmtp({ ...smtp, secure: !!c })}
                                        />
                                        <label htmlFor="smtp-secure" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Secure (SSL/TLS)
                                        </label>
                                    </div>
                                    <Button onClick={handleSaveSMTP} disabled={loading}>Save SMTP Settings</Button>
                                </div>
                            </TabsContent>
                        )}
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

function EditUserDomainsButton({ user, onSave }: { user: any, onSave: (id: string, domains: string[]) => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const [domains, setDomains] = useState(user.allowedDomains.join(", "));

    const handleSave = async () => {
        const list = domains.split(",").map((s: string) => s.trim()).filter((s: string) => s);
        await onSave(user.id, list.length > 0 ? list : ['*']);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Shield className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User Domains</DialogTitle>
                    <DialogDescription>
                        Set allowed domains for {user.username}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Allowed Domains</label>
                        <Input
                            value={domains}
                            onChange={(e) => setDomains(e.target.value)}
                            placeholder="example.com"
                        />
                        <p className="text-xs text-muted-foreground">Comma separated. Use * for all.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
