import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './views/components/nav';
import LandingPage from './views/home/landingpage';
import About from './views/home/about';
import MapLayout from './views/maps/mapLayout';
import Manage from './views/manage/manage';

function App() {
  return (
    <SuiClientProvider>
      <WalletProvider>
        <Theme>
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <Navbar />
                    <LandingPage />
                    <About />
                  </>
                }
              />
              <Route path="/maps" element={<MapLayout />} />
              {/* <Route path="/manage" element={<Manage />} /> */}
              <Route
                path="/manage"
                element={
                  <>
                    <Navbar isSidebarVisible={false} />
                    <Manage />
                  </>
                }
              />
            </Routes>
          </BrowserRouter>
        </Theme>
      </WalletProvider>
    </SuiClientProvider>
  );
}

export default App;