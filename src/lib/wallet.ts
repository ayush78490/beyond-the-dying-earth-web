/**
 * Wallet connection on Robinhood Chain through the browser's injected EIP-1193 provider
 * (MetaMask, Rabby, Coinbase Wallet…). No SDK: the waitlist needs an address and a signature.
 * Network details: https://docs.robinhood.com/chain/connecting
 */
interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

interface ChainInfo {
  id: number;
  name: string;
  rpc: string;
  explorer: string;
}

export const ROBINHOOD_CHAINS: Record<number, ChainInfo> = {
  4663: {
    id: 4663,
    name: 'Robinhood Chain',
    rpc: 'https://rpc.mainnet.chain.robinhood.com',
    explorer: 'https://robinhoodchain.blockscout.com',
  },
  46630: {
    id: 46630,
    name: 'Robinhood Chain Testnet',
    rpc: 'https://rpc.testnet.chain.robinhood.com',
    explorer: 'https://explorer.testnet.chain.robinhood.com',
  },
};

/** Used by the dev simulation; the backend decides the chain in real sign-ins. */
export const DEFAULT_CHAIN_ID = import.meta.env.VITE_ROBINHOOD_NETWORK === 'testnet' ? 46630 : 4663;

export type WalletPhase = 'connect' | 'network' | 'sign';

export function hasWallet() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

function provider() {
  const eth = window.ethereum;
  if (!eth) throw new Error('No wallet found. Install MetaMask or another browser wallet.');
  return eth;
}

/** Asks for an account, moves the wallet onto Robinhood Chain and signs the link message. */
export async function linkWallet(chainId: number, message: string, onPhase?: (p: WalletPhase) => void) {
  const eth = provider();
  try {
    onPhase?.('connect');
    const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
    const address = accounts?.[0];
    if (!address) throw new Error('No account was shared.');

    onPhase?.('network');
    await ensureChain(eth, chainId);

    onPhase?.('sign');
    const signature = (await eth.request({ method: 'personal_sign', params: [utf8ToHex(message), address] })) as string;
    return { address, signature };
  } catch (err) {
    throw walletError(err);
  }
}

async function ensureChain(eth: Eip1193Provider, chainId: number) {
  const hexId = `0x${chainId.toString(16)}`;
  const current = (await eth.request({ method: 'eth_chainId' })) as string;
  if (parseInt(current, 16) === chainId) return;
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] });
  } catch (err) {
    // 4902: the wallet doesn't know the chain yet — add it (this also switches)
    const code = (err as { code?: number; data?: { originalError?: { code?: number } } }).code;
    const inner = (err as { data?: { originalError?: { code?: number } } }).data?.originalError?.code;
    if (code !== 4902 && inner !== 4902) throw err;
    const c = ROBINHOOD_CHAINS[chainId];
    if (!c) throw new Error(`Unknown chain ${chainId}.`);
    await eth.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: hexId,
          chainName: c.name,
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: [c.rpc],
          blockExplorerUrls: [c.explorer],
        },
      ],
    });
  }
}

function walletError(err: unknown) {
  const code = (err as { code?: number }).code;
  if (code === 4001) return new Error('Request was declined in your wallet.');
  if (code === -32002) return new Error('Your wallet already has a request open — check the extension.');
  if (err instanceof Error && !('code' in err)) return err;
  return new Error((err as { message?: string }).message || 'Wallet connection failed.');
}

function utf8ToHex(s: string) {
  return `0x${Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
