let audioContext = null;

/** Short confirmation beeps for the gate scanner, so staff don't need to look at the screen. */
export function beep(kind = 'success') {
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    const tones = kind === 'success' ? [880, 1320] : [220, 180];
    tones.forEach((frequency, i) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = kind === 'success' ? 'sine' : 'square';
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.08;
      oscillator.connect(gain).connect(audioContext.destination);
      const start = audioContext.currentTime + i * 0.12;
      oscillator.start(start);
      oscillator.stop(start + 0.1);
    });
    navigator.vibrate?.(kind === 'success' ? 80 : [60, 40, 60]);
  } catch {
    /* audio not available */
  }
}
