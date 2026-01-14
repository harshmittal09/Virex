import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle, XCircle, AlertTriangle, Upload, Camera, RefreshCcw } from 'lucide-react';
import { Input } from "@/components/ui/input";

// Define Response Interface
interface ScanResponse {
  success: boolean;
  message: string;
  attendee?: string;
  type?: string;
}

const OrganizerScanner = () => {
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [useCamera, setUseCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false); // Lock to prevent double-scans

  // Initialize & Auto-Start Camera
  useEffect(() => {
    // Only initialize if using camera and we are in "scanning" mode (no result, not loading)
    if (useCamera && !scanResult && !loading) {
      const startCamera = async () => {
        try {
          if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode("reader");
          }

          if (isScanningRef.current) return;

          // Reset processing lock
          isProcessingRef.current = false;

          await scannerRef.current.start(
            { facingMode: "environment" },
            {
              fps: 15, // Increased FPS for faster detection
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              onScanSuccess(decodedText);
            },
            (errorMessage) => {
              // Ignore frame parse errors
            }
          );
          
          isScanningRef.current = true;
          setCameraError(null);

        } catch (err) {
          console.error("Camera Start Error:", err);
          setCameraError("Camera failed to start. Please allow permissions or use File Upload.");
          setUseCamera(false);
        }
      };

      // Start immediately
      startCamera();

      return () => {
        // Cleanup: We don't await stop() here to prevent unmount blocks, just trigger it
        if (scannerRef.current && isScanningRef.current) {
            scannerRef.current.stop().catch(e => console.error("Stop error", e));
            isScanningRef.current = false;
        }
      };
    }
  }, [useCamera, scanResult, loading]);

  const stopScanner = async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop();
        isScanningRef.current = false;
      } catch (e) {
        console.error("Stop failed", e);
      }
    }
  };

  // Optimized Success Handler
  const onScanSuccess = async (decodedText: string) => {
    // 1. Immediate Lock
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // 2. Instant UI Feedback (Hide camera view immediately via state)
    setLoading(true);

    try {
        console.log("Fast Verifying:", decodedText);

        // 3. Parallel Execution: Request DB verification AND Stop Camera simultaneously
        const verifyPromise = axios.post('http://localhost:5000/api/scan', {
            qrData: decodedText,
            scannedBy: "Auto-Scanner"
        });

        const stopCameraPromise = stopScanner();

        // 4. Wait for Verification Response
        const response = await verifyPromise;
        
        // 5. Ensure camera is stopped before showing result
        await stopCameraPromise;

        setScanResult({
            success: true,
            message: response.data.message,
            attendee: response.data.attendee,
            type: response.data.type
        });

    } catch (error: any) {
        console.error("Backend Error:", error);
        await stopScanner(); // Ensure stopped on error
        const msg = error.response?.data?.message || "Connection Failed";
        setScanResult({ success: false, message: msg });
    } finally {
        setLoading(false);
        isProcessingRef.current = false;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        setLoading(true);
        isProcessingRef.current = true;

        const fileScanner = new Html5Qrcode("file-reader-placeholder");
        try {
            const decodedText = await fileScanner.scanFile(file, true);
            fileScanner.clear();
            
            // Re-use the optimized verification logic
            const response = await axios.post('http://localhost:5000/api/scan', {
                qrData: decodedText,
                scannedBy: "File-Upload"
            });

            setScanResult({
                success: true,
                message: response.data.message,
                attendee: response.data.attendee,
                type: response.data.type
            });
        } catch (err: any) {
            console.error("File Scan Error:", err);
            const msg = err.response?.data?.message || "Could not read QR code. Try a clearer image.";
            setScanResult({ success: false, message: msg });
            fileScanner.clear();
        } finally {
            setLoading(false);
            isProcessingRef.current = false;
        }
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setLoading(false);
    // State change triggers useEffect to restart camera immediately
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 flex flex-col items-center justify-center text-white">
      <div className="w-full max-w-md">
        <Link to="/organizer" className="flex items-center gap-2 mb-6 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        
        <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="text-center text-white flex items-center justify-center gap-2">
                    <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                     Scanner
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* 1. VERIFYING STATE - Overlay or Replace */}
                {loading && (
                    <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                        <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-6" />
                        <h3 className="text-2xl font-bold">Verifying...</h3>
                        <p className="text-slate-400 mt-2">Checking database</p>
                    </div>
                )}

                {/* 2. SCANNER VIEW (Hidden when loading/result to prevent unmount glitches) */}
                <div style={{ display: (!scanResult && !loading) ? 'block' : 'none' }}>
                    <div className="space-y-6">
                        {cameraError && (
                            <div className="p-3 bg-red-900/50 border border-red-800 rounded text-sm text-red-200 text-center">
                                {cameraError}
                            </div>
                        )}

                        {useCamera ? (
                            <div className="relative rounded-xl overflow-hidden border-2 border-slate-700 bg-black">
                                {/* The Reader Div - Must stay in DOM for library */}
                                <div id="reader" className="w-full h-[300px]"></div>
                                
                                <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                                    <div className="w-48 h-48 border-2 border-white/50 rounded-lg relative">
                                        <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-500"></div>
                                        <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-500"></div>
                                        <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-500"></div>
                                        <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-500"></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 px-4 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/50 text-center">
                                <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                                <h3 className="text-lg font-medium mb-2">Upload QR Image</h3>
                                <div className="relative">
                                    <Input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                                    />
                                    <Button variant="outline" className="w-full">Select Image</Button>
                                </div>
                                <div id="file-reader-placeholder" className="hidden"></div>
                            </div>
                        )}

                        <div className="flex justify-center">
                            <Button 
                                variant="ghost" 
                                onClick={() => {
                                    // Stop camera before switching
                                    stopScanner().then(() => setUseCamera(!useCamera));
                                }}
                                className="text-slate-400 hover:text-white gap-2"
                            >
                                {useCamera ? <><Upload className="w-4 h-4" /> Switch to Upload</> : <><Camera className="w-4 h-4" /> Switch to Camera</>}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 3. RESULT DISPLAY */}
                {scanResult && !loading && (
                    <div className="animate-in slide-in-from-bottom-5 duration-300">
                        <div className={`text-center p-6 rounded-xl border-2 ${
                            scanResult.success 
                                ? 'bg-green-500/10 border-green-500/50 text-green-400' 
                                : 'bg-red-500/10 border-red-500/50 text-red-400'
                        }`}>
                            <div className="flex justify-center mb-4">
                                {scanResult.success ? (
                                    <CheckCircle className="w-20 h-20 text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                                ) : scanResult.message.includes("ALREADY") ? (
                                    <AlertTriangle className="w-20 h-20 text-yellow-500" />
                                ) : (
                                    <XCircle className="w-20 h-20 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                                )}
                            </div>

                            <h2 className="text-4xl font-black mb-2 uppercase tracking-wide">
                                {scanResult.success ? "VALID" : "INVALID"}
                            </h2>
                            
                            <p className="text-xl font-medium mb-6 text-white">
                                {scanResult.message}
                            </p>

                            {scanResult.success && (
                                <div className="bg-slate-800/80 rounded-lg p-4 mb-6 text-left border border-slate-700">
                                    <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                                        <span className="text-slate-500">NAME:</span>
                                        <span className="text-white font-bold truncate">{scanResult.attendee}</span>
                                        <span className="text-slate-500">TYPE:</span>
                                        <span className="text-blue-400 font-bold">{scanResult.type || "General Admission"}</span>
                                    </div>
                                </div>
                            )}
                            
                            <Button 
                                onClick={handleReset} 
                                size="lg" 
                                className={`w-full font-bold text-lg h-14 ${
                                    scanResult.success 
                                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20' 
                                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20'
                                }`}
                            >
                                SCAN NEXT
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrganizerScanner;