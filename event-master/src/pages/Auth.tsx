import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  Mail, 
  Lock, 
  User, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Ticket,
  Building2,  // Icon for Organizer
  Music2,     // Icon for Artist
  ShieldCheck // Icon for Admin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

type AuthMode = "login" | "signup" | "forgot";
type UserRole = "user" | "organizer" | "artist";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        
        if (formData.name && userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: formData.name
          });
        }
        
        // Store user data with role in Firestore
        const userDocRef = doc(db, "users", userCredential.user.uid);
        await setDoc(userDocRef, {
          email: formData.email,
          displayName: formData.name || formData.email,
          role: selectedRole,
          createdAt: new Date().toISOString(),
          friends: [],
          friendRequests: []
        });
        
        toast({
          title: "Account created!",
          description: `Welcome to EventVibe as ${selectedRole}! Redirecting...`,
        });
        
        // Redirect based on role
        if (selectedRole === "organizer") {
          navigate("/organizer-team-selection");
        } else if (selectedRole === "artist") {
          navigate("/artist");
        } else {
          navigate("/user-dashboard");
        }
        
      } else if (mode === "login") {
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        
        // Fetch user role from Firestore
        const userDocRef = doc(db, "users", userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "User data not found.",
          });
          setIsLoading(false);
          return;
        }
        
        const userData = userDoc.data();
        const userRole = userData.role || "user";
        
        toast({
          title: "Welcome back!",
          description: "Redirecting to your dashboard...",
        });
        
        // Redirect based on role
        if (userRole === "organizer") {
          // Check if organizer has an event/team
          if (userData.currentEventId) {
            navigate("/organizer");
          } else {
            navigate("/organizer-team-selection");
          }
        } else if (userRole === "artist") {
          navigate("/artist");
        } else {
          navigate("/user-dashboard");
        }
        
      } else if (mode === "forgot") {
        await sendPasswordResetEmail(auth, formData.email);
        
        toast({
          title: "Reset email sent!",
          description: "Check your Gmail for the password reset link.",
        });
        setMode("login");
      }
    } catch (error: unknown) {
      let errorMessage = "Something went wrong. Please try again.";
      
      const firebaseError = error as { code?: string };
      
      switch (firebaseError.code) {
        case "auth/email-already-in-use":
          errorMessage = "This email is already registered. Try signing in instead.";
          break;
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address.";
          break;
        case "auth/weak-password":
          errorMessage = "Password should be at least 6 characters.";
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with this email. Try signing up.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again.";
          break;
        case "auth/invalid-credential":
          errorMessage = "Invalid email or password. Please check and try again.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="flex items-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Ticket className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold gradient-text">
              EventVibe
            </span>
          </div>

          <h1 className="font-display text-3xl font-bold mb-2">
            {mode === "login" && "Welcome back"}
            {mode === "signup" && "Create account"}
            {mode === "forgot" && "Reset password"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {mode === "login" && "Sign in to continue your journey"}
            {mode === "signup" && "Join thousands of event enthusiasts"}
            {mode === "forgot" && "We'll send a reset link to your Gmail"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Full name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="pl-11 h-12 bg-muted/50 border-border/50"
                    required
                  />
                </div>
                
                {/* Role Selection for Signup */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Select your role</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("user")}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedRole === "user"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <Ticket className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">User</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole("organizer")}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedRole === "organizer"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <Building2 className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">Organizer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole("artist")}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedRole === "artist"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <Music2 className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">Artist</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="pl-11 h-12 bg-muted/50 border-border/50"
                required
              />
            </div>

            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="pl-11 pr-11 h-12 bg-muted/50 border-border/50"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            )}

            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === "login" && "Sign In"}
                  {mode === "signup" && "Create Account"}
                  {mode === "forgot" && "Send Reset Link"}
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" && (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === "forgot" && (
              <>
                Remember your password?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          {/* New Partner Access Section */}
          <div className="mt-8 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Partner Access
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Link to="/organizer">
                <Button variant="outline" className="w-full h-auto py-3 flex-col gap-2 hover:bg-primary/5 hover:text-primary transition-colors">
                  <Building2 className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Organizer</span>
                </Button>
              </Link>
              <Link to="/artist">
                <Button variant="outline" className="w-full h-auto py-3 flex-col gap-2 hover:bg-primary/5 hover:text-primary transition-colors">
                  <Music2 className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Artist</span>
                </Button>
              </Link>
              <Link to="/admin">
                <Button variant="outline" className="w-full h-auto py-3 flex-col gap-2 hover:bg-primary/5 hover:text-primary transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Admin</span>
                </Button>
              </Link>
            </div>
          </div>

        </motion.div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 animate-float">
                <Ticket className="w-16 h-16 text-primary-foreground" />
              </div>
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="font-display text-4xl font-bold mb-4"
            >
              Your Gateway to
              <br />
              <span className="gradient-text">Unforgettable Moments</span>
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-muted-foreground max-w-sm mx-auto"
            >
              Join EventVibe and discover concerts, festivals, and experiences
              tailored just for you.
            </motion.p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
