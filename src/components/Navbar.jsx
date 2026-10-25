import { useState, useEffect, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, QrCode, Heart, CheckCircle2, MessageCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Globe } from "lucide-react";

import ERobotLogo from "../assets/logo-compact.png";
import ContributionQR from "../assets/QR.jpg"; 
import TelegramQR from "../assets/telegram_bong_kosal.png";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contributionModalOpen, setContributionModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Contribution state
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionSuccess, setContributionSuccess] = useState(false);
  const [contributing, setContributing] = useState(false);

  const { language, toggleLanguage, t } = useLanguage();

  const NAV_ITEMS = [
    { to: "/", label: t.nav.home },
    { to: "/about", label: t.nav.goals },
    { to: "/services", label: t.nav.events },
    { to: "/sharings", label: t.nav.sharings },
  ];

  const contributionPanelRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contributionPanelRef.current && !contributionPanelRef.current.contains(event.target)) {
        setContributionModalOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeAll = () => {
    setMobileMenuOpen(false);
    setContributionModalOpen(false);
    setContactModalOpen(false);
  };

  const handleConfirmContribution = async () => {
    try {
      setContributing(true);
      await addDoc(collection(db, "donations"), {
        amount: contributionAmount || "តាមទឹកចិត្ត",
        paymentMethod: "ABA Pay QR",
        status: "completed",
        timestamp: serverTimestamp()
      });
      setContributionSuccess(true);
      setContributionAmount("");
    } catch (err) {
      console.error("Contribution recording error:", err);
    } finally {
      setContributing(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#F7F7F7] border-b border-[#192048]/10 shadow-none">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <Link 
            to="/" 
            onClick={closeAll} 
            className="flex items-center gap-3 shrink-0 focus:outline-none"
          >
            <img
              src={ERobotLogo}
              alt="E-Robot Cambodia"
              className="h-9 sm:h-11 w-auto"
            />
          </Link>

          {/* Desktop Nav Links */}
          <ul className="hidden lg:flex items-center gap-2 flex-1 justify-center list-none m-0 p-0">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `px-3 py-2 text-xs sm:text-sm font-extrabold transition-colors whitespace-nowrap block ${
                      isActive
                        ? "text-[#FF383C]"
                        : "text-[#192048] hover:text-[#FF383C]"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Desktop Right Action Area */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            
            {/* Language Switcher Button */}
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 rounded-sm text-xs font-extrabold bg-[#192048]/10 hover:bg-[#192048]/20 text-[#192048] transition-colors border border-[#192048]/20 cursor-pointer shadow-none flex items-center gap-1.5 shrink-0"
              title="Switch Language / ប្តូរភាសា"
            >
              <Globe className="w-3.5 h-3.5 text-[#192048]" />
              <span>{language === "km" ? "EN" : "KM"}</span>
            </button>

            {/* Contact Button */}
            <button
              onClick={() => {
                setContactModalOpen(true);
                setContributionModalOpen(false);
              }}
              className="px-3.5 py-2 rounded-sm text-xs font-bold bg-[#192048] hover:bg-[#232b57] text-white transition-colors cursor-pointer border-none shadow-none flex items-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5 text-white" />
              <span>{t.nav.contact}</span>
            </button>

            {/* Contribution Button */}
            <button
              onClick={() => {
                setContributionSuccess(false);
                setContributionModalOpen(!contributionModalOpen);
                setContactModalOpen(false);
              }}
              className="px-3.5 py-2 rounded-sm text-xs font-bold bg-[#FF383C] hover:bg-[#e02d31] text-white transition-colors cursor-pointer border-none shadow-none flex items-center gap-2"
            >
              <Heart className="w-3.5 h-3.5 fill-white text-white" />
              <span>{t.nav.contribute}</span>
            </button>
          </div>

          {/* Mobile Toggle Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-sm text-[#192048] hover:bg-[#192048]/10 transition-colors border-none bg-transparent cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#192048]/15 bg-[#F7F7F7] px-4 py-5 space-y-4 shadow-none animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* Mobile Nav Links with Touch-friendly styling */}
            <div className="flex flex-col gap-1.5">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={closeAll}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-sm text-sm font-extrabold transition-all border ${
                      isActive 
                        ? "bg-white text-[#FF383C] border-[#FF383C]/30 border-l-4 border-l-[#FF383C]" 
                        : "bg-white text-[#192048] border-slate-200 hover:border-[#192048]"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="border-t border-[#192048]/10 pt-1" />

            {/* Language Switcher Setting Bar */}
            <div className="flex items-center justify-between p-3 bg-white rounded-sm border border-[#192048]/10 shadow-none">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#192048]">
                <Globe className="w-4 h-4 text-[#192048]" />
                <span>{language === "km" ? "ភាសា (Language)" : "Language (ភាសា)"}</span>
              </div>
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 rounded-sm text-xs font-black bg-[#192048] hover:bg-[#232b57] text-white cursor-pointer border-none transition-colors shadow-none flex items-center gap-1.5"
              >
                <span>{language === "km" ? "EN English" : "KM ខ្មែរ"}</span>
              </button>
            </div>

            {/* Mobile Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button 
                onClick={() => { setMobileMenuOpen(false); setContactModalOpen(true); }} 
                className="py-3 px-3 bg-white text-[#192048] border border-[#192048]/20 hover:border-[#192048] text-xs font-bold rounded-sm flex items-center justify-center gap-2 cursor-pointer shadow-none transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#192048] shrink-0" />
                <span className="truncate">{t.nav.contact}</span>
              </button>

              <button 
                onClick={() => { setMobileMenuOpen(false); setContributionModalOpen(true); }} 
                className="py-3 px-3 bg-[#FF383C] hover:bg-[#e02d31] text-white text-xs font-bold rounded-sm flex items-center justify-center gap-2 cursor-pointer border-none shadow-none transition-colors"
              >
                <Heart className="w-4 h-4 fill-white text-white shrink-0" />
                <span className="truncate">{t.nav.contribute}</span>
              </button>
            </div>

          </div>
        )}

        {/* Contribution QR Floating Modal */}
        {contributionModalOpen && (
          <div className="absolute left-1/2 top-full -translate-x-1/2 mt-2 z-50 w-full max-w-sm px-4" ref={contributionPanelRef}>
            <div className="bg-white border border-[#192048]/15 rounded-sm p-6 text-center flex flex-col items-center relative shadow-none">
              <button 
                onClick={() => setContributionModalOpen(false)} 
                className="absolute top-4 right-4 h-7 w-7 rounded-full bg-[#F7F7F7] text-[#192048] flex items-center justify-center font-bold text-xs border-none cursor-pointer hover:bg-[#192048]/10 transition-colors"
              >
                ✕
              </button>

              <div className="h-11 w-11 rounded-full bg-red-50 text-[#FF383C] flex items-center justify-center mb-3 mt-1">
                <QrCode className="w-5 h-5" />
              </div>

              <h3 className="text-base font-bold text-[#192048] m-0">
                {t.contributionModal.title}
              </h3>
              <p className="text-xs font-medium text-[#192048]/70 mt-1.5 mb-4 px-2 leading-relaxed">
                {t.contributionModal.desc}
              </p>

              <div className="w-52 h-52 bg-[#F7F7F7] border border-[#192048]/10 rounded-sm p-3 flex items-center justify-center overflow-hidden mb-4 shadow-none">
                <img 
                  src={ContributionQR} 
                  alt="Contribution ABA Pay QR Code" 
                  className="w-full h-full object-contain rounded-lg" 
                />
              </div>

              {/* Firestore Contribution Recording */}
              <div className="w-full pt-3 border-t border-[#192048]/10">
                {contributionSuccess ? (
                  <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-2 rounded-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{t.contributionModal.thankYou}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder={language === "km" ? "ចំនួនប្រាក់ (ឧទាហរណ៍: $5)" : "Amount (e.g. $5)"}
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#F7F7F7] border border-[#192048]/15 rounded-sm text-xs text-[#192048] placeholder-[#192048]/40 focus:outline-none"
                    />
                    <button
                      onClick={handleConfirmContribution}
                      disabled={contributing}
                      className="w-full py-2 bg-[#192048] hover:bg-[#232b57] text-white text-xs font-bold rounded-sm border-none cursor-pointer transition-colors shadow-none disabled:opacity-50"
                    >
                      {contributing ? (language === "km" ? "កំពុងកត់ត្រា..." : "Recording...") : (language === "km" ? "កត់ត្រាការចូលរួមចំណែករបស់ខ្ញុំ" : "Record My Contribution")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contact Telegram QR Floating Modal */}
        {contactModalOpen && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#192048]/60 transition-opacity animate-in fade-in duration-200" 
            onClick={() => setContactModalOpen(false)}
          >
            <div 
              className="relative w-full max-w-sm sm:max-w-md bg-white border border-[#192048]/15 rounded-sm p-6 sm:p-8 shadow-none overflow-hidden" 
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setContactModalOpen(false)} 
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-[#F7F7F7] text-[#192048] flex items-center justify-center font-bold text-xs border-none cursor-pointer hover:bg-[#192048]/10 transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>

              <div className="text-center flex flex-col items-center pt-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#192048] m-0 leading-tight">
                  {t.contactModal.title}
                </h2>
                <p className="mt-2 text-xs font-medium text-[#192048]/70 leading-relaxed max-w-xs">
                  {t.contactModal.desc}
                </p>

                <div className="mt-6 w-56 h-56 sm:w-64 sm:h-64 bg-[#F7F7F7] border border-[#192048]/10 rounded-sm p-4 flex items-center justify-center overflow-hidden shadow-none">
                  <img 
                    src={TelegramQR} 
                    alt="E-Robot Telegram Support QR" 
                    className="w-full h-full object-contain rounded-lg" 
                  />
                </div>

                <a 
                  href="https://t.me/Suy_Kosal"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center gap-2.5 w-full rounded-sm bg-[#192048] hover:bg-[#232b57] text-white text-xs sm:text-sm font-bold py-3.5 transition-colors shadow-none no-underline cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>{t.contactModal.button}</span>
                </a>
              </div>
            </div>
          </div>
        )}

      </header>
    </>
  );
}