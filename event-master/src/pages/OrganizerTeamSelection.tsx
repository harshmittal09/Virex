import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Building2, Plus, Key, Loader2, ArrowLeft,
  CheckCircle, Copy, Calendar, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { 
  collection, addDoc, query, where, getDocs, 
  doc, getDoc, setDoc, serverTimestamp 
} from "firebase/firestore";

// Mock events list (in production, fetch from Firestore)
const availableEvents = [
  { id: "c1", name: "Summer Vibes Festival", date: "2026-07-15", location: "Central Park Arena" },
  { id: "c2", name: "Neon Dreams Tour", date: "2026-08-20", location: "Metropolis Stadium" },
  { id: "c3", name: "Royal Symphony", date: "2027-01-15", location: "Grand Opera House" },
];

type SelectionMode = "choose" | "create" | "join";

const OrganizerTeamSelection = () => {
  const [mode, setMode] = useState<SelectionMode>("choose");
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Create event states
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState<string>("");
  
  // Join team states
  const [secretCode, setSecretCode] = useState<string>("");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/auth");
        return;
      }
      
      // Check if user is organizer
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (!userDoc.exists() || userDoc.data().role !== "organizer") {
        navigate("/auth");
        return;
      }
      
      // Check if organizer already has an event/team
      const userData = userDoc.data();
      if (userData.currentEventId) {
        // Already part of an event, go to dashboard
        navigate("/organizer");
        return;
      }
      
      setUser(currentUser);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [navigate]);

  // Generate secret code
  const generateSecretCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Create new team/event
  const handleCreateTeam = async () => {
    if (!selectedEvent || !user) return;
    
    setIsProcessing(true);
    try {
      const event = availableEvents.find(e => e.id === selectedEvent);
      if (!event) {
        toast({ variant: "destructive", title: "Invalid event selected" });
        setIsProcessing(false);
        return;
      }

      const secretCode = generateSecretCode();
      
      // Create event/team document
      const eventDoc = await addDoc(collection(db, "events"), {
        eventId: selectedEvent,
        eventName: event.name,
        eventDate: event.date,
        eventLocation: event.location,
        secretCode: secretCode,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        organizers: [user.uid],
        status: "active"
      });

      // Update user document with current event
      await setDoc(doc(db, "users", user.uid), {
        currentEventId: eventDoc.id,
        currentEventName: event.name
      }, { merge: true });

      setGeneratedCode(secretCode);
      toast({
        title: "Team created!",
        description: "Share this code with other organizers to join your team.",
      });
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate("/organizer");
      }, 3000);
      
    } catch (error) {
      console.error("Error creating team:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create team. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Join existing team
  const handleJoinTeam = async () => {
    if (!secretCode || !user) return;
    
    setIsProcessing(true);
    try {
      // Find event with matching secret code
      const q = query(collection(db, "events"), where("secretCode", "==", secretCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: "No team found with this secret code. Please check and try again.",
        });
        setIsProcessing(false);
        return;
      }

      const eventDoc = querySnapshot.docs[0];
      const eventData = eventDoc.data();

      // Add user to organizers array
      await setDoc(doc(db, "events", eventDoc.id), {
        organizers: [...(eventData.organizers || []), user.uid]
      }, { merge: true });

      // Update user document
      await setDoc(doc(db, "users", user.uid), {
        currentEventId: eventDoc.id,
        currentEventName: eventData.eventName
      }, { merge: true });

      toast({
        title: "Joined team!",
        description: `You are now part of ${eventData.eventName}`,
      });
      
      // Redirect to dashboard
      navigate("/organizer");
      
    } catch (error) {
      console.error("Error joining team:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to join team. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Secret code copied to clipboard.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {mode === "choose" && (
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-2">
                <Building2 className="w-6 h-6 text-indigo-400" />
                Organizer Team Setup
              </CardTitle>
              <CardDescription className="text-slate-400">
                Choose whether to create a new team or join an existing one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setMode("create")}
                className="w-full h-auto py-6 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-5 h-5 mr-2" />
                <div className="text-left">
                  <div className="font-bold text-lg">Create New Team</div>
                  <div className="text-sm opacity-90">Select an event and create a team</div>
                </div>
              </Button>
              
              <Button
                onClick={() => setMode("join")}
                variant="outline"
                className="w-full h-auto py-6 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Key className="w-5 h-5 mr-2" />
                <div className="text-left">
                  <div className="font-bold text-lg">Join Existing Team</div>
                  <div className="text-sm opacity-90">Enter a secret code to join</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        )}

        {mode === "create" && (
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMode("choose")}
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <CardTitle className="text-white">Create New Team</CardTitle>
                  <CardDescription className="text-slate-400">Select an event for your team</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!generatedCode ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Select Event</label>
                    <div className="space-y-2">
                      {availableEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event.id)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedEvent === event.id
                              ? "border-indigo-500 bg-indigo-500/10"
                              : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-white">{event.name}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {event.date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {event.location}
                                </span>
                              </div>
                            </div>
                            {selectedEvent === event.id && (
                              <CheckCircle className="w-5 h-5 text-indigo-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleCreateTeam}
                    disabled={!selectedEvent || isProcessing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Team"
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-indigo-500/10 border border-indigo-500/50 rounded-lg p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">Team Created Successfully!</h3>
                    <p className="text-sm text-slate-400 mb-4">Share this secret code with other organizers</p>
                    
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between">
                      <code className="text-2xl font-mono font-bold text-indigo-400">{generatedCode}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(generatedCode)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Copy className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    <p className="text-xs text-slate-500 mt-4">Redirecting to dashboard...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {mode === "join" && (
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMode("choose")}
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <CardTitle className="text-white">Join Existing Team</CardTitle>
                  <CardDescription className="text-slate-400">Enter the secret code provided by team creator</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Secret Code</label>
                <Input
                  type="text"
                  placeholder="Enter 8-character code"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                  className="bg-slate-800 border-slate-700 text-white text-center text-2xl font-mono tracking-widest"
                  maxLength={8}
                />
                <p className="text-xs text-slate-500">Ask your team creator for the secret code</p>
              </div>
              
              <Button
                onClick={handleJoinTeam}
                disabled={secretCode.length !== 8 || isProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Team"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default OrganizerTeamSelection;
