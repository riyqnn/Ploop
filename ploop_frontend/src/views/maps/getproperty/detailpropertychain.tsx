import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import rumah from "/tipe_rumah.svg";
import apartemen from "/tipe_apartemen.svg";
import ruko from "/tipe_ruko.svg";

// Network configuration
const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

interface Property {
  id: string; // Object ID from Sui
  objectId: string; // Same as id, for compatibility with existing UI
  latitude: string;
  longitude: string;
  name: string;
  address: string;
  whatsapp_contact: string;
  property_type: string;
  status: string;
  price: number; // Price in MIST
  building_area: number;
  land_area: number;
  certificate: string;
  other_certificate: string | null;
  image_urls: string[];
  document_url: string;
  owner_address: string;
}

interface DetailPropertyProps {
  property: Property;
  onClose: () => void;
}

function DetailPropertyChain({ property, onClose }: DetailPropertyProps) {
  const [activeTab, setActiveTab] = useState('info');
  const [buying, setBuying] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);

  // Hooks from @mysten/dapp-kit
  const account = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const packageId = "0xf65f65bc87a552572a4f3d5e85b307d2f8cc62bf16dc4f3efd29c8497a14c631";

  // Helper function to format price from MIST to SUI
  const formatPrice = (priceInMist: number) => {
    const priceInSui = priceInMist / 1_000_000_000;
    return `${priceInSui.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} SUI`;
  };

  // Helper function to get property type icon
  const getPropertyIcon = (propertyType: string) => {
    const iconMap: { [key: string]: string } = {
      house: rumah,
      apartment: apartemen,
      shop: ruko,
      boarding: rumah,
      warehouse: rumah,
    };
    return iconMap[propertyType.toLowerCase()] || rumah;
  };

  const handleBuyProperty = async () => {
    if (!account) {
      setTxResult({
        success: false,
        message: 'Please connect your wallet first',
      });
      return;
    }

    if (!property.objectId) {
      setTxResult({
        success: false,
        message: 'Property object ID not found',
      });
      return;
    }

    setBuying(true);
    setTxResult(null);

    try {
      // Fetch user's SUI coins
      const coinsResponse = await suiClient.getCoins({
        owner: account.address,
        coinType: '0x2::sui::SUI',
      });

      const coins = coinsResponse.data;
      if (coins.length === 0) {
        throw new Error('No SUI coins found in wallet');
      }

      // Calculate total balance and select coins for payment
      let totalBalance = 0n;
      const selectedCoins: string[] = [];
      const requiredAmount = BigInt(property.price);

      for (const coin of coins) {
        totalBalance += BigInt(coin.balance);
        selectedCoins.push(coin.coinObjectId);
        if (totalBalance >= requiredAmount) break;
      }

      if (totalBalance < requiredAmount) {
        throw new Error('Insufficient SUI balance to purchase this property');
      }

      // Create transaction
      const txb = new Transaction();
      txb.setSender(account.address);

      // Merge coins if multiple are selected
      let paymentCoin;
      if (selectedCoins.length > 1) {
        const [firstCoin, ...otherCoins] = selectedCoins;
        paymentCoin = txb.mergeCoins(txb.object(firstCoin), otherCoins.map((id) => txb.object(id)));
      } else {
        paymentCoin = txb.object(selectedCoins[0]);
      }

      // Call buy_property function
      txb.moveCall({
        target: `${packageId}::property::buy_property`,
        arguments: [
          txb.object(property.objectId), // Property object ID
          paymentCoin, // Payment coin
        ],
      });

      // Execute transaction
      const result = await new Promise<any>((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: txb,
            chain: 'sui:testnet',
          },
          {
            onSuccess: (result) => resolve(result),
            onError: (error) => reject(error),
          }
        );
      });

      setTxResult({
        success: true,
        message: `Property purchased successfully! Transaction: ${result.digest.slice(0, 12)}...`,
      });

      // Close after success
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      setTxResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="flex-1 bg-white rounded-r-xl border-l border-[#e5e7eb] flex flex-col max-w-[600px]">
      <div className="bg-white rounded-xl p-6 flex flex-col max-w-[600px] mx-auto w-full h-full">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[#1a1a1a] text-[18px] font-semibold">Property Details</h2>
          <button
            onClick={onClose}
            aria-label="Close detail"
            className="w-8 h-8 rounded-full bg-[#f8fafc] hover:bg-[#deecff] text-[#6b7280] hover:text-[#3f6ac8] transition-colors flex items-center justify-center"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Transaction Result Display */}
        {txResult && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              txResult.success
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <p className="text-sm">{txResult.message}</p>
          </div>
        )}

        <div className="space-y-6">
          {property.image_urls[0] && (
            <div className="relative overflow-hidden rounded-xl">
              <img
                alt={property.name}
                className="w-full h-[160px] object-cover"
                src={property.image_urls[0]}
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <img
                src={getPropertyIcon(property.property_type)}
                alt={property.property_type}
                className="w-8 h-8 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="text-[#1a1a1a] font-semibold text-[16px] leading-6">
                  {property.name}
                </h3>
                <p className="text-[#6b7280] text-[14px] leading-5">{property.address}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3f6ac8] flex items-center justify-center">
                <i className="fas fa-lock text-white text-sm"></i>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-white text-[13px] font-medium">
                {property.property_type}
              </span>
              <div className="flex-1 border-2 border-[#3f6ac8] rounded-lg text-[#3f6ac8] text-[13px] font-medium text-center py-2 bg-[#deecff]">
                Price: <span className="font-semibold">{formatPrice(property.price)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mt-6 bg-[#f8fafc] rounded-xl p-1 text-[13px] font-medium">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'info'
                ? 'bg-white text-[#3f6ac8] shadow-sm'
                : 'text-[#6b7280] hover:text-[#3f6ac8]'
            }`}
          >
            Property Info
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'documents'
                ? 'bg-white text-[#3f6ac8] shadow-sm'
                : 'text-[#6b7280] hover:text-[#3f6ac8]'
            }`}
          >
            Documents
          </button>
        </div>

        <div className="bg-[#deebfd] rounded-xl mt-4 p-6 flex-1 overflow-y-auto">
          {activeTab === 'info' && (
            <div className="text-[14px] text-[#1a1a1a]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {property.building_area && (
                    <div className="bg-white rounded-lg p-3 border border-[#c5deff]">
                      <p className="font-semibold text-[#3f6ac8] text-[12px] mb-1">Building Area</p>
                      <p className="text-[#1a1a1a]">{property.building_area} m²</p>
                    </div>
                  )}
                  {property.land_area && (
                    <div className="bg-white rounded-lg p-3 border border-[#c5deff]">
                      <p className="font-semibold text-[#3f6ac8] text-[12px] mb-1">Land Area</p>
                      <p className="text-[#1a1a1a]">{property.land_area} m²</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg p-4 border border-[#c5deff]">
                  <p className="font-semibold text-[#3f6ac8] mb-2">Certificate</p>
                  <p className="text-[#6b7280] text-[13px]">{property.certificate}</p>
                  {property.other_certificate && (
                    <p className="text-[#6b7280] text-[13px] mt-1">{property.other_certificate}</p>
                  )}
                </div>

                <div className="pt-4 space-y-3">
                  <div className="bg-white rounded-lg p-4 border border-[#c5deff]">
                    <p className="font-semibold text-[#3f6ac8] mb-2">Owner Address:</p>
                    <p className="text-[#6b7280] text-[13px] leading-5 font-mono">
                      {property.owner_address}
                    </p>
                  </div>

                  {/* Wallet Status */}
                  {!account && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 text-sm mb-2">
                        <i className="fas fa-exclamation-triangle mr-2"></i>
                        Connect your wallet to purchase this property
                      </p>
                    </div>
                  )}

                  {account && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 text-sm">
                        <i className="fas fa-wallet mr-2"></i>
                        Connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={handleBuyProperty}
                      disabled={buying || !account}
                      className={`text-white text-center py-3 rounded-lg transition-colors font-medium ${
                        buying || !account
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-[#3f6ac8] hover:bg-[#2d4a9e]'
                      }`}
                    >
                      {buying ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Processing Transaction...
                        </>
                      ) : !account ? (
                        <>
                          <i className="fas fa-wallet mr-2"></i>
                          Connect Wallet First
                        </>
                      ) : (
                        <>
                          <i className="fas fa-shopping-cart mr-2"></i>
                          Buy Property ({formatPrice(property.price)})
                        </>
                      )}
                    </button>

                    <a
                      href={`https://wa.me/${property.whatsapp_contact}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-[#25d366] text-white text-center py-3 rounded-lg hover:bg-[#128c7e] transition-colors font-medium"
                    >
                      <i className="fab fa-whatsapp mr-2"></i>
                      Contact via WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="text-[14px] text-[#1a1a1a]">
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-[#c5deff]">
                  <p className="font-semibold text-[#3f6ac8] mb-3">Property Documents</p>
                  {property.document_url ? (
                    <a
                      href={property.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-[#3f6ac8] text-white rounded-lg hover:bg-[#2d4a9e] transition-colors"
                    >
                      <i className="fas fa-file-pdf mr-2"></i>
                      View Documents
                    </a>
                  ) : (
                    <p className="text-[#6b7280] text-[13px]">No documents available</p>
                  )}
                </div>

                {property.image_urls.length > 1 && (
                  <div className="bg-white rounded-lg p-4 border border-[#c5deff]">
                    <p className="font-semibold text-[#3f6ac8] mb-3">Property Images</p>
                    <div className="grid grid-cols-2 gap-2">
                      {property.image_urls.slice(1).map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Property ${index + 2}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailPropertyChain;