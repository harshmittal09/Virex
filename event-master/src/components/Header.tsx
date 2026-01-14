import { motion } from "framer-motion";
import { MapPin, Search, User, Ticket } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

interface HeaderProps {
  location?: string;
  onLocationClick?: () => void;
}

const Header = ({ location = "Select Location", onLocationClick }: HeaderProps) => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Ticket className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold gradient-text">EventVibe</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={onLocationClick}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm">{location}</span>
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search events, artists..."
              className="w-64 h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <User className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="gradient" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
