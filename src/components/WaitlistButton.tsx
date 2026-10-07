import { useRef } from 'react';
import { openWaitlist } from '../lib/waitlistDialog';
import { ArrowRight } from './Icons';
import './WaitlistButton.css';

interface Props {
  /** analytics tag sent with the signup */
  source: string;
}

/**
 * The waitlist call to action: an energy-charged button that opens the sign-up dialog
 * (X, then wallet). Hover sparks and the click pulse are pure CSS.
 */
export function WaitlistButton({ source }: Props) {
  const button = useRef<HTMLButtonElement>(null);

  function onClick() {
    button.current?.classList.remove('is-pulsing');
    void button.current?.offsetWidth; // restart the pulse animation
    button.current?.classList.add('is-pulsing');
    openWaitlist(source);
  }

  return (
    <div className="waitlist">
      <button ref={button} className="waitlist__button" type="button" aria-haspopup="dialog" onClick={onClick}>
        <span className="waitlist__sparks" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} style={{ ['--i' as string]: i }} />
          ))}
        </span>
        <span className="waitlist__label">Join the waitlist</span>
        <ArrowRight className="waitlist__arrow" />
      </button>
    </div>
  );
}
