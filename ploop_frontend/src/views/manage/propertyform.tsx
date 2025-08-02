import { useState, useEffect } from "react";
import { MapPin, ArrowLeft, CheckCircle, Home, Building, Store, Users, Warehouse } from "lucide-react";
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { pinataUpload } from '@/service/pinata'; // Assuming the pinataUpload utility is in a separate file

// Network configuration
const suiClient = new SuiClient({
  url: "https://fullnode.testnet.sui.io",
});

interface PropertyFormProps {
  onBack: () => void;
  markerPosition: { lat: number; lng: number };
  onComplete?: () => void;
}

interface FormData {
  name: string;
  address: string;
  whatsappContact: string;
  price: string;
  buildingArea: string;
  landArea: string;
  propertyType: string;
  status: string;
  certificateType: string;
  otherCertificate: string;
  images: string[];
  documentUrl: string;
}

interface Location {
  latitude: string;
  longitude: string;
}

// These match the smart contract enum values (0, 1, 2, etc.)
const propertyTypes = {
  House: { value: "0", label: "House", icon: Home },
  Apartment: { value: "1", label: "Apartment", icon: Building },
  Shop: { value: "2", label: "Shop", icon: Store },
  Boarding: { value: "3", label: "Boarding", icon: Users },
  Warehouse: { value: "4", label: "Warehouse", icon: Warehouse },
};

const propertyStatus = {
  ForSale: { value: "0", label: "For Sale" },
  ForRent: { value: "1", label: "For Rent" },
};

const certificateTypes = {
  SHM: { value: "0", label: "SHM" },
  SHGB: { value: "1", label: "SHGB" },
  Other: { value: "2", label: "Other" },
};

