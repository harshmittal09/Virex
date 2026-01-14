import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Users, Shield, Radio, Search, Filter, RefreshCw, QrCode, AlertOctagon, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, updateDoc, doc, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface Attendee {
  id: string;
  attendeeName?: string;
  name?: string;
  tier: "platinum" | "gold" | "silver" | "staff" | "security" | "medical" | "vip";
  position?: { x: number; y: number };
  role?: string; 
  status?: string;
}

// Added Mock Security Data as requested
const mockSecurity: Attendee[] = [
  { id: "sec1", name: "Security Unit A", tier: "security", position: { x: 15, y: 15 }, status: "active" },
  { id: "sec2", name: "Security Unit B", tier: "security", position: { x: 85, y: 15 }, status: "active" },
  { id: "sec3", name: "Gate Control", tier: "security", position: { x: 50, y: 90 }, status: "active" },
];

const tierColors: Record<string, string> = {
  platinum: "bg-purple-500 shadow-[0_0_10px_#a855f7]",
  gold: "bg-yellow-500 shadow-[0_0_10px_#eab308]",
  silver: "bg-slate-400 shadow-[0_0_5px_#94a3b8]",
  staff: "bg-blue-500",
  security: "bg-red-600 border-2 border-white shadow-[0_0_10px_#dc2626]",
  medical: "bg-green-500",
  vip: "bg-purple-500"
};

