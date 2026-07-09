import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import EditorialLayout from "@/components/EditorialLayout";
import RequireAuth from "@/components/RequireAuth";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

function AccountSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <form onSubmit={handleSubmit} className="editorial-card max-w-md space-y-4">
      <h2 className="text-lg font-semibold">Change password</h2>
      <div className="space-y-2">
        <Label htmlFor="current">Current password</Label>
        <Input
          id="current"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new">New password</Label>
        <Input
          id="new"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={6}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={6}
          required
        />
      </div>
      <Button type="submit" disabled={changePassword.isPending}>
        {changePassword.isPending ? "Saving..." : "Update password"}
      </Button>
    </form>
  );
}

function UsersAdmin() {
  const utils = trpc.useUtils();
  const { data: users = [], isLoading } = trpc.users.list.useQuery();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");

  const createUser = trpc.users.create.useMutation({
    onSuccess: async () => {
      toast.success("User created");
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      await utils.users.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: async () => {
      toast.success("User deleted");
      await utils.users.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetPassword = trpc.users.resetPassword.useMutation({
    onSuccess: () => toast.success("Password reset"),
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading users...</p>;

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createUser.mutate({ name, email, password, role });
        }}
        className="editorial-card space-y-3 max-w-lg"
      >
        <h2 className="text-lg font-semibold">Add user</h2>
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "user" | "admin")}
          className="h-9 w-full px-3 border border-border rounded-sm bg-background text-sm"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <Button type="submit" disabled={createUser.isPending}>
          <Plus className="w-4 h-4 mr-1" />
          Create user
        </Button>
      </form>

      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="editorial-card flex flex-wrap items-center gap-3 justify-between">
            <div>
              <p className="font-medium text-sm">{user.name || "—"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{user.role}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const next = window.prompt("New password (min 6 characters)");
                  if (next && next.length >= 6) resetPassword.mutate({ id: user.id, newPassword: next });
                }}
              >
                Reset password
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (window.confirm(`Delete ${user.email}?`)) deleteUser.mutate({ id: user.id });
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupsAdmin() {
  const utils = trpc.useUtils();
  const { data: groups = [], isLoading } = trpc.groups.list.useQuery();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createGroup = trpc.groups.create.useMutation({
    onSuccess: async () => {
      toast.success("Group created");
      setName("");
      setDescription("");
      await utils.groups.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateGroup = trpc.groups.update.useMutation({
    onSuccess: async () => {
      toast.success("Group updated");
      await utils.groups.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteGroup = trpc.groups.delete.useMutation({
    onSuccess: async () => {
      toast.success("Group deleted");
      await utils.groups.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading groups...</p>;

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createGroup.mutate({ name, description: description || undefined });
        }}
        className="editorial-card space-y-3 max-w-lg"
      >
        <h2 className="text-lg font-semibold">Add document group</h2>
        <Input placeholder="Name (e.g. Backend)" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button type="submit" disabled={createGroup.isPending}>
          <Plus className="w-4 h-4 mr-1" />
          Create group
        </Button>
      </form>

      <div className="space-y-2">
        {groups.map((group) => (
          <div key={group.id} className="editorial-card space-y-2">
            <div className="flex flex-wrap items-start gap-3 justify-between">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Input
                  defaultValue={group.name}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && value !== group.name) {
                      updateGroup.mutate({ id: group.id, name: value });
                    }
                  }}
                />
                <Input
                  defaultValue={group.description ?? ""}
                  placeholder="Description"
                  onBlur={(e) => {
                    if (e.target.value !== (group.description ?? "")) {
                      updateGroup.mutate({ id: group.id, description: e.target.value });
                    }
                  }}
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (window.confirm(`Delete group "${group.name}"?`)) {
                    deleteGroup.mutate({ id: group.id });
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const { data: user } = trpc.auth.me.useQuery();
  const isAdmin = user?.role === "admin";

  return (
    <RequireAuth>
      <EditorialLayout>
        <div className="space-y-6 max-w-3xl">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Account, users, and document groups
            </p>
          </div>

          <Tabs defaultValue="account">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
              {isAdmin && <TabsTrigger value="groups">Document groups</TabsTrigger>}
            </TabsList>

            <TabsContent value="account" className="mt-4">
              <AccountSettings />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="users" className="mt-4">
                <UsersAdmin />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="groups" className="mt-4">
                <GroupsAdmin />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </EditorialLayout>
    </RequireAuth>
  );
}
