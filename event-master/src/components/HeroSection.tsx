import { motion } from "framer-motion";
import { MapPin, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import heroConcert from "@/assets/hero-concert.jpg";

interface HeroSectionProps {
  onRequestLocation: () => void;
  locationGranted: boolean;
}

const HeroSection = ({ onRequestLocation, locationGranted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroConcert}
          alt="Concert atmosphere"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Discover Amazing Experiences</span>
          </motion.div>

          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Your Next{" "}
            <span className="gradient-text">Unforgettable</span>
            <br />
            Experience Awaits
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Discover concerts, festivals, comedy shows, and more happening near you. 
            Book tickets in seconds with our secure QR-based entry system.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!locationGranted ? (
              <Button
                variant="hero"
                size="xl"
                onClick={onRequestLocation}
                className="w-full sm:w-auto"
              >
                <MapPin className="w-5 h-5 mr-2" />
                Enable Location to Explore
              </Button>
            ) : (
              <Button variant="hero" size="xl" className="w-full sm:w-auto">
                <Sparkles className="w-5 h-5 mr-2" />
                Explore Events Near You
              </Button>
            )}

            <Button variant="glass" size="xl" className="w-full sm:w-auto">
              Browse All Events
            </Button>
          </div>
        </motion.div>

        {/* Floating Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
        >
          {[
            { label: "Active Events", value: "500+" },
            { label: "Cities", value: "50+" },
            { label: "Happy Users", value: "100K+" },
            { label: "Artists", value: "1000+" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="glass-card rounded-xl p-4 text-center"
            >
              <div className="font-display text-2xl font-bold gradient-text">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
