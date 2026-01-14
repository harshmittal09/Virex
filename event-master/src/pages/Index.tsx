import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import EventsSection from "@/components/EventsSection";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import LocationModal from "@/components/LocationModal";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [locationGranted, setLocationGranted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>("Select Location");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const { toast } = useToast();

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationGranted(true);
          setCurrentLocation("Mumbai"); // In production, reverse geocode the coordinates
          toast({
            title: "Location enabled!",
            description: "We'll show you events near Mumbai",
          });
        },
        (error) => {
          toast({
            title: "Location access denied",
            description: "Please select your city manually",
            variant: "destructive",
          });
          setShowLocationModal(true);
        }
      );
    } else {
      setShowLocationModal(true);
    }
  };

  const handleSelectCity = (city: string) => {
    setCurrentLocation(city);
    setLocationGranted(true);
    toast({
      title: "Location set!",
      description: `We'll show you events in ${city}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        location={currentLocation} 
        onLocationClick={() => setShowLocationModal(true)} 
      />
      
      <HeroSection 
        onRequestLocation={requestLocation}
        locationGranted={locationGranted}
      />
      
      <EventsSection location={currentLocation !== "Select Location" ? currentLocation : "your area"} />
      
      <FeaturesSection />
      
      <Footer />

      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onRequestLocation={requestLocation}
        onSelectCity={handleSelectCity}
      />
    </div>
  );
};

export default Index;