const OrganizerDashboard = () => {
  const [people, setPeople] = useState<Attendee[]>([]);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [violations, setViolations] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // 1. Fetch Real Tickets
    const qTickets = query(collection(db, "tickets"));
    const unsubTickets = onSnapshot(qTickets, (snap) => {
      const attendeesList: Attendee[] = [];
      
      snap.forEach((d) => {
        const data = d.data();
        const x = data.location ? (Math.abs(data.location.lng * 1000) % 90) + 5 : 50;
        const y = data.location ? (Math.abs(data.location.lat * 1000) % 90) + 5 : 50;

        attendeesList.push({
          id: d.id,
          attendeeName: data.attendeeName || "Unknown Guest",
          tier: data.tier || "silver",
          position: { x, y },
          status: "active"
        });
      });
      
      // 2. Merge Real Attendees with Mock Security
      const mergedList = [...mockSecurity, ...attendeesList];
      setPeople(mergedList);
      checkViolations(mergedList);
    });

    return () => unsubTickets();
  }, []);

  const checkViolations = (currentList: Attendee[]) => {
    const newViolations: string[] = [];
    
    currentList.forEach(person => {
      if (!person.position) return;
      if (person.tier === 'security') return; // Security can go anywhere

      const { x, y } = person.position;
      
      const inPlatinumZone = x > 30 && x < 70 && y < 30;
      const inGoldZone = x > 20 && x < 80 && y >= 30 && y < 60;

      if (person.tier === 'silver' && inPlatinumZone) {
        newViolations.push(`${person.attendeeName || 'Guest'} (Silver) unauthorized in Platinum VIP Area!`);
      }
      if (person.tier === 'silver' && inGoldZone) {
        newViolations.push(`${person.attendeeName || 'Guest'} (Silver) unauthorized in Gold Area!`);
      }
    });

    if (newViolations.length > 0 && newViolations.length !== violations.length) {
      setViolations(newViolations);
      toast({ variant: "destructive", title: "Security Alert", description: `${newViolations.length} zone violations.` });
    } else if (newViolations.length === 0) {
      setViolations([]);
    }
  };

  const simulateMovement = () => {
    const moved = people.map(p => ({
        ...p,
        position: {
            x: Math.max(5, Math.min(95, (p.position?.x || 50) + (Math.random() - 0.5) * 20)),
            y: Math.max(5, Math.min(95, (p.position?.y || 50) + (Math.random() - 0.5) * 20))
        }
    }));
    setPeople(moved);
    checkViolations(moved);
  };

  const filteredPeople = people.filter((p) => {
    const name = p.attendeeName || p.name || "";
    const matchesRole = filterRole === "all" || p.tier === filterRole;
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const stats = {
    total: people.length,
    platinum: people.filter(p => p.tier === 'platinum').length,
    gold: people.filter(p => p.tier === 'gold').length,
    violations: violations.length
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Organizer Monitor</h1>
                <p className="text-sm text-slate-400">Security & Live Tracking</p>
              </div>
            </div>
            
            <div className="flex gap-2">
                <Link to="/scanner">
                    <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 border-0">
                        <QrCode className="w-4 h-4" /> Scan
                    </Button>
                </Link>
                <Button onClick={simulateMovement} variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                    <RefreshCw className="w-4 h-4" /> Sim Move
                </Button>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="pt-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-full"><Users className="w-6 h-6"/></div>
                    <div><p className="text-2xl font-bold text-white">{stats.total}</p><p className="text-xs text-slate-400">Total People</p></div>
                </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="pt-6 flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 text-purple-400 rounded-full"><Shield className="w-6 h-6"/></div>
                    <div><p className="text-2xl font-bold text-white">{stats.platinum}</p><p className="text-xs text-slate-400">Platinum VIP</p></div>
                </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="pt-6 flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-full"><Shield className="w-6 h-6"/></div>
                    <div><p className="text-2xl font-bold text-white">{stats.gold}</p><p className="text-xs text-slate-400">Gold Guests</p></div>
                </CardContent>
            </Card>
            <Card className={`bg-slate-900 border-slate-800 ${stats.violations > 0 ? 'border-red-500/50 bg-red-900/10' : ''}`}>
                <CardContent className="pt-6 flex items-center gap-4">
                    <div className={`p-3 rounded-full ${stats.violations > 0 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                        <AlertOctagon className="w-6 h-6"/>
                    </div>
                    <div><p className="text-2xl font-bold text-white">{stats.violations}</p><p className="text-xs text-slate-400">Active Alerts</p></div>
                </CardContent>
            </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
             <AnimatePresence>
                {violations.length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-red-900/80 border border-red-500 text-white p-4 rounded-lg shadow-lg flex items-start gap-3">
                        <AlertOctagon className="w-6 h-6 mt-1 flex-shrink-0 animate-bounce" />
                        <div>
                            <h3 className="font-bold">SECURITY ALERT: ZONE VIOLATION</h3>
                            <ul className="list-disc pl-5 text-sm mt-1 opacity-90">
                                {violations.map((v, i) => <li key={i}>{v}</li>)}
                            </ul>
                        </div>
                    </motion.div>
                )}
             </AnimatePresence>

             <Card className="overflow-hidden border-slate-800 bg-slate-900 shadow-xl">
                <CardHeader className="bg-slate-900 border-b border-slate-800">
                    <CardTitle className="flex items-center gap-2 text-white">
                        <MapPin className="w-5 h-5 text-indigo-400" /> Venue Heatmap
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 relative aspect-[16/9] bg-black">
                    {/* --- MAP ZONES --- */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Stage */}
                        <div className="absolute top-0 left-1/4 right-1/4 h-12 bg-slate-800 rounded-b-xl flex items-center justify-center border-b border-x border-slate-700">
                            <span className="text-slate-500 text-[10px] tracking-[0.3em] font-bold">MAIN STAGE</span>
                        </div>

                        {/* Platinum */}
                        <div className="absolute top-12 left-[30%] right-[30%] h-[30%] border-2 border-dashed border-purple-500/40 bg-purple-900/20">
                            <div className="absolute top-2 right-2 text-purple-400 text-[10px] font-bold border border-purple-500/50 px-1 rounded">PLATINUM</div>
                        </div>

                        {/* Gold */}
                        <div className="absolute top-[40%] left-[20%] right-[20%] h-[25%] border-2 border-dashed border-yellow-500/40 bg-yellow-900/10">
                             <div className="absolute top-2 right-2 text-yellow-500 text-[10px] font-bold border border-yellow-500/50 px-1 rounded">GOLD</div>
                        </div>
                        
                         {/* SILVER / GENERAL SEATING - Explicitly Labeled UI */}
                        <div className="absolute bottom-0 left-[5%] right-[5%] h-[30%] border-t-2 border-slate-700 bg-slate-900/30 flex justify-center items-end pb-2">
                             <span className="text-slate-400 text-xs font-bold tracking-widest bg-black/60 px-3 py-1 rounded-full mb-2">SILVER / GENERAL SEATING</span>
                        </div>
                    </div>

                    {/* --- PEOPLE DOTS --- */}
                    {filteredPeople.map((person) => (
                        <motion.div
                            key={person.id}
                            layout
                            initial={{ scale: 0 }}
                            animate={{ scale: 1, left: `${person.position?.x}%`, top: `${person.position?.y}%` }}
                            transition={{ type: "spring", damping: 20, stiffness: 100 }}
                            className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full cursor-pointer group ${tierColors[person.tier] || "bg-white"}`}
                        >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/90 border border-slate-700 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20">
                                {person.attendeeName || person.name} ({person.tier})
                            </div>
                            {violations.some(v => v.includes(person.attendeeName || 'xyz')) && (
                                <div className="absolute -inset-2 rounded-full border-2 border-red-500 animate-ping"></div>
                            )}
                        </motion.div>
                    ))}
                </CardContent>
             </Card>
          </div>

          <div className="space-y-4">
             <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
                 <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" />
                        <Input 
                            placeholder="Search..." 
                            className="pl-8 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500" 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                        />
                    </div>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger className="w-[110px] bg-slate-950 border-slate-800 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="security">Security</SelectItem>
                            <SelectItem value="platinum">Platinum</SelectItem>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>

                 <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {filteredPeople.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${tierColors[p.tier] || 'bg-slate-400'}`}>
                                    {p.tier === 'security' ? <Shield className="w-4 h-4"/> : (p.attendeeName?.[0] || p.name?.[0] || "?")}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-200">{p.attendeeName || p.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{p.tier}</p>
                                </div>
                            </div>
                            {p.tier === 'security' && <Badge className="bg-red-900/50 text-red-200 border-red-800 text-[10px]">STAFF</Badge>}
                        </div>
                    ))}
                    {filteredPeople.length === 0 && (
                        <p className="text-center text-sm text-slate-500 py-8">No matching records.</p>
                    )}
                 </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrganizerDashboard;
// import { useState } from "react";
// import { motion } from "framer-motion";
// import { Link } from "react-router-dom";
// import { 
//   ArrowLeft, 
//   MapPin, 
//   Users, 
//   Shield, 
//   Radio,
//   Search,
//   Filter,
//   RefreshCw
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// interface StaffMember {
//   id: string;
//   name: string;
//   role: "security" | "staff" | "medical" | "vip";
//   position: { x: number; y: number };
//   status: "active" | "break" | "alert";
//   lastUpdate: string;
// }

// const mockStaff: StaffMember[] = [
//   { id: "1", name: "John Smith", role: "security", position: { x: 25, y: 30 }, status: "active", lastUpdate: "2 min ago" },
//   { id: "2", name: "Sarah Johnson", role: "security", position: { x: 75, y: 45 }, status: "active", lastUpdate: "1 min ago" },
//   { id: "3", name: "Mike Chen", role: "staff", position: { x: 50, y: 60 }, status: "break", lastUpdate: "5 min ago" },
//   { id: "4", name: "Emily Davis", role: "medical", position: { x: 85, y: 20 }, status: "active", lastUpdate: "30 sec ago" },
//   { id: "5", name: "Robert Wilson", role: "security", position: { x: 15, y: 70 }, status: "alert", lastUpdate: "Just now" },
//   { id: "6", name: "Lisa Anderson", role: "vip", position: { x: 60, y: 25 }, status: "active", lastUpdate: "3 min ago" },
//   { id: "7", name: "David Brown", role: "security", position: { x: 40, y: 80 }, status: "active", lastUpdate: "1 min ago" },
//   { id: "8", name: "Anna Martinez", role: "staff", position: { x: 30, y: 50 }, status: "active", lastUpdate: "2 min ago" },
// ];

// const roleColors = {
//   security: "bg-red-500",
//   staff: "bg-blue-500",
//   medical: "bg-green-500",
//   vip: "bg-purple-500",
// };

// const statusColors = {
//   active: "bg-green-400",
//   break: "bg-yellow-400",
//   alert: "bg-red-600 animate-pulse",
// };

// const OrganizerDashboard = () => {
//   const [staff, setStaff] = useState<StaffMember[]>(mockStaff);
//   const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
//   const [filterRole, setFilterRole] = useState<string>("all");
//   const [searchQuery, setSearchQuery] = useState("");

//   const filteredStaff = staff.filter((member) => {
//     const matchesRole = filterRole === "all" || member.role === filterRole;
//     const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase());
//     return matchesRole && matchesSearch;
//   });

//   const stats = {
//     total: staff.length,
//     active: staff.filter((s) => s.status === "active").length,
//     onBreak: staff.filter((s) => s.status === "break").length,
//     alerts: staff.filter((s) => s.status === "alert").length,
//   };

//   const refreshLocations = () => {
//     // Simulate location refresh
//     setStaff(staff.map(member => ({
//       ...member,
//       position: {
//         x: Math.max(5, Math.min(95, member.position.x + (Math.random() - 0.5) * 10)),
//         y: Math.max(5, Math.min(95, member.position.y + (Math.random() - 0.5) * 10)),
//       },
//       lastUpdate: "Just now"
//     })));
//   };

//   return (
//     <div className="min-h-screen bg-background">
//       {/* Header */}
//       <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
//         <div className="container mx-auto px-4 py-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <Link to="/">
//                 <Button variant="ghost" size="icon">
//                   <ArrowLeft className="w-5 h-5" />
//                 </Button>
//               </Link>
//               <div>
//                 <h1 className="text-2xl font-bold text-foreground">Organizer Dashboard</h1>
//                 <p className="text-sm text-muted-foreground">Real-time staff & security tracking</p>
//               </div>
//             </div>
//             <Button onClick={refreshLocations} variant="outline" className="gap-2">
//               <RefreshCw className="w-4 h-4" />
//               Refresh Locations
//             </Button>
//           </div>
//         </div>
//       </header>

//       <main className="container mx-auto px-4 py-8">
//         {/* Stats Cards */}
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center gap-3">
//                 <div className="p-3 rounded-full bg-primary/10">
//                   <Users className="w-6 h-6 text-primary" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold">{stats.total}</p>
//                   <p className="text-sm text-muted-foreground">Total Staff</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center gap-3">
//                 <div className="p-3 rounded-full bg-green-500/10">
//                   <Radio className="w-6 h-6 text-green-500" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold">{stats.active}</p>
//                   <p className="text-sm text-muted-foreground">Active</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center gap-3">
//                 <div className="p-3 rounded-full bg-yellow-500/10">
//                   <MapPin className="w-6 h-6 text-yellow-500" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold">{stats.onBreak}</p>
//                   <p className="text-sm text-muted-foreground">On Break</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center gap-3">
//                 <div className="p-3 rounded-full bg-red-500/10">
//                   <Shield className="w-6 h-6 text-red-500" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold">{stats.alerts}</p>
//                   <p className="text-sm text-muted-foreground">Alerts</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         <div className="grid lg:grid-cols-3 gap-8">
//           {/* Concert Map */}
//           <div className="lg:col-span-2">
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <MapPin className="w-5 h-5" />
//                   Concert Venue Map
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="relative aspect-[16/10] bg-gradient-to-br from-muted to-muted/50 rounded-lg overflow-hidden border-2 border-border">
//                   {/* Stage */}
//                   <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1/3 h-12 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
//                     <span className="text-sm font-medium text-primary">STAGE</span>
//                   </div>
                  
//                   {/* Venue areas */}
//                   <div className="absolute top-20 left-4 right-4 bottom-4 border-2 border-dashed border-border/50 rounded-lg">
//                     <div className="absolute top-2 left-2 text-xs text-muted-foreground">General Area</div>
//                   </div>
                  
//                   <div className="absolute bottom-8 right-8 w-20 h-16 bg-purple-500/10 rounded border border-purple-500/30 flex items-center justify-center">
//                     <span className="text-xs text-purple-400">VIP</span>
//                   </div>
                  
//                   <div className="absolute bottom-8 left-8 w-16 h-12 bg-green-500/10 rounded border border-green-500/30 flex items-center justify-center">
//                     <span className="text-xs text-green-400">Medical</span>
//                   </div>

//                   {/* Staff markers */}
//                   {filteredStaff.map((member) => (
//                     <motion.button
//                       key={member.id}
//                       initial={{ scale: 0 }}
//                       animate={{ scale: 1 }}
//                       className={`absolute w-8 h-8 rounded-full ${roleColors[member.role]} flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2 shadow-lg hover:scale-110 transition-transform border-2 border-white/50`}
//                       style={{ left: `${member.position.x}%`, top: `${member.position.y}%` }}
//                       onClick={() => setSelectedStaff(member)}
//                     >
//                       <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${statusColors[member.status]} border border-white`} />
//                       <span className="text-xs font-bold text-white">{member.name.charAt(0)}</span>
//                     </motion.button>
//                   ))}
//                 </div>

