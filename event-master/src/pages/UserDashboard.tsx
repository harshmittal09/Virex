import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import { 
  MapPin, Calendar, Ticket, LogOut, User, 
  Loader2, History, Crown, Star, Shield, CreditCard, CheckCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { collection, addDoc, query, where, getDocs, orderBy } from "firebase/firestore";

// --- IMPORT LOCAL IMAGES ---
import eventElectronic from "@/assets/event-electronic.jpg";
import eventRock from "@/assets/event-rock.jpg";
import eventClassical from "@/assets/event-classical.jpg";

// --- MOCK DATA WITH REAL IMAGES ---
const upcomingConcerts = [
  { 
    id: "c1", 
    name: "Summer Vibes Festival", 
    date: "2024-07-15", 
    location: "Central Park Arena", 
    image: eventElectronic,
    basePrice: 100 
  },
  { 
    id: "c2", 
    name: "Neon Dreams Tour", 
    date: "2024-08-20", 
    location: "Metropolis Stadium", 
    image: eventRock,
    basePrice: 80 
  },
  { 
    id: "c3", 
    name: "Royal Symphony", 
    date: "2024-09-15", 
    location: "Grand Opera House", 
    image: eventClassical,
    basePrice: 150 
  },
];

const tiers = {
  platinum: { label: "Platinum", multiplier: 2.5, color: "bg-purple-600", border: "border-purple-600", icon: Crown },
  gold: { label: "Gold", multiplier: 1.5, color: "bg-yellow-500", border: "border-yellow-500", icon: Star },
  silver: { label: "Silver", multiplier: 1.0, color: "bg-slate-400", border: "border-slate-400", icon: Shield },
};

const UserDashboard = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pastTickets, setPastTickets] = useState<any[]>([]);
  
  // Modal & Payment States
  const [selectedConcert, setSelectedConcert] = useState<any | null>(null);
  const [selectedTier, setSelectedTier] = useState<"platinum" | "gold" | "silver" | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"select" | "pay" | "success">("select");
  
  const [purchasedTicketQR, setPurchasedTicketQR] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) navigate("/auth");
      else await fetchPastTickets(currentUser.uid);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchPastTickets = async (uid: string) => {
    try {
      const q = query(collection(db, "tickets"), where("userId", "==", uid), orderBy("purchaseDate", "desc"));
      const querySnapshot = await getDocs(q);
      const tickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPastTickets(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    }
  };

  const initiatePurchase = (concert: any) => {
    setSelectedConcert(concert);
    setSelectedTier(null);
    setPaymentStep("select");
    setIsModalOpen(true);
  };

  const proceedToPayment = () => {
    if (!selectedTier) return;
    setPaymentStep("pay");
  };

  const confirmPaymentAndGenerateTicket = async () => {
    if (!user || !selectedConcert || !selectedTier) return;
    setIsProcessing(true);

    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Error", description: "Location access required." });
      setIsProcessing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        try {
            const { latitude, longitude } = position.coords;
            const finalPrice = Math.round(selectedConcert.basePrice * tiers[selectedTier].multiplier);

            // 1. Create Ticket in Firestore
            const ticketRef = await addDoc(collection(db, "tickets"), {
                userId: user.uid,
                attendeeName: user.displayName || user.email,
                concertId: selectedConcert.id,
                concertName: selectedConcert.name,
                tier: selectedTier,
                price: finalPrice,
                status: 'valid',
                purchaseDate: new Date().toISOString(),
                location: { lat: latitude, lng: longitude }
            });

            // 2. Generate Ticket QR Data
            const qrData = JSON.stringify({
                ticketId: ticketRef.id,
                userId: user.uid,
                tier: selectedTier,
                concertId: selectedConcert.id,
                location: { lat: latitude, lng: longitude },
                timestamp: Date.now(),
            });

            setPurchasedTicketQR(qrData);
            await fetchPastTickets(user.uid);
            
            setPaymentStep("success");
            toast({ title: "Payment Successful!", description: "Ticket generated." });

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Transaction failed." });
        } finally {
            setIsProcessing(false);
        }
    });
  };

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <User className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-white">{user.displayName || "Music Fan"}</h1>
                <p className="text-xs text-slate-400">Standard Member</p>
            </div>
        </div>
        <Button variant="ghost" onClick={() => signOut(auth)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </header>

      <Tabs defaultValue="concerts" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 text-slate-400">
          <TabsTrigger value="concerts" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Upcoming Concerts</TabsTrigger>
          <TabsTrigger value="tickets" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">My Tickets</TabsTrigger>
        </TabsList>

        {/* --- CONCERTS TAB --- */}
        <TabsContent value="concerts" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingConcerts.map((concert) => (
              <motion.div key={concert.id} whileHover={{ y: -5 }} className="h-full">
                <Card className="overflow-hidden h-full flex flex-col border-slate-800 bg-slate-900 shadow-xl">
                  <div className="relative h-48 overflow-hidden">
                    <img src={concert.image} alt={concert.name} className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                    <div className="absolute bottom-4 left-4 text-white">
                        <p className="font-bold text-lg">{concert.name}</p>
                        <p className="text-sm text-slate-300 flex items-center gap-1"><MapPin className="w-3 h-3"/> {concert.location}</p>
                    </div>
                  </div>
                  <CardContent className="pt-6 flex-1">
                    <div className="flex justify-between items-center mb-4">
                        <Badge variant="secondary" className="bg-slate-800 text-slate-300"><Calendar className="w-3 h-3 mr-1"/> {concert.date}</Badge>
                        <span className="text-indigo-400 font-bold">From ${concert.basePrice}</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => initiatePurchase(concert)} className="w-full bg-indigo-600 hover:bg-indigo-700">
                      Buy Ticket
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* --- TICKETS TAB --- */}
        <TabsContent value="tickets">
          <div className="grid md:grid-cols-2 gap-6">
             <Card className="border-slate-800 bg-slate-900">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><Ticket className="w-5 h-5 text-indigo-400"/> Active Ticket QR</CardTitle>
                    <CardDescription className="text-slate-400">Scan at the gate for entry</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    {purchasedTicketQR ? (
                        <div className="bg-white p-4 rounded-xl shadow-lg">
                            <QRCode value={purchasedTicketQR} size={200} />
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-600 border-2 border-dashed border-slate-800 rounded-xl w-full">
                            No active ticket selected
                        </div>
                    )}
                </CardContent>
             </Card>

             <div className="space-y-4">
                <h3 className="font-bold text-slate-300 flex items-center gap-2"><History className="w-4 h-4"/> Ticket History</h3>
                {pastTickets.map((ticket) => (
                    <div 
                        key={ticket.id} 
                        onClick={() => setPurchasedTicketQR(JSON.stringify({ ticketId: ticket.id, userId: ticket.userId, tier: ticket.tier }))}
                        className="bg-slate-900 p-4 rounded-lg border border-slate-800 hover:border-indigo-500 cursor-pointer transition-colors flex justify-between items-center"
                    >
                        <div className="flex items-center gap-4">
                            {/* Small thumbnail of concert */}
                            <div className="w-12 h-12 rounded bg-slate-800 overflow-hidden">
                                {upcomingConcerts.find(c => c.id === ticket.concertId)?.image && (
                                    <img src={upcomingConcerts.find(c => c.id === ticket.concertId)?.image} className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-white">{ticket.concertName}</p>
                                <p className="text-xs text-slate-400">{new Date(ticket.purchaseDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <Badge className={`${tiers[ticket.tier as keyof typeof tiers]?.color || 'bg-slate-500'} text-white`}>
                            {ticket.tier?.toUpperCase()}
                        </Badge>
                    </div>
                ))}
             </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* --- PAYMENT & SELECTION MODAL --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>
                {paymentStep === 'select' && "Select Your Seats"}
                {paymentStep === 'pay' && "Secure Payment"}
                {paymentStep === 'success' && "Ticket Confirmed"}
            </DialogTitle>
          </DialogHeader>

          {/* STEP 1: SELECT SEATS */}
          {paymentStep === 'select' && (
            <div className="grid md:grid-cols-2 gap-6 py-4">
                {/* Visual Map */}
                <div className="relative border border-slate-700 rounded-lg bg-black/50 h-[300px] p-4 flex flex-col items-center justify-end gap-2">
                    <div className="absolute top-2 text-slate-500 text-[10px] tracking-widest">STAGE</div>
                    <div className="w-32 h-2 bg-indigo-500/50 rounded mb-6 shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>
                    
                    <button onClick={() => setSelectedTier("platinum")} className={`w-40 h-16 rounded-t-xl border transition-all flex items-center justify-center font-bold text-xs ${selectedTier === 'platinum' ? 'bg-purple-900/50 border-purple-500 text-purple-300' : 'border-slate-800 text-slate-600'}`}>PLATINUM</button>
                    <button onClick={() => setSelectedTier("gold")} className={`w-52 h-14 border transition-all flex items-center justify-center font-bold text-xs ${selectedTier === 'gold' ? 'bg-yellow-900/50 border-yellow-500 text-yellow-300' : 'border-slate-800 text-slate-600'}`}>GOLD</button>
                    <button onClick={() => setSelectedTier("silver")} className={`w-full h-12 rounded-b-lg border transition-all flex items-center justify-center font-bold text-xs ${selectedTier === 'silver' ? 'bg-slate-800/50 border-slate-400 text-slate-300' : 'border-slate-800 text-slate-600'}`}>SILVER (General)</button>
                </div>
                {/* Pricing */}
                <div className="space-y-3">
                    {Object.entries(tiers).map(([key, tier]) => {
                        const TierIcon = tier.icon;
                        return (
                            <div key={key} onClick={() => setSelectedTier(key as any)} className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${selectedTier === key ? `bg-slate-800 ${tier.border}` : 'bg-slate-900/50 border-slate-800'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${tier.color} text-white`}><TierIcon className="w-4 h-4" /></div>
                                    <div><p className="font-bold text-sm">{tier.label}</p><p className="text-xs text-slate-500">Zone Access</p></div>
                                </div>
                                <span className="font-bold text-sm text-indigo-400">${selectedConcert ? Math.round(selectedConcert.basePrice * tier.multiplier) : 0}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
          )}

          {/* STEP 2: PAYMENT QR */}
          {paymentStep === 'pay' && (
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
                <div className="bg-white p-4 rounded-xl">
                    {/* Dummy Payment QR */}
                    <QRCode value={`PAY:${selectedConcert?.id}:${selectedTier}:AMOUNT`} size={200} />
                </div>
                <div className="text-center">
                    <p className="text-lg font-bold">Scan to Pay ${selectedConcert && selectedTier ? Math.round(selectedConcert.basePrice * tiers[selectedTier].multiplier) : 0}</p>
                    <p className="text-sm text-slate-400">Use any UPI/Banking app to complete.</p>
                </div>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {paymentStep === 'success' && (
             <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">You're going to {selectedConcert?.name}!</h3>
                <p className="text-slate-400">Your ticket has been saved to "My Tickets".</p>
             </div>
          )}

          <DialogFooter>
            {paymentStep === 'select' && (
                <Button onClick={proceedToPayment} disabled={!selectedTier} className="w-full bg-indigo-600 hover:bg-indigo-700">Proceed to Payment <CreditCard className="w-4 h-4 ml-2"/></Button>
            )}
            {paymentStep === 'pay' && (
                <Button onClick={confirmPaymentAndGenerateTicket} disabled={isProcessing} className="w-full bg-green-600 hover:bg-green-700">
                    {isProcessing ? <Loader2 className="animate-spin" /> : "I Have Paid"}
                </Button>
            )}
            {paymentStep === 'success' && (
                <Button onClick={() => setIsModalOpen(false)} className="w-full">Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
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