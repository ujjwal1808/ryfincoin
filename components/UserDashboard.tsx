"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Info } from "lucide-react";

interface UserDashboardProps {
  address?: string;
  isConnected: boolean;
  totalUsdValue: number;
  progressPercentage: number;
}

const UserDashboard: React.FC<UserDashboardProps> = ({
  address,
  isConnected,
  totalUsdValue,
  progressPercentage
}) => {
  // Demo data for now
  const demoData = {
    airdropAmount: "50,000 RYFN",
    claimedAmount: "25,000 RYFN",
    referralCount: 12,
    rewardAmount: "5,000 RYFN",
    totalPurchased: "75,000 RYFN",
    lastPurchase: "2024-01-15",
    tier: "Gold",
    nextTierProgress: 75
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="w-full px-4 py-6 bg-black/20 backdrop-blur-sm rounded-lg border border-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Airdrop & Claimed Section */}
        <Card className="bg-black/40 border-gray-800">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm text-gray-400">Airdrop Amount</h3>
                <HoverCard>
                  <HoverCardTrigger>
                    <Info className="h-4 w-4 text-gray-500" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 bg-black/90 border-gray-800">
                    <p className="text-xs text-gray-400">Total tokens allocated for airdrop to your wallet</p>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <p className="text-xl font-bold text-[#F8C91E]">{demoData.airdropAmount}</p>
              <div className="mt-2">
                <p className="text-sm text-gray-400">Claimed: {demoData.claimedAmount}</p>
                <Progress value={50} className="h-1 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Stats Section */}
        <Card className="bg-black/40 border-gray-800">
          <CardContent className="p-4">
            <div className="space-y-2">
              <h3 className="text-sm text-gray-400">Referral Statistics</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xl font-bold text-[#F8C91E]">{demoData.referralCount}</p>
                  <p className="text-xs text-gray-400">Total Referrals</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-[#F8C91E]">{demoData.rewardAmount}</p>
                  <p className="text-xs text-gray-400">Rewards Earned</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase History Section */}
        <Card className="bg-black/40 border-gray-800">
          <CardContent className="p-4">
            <div className="space-y-2">
              <h3 className="text-sm text-gray-400">Purchase History</h3>
              <p className="text-xl font-bold text-[#F8C91E]">{demoData.totalPurchased}</p>
              <p className="text-xs text-gray-400">Last Purchase: {demoData.lastPurchase}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tier Status Section */}
        <Card className="bg-black/40 border-gray-800">
          <CardContent className="p-4">
            <div className="space-y-2">
              <h3 className="text-sm text-gray-400">Tier Status</h3>
              <p className="text-xl font-bold text-[#F8C91E]">{demoData.tier}</p>
              <div className="mt-2">
                <p className="text-xs text-gray-400">Progress to Next Tier</p>
                <Progress value={demoData.nextTierProgress} className="h-1 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-400">
          Wallet: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not Connected'}
        </p>
      </div>
    </div>
  );
};

export default UserDashboard;