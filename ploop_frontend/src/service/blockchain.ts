import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// Configuration
const NETWORK = 'testnet'; // Change to 'mainnet' for production
const MODULE_ADDRESS = '0x...'; // Replace with your deployed module address
const MODULE_NAME = 'property';

// Initialize Sui client
export const suiClient = new SuiClient({
  url: getFullnodeUrl(NETWORK),
});

// Property interface matching your contract
export interface PropertyObject {
  id: string;
  latitude: string;
  longitude: string;
  name: string;
  address: string;
  whatsapp_contact: string;
  property_type: number;
  status: number;
  price: string; // BigInt as string
  building_area: string;
  land_area: string;
  certificate: number;
  other_certificate: string;
  image_urls: string[];
  document_url: string;
  owner: string;
}

// Transaction result interface
export interface TransactionResult {
  success: boolean;
  digest?: string;
  error?: string;
}

// Wallet connection interface (compatible with @mysten/dapp-kit)
export interface WalletConnection {
  address: string;
  signAndExecuteTransactionBlock: (txb: TransactionBlock) => Promise<{ digest: string }>;
}

/**
 * Buy property function that interacts with the smart contract
 */
export async function buyProperty(
  propertyObjectId: string,
  propertyPrice: bigint,
  wallet: WalletConnection
): Promise<TransactionResult> {
  try {
    // Create transaction block
    const txb = new TransactionBlock();
    
    // Get SUI coins from buyer's account
    const [coin] = txb.splitCoins(txb.gas, [txb.pure(propertyPrice.toString())]);
    
    // Call the buy_property function from smart contract
    txb.moveCall({
      target: `${MODULE_ADDRESS}::${MODULE_NAME}::buy_property`,
      arguments: [
        txb.object(propertyObjectId), // Property object
        coin, // Payment coin
      ],
    });
    
    // Set gas budget (10 million MIST = 0.01 SUI)
    txb.setGasBudget(10000000);
    
    // Sign and execute transaction
    const result = await wallet.signAndExecuteTransactionBlock(txb);
    
    if (result.digest) {
      console.log('Transaction successful:', result.digest);
      return {
        success: true,
        digest: result.digest,
      };
    } else {
      return {
        success: false,
        error: 'Transaction failed without digest',
      };
    }
  } catch (error) {
    console.error('Buy property error:', error);
    
    // Enhanced error handling
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error cases
      if (error.message.includes('Insufficient gas')) {
        errorMessage = 'Insufficient gas for transaction';
      } else if (error.message.includes('Insufficient balance')) {
        errorMessage = 'Insufficient SUI balance';
      } else if (error.message.includes('User rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message.includes('Object not found')) {
        errorMessage = 'Property not found on blockchain';
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get property details from blockchain
 */
export async function getPropertyDetails(propertyObjectId: string): Promise<PropertyObject | null> {
  try {
    const object = await suiClient.getObject({
      id: propertyObjectId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (object.data?.content && 'fields' in object.data.content) {
      const fields = object.data.content.fields as any;
      
      return {
        id: fields.id.id,
        latitude: fields.latitude,
        longitude: fields.longitude,
        name: fields.name,
        address: fields.address,
        whatsapp_contact: fields.whatsapp_contact,
        property_type: fields.property_type,
        status: fields.status,
        price: fields.price,
        building_area: fields.building_area,
        land_area: fields.land_area,
        certificate: fields.certificate,
        other_certificate: fields.other_certificate,
        image_urls: fields.image_urls,
        document_url: fields.document_url,
        owner: fields.owner,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Get property details error:', error);
    return null;
  }
}

/**
 * Get all properties owned by a specific address
 */
export async function getPropertiesByOwner(ownerAddress: string): Promise<PropertyObject[]> {
  try {
    // This would depend on your smart contract implementation
    // You might need to query by owner field or use events
    const objects = await suiClient.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: `${MODULE_ADDRESS}::${MODULE_NAME}::Property`
      },
      options: {
        showContent: true,
        showType: true,
      }
    });

    const properties: PropertyObject[] = [];
    
    for (const obj of objects.data) {
      if (obj.data?.content && 'fields' in obj.data.content) {
        const fields = obj.data.content.fields as any;
        properties.push({
          id: fields.id.id,
          latitude: fields.latitude,
          longitude: fields.longitude,
          name: fields.name,
          address: fields.address,
          whatsapp_contact: fields.whatsapp_contact,
          property_type: fields.property_type,
          status: fields.status,
          price: fields.price,
          building_area: fields.building_area,
          land_area: fields.land_area,
          certificate: fields.certificate,
          other_certificate: fields.other_certificate,
          image_urls: fields.image_urls,
          document_url: fields.document_url,
          owner: fields.owner,
        });
      }
    }
    
    return properties;
  } catch (error) {
    console.error('Get properties by owner error:', error);
    return [];
  }
}

/**
 * Format price from MIST to SUI for display
 */
export function formatPriceToSUI(priceInMist: bigint | string): string {
  const price = typeof priceInMist === 'string' ? BigInt(priceInMist) : priceInMist;
  const priceInSui = Number(price) / 1_000_000_000;
  return priceInSui.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 9,
  });
}

/**
 * Convert SUI to MIST for transactions
 */
export function convertSUIToMist(suiAmount: number): bigint {
  return BigInt(Math.floor(suiAmount * 1_000_000_000));
}

/**
 * Check if user has sufficient balance
 */
export async function checkSufficientBalance(
  userAddress: string,
  requiredAmount: bigint
): Promise<boolean> {
  try {
    const coins = await suiClient.getCoins({
      owner: userAddress,
      coinType: '0x2::sui::SUI',
    });
    
    const totalBalance = coins.data.reduce(
      (sum, coin) => sum + BigInt(coin.balance),
      BigInt(0)
    );
    
    console.log(`User balance: ${formatPriceToSUI(totalBalance)} SUI`);
    console.log(`Required: ${formatPriceToSUI(requiredAmount)} SUI`);
    
    return totalBalance >= requiredAmount;
  } catch (error) {
    console.error('Check balance error:', error);
    return false;
  }
}

/**
 * Get user's SUI balance
 */
export async function getUserBalance(userAddress: string): Promise<bigint> {
  try {
    const coins = await suiClient.getCoins({
      owner: userAddress,
      coinType: '0x2::sui::SUI',
    });
    
    return coins.data.reduce(
      (sum, coin) => sum + BigInt(coin.balance),
      BigInt(0)
    );
  } catch (error) {
    console.error('Get user balance error:', error);
    return BigInt(0);
  }
}

/**
 * Create property on blockchain (for property owners)
 */
export async function createProperty(
  propertyData: {
    latitude: string;
    longitude: string;
    name: string;
    address: string;
    whatsapp_contact: string;
    property_type: number;
    price: bigint;
    building_area: string;
    land_area: string;
    certificate: number;
    other_certificate: string;
    image_urls: string[];
    document_url: string;
  },
  wallet: WalletConnection
): Promise<TransactionResult> {
  try {
    const txb = new TransactionBlock();
    
    // Call create_property function
    txb.moveCall({
      target: `${MODULE_ADDRESS}::${MODULE_NAME}::create_property`,
      arguments: [
        txb.pure(propertyData.latitude),
        txb.pure(propertyData.longitude),
        txb.pure(propertyData.name),
        txb.pure(propertyData.address),
        txb.pure(propertyData.whatsapp_contact),
        txb.pure(propertyData.property_type),
        txb.pure(propertyData.price.toString()),
        txb.pure(propertyData.building_area),
        txb.pure(propertyData.land_area),
        txb.pure(propertyData.certificate),
        txb.pure(propertyData.other_certificate),
        txb.pure(propertyData.image_urls),
        txb.pure(propertyData.document_url),
      ],
    });
    
    txb.setGasBudget(10000000);
    
    const result = await wallet.signAndExecuteTransactionBlock(txb);
    
    if (result.digest) {
      return {
        success: true,
        digest: result.digest,
      };
    } else {
      return {
        success: false,
        error: 'Transaction failed without digest',
      };
    }
  } catch (error) {
    console.error('Create property error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}