// import { useState } from "react";
// import { motion } from "framer-motion";
// import { Link, useNavigate } from "react-router-dom";
// import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, Ticket } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { useToast } from "@/hooks/use-toast";
// import { 
//   createUserWithEmailAndPassword, 
//   signInWithEmailAndPassword, 
//   sendPasswordResetEmail,
//   updateProfile
// } from "firebase/auth";
// import { auth } from "@/lib/firebase";

// type AuthMode = "login" | "signup" | "forgot";

// const Auth = () => {
//   const [mode, setMode] = useState<AuthMode>("login");
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const { toast } = useToast();
//   const navigate = useNavigate();

//   const [formData, setFormData] = useState({
//     name: "",
//     email: "",
//     password: "",
//   });

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);

//     try {
//       if (mode === "signup") {
//         const userCredential = await createUserWithEmailAndPassword(
//           auth, 
//           formData.email, 
//           formData.password
//         );
        
//         if (formData.name && userCredential.user) {
//           await updateProfile(userCredential.user, {
//             displayName: formData.name
//           });
//         }
        
//         toast({
//           title: "Account created!",
//           description: "Welcome to EventVibe! Redirecting...",
//         });
//         navigate("/");
        
//       } else if (mode === "login") {
//         await signInWithEmailAndPassword(auth, formData.email, formData.password);
        
//         toast({
//           title: "Welcome back!",
//           description: "Redirecting to your dashboard...",
//         });
//         navigate("/");
        
//       } else if (mode === "forgot") {
//         await sendPasswordResetEmail(auth, formData.email);
        
//         toast({
//           title: "Reset email sent!",
//           description: "Check your Gmail for the password reset link.",
//         });
//         setMode("login");
//       }
//     } catch (error: unknown) {
//       let errorMessage = "Something went wrong. Please try again.";
      
//       const firebaseError = error as { code?: string };
      
//       switch (firebaseError.code) {
//         case "auth/email-already-in-use":
//           errorMessage = "This email is already registered. Try signing in instead.";
//           break;
//         case "auth/invalid-email":
//           errorMessage = "Please enter a valid email address.";
//           break;
//         case "auth/weak-password":
//           errorMessage = "Password should be at least 6 characters.";
//           break;
//         case "auth/user-not-found":
//           errorMessage = "No account found with this email. Try signing up.";
//           break;
//         case "auth/wrong-password":
//           errorMessage = "Incorrect password. Please try again.";
//           break;
//         case "auth/invalid-credential":
//           errorMessage = "Invalid email or password. Please check and try again.";
//           break;
//         case "auth/too-many-requests":
//           errorMessage = "Too many failed attempts. Please try again later.";
//           break;
//       }
      
//       toast({
//         title: "Error",
//         description: errorMessage,
//         variant: "destructive",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-background flex">
//       <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
//         <motion.div
//           initial={{ opacity: 0, x: -20 }}
//           animate={{ opacity: 1, x: 0 }}
//           className="w-full max-w-md"
//         >
//           <Link
//             to="/"
//             className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
//           >
//             <ArrowLeft className="w-4 h-4" />
//             Back to home
//           </Link>

//           <div className="flex items-center gap-2 mb-8">
//             <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
//               <Ticket className="w-6 h-6 text-primary-foreground" />
//             </div>
//             <span className="font-display text-2xl font-bold gradient-text">
//               EventVibe
//             </span>
//           </div>

