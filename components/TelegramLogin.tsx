// src/components/TelegramLogin.tsx
import { useEffect } from "react";

interface TelegramLoginProps {
  botName: string;
  onAuth: (user: any) => void;
}

const TelegramLogin: React.FC<TelegramLoginProps> = ({ botName, onAuth }) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "handleTelegramAuth(user)");
    
    document.getElementById("telegram-login-button")?.appendChild(script);

    // Define a global handler (important!)
    (window as any).handleTelegramAuth = (user: any) => {
      onAuth(user);
    };
    
    // Cleanup
    return () => {
      delete (window as any).handleTelegramAuth;
    };
  }, [botName, onAuth]);

  return <div id="telegram-login-button" />;
};

export default TelegramLogin;
