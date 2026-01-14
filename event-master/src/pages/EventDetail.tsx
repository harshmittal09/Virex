import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, Heart, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import eventElectronic from "@/assets/event-electronic.jpg";
import eventRock from "@/assets/event-rock.jpg";
import eventComedy from "@/assets/event-comedy.jpg";
import eventClassical from "@/assets/event-classical.jpg";

const eventsData: Record<string, {
  title: string;
  image: string;
  date: string;
  time: string;
  venue: string;
  category: string;
  description: string;
  artist: string;
  zones: { name: string; price: number; available: number; color: string }[];
}> = {
  "1": {
    title: "Electronic Music Festival 2025",
    image: eventElectronic,
    date: "Feb 15, 2025",
    time: "6:00 PM",
    venue: "Central Arena, Mumbai",
    category: "Festival",
    artist: "Various Artists",
    description: "Experience the ultimate electronic music festival featuring top DJs from around the world. Three stages, immersive light shows, and non-stop beats from 6 PM to midnight.",
    zones: [
      { name: "Platinum", price: 4999, available: 50, color: "border-platinum text-platinum" },
      { name: "Gold", price: 2999, available: 150, color: "border-gold text-gold" },
      { name: "Silver", price: 1499, available: 500, color: "border-silver text-silver" },
    ],
  },
  "2": {
    title: "Rock Legends Live in Concert",
    image: eventRock,
    date: "Feb 20, 2025",
    time: "7:30 PM",
    venue: "Stadium Complex, Delhi",
    category: "Concert",
    artist: "The Midnight Rockers",
    description: "An electrifying night of classic rock anthems performed by legendary musicians. Expect pyrotechnics, incredible solos, and an unforgettable atmosphere.",
    zones: [
      { name: "Platinum", price: 3999, available: 100, color: "border-platinum text-platinum" },
      { name: "Gold", price: 1999, available: 300, color: "border-gold text-gold" },
      { name: "Silver", price: 999, available: 800, color: "border-silver text-silver" },
    ],
  },
  "3": {
    title: "Stand-Up Comedy Night",
    image: eventComedy,
    date: "Feb 18, 2025",
    time: "8:00 PM",
    venue: "The Laugh Factory, Bangalore",
    category: "Comedy",
    artist: "Comedy All-Stars",
    description: "Get ready to laugh until it hurts! Join us for a night of hilarious stand-up featuring some of the best comedians in the country.",
    zones: [
      { name: "Front Row", price: 1499, available: 20, color: "border-gold text-gold" },
      { name: "Premium", price: 999, available: 50, color: "border-silver text-silver" },
      { name: "Regular", price: 599, available: 100, color: "border-muted-foreground text-muted-foreground" },
    ],
  },
  "4": {
    title: "Symphony Orchestra Performance",
    image: eventClassical,
    date: "Feb 22, 2025",
    time: "6:30 PM",
    venue: "Royal Opera House, Mumbai",
    category: "Classical",
    artist: "National Symphony Orchestra",
    description: "An evening of classical masterpieces performed by the National Symphony Orchestra. Featuring works by Beethoven, Mozart, and Tchaikovsky.",
    zones: [
      { name: "VIP Box", price: 4999, available: 30, color: "border-platinum text-platinum" },
      { name: "Orchestra", price: 2999, available: 100, color: "border-gold text-gold" },
      { name: "Balcony", price: 1999, available: 200, color: "border-silver text-silver" },
    ],
  },
};

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const event = eventsData[id || "1"];

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Event not found</p>
      </div>
    );
  }

  const selectedZoneData = event.zones.find((z) => z.name === selectedZone);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16">
        {/* Hero Image */}
        <div className="relative h-[50vh] overflow-hidden">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          <Link
            to="/"
            className="absolute top-4 left-4 w-10 h-10 rounded-full glass-card flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="container mx-auto">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/90 text-primary-foreground mb-3">
                {event.category}
              </span>
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-2">
                {event.title}
              </h1>
              <p className="text-muted-foreground">{event.artist}</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Event Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-6"
              >
                <h2 className="font-display text-xl font-bold mb-4">Event Details</h2>
                <div className="grid sm:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{event.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium">{event.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Venue</p>
                      <p className="font-medium">{event.venue}</p>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground">{event.description}</p>
              </motion.div>

              {/* Zone Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-2xl p-6"
              >
                <h2 className="font-display text-xl font-bold mb-4">Select Zone</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {event.zones.map((zone) => (
                    <button
                      key={zone.name}
                      onClick={() => setSelectedZone(zone.name)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${zone.color} ${
                        selectedZone === zone.name
                          ? "scale-105 shadow-lg bg-muted/50"
                          : "border-opacity-50 hover:border-opacity-100"
                      }`}
                    >
                      <div className="font-display text-lg font-bold mb-1">
                        {zone.name}
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        ₹{zone.price.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" />
                        {zone.available} available
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right Sidebar - Booking */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card rounded-2xl p-6 sticky top-24"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-xl font-bold">Book Tickets</h3>
                  <div className="flex gap-2">
                    <button className="w-9 h-9 rounded-lg glass-card flex items-center justify-center hover:bg-muted">
                      <Heart className="w-4 h-4" />
                    </button>
                    <button className="w-9 h-9 rounded-lg glass-card flex items-center justify-center hover:bg-muted">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedZone ? (
                  <>
                    <div className="p-4 rounded-xl bg-muted/50 mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Zone</span>
                        <span className="font-medium">{selectedZone}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Price per ticket</span>
                        <span className="font-medium">
                          ₹{selectedZoneData?.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Quantity</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="font-medium w-8 text-center">{quantity}</span>
                          <button
                            onClick={() => setQuantity(Math.min(10, quantity + 1))}
                            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4 mb-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="gradient-text">
                          ₹{((selectedZoneData?.price || 0) * quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <Link to={`/checkout/${id}?zone=${selectedZone}&qty=${quantity}`}>
                      <Button variant="hero" size="lg" className="w-full">
                        Proceed to Payment
                      </Button>
                    </Link>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Select a zone to continue booking</p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EventDetail;
