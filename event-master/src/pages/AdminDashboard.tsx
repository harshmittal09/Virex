import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  Calendar,
  FileText,
  Shield,
  Trash2,
  Edit,
  Plus,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "organizer" | "artist" | "user";
  status: "active" | "suspended" | "pending";
  createdAt: string;
}

interface Event {
  id: string;
  title: string;
  organizer: string;
  date: string;
  status: "published" | "draft" | "cancelled";
  ticketsSold: number;
}

const mockUsers: User[] = [
  { id: "1", name: "John Admin", email: "admin@eventvibe.com", role: "admin", status: "active", createdAt: "2024-01-15" },
  { id: "2", name: "Sarah Organizer", email: "sarah@events.com", role: "organizer", status: "active", createdAt: "2024-02-20" },
  { id: "3", name: "Mike Artist", email: "mike@music.com", role: "artist", status: "active", createdAt: "2024-03-10" },
  { id: "4", name: "Emily User", email: "emily@gmail.com", role: "user", status: "pending", createdAt: "2024-03-25" },
  { id: "5", name: "David Banned", email: "david@test.com", role: "user", status: "suspended", createdAt: "2024-02-01" },
];

const mockEvents: Event[] = [
  { id: "1", title: "Summer Rock Festival", organizer: "Sarah Organizer", date: "2024-07-15", status: "published", ticketsSold: 5420 },
  { id: "2", title: "Jazz Night Live", organizer: "Jazz Productions", date: "2024-06-20", status: "published", ticketsSold: 890 },
  { id: "3", title: "Electronic Music Fest", organizer: "EDM Events", date: "2024-08-01", status: "draft", ticketsSold: 0 },
  { id: "4", title: "Classical Evening", organizer: "Symphony Hall", date: "2024-05-30", status: "cancelled", ticketsSold: 340 },
];

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [siteSettings, setSiteSettings] = useState({
    siteName: "EventVibe",
    tagline: "Discover Amazing Events",
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    maxEventsPerOrganizer: 10,
  });
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
    toast.success("User deleted successfully");
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers(users.map(u => {
      if (u.id === userId) {
        return { ...u, status: u.status === "active" ? "suspended" : "active" };
      }
      return u;
    }));
    toast.success("User status updated");
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
    toast.success("Event deleted successfully");
  };

  const handleToggleEventStatus = (eventId: string) => {
    setEvents(events.map(e => {
      if (e.id === eventId) {
        return { ...e, status: e.status === "published" ? "draft" : "published" };
      }
      return e;
    }));
    toast.success("Event status updated");
  };

  const handleSaveSettings = () => {
    setIsEditingSettings(false);
    toast.success("Settings saved successfully");
  };

  const roleColors = {
    admin: "bg-red-500/10 text-red-500 border-red-500/20",
    organizer: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    artist: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    user: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };

  const statusColors = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    suspended: "bg-red-500/10 text-red-500 border-red-500/20",
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    published: "bg-green-500/10 text-green-500 border-green-500/20",
    draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Site management & configuration</p>
              </div>
            </div>
            <Badge variant="destructive" className="gap-1">
              <Shield className="w-3 h-3" />
              Admin Access
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-green-500/10">
                  <Calendar className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{events.length}</p>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-purple-500/10">
                  <FileText className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{events.filter(e => e.status === "published").length}</p>
                  <p className="text-sm text-muted-foreground">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-yellow-500/10">
                  <Shield className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.filter(u => u.status === "pending").length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>Create a new user account with specific role.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input placeholder="Enter name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" placeholder="Enter email" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => toast.success("User created (demo)")}>Create User</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleColors[user.role]}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[user.status]}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleUserStatus(user.id)}>
                                {user.status === "active" ? (
                                  <>
                                    <EyeOff className="w-4 h-4 mr-2" />
                                    Suspend
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Event Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Organizer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tickets</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>{event.organizer}</TableCell>
                        <TableCell>{new Date(event.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[event.status]}>
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{event.ticketsSold.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleEventStatus(event.id)}>
                                {event.status === "published" ? (
                                  <>
                                    <EyeOff className="w-4 h-4 mr-2" />
                                    Unpublish
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Publish
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Site Settings
                </CardTitle>
                <Button 
                  variant={isEditingSettings ? "default" : "outline"}
                  onClick={() => isEditingSettings ? handleSaveSettings() : setIsEditingSettings(true)}
                  className="gap-2"
                >
                  {isEditingSettings ? (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      Edit Settings
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Site Name</Label>
                    <Input 
                      value={siteSettings.siteName}
                      onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })}
                      disabled={!isEditingSettings}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input 
                      value={siteSettings.tagline}
                      onChange={(e) => setSiteSettings({ ...siteSettings, tagline: e.target.value })}
                      disabled={!isEditingSettings}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Max Events Per Organizer</Label>
                  <Input 
                    type="number"
                    value={siteSettings.maxEventsPerOrganizer}
                    onChange={(e) => setSiteSettings({ ...siteSettings, maxEventsPerOrganizer: parseInt(e.target.value) })}
                    disabled={!isEditingSettings}
                    className="max-w-xs"
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Feature Toggles</h3>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">Maintenance Mode</p>
                      <p className="text-sm text-muted-foreground">Temporarily disable the site for updates</p>
                    </div>
                    <Switch 
                      checked={siteSettings.maintenanceMode}
                      onCheckedChange={(checked) => setSiteSettings({ ...siteSettings, maintenanceMode: checked })}
                      disabled={!isEditingSettings}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">Allow Registration</p>
                      <p className="text-sm text-muted-foreground">Allow new users to create accounts</p>
                    </div>
                    <Switch 
                      checked={siteSettings.allowRegistration}
                      onCheckedChange={(checked) => setSiteSettings({ ...siteSettings, allowRegistration: checked })}
                      disabled={!isEditingSettings}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">Require Email Verification</p>
                      <p className="text-sm text-muted-foreground">Users must verify email before accessing features</p>
                    </div>
                    <Switch 
                      checked={siteSettings.requireEmailVerification}
                      onCheckedChange={(checked) => setSiteSettings({ ...siteSettings, requireEmailVerification: checked })}
                      disabled={!isEditingSettings}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
