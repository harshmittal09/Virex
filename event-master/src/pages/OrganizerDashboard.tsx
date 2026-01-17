import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Users, Shield, Radio, Search, RefreshCw, QrCode, 
  AlertOctagon, Speaker, Zap, Wifi, ShoppingBag, Activity, AlertTriangle, CheckCircle,
  Crown, MessageSquare, Send, X, Loader2, UserPlus, Plus, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { auth, db } from "@/lib/firebase";
import { 
    collection, onSnapshot, query, updateDoc, doc, addDoc, getDoc,
    orderBy, serverTimestamp, where
} from "firebase/firestore";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

interface Attendee {
  id: string;
  attendeeName?: string;
  name?: string;
  tier: "platinum" | "gold" | "silver" | "staff" | "security" | "medical" | "vip";
  position?: { x: number; y: number };
  status?: string;
}

interface ChatMessage {
    id: string;
    text: string;
    sender: "organizer" | "vip";
    createdAt: any;
}

// Staff management will be loaded from Firestore

const tierColors: Record<string, string> = {
  platinum: "bg-purple-500 shadow-[0_0_10px_#a855f7]",
  gold: "bg-yellow-500 shadow-[0_0_10px_#eab308]",
  silver: "bg-slate-400 shadow-[0_0_5px_#94a3b8]",
  staff: "bg-blue-500",
  security: "bg-red-600 border-2 border-white shadow-[0_0_10px_#dc2626]",
  medical: "bg-green-500 animate-pulse border-2 border-white",
  vip: "bg-pink-500 border-2 border-white shadow-[0_0_15px_#ec4899] animate-bounce"
};