//                 {/* Legend */}
//                 <div className="flex flex-wrap gap-4 mt-4">
//                   <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 rounded-full bg-red-500" />
//                     <span className="text-sm text-muted-foreground">Security</span>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 rounded-full bg-blue-500" />
//                     <span className="text-sm text-muted-foreground">Staff</span>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 rounded-full bg-green-500" />
//                     <span className="text-sm text-muted-foreground">Medical</span>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 rounded-full bg-purple-500" />
//                     <span className="text-sm text-muted-foreground">VIP</span>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           {/* Staff List */}
//           <div>
//             <Card className="h-full">
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <Users className="w-5 h-5" />
//                   Staff List
//                 </CardTitle>
//                 <div className="space-y-3 mt-4">
//                   <div className="relative">
//                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//                     <Input
//                       placeholder="Search staff..."
//                       className="pl-10"
//                       value={searchQuery}
//                       onChange={(e) => setSearchQuery(e.target.value)}
//                     />
//                   </div>
//                   <Select value={filterRole} onValueChange={setFilterRole}>
//                     <SelectTrigger>
//                       <Filter className="w-4 h-4 mr-2" />
//                       <SelectValue placeholder="Filter by role" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Roles</SelectItem>
//                       <SelectItem value="security">Security</SelectItem>
//                       <SelectItem value="staff">Staff</SelectItem>
//                       <SelectItem value="medical">Medical</SelectItem>
//                       <SelectItem value="vip">VIP</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-3 max-h-[500px] overflow-y-auto">
//                   {filteredStaff.map((member) => (
//                     <motion.div
//                       key={member.id}
//                       initial={{ opacity: 0, y: 10 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       className={`p-3 rounded-lg border cursor-pointer transition-colors ${
//                         selectedStaff?.id === member.id
//                           ? "bg-primary/10 border-primary"
//                           : "bg-card hover:bg-accent/50 border-border"
//                       }`}
//                       onClick={() => setSelectedStaff(member)}
//                     >
//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center gap-3">
//                           <div className={`w-10 h-10 rounded-full ${roleColors[member.role]} flex items-center justify-center`}>
//                             <span className="text-sm font-bold text-white">{member.name.split(' ').map(n => n[0]).join('')}</span>
//                           </div>
//                           <div>
//                             <p className="font-medium text-foreground">{member.name}</p>
//                             <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
//                           </div>
//                         </div>
//                         <div className="text-right">
//                           <Badge
//                             variant={member.status === "active" ? "default" : member.status === "alert" ? "destructive" : "secondary"}
//                           >
//                             {member.status}
//                           </Badge>
//                           <p className="text-xs text-muted-foreground mt-1">{member.lastUpdate}</p>
//                         </div>
//                       </div>
//                     </motion.div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// };

// export default OrganizerDashboard;
