import { motion } from "framer-motion";
import { ChevronRight, Music, Mic2, Theater, Sparkles } from "lucide-react";
import EventCard from "./EventCard";
import { Button } from "./ui/button";

import eventElectronic from "@/assets/event-electronic.jpg";
import eventRock from "@/assets/event-rock.jpg";
import eventComedy from "@/assets/event-comedy.jpg";
import eventClassical from "@/assets/event-classical.jpg";

const categories = [
  { name: "All", icon: Sparkles, active: true },
  { name: "Concerts", icon: Music, active: false },
  { name: "Comedy", icon: Mic2, active: false },
  { name: "Theater", icon: Theater, active: false },
];

const events = [
  {
    id: "1",
    title: "Electronic Music Festival 2025",
    image: eventElectronic,
    date: "Feb 15, 2025",
    time: "6:00 PM",
    venue: "Central Arena, Mumbai",
    category: "Festival",
    price: "₹1,499",
  },
  {
    id: "2",
    title: "Rock Legends Live in Concert",
    image: eventRock,
    date: "Feb 20, 2025",
    time: "7:30 PM",
    venue: "Stadium Complex, Delhi",
    category: "Concert",
    price: "₹999",
  },
  {
    id: "3",
    title: "Stand-Up Comedy Night",
    image: eventComedy,
    date: "Feb 18, 2025",
    time: "8:00 PM",
    venue: "The Laugh Factory, Bangalore",
    category: "Comedy",
    price: "₹599",
  },
  {
    id: "4",
    title: "Symphony Orchestra Performance",
    image: eventClassical,
    date: "Feb 22, 2025",
    time: "6:30 PM",
    venue: "Royal Opera House, Mumbai",
    category: "Classical",
    price: "₹1,999",
  },
];

interface EventsSectionProps {
  location?: string;
}

const EventsSection = ({ location = "your area" }: EventsSectionProps) => {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-10"
        >
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Events in <span className="gradient-text">{location}</span>
            </h2>
            <p className="text-muted-foreground">
              Discover what's happening near you
            </p>
          </div>

          <Button variant="ghost" className="mt-4 md:mt-0">
            View All Events
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex gap-3 mb-8 overflow-x-auto pb-2"
        >
          {categories.map((cat) => (
            <button
              key={cat.name}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                cat.active
                  ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground"
                  : "glass-card hover:bg-muted"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.name}
            </button>
          ))}
        </motion.div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {events.map((event, index) => (
            <EventCard key={event.id} {...event} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventsSection;
