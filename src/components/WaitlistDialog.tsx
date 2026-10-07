import { useCallback, useEffect, useRef, useState } from 'react';
import { setScrollLocked } from '../lib/smoothScroll';
import { joinWaitlist } from '../lib/waitlist';
import { onOpenWaitlist } from '../lib/waitlistDialog';
import { hasWallet, linkWallet, ROBINHOOD_CHAINS, shortAddress, type WalletPhase } from '../lib/wallet';
import {
  forgetXSession,
  savedXSession,
  startXAuth,
  takeXAuthReturn,
  whenXAuthReady,
  type XProfile,
  type XSession,
} from '../lib/xAuth';
import './WaitlistDialog.css';

type Step = 'x' | 'wallet';
type Status = 'idle' | 'busy' | 'error' | 'done';

const DONE_KEY = 'btde-waitlist-wallet';

// read once per page load: are we coming back from X's consent screen?
const X_RETURN = typeof window === 'undefined' ? null : takeXAuthReturn();
let xReturnHandled = false;

const BUSY_LABEL: Record<WalletPhase | 'save', string> = {
  connect: 'Awaiting wallet…',
  network: 'Switching to Robinhood…',
  sign: 'Sign in your wallet…',
  save: 'Locking signal…',
};

function linkedWallet(): string | null {
  try {
    return sessionStorage.getItem(DONE_KEY);
  } catch {
    return null;
  }
}

/**
 * The waitlist uplink: one holographic circuit card, two stages shown one at a time.
 *   01  Continue with X           → Supabase Auth (X OAuth 2.0), a page redirect
 *   02  Hi Mr. <username>         → connect a wallet on Robinhood Chain and sign, which
 *                                   stores the X account + wallet in Supabase
 * The card boots open (a scan line unfolds it), and re-boots between stages.
 */
export function WaitlistDialog({ ready }: { ready: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const source = useRef('hero');
  const [closing, setClosing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [session, setSession] = useState<XSession | null>(null);
  const [step, setStep] = useState<Step>('x');
  const [status, setStatus] = useState<Status>('idle');
  const [phase, setPhase] = useState<WalletPhase | 'save'>('connect');
  const [message, setMessage] = useState('');
  const [wallet, setWallet] = useState<string | null>(null);
  const profile = session?.profile ?? null;
  const chainName = ROBINHOOD_CHAINS[session?.chainId ?? 4663]?.name ?? 'Robinhood Chain';

  const close = useCallback(() => {
    const el = dialog.current;
    if (!el?.open || closing) return;
    setClosing(true);
    window.setTimeout(() => {
      el.close();
      setClosing(false);
    }, 260);
  }, [closing]);

  const show = useCallback((src: string) => {
    const el = dialog.current;
    if (!el || el.open) return;
    source.current = src;
    el.showModal();
    setScrollLocked(true);
  }, []);

  /** the card re-boots into another stage */
  const reboot = useCallback((apply: () => void) => {
    setLeaving(true);
    window.setTimeout(() => {
      apply();
      setLeaving(false);
    }, 320);
  }, []);

  // open from any CTA; resume where the pilot left off this session
  useEffect(
    () =>
      onOpenWaitlist((src) => {
        if (dialog.current?.open) return;
        const saved = savedXSession();
        const linked = saved ? linkedWallet() : null;
        setSession(saved);
        setStep(saved ? 'wallet' : 'x');
        setWallet(linked);
        setStatus(linked ? 'done' : 'idle');
        setMessage(linked ? `Signal locked. You're on the list, Mr. ${saved?.profile.username}.` : '');
        show(src);
      }),
    [show],
  );

  // back from X's consent screen: reopen the card once Supabase has the session
  useEffect(() => {
    if (!ready || !X_RETURN || xReturnHandled) return;
    xReturnHandled = true;
    const ret = X_RETURN;
    setStep('x');
    setSession(null);
    setWallet(null);
    show(ret.source);
    if (ret.error) {
      setStatus('error');
      setMessage(ret.error);
      return;
    }
    setStatus('busy');
    setMessage('');
    void whenXAuthReady().then(() => {
      const s = savedXSession();
      if (!s) {
        setStatus('error');
        setMessage('X sign-in failed. Please try again.');
        return;
      }
      setSession(s);
      reboot(() => {
        setStep('wallet');
        setStatus('idle');
      });
    });
  }, [ready, show, reboot]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onClose = () => setScrollLocked(false);
    el.addEventListener('close', onClose);
    return () => el.removeEventListener('close', onClose);
  }, []);

  async function onConnectX() {
    if (status === 'busy') return;
    setStatus('busy');
    setMessage('');
    try {
      // real sign-ins leave the page here; the dev simulation resolves
      const s = await startXAuth(source.current);
      setSession(s);
      reboot(() => {
        setStep('wallet');
        setStatus('idle');
      });
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'X sign-in failed.');
    }
  }

  async function onConnectWallet() {
    if (status === 'busy' || status === 'done' || !session) return;
    setStatus('busy');
    setMessage('');
    try {
      const { address, signature } = await linkWallet(session.chainId, session.message, setPhase);
      setPhase('save');
      await joinWaitlist(
        { address, signature, chainId: session.chainId, source: source.current },
        session.profile.username,
      );
      setWallet(address);
      setStatus('done');
      setMessage(`Signal locked. You're on the list, Mr. ${session.profile.username}.`);
      try {
        sessionStorage.setItem(DONE_KEY, address);
      } catch {
        // storage unavailable
      }
    } catch (err) {
      if (err instanceof Error && /session expired/i.test(err.message)) return expire();
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Wallet connection failed.');
    }
  }

  function resetToX(msg = '', st: Status = 'idle') {
    void forgetXSession();
    try {
      sessionStorage.removeItem(DONE_KEY);
    } catch {
      // storage unavailable
    }
    reboot(() => {
      setSession(null);
      setWallet(null);
      setStep('x');
      setStatus(st);
      setMessage(msg);
    });
  }

  const expire = () => resetToX('Your X session expired. Please continue with X again.', 'error');
  const switchAccount = () => resetToX();

  return (
    <dialog
      ref={dialog}
      className={`wd ${closing ? 'is-closing' : ''}`}
      aria-labelledby="wd-title"
      aria-describedby="wd-sub"
      data-lenis-prevent
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className={`wd__card ${leaving ? 'is-leaving' : ''}`} data-step={step} data-status={status}>
        <CardFrame />
        <div className="wd__scan" aria-hidden />

        <button type="button" className="wd__close" aria-label="Close" onClick={close}>
          <svg viewBox="0 0 24 24" aria-hidden focusable={false}>
            <path d="M6 6 18 18M18 6 6 18" />
          </svg>
        </button>

        <div key={step} className="wd__body">
          <p className="wd__kicker">
            <span className="wd__blink" aria-hidden />
            {step === 'x' ? 'Uplink 01 · Identity' : 'Uplink 02 · Wallet'}
          </p>

          <Emblem step={step} profile={profile} done={status === 'done'} />

          {step === 'x' ? (
            <>
              <h2 id="wd-title" className="wd__title">
                Connect your <span className="wd__accent">X</span>
              </h2>
              <p id="wd-sub" className="wd__sub">
                Authenticate with X to claim your place in the fleet.
              </p>
              <div className="wd__rule" aria-hidden>
                <span />
              </div>
              <button type="button" className="wd__action" onClick={onConnectX} disabled={status === 'busy'}>
                <span className="wd__action-icon">
                  <XLogo />
                </span>
                <span className="wd__action-sep" aria-hidden />
                <span className="wd__action-label">{status === 'busy' ? 'Authenticating…' : 'Continue with X'}</span>
              </button>
            </>
          ) : (
            <>
              <h2 id="wd-title" className="wd__title wd__title--greet">
                Hi Mr. <span className="wd__accent">{profile?.username}</span>
              </h2>
              <p id="wd-sub" className="wd__sub">
                Your X account is connected. Link a wallet on {chainName} to lock your spot.
              </p>
              <div className="wd__rule wd__rule--ok" aria-hidden>
                <span />
                <CheckBadge />
                <span />
              </div>
              <button
                type="button"
                className={`wd__action ${status === 'done' ? 'is-done' : ''}`}
                onClick={onConnectWallet}
                disabled={status === 'busy' || status === 'done'}
              >
                <span className="wd__action-icon">{status === 'done' ? <TickIcon /> : <WalletIcon />}</span>
                <span className="wd__action-sep" aria-hidden />
                <span className="wd__action-label">
                  {status === 'busy'
                    ? BUSY_LABEL[phase]
                    : status === 'done' && wallet
                      ? `Linked · ${shortAddress(wallet)}`
                      : 'Connect your wallet'}
                </span>
              </button>
              {status !== 'done' && !hasWallet() && (
                <p className="wd__note">
                  No wallet detected —{' '}
                  <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
                    get MetaMask
                  </a>
                </p>
              )}
            </>
          )}

          <p className="wd__status" role="status" aria-live="polite">
            {message}
          </p>

          <div className="wd__foot">
            <ol className="wd__steps" aria-label="Progress">
              <li className={step === 'x' ? 'is-active' : 'is-done'}>01 X</li>
              <li className={step === 'wallet' ? (status === 'done' ? 'is-done' : 'is-active') : ''}>02 Wallet</li>
            </ol>
            {step === 'wallet' && status !== 'busy' && (
              <button type="button" className="wd__switch" onClick={switchAccount}>
                Not you?
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}

/* ------------------------------------------------------------------ art */

const OUTLINE =
  'M26 1 H150 L162 11 H258 L270 1 H394 L419 26 V210 L413 216 V364 L419 370 V554 L394 579 H270 L258 569 H162 L150 579 H26 L1 554 V370 L7 364 V216 L1 210 V26 Z';
const INNER =
  'M34 14 H146 L156 22 H264 L274 14 H386 L406 34 V206 L400 212 V368 L406 374 V546 L386 566 H274 L264 558 H156 L146 566 H34 L14 546 V374 L20 368 V212 L14 206 V34 Z';

/** Card chrome: chamfered double border, light runners and corner circuit traces. */
function CardFrame() {
  const traces = [
    'M14 96 H32 L46 82 V58 L58 46 H96',
    'M14 120 H40 L54 106',
    'M120 22 V40 L132 52 H170',
    'M406 96 H388 L374 82 V58 L362 46 H324',
    'M406 120 H380 L366 106',
    'M300 22 V40 L288 52 H250',
    'M14 484 H32 L46 498 V522 L58 534 H96',
    'M406 484 H388 L374 498 V522 L362 534 H324',
    'M20 300 H38 L48 290 V250',
    'M400 300 H382 L372 310 V350',
  ];
  return (
    <svg className="wd__frame" viewBox="0 0 420 580" preserveAspectRatio="none" aria-hidden focusable={false}>
      <defs>
        <linearGradient id="wd-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5ad7ff" />
          <stop offset="0.55" stopColor="#7b4dff" />
          <stop offset="1" stopColor="#e04cff" />
        </linearGradient>
      </defs>
      <path className="wd__outline" d={OUTLINE} />
      <path className="wd__outline-glow" d={OUTLINE} />
      <path className="wd__inner" d={INNER} />
      <path className="wd__runner" d={OUTLINE} pathLength={1000} />
      <path className="wd__runner wd__runner--b" d={OUTLINE} pathLength={1000} />
      {traces.map((d, i) => (
        <g key={d} style={{ ['--i' as string]: i }}>
          <path className="wd__trace" d={d} pathLength={1} />
          <path className="wd__pulse" d={d} pathLength={100} />
        </g>
      ))}
      {/* edge notches */}
      <path className="wd__notch" d="M166 6 H254 M166 574 H254 M4 230 V350 M416 230 V350" />
    </svg>
  );
}

/** Rotating reticle around the X mark (stage 1) or the pilot's avatar (stage 2). */
function Emblem({ step, profile, done }: { step: Step; profile: XProfile | null; done: boolean }) {
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);
  const traces = [
    'M88 100 H64 L52 88 H10',
    'M92 78 L76 62 H34',
    'M92 122 L76 138 H44',
    'M272 100 H296 L308 112 H350',
    'M268 78 L284 62 H326',
    'M268 122 L284 138 H316',
  ];
  const ends: [number, number][] = [
    [10, 88],
    [34, 62],
    [44, 138],
    [350, 112],
    [326, 62],
    [316, 138],
  ];
  const initial = (profile?.name || profile?.username || '?').charAt(0).toUpperCase();
  return (
    <div className={`wd__emblem ${done ? 'is-done' : ''}`}>
      <svg viewBox="0 0 360 200" aria-hidden focusable={false}>
        <defs>
          <linearGradient id="wd-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5ad7ff" />
            <stop offset="1" stopColor="#a43cff" />
          </linearGradient>
          <radialGradient id="wd-core" cx="50%" cy="45%" r="60%">
            <stop offset="0" stopColor="#1b2a6b" />
            <stop offset="1" stopColor="#070b22" />
          </radialGradient>
          <clipPath id="wd-avatar">
            <circle cx="180" cy="100" r="58" />
          </clipPath>
        </defs>

        {traces.map((d, i) => (
          <g key={d} style={{ ['--i' as string]: i }}>
            <path className="wd__trace" d={d} pathLength={1} />
            <path className="wd__pulse wd__pulse--in" d={d} pathLength={100} />
          </g>
        ))}
        {ends.map(([x, y], i) => (
          <circle key={i} className="wd__node" cx={x} cy={y} r="3" style={{ ['--i' as string]: i }} />
        ))}

        <g className="wd__ring wd__ring--ticks">
          {ticks.map((a) => (
            <line key={a} x1="180" y1="6" x2="180" y2={a % 45 === 0 ? 14 : 10} transform={`rotate(${a} 180 100)`} />
          ))}
        </g>
        <circle className="wd__ring wd__ring--dash" cx="180" cy="100" r="84" />
        <circle className="wd__ring wd__ring--arcs" cx="180" cy="100" r="74" pathLength={100} />
        <circle className="wd__ring wd__ring--core" cx="180" cy="100" r="64" />
        <circle cx="180" cy="100" r="58" fill="url(#wd-core)" />

        {step === 'x' ? (
          <g className="wd__mark">
            <svg x="148" y="68" width="64" height="64" viewBox="0 0 24 24">
              <path d={X_PATH} fill="currentColor" />
            </svg>
          </g>
        ) : profile?.avatar ? (
          <image
            className="wd__mark"
            href={profile.avatar.replace('_normal', '_400x400')}
            x="122"
            y="42"
            width="116"
            height="116"
            clipPath="url(#wd-avatar)"
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <text className="wd__mark wd__initial" x="180" y="100" textAnchor="middle" dominantBaseline="central">
            {initial}
          </text>
        )}
      </svg>
    </div>
  );
}

const X_PATH =
  'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';

const XLogo = () => (
  <svg viewBox="0 0 24 24" aria-hidden focusable={false}>
    <path d={X_PATH} fill="currentColor" />
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden focusable={false}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
    <rect x="3.5" y="7.5" width="17" height="12" rx="2.5" />
    <path d="M20.5 11.5H16a2 2 0 0 0 0 4h4.5" />
    <circle cx="16.4" cy="13.5" r="0.6" fill="currentColor" />
  </svg>
);

const TickIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

const CheckBadge = () => (
  <svg className="wd__badge" viewBox="0 0 32 32" aria-hidden focusable={false}>
    <path className="wd__badge-hex" d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25Z" />
    <path className="wd__badge-tick" d="m10.5 16.5 3.8 3.6 7.2-8" pathLength={1} />
  </svg>
);
