export const pinataUpload = {
  public: {
    file: async (file: File) => {
      const data = new FormData();
      data.append("file", file);

      const metadata = JSON.stringify({ name: file.name });
      data.append("pinataMetadata", metadata);

      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
        },
        body: data,
      });

      if (!res.ok) {
        throw new Error(`Failed to upload file to Pinata: ${res.statusText}`);
      }

      const result = await res.json();
      return {
        cid: result.IpfsHash as string,
        gatewayUrl: `https://${import.meta.env.VITE_PINATA_GATEWAY}/ipfs/${result.IpfsHash}`,
      };
    },

    json: async (json: Record<string, any>) => {
      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pinataContent: json,
          pinataMetadata: { name: "metadata" },
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to upload JSON to Pinata: ${res.statusText}`);
      }

      const result = await res.json();
      return {
        cid: result.IpfsHash as string,
        gatewayUrl: `https://${import.meta.env.VITE_PINATA_GATEWAY}/ipfs/${result.IpfsHash}`,
      };
    },
  },
};
