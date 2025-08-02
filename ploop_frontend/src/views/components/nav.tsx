import { useState, useEffect, useRef } from 'react';
import { useCurrentAccount, ConnectButton, useDisconnectWallet } from '@mysten/dapp-kit';
import { Link, useLocation } from 'react-router-dom';
import logo from "/logo.png"

interface NavbarProps {
  isSidebarVisible?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ isSidebarVisible = false }) => {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isMapsPage = location.pathname === '/maps';

  const handleLogout = () => {
    disconnect();
    setIsDropdownOpen(false);
  };

  const toggleDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsDropdownOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`w-full bg-white max-w-screen-xl mx-auto flex flex-col overflow-visible px-4 py-3 md:flex-row md:items-center shadow-sm md:px-6 rounded-full transition-all duration-300 ${
        isMapsPage && isSidebarVisible ? 'md:ml-[340px]' : 'md:ml-auto'
      }`}
    >
      <Link to="/" className="flex cursor-pointer items-center whitespace-nowrap text-xl font-black">
  <img src={logo} alt="Ploop Logo" className="mr-2 h-8 w-8 object-contain" />
  Ploop
</Link>
      <input type="checkbox" className="peer hidden" id="navbar-open" />
      <label className="absolute top-4 right-5 cursor-pointer md:hidden" htmlFor="navbar-open">
        <span className="sr-only">Toggle Navigation</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </label>
      <nav
        aria-label="Header Navigation"
        className="flex max-h-0 w-full flex-col items-center justify-between overflow-visible transition-all peer-checked:mt-6 peer-checked:max-h-56 md:ml-20 md:max-h-full md:flex-row md:items-start"
      >
        <ul className="flex flex-col items-center space-y-2 md:ml-auto md:flex-row md:space-y-0">
          <li>
            <Link
              to="/"
              className={`font-bold md:mr-10 text-sm ${location.pathname === '/' ? 'text-blue-600 underline' : ''}`}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/maps"
              className={`md:mr-10 text-sm ${location.pathname === '/maps' ? 'text-blue-600 underline' : ''}`}
            >
              Maps
            </Link>
          </li>
          {account && (
            <li>
              <Link
                to="/manage"
                className={`md:mr-10 text-sm ${location.pathname === '/manage' ? 'text-blue-600 underline' : ''}`}
              >
                Manage
              </Link>
            </li>
          )}
          <li className="md:mr-10 relative">
            {account ? (
              <div ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  className="rounded-full border-2 border-blue-900 px-4 py-1 text-xs font-medium text-blue-900 transition-colors hover:bg-blue-900 hover:text-white"
                >
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-md bg-white border border-gray-200 shadow-md z-[60]">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-600 hover:text-white rounded-md"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <ConnectButton
                className="rounded-full border-2 border-blue-900 px-4 py-1 text-xs font-medium text-blue-900 transition-colors hover:bg-blue-900 hover:text-white"
              />
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Navbar;