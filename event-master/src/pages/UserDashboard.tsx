import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";
import { 
  MapPin, Calendar, Ticket, LogOut, User, 
  Loader2, History, Crown, Star, Shield, CreditCard, CheckCircle,
  Users, UserPlus, Bell, Navigation, Check, X, MessageSquare, Send,
  DollarSign, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { 
  collection, addDoc, query, where, getDocs, 
  doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, orderBy, serverTimestamp 
} from "firebase/firestore";

// --- IMAGES ---
import eventElectronic from "../assets/event-electronic.jpg";
import eventRock from "../assets/event-rock.jpg";
import eventClassical from "../assets/event-classical.jpg";

// --- MOCK DATA ---
const upcomingConcerts = [
  { id: "c1", name: "Summer Vibes Festival", date: "2026-07-15", location: "Central Park Arena", image: eventElectronic, basePrice: 100 },
  { id: "c2", name: "Neon Dreams Tour", date: "2026-08-20", location: "Metropolis Stadium", image: eventRock, basePrice: 80 },
  { id: "c3", name: "Royal Symphony", date: "2027-01-15", location: "Grand Opera House", image: eventClassical, basePrice: 150 },
];

const tiers = {
  vip: { label: "VIP GUEST", multiplier: 3.0, color: "bg-pink-600 border-pink-400 animate-pulse", border: "border-pink-500", icon: Crown },
  platinum: { label: "Platinum", multiplier: 2.5, color: "bg-purple-600", border: "border-purple-600", icon: Crown },
  gold: { label: "Gold", multiplier: 1.5, color: "bg-yellow-500", border: "border-yellow-500", icon: Star },
  silver: { label: "Silver", multiplier: 1.0, color: "bg-slate-400", border: "border-slate-400", icon: Shield },
};

const UserDashboard = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [tickets, setTickets] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [ticketsForSale, setTicketsForSale] = useState<any[]>([]);
  
  // View States
  const [friendsAtSameConcert, setFriendsAtSameConcert] = useState<any[]>([]);
  const [viewTicketId, setViewTicketId] = useState<string | null>(null);

  // VIP Chat States
  const [isVipChatOpen, setIsVipChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Derived State
  const activeTicket = useMemo(() => tickets.find(t => t.id === viewTicketId), [tickets, viewTicketId]);

  // Notification Ref
  const notifiedConcerts = useRef(new Set<string>()); 

  // Interaction States
  const [friendEmailSearch, setFriendEmailSearch] = useState("");
  const [selectedConcert, setSelectedConcert] = useState<any | null>(null);
  const [selectedTier, setSelectedTier] = useState<"platinum" | "gold" | "silver" | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"select" | "pay" | "success">("select");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // 1. MAIN INITIALIZATION
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/auth");
        return;
      }
      setUser(currentUser);
      
      try {
        await syncUserProfile(currentUser);

        // User Data Listener
        const userDocRef = doc(db, "users", currentUser.uid);
        const unsubUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                fetchFriendDetails(data.friends || []);
                fetchRequestDetails(data.friendRequests || []);
            }
        });

        // Ticket Listener
        const qTickets = query(collection(db, "tickets"), where("userId", "==", currentUser.uid));
        const unsubTickets = onSnapshot(qTickets, async (snap) => {
            const userTickets = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            
            const sortedTickets = userTickets.sort((a: any, b: any) => {
                const dateA = new Date(a.eventDate);
                const dateB = new Date(b.eventDate);
                return dateB.getTime() - dateA.getTime();
            });

            setTickets(sortedTickets);
            
            // Fetch location only if user has an active ticket (status: 'used' or event is today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const hasActiveTicket = sortedTickets.some((ticket: any) => {
              const eventDate = new Date(ticket.eventDate);
              eventDate.setHours(0, 0, 0, 0);
              return ticket.status === 'used' || eventDate.getTime() === today.getTime();
            });
            
            if (hasActiveTicket) {
              updateMyLocation(currentUser.uid);
            }
        });

        setLoading(false);
        return () => { unsubUser(); unsubTickets(); };

      } catch (error) {
        console.error("Init Error:", error);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. WATCH ACTIVE TICKET & VIP CHAT
  useEffect(() => {
    if (!activeTicket || !user) {
        setFriendsAtSameConcert([]);
        return;
    }

    // A. Map Logic (Only if used)
    if (activeTicket.status === 'used') {
        findFriendsAtConcert(activeTicket.concertId, user.uid);
        
        if (friendsAtSameConcert.length > 0 && !notifiedConcerts.current.has(activeTicket.concertId)) {
            toast({
                title: "Friends Detected! 🎉",
                description: `${friendsAtSameConcert.length} friends are also at this concert!`,
                className: "bg-emerald-900 border-emerald-500 text-white"
            });
            notifiedConcerts.current.add(activeTicket.concertId);
        }
    } else {
        setFriendsAtSameConcert([]); 
    }

    // B. VIP Chat Listener (Only if VIP)
    if (activeTicket.tier === 'vip') {
        const qChat = query(
            collection(db, "messages"), 
            where("ticketId", "==", activeTicket.id),
            orderBy("createdAt", "asc")
        );
        const unsubChat = onSnapshot(qChat, (snap) => {
            const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setChatMessages(msgs);
            setTimeout(() => chatScrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        });
        return () => unsubChat();
    }

  }, [activeTicket, user, toast, friendsAtSameConcert.length]);

  // --- LOCATION & PROFILE ---
  const syncUserProfile = async (u: FirebaseUser) => {
    const userRef = doc(db, "users", u.uid);
    await setDoc(userRef, { email: u.email, displayName: u.displayName || "User", lastLogin: new Date().toISOString() }, { merge: true });
  };

  const updateMyLocation = (uid: string) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          await updateDoc(doc(db, "users", uid), { currentLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() } });
        } catch (e) { console.error("Loc Update Fail", e); }
      });
    }
  };

  // --- VIP CHAT LOGIC ---
  const sendVipMessage = async () => {
      if(!chatInput.trim() || !activeTicket) return;
      try {
          await addDoc(collection(db, "messages"), {
              ticketId: activeTicket.id,
              text: chatInput,
              sender: "vip",
              createdAt: serverTimestamp()
          });
          setChatInput("");
      } catch(e) { console.error(e); }
  };

  // --- TICKET STATUS HELPER ---
  const getTicketStatus = (ticket: any) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const eventDate = new Date(ticket.eventDate);
    eventDate.setHours(0,0,0,0);

    if (ticket.status === 'used') {
        if (eventDate < today) return { label: "ATTENDED", color: "bg-slate-700 text-slate-400 border-slate-600", style: "opacity-60 grayscale" };
        return { label: "ACTIVE (INSIDE)", color: "bg-emerald-600 border-emerald-500 text-white animate-pulse shadow-[0_0_10px_#10b981]" };
    }
    if (eventDate < today) return { label: "EXPIRED", color: "bg-slate-700 text-slate-400 border-slate-600", style: "opacity-60 grayscale" };
    if (eventDate.getTime() === today.getTime()) return { label: "HAPPENING TODAY", color: "bg-blue-600 text-white border-blue-400 animate-bounce" };
    return { label: "UPCOMING", color: "bg-indigo-600 text-white border-indigo-400" };
  };

  // --- FRIEND LOGIC ---
  const fetchFriendDetails = async (friendIds: string[]) => {
    if (friendIds.length === 0) { setFriends([]); return; }
    const promises = friendIds.map(id => getDoc(doc(db, "users", id)));
    const docs = await Promise.all(promises);
    setFriends(docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchRequestDetails = async (requestIds: string[]) => {
    if (requestIds.length === 0) { setFriendRequests([]); return; }
    const promises = requestIds.map(id => getDoc(doc(db, "users", id)));
    const docs = await Promise.all(promises);
    setFriendRequests(docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const sendFriendRequest = async () => {
    if(!friendEmailSearch) return;
    try {
        const q = query(collection(db, "users"), where("email", "==", friendEmailSearch));
        const snap = await getDocs(q);
        if(snap.empty) { toast({ variant: "destructive", title: "User not found" }); return; }
        const targetId = snap.docs[0].id;
        if(targetId === user?.uid) { toast({ variant: "destructive", title: "Cannot add yourself" }); return; }
        await updateDoc(doc(db, "users", targetId), { friendRequests: arrayUnion(user?.uid) });
        toast({ title: "Request Sent!", description: "Waiting for them to accept." });
        setFriendEmailSearch("");
    } catch(e) { console.error(e); }
  };

  const acceptFriendRequest = async (requesterId: string) => {
    if(!user) return;
    try {
        await updateDoc(doc(db, "users", user.uid), { friends: arrayUnion(requesterId), friendRequests: arrayRemove(requesterId) });
        await updateDoc(doc(db, "users", requesterId), { friends: arrayUnion(user.uid) });
        toast({ title: "Friend Added!", description: "You are now connected." });
    } catch(e) { console.error(e); }
  };

  const rejectFriendRequest = async (requesterId: string) => {
    if(!user) return;
    await updateDoc(doc(db, "users", user.uid), { friendRequests: arrayRemove(requesterId) });
  };

  const findFriendsAtConcert = async (concertId: string, myUid: string) => {
    const myDoc = await getDoc(doc(db, "users", myUid));
    const friendIds = myDoc.data()?.friends || [];
    if(friendIds.length === 0) return;

    const q = query(
        collection(db, "tickets"), 
        where("concertId", "==", concertId),
        where("status", "==", "used"),
        where("userId", "in", friendIds)
    );

    const snap = await getDocs(q);
    const friendsWithTickets = snap.docs.map(d => d.data());
    
    const friendsOnMap = [];
    for(const t of friendsWithTickets) {
        const uSnap = await getDoc(doc(db, "users", t.userId));
        if(uSnap.exists()) {
            friendsOnMap.push({ id: t.userId, name: uSnap.data().displayName, location: uSnap.data().currentLocation });
        }
    }
    setFriendsAtSameConcert(prev => (JSON.stringify(prev) === JSON.stringify(friendsOnMap) ? prev : friendsOnMap));
  };

  // --- PAYMENT ---
  const initiatePurchase = (concert: any) => {
    setSelectedConcert(concert);
    setSelectedTier(null);
    setPaymentStep("select");
    setIsModalOpen(true);
  };
  const proceedToPayment = () => { if(selectedTier) setPaymentStep("pay"); };
  
  // Helper function to assign seat based on tier
  const assignSeat = (tier: string, concertId: string): { section: string; row: number; seat: number; position: { x: number; y: number } } => {
    // Seat assignment based on tier
    const seatConfigs: Record<string, { section: string; rows: number; seatsPerRow: number; position: { x: { min: number; max: number }; y: { min: number; max: number } } }> = {
      platinum: { section: "A", rows: 5, seatsPerRow: 10, position: { x: { min: 30, max: 70 }, y: { min: 15, max: 35 } } },
      gold: { section: "B", rows: 10, seatsPerRow: 15, position: { x: { min: 20, max: 80 }, y: { min: 40, max: 65 } } },
      silver: { section: "C", rows: 15, seatsPerRow: 20, position: { x: { min: 10, max: 90 }, y: { min: 70, max: 95 } } },
      vip: { section: "VIP", rows: 2, seatsPerRow: 6, position: { x: { min: 85, max: 95 }, y: { min: 10, max: 40 } } }
    };
    
    const config = seatConfigs[tier] || seatConfigs.silver;
    
    // Generate seat number based on concertId and tier for consistency
    const seed = parseInt(concertId.replace(/\D/g, '')) || 0;
    const row = (seed % config.rows) + 1;
    const seat = (seed % config.seatsPerRow) + 1;
    
    // Calculate position within the tier zone
    const xRange = config.position.x.max - config.position.x.min;
    const yRange = config.position.y.max - config.position.y.min;
    const x = config.position.x.min + ((seed % 100) / 100) * xRange;
    const y = config.position.y.min + ((seed % 1000) / 1000) * yRange;
    
    return {
      section: config.section,
      row,
      seat,
      position: { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
    };
  };

  const confirmPayment = async () => {
    if (!user || !selectedConcert || !selectedTier) return;
    setIsProcessing(true);
    if (!navigator.geolocation) { toast({ variant: "destructive", title: "Location required" }); setIsProcessing(false); return; }

    navigator.geolocation.getCurrentPosition(async (position) => {
        try {
            const finalPrice = Math.round(selectedConcert.basePrice * tiers[selectedTier].multiplier);
            
            // Assign seat based on tier
            const seatAssignment = assignSeat(selectedTier, selectedConcert.id);
            
            await addDoc(collection(db, "tickets"), {
                userId: user.uid,
                attendeeName: user.displayName || user.email,
                concertId: selectedConcert.id,
                concertName: selectedConcert.name,
                eventDate: selectedConcert.date, 
                tier: selectedTier,
                price: finalPrice,
                status: 'valid', 
                purchaseDate: new Date().toISOString(),
                location: { lat: position.coords.latitude, lng: position.coords.longitude },
                seat: seatAssignment
            });
            setPaymentStep("success");
            toast({ 
              title: "Success!", 
              description: `Ticket saved! Seat: ${seatAssignment.section}-${seatAssignment.row}-${seatAssignment.seat}` 
            });
        } catch (e) { console.error(e); } 
        finally { setIsProcessing(false); }
    });
  };

  const handleTicketSelect = (ticketId: string) => {
      setFriendsAtSameConcert([]);
      setViewTicketId(ticketId);
  };

  // --- TICKET RESALE FUNCTIONS ---
  
  // Mark ticket for sale and notify friends
  const putTicketForSale = async (ticketId: string) => {
    if (!user) return;
    
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return;
      
      // Check if ticket is upcoming
      const eventDate = new Date(ticket.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);
      
      if (eventDate <= today) {
        toast({
          variant: "destructive",
          title: "Cannot sell ticket",
          description: "You can only sell upcoming tickets.",
        });
        return;
      }
      
      // Update ticket to forSale status
      await updateDoc(doc(db, "tickets", ticketId), {
        forSale: true,
        saleDate: serverTimestamp()
      });
      
      // Notify all friends
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const friendIds = userDoc.data()?.friends || [];
      
      if (friendIds.length > 0) {
        // Create notification object (without serverTimestamp - use ISO string instead)
        const notification = {
          ticketId: ticketId,
          sellerId: user.uid,
          sellerName: user.displayName || user.email || "Unknown",
          concertName: ticket.concertName || "Unknown Event",
          eventDate: ticket.eventDate || "",
          tier: ticket.tier || "silver",
          price: ticket.price || 0,
          createdAt: new Date().toISOString()
        };
        
        // Create notifications for each friend
        const notificationPromises = friendIds.map(async (friendId: string) => {
          await updateDoc(doc(db, "users", friendId), {
            ticketNotifications: arrayUnion(notification)
          });
        });
        
        await Promise.all(notificationPromises);
      }
      
      toast({
        title: "Ticket listed for sale!",
        description: `${friendIds.length} friend${friendIds.length !== 1 ? 's' : ''} notified.`,
      });
      
    } catch (error) {
      console.error("Error putting ticket for sale:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to list ticket for sale.",
      });
    }
  };

  // Cancel ticket sale
  const cancelTicketSale = async (ticketId: string) => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, "tickets", ticketId), {
        forSale: false,
        saleDate: null
      });
      
      toast({
        title: "Sale cancelled",
        description: "Ticket is no longer for sale.",
      });
    } catch (error) {
      console.error("Error cancelling ticket sale:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel sale.",
      });
    }
  };

  // Buy ticket from friend
  const buyTicketFromFriend = async (notification: any) => {
    if (!user) return;
    
    try {
      const ticketRef = doc(db, "tickets", notification.ticketId);
      const ticketDoc = await getDoc(ticketRef);
      
      if (!ticketDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Ticket not found",
          description: "This ticket is no longer available.",
        });
        return;
      }
      
      const ticketData = ticketDoc.data();
      
      // Check if ticket is still for sale
      if (!ticketData.forSale || ticketData.userId !== notification.sellerId) {
        toast({
          variant: "destructive",
          title: "Ticket no longer available",
          description: "This ticket is no longer for sale.",
        });
        return;
      }
      
      // Transfer ticket to buyer
      await updateDoc(ticketRef, {
        userId: user.uid,
        attendeeName: user.displayName || user.email,
        forSale: false,
        saleDate: null,
        transferredAt: serverTimestamp(),
        originalOwner: notification.sellerId
      });
      
      // Remove notification from user's notifications
      await updateDoc(doc(db, "users", user.uid), {
        ticketNotifications: arrayRemove(notification)
      });
      
      // Update seller's user document to remove from their tickets list
      // The ticket listener will automatically update when the userId changes
      
      toast({
        title: "Ticket purchased!",
        description: `You now own ${notification.concertName} ticket.`,
      });
      
    } catch (error) {
      console.error("Error buying ticket:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to purchase ticket.",
      });
    }
  };

  // Fetch tickets for sale from friends
  useEffect(() => {
    if (!user) return;
    
    const userDocRef = doc(db, "users", user.uid);
    const unsubNotifications = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const notifications = data.ticketNotifications || [];
        
        // Filter out notifications for tickets that are no longer for sale
        const validNotifications = [];
        for (const notif of notifications) {
          const ticketDoc = await getDoc(doc(db, "tickets", notif.ticketId));
          if (ticketDoc.exists()) {
            const ticketData = ticketDoc.data();
            if (ticketData.forSale && ticketData.userId === notif.sellerId) {
              validNotifications.push(notif);
            }
          }
        }
        
        setTicketsForSale(validNotifications);
        
        // Clean up invalid notifications
        if (validNotifications.length !== notifications.length) {
          await updateDoc(userDocRef, {
            ticketNotifications: validNotifications
          });
        }
      }
    });
    
    return () => unsubNotifications();
  }, [user]);

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 relative">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400"><User className="w-6 h-6" /></div>
            <div><h1 className="text-xl font-bold text-white">{user.displayName}</h1><p className="text-xs text-slate-400">Online</p></div>
        </div>
        <div className="flex items-center gap-4">
            <div className="relative"><Bell className="w-6 h-6 text-slate-400" />{friendRequests.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900"></span>}</div>
            <Button variant="ghost" onClick={() => signOut(auth)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20"><LogOut className="w-4 h-4 mr-2" /> Sign Out</Button>
        </div>
      </header>

      <Tabs defaultValue="concerts" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 text-slate-400 w-full md:w-auto grid grid-cols-4 md:flex">
          <TabsTrigger value="concerts">Events</TabsTrigger>
          <TabsTrigger value="tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="tickets-for-sale">
            For Sale {ticketsForSale.length > 0 && `(${ticketsForSale.length})`}
          </TabsTrigger>
          <TabsTrigger value="friends">Friends {friendRequests.length > 0 && "*"}</TabsTrigger>
        </TabsList>

        {/* --- EVENTS --- */}
        <TabsContent value="concerts" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingConcerts.map((concert) => (
              <motion.div key={concert.id} whileHover={{ y: -5 }} className="h-full">
                <Card className="overflow-hidden h-full flex flex-col border-slate-800 bg-slate-900 shadow-xl">
                  <div className="relative h-48 overflow-hidden">
                    <img src={concert.image} className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                    <div className="absolute bottom-4 left-4 text-white">
                        <p className="font-bold text-lg">{concert.name}</p>
                        <p className="text-sm text-slate-300 flex items-center gap-1"><MapPin className="w-3 h-3"/> {concert.location}</p>
                    </div>
                  </div>
                  <CardFooter className="pt-4"><Button onClick={() => initiatePurchase(concert)} className="w-full bg-indigo-600 hover:bg-indigo-700">Buy Ticket</Button></CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* --- TICKETS --- */}
        <TabsContent value="tickets">
          <div className="grid md:grid-cols-2 gap-6">
             {/* 1. VISUAL DISPLAY AREA */}
             <Card className="border-slate-800 bg-slate-900 overflow-hidden h-min min-h-[400px]">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-white flex items-center gap-2">
                                {activeTicket?.status === 'used' ? <Navigation className="w-5 h-5 text-emerald-400"/> : <Ticket className="w-5 h-5 text-indigo-400"/>} 
                                {activeTicket ? (activeTicket.status === 'used' ? "Live Venue Map" : "Ticket QR Code") : "Select Ticket"}
                            </CardTitle>
                            <CardDescription>
                                {activeTicket?.status === 'used' ? `${friendsAtSameConcert.length} friends detected inside.` : "Scan this code at the venue entry."}
                            </CardDescription>
                        </div>
                        {/* VIP CHAT BUTTON */}
                        {activeTicket?.tier === 'vip' && (
                            <Button size="sm" onClick={() => setIsVipChatOpen(true)} className="bg-pink-600 hover:bg-pink-700 animate-bounce">
                                <Crown className="w-4 h-4 mr-2 text-yellow-300" /> VIP Concierge
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex justify-center py-4 relative">
                    {!activeTicket ? (
                        <div className="text-center py-20 text-slate-600 w-full flex flex-col items-center border-2 border-dashed border-slate-800 rounded-xl">
                            <Ticket className="w-12 h-12 mb-2 opacity-50"/>
                            <span>Select a ticket from the list to view details.</span>
                        </div>
                    ) : activeTicket.status === 'used' ? (
                        // LIVE MAP
                        <div className="relative w-full h-[300px] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-slate-950"></div>
                            <div className="absolute top-0 left-1/3 right-1/3 h-12 bg-slate-800/50 border-b border-slate-700 flex items-center justify-center text-[10px] text-slate-500">STAGE</div>
                            
                            {/* User position based on seat */}
                            {activeTicket.seat && activeTicket.seat.position ? (
                                <div className="absolute w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981] animate-pulse z-20" style={{ top: `${activeTicket.seat.position.y}%`, left: `${activeTicket.seat.position.x}%` }}>
                                    <div className="absolute -top-7 -left-3 bg-emerald-900 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-700 font-bold">You ({activeTicket.seat.section}-{activeTicket.seat.row}-{activeTicket.seat.seat})</div>
                                </div>
                            ) : (
                                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981] animate-pulse z-20">
                                    <div className="absolute -top-7 -left-3 bg-emerald-900 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-700 font-bold">You</div>
                                </div>
                            )}
                            {friendsAtSameConcert.map((f, i) => {
                                // Try to get friend's ticket to find their seat position
                                const friendTicket = tickets.find(t => t.userId === f.id && t.concertId === activeTicket.concertId);
                                const friendPosition = friendTicket?.seat?.position || { 
                                    x: 50 + (Math.sin(i + 1) * 25), 
                                    y: 50 + (Math.cos(i + 1) * 25) 
                                };
                                return (
                                    <div key={f.id} className="absolute w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6] z-10" style={{ top: `${friendPosition.y}%`, left: `${friendPosition.x}%` }}>
                                        <div className="absolute -top-7 -left-3 bg-blue-900 text-blue-300 text-[10px] px-2 py-0.5 rounded border border-blue-700 whitespace-nowrap">{f.name}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // QR CODE
                        <div className="bg-white p-4 rounded-xl shadow-lg">
                            <QRCode value={JSON.stringify({ ticketId: activeTicket.id, userId: activeTicket.userId, tier: activeTicket.tier })} size={200} />
                        </div>
                    )}
                </CardContent>
             </Card>

             {/* 2. TICKET LIST */}
             <div className="space-y-4">
                <h3 className="font-bold text-slate-300 flex items-center gap-2"><History className="w-4 h-4"/> Your Tickets</h3>
                {tickets.length === 0 ? <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500">No tickets yet.</div> : (
                    tickets.map((ticket) => {
                        const status = getTicketStatus(ticket);
                        const isActive = activeTicket?.id === ticket.id;
                        const tierInfo = tiers[ticket.tier as keyof typeof tiers] || tiers.silver;
                        
                        return (
                            <div 
                                key={ticket.id} 
                                onClick={() => handleTicketSelect(ticket.id)}
                                className={`p-4 rounded-lg border transition-all cursor-pointer flex justify-between items-center
                                    ${isActive ? 'bg-slate-800 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'}
                                    ${status.style || ''}
                                `}
                            >
                                <div>
                                    <p className="font-bold text-white flex items-center gap-2">
                                        {ticket.concertName}
                                        {ticket.tier === 'vip' && <Crown className="w-4 h-4 text-yellow-400" />}
                                    </p>
                                    <div className="flex gap-2 items-center mt-1 flex-wrap">
                                        <p className="text-xs text-slate-400">{new Date(ticket.eventDate).toLocaleDateString()}</p>
                                        {ticket.seat && (
                                            <p className="text-xs text-slate-300 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                Seat: {ticket.seat.section}-{ticket.seat.row}-{ticket.seat.seat}
                                            </p>
                                        )}
                                        <Badge className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                                        {ticket.forSale && (
                                            <Badge className="bg-green-600 text-white text-[10px]">FOR SALE</Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <Badge className={`${tierInfo.color} text-white mb-1`}>{ticket.tier?.toUpperCase()}</Badge>
                                    {status.label === "UPCOMING" && !ticket.forSale && !ticket.status?.includes('used') && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                putTicketForSale(ticket.id);
                                            }}
                                            className="text-xs border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                                        >
                                            <DollarSign className="w-3 h-3 mr-1" />
                                            Sell
                                        </Button>
                                    )}
                                    {ticket.forSale && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                cancelTicketSale(ticket.id);
                                            }}
                                            className="text-xs border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                                        >
                                            Cancel Sale
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
             </div>
          </div>
        </TabsContent>

        {/* --- TICKETS FOR SALE --- */}
        <TabsContent value="tickets-for-sale">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-300 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Tickets from Friends ({ticketsForSale.length})
            </h3>
            {ticketsForSale.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                No tickets for sale from friends.
              </div>
            ) : (
              ticketsForSale.map((notification, index) => (
                <Card key={index} className="bg-slate-900 border-slate-800 border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="w-4 h-4 text-yellow-400" />
                          <p className="font-bold text-white">{notification.concertName}</p>
                          <Badge className="bg-green-600 text-white text-[10px]">FOR SALE</Badge>
                        </div>
                        <div className="space-y-1 text-sm text-slate-400">
                          <p>Selling by: <span className="text-white">{notification.sellerName}</span></p>
                          <p>Date: {new Date(notification.eventDate).toLocaleDateString()}</p>
                          <p>Tier: <span className="text-white uppercase">{notification.tier}</span></p>
                          <p className="text-green-400 font-bold">Price: ₹{notification.price}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => buyTicketFromFriend(notification)}
                        className="bg-green-600 hover:bg-green-700 text-white ml-4"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy Ticket
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* --- FRIENDS --- */}
        <TabsContent value="friends">
            <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-6">
                     <Card className="bg-slate-900 border-slate-800">
                        <CardHeader><CardTitle className="text-white text-base">Add Friend</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            <Input placeholder="Enter friend's email" className="bg-slate-950 border-slate-800 text-white" value={friendEmailSearch} onChange={(e) => setFriendEmailSearch(e.target.value)}/>
                            <Button onClick={sendFriendRequest} className="w-full bg-slate-800 hover:bg-slate-700"><UserPlus className="w-4 h-4 mr-2" /> Send Request</Button>
                        </CardContent>
                     </Card>
                     
                     {friendRequests.length > 0 && (
                         <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-yellow-500">
                            <CardHeader><CardTitle className="text-white text-base">Requests ({friendRequests.length})</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {friendRequests.map(req => (
                                    <div key={req.id} className="flex items-center justify-between bg-slate-950 p-2 rounded">
                                        <div className="text-sm"><p className="text-white font-bold">{req.displayName}</p><p className="text-xs text-slate-500">{req.email}</p></div>
                                        <div className="flex gap-1">
                                            <Button size="icon" className="h-7 w-7 bg-green-600 hover:bg-green-700" onClick={() => acceptFriendRequest(req.id)}><Check className="w-4 h-4" /></Button>
                                            <Button size="icon" className="h-7 w-7 bg-red-600 hover:bg-red-700" onClick={() => rejectFriendRequest(req.id)}><X className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                         </Card>
                     )}
                </div>
                <div className="md:col-span-2 grid gap-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Users className="w-5 h-5"/> My Friends</h3>
                    {friends.length === 0 ? <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">You have no friends yet.</div> : (
                        friends.map(friend => (
                            <div key={friend.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-300 font-bold">{friend.displayName?.[0] || "F"}</div>
                                    <div><p className="font-bold text-white">{friend.displayName}</p><p className="text-xs text-slate-400">{friend.email}</p></div>
                                </div>
                                <div className="text-right">
                                    {friend.currentLocation && <Badge variant="outline" className="text-green-400 border-green-900 bg-green-900/10 gap-1 mb-1"><MapPin className="w-3 h-3" /> Online</Badge>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </TabsContent>
      </Tabs>

      {/* --- PAYMENT MODAL --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader><DialogTitle>Secure Payment</DialogTitle><DialogDescription>Select your ticket tier and confirm purchase.</DialogDescription></DialogHeader>
          {paymentStep === 'select' && (
            <div className="grid md:grid-cols-2 gap-6 py-4">
                <div className="relative border border-slate-700 rounded-lg bg-black/50 h-[300px] p-4 flex flex-col items-center justify-end gap-2">
                    <button onClick={() => setSelectedTier("platinum")} className={`w-40 h-16 rounded-t-xl border font-bold text-xs ${selectedTier === 'platinum' ? 'bg-purple-900/50 border-purple-500' : 'border-slate-800'}`}>PLATINUM</button>
                    <button onClick={() => setSelectedTier("gold")} className={`w-52 h-14 border font-bold text-xs ${selectedTier === 'gold' ? 'bg-yellow-900/50 border-yellow-500' : 'border-slate-800'}`}>GOLD</button>
                    <button onClick={() => setSelectedTier("silver")} className={`w-full h-12 rounded-b-lg border font-bold text-xs ${selectedTier === 'silver' ? 'bg-slate-800/50 border-slate-400' : 'border-slate-800'}`}>SILVER</button>
                </div>
                <div className="space-y-3">
                    {Object.entries(tiers).filter(([k]) => k !== 'vip').map(([key, tier]) => (
                        <div key={key} onClick={() => setSelectedTier(key as any)} className={`p-3 rounded-lg border cursor-pointer flex justify-between ${selectedTier === key ? `bg-slate-800 ${tier.border}` : 'bg-slate-900/50 border-slate-800'}`}>
                            <div className="flex items-center gap-3"><div className={`p-2 rounded-full ${tier.color} text-white`}><tier.icon className="w-4 h-4" /></div><p className="font-bold text-sm">{tier.label}</p></div>
                            <span className="font-bold text-sm text-indigo-400">₹{selectedConcert ? Math.round(selectedConcert.basePrice * tier.multiplier) : 0}</span>
                        </div>
                    ))}
                </div>
            </div>
          )}
          {paymentStep === 'pay' && (
            <div className="flex flex-col items-center justify-center py-6 space-y-6"><div className="bg-white p-4 rounded-xl"><QRCode value={`PAY:${selectedConcert?.id}:${selectedTier}`} size={200} /></div><p className="text-lg font-bold">Scan to Pay</p></div>
          )}
          {paymentStep === 'success' && (
             <div className="flex flex-col items-center justify-center py-8 text-center space-y-4"><div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center"><CheckCircle className="w-8 h-8" /></div><h3 className="text-xl font-bold">Ticket Added to Wallet!</h3></div>
          )}
          <DialogFooter>
            {paymentStep === 'select' && <Button onClick={proceedToPayment} disabled={!selectedTier} className="w-full bg-indigo-600">Proceed</Button>}
            {paymentStep === 'pay' && <Button onClick={confirmPayment} disabled={isProcessing} className="w-full bg-green-600">{isProcessing ? <Loader2 className="animate-spin" /> : "I Have Paid"}</Button>}
            {paymentStep === 'success' && <Button onClick={() => setIsModalOpen(false)} className="w-full">Close</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- VIP CHAT OVERLAY --- */}
      <AnimatePresence>
        {isVipChatOpen && activeTicket && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-4 right-4 w-[350px] bg-slate-900 border border-pink-500/50 shadow-2xl rounded-xl overflow-hidden z-50 flex flex-col h-[400px]">
                <div className="p-3 bg-pink-600 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2"><Crown className="w-4 h-4 text-yellow-300" /> <span className="font-bold text-sm">VIP Concierge</span></div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-pink-700" onClick={() => setIsVipChatOpen(false)}><X className="w-4 h-4" /></Button>
                </div>
                <div className="flex-1 bg-slate-950 p-4 overflow-y-auto space-y-3">
                    {chatMessages.length === 0 && <p className="text-center text-xs text-slate-500 mt-4">How can we help you today?</p>}
                    {chatMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'vip' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-2 rounded-lg text-xs ${msg.sender === 'vip' ? 'bg-pink-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={chatScrollRef} />
                </div>
                <div className="p-2 bg-slate-900 border-t border-slate-800 flex gap-2">
                    <Input placeholder="Message organizer..." className="h-8 bg-slate-950 border-slate-700 text-xs text-white" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendVipMessage()} />
                    <Button size="icon" className="h-8 w-8 bg-pink-600 hover:bg-pink-700" onClick={sendVipMessage}><Send className="w-3 h-3" /></Button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserDashboard;
// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";
// import QRCode from "react-qr-code";
// import { MapPin, Calendar, Ticket, LogOut, User, Music, Loader2 } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { useToast } from "@/hooks/use-toast";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
// import { collection, addDoc } from "firebase/firestore";

// // Mock Data for Concerts
// const upcomingConcerts = [
//   { id: "c1", name: "Summer Vibes Festival", date: "2024-07-15", location: "Central Park Arena", price: "$120" },
//   { id: "c2", name: "Neon Dreams Tour", date: "2024-08-20", location: "Metropolis Stadium", price: "$85" },
//   { id: "c3", name: "Acoustic Nights", date: "2024-09-10", location: "The Grand Theater", price: "$50" },
// ];

// const UserDashboard = () => {
//   const [user, setUser] = useState<FirebaseUser | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [purchasedTicketQR, setPurchasedTicketQR] = useState<string | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const navigate = useNavigate();
//   const { toast } = useToast();

//   // Handle Authentication State
//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//       setUser(currentUser);
//       setLoading(false);
//       if (!currentUser) {
//         navigate("/auth");
//       }
//     });
//     return () => unsubscribe();
//   }, [navigate]);

//   const handleLogout = async () => {
//     await signOut(auth);
//     navigate("/");
//   };

//   const handleBuyTicket = async (concertId: string, concertName: string) => {
//     if (!user) {
//         toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
//         return;
//     }
    
//     setIsProcessing(true);

//     // 1. Check if Geolocation is supported
//     if (!navigator.geolocation) {
//       toast({ 
//         variant: "destructive", 
//         title: "Not Supported", 
//         description: "Your browser does not support location services." 
//       });
//       setIsProcessing(false);
//       return;
//     }

//     toast({ title: "Requesting Location", description: "Please allow location access in your browser popup." });

//     // 2. Request Location
//     navigator.geolocation.getCurrentPosition(
//       async (position) => {
//         const { latitude, longitude } = position.coords;
//         console.log("Location obtained:", latitude, longitude);

//         try {
//             // 3. Generate QR Data
//             const qrData = JSON.stringify({
//                 userId: user.uid,
//                 userName: user.displayName || user.email,
//                 concertId: concertId,
//                 concertName: concertName,
//                 location: { lat: latitude, lng: longitude },
//                 timestamp: Date.now(),
//             });

//             setPurchasedTicketQR(qrData);

//             // 4. Save to Firestore (Notify Organizer)
//             // We map the GPS coordinates to a fake 0-100 grid for the demo map visualization
//             const normalizedX = 50 + (longitude % 0.1) * 1000; 
//             const normalizedY = 50 + (latitude % 0.1) * 1000;

//             await addDoc(collection(db, "staff"), {
//                 name: user.displayName || "Fan Attendee",
//                 role: "vip", // 'vip' role shows as purple on the organizer map
//                 position: { 
//                     x: Math.max(5, Math.min(95, normalizedX)), 
//                     y: Math.max(5, Math.min(95, normalizedY)) 
//                 },
//                 status: "active",
//                 lastUpdate: new Date().toLocaleTimeString(),
//                 ticketInfo: { concertName, price: "$120" }
//             });

//             toast({
//                 title: "Ticket Purchased!",
//                 description: "QR Code generated and location sent to organizer.",
//             });
//         } catch (error) {
//             console.error("Database Error:", error);
//             toast({ 
//                 variant: "destructive", 
//                 title: "Purchase Failed", 
//                 description: "Could not connect to the database. Check your internet." 
//             });
//         } finally {
//             setIsProcessing(false);
//         }
//       },
//       (error) => {
//         // Handle Location Errors (Denied, Timeout, etc.)
//         console.error("Location Error:", error);
//         let errorMessage = "Unable to retrieve your location.";
//         if (error.code === 1) errorMessage = "Permission denied. Please enable location permissions in your browser settings.";
//         if (error.code === 2) errorMessage = "Position unavailable. Check your GPS.";
//         if (error.code === 3) errorMessage = "Location request timed out.";

//         toast({ 
//             variant: "destructive", 
//             title: "Location Required", 
//             description: errorMessage 
//         });
//         setIsProcessing(false);
//       },
//       { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
//     );
//   };

//   if (loading) {
//     return (
//         <div className="min-h-screen flex items-center justify-center">
//             <Loader2 className="w-8 h-8 animate-spin text-primary" />
//         </div>
//     );
//   }

//   if (!user) return null;

//   return (
//     <div className="min-h-screen bg-background p-4 md:p-8">
//       {/* Header */}
//       <header className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-border gap-4">
//         <div className="flex items-center gap-3">
//             <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
//                 <User className="w-6 h-6 text-primary" />
//             </div>
//             <div>
//                 <h1 className="text-2xl font-bold">Welcome, {user.displayName || user.email?.split('@')[0]}</h1>
//                 <p className="text-muted-foreground">User Dashboard</p>
//             </div>
//         </div>
//         <Button variant="outline" onClick={handleLogout} className="gap-2">
//           <LogOut className="w-4 h-4" /> Sign Out
//         </Button>
//       </header>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//         {/* Concerts List */}
//         <div className="lg:col-span-2 space-y-6">
//           <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
//             <Music className="w-5 h-5" /> Upcoming Concerts
//           </h2>
//           {upcomingConcerts.map((concert) => (
//             <motion.div key={concert.id} whileHover={{ scale: 1.01 }}>
//               <Card>
//                 <CardHeader>
//                   <CardTitle>{concert.name}</CardTitle>
//                   <CardDescription className="flex items-center gap-4 mt-2">
//                     <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {concert.date}</span>
//                     <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {concert.location}</span>
//                   </CardDescription>
//                 </CardHeader>
//                 <CardFooter className="flex justify-between items-center">
//                   <span className="text-lg font-bold gradient-text">{concert.price}</span>
//                   <Button 
//                     onClick={() => handleBuyTicket(concert.id, concert.name)}
//                     disabled={isProcessing}
//                     className="button-glow gap-2 min-w-[140px]"
//                   >
//                     {isProcessing ? (
//                         <>
//                             <Loader2 className="w-4 h-4 animate-spin" />
//                             Getting Location...
//                         </>
//                     ) : (
//                         <>
//                             <Ticket className="w-4 h-4" /> 
//                             Buy Ticket
//                         </>
//                     )}
//                   </Button>
//                 </CardFooter>
//               </Card>
//             </motion.div>
//           ))}
//         </div>

//         {/* QR Code Section */}
//         <div>
//           <Card className="sticky top-8">
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Ticket className="w-5 h-5 text-primary" /> Ticket QR
//               </CardTitle>
//               <CardDescription>
//                 Your unique entry code. <br/>
//                 <span className="text-xs text-muted-foreground">Generated based on your GPS location.</span>
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="flex flex-col items-center justify-center py-8">
//               {purchasedTicketQR ? (
//                 <motion.div 
//                     initial={{ scale: 0.8, opacity: 0 }}
//                     animate={{ scale: 1, opacity: 1 }}
//                     className="p-4 bg-white rounded-xl shadow-sm"
//                 >
//                   <div style={{ height: "auto", margin: "0 auto", maxWidth: 200, width: "100%" }}>
//                     <QRCode
//                     size={256}
//                     style={{ height: "auto", maxWidth: "100%", width: "100%" }}
//                     value={purchasedTicketQR}
//                     viewBox={`0 0 256 256`}
//                     />
//                   </div>
//                   <p className="text-center text-xs text-black mt-4 font-mono font-bold">SCAN AT ENTRY</p>
//                 </motion.div>
//               ) : (
//                 <div className="text-center text-muted-foreground py-12 border-2 border-dashed border-border rounded-xl w-full bg-muted/20">
//                   <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
//                   <p>Select a concert to buy a ticket</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default UserDashboard;

// // src/pages/UserDashboard.tsx
// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";
// import QRCode from "react-qr-code";
// import { MapPin, Calendar, Ticket, LogOut, User } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { useToast } from "@/hooks/use-toast";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, addDoc } from "firebase/firestore";

// // Dummy concert data (In a real app, fetch this from Firestore)
// const upcomingConcerts = [
//   { id: "c1", name: "Summer Vibes Festival", date: "2024-07-15", location: "Central Park Arena", price: "$120" },
//   { id: "c2", name: "Neon Dreams Tour", date: "2024-08-20", location: "Metropolis Stadium", price: "$85" },
//   { id: "c3", name: "Acoustic Nights", date: "2024-09-10", location: "The Grand Theater", price: "$50" },
// ];

// const UserDashboard = () => {
//   const [user, setUser] = useState(auth.currentUser);
//   const [purchasedTicketQR, setPurchasedTicketQR] = useState<string | null>(null);
//   const [isLoadingLocation, setIsLoadingLocation] = useState(false);
//   const navigate = useNavigate();
//   const { toast } = useToast();

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//       if (!currentUser) {
//         navigate("/auth");
//       } else {
//         setUser(currentUser);
//       }
//     });
//     return () => unsubscribe();
//   }, [navigate]);

//   const handleLogout = async () => {
//     await signOut(auth);
//     navigate("/");
//   };

//   const handleBuyTicket = async (concertId: string, concertName: string) => {
//     if (!user) return;
//     setIsLoadingLocation(true);

//     if (!navigator.geolocation) {
//       toast({ variant: "destructive", title: "Error", description: "Geolocation is not supported by your browser." });
//       setIsLoadingLocation(false);
//       return;
//     }

//     navigator.geolocation.getCurrentPosition(
//       async (position) => {
//         const { latitude, longitude } = position.coords;

//         // Generate dynamic QR data
//         const qrData = JSON.stringify({
//           userId: user.uid,
//           userName: user.displayName || user.email,
//           concertId: concertId,
//           concertName: concertName,
//           location: { lat: latitude, lng: longitude },
//           timestamp: Date.now(),
//         });

//         setPurchasedTicketQR(qrData);

//         // --- IMPORTANT: NOTIFY ORGANIZER ---
//         // We add the attendee to the 'staff' collection so they appear on the organizer dashboard map.
//         // We use a specific role (e.g., 'vip') to distinguish them from actual staff.
//         // NOTE: Mapping real lat/long to a 0-100 CSS map is complex. 
//         // For this demo, we'll use pseudo-random positions relative to the map center to ensure they appear visible on the organizer's UI.
//         try {
//            // Simulating mapping GPS to map coordinates for demo visualization
//            const normalizedX = 50 + (longitude % 10) * 4; 
//            const normalizedY = 50 + (latitude % 10) * 4;

//            await addDoc(collection(db, "staff"), {
//             name: user.displayName || "Anonymous Attendee",
//             role: "vip", // Using 'vip' role so it shows up purple on Organizer map
//             position: { 
//               x: Math.max(5, Math.min(95, normalizedX)), 
//               y: Math.max(5, Math.min(95, normalizedY)) 
//             },
//             status: "active",
//             lastUpdate: new Date().toLocaleTimeString(),
//             attendeeData: { concertName, latitude, longitude } // Store real data too
//           });
          
//           toast({
//             title: "Ticket Purchased!",
//             description: `QR Code generated for ${concertName}. Organizer notified of your location.`,
//           });

//         } catch (e) {
//           console.error("Error notifying organizer:", e);
//            toast({ variant: "destructive", title: "Purchase Error", description: "Could not connect to organizer database." });
//         } finally {
//            setIsLoadingLocation(false);
//         }
//       },
//       (error) => {
//         console.error("Location error:", error);
//         toast({ 
//           variant: "destructive", 
//           title: "Location Required", 
//           description: "We need your location to verify ticket purchase and generate the QR code." 
//         });
//         setIsLoadingLocation(false);
//       }
//     );
//   };

//   if (!user) return null;

//   return (
//     <div className="min-h-screen bg-background p-8">
//       {/* Header */}
//       <header className="flex justify-between items-center mb-8 pb-4 border-b border-border">
//         <div className="flex items-center gap-3">
//             <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
//                 <User className="w-6 h-6 text-primary" />
//             </div>
//             <div>
//                 <h1 className="text-2xl font-bold">Welcome, {user.displayName || user.email?.split('@')[0]}</h1>
//                 <p className="text-muted-foreground">User Dashboard</p>
//             </div>
//         </div>
//         <Button variant="outline" onClick={handleLogout} className="gap-2">
//           <LogOut className="w-4 h-4" /> Sign Out
//         </Button>
//       </header>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//         {/* Concerts List */}
//         <div className="lg:col-span-2 space-y-6">
//           <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
//             <Music className="w-5 h-5" /> Upcoming Concerts
//           </h2>
//           {upcomingConcerts.map((concert) => (
//             <motion.div key={concert.id} whileHover={{ scale: 1.01 }}>
//               <Card>
//                 <CardHeader>
//                   <CardTitle>{concert.name}</CardTitle>
//                   <CardDescription className="flex items-center gap-4 mt-2">
//                     <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {concert.date}</span>
//                     <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {concert.location}</span>
//                   </CardDescription>
//                 </CardHeader>
//                 <CardFooter className="flex justify-between items-center">
//                   <span className="text-lg font-bold gradient-text">{concert.price}</span>
//                   <Button 
//                     onClick={() => handleBuyTicket(concert.id, concert.name)}
//                     disabled={isLoadingLocation}
//                     className="button-glow gap-2"
//                   >
//                     <Ticket className="w-4 h-4" /> 
//                     {isLoadingLocation ? "Verifying Location..." : "Buy Ticket & Generate QR"}
//                   </Button>
//                 </CardFooter>
//               </Card>
//             </motion.div>
//           ))}
//         </div>

//         {/* QR Code Section */}
//         <div>
//           <Card className="sticky top-8">
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Ticket className="w-5 h-5 text-primary" /> Your Dynamic Ticket QR
//               </CardTitle>
//               <CardDescription>This QR code changes based on your purchase and location.</CardDescription>
//             </CardHeader>
//             <CardContent className="flex flex-col items-center justify-center py-8">
//               {purchasedTicketQR ? (
//                 <motion.div 
//                     initial={{ scale: 0.8, opacity: 0 }}
//                     animate={{ scale: 1, opacity: 1 }}
//                     className="p-4 bg-white rounded-xl"
//                 >
//                   <div style={{ height: "auto", margin: "0 auto", maxWidth: 200, width: "100%" }}>
//                     <QRCode
//                     size={256}
//                     style={{ height: "auto", maxWidth: "100%", width: "100%" }}
//                     value={purchasedTicketQR}
//                     viewBox={`0 0 256 256`}
//                     />
//                   </div>
//                   <p className="text-center text-xs text-black mt-4 font-mono">Scan at venue entrance</p>
//                 </motion.div>
//               ) : (
//                 <div className="text-center text-muted-foreground py-12 border-2 border-dashed border-border rounded-xl w-full">
//                   <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
//                   <p>Purchase a ticket to generate your QR code.</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default UserDashboard;