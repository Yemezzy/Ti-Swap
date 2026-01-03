import React, { useState } from "react";


const HELIUS_RPC = import.meta.env.VITE_SOLANA_RPC; // Helius RPC with API key
const HELIUS_API = import.meta.env.VITE_HELIUS_API_KEY; // Helius REST API key

const Startpage = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [solBalance, setSolBalance] = useState(0);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);

  // Connect Phantom wallet
  const connectWallet = async () => {
    if (!window.solana || !window.solana.isPhantom) {
      alert("Please install Phantom wallet!");
      return;
    }
    try {
      const resp = await window.solana.connect();
      setWalletAddress(resp.publicKey.toString());
      fetchAllTokenData(resp.publicKey.toString());
    } catch (err) {
      console.error("Wallet connect failed:", err);
    }
  };

  // Fetch SOL and token balances + metadata
  const fetchAllTokenData = async (publicKey) => {
    setLoading(true);
    try {
      // --- 1. Fetch SOL balance ---
      const solRes = await fetch(HELIUS_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [publicKey],
        }),
      });
      const solJSON = await solRes.json();
      setSolBalance(solJSON.result?.value / 1e9 || 0);

      // --- 2. Fetch token balances ---
      const balancesRes = await fetch(
        `https://api.helius.xyz/v0/addresses/${publicKey}/balances?api-key=${HELIUS_API}`
      );
      const balancesJSON = await balancesRes.json();
      const tokenMints = balancesJSON.tokens?.map((t) => t.mint) || [];

      // --- 3. Fetch token metadata for all mints ---
      let metadata = [];
      if (tokenMints.length > 0) {
        const metaRes = await fetch(
          `https://api.helius.xyz/v0/tokens?api-key=${HELIUS_API}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mintAccounts: tokenMints }),
          }
        );
        metadata = await metaRes.json();
      }

      // --- 4. Merge balances + metadata ---
      const tokensWithMeta = balancesJSON.tokens.map((t) => {
        const meta = metadata.find((m) => m.mint === t.mint) || {};
        return { ...t, metadata: meta };
      });

      setTokens(tokensWithMeta);
    } catch (err) {
      console.error("Failed to fetch tokens:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBoostVolume = (token) => {
    alert(`Boost Volume clicked for ${token.metadata.symbol || token.symbol}`);
  };

  const handleTrendTokens = (token) => {
    alert(`Trend Tokens clicked for ${token.metadata.symbol || token.symbol}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center">
      {/* Navbar */}
      <nav className="flex justify-between w-full p-6 bg-gray-800 shadow-lg">
        <h1 className="text-2xl font-bold">Vol‑Boost</h1>
        <button
          onClick={connectWallet}
          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full font-semibold"
        >
          {walletAddress ? (
            <>
              <img src="" alt="SOL" className="w-5 h-5" />
              <span>{solBalance?.toFixed(2)} SOL</span>
            </>
          ) : (
            "Connect Wallet"
          )}
        </button>
      </nav>

      {/* Tokens */}
      {walletAddress && (
        <div className="w-full max-w-5xl mt-10 px-4">
          {loading && <p className="text-center">Loading tokens...</p>}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tokens.map((token, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800 rounded-xl p-5 shadow-lg text-center hover:scale-105 transition-transform"
                >
                  {token.metadata?.logoUri && (
                    <img
                      src={token.metadata.logoUri}
                      alt={token.metadata.name}
                      className="w-20 h-20 mx-auto mb-3 rounded-full object-cover"
                    />
                  )}
                  <h2 className="text-lg font-semibold">
                    {token.metadata?.name || token.symbol}
                  </h2>
                  <p className="text-gray-300">{token.metadata?.symbol || token.symbol}</p>
                  <p className="text-sm break-all text-gray-400">{token.mint}</p>
                  <p className="mt-1">
                    Total Supply:{" "}
                    {token.metadata?.supply
                      ? Number(token.metadata.supply) >= 1e9
                        ? "1 Billion"
                        : Number(token.metadata.supply) >= 1e6
                        ? "1 Million"
                        : token.metadata.supply
                      : "N/A"}
                  </p>
                  <p className="font-semibold">Your Balance: {token.amountUI ?? token.amount}</p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleBoostVolume(token)}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg"
                    >
                      Boost Volume
                    </button>
                    <button
                      onClick={() => handleTrendTokens(token)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
                    >
                      Trend Tokens
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Startpage;
