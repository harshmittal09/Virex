import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Navigation } from "lucide-react";
import { Button } from "./ui/button";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestLocation: () => void;
  onSelectCity: (city: string) => void;
}

const popularCities = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
];

const LocationModal = ({
  isOpen,
  onClose,
  onRequestLocation,
  onSelectCity,
}: LocationModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="glass-card rounded-2xl p-6 mx-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold">Select Location</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Auto-detect */}
              <Button
                variant="gradient"
                className="w-full mb-6"
                onClick={() => {
                  onRequestLocation();
                  onClose();
                }}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Detect My Location
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or select a city
                  </span>
                </div>
              </div>

              {/* City Grid */}
              <div className="grid grid-cols-2 gap-2">
                {popularCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      onSelectCity(city);
                      onClose();
                    }}
                    className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm">{city}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LocationModal;
