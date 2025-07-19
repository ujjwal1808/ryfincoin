import Image from "next/image"
import { Facebook, Twitter, Instagram, Linkedin, Github, Send, Youtube } from 'lucide-react';
import { Play, Menu, X, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react'
import TelegramAirdropCard from "@/components/TelegramAirdropCard"
import ReturnsCalculator from "@/components/ReturnsCalculator"
import { fetchTotalUsdValueSpentByUser, refreshTotalUsdValueSpentByUser, UserProgressData } from '@/services/tokenSalesService';
import { Globe, Mail, Phone, MapPin } from 'lucide-react';
import TelegramLogin from "./components/TelegramLogin";
import UserDashboard from "./components/UserDashboard";
import pinklogo from "@/assets/pinksale.webp";

// Add type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: Record<string, unknown>;
  }
}

export default function Page() {
  const { address, isConnected } = useAppKitAccount();
  const [referralUrl, setReferralUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState('M'); // Default selected size is M
  const [selectedColor, setSelectedColor] = useState('white'); // Default selected color is white
  const [isShippingFormOpen, setIsShippingFormOpen] = useState(false); // State to control shipping form visibility
  const [shippingDetails, setShippingDetails] = useState({
    fullName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  const [formErrors, setFormErrors] = useState({
    fullName: false,
    email: false,
    address: false,
    city: false,
    state: false,
    zipCode: false,
    country: false
  });
  const [formTouched, setFormTouched] = useState({
    fullName: false,
    email: false,
    address: false,
    city: false,
    state: false,
    zipCode: false,
    country: false
  });
  const [userProgress, setUserProgress] = useState({
    totalUsdValue: 0,
    progressPercentage: 0,
    isLoading: false,
    error: null as string | null
  });
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [visibleSections, setVisibleSections] = useState<string[]>([]);

  const [isAirdropModalOpen, setIsAirdropModalOpen] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState("");
  const [twitterVerified, setTwitterVerified] = useState(false);
  const [verifyingTwitter, setVerifyingTwitter] = useState(false);
  const [retweetVerified, setRetweetVerified] = useState(false);
  const [verifyingRetweet, setVerifyingRetweet] = useState(false);

  const socialLinks = [
    { icon: <Twitter className="h-5 w-5" />, href: 'https://x.com/ryfinexchange?t=QsrFYleBs-rMw8SCMVEGXA&s=09', label: 'Twitter' },
    { icon: <Facebook className="h-5 w-5" />, href: 'https://www.facebook.com/share/1E5v899c4D/', label: 'Facebook' },
    { icon: <Instagram className="h-5 w-5" />, href: 'https://www.instagram.com/ryfinexchange?igsh=MWZ0bmxieDN6ZGs2dg==', label: 'Instagram' },
    { icon: <Linkedin className="h-5 w-5" />, href: 'https://www.linkedin.com/company/ryfin-global-exchange-inc/', label: 'LinkedIn' },
    { icon: <Send className="h-5 w-5" />, href: 'https://t.me/RyfinGlobalEx', label: 'Send' },
    { icon: <Youtube className="h-5 w-5" />, href: 'https://youtube.com/@ryfinexchange?si=GVegtDyvGGOUuOHd', label: 'Youtube' },
  ];

  const connectTwitter = async () => {
    const width = 600;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004'}/api/twitter/auth/initiate`,
      'Twitter Auth',
      `width=${width},height=${height},left=${left},top=${top},popup=true`
    );

    if (popup) {
      window.addEventListener('message', async (event) => {
        if (event.origin === (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004')) {
          const { data } = event;
          if (data.type === 'TWITTER_AUTH_SUCCESS') {
            // Handle successful authentication data here
            console.log('Twitter auth data:', data);
            popup.close();
            // Update your modal state here with the received data
          }
        }
      });
    }
    // try {
    //   const response = await fetch('/api/twitter/auth');
    //   const data = await response.json();
    //   if (data.url) {
    //     window.location.href = data.url;
    //   }
    // } catch (error) {
    //   console.error('Error connecting to Twitter:', error);
    // }
  };

  const verifyTwitterFollow = async () => {
    if (!twitterHandle) return;
    setVerifyingTwitter(true);
    try {
      const response = await fetch(`/api/twitter/is-following/${twitterHandle}`);
      const data = await response.json();
      setTwitterVerified(data.isFollowing);
    } catch (error) {
      console.error('Error verifying Twitter follow:', error);
    } finally {
      setVerifyingTwitter(false);
    }
  };

  const verifyRetweet = async () => {
    if (!twitterHandle) return;
    setVerifyingRetweet(true);
    try {
      const response = await fetch(`/api/twitter/verify-retweet/${twitterHandle}`);
      const data = await response.json();
      setRetweetVerified(data.hasRetweeted);
    } catch (error) {
      console.error('Error verifying retweet:', error);
    } finally {
      setVerifyingRetweet(false);
    }
  };

  // Generate referral URL when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      const baseUrl = window.location.href.split('#')[0];
      setReferralUrl(`${baseUrl}#BuyNow?ref=${address}`);
    } else {
      setReferralUrl('');
    }
  }, [isConnected, address]);

  // Fetch user's total USD value spent when wallet is connected
  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!isConnected || !address) {
        setUserProgress({
          totalUsdValue: 0,
          progressPercentage: 0,
          isLoading: false,
          error: null
        });
        return;
      }

      try {
        setUserProgress(prev => ({ ...prev, isLoading: true, error: null }));

        console.log('Fetching progress for address:', address);

        // Use the service function instead of direct fetch
        const progressData = await fetchTotalUsdValueSpentByUser(address);

        console.log('Progress data received:', progressData);

        setUserProgress({
          totalUsdValue: progressData.totalUsdValue || 0,
          progressPercentage: progressData.progressPercentage || 0,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching user progress:', error);

        // Create a more detailed error message
        let errorMessage = 'Failed to fetch user progress';
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        setUserProgress(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
      }
    };

    fetchUserProgress();
  }, [isConnected, address]);

  // Function to copy referral URL to clipboard
  const copyReferralUrl = async () => {
    if (referralUrl) {
      try {
        await navigator.clipboard.writeText(referralUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    }
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when clicking a link
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Function to handle size selection
  const handleSizeSelect = (size: string) => {
    console.log('Size selected:', size);
    setSelectedSize(size);
  };

  // Function to handle color selection
  const handleColorSelect = (color: string) => {
    console.log('Color selected:', color);
    setSelectedColor(color);
  };

  // Function to open shipping form
  const openShippingForm = () => {
    console.log('Opening shipping form');
    setIsShippingFormOpen(true);
  };

  // Function to close shipping form
  const closeShippingForm = () => {
    console.log('Closing shipping form');
    setIsShippingFormOpen(false);
  };

  // Function to handle shipping form input changes
  const handleShippingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Update form values
    setShippingDetails(prev => ({
      ...prev,
      [name]: value
    }));

    // Mark field as touched
    setFormTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate field
    setFormErrors(prev => ({
      ...prev,
      [name]: value.trim() === '' || (name === 'email' && !validateEmail(value))
    }));
  };

  // Function to validate email format
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Function to handle shipping form submission
  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched = Object.keys(formTouched).reduce((acc, key) => {
      acc[key as keyof typeof formTouched] = true;
      return acc;
    }, { ...formTouched });

    setFormTouched(allTouched);

    // Validate all fields
    const newErrors = {
      fullName: shippingDetails.fullName.trim() === '',
      email: shippingDetails.email.trim() === '' || !validateEmail(shippingDetails.email),
      address: shippingDetails.address.trim() === '',
      city: shippingDetails.city.trim() === '',
      state: shippingDetails.state.trim() === '',
      zipCode: shippingDetails.zipCode.trim() === '',
      country: shippingDetails.country.trim() === ''
    };

    setFormErrors(newErrors);

    // Check if any errors exist
    const hasErrors = Object.values(newErrors).some(error => error);

    if (!hasErrors) {
      try {
        // Check if wallet is connected
        if (!isConnected || !address) {
          alert('Please connect your wallet to submit the form.');
          return;
        }

        // Create message to sign
        const message = `I confirm that I want to receive a RYFIN T-shirt with the following details:
Wallet Address: ${address}
Full Name: ${shippingDetails.fullName}
Email: ${shippingDetails.email}
Size: ${selectedSize}
Color: ${selectedColor}
Timestamp: ${Date.now()}`;

        // Request signature from wallet
        if (!window.ethereum) {
          alert('Ethereum provider not found. Please install MetaMask or another wallet.');
          return;
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum as any);
        const signer = provider.getSigner();
        const signature = await signer.signMessage(message);

        // Send data to backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004'}/api/tshirt-giveaway/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: address,
            fullName: shippingDetails.fullName,
            email: shippingDetails.email,
            address: shippingDetails.address,
            city: shippingDetails.city,
            state: shippingDetails.state,
            zipCode: shippingDetails.zipCode,
            country: shippingDetails.country,
            size: selectedSize,
            color: selectedColor,
            signature,
            message
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to submit T-shirt request');
        }

        alert('Thank you! Your T-shirt request has been submitted successfully.');
        closeShippingForm();

        // Reset form
        setShippingDetails({
          fullName: '',
          email: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: ''
        });
        setFormTouched({
          fullName: false,
          email: false,
          address: false,
          city: false,
          state: false,
          zipCode: false,
          country: false
        });
        setFormErrors({
          fullName: false,
          email: false,
          address: false,
          city: false,
          state: false,
          zipCode: false,
          country: false
        });
      } catch (error) {
        console.error('Error submitting T-shirt request:', error);
        alert(`Failed to submit T-shirt request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Scroll to the first error
      const firstErrorField = Object.keys(newErrors).find(key => newErrors[key as keyof typeof newErrors]);
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }
    }
  };

  // Function to refresh user progress data
  const refreshUserProgress = async () => {
    if (!isConnected || !address) {
      console.log('Cannot refresh: User not connected or no address available');
      return;
    }

    // Prevent refreshing if already loading
    if (userProgress.isLoading) {
      console.log('Already refreshing progress, please wait...');
      return;
    }

    try {
      // Update loading state
      setUserProgress(prev => ({ ...prev, isLoading: true, error: null }));
      console.log('Refreshing progress for address:', address);

      // Use the new refresh endpoint that bypasses cache and queries the Graph API directly
      const progressData = await refreshTotalUsdValueSpentByUser(address);

      console.log('Progress data refreshed:', progressData);

      // Update state with new data
      setUserProgress({
        totalUsdValue: progressData.totalUsdValue || 0,
        progressPercentage: progressData.progressPercentage || 0,
        isLoading: false,
        error: null
      });

      // Show a brief message to the user that data was refreshed
      console.log('Progress data successfully refreshed!');
    } catch (error) {
      console.error('Error refreshing user progress:', error);

      // Create a user-friendly error message
      let errorMessage = 'Failed to refresh user progress';
      if (error instanceof Error) {
        // Check for rate limit error
        if (error.message.includes('Rate limit exceeded')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }

      // Update state with error
      setUserProgress(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  };

  // Function to open the video modal
  const openVideoModal = () => {
    console.log('Opening video modal');
    setIsVideoModalOpen(true);
  };

  // Function to close the video modal
  const closeVideoModal = () => {
    console.log('Closing video modal');
    setIsVideoModalOpen(false);
  };

  // Function to check if element is in viewport
  const isInViewport = (element: HTMLElement, offset = 150) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top <= window.innerHeight - offset &&
      rect.bottom >= offset
    );
  };

  // Setup intersection observer for scroll animations
  useEffect(() => {
    const sections = document.querySelectorAll('section');
    const heroSection = document.getElementById('hero');

    // Add hero to visible sections on initial load
    setVisibleSections(prev => [...prev, 'hero']);

    const checkVisibility = () => {
      if (heroSection && isInViewport(heroSection)) {
        setVisibleSections(prev => prev.includes('hero') ? prev : [...prev, 'hero']);
      }

      sections.forEach(section => {
        if (isInViewport(section as HTMLElement)) {
          const sectionId = section.id || `section-${Math.random().toString(36).substr(2, 9)}`;
          if (!section.id) section.id = sectionId;

          setVisibleSections(prev =>
            prev.includes(sectionId) ? prev : [...prev, sectionId]
          );
        }
      });
    };

    // Check visibility on initial load
    checkVisibility();

    // Set up scroll event listener
    window.addEventListener('scroll', checkVisibility);

    // Clean up
    return () => window.removeEventListener('scroll', checkVisibility);
  }, []);

  // telegram login button
  const handleTelegramAuth = async (user: any) => {
    console.log("Telegram user data:", user);

    // Check if wallet is connected
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
      const response = await fetch(`${baseUrl}/api/telegram/auth?telegram_id=${user.username}&wallet=${address}&first_name=${user.first_name}&last_name=${user.last_name}&tg_id=${user.id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Telegram auth response:', data);

      if (data.success) {
        alert('Telegram account linked successfully!');
      } else {
        alert(data.message || 'Failed to link Telegram account');
      }
    } catch (error) {
      console.error('Error linking Telegram account:', error);
      alert('Failed to link Telegram account. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#030813] text-white relative overflow-x-hidden flex flex-col">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] right-[30%] w-[800px] h-[800px] bg-yellow-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[20%] left-[20%] w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-[150px]" />
      </div>
      {/* Header */}
      <header className={`container mx-auto px-4 pt-2 pb-0 flex items-center justify-between relative z-50 ${mobileMenuOpen ? 'md:flex hidden' : 'flex'
        }`}>
        <div className="flex items-center gap-2 mt-1 mb-1">
          <Image
            src="/assets/ryfin-logo.png"
            alt="RYFIN Exchange Logo"
            width={160}
            height={55}
            className="h-16 w-auto"
          />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 mb-0">
          <a href="#" className="hover:text-yellow-500 transition-colors">
            Home
          </a>
          <a href="#" className="hover:text-yellow-500 transition-colors">
            About
          </a>
          <a href="#" className="hover:text-yellow-500 transition-colors">
            Our App
          </a>
          <a href="#" className="hover:text-yellow-500 transition-colors">
            Pages
          </a>
          <a href="#" className="hover:text-yellow-500 transition-colors">
            Token Sale
          </a>
          <a href="https://drive.google.com/file/d/1eKxlBITT_9PiLrEdzHUeySq0qPzfTVCE/view" className="hover:text-yellow-500 transition-colors" target="blank">
            Whitepaper
          </a>

          {/* <a href="https://ryfinexchange.com/" target="_blank" className="hover:text-yellow-500 transition-colors">
            Ryfin Exchange
          </a> */}

        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-4">

          {/* <Button 
            className="bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg mb-0 hidden sm:block shadow-[0px_4px_17px_1px_#F8C91EB2]"
            // onClick={() => window.open("https://ryfinexchange.com/", "_blank")}
            onClick={() => {
              setIsAirdropModalOpen(true);
              closeMobileMenu();
            }}
          >
            Airdrop
          </Button> */}
          <button
            onClick={toggleMobileMenu}
            className="text-white p-2 focus:outline-none"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Desktop Download Button */}
        {/* <TelegramLogin botName="ryfinauthbot" onAuth={handleTelegramAuth} /> */}
        {/* <Button 
          className="hidden md:block bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white font-bold py-3 px-6 rounded-lg mb-0 shadow-[0px_4px_17px_1px_#F8C91EB2]"
          // onClick={() => window.open("https://ryfinexchange.com/", "_blank")}
          onClick={() => setIsAirdropModalOpen(true)}
        >
          Airdrop
        </Button> */}
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-[#030813] z-50 transition-transform duration-300 ease-in-out transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          } md:hidden`}
      >
        <div className="container mx-auto px-4 py-8 flex flex-col h-full">
          <div className="flex justify-between items-center mb-8">
            <Image
              src="/assets/ryfin-logo.png"
              alt="RYFIN Exchange Logo"
              width={140}
              height={48}
              className="h-12 w-auto"
            />
            <button
              onClick={toggleMobileMenu}
              className="text-white p-2 focus:outline-none"
              aria-label="Close mobile menu"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex flex-col gap-6 text-lg">
            <a
              href="#"
              className="hover:text-yellow-500 transition-colors py-2 border-b border-gray-800"
              onClick={closeMobileMenu}
            >
              Home
            </a>
            <a
              href="#"
              className="hover:text-yellow-500 transition-colors py-2 border-b border-gray-800"
              onClick={closeMobileMenu}
            >
              About
            </a>
            <a
              href="#"
              className="hover:text-yellow-500 transition-colors py-2 border-b border-gray-800"
              onClick={closeMobileMenu}
            >
              Our App
            </a>
            <a
              href="#"
              className="hover:text-yellow-500 transition-colors py-2 border-b border-gray-800"
              onClick={closeMobileMenu}
            >
              Pages
            </a>
            <a
              href="#"
              className="hover:text-yellow-500 transition-colors py-2 border-b border-gray-800"
              onClick={closeMobileMenu}
            >
              Token Sale
            </a>
            <a
              href="https://drive.google.com/file/d/1eKxlBITT_9PiLrEdzHUeySq0qPzfTVCE/view"
              className="hover:text-yellow-500 transition-colors py-2 border-b border-gray-800"
              target="blank"
            >
              Whitepaper
            </a>

            {/* <a 
              href="https://ryfinexchange.com/" 
              target="_blank"
              className="hover:text-yellow-500 transition-colors py-2 border-b border-gray-800"
              onClick={closeMobileMenu}
            >
               Ryfin Exchange
            </a> */}
          </nav>

          <div className="mt-auto">
            {/* <Button 
              className="w-full bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white font-bold py-3 px-6 rounded-lg shadow-[0px_4px_17px_1px_#F8C91EB2]"
              // onClick={() => {
              //   window.open("https://ryfinexchange.com/", "_blank");
              //   closeMobileMenu();
              // }}
            >
              Airdrop
            </Button> */}
          </div>
        </div>
      </div>

      {/* Main Content with Animation Classes */}
      <main className="flex-grow">
        {/* Hero Section */}
        <div id="hero" className={`relative mb-12 md:mb-24 transition-all duration-1000 transform ${visibleSections.includes('hero') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Make backgrounds span full width by removing container constraints */}
          <div className="absolute inset-0 w-screen bg-no-repeat bg-cover bg-center opacity-50 pointer-events-none" />
          <video
            src="/assets/VN20250307_144924.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-screen bg-no-repeat bg-cover bg-center opacity-20 pointer-events-none "
          ></video>



          {/* Spacer between navbar and hero content */}
          <span className="block h-4 md:h-8"></span>

          <div id="hero" className="container mx-auto px-4 grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-7xl relative">
            <div className="space-y-4 md:space-y-8 relative">
              <h1 className="text-3xl sm:text-5xl md:text-5xl lg:text-[72px] font-[600] leading-tight md:leading-[1.2] lg:leading-[90px] tracking-[0%] font-melodrama">
                Ryfin Coin - {" "}
                <span className="block">
                  <span className="text-yellow-500">Powering the Future</span> of Digital Finance
                </span>
              </h1>

              <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-xl">
                Ryfin Coin (RYFN) is more than just a cryptocurrency—it's the foundation of a secure, transparent, and innovative financial ecosystem. Built on Ethereum, Ryfin Coin offers a seamless, user-friendly, and rewarding experience for investors, traders, and crypto enthusiasts.
              </p>

              <div className="flex flex-wrap gap-3 md:gap-4">
                <Button className="bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg text-sm sm:text-base shadow-[0px_4px_17px_1px_#F8C91EB2]">Get Started</Button>
                <Button
                  variant="ghost"
                  className="border border-yellow-500 text-white hover:bg-transparent hover:text-yellow-400 text-sm sm:text-base py-2 px-4 rounded-lg flex items-center"
                  onClick={() => {
                    console.log("Button clicked, setting showVideo to true");
                    setShowVideo(true);
                  }}
                >
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-yellow-500" />
                  Watch Tutorials
                </Button>
              </div>

              {/* <div className="space-y-2 md:space-y-4 pt-4 md:pt-6">
                <h2 className="font-melodrama font-[500] text-2xl sm:text-4xl md:text-5xl lg:text-[60px] leading-tight md:leading-[1.2] lg:leading-[75px] tracking-[0%]">Referral Program</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input 
                    value={isConnected && address ? referralUrl : "Connect Wallet"} 
                    readOnly 
                    className="bg-gray-800/50 border-gray-700 w-full md:w-96 text-sm sm:text-base" 
                  />
                  <Button 
                    className={`bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg text-sm sm:text-base shadow-[0px_4px_17px_1px_#F8C91EB2] ${!isConnected || !address ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={copyReferralUrl}
                    disabled={!isConnected || !address}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                
              </div> */}
            </div>

            {/* Token sale card */}
            <div className="w-full md:w-[600px] md:ml-16 mt-8 md:mt-0">
              {/* Telegram Airdrop Card: Join Telegram for Airdrop Reward */}
              <TelegramAirdropCard />
            </div>
          </div>
          {/* <span className="block h-8 md:h-14"></span> */}
        </div>


        {/* About Us */}
        <section id="feature-2" className={`py-12 sm:py-16 md:py-24 px-4 sm:px-6 transition-all duration-1000 transform ${visibleSections.includes('feature-2') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-7xl mx-auto">
            <div className="space-y-4 sm:space-y-6 order-2 md:order-1 text-left">
              <h3 className="text-3xl sm:text-4xl font-melodrama">About Us</h3>
              <span className="text-yellow-500 font-medium uppercase tracking-wider text-sm sm:text-base">Welcome to RyfinCoin – The Heart of Ryfin Global Exchange Inc.</span>
              <div className="text-gray-400 leading-relaxed text-sm sm:text-base">
                <ul className="inline-block text-justify">
                  <li>At Ryfin Global Exchange Inc., we are pioneering the future of cryptocurrency trading with innovation, security, and user empowerment at our core. As a premier platform supporting major cryptocurrencies like Bitcoin, Ethereum, XRP, and more, we’re committed to delivering a seamless and rewarding digital asset experience for users worldwide.</li>
                  <br />
                  <li>RyfinCoin (RYF) is the utility token powering our ecosystem — and it's designed to give you real value, not just speculative hype.</li>
                  <br />
                  <li>Whether you're a beginner exploring crypto or an experienced trader looking for more benefits, RyfinCoin unlocks a world of possibilities. Use RYF to trade and buy other cryptocurrencies, stake for rewards, and access exclusive features on the Ryfin Global Exchange platform.</li>
                </ul>
              </div>

            </div>
            <div className="order-1 md:order-2">
              <div className="relative mx-auto max-w-[400px] md:max-w-none">
                <div className="absolute inset-[-50%] w-[140%] h-[200%] bg-[url('/assets/sparkling.svg')] bg-no-repeat bg-cover bg-center opacity-40"></div>
                <Image
                  src="/assets/ryfin-logo.png"
                  alt="NFT Coin"
                  width={500}
                  height={400}
                  className="rounded-xl relative z-10 w-full h-auto"
                />
              </div>
            </div>
          </div>
        </section>

        {/* why choose us? */}
        <section id="feature-2" className={`py-12 pb-24 px-4 sm:px-6 transition-all duration-1000 transform ${visibleSections.includes('feature-2') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="grid md:grid-cols-1 gap-8 md:gap-12 items-center max-w-7xl mx-auto">
            <div className="space-y-4 sm:space-y-6 order-2 md:order-1 text-left ">
              <h3 className="text-3xl sm:text-4xl font-melodrama text-center">Why RyfinCoin?</h3>
              {/* <span className="text-yellow-500 font-medium uppercase tracking-wider text-sm sm:text-base">Welcome to RyfinCoin – The Heart of Ryfin Global Exchange Inc.</span> */}

              <div className="border border-red-600 bg-red-600/10 rounded-lg p-5  ">
                <p className="text-white opacity-90 text-sm sm:text-base"><strong >✔ Trade More, Spend Less:</strong><br />Use RyfinCoin to buy and trade top cryptocurrencies at lower fees.</p>
              </div>

              <div className="border border-yellow-400 bg-yellow-400/10 rounded-lg p-5  ">
                <p className="text-white opacity-90 text-sm sm:text-base"><strong >✔ Earn While You Hold:</strong><br />Stake your RYF tokens and earn attractive staking rewards over time.</p>
              </div>

              <div className="border border-purple-500 bg-purple-500/10 rounded-lg p-5  ">
                <p className="text-white opacity-90 text-sm sm:text-base"><strong >✔ Powerful Utility:</strong><br />RyfinCoin is more than a token — it's your gateway to premium tools, faster transactions, and member-only benefits on the Ryfin platform.</p>
              </div>

              <div className="border border-blue-400 bg-blue-400/10 rounded-lg p-5  ">
                <p className="text-white opacity-90 text-sm sm:text-base"><strong >✔ Secure & Scalable Ecosystem:</strong> <br />Built on robust blockchain infrastructure, RyfinCoin is integrated into a secure and scalable trading environment designed to meet the needs of global users.</p>
              </div>
            </div>

          </div>
        </section>

        {/* our registration */}

        <section id="presale" className={`py-12 md:py-24 relative overflow-hidden transition-all duration-1000 transform ${visibleSections.includes('presale') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Background watermarks */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Ethereum diamond watermark */}
            <div className="absolute inset-0 w-full h-full opacity-20">
              <div className="w-[150%] h-[150%] absolute top-1/2 left-[55%] transform -translate-x-1/2 -translate-y-1/2 bg-[url('/assets/ethereum-diamond.svg')] bg-no-repeat bg-contain bg-center"></div>
            </div>
          </div>

          <div className="text-center mb-8 md:mb-12 relative z-10 px-4">
            <h2 className="text-3xl md:text-4xl font-melodrama mb-4">Our Registration</h2>
            <div className="mx-auto max-w-4xl">
            <p className="text-gray-400  text-sm sm:text-base">
              Ryfin Global Exchange Inc. is officially registered in Panama as a legal entity (Persona Jurídica). This solidifies our commitment to operating with full regulatory compliance and global business standards.
              </p>
              <p className="text-yellow-500 font-medium uppercase tracking-wider text-justify mt-8 mb-3">Key Corporate Information:</p>
              <ul className="list-disc list-inside text-gray-400 text-sm sm:text-base text-justify">
                <li>Legal Name: Ryfin Global Exchange Inc.</li>
                <li>Jurisdiction: Panama</li>
                <li>Date of Incorporation: January 17, 2025</li>
                <li>Official Registry:  Panama Public Registry – Panadata</li>
              </ul>
              <p className="text-gray-400 mx-auto max-w-4xl text-sm sm:text-base mt-3 text-justify">Our transparent legal foundation strengthens trust, provides peace of mind, and ensures that Ryfin Global Exchange Inc. operates securely within a recognized international framework.</p>
            
            </div>
            <div className="border border-yellow-400 bg-yellow-400/10 rounded-lg p-5 text-justify mx-auto max-w-5xl mt-8">
              <p className="text-white opacity-90 text-sm sm:text-base"><strong >Join the Ryfin Revolution:</strong> <br />With RyfinCoin and Ryfin Global Exchange, you're not just trading crypto — you're investing in a future where your token works for you. <br /> <strong>Explore. Trade. Stake. Grow — with Ryfin.</strong></p> 
            </div>


          </div>


        </section>

        {/* Feature Section 1 */}
        <section id="feature-1" style={{ marginBottom: '30px' }} className={`py-6 sm:py-6 md:py-6 px-4 sm:px-6 transition-all duration-1000 transform ${visibleSections.includes('feature-1') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <UserDashboard
            address={address}
            isConnected={isConnected}
            totalUsdValue={userProgress.totalUsdValue}
            progressPercentage={userProgress.progressPercentage}
          />
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-7xl mx-auto">
            <div>
              <Image
                src="/lady.jpg"
                alt="NFT Image"
                width={575}
                height={460}
                className="rounded-xl border-2 border-yellow-500"
              />
            </div>
            <div className="space-y-6">
              <span className="text-yellow-500 font-medium uppercase tracking-wider">Revolutionizing Crypto with Innovation</span>
              <h3 className="text-4xl font-light font-melodrama">Security You Can Trust</h3>
              <div className="text-gray-400 leading-relaxed">
                <ul>
                  <li>Cold & Hot Wallet Storage for enhanced fund protection</li>
                  <li>Multi-Factor Authentication (MFA) for secure account access</li>
                  <li>Regular third-party security audits</li>
                  <li>Insurance coverage for added protection</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button className="bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white px-8 shadow-[0px_4px_17px_1px_#F8C91EB2]">Join Ryfin</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Section 2 */}
        <section id="feature-2" className={`py-12 sm:py-16 md:py-24 px-4 sm:px-6 transition-all duration-1000 transform ${visibleSections.includes('feature-2') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-7xl mx-auto">
            <div className="space-y-4 sm:space-y-6 order-2 md:order-1 text-right">
              <span className="text-yellow-500 font-medium uppercase tracking-wider text-sm sm:text-base">Revolutionizing Crypto with Innovation</span>
              <h3 className="text-3xl sm:text-4xl font-melodrama">Built for Growth & Stability</h3>
              <div className="text-gray-400 leading-relaxed text-sm sm:text-base">
                <ul className="inline-block text-right">
                  <li>Total Supply: <b>210,000,000 RYFN</b></li>
                  <li>Blockchain: <b>Ethereum-based with Layer 2 development underway</b></li>
                  <li>Smart contracts enabling fast and secure transactions</li>
                </ul>
              </div>
              <div className="flex justify-end">
                <Button className="bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white px-6 sm:px-8 py-2 text-sm sm:text-base shadow-[0px_4px_17px_1px_#F8C91EB2]">Join Ryfin</Button>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="relative mx-auto max-w-[400px] md:max-w-none">
                <div className="absolute inset-[-50%] w-[140%] h-[200%] bg-[url('/assets/sparkling.svg')] bg-no-repeat bg-cover bg-center opacity-40"></div>
                <Image
                  src="/assets/ryfin-coin.svg"
                  alt="NFT Coin"
                  width={500}
                  height={400}
                  className="rounded-xl relative z-10 w-full h-auto"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Feature Section 3 */}
        <section id="feature-3" className={`py-12 sm:py-16 md:py-24 px-4 sm:px-6 transition-all duration-1000 transform ${visibleSections.includes('feature-3') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-7xl mx-auto">
            <div className="space-y-4 sm:space-y-6">
              <span className="text-yellow-500 font-medium uppercase tracking-wider text-sm sm:text-base">Revolutionizing Crypto with Innovation</span>
              <h3 className="text-3xl sm:text-4xl font-melodrama font-light">Community-Driven Ecosystem</h3>
              <div className="text-gray-400 leading-relaxed text-sm sm:text-base">
                <ul>
                  <li>Transparent governance model for community participation</li>
                  <li>Development roadmap shaped by community feedback</li>
                  <li>Regular AMAs and community events</li>
                  <li>Rewards for active community members</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button className="bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white px-6 sm:px-8 py-2 text-sm sm:text-base shadow-[0px_4px_17px_1px_#F8C91EB2]">Join Ryfin</Button>
              </div>
            </div>
            <div className="order-first md:order-last">
              <Image
                src="/car.webp"
                alt="Car NFT"
                width={575}
                height={460}
                className="rounded-xl border-2 border-yellow-500"
              />
            </div>
          </div>
        </section>

        {/* Token Details Section */}
        <section id="token-details" className={`py-24 transition-all duration-1000 transform ${visibleSections.includes('token-details') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-melodrama text-center mb-16">Token Details</h2>
            <p className="text-center text-yellow-500 font-medium mb-10">Contract Address: 0x57d580cEe957ea3cd8F35cbfA905a1c997c216a3</p>

            <div className="relative w-full">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[20%] right-[30%] w-[800px] h-[800px] bg-yellow-500/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[20%] left-[20%] w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-[150px]" />
              </div>

              {/* Mobile Layout - Sequential display */}
              <div className="md:hidden relative max-w-5xl mx-auto">
                {/* Mobile coin image first */}
                <div className="flex justify-center mb-10 animate-fadeIn">
                  <div className="relative">
                    <Image
                      src="/assets/ryfin-coin.svg"
                      alt="RYFIN Coin"
                      width={180}
                      height={180}
                      className="relative z-10"
                    />
                  </div>
                </div>

                {/* Token Details Cards - Stacked for mobile */}
                <div className="flex flex-col gap-4">
                  {/* Token Name */}
                  <div
                    className="w-full bg-gradient-to-r from-[#C89A38] via-[#FCD244] via-[#FCD95A] via-[#FDE47E] via-[#EFE0A3] via-[#FDE47E] via-[#FCD95A] via-[#FCD244] to-[#C89A38] rounded-lg p-3 text-center border border-[#F8C91E]/30 opacity-0 animate-fadeIn"
                    style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
                  >
                    <h3 className="text-base font-semibold mb-1 text-black">Token Name</h3>
                    <p className="text-lg text-black">RYFIN</p>
                  </div>

                  {/* Token Symbol */}
                  <div
                    className="w-full bg-gradient-to-r from-[#C89A38] via-[#FCD244] via-[#FCD95A] via-[#FDE47E] via-[#EFE0A3] via-[#FDE47E] via-[#FCD95A] via-[#FCD244] to-[#C89A38] rounded-lg p-3 text-center border border-[#F8C91E]/30 opacity-0 animate-fadeIn"
                    style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
                  >
                    <h3 className="text-base font-semibold mb-1 text-black">Token Symbol</h3>
                    <p className="text-lg text-black">RYFN</p>
                  </div>

                  {/* Blockchain */}
                  <div
                    className="w-full bg-gradient-to-r from-[#C89A38] via-[#FCD244] via-[#FCD95A] via-[#FDE47E] via-[#EFE0A3] via-[#FDE47E] via-[#FCD95A] via-[#FCD244] to-[#C89A38] rounded-lg p-3 text-center border border-[#F8C91E]/30 opacity-0 animate-fadeIn"
                    style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
                  >
                    <h3 className="text-base font-semibold mb-1 text-black">Blockchain</h3>
                    <p className="text-lg text-black">Ethereum (erc20)</p>
                  </div>

                  {/* Token Type */}
                  <div
                    className="w-full bg-gradient-to-r from-[#C89A38] via-[#FCD244] via-[#FCD95A] via-[#FDE47E] via-[#EFE0A3] via-[#FDE47E] via-[#FCD95A] via-[#FCD244] to-[#C89A38] rounded-lg p-3 text-center border border-[#F8C91E]/30 opacity-0 animate-fadeIn"
                    style={{ animationDelay: '800ms', animationFillMode: 'forwards' }}
                  >
                    <h3 className="text-base font-semibold mb-1 text-black">Token Type</h3>
                    <p className="text-lg text-black">Security Token</p>
                  </div>

                  {/* Total Supply */}
                  <div
                    className="w-full bg-gradient-to-r from-[#C89A38] via-[#FCD244] via-[#FCD95A] via-[#FDE47E] via-[#EFE0A3] via-[#FDE47E] via-[#FCD95A] via-[#FCD244] to-[#C89A38] rounded-lg p-3 text-center border border-[#F8C91E]/30 opacity-0 animate-fadeIn"
                    style={{ animationDelay: '1000ms', animationFillMode: 'forwards' }}
                  >
                    <h3 className="text-base font-semibold mb-1 text-black">Total Supply</h3>
                    <p className="text-lg text-black">210,000,000</p>
                  </div>

                  {/* Decimals */}
                  <div
                    className="w-full bg-gradient-to-r from-[#C89A38] via-[#FCD244] via-[#FCD95A] via-[#FDE47E] via-[#EFE0A3] via-[#FDE47E] via-[#FCD95A] via-[#FCD244] to-[#C89A38] rounded-lg p-3 text-center border border-[#F8C91E]/30 opacity-0 animate-fadeIn"
                    style={{ animationDelay: '1200ms', animationFillMode: 'forwards' }}
                  >
                    <h3 className="text-base font-semibold mb-1 text-black">Decimals</h3>
                    <p className="text-lg text-black">18</p>
                  </div>
                </div>
              </div>

              {/* Desktop Layout - Original star formation */}
              <div className="hidden md:block relative max-w-5xl mx-auto">
                {/* Top Row */}
                <div className="flex justify-center gap-20 mb-12">
                  <div className="w-[200px] bg-gradient-to-r from-[#C89A38] via-[#FCD244] via-[#FCD95A] via-[#FDE47E] via-[#EFE0A3] via-[#FDE47E] via-[#FCD95A] via-[#FCD244] to-[#C89A38] rounded-lg p-3 text-center border border-[#F8C91E]/30">
                    <h3 className="text-base font-semibold mb-1 text-black">Token Name</h3>
                    <p className="text-lg text-black">RYFIN</p>
                  </div>

                  <div className="w-[200px] bg-gradient-to-r from-[#C89A38] via-[#FCD244] via-[#FCD95A] via-[#FDE47E] via-[#EFE0A3] via-[#FDE47E] via-[#FCD95A] via-[#FCD244] to-[#C89A38] rounded-lg p-3 text-center border border-[#F8C91E]/30">
                    <h3 className="text-base font-semibold mb-1 text-black">Token Symbol</h3>
                    <p className="text-lg text-black">RYFN</p>
                  </div>
                </div>

                {/* Middle Row with Image */}
                <div className="flex justify-between items-center">
                  <div className="w-[200px] bg-gradient-to-r from-[#C89A38] via-[#FCD244] via-[#FCD95A] via-[#FDE47E] via-[#EFE0A3] via-[#FDE47E] via-[#FCD95A] via-[#FCD244] to-[#C89A38] rounded-lg p-3 text-center border border-[#F8C91E]/30">
                    <h3 className="text-base font-semibold mb-1 text-black">Blockchain</h3>
                    <p className="text-lg text-black">Ethereum (erc20)</p>
                  </div>

                  <div className="relative mx-24">
                    <Image
                      src="/assets/ryfin-coin.svg"
                      alt="RYFIN Coin"
                      width={220}
                      height={220}
                      className="relative z-10"
                    />
                  </div>

                  <div className="w-[200px] bg-gradient-to-r from-[#C89A38] via-[#FCD244] via-[#FCD95A] via-[#FDE47E] via-[#EFE0A3] via-[#FDE47E] via-[#FCD95A] via-[#FCD244] to-[#C89A38] rounded-lg p-3 text-center border border-[#F8C91E]/30">
                    <h3 className="text-base font-semibold mb-1 text-black">Token Type</h3>
                    <p className="text-lg text-black">Utility Token</p>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex justify-center gap-20 mt-12">
                  <div className="w-[200px] bg-gradient-to-r from-[#C89A38] via-[#FCD244] via-[#FCD95A] via-[#FDE47E] via-[#EFE0A3] via-[#FDE47E] via-[#FCD95A] via-[#FCD244] to-[#C89A38] rounded-lg p-3 text-center border border-[#F8C91E]/30">
                    <h3 className="text-base font-semibold mb-1 text-black">Total Supply</h3>
                    <p className="text-lg text-black">210,000,000</p>
                  </div>

                  <div className="w-[200px] bg-gradient-to-r from-[#C89A38] via-[#FCD244] via-[#FCD95A] via-[#FDE47E] via-[#EFE0A3] via-[#FDE47E] via-[#FCD95A] via-[#FCD244] to-[#C89A38] rounded-lg p-3 text-center border border-[#F8C91E]/30">
                    <h3 className="text-base font-semibold mb-1 text-black">Decimals</h3>
                    <p className="text-lg text-black">18</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tokenomics Section */}
        <section id="tokenomics" className={`py-24 transition-all duration-1000 transform ${visibleSections.includes('tokenomics') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="container mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto">
              <div className="w-full md:w-1/2 md:pr-8 mb-12 md:mb-0">
                <div className="w-full">
                  <p className="text-yellow-500 font-medium uppercase tracking-wider mb-2 text-sm sm:text-base">Ryfin Global Exchange</p>
                  <h2 className="text-3xl sm:text-4xl font-melodrama mb-6 tracking-wide">A Platform You Can Rely On</h2>
                  <p className="text-gray-400 leading-relaxed mb-8 text-sm sm:text-base">Ryfin Coin is the backbone of <b>Ryfin Global Exchange</b>, a next-generation centralized trading platform that prioritizes security, user experience, and global accessibility.</p>

                  <div className="space-y-4">
                    <div className="border border-red-600 bg-red-600/10 rounded-lg p-5">
                      <p className="text-white opacity-90 text-sm sm:text-base"><strong>✔ Intuitive Dashboard:</strong><br />Designed for both beginners and experienced traders</p>
                    </div>

                    <div className="border border-yellow-400 bg-yellow-400/10 rounded-lg p-5">
                      <p className="text-white opacity-90 text-sm sm:text-base"><strong>✔ Seamless Navigation:</strong><br />Easy access to trading, staking, and educational resources</p>
                    </div>

                    <div className="border border-purple-500 bg-purple-500/10 rounded-lg p-5">
                      <p className="text-white opacity-90 text-sm sm:text-base"><strong>✔ Initial Exchange Offerings (IEOs):</strong><br />Participate in early-stage investment opportunities</p>
                    </div>

                    <div className="border border-blue-400 bg-blue-400/10 rounded-lg p-5">
                      <p className="text-white opacity-90 text-sm sm:text-base"><strong>✔ Regulatory Compliance:</strong><br />Adhering to global standards for a transparent ecosystem</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-1/2 flex justify-center items-center">
                <div className="relative w-[300px] sm:w-[400px] md:w-[500px] h-[300px] sm:h-[400px] md:h-[500px] flex flex-col justify-center items-center">
                  <div className="absolute inset-0 w-full h-full opacity-20">
                    {/* This would be replaced with actual dots background */}
                    <div className="w-full h-full bg-[url('/assets/dots-pattern.svg')] bg-no-repeat bg-cover"></div>
                  </div>

                  <div className="z-10 text-center">
                    <Image
                      src="/assets/ryfin-logo.png"
                      alt="RYFIN Logo Large"
                      width={300}
                      height={300}
                      className="mb-4 w-[200px] sm:w-[300px] md:w-[400px] h-auto"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PinkSale Presale Announcement Section */}
        {/* <section id="pinksale-announcement" className="py-20 transition-all duration-1000 transform opacity-100 translate-y-0">
          <div className="container mx-auto px-4 sm:px-6 md:px-8">
            <div className="max-w-2xl mx-auto bg-[#181D2F] rounded-2xl p-8 shadow-lg border border-[#F8C91E]/30 text-center">
              <div className="flex flex-col items-center mb-6">
                
                <div className="mb-4">
                  <img src={pinklogo} alt="PinkSale Logo" className="mx-auto w-20 h-20" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <span className="block text-[#F8C91E] font-bold text-2xl mt-2">PinkSale Presale</span>
                </div>
                <h2 className="text-3xl font-bold text-[#F8C91E] mb-2">Presale Launching Soon!</h2>
                <p className="text-gray-300 text-lg mb-4">
                  After our airdrop event, we are excited to announce that the official presale for Ryfin Coin will launch on <span className="text-[#F8C91E] font-semibold">PinkSale</span>.
                </p>
                <p className="text-gray-400 text-base">
                  Stay tuned for updates and get ready to participate in the next big opportunity! Follow our Telegram group and social channels for the latest announcements.
                </p>
              </div>
            </div>
          </div>
        </section> */}

        {/* Shipping Form Modal */}
        {isShippingFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0d1a] border border-[#2a2f42] rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-melodrama text-white">Shipping Details</h2>
                <button
                  onClick={closeShippingForm}
                  className="text-gray-400 hover:text-white transition-colors"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] flex items-center justify-center text-[#0a0d1a] font-bold">
                    {selectedSize}
                  </div>
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: selectedColor === 'white' ? '#e9e9e9' : selectedColor === 'black' ? '#1a1f35' : selectedColor === 'red' ? '#a12222' : '#1a7fc9' }}></div>
                  <div className="text-white font-outfit">RYFIN Polo - {selectedSize} - {selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1)}</div>
                </div>
              </div>

              <form onSubmit={handleShippingSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="fullName" className="block text-gray-300 font-outfit mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={shippingDetails.fullName}
                    onChange={handleShippingInputChange}
                    onBlur={() => setFormTouched(prev => ({ ...prev, fullName: true }))}
                    required
                    className={`w-full bg-[#1a1f35] border ${formTouched.fullName && formErrors.fullName ? 'border-red-500' : 'border-[#2a2f42]'} rounded-lg p-3 text-white font-outfit focus:outline-none focus:border-[#F8C91E]`}
                    aria-invalid={formErrors.fullName}
                    aria-describedby="fullName-error"
                  />
                  {formTouched.fullName && formErrors.fullName && (
                    <p id="fullName-error" className="mt-1 text-red-500 text-sm">Full name is required</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-gray-300 font-outfit mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={shippingDetails.email}
                    onChange={handleShippingInputChange}
                    onBlur={() => setFormTouched(prev => ({ ...prev, email: true }))}
                    required
                    className={`w-full bg-[#1a1f35] border ${formTouched.email && formErrors.email ? 'border-red-500' : 'border-[#2a2f42]'} rounded-lg p-3 text-white font-outfit focus:outline-none focus:border-[#F8C91E]`}
                    aria-invalid={formErrors.email}
                    aria-describedby="email-error"
                  />
                  {formTouched.email && formErrors.email && (
                    <p id="email-error" className="mt-1 text-red-500 text-sm">Please enter a valid email address</p>
                  )}
                </div>

                <div>
                  <label htmlFor="address" className="block text-gray-300 font-outfit mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={shippingDetails.address}
                    onChange={handleShippingInputChange}
                    onBlur={() => setFormTouched(prev => ({ ...prev, address: true }))}
                    required
                    className={`w-full bg-[#1a1f35] border ${formTouched.address && formErrors.address ? 'border-red-500' : 'border-[#2a2f42]'} rounded-lg p-3 text-white font-outfit focus:outline-none focus:border-[#F8C91E]`}
                    aria-invalid={formErrors.address}
                    aria-describedby="address-error"
                  />
                  {formTouched.address && formErrors.address && (
                    <p id="address-error" className="mt-1 text-red-500 text-sm">Address is required</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-gray-300 font-outfit mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={shippingDetails.city}
                      onChange={handleShippingInputChange}
                      onBlur={() => setFormTouched(prev => ({ ...prev, city: true }))}
                      required
                      className={`w-full bg-[#1a1f35] border ${formTouched.city && formErrors.city ? 'border-red-500' : 'border-[#2a2f42]'} rounded-lg p-3 text-white font-outfit focus:outline-none focus:border-[#F8C91E]`}
                      aria-invalid={formErrors.city}
                      aria-describedby="city-error"
                    />
                    {formTouched.city && formErrors.city && (
                      <p id="city-error" className="mt-1 text-red-500 text-sm">City is required</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-gray-300 font-outfit mb-1">
                      State/Province
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={shippingDetails.state}
                      onChange={handleShippingInputChange}
                      onBlur={() => setFormTouched(prev => ({ ...prev, state: true }))}
                      required
                      className={`w-full bg-[#1a1f35] border ${formTouched.state && formErrors.state ? 'border-red-500' : 'border-[#2a2f42]'} rounded-lg p-3 text-white font-outfit focus:outline-none focus:border-[#F8C91E]`}
                      aria-invalid={formErrors.state}
                      aria-describedby="state-error"
                    />
                    {formTouched.state && formErrors.state && (
                      <p id="state-error" className="mt-1 text-red-500 text-sm">State/Province is required</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="zipCode" className="block text-gray-300 font-outfit mb-1">
                      Zip/Postal Code
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={shippingDetails.zipCode}
                      onChange={handleShippingInputChange}
                      onBlur={() => setFormTouched(prev => ({ ...prev, zipCode: true }))}
                      required
                      className={`w-full bg-[#1a1f35] border ${formTouched.zipCode && formErrors.zipCode ? 'border-red-500' : 'border-[#2a2f42]'} rounded-lg p-3 text-white font-outfit focus:outline-none focus:border-[#F8C91E]`}
                      aria-invalid={formErrors.zipCode}
                      aria-describedby="zipCode-error"
                    />
                    {formTouched.zipCode && formErrors.zipCode && (
                      <p id="zipCode-error" className="mt-1 text-red-500 text-sm">Zip/Postal Code is required</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-gray-300 font-outfit mb-1">
                      Country
                    </label>
                    <select
                      id="country"
                      name="country"
                      value={shippingDetails.country}
                      onChange={handleShippingInputChange}
                      onBlur={() => setFormTouched(prev => ({ ...prev, country: true }))}
                      required
                      className={`w-full bg-[#1a1f35] border ${formTouched.country && formErrors.country ? 'border-red-500' : 'border-[#2a2f42]'} rounded-lg p-3 text-white font-outfit focus:outline-none focus:border-[#F8C91E]`}
                      aria-invalid={formErrors.country}
                      aria-describedby="country-error"
                    >
                      <option value="">Select Country</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="UK">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="JP">Japan</option>
                      <option value="Other">Other</option>
                    </select>
                    {formTouched.country && formErrors.country && (
                      <p id="country-error" className="mt-1 text-red-500 text-sm">Country is required</p>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white font-bold py-3 px-8 rounded-lg font-outfit shadow-[0px_4px_17px_1px_#F8C91EB2] cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Presale Section */}
        <section id="presale" className={`py-12 md:py-24 relative overflow-hidden transition-all duration-1000 transform ${visibleSections.includes('presale') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Background watermarks */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Ethereum diamond watermark */}
            <div className="absolute inset-0 w-full h-full opacity-20">
              <div className="w-[150%] h-[150%] absolute top-1/2 left-[55%] transform -translate-x-1/2 -translate-y-1/2 bg-[url('/assets/ethereum-diamond.svg')] bg-no-repeat bg-contain bg-center"></div>
            </div>
          </div>

          <div className="text-center mb-8 md:mb-12 relative z-10 px-4">
            <h2 className="text-3xl md:text-4xl font-melodrama mb-4">Presale Stage</h2>
            <p className="text-gray-400 mx-auto max-w-4xl text-sm sm:text-base">
              The total token supply for the platform is 210,000,000 tokens. Out of the total, 18% (37,800,000 RYFN) will be allocated for the presale with vesting schedule.
            </p>
          </div>

          {/* Desktop Table (hidden on mobile) */}
          <div className="hidden md:block w-full relative z-10 container mx-auto px-20">
            {/* Header Row */}
            <div className="w-full bg-[#F8C91E]/20 border-t border-l border-r border-[#F8C91E]/60 rounded-t-lg p-4">
              <div className="flex flex-row w-full">
                <div className="flex-1 text-white font-bold">Phase</div>
                <div className="flex-1 text-white font-bold">Price (USDT)</div>
                <div className="flex-1 text-white font-bold">Total for Sale</div>
                <div className="flex-1 text-white font-bold">Total amount (USDT)</div>
              </div>
            </div>

            {/* Data Rows */}
            <div className="flex flex-col gap-2 mt-2">
              {[
                { phase: "Phase 1", price: 0.015, totalForSale: 6300000, perStageMin: "17,010 ", },
                { phase: "Phase 2", price: 0.025, totalForSale: 10500000, perStageMin: "47,250", },
                { phase: "Phase 3", price: 0.030, totalForSale: 10500000, perStageMin: "56,700", },
                { phase: "Phase 4", price: 0.035, totalForSale: 10500000, perStageMin: "66,150", },
                // { phase: "Phase 5", price: "$0.045", totalForSale: "---", perStageMin: "---", },
                // { phase: "Phase 6", price: "$0.0015", totalForSale: "100,000,000", perStageMin: "150,000", totalGatheredMin: "150,000" },
                // { phase: "Public Sale", price: "$0.05", totalForSale: "---", perStageMin: "---", totalGatheredMin: "---" },
              ].map((row, index, array) => (
                <div
                  key={index}
                  className={`w-full bg-gray-900/60 border-l border-r border-[#F8C91E]/30 ${index === array.length - 1 ? 'rounded-b-lg border-b' : ''
                    } p-4 hover:bg-gray-900/80 transition-colors`}
                  style={{
                    borderTopWidth: index === 0 ? '0' : '1px',
                    borderTopColor: 'rgba(248, 201, 30, 0.2)',
                    borderBottomWidth: index === array.length - 1 ? '1px' : '0',
                    borderBottomColor: 'rgba(248, 201, 30, 0.1)'
                  }}
                >
                  <div className="flex flex-row w-full">
                    <div className="flex-1 text-white font-medium">{row.phase}</div>
                    <div className="flex-1 text-white">{row.price}</div>
                    <div className="flex-1 text-white">{row.totalForSale.toLocaleString()}</div>
                    <div className="flex-1 text-white">{(row.price * row.totalForSale).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    {/* <div className="flex-1 text-white">{row.totalGatheredMin}</div> */}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Cards (visible only on mobile) */}
          <div className="md:hidden w-full relative z-10 px-4">
            <div className="flex flex-col gap-4">
              {[
                { phase: "Phase 1", price: "$0.015", totalForSale: "21,000,000", perStageMin: "315,000", totalGatheredMin: "315,000" },
                { phase: "Phase 2", price: "$0.03", totalForSale: "21,000,000", perStageMin: "630,000", totalGatheredMin: "630,000" },
                { phase: "Phase 3", price: "$0.045", totalForSale: "21,000,000", perStageMin: "945,000", totalGatheredMin: "945,000" },
                // { phase: "Phase 4", price: "$0.0015", totalForSale: "100,000,000", perStageMin: "150,000", totalGatheredMin: "150,000" },
                // { phase: "Phase 5", price: "$0.0015", totalForSale: "100,000,000", perStageMin: "150,000", totalGatheredMin: "150,000" },
                // { phase: "Phase 6", price: "$0.0015", totalForSale: "100,000,000", perStageMin: "150,000", totalGatheredMin: "150,000" },
                { phase: "Public Sale", price: "$0.05", totalForSale: "---", perStageMin: "---", totalGatheredMin: "---" },
              ].map((row, index) => (
                <div
                  key={index}
                  className="w-full bg-gray-900/60 border border-[#F8C91E]/30 rounded-lg p-4 hover:bg-gray-900/80 transition-colors"
                >
                  <div className="flex justify-between items-center border-b border-[#F8C91E]/20 pb-2 mb-3">
                    <div className="text-white font-bold text-lg">{row.phase}</div>
                    <div className="text-[#F8C91E] font-medium">{row.price}</div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <div className="text-gray-400">Total for Sale:</div>
                      <div className="text-white font-medium">{row.totalForSale}</div>
                    </div>

                    <div className="flex justify-between">
                      <div className="text-gray-400">Per stage min. (USDT):</div>
                      <div className="text-white font-medium">{row.perStageMin}</div>
                    </div>

                    <div className="flex justify-between">
                      <div className="text-gray-400">Total Gathered min. (USDT):</div>
                      <div className="text-white font-medium">{row.totalGatheredMin}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Rewards Calculator Section */}
        <section id="rewards" className={`py-12 sm:py-16 md:py-24 px-4 text-center transition-all duration-1000 transform ${visibleSections.includes('rewards') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl sm:text-4xl font-melodrama mb-3 sm:mb-4">Rewards Calculator</h2>
          <p className="text-gray-400 max-w-3xl mx-auto mb-8 sm:mb-12 text-sm sm:text-base">
            Discover the potential of your RYFN investment with our rewards calculator! Simple, transparent, and designed to show you the exciting possibilities of joining the RYFN journey. Calculate, contribute, and watch your impact grow.
          </p>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start mt-8 sm:mt-16">
            <div className="text-left px-2 md:pl-4">
              <h3 className="text-2xl sm:text-3xl font-melodrama mb-3 sm:mb-4">Ready to Buy?</h3>
              <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">
                All you need to buy RYFN tokens at the lowest presale price is a decentralized wallet containing ETH, USDT, USDC. Simply connect to the widget above to swap tokens!
              </p>
              <Button
                className="bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white px-5 sm:px-8 py-2 sm:py-3 text-sm sm:text-base shadow-[0px_4px_17px_1px_#F8C91EB2]"
                onClick={() => {
                  const buyNowSection = document.getElementById('BuyNow');
                  if (buyNowSection) {
                    buyNowSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
              >
                Buy Now
              </Button>
            </div>

            <div className="flex justify-center md:justify-start">
              <div className="w-full max-w-md md:max-w-none">
                <ReturnsCalculator />
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap Section */}
        <section id="roadmap" className={`py-24 px-4 sm:px-6 md:px-8 transition-all duration-1000 transform ${visibleSections.includes('roadmap') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl font-melodrama text-center mb-4">RYFN ROADMAP</h2>
          <p className="text-gray-400 text-center max-w-3xl mx-auto mb-16">
            2025 Roadmap: Exciting Milestones Ahead
          </p>

          <div className="relative max-w-4xl mx-auto px-2 sm:px-4">
            {/* Timeline container */}
            <div className="relative max-w-[1000px] w-full mx-auto py-[20px]">
              {/* Background watermarks */}
              <div className="absolute w-[250px] h-[250px] opacity-10 bg-[url('/assets/ryfin-coin.svg')] bg-contain bg-no-repeat bg-center left-[60%] top-[55%] z-0"></div>
              <div className="absolute w-[200px] h-[200px] opacity-10 bg-[url('/assets/ryfin-coin.svg')] bg-contain bg-no-repeat bg-center left-[-50px] top-[30%] z-0"></div>

              {/* Timeline line - now ends at the last dot */}
              <div className="absolute top-0 bottom-[8%] left-1/2 w-[2px] bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] transform -translate-x-1/2"></div>

              {/* Timeline points - adjusted to align with bottom borders */}
              <div className="absolute left-1/2 w-[20px] h-[20px] bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] rounded-full transform -translate-x-1/2 top-[15%] shadow-[0px_4px_17px_1px_#F8C91EB2]"></div>
              <div className="absolute left-1/2 w-[20px] h-[20px] bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] rounded-full transform -translate-x-1/2 top-[33%] shadow-[0px_4px_17px_1px_#F8C91EB2]"></div>
              <div className="absolute left-1/2 w-[20px] h-[20px] bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] rounded-full transform -translate-x-1/2 top-[52%] shadow-[0px_4px_17px_1px_#F8C91EB2]"></div>
              <div className="absolute left-1/2 w-[20px] h-[20px] bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] rounded-full transform -translate-x-1/2 top-[71%] shadow-[0px_4px_17px_1px_#F8C91EB2]"></div>
              <div className="absolute left-1/2 w-[20px] h-[20px] bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] rounded-full transform -translate-x-1/2 top-[92%] shadow-[0px_4px_17px_1px_#F8C91EB2]"></div>

              {/* Timeline boxes */}
              <div className="relative w-[45%] p-[20px] bg-[rgba(10,12,21,0.8)] border border-[#F8C91E] mb-[40px] ml-auto rounded-tl-[25px] rounded-tr-[25px] rounded-br-[25px] z-10">
                <h3 className="text-[#F8C91E] mb-[10px] text-[20px]">August</h3>
                <p className="text-[#ccc] mb-[5px] text-[14px]">Launch with p2p and Launchpad and stacking</p>
                {/* <p className="text-[#ccc] mb-[5px] text-[14px]">Perform initial research and feasibility assessments.</p>
                <p className="text-[#ccc] mb-[5px] text-[14px]">Create a project plan outlining scope, timeline, resources, and budget.</p> */}
              </div>

              <div className="relative w-[45%] p-[20px] bg-[rgba(10,12,21,0.8)] border border-[#F8C91E] mb-[40px] mr-auto rounded-tl-[25px] rounded-tr-[25px] rounded-bl-[25px] z-10">
                <h3 className="text-[#F8C91E] mb-[10px] text-[20px]">October</h3>
                <p className="text-[#ccc] mb-[5px] text-[14px]">Beta launch of ryfin global exchange</p>
                {/* <p className="text-[#ccc] mb-[5px] text-[14px]">Perform initial research and feasibility assessments.</p>
                <p className="text-[#ccc] mb-[5px] text-[14px]">Create a project plan outlining scope, timeline, resources, and budget.</p> */}
              </div>

              <div className="relative w-[45%] p-[20px] bg-[rgba(10,12,21,0.8)] border border-[#F8C91E] mb-[40px] ml-auto rounded-tl-[25px] rounded-tr-[25px] rounded-br-[25px] z-10">
                <h3 className="text-[#F8C91E] mb-[10px] text-[20px]">December</h3>
                <p className="text-[#ccc] mb-[5px] text-[14px]">Decentralized Exchange (DEX) launch</p>
                {/* <p className="text-[#ccc] mb-[5px] text-[14px]">Completion of Ethereum Layer 2 blockchain development</p> */}
                {/* <p className="text-[#ccc] mb-[5px] text-[14px]">Perform initial research and feasibility assessments.</p>
                <p className="text-[#ccc] mb-[5px] text-[14px]">Create a project plan outlining scope, timeline, resources, and budget.</p> */}
              </div>

              <div className="relative w-[45%] p-[20px] bg-[rgba(10,12,21,0.8)] border border-[#F8C91E] mb-[40px] mr-auto rounded-tl-[25px] rounded-tr-[25px] rounded-bl-[25px] z-10">
                <h3 className="text-[#F8C91E] mb-[10px] text-[20px]">Feburary</h3>
                <p className="text-[#ccc] mb-[5px] text-[14px]"> Web 3 and DAP Applications</p>
                {/* <p className="text-[#ccc] mb-[5px] text-[14px]">Perform initial research and feasibility assessments.</p>
                <p className="text-[#ccc] mb-[5px] text-[14px]">Create a project plan outlining scope, timeline, resources, and budget.</p> */}
              </div>

              <div className="relative w-[45%] p-[20px] bg-[rgba(10,12,21,0.8)] border border-[#F8C91E] mb-[40px] ml-auto rounded-tl-[25px] rounded-tr-[25px] rounded-br-[25px] z-10">
                <h3 className="text-[#F8C91E] mb-[10px] text-[20px]">Beyond 2025</h3>
                <p className="text-[#ccc] mb-[5px] text-[14px]">Expanding tradable assets, DeFi integration, and global outreach</p>
                {/* <p className="text-[#ccc] mb-[5px] text-[14px]">Perform initial research and feasibility assessments.</p>
                <p className="text-[#ccc] mb-[5px] text-[14px]">Create a project plan outlining scope, timeline, resources, and budget.</p> */}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className={`py-24 relative overflow-hidden transition-all duration-1000 transform ${visibleSections.includes('faq') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Background elements */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Yellow glowing radiant - reduced size and repositioned */}
            <div className="absolute top-[20%] right-[25%] w-[500px] h-[500px] bg-gradient-to-b from-[#F8C91E]/10 via-[#F8C91E]/10 to-[#F0A730]/10 rounded-full blur-[150px]" />
            <div className="absolute top-[60%] left-[15%] w-[400px] h-[400px] bg-gradient-to-b from-[#F8C91E]/5 via-[#F8C91E]/5 to-[#F0A730]/5 rounded-full blur-[120px]" />

            {/* Large watermark - moved further up and more towards top-left */}
            <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] opacity-[0.03] bg-[url('/assets/ryfin-coin.svg')] bg-contain bg-no-repeat bg-center"></div>
          </div>

          <h2 className="text-4xl font-melodrama text-center mb-16 relative z-10">Frequently Asked Questions</h2>

          <div className="max-w-5xl mx-auto px-4 space-y-6 relative z-10">
            {[
              {
                question: "What is Ryfin Coin (RYFN)?",
                answer: "Ryfin Coin (RYFN) is the native cryptocurrency of the Ryfin Exchange. It offers multiple use cases, including governance voting, transaction fee discounts, staking benefits, and access to exclusive features on the platform."
              },
              {
                question: "How can I buy Ryfin Coin?",
                answer: "You can purchase Ryfin Coin (RYFN) through the Ryfin Exchange once it is listed. It will also be available during the Initial Coin Offering (ICO) and through select partner exchanges."
              },
              {
                question: "What makes Ryfin Exchange different from other crypto platforms?",
                answer: "Ryfin Exchange prioritizes security, transparency, and user experience. Key features include cold & hot wallet storage, multi-factor authentication (MFA), insurance coverage, and an intuitive interface with educational resources for traders."
              },
              {
                question: "What are the benefits of holding Ryfin Coin?",
                answer: "Holding RYFN provides governance rights, reduced trading fees, early access to token launches, staking rewards, and participation in the platform's ecosystem fund to support growth and innovation."
              },
              {
                question: "Is Ryfin Exchange regulated?",
                answer: "Yes, Ryfin Exchange complies with all relevant regulatory standards and maintains transparent operations to ensure a secure and legally compliant trading environment."
              }
            ].map((faq, index) => {
              const [isOpen, setIsOpen] = React.useState(false);
              return (
                <div key={index} className="bg-[#060d1a]/40 backdrop-blur-[26px] border border-white/30 rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg w-full">
                  <div
                    className="p-6 flex justify-between items-center cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                  >
                    <h3 className="text-lg font-medium">{faq.question}</h3>
                    <span className="text-white transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </div>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: isOpen ? '200px' : '0',
                      opacity: isOpen ? 1 : 0
                    }}
                  >
                    {isOpen && <div className="w-[calc(100%-48px)] h-px bg-white/30 mx-auto"></div>}
                    <div className="px-6 py-4">
                      <p className="text-gray-400">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-blue-900/40 bg-[#030813]/95 w-full relative overflow-hidden mt-0">
        {/* Background elements for footer */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8C91E]/[0.03] via-[#F8C91E]/[0.03] to-[#F0A730]/[0.03] pointer-events-none"></div>

        {/* Watermark at bottom right corner - partially visible */}
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] opacity-[0.05] bg-[url('/assets/ryfin-coin.svg')] bg-contain bg-no-repeat bg-center"></div>

        {/* Yellow glow radiant near watermark */}
        <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] bg-gradient-to-b from-[#F8C91E]/5 via-[#F8C91E]/5 to-[#F0A730]/5 rounded-full blur-[120px]"></div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="space-y-6">
              <Image
                src="/assets/ryfin-logo.png"
                alt="RYFIN Logo"
                width={200}
                height={67}
                className="h-16 w-auto"
              />
              <p className="text-gray-400 text-sm">
                Ryfin Coin (RYFN) is more than just a cryptocurrency—it's the foundation of a secure, transparent, and innovative financial ecosystem. Built on Ethereum, Ryfin Coin offers a seamless, user-friendly, and rewarding experience for investors, traders, and crypto enthusiasts.
              </p>
              {/* w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-gradient-to-b hover:from-[#F8C91E]/10 hover:via-[#F8C91E]/10 hover:to-[#F0A730]/10 */}
              <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="text-gray-400 hover:text-gold-500 transition-colors duration-200"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg mb-6">Our Products</h4>
              <ul className="space-y-4">
                {["Crypto Earn", "Exchanges", "DeFi Wallet", "Converter"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-[#F8C91E] text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg mb-6">Pages</h4>
              <ul className="space-y-4">
                {["About Us", "Our app", "Careers", "Token Sale"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-[#F8C91E] text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg mb-6">Contact</h4>

              {/* Yellow line */}
              <div className="border-t border-yellow-500 mb-4"></div>

              {/* Website */}
              <div className="flex mb-4">
                <div className="flex items-center mr-4">
                  <Globe className="text-white mr-2" size={20} />
                  <span className="text-sm text-white">Our website</span>
                </div>
                <div className="flex-grow text-right">
                  <a href="https://www.ryfinexchange.com" className="text-white text-xs underline">
                    https://www.ryfinexchange.com
                  </a>
                </div>
              </div>

              {/* Yellow line */}
              <div className="border-t border-yellow-500 mb-4"></div>

              {/* Email */}
              <div className="flex mb-4">
                <div className="flex items-center mr-4">
                  <Mail className="text-white mr-2" size={20} />
                  <span className="text-sm text-white">Our e-mail</span>
                </div>
                <div className="flex-grow text-right">
                  <a href="mailto:support@ryfinexchange.com" className="text-white text-xs">
                    support@ryfinexchange.com
                  </a>
                </div>
              </div>

              {/* Yellow line */}
              <div className="border-t border-yellow-500 mb-4"></div>

              {/* Telephone */}
              <div className="flex mb-4">
                <div className="flex items-center mr-4">
                  <Phone className="text-white mr-2" size={20} />
                  <span className="text-sm text-white">Telephone</span>
                </div>
                <div className="flex-grow text-right">
                  <a href="tel:+5078388534" className="text-white text-xs">
                    +507-838-8534
                  </a>
                </div>
              </div>

              {/* Yellow line */}
              <div className="border-t border-yellow-500 mb-4"></div>

              {/* HQ Address */}
              <div className="flex mb-4">
                <div className="flex items-center mr-4">
                  <MapPin className="text-white mr-2" size={20} />
                  <span className="text-sm text-white">HQ address</span>
                </div>
                <div className="flex-grow text-right text-xs text-white">
                  <div>Via España, Delta Bank Building,</div>
                  <div>6th Floor, Suite 604D,</div>
                  <div>Panama City, Republic of Panama</div>
                </div>
              </div>

              {/* Yellow line */}
              <div className="border-t border-yellow-500"></div>
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal - add a key to force re-render */}
      {isVideoModalOpen && (
        <div
          key="video-modal"
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
        >
          <div className="relative w-full max-w-4xl rounded-lg overflow-hidden shadow-lg">
            <button
              onClick={closeVideoModal}
              className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-2 text-white hover:bg-opacity-70 transition-all z-10"
              aria-label="Close video"
            >
              <X size={24} />
            </button>
            <iframe
              src="https://www.youtube.com/embed/DBVydK0EHrY?si=KXPg4N3_LEACGVNc"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-[50vh] md:h-[70vh]"
            ></iframe>
          </div>
        </div>
      )}

      {showVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={() => setShowVideo(false)}>
          <div className="relative w-full max-w-4xl bg-black rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowVideo(false)}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 z-10"
            >
              <X size={24} />
            </button>
            <iframe
              src="https://www.youtube.com/embed/DBVydK0EHrY?si=KXPg4N3_LEACGVNc"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-[50vh] md:h-[70vh]"
            ></iframe>
          </div>
        </div>
      )}


      {/* Airdrop Modal */}
      {isAirdropModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#030813] border border-yellow-500/30 rounded-xl p-6 max-w-md w-full relative">
            <button
              onClick={() => setIsAirdropModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-melodrama mb-4">Ryfin Airdrop</h2>

            <div className="space-y-4">
              <p className="text-gray-400">Connect your wallet and complete tasks to participate in the airdrop.</p>

              {/* Telegram Login Button */}
              {/* <div className="flex justify-center py-2"> */}
              <TelegramLogin botName="ryfinauthbot" onAuth={handleTelegramAuth} />
              {/* </div> */}

              {/* Add more airdrop requirements/tasks here */}
              <div className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Button
                      className="w-full bg-blue-400 hover:bg-blue-500 text-white"
                      onClick={connectTwitter}
                    >
                      Connect with Twitter
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-gray-300">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border ${twitterVerified ? "bg-yellow-500" : "border-yellow-500"} flex items-center justify-center`}>
                          {twitterVerified && "✓"}
                        </div>
                        Follow Ryfin on Twitter
                      </div>
                      <Button
                        onClick={verifyTwitterFollow}
                        disabled={!twitterHandle || verifyingTwitter}
                        className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500"
                        size="sm"
                      >
                        {verifyingTwitter ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-gray-300">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border ${retweetVerified ? "bg-yellow-500" : "border-yellow-500"} flex items-center justify-center`}>
                          {retweetVerified && "✓"}
                        </div>
                        Retweet Ryfin's Post
                      </div>
                      <Button
                        onClick={verifyRetweet}
                        disabled={!twitterHandle || verifyingRetweet}
                        className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500"
                        size="sm"
                      >
                        {verifyingRetweet ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className={`w-4 h-4 rounded-full border ${twitterVerified ? "bg-yellow-500" : "border-yellow-500"} flex items-center justify-center`}>
                      {twitterVerified && "✓"}
                    </div>
                    Follow Ryfin on Twitter
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-4 h-4 rounded-full border border-yellow-500 flex items-center justify-center">
                      ✓
                    </div>
                    Join Telegram Group
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white"
                onClick={() => {
                  // Add claim logic here
                  console.log('Claiming airdrop...');
                }}
              >
                Claim Airdrop
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}