const OrganizerDashboard = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Attendee[]>([]);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [violations, setViolations] = useState<string[]>([]);
  const [sosAlerts, setSosAlerts] = useState<string[]>([]);
  
  // Tech & Merch States
  const [merchQueue, setMerchQueue] = useState({ length: 12, waitTime: "5 min", sales: 45000 });

  // Chat & VIP States
  const [selectedVip, setSelectedVip] = useState<Attendee | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Staff Management States
  const [staff, setStaff] = useState<Attendee[]>([]);
  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);
  const [selectedStaffType, setSelectedStaffType] = useState<"security" | "medical" | null>(null);
  const [staffName, setStaffName] = useState("");
  const [clickedPosition, setClickedPosition] = useState<{ x: number; y: number } | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  // 0. Check user and event access
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/auth");
        return;
      }
      
      setUser(currentUser);
      
      // Check if user is organizer and has event
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (!userDoc.exists() || userDoc.data().role !== "organizer") {
        navigate("/auth");
        return;
      }
      
      const userData = userDoc.data();
      if (!userData.currentEventId) {
        // No event assigned, redirect to team selection
        navigate("/organizer-team-selection");
        return;
      }
      
      setCurrentEventId(userData.currentEventId);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [navigate]);

  // 1. Fetch Data - Filter by event
  useEffect(() => {
    if (!currentEventId || !user) return;
    
    // First get event details to find concertId
    const eventDocRef = doc(db, "events", currentEventId);
    getDoc(eventDocRef).then(eventDoc => {
      if (!eventDoc.exists()) return;
      
      const eventData = eventDoc.data();
      const concertId = eventData.eventId;
      
      // Verify organizer has access to this event (check if organizer is in organizers array)
      const organizers = eventData.organizers || [];
      if (!organizers.includes(user.uid)) {
        console.warn("Organizer does not have access to this event");
        return;
      }
        
        // Fetch only active tickets (status: 'used') for this organizer's specific event
        // This ensures organizers can ONLY see tickets from their own event
        const qTickets = query(
          collection(db, "tickets"),
          where("concertId", "==", concertId),
          where("status", "==", "used")
        );
        
        const unsubTickets = onSnapshot(qTickets, (snap) => {
          const attendeesList: Attendee[] = [];
          snap.forEach((d) => {
            const data = d.data();
            
            // Double validation: Only process tickets with status 'used' (active/inside)
            if (data.status !== 'used') {
              return;
            }
            
            // Double validation: Ensure ticket's concertId matches organizer's event
            // (This is redundant due to query filter, but adds extra security layer)
            if (data.concertId !== concertId) {
              console.warn("Ticket concertId mismatch - skipping", { ticketId: d.id, ticketConcertId: data.concertId, organizerConcertId: concertId });
              return;
            }
        
          // Use seat position if available - ensure people stay in their seat regions
          let position: { x: number; y: number };
          if (data.seat && data.seat.position) {
            // Use assigned seat position - keep people in their seat regions
            // Validate and ensure position is within tier boundaries
            const tier = data.tier || "silver";
            const seatPos = data.seat.position;
            
            // Tier-based position ranges (matching seat assignment logic)
            const tierRanges: Record<string, { x: { min: number; max: number }; y: { min: number; max: number } }> = {
              platinum: { x: { min: 30, max: 70 }, y: { min: 15, max: 35 } },
              gold: { x: { min: 20, max: 80 }, y: { min: 40, max: 65 } },
              silver: { x: { min: 10, max: 90 }, y: { min: 70, max: 95 } },
              vip: { x: { min: 85, max: 95 }, y: { min: 10, max: 40 } }
            };
            
            const range = tierRanges[tier] || tierRanges.silver;
            
            // Clamp position to tier boundaries if needed
            position = {
              x: Math.max(range.x.min, Math.min(range.x.max, seatPos.x || 50)),
              y: Math.max(range.y.min, Math.min(range.y.max, seatPos.y || 50))
            };
          } else if (data.location) {
            // Fall back to GPS-based position if no seat assigned
            // Position based on tier for unassigned seats
            const tier = data.tier || "silver";
            const tierRanges: Record<string, { x: { min: number; max: number }; y: { min: number; max: number } }> = {
              platinum: { x: { min: 30, max: 70 }, y: { min: 15, max: 35 } },
              gold: { x: { min: 20, max: 80 }, y: { min: 40, max: 65 } },
              silver: { x: { min: 10, max: 90 }, y: { min: 70, max: 95 } },
              vip: { x: { min: 85, max: 95 }, y: { min: 10, max: 40 } }
            };
            
            const range = tierRanges[tier] || tierRanges.silver;
            const xCenter = (range.x.min + range.x.max) / 2;
            const yCenter = (range.y.min + range.y.max) / 2;
            
            // Use GPS location but clamp to tier zone
            const x = (Math.abs(data.location.lng * 1000) % (range.x.max - range.x.min)) + range.x.min;
            const y = (Math.abs(data.location.lat * 1000) % (range.y.max - range.y.min)) + range.y.min;
            position = { x, y };
          } else {
            // Default position in tier center if neither seat nor location available
            const tier = data.tier || "silver";
            const tierRanges: Record<string, { x: { min: number; max: number }; y: { min: number; max: number } }> = {
              platinum: { x: { min: 30, max: 70 }, y: { min: 15, max: 35 } },
              gold: { x: { min: 20, max: 80 }, y: { min: 40, max: 65 } },
              silver: { x: { min: 10, max: 90 }, y: { min: 70, max: 95 } },
              vip: { x: { min: 85, max: 95 }, y: { min: 10, max: 40 } }
            };
            
            const range = tierRanges[tier] || tierRanges.silver;
            position = {
              x: (range.x.min + range.x.max) / 2,
              y: (range.y.min + range.y.max) / 2
            };
          }

          attendeesList.push({
            id: d.id,
            attendeeName: data.attendeeName || "Unknown Guest",
            tier: data.tier || "silver",
            position: position,
            status: data.status || "active"
          });
        });
        
        // Merge staff with attendees (staff is fetched separately in useEffect)
        const mergedList = [...staff, ...attendeesList];
        setPeople(mergedList);
        checkViolations(mergedList);
      });

      return () => unsubTickets();
    });
  }, [currentEventId, user, staff]);

  // 1.5. Fetch Staff for this event
  useEffect(() => {
    if (!currentEventId) return;
    
    const qStaff = query(
      collection(db, "staff"),
      where("eventId", "==", currentEventId),
      where("status", "==", "active")
    );
    
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      const staffList: Attendee[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.status === "active") {
          staffList.push({
            id: d.id,
            name: data.name,
            tier: data.tier as "security" | "medical",
            position: data.position || { x: 50, y: 50 },
            status: data.status || "active"
          });
        }
      });
      setStaff(staffList);
    });
    
    return () => unsubStaff();
  }, [currentEventId]);

  // 2. Chat Listener
  useEffect(() => {
    if (!selectedVip) return;

    const qChat = query(
        collection(db, "messages"), 
        where("ticketId", "==", selectedVip.id),
        orderBy("createdAt", "asc")
    );

    const unsubChat = onSnapshot(qChat, (snap) => {
        const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        setChatMessages(msgs);
        setTimeout(() => chatScrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsubChat();
  }, [selectedVip]);

  const checkViolations = (currentList: Attendee[]) => {
    const newViolations: string[] = [];
    currentList.forEach(person => {
      if (!person.position || ['security', 'medical', 'vip', 'staff'].includes(person.tier)) return;

      const { x, y } = person.position;
      // Define Zone Boundaries for Alerts
      const inPlatinum = x > 25 && x < 75 && y > 10 && y < 40;
      const inGold = x > 15 && x < 85 && y >= 40 && y < 70;
      
      if (person.tier === 'silver' && (inPlatinum || inGold)) {
          newViolations.push(`${person.attendeeName} (Silver) in Restricted Area`);
      }
    });
    if (newViolations.length > 0 && newViolations.length !== violations.length) setViolations(newViolations);
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
  };

  const markAsVIP = async (ticketId: string) => {
    try {
        const ticketRef = doc(db, "tickets", ticketId);
        await updateDoc(ticketRef, { tier: "vip" });
        toast({ title: "User Promoted!", description: "They are now a VIP. You can chat with them." });
    } catch (error) { console.error("Error promoting:", error); }
  };

  const sendChatMessage = async () => {
      if(!newMessage.trim() || !selectedVip) return;
      try {
          await addDoc(collection(db, "messages"), {
              ticketId: selectedVip.id,
              text: newMessage,
              sender: "organizer",
              createdAt: serverTimestamp()
          });
          setNewMessage("");
      } catch (e) { console.error("Send failed", e); }
  };

  // --- STAFF ASSIGNMENT FUNCTIONS ---
  
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAssignStaffOpen) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const position = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    setClickedPosition(position);
  };

  const assignStaff = async () => {
    if (!selectedStaffType || !staffName.trim() || !clickedPosition || !currentEventId) return;
    
    try {
      await addDoc(collection(db, "staff"), {
        eventId: currentEventId,
        name: staffName.trim(),
        tier: selectedStaffType,
        position: clickedPosition,
        status: "active",
        assignedAt: serverTimestamp(),
        assignedBy: user?.uid
      });
      
      toast({
        title: "Staff assigned!",
        description: `${staffName} (${selectedStaffType}) assigned to position.`,
      });
      
      setIsAssignStaffOpen(false);
      setSelectedStaffType(null);
      setStaffName("");
      setClickedPosition(null);
    } catch (error) {
      console.error("Error assigning staff:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to assign staff.",
      });
    }
  };

  const removeStaff = async (staffId: string) => {
    try {
      // Delete staff document
      await updateDoc(doc(db, "staff", staffId), {
        status: "inactive"
      });
      
      toast({
        title: "Staff removed",
        description: "Staff member has been removed from the map.",
      });
    } catch (error) {
      console.error("Error removing staff:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove staff.",
      });
    }
  };

  const filteredPeople = people.filter((p) => {
    const name = p.attendeeName || p.name || "";
    const matchesRole = filterRole === "all" || p.tier === filterRole;
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link to="/"><Button variant="ghost" size="icon" className="text-slate-400"><ArrowLeft className="w-5 h-5" /></Button></Link>
              <div><h1 className="text-2xl font-bold">Organizer Command Center</h1><p className="text-sm text-slate-400">Crowd Safety & Live Ops</p></div>
            </div>
            <div className="flex gap-2">
                <Button 
                    onClick={() => setIsAssignStaffOpen(true)} 
                    variant="outline" 
                    className="border-green-700 text-green-400 hover:bg-green-600 hover:text-white"
                >
                    <Plus className="w-4 h-4 mr-2" /> Assign Staff
                </Button>
                <Button onClick={simulateMovement} variant="outline" className="border-slate-700 text-slate-300"><RefreshCw className="w-4 h-4 mr-2" /> Simulate</Button>
                <Link to="/scanner"><Button className="bg-indigo-600 hover:bg-indigo-700"><QrCode className="w-4 h-4 mr-2" /> Scan Ticket</Button></Link>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid lg:grid-cols-4 gap-6 h-[calc(100vh-80px)]">
        
        {/* LEFT COLUMN: MAP & ALERTS */}
        <div className="lg:col-span-3 space-y-6 h-full overflow-y-auto pr-2">
            
            <AnimatePresence>
                {sosAlerts.length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="bg-red-950 border border-red-500 rounded-lg p-4 flex items-center gap-4 animate-pulse">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                        <div><h3 className="text-red-500 font-bold text-lg">EMERGENCY SOS ACTIVE</h3><p className="text-red-300">{sosAlerts[0]}</p></div>
                        <Button variant="destructive" size="sm" onClick={() => setSosAlerts([])}>Resolve</Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN MAP */}
            <Card className="border-slate-800 bg-slate-900 shadow-xl overflow-hidden min-h-[500px]">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 py-3">
                    <CardTitle className="flex items-center gap-2 text-white text-base"><MapPin className="w-4 h-4 text-indigo-400" /> Venue Map</CardTitle>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="text-purple-400 border-purple-900 bg-purple-900/20">Platinum</Badge>
                        <Badge variant="outline" className="text-yellow-400 border-yellow-900 bg-yellow-900/20">Gold</Badge>
                        <Badge variant="outline" className="text-slate-400 border-slate-900 bg-slate-900/20">Silver</Badge>
                        <Badge variant="outline" className="text-pink-400 border-pink-900 bg-pink-900/20">VIP Box</Badge>
                    </div>
                </CardHeader>
                <CardContent 
                    className="p-0 relative h-[500px] bg-black cursor-crosshair"
                    onClick={isAssignStaffOpen ? handleMapClick : undefined}
                >
                    {/* ZONES OVERLAY */}
                    <div className="absolute inset-0 pointer-events-none opacity-30">
                        {/* Stage */}
                        <div className="absolute top-0 left-1/3 right-1/3 h-12 bg-slate-800 border-b-2 border-slate-600 flex items-center justify-center"><span className="text-xs font-bold text-white tracking-[0.5em]">STAGE</span></div>
                        
                        {/* Platinum Zone (Front) */}
                        <div className="absolute top-[12%] left-[25%] right-[25%] h-[25%] border-2 border-dashed border-purple-500 bg-purple-900/20 flex items-center justify-center">
                            <span className="text-purple-300 font-bold text-xs">PLATINUM</span>
                        </div>

                        {/* Gold Zone (Middle) */}
                        <div className="absolute top-[40%] left-[15%] right-[15%] h-[30%] border-2 border-dashed border-yellow-500 bg-yellow-900/20 flex items-center justify-center">
                            <span className="text-yellow-300 font-bold text-xs">GOLD</span>
                        </div>

                        {/* Silver Zone (Back) */}
                        <div className="absolute bottom-[5%] left-[10%] right-[10%] h-[20%] border-2 border-dashed border-slate-500 bg-slate-900/20 flex items-center justify-center">
                            <span className="text-slate-300 font-bold text-xs">SILVER</span>
                        </div>

                        {/* VIP Box (Side) */}
                        <div className="absolute top-[10%] right-[5%] w-[15%] h-[40%] border-2 border-double border-pink-500 bg-pink-900/30 flex items-center justify-center">
                             <span className="text-pink-300 font-bold text-xs rotate-90">VIP BOX</span>
                        </div>
                    </div>

                    {/* PEOPLE DOTS */}
                    {filteredPeople.map((p) => (
                        <motion.div
                            key={p.id}
                            layout
                            initial={{ scale: 0 }}
                            animate={{ scale: p.tier === 'vip' ? 1.5 : 1, left: `${p.position?.x}%`, top: `${p.position?.y}%` }}
                            transition={{ type: "spring", damping: 20 }}
                            className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full ${tierColors[p.tier] || "bg-white"} cursor-pointer z-10 hover:z-50 border border-black/50`}
                            title={`${p.attendeeName || p.name || "Unknown"} (${p.tier})`}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent map click when clicking on person
                                if(p.tier === 'vip') setSelectedVip(p);
                                else if(['security', 'medical'].includes(p.tier) && p.id) {
                                    // Allow removing staff
                                    if(confirm(`Remove ${p.name} from the map?`)) {
                                        removeStaff(p.id);
                                    }
                                } else {
                                    toast({ title: p.attendeeName || p.name, description: `Status: ${p.tier.toUpperCase()}` });
                                }
                            }}
                        >
                            {p.tier === 'vip' && <Crown className="w-4 h-4 text-yellow-400 absolute -top-4 -left-0.5 drop-shadow-md" />}
                            {p.tier === 'security' && <Shield className="w-3 h-3 text-white absolute -top-3 -left-1" />}
                            {p.tier === 'medical' && <Heart className="w-3 h-3 text-white absolute -top-3 -left-1" />}
                        </motion.div>
                    ))}
                </CardContent>
            </Card>

            {/* RESTORED TECH STATUS CARDS */}
            <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-full text-blue-400"><Speaker className="w-5 h-5" /></div>
                            <div><p className="font-bold text-white">Sound</p><p className="text-xs text-slate-400">Line Array: OK</p></div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-full text-yellow-400"><Zap className="w-5 h-5" /></div>
                            <div><p className="font-bold text-white">Lights</p><p className="text-xs text-slate-400">DMX: 100%</p></div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-full text-purple-400"><Wifi className="w-5 h-5" /></div>
                            <div><p className="font-bold text-white">Stream</p><p className="text-xs text-slate-400">6000kbps</p></div>
                        </div>
                        <Activity className="w-5 h-5 text-green-500 animate-pulse" />
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* RIGHT COLUMN: LISTS & CHAT */}
        <div className="space-y-6 h-full flex flex-col">
            
            {/* VIP CHAT WINDOW */}
            <AnimatePresence mode="wait">
                {selectedVip ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="flex-1 flex flex-col">
                        <Card className="bg-slate-900 border-pink-500/50 flex-1 flex flex-col shadow-[0_0_20px_rgba(236,72,153,0.1)]">
                            <CardHeader className="pb-3 border-b border-slate-800 bg-pink-950/20 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Crown className="w-5 h-5 text-yellow-400" />
                                    <div><CardTitle className="text-sm font-bold text-white">{selectedVip.attendeeName}</CardTitle><p className="text-[10px] text-pink-300">VIP Direct Line</p></div>
                                </div>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSelectedVip(null)}><X className="w-4 h-4" /></Button>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/50">
                                {chatMessages.length === 0 && <p className="text-center text-xs text-slate-500 mt-4">Start a conversation...</p>}
                                {chatMessages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.sender === 'organizer' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-2 rounded-lg text-xs ${msg.sender === 'organizer' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>{msg.text}</div>
                                    </div>
                                ))}
                                <div ref={chatScrollRef} />
                            </CardContent>
                            <CardFooter className="p-2 border-t border-slate-800 bg-slate-900">
                                <form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }}>
                                    <Input placeholder="Message VIP..." className="h-8 bg-slate-950 border-slate-700 text-xs" value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                                    <Button type="submit" size="icon" className="h-8 w-8 bg-pink-600 hover:bg-pink-700"><Send className="w-3 h-3" /></Button>
                                </form>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ) : (
                    <Card className="bg-slate-900 border-slate-800 flex-1 flex flex-col min-h-0">
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2"><Users className="w-4 h-4" /> Guest & Staff List</CardTitle></CardHeader>
                        <div className="px-4 pb-2"><Input placeholder="Search..." className="bg-slate-950 border-slate-800 h-8 text-xs" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                        <CardContent className="flex-1 overflow-y-auto space-y-2 p-2">
                            {filteredPeople.map((p) => (
                                <div key={p.id} className="bg-slate-950 p-2 rounded flex items-center justify-between group hover:bg-slate-800 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${tierColors[p.tier] || 'bg-slate-500'}`}></div>
                                        <div><p className="text-xs font-bold text-white">{p.attendeeName || p.name}</p><p className="text-[10px] text-slate-500 capitalize">{p.tier}</p></div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!['vip','staff','security','medical'].includes(p.tier) && (
                                            <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-yellow-400 hover:bg-yellow-400/10" onClick={() => markAsVIP(p.id)} title="Promote to VIP"><Crown className="w-3 h-3" /></Button>
                                        )}
                                        {p.tier === 'vip' && (
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-pink-400 hover:bg-pink-400/10" onClick={() => setSelectedVip(p)} title="Open Chat"><MessageSquare className="w-3 h-3" /></Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </AnimatePresence>

            {/* MERCH STATS */}
            <Card className="bg-slate-900 border-slate-800 shrink-0">
                <CardContent className="p-4 flex justify-between items-center">
                    <div><p className="text-xs text-slate-400">Merch Sales</p><p className="text-xl font-bold text-white">₹{merchQueue.sales.toLocaleString()}</p></div>
                    <ShoppingBag className="w-8 h-8 text-indigo-500 opacity-50" />
                </CardContent>
            </Card>

        </div>
      </main>

      {/* STAFF ASSIGNMENT DIALOG */}
      <Dialog open={isAssignStaffOpen} onOpenChange={setIsAssignStaffOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Assign Staff to Location</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select staff type, enter name, then click on the map to position them
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Staff Type</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => setSelectedStaffType("security")}
                  variant={selectedStaffType === "security" ? "default" : "outline"}
                  className={selectedStaffType === "security" ? "bg-red-600 hover:bg-red-700" : "border-slate-700"}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Security
                </Button>
                <Button
                  type="button"
                  onClick={() => setSelectedStaffType("medical")}
                  variant={selectedStaffType === "medical" ? "default" : "outline"}
                  className={selectedStaffType === "medical" ? "bg-green-600 hover:bg-green-700" : "border-slate-700"}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Medical
                </Button>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Staff Name</label>
              <Input
                placeholder="Enter staff name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>
            
            {clickedPosition && (
              <div className="bg-slate-800 p-3 rounded-lg">
                <p className="text-xs text-slate-400">Selected Position:</p>
                <p className="text-sm text-white">X: {clickedPosition.x.toFixed(1)}%, Y: {clickedPosition.y.toFixed(1)}%</p>
              </div>
            )}
            
            <p className="text-xs text-slate-500">
              {clickedPosition 
                ? "Click 'Assign Staff' to confirm, or click on the map to change position"
                : "Click anywhere on the map to set the position"}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignStaffOpen(false);
                setSelectedStaffType(null);
                setStaffName("");
                setClickedPosition(null);
              }}
              className="border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={assignStaff}
              disabled={!selectedStaffType || !staffName.trim() || !clickedPosition}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
