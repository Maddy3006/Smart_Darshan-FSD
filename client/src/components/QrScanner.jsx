import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui.jsx';

let regionCounter = 0;

function cameraError(err) {
  const text = String(err?.message || err);
  if (/Permission|NotAllowed/i.test(text))
    return 'Camera permission was denied. Allow camera access in the browser, or type the code below.';
  if (/NotFound|Requested device not found/i.test(text)) return 'No camera was found on this device. Type the token code below instead.';
  if (/secure|https/i.test(text)) return 'The camera needs HTTPS or localhost. Type the token code below instead.';
  return 'Could not start the camera. Type the token code below instead.';
}

/** Camera QR scanner (html5-qrcode). Calls onScan(text) for every decoded code. */
export default function QrScanner({ onScan, autoStart = false }) {
  const regionId = useRef(`qr-region-${++regionCounter}`).current;
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const stop = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setActive(false);
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      /* already stopped */
    }
  };

  const start = async () => {
    setError('');
    setStarting(true);
    try {
      const scanner = new Html5Qrcode(regionId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (w, h) => {
            const size = Math.floor(Math.min(w, h) * 0.7);
            return { width: size, height: size };
          },
        },
        (text) => onScanRef.current(text),
        () => {},
      );
      setActive(true);
    } catch (err) {
      scannerRef.current = null;
      setError(cameraError(err));
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (autoStart) start();
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-temple-950 sm:aspect-[4/3]">
        <div id={regionId} className="qr-region absolute inset-0" />
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-temple-200">
            <ScanLine className="size-12 text-saffron-300" />
            <p className="text-sm">{error || 'Start the camera and hold the devotee’s QR code in the frame.'}</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {active ? (
          <Button variant="secondary" icon={CameraOff} onClick={stop} className="flex-1">
            Stop camera
          </Button>
        ) : (
          <Button variant="dark" icon={Camera} onClick={start} loading={starting} className="flex-1">
            Start camera
          </Button>
        )}
      </div>
    </div>
  );
}
