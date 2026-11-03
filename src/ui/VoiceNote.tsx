// An optional voice note for one player at one session: tap to record (stops by itself after
// VOICE_MAX_SECONDS), tap to play, or delete. The recording stays on this device. Hidden on
// browsers that can't record.

import { useEffect, useRef, useState } from 'preact/hooks';
import { VOICE_MAX_SECONDS } from '../config/checks';
import * as svc from '../services';
import type { VoiceNote as Note } from '../types';
import { useLive } from './hooks';

const canRecord = () => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export function VoiceNote({ eventId, playerId }: { eventId: string; playerId: string }) {
  const notes = useLive(() => svc.voiceNotesFor(eventId), [eventId]);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState('');
  const rec = useRef<{ r: MediaRecorder; stream: MediaStream; started: number; timer: number } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const note: Note | undefined = notes?.find((n) => n.playerId === playerId);

  // Stop the microphone if the coach moves on while recording.
  useEffect(() => () => stop(true), [playerId]);

  if (!canRecord()) return null;

  async function start() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const parts: Blob[] = [];
      const started = Date.now();
      r.ondataavailable = (e) => e.data.size && parts.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!parts.length) return;
        const blob = new Blob(parts, { type: r.mimeType || 'audio/webm' });
        if (blob.size) await svc.saveVoiceNote(eventId, playerId, await blob.arrayBuffer(), blob.type, Date.now() - started);
      };
      const timer = window.setInterval(() => {
        const s = Math.floor((Date.now() - started) / 1000);
        setSecs(s);
        if (s >= VOICE_MAX_SECONDS) stop();
      }, 250);
      rec.current = { r, stream, started, timer };
      r.start();
      setSecs(0);
      setRecording(true);
    } catch {
      setError('The microphone isn’t available. Check the browser’s permission for this site.');
    }
  }

  function stop(discard = false) {
    const c = rec.current;
    if (!c) return;
    window.clearInterval(c.timer);
    if (discard) {
      c.r.ondataavailable = null;
      c.r.onstop = () => c.stream.getTracks().forEach((t) => t.stop());
    }
    rec.current = null;
    if (c.r.state !== 'inactive') c.r.stop();
    setRecording(false);
  }

  function play() {
    if (!note) return;
    audio.current?.pause();
    const url = URL.createObjectURL(new Blob([note.data], { type: note.mime }));
    const a = new Audio(url);
    a.onended = () => URL.revokeObjectURL(url);
    audio.current = a;
    void a.play();
  }

  return (
    <div class="voice">
      {recording ? (
        <button type="button" class="btn voice-btn recording" onClick={() => stop()}>
          ■ Stop ({VOICE_MAX_SECONDS - secs}s)
        </button>
      ) : note ? (
        <>
          <button type="button" class="btn voice-btn" onClick={play}>
            ▶ Voice note ({Math.max(1, Math.round(note.ms / 1000))}s)
          </button>
          <button type="button" class="btn ghost small" onClick={() => svc.deleteVoiceNote(note.id)} aria-label="Delete voice note">
            Delete
          </button>
        </>
      ) : (
        <button type="button" class="btn voice-btn" onClick={start}>
          🎙 Voice note
        </button>
      )}
      {error && <p class="tiny bad-text">{error}</p>}
    </div>
  );
}