function PropertyForm({ onBack, markerPosition, onComplete }: PropertyFormProps) {
  const account = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const packageId = "0xf65f65bc87a552572a4f3d5e85b307d2f8cc62bf16dc4f3efd29c8497a14c631";

  const [formData, setFormData] = useState<FormData>({
    name: "",
    address: "",
    whatsappContact: "",
    price: "",
    buildingArea: "",
    landArea: "",
    propertyType: "0",
    status: "0",
    certificateType: "0",
    otherCertificate: "",
    images: [],
    documentUrl: "",
  });

  const [location, setLocation] = useState<Location>({
    latitude: markerPosition.lat.toString(),
    longitude: markerPosition.lng.toString(),
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>("");
  const [userCoins, setUserCoins] = useState<any[]>([]);

  useEffect(() => {
    setLocation({
      latitude: markerPosition.lat.toFixed(6),
      longitude: markerPosition.lng.toFixed(6),
    });
  }, [markerPosition]);

  useEffect(() => {
    const fetchUserCoins = async () => {
      if (account?.address) {
        try {
          const coins = await suiClient.getCoins({
            owner: account.address,
          });
          setUserCoins(coins.data);
          console.log('User coins:', coins.data);
        } catch (error) {
          console.error('Error fetching coins:', error);
        }
      }
    };

    fetchUserCoins();
  }, [account]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectionChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploadingImages(true);
    try {
      if (formData.images.length + files.length > 10) {
        setErrors((prev) => ({ ...prev, images: "Maximum 10 images allowed." }));
        return;
      }

      const imageUrls: string[] = [];
      for (const file of Array.from(files)) {
        try {
          const upload = await pinataUpload.public.file(file);
          imageUrls.push(upload.gatewayUrl);
        } catch (error: any) {
          console.error(`Failed to upload image ${file.name}:`, error);
          throw new Error(`Failed to upload image ${file.name}: ${error.message || "Unknown error"}`);
        }
      }

      setFormData((prev) => ({ ...prev, images: [...prev.images, ...imageUrls] }));
      if (errors.images) {
        setErrors((prev) => ({ ...prev, images: undefined }));
      }
    } catch (error: any) {
      setErrors((prev) => ({ ...prev, images: `Failed to upload images: ${error.message || "Unknown error"}` }));
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDocument(true);
    try {
      const upload = await pinataUpload.public.file(file);
      setFormData((prev) => ({ ...prev, documentUrl: upload.gatewayUrl }));
      if (errors.documentUrl) {
        setErrors((prev) => ({ ...prev, documentUrl: undefined }));
      }
    } catch (error: any) {
      setErrors((prev) => ({ ...prev, documentUrl: `Failed to upload document: ${error.message || "Unknown error"}` }));
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Property name is required.";
    } else if (formData.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters.";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required.";
    } else if (formData.address.length < 10) {
      newErrors.address = "Address must be at least 10 characters.";
    }

    if (formData.whatsappContact && !/^\+?\d{10,15}$/.test(formData.whatsappContact)) {
      newErrors.whatsappContact = "Invalid WhatsApp number format.";
    }

    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) {
      newErrors.price = "Price must be a positive number.";
    }

    const buildingArea = parseInt(formData.buildingArea);
    if (!formData.buildingArea || isNaN(buildingArea) || buildingArea <= 0) {
      newErrors.buildingArea = "Building area must be a positive number.";
    }

    const landArea = parseInt(formData.landArea);
    if (!formData.landArea || isNaN(landArea) || landArea <= 0) {
      newErrors.landArea = "Land area must be a positive number.";
    }

    if (!["0", "1", "2", "3", "4"].includes(formData.propertyType)) {
      newErrors.propertyType = "Invalid property type.";
    }

    if (!["0", "1"].includes(formData.status)) {
      newErrors.status = "Invalid property status.";
    }

    if (!["0", "1", "2"].includes(formData.certificateType)) {
      newErrors.certificateType = "Invalid certificate type.";
    }

    if (formData.certificateType === "2" && !formData.otherCertificate.trim()) {
      newErrors.otherCertificate = "Other certificate details are required.";
    }

    if (!formData.images.length) {
      newErrors.images = "At least one image is required.";
    }

    if (formData.documentUrl && !/^https?:\/\/[^\s$.?#].[^\s]*$/.test(formData.documentUrl)) {
      newErrors.documentUrl = "Invalid URL format.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchBlockchainData = async () => {
    if (!account?.address) return;

    try {
      const objects = await suiClient.getOwnedObjects({
        owner: account.address,
        options: {
          showType: true,
          showContent: true,
        },
      });
      console.log('User objects:', objects.data);
    } catch (error) {
      console.error('Error fetching blockchain data:', error);
    }
  };

  const uploadToBlockchain = async () => {
  if (!account) {
    throw new Error("Wallet not connected. Please connect your wallet first.");
  }

  console.log("🔄 Starting blockchain upload process...");

  try {
    const { address } = account;
    console.log("✅ Wallet connected:", address);

    const priceInMist = Math.floor(parseFloat(formData.price) * 1_000_000_000);
    console.log("💰 Converted price to MIST:", priceInMist);

    const txb = new Transaction();
    txb.setSender(address);

    console.log("🛠️  Preparing move call with arguments...");

    const args = [
      txb.pure.string(location.latitude),
      txb.pure.string(location.longitude),
      txb.pure.string(formData.name),
      txb.pure.string(formData.address),
      txb.pure.string(formData.whatsappContact || ""),
      txb.pure.u8(parseInt(formData.propertyType)),
      txb.pure.u8(parseInt(formData.status)),
      txb.pure.u64(priceInMist),
      txb.pure.u64(parseInt(formData.buildingArea)),
      txb.pure.u64(parseInt(formData.landArea)),
      txb.pure.u8(parseInt(formData.certificateType)),
      txb.pure.string(formData.otherCertificate || ""),
      txb.pure.vector("string", formData.images),
      txb.pure.string(formData.documentUrl || ""),
    ];

    txb.moveCall({
      target: `${packageId}::property::register_property`,
      arguments: args,
    });

    console.log("✅ Transaction prepared successfully.");

    const result = await new Promise<any>((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: txb,
          chain: "sui:testnet",
        },
        {
          onSuccess: (res) => resolve(res),
          onError: (err) => reject(err),
        }
      );
    });

    console.log("🎉 Transaction succeeded:", result);
    setTransactionHash(result.digest);
    return result;

  } catch (error: any) {
    const errorMsg = error?.message || "Unknown error occurred during blockchain upload.";
    const fullError = typeof error === "object" ? JSON.stringify(error, null, 2) : error;

    console.error("❌ Blockchain upload failed:");
    console.error("📌 Error message:", errorMsg);
    console.error("📦 Full error:", fullError);

    throw new Error(errorMsg);
  }
};


  console.log("Form Data:", formData);

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert("Please fix the form errors.");
      return;
    }

    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchBlockchainData();
      const result = await uploadToBlockchain();
      alert(`Property registered successfully! TX: ${(result as any).digest.slice(0, 12)}...`);

      // Reset form after successful submission
      setFormData({
        name: "",
        address: "",
        whatsappContact: "",
        price: "",
        buildingArea: "",
        landArea: "",
        propertyType: "0",
        status: "0",
        certificateType: "0",
        otherCertificate: "",
        images: [],
        documentUrl: "",
      });

      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
            console.error("Error registering property:", JSON.stringify(error, null, 2));

      console.error("Error registering property:", error);
      alert(`Error: ${error.message || "Transaction failed"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ButtonGroup = ({
    title,
    options,
    selected,
    onSelect,
    field,
  }: {
    title: string;
    options: any;
    selected: string;
    onSelect: (field: string, value: string) => void;
    field: string;
  }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-3">{title}</label>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(options).map(([key, option]: [string, any]) => {
          const isSelected = selected === option.value;
          const IconComponent = option.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(field, option.value)}
              disabled={isSubmitting}
              className={`
                flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-200
                ${isSelected
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }
                ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {IconComponent && <IconComponent className="w-4 h-4" />}
              <span className="text-xs font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
      {errors[field as keyof FormData] && (
        <p className="text-red-500 text-sm mt-1">{errors[field as keyof FormData]}</p>
      )}
    </div>
  );

  const totalSuiBalance = userCoins.reduce((total, coin) => {
    return total + Number(coin.balance) / 1_000_000_000;
  }, 0);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Register Property</h2>
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/60 rounded-lg p-2">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span>Lat: {markerPosition.lat.toFixed(4)}, Lng: {markerPosition.lng.toFixed(4)}</span>
        </div>

        {account ? (
          <div className="space-y-2 mt-3">
            <div className="text-sm text-green-600 bg-green-50 rounded-lg p-2">
              Connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </div>
            {userCoins.length > 0 && (
              <div className="text-sm text-blue-600 bg-blue-50 rounded-lg p-2">
                Balance: {totalSuiBalance.toFixed(4)} SUI ({userCoins.length} coins)
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-red-500 bg-red-50 rounded-lg p-2 mt-3">
            Please connect your wallet using the navbar to register properties
          </div>
        )}

        {transactionHash && (
          <div className="mt-3">
            <div className="text-sm text-purple-600 bg-purple-50 rounded-lg p-2 break-all">
              Last Transaction: {transactionHash.slice(0, 12)}...
              <a
                href={`https://suiexplorer.com/txblock/${transactionHash}?network=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 hover:underline"
              >
                View on Explorer
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Property Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter property name"
            className={`w-full p-3 text-sm border-2 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none transition-all ${
              errors.name ? "border-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
            disabled={isSubmitting}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Address *</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter property address"
            className={`w-full p-3 text-sm border-2 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none resize-none transition-all ${
              errors.address ? "border-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
            rows={3}
            disabled={isSubmitting}
          />
          {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">WhatsApp Contact</label>
          <input
            type="text"
            name="whatsappContact"
            value={formData.whatsappContact}
            onChange={handleInputChange}
            placeholder="+1234567890"
            className={`w-full p-3 text-sm border-2 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none transition-all ${
              errors.whatsappContact ? "border-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
            disabled={isSubmitting}
          />
          {errors.whatsappContact && <p className="text-red-500 text-sm mt-1">{errors.whatsappContact}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Price (SUI) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0.00"
              className={`w-full p-3 text-sm border-2 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none transition-all ${
                errors.price ? "border-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              }`}
              min="0"
              step="0.000000001"
              disabled={isSubmitting}
            />
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Building Area (m²) *</label>
              <input
                type="number"
                name="buildingArea"
                value={formData.buildingArea}
                onChange={handleInputChange}
                placeholder="0"
                className={`w-full p-3 text-sm border-2 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none transition-all ${
                  errors.buildingArea ? "border-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                }`}
                min="0"
                disabled={isSubmitting}
              />
              {errors.buildingArea && <p className="text-red-500 text-sm mt-1">{errors.buildingArea}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Land Area (m²) *</label>
              <input
                type="number"
                name="landArea"
                value={formData.landArea}
                onChange={handleInputChange}
                placeholder="0"
                className={`w-full p-3 text-sm border-2 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none transition-all ${
                  errors.landArea ? "border-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                }`}
                min="0"
                disabled={isSubmitting}
              />
              {errors.landArea && <p className="text-red-500 text-sm mt-1">{errors.landArea}</p>}
            </div>
          </div>
        </div>

        <ButtonGroup
          title="Property Type *"
          options={propertyTypes}
          selected={formData.propertyType}
          onSelect={handleSelectionChange}
          field="propertyType"
        />

        <ButtonGroup
          title="Status *"
          options={propertyStatus}
          selected={formData.status}
          onSelect={handleSelectionChange}
          field="status"
        />

        <ButtonGroup
          title="Certificate Type *"
          options={certificateTypes}
          selected={formData.certificateType}
          onSelect={handleSelectionChange}
          field="certificateType"
        />

        {formData.certificateType === "2" && (
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Other Certificate Details *</label>
            <input
              type="text"
              name="otherCertificate"
              value={formData.otherCertificate}
              onChange={handleInputChange}
              placeholder="Specify certificate type"
              className={`w-full p-3 text-sm border-2 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none transition-all ${
                errors.otherCertificate ? "border-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              }`}
              disabled={isSubmitting}
            />
            {errors.otherCertificate && <p className="text-red-500 text-sm mt-1">{errors.otherCertificate}</p>}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Document (Proof of Ownership)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleDocumentUpload}
            disabled={isSubmitting || isUploadingDocument}
            className={`w-full p-3 text-sm border-2 rounded-xl bg-white text-gray-800 focus:outline-none transition-all file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 file:font-medium hover:file:bg-blue-200 ${
              errors.documentUrl ? "border-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            } ${isUploadingDocument ? "opacity-50 cursor-not-allowed" : ""}`}
          />
          {isUploadingDocument && (
            <div className="text-sm text-blue-600 mt-1">Uploading document...</div>
          )}
          {formData.documentUrl && (
            <div className="mt-2 text-sm text-blue-600">
              Document uploaded: <a href={formData.documentUrl} target="_blank" rel="noopener noreferrer" className="underline">{formData.documentUrl.slice(0, 30)}...</a>
            </div>
          )}
          {errors.documentUrl && <p className="text-red-500 text-sm mt-1">{errors.documentUrl}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Images (Max 10) *</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            disabled={isSubmitting || isUploadingImages}
            className={`w-full p-3 text-sm border-2 rounded-xl bg-white text-gray-800 focus:outline-none transition-all file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 file:font-medium hover:file:bg-blue-200 ${
              errors.images ? "border-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            } ${isUploadingImages ? "opacity-50 cursor-not-allowed" : ""}`}
          />
          {isUploadingImages && (
            <div className="text-sm text-blue-600 mt-1">Uploading images...</div>
          )}
          {formData.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {formData.images.map((url, index) => (
                <div key={index} className="relative">
                  <img src={url} alt={`Preview ${index}`} className="h-20 w-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    disabled={isSubmitting}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {errors.images && <p className="text-red-500 text-sm mt-1">{errors.images}</p>}
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-4 border-t border-white/30">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 border-2 border-gray-300 bg-white text-gray-700 rounded-xl py-3 px-4 text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !account}
          className="flex-2 bg-blue-600 text-white rounded-xl py-3 px-6 text-sm font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Submitting to Blockchain...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Register Property
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default PropertyForm;