import { motion } from "framer-motion";
import { QrCode, MapPin, Heart, Shield, Zap, Bell } from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Location-Based Discovery",
    description: "Find events happening near you with our smart location features",
    color: "from-primary to-primary/50",
  },
  {
    icon: Heart,
    title: "Artist Preferences",
    description: "Follow your favorite artists and never miss their shows",
    color: "from-secondary to-secondary/50",
  },
  {
    icon: QrCode,
    title: "Dynamic QR Tickets",
    description: "Secure, time-based QR codes that refresh every 30 seconds",
    color: "from-accent to-accent/50",
  },
  {
    icon: Shield,
    title: "Zone Verification",
    description: "Organizers can instantly verify your ticket and zone access",
    color: "from-primary to-secondary",
  },
  {
    icon: Zap,
    title: "Instant Booking",
    description: "Book tickets in seconds with our streamlined checkout",
    color: "from-secondary to-accent",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Get alerts for new events, price drops, and reminders",
    color: "from-accent to-primary",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Why Choose <span className="gradient-text">EventVibe</span>?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Experience the future of event ticketing with our cutting-edge features
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03 }}
              className="glass-card rounded-2xl p-6 group"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>

              <h3 className="font-display text-xl font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
