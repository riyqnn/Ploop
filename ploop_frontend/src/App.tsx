import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import LandingPage from './views/home/landingpage';
import Navbar from './views/components/nav';
import About from './views/home/about';

function App() {
  return (
    <SuiClientProvider>
      <WalletProvider>
        <Theme>
          <Navbar />
          <LandingPage />
          <About/>
        </Theme>
      </WalletProvider>
    </SuiClientProvider>
  );
}
export default App;