import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
      variables: {
        // TODO: Update with your deployed contract address
        property: "0x0", 
      },
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      variables: {
        // replace with your deployed contract address
        property:
          "0xf65f65bc87a552572a4f3d5e85b307d2f8cc62bf16dc4f3efd29c8497a14c631",
        // replace with your collection id
        UpgradeCap:
          "0x0856b9e2dd44eb2ea21d13c352cc613e1dc1aab8979610a2d0cc75f68ef4c97b",
      },
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      variables: {
        // TODO: Update with your deployed contract address
       property: "0x0", 
      },
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };