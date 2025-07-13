"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import Image from "next/image";

const TELEGRAM_GROUP_URL = "https://t.me/RyfinGlobalEx"; // Replace with actual group link

export default function TelegramAirdropCard() {
  return (
    <div className="bg-gray-400/10 rounded-lg p-6 max-w-md mx-auto text-center shadow-lg border border-yellow-500/30">
      <h1 className="text-[#F8C91E] font-bold text-xl mb-6">JOIN OUR TELEGRAM AIRDROP!</h1>
      <div className="flex justify-center mb-4">
        {/* <Image src="/telegram-logo.png" alt="Join Telegram" width={64} height={64} /> */}
      </div>
      <p className="mb-4 text-gray-300 text-base">
        Become a part of our community and claim your exclusive <span className="font-semibold text-[#F8C91E]">Airdrop Reward</span>!
      </p>
      <div className="bg-gray-800 rounded-md p-4 mb-4">
        <ol className="text-gray-400 text-sm text-left list-decimal list-inside space-y-1">
          <li>Click the button below</li>
          <li>Join the Telegram group</li>
          <li>Follow instructions in the group to claim your reward</li>
        </ol>
      </div>
      <a href={TELEGRAM_GROUP_URL} target="_blank" rel="noopener noreferrer">
        <Button className="w-full bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white font-bold text-lg py-3 px-4 rounded-lg shadow-[0px_4px_17px_1px_#F8C91EB2]">
          Join Telegram & Claim Airdrop
        </Button>
      </a>
    </div>
  );
}