//           <h1 className="font-display text-3xl font-bold mb-2">
//             {mode === "login" && "Welcome back"}
//             {mode === "signup" && "Create account"}
//             {mode === "forgot" && "Reset password"}
//           </h1>
//           <p className="text-muted-foreground mb-8">
//             {mode === "login" && "Sign in to continue your journey"}
//             {mode === "signup" && "Join thousands of event enthusiasts"}
//             {mode === "forgot" && "We'll send a reset link to your Gmail"}
//           </p>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             {mode === "signup" && (
//               <div className="relative">
//                 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
//                 <Input
//                   type="text"
//                   placeholder="Full name"
//                   value={formData.name}
//                   onChange={(e) =>
//                     setFormData({ ...formData, name: e.target.value })
//                   }
//                   className="pl-11 h-12 bg-muted/50 border-border/50"
//                   required
//                 />
//               </div>
//             )}

//             <div className="relative">
//               <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
//               <Input
//                 type="email"
//                 placeholder="Email address"
//                 value={formData.email}
//                 onChange={(e) =>
//                   setFormData({ ...formData, email: e.target.value })
//                 }
//                 className="pl-11 h-12 bg-muted/50 border-border/50"
//                 required
//               />
//             </div>

//             {mode !== "forgot" && (
//               <div className="relative">
//                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
//                 <Input
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Password"
//                   value={formData.password}
//                   onChange={(e) =>
//                     setFormData({ ...formData, password: e.target.value })
//                   }
//                   className="pl-11 pr-11 h-12 bg-muted/50 border-border/50"
//                   required
//                   minLength={6}
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
//                 >
//                   {showPassword ? (
//                     <EyeOff className="w-5 h-5" />
//                   ) : (
//                     <Eye className="w-5 h-5" />
//                   )}
//                 </button>
//               </div>
//             )}

//             {mode === "login" && (
//               <div className="flex justify-end">
//                 <button
//                   type="button"
//                   onClick={() => setMode("forgot")}
//                   className="text-sm text-primary hover:underline"
//                 >
//                   Forgot password?
//                 </button>
//               </div>
//             )}

//             <Button
//               type="submit"
//               variant="hero"
//               size="lg"
//               className="w-full"
//               disabled={isLoading}
//             >
//               {isLoading ? (
//                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//               ) : (
//                 <>
//                   {mode === "login" && "Sign In"}
//                   {mode === "signup" && "Create Account"}
//                   {mode === "forgot" && "Send Reset Link"}
//                 </>
//               )}
//             </Button>
//           </form>

//           <div className="mt-6 text-center text-sm text-muted-foreground">
//             {mode === "login" && (
//               <>
//                 Don't have an account?{" "}
//                 <button
//                   onClick={() => setMode("signup")}
//                   className="text-primary hover:underline font-medium"
//                 >
//                   Sign up
//                 </button>
//               </>
//             )}
//             {mode === "signup" && (
//               <>
//                 Already have an account?{" "}
//                 <button
//                   onClick={() => setMode("login")}
//                   className="text-primary hover:underline font-medium"
//                 >
//                   Sign in
//                 </button>
//               </>
//             )}
//             {mode === "forgot" && (
//               <>
//                 Remember your password?{" "}
//                 <button
//                   onClick={() => setMode("login")}
//                   className="text-primary hover:underline font-medium"
//                 >
//                   Sign in
//                 </button>
//               </>
//             )}
//           </div>
//         </motion.div>
//       </div>

//       <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
//         <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20" />
//         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
//         <div className="absolute inset-0 flex items-center justify-center p-12">
//           <div className="text-center">
//             <motion.div
//               initial={{ scale: 0.8, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               transition={{ delay: 0.3 }}
//               className="mb-8"
//             >
//               <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 animate-float">
//                 <Ticket className="w-16 h-16 text-primary-foreground" />
//               </div>
//             </motion.div>

//             <motion.h2
//               initial={{ y: 20, opacity: 0 }}
//               animate={{ y: 0, opacity: 1 }}
//               transition={{ delay: 0.4 }}
//               className="font-display text-4xl font-bold mb-4"
//             >
//               Your Gateway to
//               <br />
//               <span className="gradient-text">Unforgettable Moments</span>
//             </motion.h2>

//             <motion.p
//               initial={{ y: 20, opacity: 0 }}
//               animate={{ y: 0, opacity: 1 }}
//               transition={{ delay: 0.5 }}
//               className="text-muted-foreground max-w-sm mx-auto"
//             >
//               Join EventVibe and discover concerts, festivals, and experiences
//               tailored just for you.
//             </motion.p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Auth;
