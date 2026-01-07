
export const playNotificationSound = () => {
  try {
    // Check for browser support
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    // Create a new AudioContext
    const ctx = new AudioContext();

    const playTone = () => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Generate a pleasant "Glass" Ping sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t); // B5 Note
      
      // Volume Envelope (Quick attack, smooth decay)
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02); // Attack
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2); // Decay

      osc.start(t);
      osc.stop(t + 1.2);

      // Cleanup the context after sound finishes to free memory
      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close();
      }, 1300);
    };

    // Check AudioContext State (Browser Autoplay Policy)
    // If state is suspended (common if no user interaction yet), try to resume.
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        playTone();
      }).catch((e) => {
        // If resume fails, it means the user strictly hasn't interacted with the page yet.
        // We log a warning but don't crash.
        console.warn('Notification sound prevented by browser autoplay policy (Interaction required).');
      });
    } else {
      playTone();
    }

  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

export const playWarningSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContext();

    const playBeep = (startTime: number, freq: number, type: OscillatorType = 'sawtooth') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Warning sound envelope (more abrupt)
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    };

    const now = ctx.currentTime;
    
    // Play double beep sequence
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        playBeep(ctx.currentTime, 440); // Low
        playBeep(ctx.currentTime + 0.2, 440); // Low
      }).catch(console.warn);
    } else {
        playBeep(now, 440);
        playBeep(now + 0.2, 440);
    }

    setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close();
    }, 1000);

  } catch (error) {
    console.error('Error playing warning sound:', error);
  }
};
