import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  TrendingUp, 
  Music,
  Globe,
  BarChart3,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface CityData {
  city: string;
  country: string;
  fans: number;
  growth: number;
  ticketsSold: number;
}

// Updated with Indian Cities
const audienceData: CityData[] = [
  { city: "Mumbai", country: "India", fans: 450000, growth: 12, ticketsSold: 28500 },
  { city: "Delhi NCR", country: "India", fans: 380000, growth: 8, ticketsSold: 24200 },
  { city: "Bengaluru", country: "India", fans: 320000, growth: 25, ticketsSold: 19100 },
  { city: "Hyderabad", country: "India", fans: 280000, growth: 22, ticketsSold: 15400 },
  { city: "Pune", country: "India", fans: 210000, growth: 18, ticketsSold: 12600 },
  { city: "Chennai", country: "India", fans: 180000, growth: 10, ticketsSold: 9500 },
  { city: "Kolkata", country: "India", fans: 160000, growth: 15, ticketsSold: 8800 },
  { city: "Ahmedabad", country: "India", fans: 145000, growth: 14, ticketsSold: 7200 },
];

const ageData = [
  { name: "18-24", value: 45, color: "#8b5cf6" }, // Slightly younger demographic common in India
  { name: "25-34", value: 35, color: "#6366f1" },
  { name: "35-44", value: 12, color: "#3b82f6" },
  { name: "45+", value: 8, color: "#0ea5e9" },
];

const monthlyData = [
  { month: "Jan", streams: 2500000 },
  { month: "Feb", streams: 2850000 },
  { month: "Mar", streams: 3100000 },
  { month: "Apr", streams: 3450000 },
  { month: "May", streams: 4200000 }, // Peak season/Holiday
  { month: "Jun", streams: 4800000 },
];

// Updated with Indian Venues and 2026 Dates
const upcomingEvents = [
  { id: 1, city: "Mumbai", venue: "Jio World Garden", date: "2026-02-14", ticketsSold: 12500, capacity: 15000 },
  { id: 2, city: "Delhi", venue: "JLN Stadium", date: "2026-03-05", ticketsSold: 18200, capacity: 25000 },
  { id: 3, city: "Bengaluru", venue: "Palace Grounds", date: "2026-03-20", ticketsSold: 22800, capacity: 30000 },
];

const ArtistDashboard = () => {
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);

  const totalFans = audienceData.reduce((sum, city) => sum + city.fans, 0);
  const totalTickets = audienceData.reduce((sum, city) => sum + city.ticketsSold, 0);
  const avgGrowth = Math.round(audienceData.reduce((sum, city) => sum + city.growth, 0) / audienceData.length);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Artist Dashboard</h1>
                <p className="text-sm text-muted-foreground">India Tour Analytics & Insights</p>
              </div>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{(totalFans / 1000).toFixed(0)}K</p>
                  <p className="text-sm text-muted-foreground">Total Fans</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-green-500/10">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">+{avgGrowth}%</p>
                  <p className="text-sm text-muted-foreground">Avg Growth</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-purple-500/10">
                  <Music className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{(totalTickets / 1000).toFixed(1)}K</p>
                  <p className="text-sm text-muted-foreground">Tickets Sold</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Globe className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{audienceData.length}</p>
                  <p className="text-sm text-muted-foreground">Top Cities</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* City Rankings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Audience by City
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {audienceData.map((city, index) => (
                  <motion.div
                    key={city.city}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedCity?.city === city.city
                        ? "bg-primary/10 border-primary"
                        : "bg-card hover:bg-accent/50 border-border"
                    }`}
                    onClick={() => setSelectedCity(city)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{city.city}</p>
                          <p className="text-sm text-muted-foreground">{city.country}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{(city.fans / 1000).toFixed(0)}K fans</p>
                          <p className="text-xs text-muted-foreground">{city.ticketsSold.toLocaleString()} tickets</p>
                        </div>
                        <Badge variant={city.growth >= 15 ? "default" : "secondary"} className="gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {city.growth}%
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(city.fans / audienceData[0].fans) * 100}%` }}
                          transition={{ delay: 0.2 + index * 0.05, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Age Demographics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Age Demographics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {ageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {ageData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}: {item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Streams Chart */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Monthly Streams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `${value / 1000000}M`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${(value / 1000000).toFixed(2)}M streams`, "Streams"]}
                    />
                    <Bar dataKey="streams" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming India Tour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{event.city}</p>
                        <p className="text-sm text-muted-foreground">{event.venue}</p>
                      </div>
                      <Badge variant="outline">{new Date(event.date).toLocaleDateString()}</Badge>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Tickets sold</span>
                        <span className="font-medium text-foreground">
                          {event.ticketsSold.toLocaleString()} / {event.capacity.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(event.ticketsSold / event.capacity) * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ArtistDashboard;