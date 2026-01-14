import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Clock, RefreshCw, Shield } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Header from "@/components/Header";

// Simulated ticket data
const ticketData = {
  id: "TKT-2025-001234",
  eventName: "Electronic Music Festival 2025",
  date: "Feb 15, 2025",
  time: "6:00 PM",
  venue: "Central Arena, Mumbai",
  zone: "Gold",
  seat: "General Admission",
  quantity: 2,
  purchaseDate: "Jan 13, 2025",
};

const MyTickets = () => {
  const [totpCode, setTotpCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);

  // Generate TOTP-like code
  const generateTOTP = () => {
    const timestamp = Math.floor(Date.now() / 30000);
    const code = `${ticketData.id}-${timestamp}-${Math.random().toString(36).substr(2, 8)}`;
    return code;
  };

  useEffect(() => {
    // Initial code
    setTotpCode(generateTOTP());

    // Timer for countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTotpCode(generateTOTP());
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12 container mx-auto px-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="font-display text-3xl font-bold mb-8">My Tickets</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Ticket Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl overflow-hidden"
          >
            {/* Ticket Header */}
            <div className="bg-gradient-to-r from-primary to-secondary p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-primary-foreground/80">
                  {ticketData.id}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium">
                  {ticketData.zone} Zone
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-1">
                {ticketData.eventName}
              </h2>
              <p className="text-white/80">{ticketData.quantity} tickets</p>
            </div>

            {/* Ticket Details */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{ticketData.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{ticketData.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Venue</p>
                  <p className="font-medium">{ticketData.venue}</p>
                </div>
              </div>
            </div>

            {/* Dashed separator */}
            <div className="relative px-6">
              <div className="border-t-2 border-dashed border-border" />
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background" />
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background" />
            </div>

            {/* QR Section */}
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Show this QR code at the entrance
              </p>

              {/* Dynamic QR Code */}
              <motion.div
                key={totpCode}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-block p-4 bg-white rounded-2xl mb-4"
              >
                <QRCodeSVG
                  value={totpCode}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </motion.div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <RefreshCw className={`w-4 h-4 text-primary ${timeLeft <= 5 ? 'animate-spin' : ''}`} />
                <span className="text-sm text-muted-foreground">
                  Refreshes in{" "}
                  <span className={`font-mono font-bold ${timeLeft <= 5 ? 'text-destructive' : 'text-primary'}`}>
                    {timeLeft}s
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3 h-3" />
                <span>Dynamic TOTP for enhanced security</span>
              </div>
            </div>
          </motion.div>

          {/* Info Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold mb-4">
                How it works
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs">
                    1
                  </span>
                  <span>
                    Your QR code refreshes every 30 seconds with a new TOTP for
                    maximum security
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs">
                    2
                  </span>
                  <span>
                    Show your QR code to the organizer at the entrance gate
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs">
                    3
                  </span>
                  <span>
                    The scanner will verify your zone access and ticket validity
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs">
                    4
                  </span>
                  <span>
                    Each QR code can only be scanned once to prevent fraud
                  </span>
                </li>
              </ul>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold mb-4">
                Zone Information
              </h3>
              <div className="p-4 rounded-xl bg-gold/10 border border-gold/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-4 h-4 rounded-full bg-gold" />
                  <span className="font-display font-bold text-gold">
                    Gold Zone
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Priority entry, premium viewing area with dedicated bar and
                  restroom facilities. Access to artist meet & greet area.
                </p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold mb-4">
                Important Notes
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Arrive at least 30 minutes before event start</li>
                <li>• Valid ID required for entry</li>
                <li>• No outside food or beverages allowed</li>
                <li>• Professional cameras not permitted</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default MyTickets;
